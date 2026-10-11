import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

const router = Router();

// Only admin, officer, and coordinator can access audit log
router.get('/', requireAuth, requireRole(['admin', 'officer', 'coordinator']), async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const result = await pool.query('SELECT * FROM audit_entries ORDER BY timestamp DESC LIMIT $1', [limit]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
