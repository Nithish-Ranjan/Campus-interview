import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { getOrGenerateMatchReport } from '../services/geminiService.js';

export const aiRouter = Router();

/**
 * POST /api/ai/match/:studentId/:companyId
 * Authorized match evaluation between student resume and company criteria.
 */
aiRouter.post('/match/:studentId/:companyId', requireAuth, async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const { studentId, companyId } = req.params;

  // Role authorization
  if (req.user?.role === 'student' && req.user.studentId !== studentId) {
    return res.status(403).json({ error: 'Students can only generate match evaluations for their own profile' });
  }
  if (req.user?.role === 'panel_coordinator' || req.user?.role === 'admin') {
    return res.status(403).json({ error: `Role '${req.user?.role}' cannot invoke matching evaluation` });
  }

  try {
    // 1. Fetch student
    const studentRes = await pool.query(
      `SELECT id, roll_number, name, branch, cgpa::float, backlogs, skills, resume_hash, parsed_resume as "parsedResume"
       FROM students WHERE id = $1`,
      [studentId]
    );
    if (studentRes.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = studentRes.rows[0];

    // 2. Fetch company
    const compRes = await pool.query(
      `SELECT id, name, role_title as "roleTitle", criteria_version as "criteriaVersion"
       FROM companies WHERE id = $1`,
      [companyId]
    );
    if (compRes.rowCount === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company = compRes.rows[0];

    // 3. Fetch criteria
    const critRes = await pool.query(
      `SELECT type, field, operator, value, weight, label
       FROM company_criteria WHERE company_id = $1 AND version = $2`,
      [companyId, company.criteriaVersion]
    );

    const report = await getOrGenerateMatchReport(student, company, critRes.rows);

    // Audit log
    await pool.query(
      `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        `audit-${Date.now()}`, req.user?.id || 'system', req.user?.name || 'User', req.user?.role || 'coordinator',
        'ai.match_evaluated', 'eligibility', 'student_application', `${studentId}-${companyId}`,
        `${student.name} -> ${company.name}`,
        `Match analysis generated: ${report.eligibility.toUpperCase()} (Score: ${report.matchScore})`
      ]
    );

    return res.status(200).json(report);
  } catch (err: any) {
    console.error('[AI Match Route Error]:', err);
    return res.status(500).json({ error: 'Failed to generate match analysis', message: err.message });
  }
});

/**
 * GET /api/ai/match/:studentId/:companyId
 * Retrieves existing match analysis for student and company.
 */
aiRouter.get('/match/:studentId/:companyId', requireAuth, async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const { studentId, companyId } = req.params;

  if (req.user?.role === 'student' && req.user.studentId !== studentId) {
    return res.status(403).json({ error: 'Students can only view their own match evaluations' });
  }
  if (req.user?.role === 'panel_coordinator' || req.user?.role === 'admin') {
    return res.status(403).json({ error: `Role '${req.user?.role}' cannot view candidate match reports` });
  }

  try {
    const resCached = await pool.query(
      `SELECT match_report FROM ai_match_results
       WHERE student_id = $1 AND company_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [studentId, companyId]
    );

    if (resCached.rowCount && resCached.rowCount > 0) {
      return res.status(200).json(resCached.rows[0].match_report);
    }

    // If not cached yet, generate automatically
    const studentRes = await pool.query(
      `SELECT id, roll_number, name, branch, cgpa::float, backlogs, skills, resume_hash, parsed_resume as "parsedResume"
       FROM students WHERE id = $1`,
      [studentId]
    );
    const compRes = await pool.query(
      `SELECT id, name, role_title as "roleTitle", criteria_version as "criteriaVersion"
       FROM companies WHERE id = $1`,
      [companyId]
    );
    if (studentRes.rowCount === 0 || compRes.rowCount === 0) {
      return res.status(404).json({ error: 'Student or company not found' });
    }

    const critRes = await pool.query(
      `SELECT type, field, operator, value, weight, label
       FROM company_criteria WHERE company_id = $1 AND version = $2`,
      [companyId, compRes.rows[0].criteriaVersion]
    );

    const report = await getOrGenerateMatchReport(studentRes.rows[0], compRes.rows[0], critRes.rows);
    return res.status(200).json(report);
  } catch (err: any) {
    console.error('[AI Match Get Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve match report' });
  }
});
