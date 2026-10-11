import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth/middleware.js';

const router = Router();

/**
 * Normalizes a raw PostgreSQL audit_entries row to the nested AuditEntry
 * shape expected by the frontend (actor.name, entity.type, etc.)
 */
function normalizeAuditEntry(row: any) {
  return {
    id: row.id,
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    actor: {
      id: row.actor_id || 'system',
      name: row.actor_name || 'System',
      role: row.actor_role || 'system'
    },
    action: row.action,
    category: row.category,
    entity: {
      type: row.entity_type || 'system',
      id: row.entity_id || '',
      name: row.entity_name || ''
    },
    summary: row.summary,
    details: row.details || undefined
  };
}

// Only admin, officer, and coordinator can access audit log
router.get('/', requireAuth, requireRole(['admin', 'officer', 'coordinator']), async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const result = await pool.query('SELECT * FROM audit_entries ORDER BY timestamp DESC LIMIT $1', [limit]);
    res.json(result.rows.map(normalizeAuditEntry));
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;

