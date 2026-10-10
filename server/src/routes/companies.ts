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
