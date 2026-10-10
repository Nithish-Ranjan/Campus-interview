import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { fetchValidatableSlots } from '../domain/slotQueries.js';
import { validateScheduleSlots } from '../domain/validator.js';

export const interviewsRouter = Router();

const querySchema = z.object({
  mode: z.enum(['published', 'draft', 'simulation']).optional().default('published')
});

/**
 * GET /api/interviews
 * Returns interview assignments with joined student, company, room, and panel details.
 * Prevents duplicates by aggregating panel members.
 */
interviewsRouter.get('/', async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const parseResult = querySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: parseResult.error.format()
    });
  }

  const { mode } = parseResult.data;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          s.id,
          s.student_id as "studentId",
          st.name as "studentName",
          st.roll_number as "rollNumber",
          s.company_id as "companyId",
          c.name as "companyName",
          s.room_id as "roomId",
          r.name as "roomName",
          s.scheduled_start as "scheduledStart",
          s.scheduled_end as "scheduledEnd",
          s.actual_start as "actualStart",
          s.actual_end as "actualEnd",
          s.estimated_start as "estimatedStart",
          s.estimated_end as "estimatedEnd",
          s.status,
          s.delay_minutes as "delayMinutes",
          s.delay_reason as "delayReason",
          s.allowed_actions as "allowedActions",
          s.has_moved as "hasMoved",
          s.schedule_version as "scheduleVersion",
          COALESCE(
            array_agg(iv.id) FILTER (WHERE iv.id IS NOT NULL),
            ARRAY[]::varchar[]
          ) as "interviewerIds",
          COALESCE(
            array_agg(iv.name) FILTER (WHERE iv.name IS NOT NULL),
            ARRAY[]::varchar[]
          ) as "interviewerNames"
        FROM interview_slots s
        JOIN students st ON s.student_id = st.id
        JOIN companies c ON s.company_id = c.id
        JOIN rooms r ON s.room_id = r.id
        LEFT JOIN interview_panel_members pm ON s.id = pm.interview_id
        LEFT JOIN interviewers iv ON pm.interviewer_id = iv.id
        WHERE s.schedule_mode = $1
        GROUP BY s.id, st.name, st.roll_number, c.name, r.name
        ORDER BY s.scheduled_start ASC
      `, [mode]);

      // Format ISO string dates for exact frontend compatibility
      const interviews = result.rows.map(row => ({
        ...row,
        scheduledStart: new Date(row.scheduledStart).toISOString(),
        scheduledEnd: new Date(row.scheduledEnd).toISOString(),
        actualStart: row.actualStart ? new Date(row.actualStart).toISOString() : undefined,
        actualEnd: row.actualEnd ? new Date(row.actualEnd).toISOString() : undefined,
        estimatedStart: row.estimatedStart ? new Date(row.estimatedStart).toISOString() : undefined,
        estimatedEnd: row.estimatedEnd ? new Date(row.estimatedEnd).toISOString() : undefined,
        allowedActions: Array.isArray(row.allowedActions) ? row.allowedActions : ['check_in', 'start', 'mark_delayed', 'cancel']
      }));

      return res.status(200).json({
        version: result.rows[0]?.scheduleVersion || 1,
        interviews,
        dataSource: 'postgres'
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Interviews API Error]:', error);
    return res.status(500).json({
      error: 'Failed to retrieve interviews from database',
      message: error.message
    });
  }
});

const moveBodySchema = z.object({
  targetRoomId: z.string(),
  targetStart: z.string()
});

/**
 * PUT /api/interviews/:id/move
 * Moves an interview in draft mode and validates against conflicts.
 */
interviewsRouter.put('/:id/move', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const parseResult = moveBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parseResult.error.format()
    });
  }

  const { targetRoomId, targetStart } = parseResult.data;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get the current interview slot
      const currentSlotRes = await client.query('SELECT * FROM interview_slots WHERE id = $1', [id]);
      if (currentSlotRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      const currentSlot = currentSlotRes.rows[0];
      if (currentSlot.schedule_mode !== 'draft') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Only draft schedule can be edited directly' });
      }

      // Calculate targetEnd (keep same duration)
      const durationMs = new Date(currentSlot.scheduled_end).getTime() - new Date(currentSlot.scheduled_start).getTime();
      const newStart = new Date(targetStart);
      const newEnd = new Date(newStart.getTime() + durationMs);

      // 2. Fetch all validatable slots for draft mode
      const slots = await fetchValidatableSlots(client, 'draft');

      // 3. Update the target slot in memory for validation
      const targetSlot = slots.find(s => s.id === id);
      if (targetSlot) {
        targetSlot.roomId = targetRoomId;
        
        // Find the new room name if needed for error messages
        const roomRes = await client.query('SELECT name FROM rooms WHERE id = $1', [targetRoomId]);
        if (roomRes.rowCount && roomRes.rowCount > 0) {
           targetSlot.roomName = roomRes.rows[0].name;
        }

        targetSlot.scheduledStart = newStart.toISOString();
        targetSlot.scheduledEnd = newEnd.toISOString();
      }

      // 4. Run deterministic validation
      const validationResult = validateScheduleSlots(slots);

      // 5. If it conflicts with this specific interview, return 409
      const myConflicts = validationResult.conflictsBySlotId[id] || [];
      if (myConflicts.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Schedule Conflict',
          details: { conflicts: myConflicts }
        });
      }

      // 6. Otherwise, apply the move
      const updateRes = await client.query(`
        UPDATE interview_slots
        SET room_id = $1, scheduled_start = $2, scheduled_end = $3, has_moved = true
        WHERE id = $4
        RETURNING *
      `, [targetRoomId, newStart.toISOString(), newEnd.toISOString(), id]);

      await client.query('COMMIT');
      
      const updatedRow = updateRes.rows[0];
      return res.status(200).json({
        id: updatedRow.id,
        scheduledStart: updatedRow.scheduled_start,
        scheduledEnd: updatedRow.scheduled_end,
        roomId: updatedRow.room_id,
        hasMoved: updatedRow.has_moved
      });
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Interviews API Error]:', error);
    return res.status(500).json({
      error: 'Failed to move interview',
      message: error.message
    });
  }
});
