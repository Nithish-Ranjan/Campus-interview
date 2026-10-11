import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth/middleware.js';

export const overviewRouter = Router();

/**
 * GET /api/overview
 * Returns operations console KPIs, charts (academic year, branch, college, timeline, conflicts, funnel),
 * calculated directly from live PostgreSQL queries.
 */
overviewRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  // Reject students from coordinator operations dashboard
  if (req.user?.role === 'student') {
    return res.status(403).json({ error: 'Forbidden: Students use /my-schedule portal' });
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

      const filterCompanyId = selectedComp ? selectedComp.id : null;

      // 2. Total Registered Students
      const regRes = await client.query('SELECT COUNT(DISTINCT id)::int as count FROM students');
      const totalRegisteredStudents = regRes.rows[0]?.count || 0;

      // 3. Calculate Application KPIs from PostgreSQL
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

      // 4. Calculate Interview Execution Summary from PostgreSQL
      const interviewStatsRes = await client.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'scheduled')::int as scheduled,
          COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
          COUNT(*) FILTER (WHERE status = 'delayed' OR delay_minutes > 0)::int as delayed,
          COUNT(*) FILTER (WHERE status = 'no_show')::int as no_show
        FROM interview_slots
        WHERE ($1::text IS NULL OR company_id = $1)
      `, [filterCompanyId]);

      const ivRow = interviewStatsRes.rows[0] || {
        total: 0,
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        delayed: 0,
        no_show: 0
      };

      // 5. Chart 1: Students by Academic Year & Graduation Year
      const yearChartRes = await client.query(`
        SELECT 
          academic_year as "academicYear",
          graduation_year as "graduationYear",
          COUNT(*)::int as count
        FROM students
        GROUP BY academic_year, graduation_year
        ORDER BY academic_year ASC
      `);

      // 6. Chart 2: Students by Branch / Department (Registered, Eligible, Selected)
      const branchChartRes = await client.query(`
        SELECT 
          s.branch,
          COUNT(DISTINCT s.id)::int as registered,
          COUNT(DISTINCT a.student_id) FILTER (WHERE a.eligibility = 'eligible')::int as eligible,
          COUNT(DISTINCT a.student_id) FILTER (WHERE a.selection = 'selected')::int as selected
        FROM students s
        LEFT JOIN student_applications a ON s.id = a.student_id AND ($1::text IS NULL OR a.company_id = $1)
        GROUP BY s.branch
        ORDER BY s.branch ASC
      `, [filterCompanyId]);

      // 7. Chart 3: College / Institution Breakdown
      const collegeChartRes = await client.query(`
        SELECT college_name as "collegeName", COUNT(*)::int as count
        FROM students
        GROUP BY college_name
        ORDER BY count DESC
      `);

      // 8. Chart 4: Interview Timeline
      const timelineRes = await client.query(`
        SELECT 
          TO_CHAR(scheduled_start AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') as "timeSlot",
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'scheduled')::int as scheduled,
          COUNT(*) FILTER (WHERE status = 'in_progress')::int as "inProgress",
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
          COUNT(*) FILTER (WHERE status = 'delayed' OR delay_minutes > 0)::int as delayed
        FROM interview_slots
        WHERE ($1::text IS NULL OR company_id = $1)
        GROUP BY scheduled_start
        ORDER BY scheduled_start ASC
      `, [filterCompanyId]);

      // 9. Chart 5: Conflict Overview by Type
      const conflictRes = await client.query(`
        SELECT 
          type,
          COUNT(*)::int as count,
          COUNT(*) FILTER (WHERE resolved_at IS NULL)::int as open,
          COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::int as resolved
        FROM schedule_conflicts
        GROUP BY type
      `);

      // 10. Resource Utilization
      const utilRes = await client.query(`
        SELECT 
          (SELECT COUNT(*)::int FROM rooms) as total_rooms,
          (SELECT COUNT(DISTINCT room_id)::int FROM interview_slots WHERE ($1::text IS NULL OR company_id = $1)) as used_rooms,
          (SELECT COUNT(*)::int FROM interviewers) as total_interviewers,
          (SELECT COUNT(DISTINCT pm.interviewer_id)::int FROM interview_panel_members pm JOIN interview_slots sl ON pm.interview_id = sl.id WHERE ($1::text IS NULL OR sl.company_id = $1)) as used_interviewers
      `, [filterCompanyId]);
      const util = utilRes.rows[0] || { total_rooms: 3, used_rooms: 2, total_interviewers: 4, used_interviewers: 3 };

      // 11. Pending Proposals for Attention Items
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

      // 12. Pipeline Steps
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
          detail: (propRes.rowCount ?? 0) > 0 ? `${propRes.rowCount} proposal(s) pending approval` : 'Rooms operating on schedule'
        }
      ];

      return res.status(200).json({
        dataSource: 'postgres',
        company: selectedComp,
        companies,
        kpis: {
          totalRegisteredStudents,
          applications: kpiRow.total,
          eligible: kpiRow.eligible,
          selected: kpiRow.selected,
          waitlisted: kpiRow.waitlisted,
          ineligible: kpiRow.ineligible,
          pendingVerification: kpiRow.pending_verification,
          openConflicts: conflictRes.rows.reduce((sum, r) => sum + (r.open || 0), 0),
          pendingProposals: propRes.rowCount || 0,
          roomUtilization: `${util.used_rooms}/${util.total_rooms} rooms active`,
          interviewerUtilization: `${util.used_interviewers}/${util.total_interviewers} panellists deployed`
        },
        funnel: {
          applied: kpiRow.total,
          eligible: kpiRow.eligible,
          selected: kpiRow.selected,
          waitlisted: kpiRow.waitlisted,
          scheduled: ivRow.total,
          completed: ivRow.completed
        },
        pipelineSteps,
        attentionItems,
        todaySummary: {
          totalInterviews: ivRow.total,
          inProgress: ivRow.in_progress,
          completed: ivRow.completed,
          delayed: ivRow.delayed,
          scheduled: ivRow.scheduled,
          noShow: ivRow.no_show
        },
        charts: {
          byAcademicYear: yearChartRes.rows,
          byBranch: branchChartRes.rows,
          byCollege: collegeChartRes.rows,
          interviewTimeline: timelineRes.rows,
          conflicts: conflictRes.rows
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
