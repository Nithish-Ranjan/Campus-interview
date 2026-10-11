import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

export const companiesRouter = Router();

/**
 * GET /api/companies
 * Returns all registered companies with their structured criteria gates.
 */
companiesRouter.get('/', async (_req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const client = await pool.connect();
    try {
      // 1. Fetch companies
      const compResult = await client.query(`
        SELECT 
          id,
          name,
          role_title as "roleTitle",
          round_name as "roundName",
          status,
          criteria_version as "criteriaVersion",
          slots
        FROM companies
        ORDER BY name ASC
      `);

      // 2. Fetch criteria
      const critResult = await client.query(`
        SELECT 
          id,
          company_id as "companyId",
          version,
          type,
          field,
          operator,
          value,
          weight,
          label
        FROM company_criteria
        ORDER BY id ASC
      `);

      const criteriaByCompany = new Map<string, { mandatory: any[]; preferred: any[] }>();
      for (const cr of critResult.rows) {
        if (!criteriaByCompany.has(cr.companyId)) {
          criteriaByCompany.set(cr.companyId, { mandatory: [], preferred: [] });
        }
        const group = criteriaByCompany.get(cr.companyId)!;
        const formattedCrit = {
          id: cr.id,
          field: cr.field,
          operator: cr.operator,
          value: cr.value,
          type: cr.type,
          weight: cr.weight ?? undefined,
          label: cr.label
        };

        if (cr.type === 'mandatory') {
          group.mandatory.push(formattedCrit);
        } else {
          group.preferred.push(formattedCrit);
        }
      }

      const companies = compResult.rows.map(c => {
        const crit = criteriaByCompany.get(c.id) || { mandatory: [], preferred: [] };
        return {
          id: c.id,
          name: c.name,
          roleTitle: c.roleTitle,
          roundName: c.roundName,
          status: c.status,
          criteriaVersion: c.criteriaVersion,
          slots: c.slots,
          mandatoryCriteria: crit.mandatory,
          preferredCriteria: crit.preferred
        };
      });

      return res.status(200).json(companies);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Companies API Error]:', error);
    return res.status(500).json({
      error: 'Failed to retrieve companies from database',
      message: error.message
    });
  }
});

/**
 * GET /api/companies/:id
 */
companiesRouter.get('/:id', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const { id } = req.params;

  try {
    const client = await pool.connect();
    try {
      const compResult = await client.query(
        `SELECT id, name, role_title as "roleTitle", round_name as "roundName", status, criteria_version as "criteriaVersion", slots
         FROM companies WHERE id = $1`,
        [id]
      );

      if (compResult.rowCount === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const c = compResult.rows[0];

      const critResult = await client.query(
        `SELECT id, type, field, operator, value, weight, label FROM company_criteria WHERE company_id = $1`,
        [id]
      );

      const mandatoryCriteria: any[] = [];
      const preferredCriteria: any[] = [];

      for (const cr of critResult.rows) {
        const item = {
          id: cr.id,
          field: cr.field,
          operator: cr.operator,
          value: cr.value,
          type: cr.type,
          weight: cr.weight ?? undefined,
          label: cr.label
        };
        if (cr.type === 'mandatory') mandatoryCriteria.push(item);
        else preferredCriteria.push(item);
      }

      return res.status(200).json({
        ...c,
        mandatoryCriteria,
        preferredCriteria
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/companies
 * Registers a new company with initial criteria
 */
companiesRouter.post('/', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const { name, roleTitle, roundName, slots, mandatoryCriteria, preferredCriteria } = req.body;

  if (!name || !roleTitle) {
    return res.status(400).json({ error: 'Company name and roleTitle are required' });
  }

  const companyId = `comp-${Date.now().toString(36)}`;
  const companySlots = Number(slots) || 10;
  const companyRound = roundName || 'Round 1 - Technical Interview';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO companies (id, name, role_title, round_name, status, criteria_version, slots, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', 1, $5, NOW(), NOW())`,
      [companyId, name, roleTitle, companyRound, companySlots]
    );

    const mandatoryList: any[] = [];
    const preferredList: any[] = [];

    // Default or provided mandatory criteria
    const mandInput = Array.isArray(mandatoryCriteria) && mandatoryCriteria.length > 0
      ? mandatoryCriteria
      : [
          { field: 'cgpa', operator: 'gte', value: 7.0, label: 'Minimum CGPA 7.0' },
          { field: 'backlogs', operator: 'eq', value: 0, label: 'Zero Active Backlogs' }
        ];

    for (let i = 0; i < mandInput.length; i++) {
      const crit = mandInput[i];
      const critId = crit.id || `crit-man-${companyId}-${i + 1}`;
      const critVal = crit.value !== undefined ? crit.value : 7.0;
      await client.query(
        `INSERT INTO company_criteria (id, company_id, version, type, field, operator, value, label, created_at)
         VALUES ($1, $2, 1, 'mandatory', $3, $4, $5::jsonb, $6, NOW())`,
        [critId, companyId, crit.field, crit.operator, JSON.stringify(critVal), crit.label || `${crit.field} ${crit.operator} ${critVal}`]
      );
      mandatoryList.push({
        id: critId,
        field: crit.field,
        operator: crit.operator,
        value: critVal,
        type: 'mandatory',
        label: crit.label || `${crit.field} ${crit.operator} ${critVal}`
      });
    }

    // Default or provided preferred criteria
    const prefInput = Array.isArray(preferredCriteria) && preferredCriteria.length > 0
      ? preferredCriteria
      : [
          { field: 'skills', operator: 'in', value: 'Problem Solving', weight: 40, label: 'Data Structures & Problem Solving' }
        ];

    for (let i = 0; i < prefInput.length; i++) {
      const pref = prefInput[i];
      const prefId = pref.id || `crit-pref-${companyId}-${i + 1}`;
      const weightVal = Number(pref.weight) || 30;
      const prefVal = pref.value !== undefined ? pref.value : 'Problem Solving';
      await client.query(
        `INSERT INTO company_criteria (id, company_id, version, type, field, operator, value, weight, label, created_at)
         VALUES ($1, $2, 1, 'preferred', $3, $4, $5::jsonb, $6, $7, NOW())`,
        [prefId, companyId, pref.field, pref.operator, JSON.stringify(prefVal), weightVal, pref.label || `${pref.field} (${prefVal})`]
      );
      preferredList.push({
        id: prefId,
        field: pref.field,
        operator: pref.operator,
        value: prefVal,
        weight: weightVal,
        type: 'preferred',
        label: pref.label || `${pref.field} (${prefVal})`
      });
    }

    // Create applications for existing students so they appear in applicants list
    const studentsRes = await client.query(`SELECT id, cgpa, backlogs, branch, skills FROM students`);
    for (const stu of studentsRes.rows) {
      const passedCgpa = Number(stu.cgpa) >= 7.0;
      const passedBacklogs = Number(stu.backlogs) === 0;
      const isEligible = passedCgpa && passedBacklogs;

      await client.query(
        `INSERT INTO student_applications (id, student_id, company_id, eligibility, match_score, selection, criteria_summary)
         VALUES ($1, $2, $3, $4, $5, 'not_selected_this_round', $6::jsonb)
         ON CONFLICT (student_id, company_id) DO NOTHING`,
        [
          `app-${companyId}-${stu.id}`,
          stu.id,
          companyId,
          isEligible ? 'eligible' : 'ineligible',
          isEligible ? 75.0 : 35.0,
          JSON.stringify({ passed: isEligible ? mandatoryList.length : 0, total: mandatoryList.length })
        ]
      );
    }

    // Audit Log
    await client.query(
      `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
       VALUES ($1, $2, $3, $4, $5, 'company', 'company', $6, $7, $8)`,
      [
        `aud-${Date.now()}`,
        req.user?.id || 'user-coord',
        req.user?.name || 'Placement Coordinator',
        req.user?.role || 'coordinator',
        'company.created',
        companyId,
        name,
        `Registered new employer ${name} for ${roleTitle} (${companySlots} slots, Criteria v1)`
      ]
    );

    await client.query('COMMIT');

    const createdCompany = {
      id: companyId,
      name,
      roleTitle,
      roundName: companyRound,
      status: 'active',
      criteriaVersion: 1,
      slots: companySlots,
      mandatoryCriteria: mandatoryList,
      preferredCriteria: preferredList
    };

    return res.status(201).json(createdCompany);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Create Company Error]:', err);
    return res.status(500).json({ error: 'Failed to create company', message: err.message });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/companies/:id/criteria
 * Updates mandatory and preferred criteria with optimistic concurrency check
 */
companiesRouter.put('/:id/criteria', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const { id } = req.params;
  const { mandatoryCriteria, preferredCriteria, expectedVersion } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check current version
    const compRes = await client.query(
      `SELECT id, name, criteria_version, slots, role_title as "roleTitle", round_name as "roundName", status FROM companies WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (compRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Company not found' });
    }

    const comp = compRes.rows[0];
    if (expectedVersion !== undefined && comp.criteria_version !== expectedVersion) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Criteria version conflict: Criteria were modified concurrently by another coordinator.',
        code: 'stale_version',
        currentVersion: comp.criteria_version,
        expectedVersion
      });
    }

    const newVersion = comp.criteria_version + 1;

    // 2. Increment version
    await client.query(
      `UPDATE companies SET criteria_version = $1, updated_at = NOW() WHERE id = $2`,
      [newVersion, id]
    );

    // 3. Clear old criteria and insert new
    await client.query(`DELETE FROM company_criteria WHERE company_id = $1`, [id]);

    const formattedMandatory: any[] = [];
    const formattedPreferred: any[] = [];

    if (Array.isArray(mandatoryCriteria)) {
      for (let i = 0; i < mandatoryCriteria.length; i++) {
        const crit = mandatoryCriteria[i];
        const critId = crit.id || `crit-man-${id}-${newVersion}-${i + 1}`;
        await client.query(
          `INSERT INTO company_criteria (id, company_id, version, type, field, operator, value, label, created_at)
           VALUES ($1, $2, $3, 'mandatory', $4, $5, $6::jsonb, $7, NOW())`,
          [critId, id, newVersion, crit.field, crit.operator, JSON.stringify(crit.value), crit.label || `${crit.field} ${crit.operator} ${crit.value}`]
        );
        formattedMandatory.push({
          id: critId,
          field: crit.field,
          operator: crit.operator,
          value: crit.value,
          type: 'mandatory',
          label: crit.label || `${crit.field} ${crit.operator} ${crit.value}`
        });
      }
    }

    if (Array.isArray(preferredCriteria)) {
      for (let i = 0; i < preferredCriteria.length; i++) {
        const pref = preferredCriteria[i];
        const prefId = pref.id || `crit-pref-${id}-${newVersion}-${i + 1}`;
        const weightVal = Number(pref.weight) || 30;
        await client.query(
          `INSERT INTO company_criteria (id, company_id, version, type, field, operator, value, weight, label, created_at)
           VALUES ($1, $2, $3, 'preferred', $4, $5, $6::jsonb, $7, $8, NOW())`,
          [prefId, id, newVersion, pref.field, pref.operator, JSON.stringify(pref.value), weightVal, pref.label || `${pref.field} (${pref.value})`]
        );
        formattedPreferred.push({
          id: prefId,
          field: pref.field,
          operator: pref.operator,
          value: pref.value,
          weight: weightVal,
          type: 'preferred',
          label: pref.label || `${pref.field} (${pref.value})`
        });
      }
    }

    // 4. Audit Log
    await client.query(
      `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
       VALUES ($1, $2, $3, $4, $5, 'company', 'company', $6, $7, $8)`,
      [
        `aud-${Date.now()}`,
        req.user?.id || 'user-coord',
        req.user?.name || 'Placement Coordinator',
        req.user?.role || 'coordinator',
        'company.criteria_updated',
        id,
        comp.name,
        `Updated criteria for ${comp.name} to version ${newVersion} (${formattedMandatory.length} mandatory, ${formattedPreferred.length} preferred)`
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      id: comp.id,
      name: comp.name,
      roleTitle: comp.roleTitle,
      roundName: comp.roundName,
      status: comp.status,
      criteriaVersion: newVersion,
      slots: comp.slots,
      mandatoryCriteria: formattedMandatory,
      preferredCriteria: formattedPreferred
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Update Criteria Error]:', err);
    return res.status(500).json({ error: 'Failed to update criteria', message: err.message });
  } finally {
    client.release();
  }
});

