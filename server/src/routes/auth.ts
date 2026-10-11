import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { verifyPassword, generateSessionToken } from '../auth/crypto.js';
import { requireAuth } from '../auth/middleware.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Simple in-memory rate limiting map for login attempts: ip -> { count, resetAt }
const loginRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginRateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    loginRateLimitMap.set(ip, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return true;
  }
  if (entry.count >= 15) {
    return false; // exceeded
  }
  entry.count++;
  return true;
}

/**
 * POST /api/auth/login
 * Verifies credentials, generates session in PostgreSQL, sets HttpOnly cookie and returns user.
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again in one minute.' });
  }

  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Valid email and password are required' });
  }

  const { email, password } = parseResult.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.password_hash, u.assigned_panels, st.id as student_id
       FROM users u
       LEFT JOIN students st ON st.user_id = u.id
       WHERE LOWER(u.email) = $1`,
      [normalizedEmail]
    );

    if (userRes.rowCount === 0) {
      // Constant-time dummy check to prevent timing analysis
      await verifyPassword(password, 'scrypt$dummy$00000000000000000000000000000000');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];

    // Check password
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create session in PostgreSQL
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      `INSERT INTO user_sessions (id, user_id, created_at, expires_at)
       VALUES ($1, $2, NOW(), $3)`,
      [sessionToken, user.id, expiresAt]
    );

    // Audit log
    const auditId = `audit-${Date.now()}`;
    await pool.query(
      `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [auditId, user.id, user.name, user.role, 'auth.login', 'auth', 'user', user.id, user.name, `User ${user.email} logged in successfully`]
    );

    // Set HttpOnly cookie
    res.cookie('pc_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedPanels: Array.isArray(user.assigned_panels) ? user.assigned_panels : [],
      studentId: user.student_id || undefined
    };

    return res.status(200).json({
      success: true,
      token: sessionToken,
      user: sanitizedUser
    });
  } catch (err: any) {
    console.error('[Login Error]:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/auth/logout
 * Destroys session in PostgreSQL and clears cookie.
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  if (req.sessionId && pool) {
    try {
      await pool.query('DELETE FROM user_sessions WHERE id = $1', [req.sessionId]);
      if (req.user) {
        await pool.query(
          `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [`audit-${Date.now()}`, req.user.id, req.user.name, req.user.role, 'auth.logout', 'auth', 'user', req.user.id, req.user.name, `User logged out`]
        );
      }
    } catch (err) {
      console.error('[Logout Error]:', err);
    }
  }

  res.clearCookie('pc_session', { path: '/' });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Returns current authenticated session details.
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  return res.status(200).json({
    user: req.user
  });
});
