import { Pool, PoolClient } from 'pg';
import { ValidatableSlot } from './types.js';

/**
 * Fetches all interview slots joined with student, company, room, and panelist details
 * for a specific schedule mode ('published' or 'draft').
 */
export async function fetchValidatableSlots(
  client: Pool | PoolClient,
  mode: 'published' | 'draft' = 'published'
): Promise<ValidatableSlot[]> {
  const query = `
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
      s.status,
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

  const result = await client.query(query, [mode]);

  return result.rows.map(row => ({
    id: row.id,
    studentId: row.studentId,
    studentName: row.studentName,
    rollNumber: row.rollNumber,
    companyId: row.companyId,
    companyName: row.companyName,
    roomId: row.roomId,
    roomName: row.roomName,
    scheduledStart: new Date(row.scheduledStart).toISOString(),
    scheduledEnd: new Date(row.scheduledEnd).toISOString(),
    status: row.status,
    interviewerIds: Array.isArray(row.interviewerIds) ? row.interviewerIds : [],
    interviewerNames: Array.isArray(row.interviewerNames) ? row.interviewerNames : []
  }));
}
