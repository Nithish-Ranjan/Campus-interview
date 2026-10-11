import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth/middleware.js';

const router = Router();

// GET /api/notifications/me - current authenticated student's notifications
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  if (req.user?.role !== 'student' || !req.user.studentId) {
    return res.status(403).json({ error: 'Only authenticated students can access their personal notifications feed' });
  }

  try {
    const result = await pool.query(
      'SELECT id, student_id as "studentId", title, message, type, is_read as "isRead", is_dismissed as "isDismissed", created_at as "createdAt" FROM student_notifications WHERE student_id = $1 ORDER BY created_at DESC',
      [req.user.studentId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/:studentId - protected by ownership check
router.get('/:studentId', requireAuth, async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const targetStudentId = req.params.studentId;

  // If role is student, enforce that they can only access their own studentId
  if (req.user?.role === 'student' && req.user.studentId !== targetStudentId) {
    return res.status(403).json({
      error: 'Forbidden: Students cannot access notifications of other students.',
      code: 'FORBIDDEN_STUDENT_ISOLATION'
    });
  }

  // If role is panel coordinator or admin (without explicit permission), reject
  if (req.user?.role === 'panel_coordinator' || req.user?.role === 'admin') {
    return res.status(403).json({
      error: `Forbidden: Role '${req.user?.role}' does not have permission to view candidate notifications.`,
      code: 'FORBIDDEN_ROLE_RESTRICTED'
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, student_id as "studentId", title, message, type, is_read as "isRead", is_dismissed as "isDismissed", created_at as "createdAt" FROM student_notifications WHERE student_id = $1 ORDER BY created_at DESC',
      [targetStudentId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/:id/read - mark notification as read
router.post('/:id/read', requireAuth, async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  try {
    // If student, verify ownership before marking as read
    if (req.user?.role === 'student') {
      const checkRes = await pool.query('SELECT student_id FROM student_notifications WHERE id = $1', [req.params.id]);
      if (checkRes.rowCount === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      if (checkRes.rows[0].student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'Forbidden: Cannot modify another student notification' });
      }
    }

    const result = await pool.query(
      'UPDATE student_notifications SET is_read = true WHERE id = $1 RETURNING id, student_id as "studentId", is_read as "isRead"',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
