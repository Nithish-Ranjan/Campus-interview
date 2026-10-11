import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { fetchValidatableSlots } from '../domain/slotQueries.js';
import { validateScheduleSlots } from '../domain/validator.js';
import { ValidatableSlot } from '../domain/types.js';

export const interviewsRouter = Router();

const querySchema = z.object({
  mode: z.enum(['published', 'draft', 'simulation']).optional().default('published')
});

/**
 * GET /api/interviews
 * Returns interview assignments with joined student, company, room, and panel details.
 * Prevents duplicates by aggregating panel members.
 * In draft mode, auto-populates from published if draft is empty.
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
      const getSql = `
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
      `;

      let result = await client.query(getSql, [mode]);

      // If draft workspace requested but no draft slots exist yet, clone published into draft
      if (result.rowCount === 0 && mode === 'draft') {
        await client.query(`
          INSERT INTO interview_slots (
            id, student_id, company_id, room_id, scheduled_start, scheduled_end,
            status, delay_minutes, schedule_mode, schedule_version, has_moved,
            allowed_actions, created_at, updated_at
          )
          SELECT 
            id || '-draft', student_id, company_id, room_id, scheduled_start, scheduled_end,
            status, delay_minutes, 'draft', schedule_version, false,
            allowed_actions, NOW(), NOW()
          FROM interview_slots
          WHERE schedule_mode = 'published'
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO interview_panel_members (interview_id, interviewer_id)
          SELECT s.id || '-draft', pm.interviewer_id
          FROM interview_slots s
          JOIN interview_panel_members pm ON s.id = pm.interview_id
          WHERE s.schedule_mode = 'published'
          ON CONFLICT (interview_id, interviewer_id) DO NOTHING;
        `);
        result = await client.query(getSql, [mode]);
      }

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
 * Common handler for PUT and POST /api/interviews/:id/move
 * Moves an interview slot and runs deterministic conflict validation.
 * If conflicts exist, rolls back and returns 409 with full conflict details.
 */
const handleMove = async (req: Request, res: Response) => {
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
      let currentSlotRes = await client.query('SELECT * FROM interview_slots WHERE id = $1', [id]);
      let targetId = id;
      if (currentSlotRes.rowCount === 0 && !id.endsWith('-draft')) {
        currentSlotRes = await client.query('SELECT * FROM interview_slots WHERE id = $1', [`${id}-draft`]);
        if (currentSlotRes.rowCount && currentSlotRes.rowCount > 0) {
          targetId = `${id}-draft`;
        }
      }

      if (currentSlotRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      const currentSlot = currentSlotRes.rows[0];

      // Align targetStart to the slot's schedule date (daily timetable grid)
      const slotDate = new Date(currentSlot.scheduled_start);
      const parsedTarget = new Date(targetStart);
      const slotDayStr = slotDate.toISOString().split('T')[0];
      const targetDayStr = parsedTarget.toISOString().split('T')[0];
      
      let newStart: Date;
      if (slotDayStr !== targetDayStr && !targetStart.includes(slotDayStr)) {
        const timePart = parsedTarget.toISOString().split('T')[1];
        newStart = new Date(`${slotDayStr}T${timePart}`);
      } else {
        newStart = parsedTarget;
      }

      // Calculate targetEnd (keep same duration, default 30m)
      const durationMs = new Date(currentSlot.scheduled_end).getTime() - slotDate.getTime();
      const newEnd = new Date(newStart.getTime() + (durationMs > 0 ? durationMs : 30 * 60000));

      // 2. Fetch all validatable slots for the slot's schedule mode
      const slots = await fetchValidatableSlots(client, currentSlot.schedule_mode as any);

      // 3. Update the target slot in memory for validation
      const targetSlot = slots.find(s => s.id === targetId);
      if (targetSlot) {
        targetSlot.roomId = targetRoomId;
        
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
      const myConflicts = validationResult.conflictsBySlotId[targetId] || [];
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
        SET room_id = $1, scheduled_start = $2, scheduled_end = $3, has_moved = true, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [targetRoomId, newStart.toISOString(), newEnd.toISOString(), targetId]);

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
};

interviewsRouter.put('/:id/move', handleMove);
interviewsRouter.post('/:id/move', handleMove);

const createSlotSchema = z.object({
  studentId: z.string(),
  companyId: z.string(),
  roomId: z.string(),
  scheduledStart: z.string(),
  scheduledEnd: z.string().optional(),
  interviewerIds: z.array(z.string()).optional().default([]),
  scheduleMode: z.enum(['published', 'draft', 'simulation']).optional().default('published')
});

/**
 * POST /api/interviews
 * Schedules a new interview slot and deterministically validates against conflicts.
 * Returns 409 with details if conflicts occur.
 */
interviewsRouter.post('/', async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const parseResult = createSlotSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parseResult.error.format()
    });
  }

  const { studentId, companyId, roomId, scheduledStart, scheduledEnd, interviewerIds, scheduleMode } = parseResult.data;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify student, company, room
      const stuRes = await client.query('SELECT name, roll_number FROM students WHERE id = $1', [studentId]);
      if (stuRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Student not found' });
      }
      const compRes = await client.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (compRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Company not found' });
      }
      const roomRes = await client.query('SELECT name FROM rooms WHERE id = $1', [roomId]);
      if (roomRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Room not found' });
      }

      // Calculate end time (default: 30 minutes after start)
      const startDate = new Date(scheduledStart);
      const endDate = scheduledEnd ? new Date(scheduledEnd) : new Date(startDate.getTime() + 30 * 60000);

      // Fetch interviewer names
      let ivNames: string[] = [];
      let finalInterviewerIds = interviewerIds;
      if (finalInterviewerIds.length > 0) {
        const ivRes = await client.query('SELECT name FROM interviewers WHERE id = ANY($1)', [finalInterviewerIds]);
        ivNames = ivRes.rows.map(r => r.name);
      } else {
        // Fallback default interviewer if none specified
        const defaultIv = await client.query('SELECT id, name FROM interviewers LIMIT 1');
        if (defaultIv.rowCount && defaultIv.rowCount > 0) {
          finalInterviewerIds = [defaultIv.rows[0].id];
          ivNames = [defaultIv.rows[0].name];
        }
      }

      // 2. Fetch existing validatable slots for this schedule mode
      const existingSlots = await fetchValidatableSlots(client, scheduleMode as any);

      // 3. Create candidate slot for conflict detection
      const newSlotId = `slot-add-${Date.now()}`;
      const candidateSlot: ValidatableSlot = {
        id: newSlotId,
        studentId,
        studentName: stuRes.rows[0].name,
        rollNumber: stuRes.rows[0].roll_number,
        companyId,
        companyName: compRes.rows[0].name,
        roomId,
        roomName: roomRes.rows[0].name,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
        status: 'scheduled',
        interviewerIds: finalInterviewerIds,
        interviewerNames: ivNames
      };

      // 4. Run deterministic validation
      const validationResult = validateScheduleSlots([...existingSlots, candidateSlot]);
      const myConflicts = validationResult.conflictsBySlotId[newSlotId] || [];

      if (myConflicts.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Schedule Conflict',
          details: { conflicts: myConflicts }
        });
      }

      // 5. If no conflicts, insert into database
      await client.query(`
        INSERT INTO interview_slots (
          id, student_id, company_id, room_id, scheduled_start, scheduled_end,
          status, delay_minutes, schedule_mode, schedule_version, has_moved,
          allowed_actions, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'scheduled', 0, $7, 1, false,
          '["check_in", "start", "mark_delayed", "cancel"]'::jsonb, NOW(), NOW()
        )
      `, [newSlotId, studentId, companyId, roomId, startDate.toISOString(), endDate.toISOString(), scheduleMode]);

      // Link panel members
      for (const ivId of finalInterviewerIds) {
        await client.query(`
          INSERT INTO interview_panel_members (interview_id, interviewer_id)
          VALUES ($1, $2)
          ON CONFLICT (interview_id, interviewer_id) DO NOTHING
        `, [newSlotId, ivId]);
      }

      await client.query('COMMIT');

      return res.status(201).json({
        id: newSlotId,
        studentId,
        studentName: stuRes.rows[0].name,
        rollNumber: stuRes.rows[0].roll_number,
        companyId,
        companyName: compRes.rows[0].name,
        roomId,
        roomName: roomRes.rows[0].name,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
        status: 'scheduled',
        interviewerIds: finalInterviewerIds,
        interviewerNames: ivNames,
        scheduleMode
      });
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Interviews Create Error]:', error);
    return res.status(500).json({
      error: 'Failed to create interview',
      message: error.message
    });
  }
});
