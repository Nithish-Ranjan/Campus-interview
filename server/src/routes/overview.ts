import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

export const overviewRouter = Router();

/**
 * GET /api/overview
 * Returns operations console KPIs, funnel statistics, pipeline status, and daily interview breakdown
 * calculated directly from live PostgreSQL queries.
 */
overviewRouter.get('/', async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const companyId = req.query.companyId as string | undefined;

  try {
    const client = await pool.connect();
    try {
      // 1. Fetch Companies
      const compRes = await client.query(`
        SELECT id, name, role_title as "roleTitle", round_name as "roundName", status, criteria_version as "criteriaVersion", slots
        FROM companies ORDER BY name ASC
      `);
      const companies = compRes.rows;
      const selectedComp = (companyId && companyId !== 'all')
        ? companies.find(c => c.id === companyId) || companies[0] || null
        : companies[0] || null;

      // 2. Calculate Application KPIs from PostgreSQL
      const filterCompanyId = selectedComp ? selectedComp.id : null;
      const kpiRes = await client.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE eligibility = 'eligible')::int as eligible,
          COUNT(*) FILTER (WHERE eligibility = 'ineligible')::int as ineligible,
          COUNT(*) FILTER (WHERE eligibility = 'pending_verification')::int as pending_verification,
          COUNT(*) FILTER (WHERE selection = 'selected')::int as selected,
          COUNT(*) FILTER (WHERE selection = 'waitlisted')::int as waitlisted
        FROM student_applications
        WHERE ($1::text IS NULL OR company_id = $1)
      `, [filterCompanyId]);

      const kpiRow = kpiRes.rows[0] || {
        total: 0,
        eligible: 0,
        ineligible: 0,
        pending_verification: 0,
        selected: 0,
        waitlisted: 0
      };

      // 3. Calculate Interview Execution Summary from PostgreSQL
      const interviewStatsRes = await client.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'scheduled')::int as scheduled,
          COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
          COUNT(*) FILTER (WHERE status = 'delayed' OR delay_minutes > 0)::int as delayed
        FROM interview_slots
        WHERE ($1::text IS NULL OR company_id = $1)
      `, [filterCompanyId]);

      const ivRow = interviewStatsRes.rows[0] || {
        total: 0,
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        delayed: 0
      };

      // 4. Fetch Pending Proposals for Attention Items
      const propRes = await client.query(`
        SELECT id, title, description, status, created_at as "createdAt"
        FROM recovery_proposals
        WHERE status = 'pending_approval'
        ORDER BY created_at DESC
        LIMIT 2
      `);

      const attentionItems = propRes.rows.map(p => ({
        id: `att-${p.id}`,
        type: 'warning' as const,
        title: 'Review Pending Recovery Proposal',
        message: `${p.title}. Approval required by Placement Officer.`,
        actionLabel: 'Open 2-Key Approval',
        actionRoute: `/approvals`
      }));

      // 5. Dynamic Pipeline Steps
      const pipelineSteps = [
        {
          id: 'step-1',
          title: 'Criteria Lock & Eligibility',
          route: '/eligibility',
          state: kpiRow.eligible > 0 ? 'complete' : 'in_progress',
          detail: `${kpiRow.eligible} candidates verified eligible`
        },
        {
          id: 'step-2',
          title: 'Capacity & Allocation',
          route: '/capacity',
          state: kpiRow.selected > 0 ? 'complete' : 'in_progress',
          detail: `${kpiRow.selected} slots allocated for ${selectedComp?.name || 'Drive'}`
        },
        {
          id: 'step-3',
          title: 'Schedule Construction',
          route: '/schedule',
          state: ivRow.total > 0 ? 'complete' : 'in_progress',
          detail: `${ivRow.total} confirmed interview slots published`
        },
        {
          id: 'step-4',
          title: 'Live Execution & Recovery',
          route: '/live',
          state: (propRes.rowCount ?? 0) > 0 ? 'needs_attention' : (ivRow.in_progress > 0 ? 'in_progress' : 'complete'),
          detail: (propRes.rowCount ?? 0) > 0 ? '1 proposal pending approval' : 'Rooms operating on schedule'
        }
      ];

      return res.status(200).json({
        dataSource: 'postgres',
        company: selectedComp,
        companies,
        kpis: {
          applications: kpiRow.total,
          eligible: kpiRow.eligible,
          selected: kpiRow.selected,
          waitlisted: kpiRow.waitlisted,
          ineligible: kpiRow.ineligible,
          pendingVerification: kpiRow.pending_verification
        },
        funnel: {
          applied: kpiRow.total,
          eligible: kpiRow.eligible,
          selected: kpiRow.selected,
          waitlisted: kpiRow.waitlisted
        },
        pipelineSteps,
        attentionItems,
        todaySummary: {
          totalInterviews: ivRow.total,
          inProgress: ivRow.in_progress,
          completed: ivRow.completed,
          delayed: ivRow.delayed,
          scheduled: ivRow.scheduled
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Overview API Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve overview metrics', message: error.message });
  }
});
