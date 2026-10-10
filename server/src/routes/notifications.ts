import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/:studentId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM student_notifications WHERE student_id = $1 ORDER BY created_at DESC', [req.params.studentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    const result = await pool.query('UPDATE student_notifications SET is_read = true WHERE id = $1 RETURNING *', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
