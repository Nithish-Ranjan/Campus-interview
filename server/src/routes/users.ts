import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

const router = Router();

// GET /api/users - Admin only
router.get('/', requireAuth, requireRole(['admin']), async (_req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, environment, assigned_panels, created_at, updated_at FROM users ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users/:id/role - Admin only
router.post('/:id/role', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const { role } = req.body;
  const validRoles = ['admin', 'officer', 'coordinator', 'panel_coordinator', 'student'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

export default router;
