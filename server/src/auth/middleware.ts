import { Request, Response, NextFunction } from 'express';
import { pool } from '../db.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'officer' | 'coordinator' | 'panel_coordinator' | 'student';
  assignedPanels: string[];
  studentId?: string; // Present if user is a student
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

/**
 * Extracts session token from HttpOnly cookie or Authorization Bearer header.
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Check cookies
  if (req.cookies && req.cookies.pc_session) {
    return req.cookies.pc_session;
  }
  // 2. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  // 3. Check query param token (supports direct browser downloads & preview)
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }
  return null;
}

/**
 * Middleware: Attaches user from session if valid, without blocking unauthenticated requests.
 */
export async function authenticateSession(req: Request, _res: Response, next: NextFunction) {
  const token = extractSessionToken(req);
  if (!token || !pool) {
    return next();
  }

  try {
    const result = await pool.query(
      `SELECT s.id as session_id, s.expires_at, u.id, u.name, u.email, u.role, u.assigned_panels, st.id as student_id
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN students st ON st.user_id = u.id
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rowCount && result.rowCount > 0) {
      const row = result.rows[0];
      req.sessionId = row.session_id;
      req.user = {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as any,
        assignedPanels: Array.isArray(row.assigned_panels) ? row.assigned_panels : [],
        studentId: row.student_id || undefined
      };
    }
  } catch (err) {
    console.error('[authenticateSession Error]:', err);
  }

  next();
}

/**
 * Middleware: Enforces that the request has an active authenticated session.
 * Rejects with 401 if unauthenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }
  next();
}

/**
 * Middleware: Enforces that the authenticated user possesses one of the allowed roles.
 * Rejects with 403 if unauthorized.
 */
export function requireRole(allowedRoles: Array<'admin' | 'officer' | 'coordinator' | 'panel_coordinator' | 'student'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Role '${req.user.role}' lacks permission for this resource.`,
        code: 'FORBIDDEN'
      });
    }
    next();
  };
}

/**
 * Middleware: Checks student resource ownership according to PRD Privacy Matrix:
 * - Student role can ONLY access their own records (resolved via session or param matching their own studentId).
 * - Placement Officer & Placement Coordinator can access student directory/profiles.
 * - Admin, Panel Coordinator are restricted according to the PRD matrix.
 */
export function authorizeStudentAccess(paramKey: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    }

    const targetStudentId = req.params[paramKey];

    // If caller is student
    if (req.user.role === 'student') {
      if (targetStudentId === 'me' || targetStudentId === req.user.studentId) {
        return next();
      }
      return res.status(403).json({
        error: 'Forbidden: Students are isolated to their own records only.',
        code: 'FORBIDDEN_STUDENT_ISOLATION'
      });
    }

    // If caller is officer, coordinator, or admin
    if (req.user.role === 'officer' || req.user.role === 'coordinator' || req.user.role === 'admin') {
      return next();
    }

    // Panel Coordinator and unauthorized roles restricted
    return res.status(403).json({
      error: `Forbidden: Role '${req.user.role}' does not have unrestricted access to full student records.`,
      code: 'FORBIDDEN_ROLE_RESTRICTED'
    });
  };
}
