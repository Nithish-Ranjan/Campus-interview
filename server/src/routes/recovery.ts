import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { simulateDisruption, buildProposalArtifacts } from '../domain/recoveryEngine.js';
import { fetchValidatableSlots } from '../domain/slotQueries.js';

const router = Router();

/**
 * Normalizes a raw PostgreSQL recovery_proposals row to the camelCase shape
 * expected by the frontend RecoveryProposal type.
 * Handles: snake_case field names, JSONB fields (may be object or JSON string).
 */
function normalizeProposal(row: any) {
  const parseJson = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  };
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdByUserId: row.created_by_user_id,
    createdByUserName: row.created_by_user_name,
    createdAt: row.created_at,
    status: row.status,
    simulationId: row.simulation_id,
    baseScheduleVersion: row.base_schedule_version,
    proposedScheduleVersion: row.proposed_schedule_version,
    diffItems: parseJson(row.diff_items),
    validationChecks: parseJson(row.validation_checks),
    note: row.note,
    isStale: row.is_stale,
    decidedByUserId: row.decided_by_user_id,
    decidedAt: row.decided_at,
    decisionNote: row.decision_note,
    updatedAt: row.updated_at
  };
}

const generateBodySchema = z.object({
  type: z.string(),
  targetId: z.string(),
  delayMinutes: z.number().optional()
});

router.post('/generate', async (req, res) => {
  const parseResult = generateBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.format() });
  }

  const { type, targetId, delayMinutes = 30 } = parseResult.data;

  try {
    const client = await pool!.connect();
    try {
      const currentSlots = await fetchValidatableSlots(client, 'published');
      const roomsRes = await client.query('SELECT id, name FROM rooms');
      
      const simulation = simulateDisruption(currentSlots, roomsRes.rows, type, targetId, delayMinutes);
      res.json(simulation);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error generating simulation:', error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to generate simulation' });
  }
});

const createBodySchema = z.object({
  type: z.string(),
  targetId: z.string(),
  delayMinutes: z.number().optional(),
  alternativeId: z.string(),
  note: z.string().optional()
});

router.post('/', async (req, res) => {
  const parseResult = createBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.format() });
  }

  const { type, targetId, delayMinutes = 30, alternativeId, note } = parseResult.data;
  
  // Derive user identity from authenticated session, fallback to actor header for test harnesses
  const createdByUserId = req.user?.id || (req.headers['x-actor-id'] as string) || 'user-coord';
  const createdByUserName = req.user?.name || (req.headers['x-actor-name'] as string) || 'Rishi Nair (Coordinator)';
  const actorRole = req.user?.role || 'coordinator';

  try {
    const client = await pool!.connect();
    try {
      await client.query('BEGIN');

      const currentSlots = await fetchValidatableSlots(client, 'published');
      const roomsRes = await client.query('SELECT id, name FROM rooms');
      
      // Re-run simulation
      const simulation = simulateDisruption(currentSlots, roomsRes.rows, type, targetId, delayMinutes);
      const alt = simulation.alternatives.find(a => a.id === alternativeId);
      
      if (!alt) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Alternative not found' });
      }
      if (!alt.isValid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cannot create proposal from an invalid alternative' });
      }

      // Check current schedule version
      const verRes = await client.query('SELECT MAX(schedule_version) as ver FROM interview_slots WHERE schedule_mode = $1', ['published']);
      const currentVersion = verRes.rows[0].ver || 1;

      const { diffItems, validationChecks } = buildProposalArtifacts(alt.scheduleShifts, currentSlots, { isValid: alt.isValid, conflicts: [] });

      const proposalId = `prop-rec-${Date.now()}`;
      const title = `Recovery Proposal: ${alt.title}`;
      
      await client.query(
        `INSERT INTO recovery_proposals (
          id, title, description, created_by_user_id, created_by_user_name, status,
          simulation_id, base_schedule_version, proposed_schedule_version, diff_items, validation_checks, note, is_stale, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE, NOW(), NOW())`,
        [
          proposalId, title, alt.description, createdByUserId, createdByUserName, 'pending_approval',
          simulation.id, currentVersion, currentVersion + 1, JSON.stringify(diffItems), JSON.stringify(validationChecks), note || ''
        ]
      );

      // Audit Log
      const auditId = `audit-${Date.now()}`;
      await client.query(
        `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [auditId, createdByUserId, createdByUserName, actorRole, 'recovery.proposal_created', 'recovery', 'proposal', proposalId, title, `Created recovery proposal from simulation`]
      );

      await client.query('COMMIT');
      
      const resData = await client.query('SELECT * FROM recovery_proposals WHERE id = $1', [proposalId]);
      res.status(201).json(normalizeProposal(resData.rows[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal', detail: error.message, stack: error.stack });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool!.query('SELECT * FROM recovery_proposals ORDER BY created_at DESC');
    res.json(result.rows.map(normalizeProposal));
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool!.query('SELECT * FROM recovery_proposals WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json(normalizeProposal(result.rows[0]));
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// Approvals and Rejections
const decideSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().optional()
});

router.post('/:id/decide', async (req, res) => {
  const parseResult = decideSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  
  const { decision, note } = parseResult.data;
  const proposalId = req.params.id;
  
  const actorId = req.user?.id || (req.headers['x-actor-id'] as string) || 'user-officer';
  const actorName = req.user?.name || (req.headers['x-actor-name'] as string) || 'Prof. Meera Sen (Officer)';
  const actorRole = req.user?.role || 'officer';
  
  try {
    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      const propRes = await client.query('SELECT * FROM recovery_proposals WHERE id = $1 FOR UPDATE', [proposalId]);
      if (propRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Proposal not found' });
      }
      
      const proposal = propRes.rows[0];
      if (proposal.status !== 'pending_approval') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Proposal is not pending approval' });
      }
      if (proposal.created_by_user_id === actorId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Creator cannot approve their own proposal' });
      }

      let newStatus = '';
      if (decision === 'reject') {
        // Immediate rejection
        await client.query(
          'UPDATE recovery_proposals SET status = $1, decided_by_user_id = $2, decided_at = NOW(), decision_note = $3, updated_at = NOW() WHERE id = $4',
          ['rejected', actorId, note || '', proposalId]
        );
        newStatus = 'rejected';
      } else {
        // Record approval
        await client.query(
          'INSERT INTO proposal_approvals (id, proposal_id, actor_id, decision, note) VALUES ($1, $2, $3, $4, $5)',
          [`appr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, proposalId, actorId, 'approve', note || '']
        );
        
        // Count approvals
        const apprRes = await client.query('SELECT COUNT(*) as count FROM proposal_approvals WHERE proposal_id = $1 AND decision = $2', [proposalId, 'approve']);
        const count = parseInt(apprRes.rows[0].count, 10);
        
        if (count >= 2) {
          await client.query(
            'UPDATE recovery_proposals SET status = $1, decided_by_user_id = $2, decided_at = NOW(), decision_note = $3, updated_at = NOW() WHERE id = $4',
            ['approved', actorId, 'Approved by two reviewers', proposalId]
          );
          newStatus = 'approved';
        } else {
          newStatus = 'pending_approval';
        }
      }
      
      // Audit
      await client.query(
        `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [`audit-${Date.now()}`, actorId, actorName, 'admin', `recovery.proposal_${newStatus}`, 'approval', 'proposal', proposalId, proposal.title, `Proposal ${newStatus}`]
      );

      await client.query('COMMIT');
      const finalRes = await pool!.query('SELECT * FROM recovery_proposals WHERE id = $1', [proposalId]);
      res.json(normalizeProposal(finalRes.rows[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deciding proposal:', error);
    res.status(500).json({ error: 'Failed to decide proposal' });
  }
});

// Apply proposal
router.post('/:id/apply', async (req, res) => {
  const proposalId = req.params.id;
  const actorId = req.user?.id || (req.headers['x-actor-id'] as string) || 'user-coord';
  const actorName = req.user?.name || (req.headers['x-actor-name'] as string) || 'Rishi Nair (Coordinator)';
  const actorRole = req.user?.role || 'coordinator';

  try {
    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      
      const propRes = await client.query('SELECT * FROM recovery_proposals WHERE id = $1 FOR UPDATE', [proposalId]);
      if (propRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Proposal not found' });
      }
      
      const proposal = propRes.rows[0];
      if (proposal.status !== 'approved') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Only approved proposals can be applied' });
      }

      const verRes = await client.query('SELECT MAX(schedule_version) as ver FROM interview_slots WHERE schedule_mode = $1', ['published']);
      const currentVersion = verRes.rows[0].ver || 1;
      
      if (currentVersion !== proposal.base_schedule_version) {
        await client.query('UPDATE recovery_proposals SET status = $1, is_stale = true WHERE id = $2', ['stale', proposalId]);
        await client.query('COMMIT');
        return res.status(409).json({ error: 'Proposal is stale. Schedule has changed since generation.' });
      }

      // Lock all slots
      await client.query("SELECT id FROM interview_slots WHERE schedule_mode = 'published' ORDER BY id FOR UPDATE");
      
      const shifts = proposal.diff_items as any[];
      
      // Update the slots
      for (const shift of shifts) {
        if (!shift.after || !shift.after.start) continue;
        await client.query(
          `UPDATE interview_slots 
           SET room_id = $1, scheduled_start = $2, scheduled_end = $3, schedule_version = $4, has_moved = true, updated_at = NOW()
           WHERE id = $5 AND schedule_mode = 'published'`,
          [shift.after.roomId, shift.after.start, shift.after.end, proposal.proposed_schedule_version, shift.interviewId]
        );
      }
      
      // Apply the proposal status
      await client.query("UPDATE recovery_proposals SET status = 'applied', updated_at = NOW() WHERE id = $1", [proposalId]);

      // Audit
      await client.query(
        `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [`audit-${Date.now()}`, actorId, actorName, 'admin', 'recovery.proposal_applied', 'schedule', 'proposal', proposalId, proposal.title, 'Applied recovery proposal schedule changes']
      );
      
      // Notify students
      for (const shift of shifts) {
        const slotRes = await client.query('SELECT student_id FROM interview_slots WHERE id = $1', [shift.interviewId]);
        if (slotRes.rowCount && slotRes.rowCount > 0) {
          const studentId = slotRes.rows[0].student_id;
          await client.query(
            `INSERT INTO student_notifications (id, student_id, title, message, type) VALUES ($1, $2, $3, $4, $5)`,
            [`notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, studentId, 'Schedule Updated', `Your interview schedule was updated due to a delay recovery.`, 'schedule_change']
          );
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Proposal applied successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error applying proposal:', error);
    res.status(500).json({ error: 'Failed to apply proposal', detail: error.message, stack: error.stack });
  }
});

export default router;
