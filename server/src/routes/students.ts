import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

export const studentsRouter = Router();

const studentQuerySchema = z.object({
  query: z.string().optional(),
  branch: z.string().optional(),
  companyId: z.string().optional(),
  eligibility: z.string().optional(),
  selection: z.string().optional()
});

/**
 * GET /api/students
 * Returns candidate records with linked company applications.
 */
studentsRouter.get('/', async (req: Request, res: Response) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  const parseResult = studentQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid query parameters', details: parseResult.error.format() });
  }

  const { query, branch, companyId, eligibility, selection } = parseResult.data;

  try {
    const client = await pool.connect();
    try {
      // 1. Fetch Students
      const queryParams: any[] = [];
      let whereClauses: string[] = ['1=1'];

      if (query && query.trim() !== '') {
        queryParams.push(`%${query.trim()}%`);
        whereClauses.push(`(s.name ILIKE $${queryParams.length} OR s.roll_number ILIKE $${queryParams.length})`);
      }

      if (branch && branch !== 'all') {
        queryParams.push(branch);
        whereClauses.push(`s.branch = $${queryParams.length}`);
      }

      const studentsResult = await client.query(`
        SELECT 
          s.id,
          s.roll_number as "rollNumber",
          s.name,
          s.branch,
          s.cgpa::float,
          s.backlogs,
          s.skills,
          s.email,
          s.phone,
          s.resume_url as "resumeUrl",
          s.resume_file_name as "resumeFileName",
          s.academic_verified as "academicVerified"
        FROM students s
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY s.roll_number ASC
      `, queryParams);

      // 2. Fetch Applications for all retrieved students
      const appResult = await client.query(`
        SELECT 
          a.id,
          a.student_id as "studentId",
          a.company_id as "companyId",
          c.name as "companyName",
          a.eligibility,
          a.match_score::float as "matchScore",
          a.selection,
          a.rank,
          a.waitlist_position as "waitlistPosition",
          a.selection_reason as "selectionReason",
          a.criteria_summary as "criteriaSummary",
          a.explanation
        FROM student_applications a
        JOIN companies c ON a.company_id = c.id
      `);

      const appsByStudent = new Map<string, any[]>();
      for (const app of appResult.rows) {
        if (!appsByStudent.has(app.studentId)) {
          appsByStudent.set(app.studentId, []);
        }
        appsByStudent.get(app.studentId)!.push({
          id: app.id,
          studentId: app.studentId,
          companyId: app.companyId,
          companyName: app.companyName,
          eligibility: app.eligibility,
          matchScore: app.matchScore,
          selection: app.selection,
          rank: app.rank ?? undefined,
          waitlistPosition: app.waitlistPosition ?? undefined,
          selectionReason: app.selectionReason,
          criteriaSummary: app.criteriaSummary,
          explanation: app.explanation ?? undefined
        });
      }

      let students = studentsResult.rows.map(s => {
        const studentApps = appsByStudent.get(s.id) || [];
        const activeApp = (companyId && companyId !== 'all')
          ? studentApps.find(a => a.companyId === companyId) || studentApps[0]
          : studentApps[0];

        return {
          id: s.id,
          rollNumber: s.rollNumber,
          name: s.name,
          branch: s.branch,
          cgpa: s.cgpa,
          backlogs: s.backlogs,
          skills: Array.isArray(s.skills) ? s.skills : [],
          email: s.email ?? undefined,
          phone: s.phone ?? undefined,
          resumeUrl: s.resumeUrl ?? undefined,
          resumeFileName: s.resumeFileName ?? undefined,
          academicVerified: s.academicVerified || { cgpa: true, backlogs: true, branch: true, skills: true },
          applications: studentApps,
          activeApplication: activeApp
        };
      });

      // Apply post-filters if specified
      if (eligibility && eligibility !== 'all') {
        students = students.filter(s => s.activeApplication?.eligibility === eligibility);
      }

      if (selection && selection !== 'all') {
        students = students.filter(s => s.activeApplication?.selection === selection);
      }

      return res.status(200).json(students);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Students API Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve students from database', message: error.message });
  }
});

/**
 * GET /api/students/:id
 */
studentsRouter.get('/:id', async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const { id } = req.params;

  try {
    const client = await pool.connect();
    try {
      const studentRes = await client.query(`
        SELECT id, roll_number as "rollNumber", name, branch, cgpa::float, backlogs, skills, email, phone, resume_url as "resumeUrl", resume_file_name as "resumeFileName", academic_verified as "academicVerified"
        FROM students WHERE id = $1
      `, [id]);

      if (studentRes.rowCount === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const student = studentRes.rows[0];

      // Applications
      const appsRes = await client.query(`
        SELECT a.id, a.student_id as "studentId", a.company_id as "companyId", c.name as "companyName",
               a.eligibility, a.match_score::float as "matchScore", a.selection, a.rank, a.waitlist_position as "waitlistPosition",
               a.selection_reason as "selectionReason", a.criteria_summary as "criteriaSummary"
        FROM student_applications a
        JOIN companies c ON a.company_id = c.id
        WHERE a.student_id = $1
      `, [id]);

      // Interviews
      const interviewsRes = await client.query(`
        SELECT sl.id, sl.scheduled_start as "scheduledStart", sl.scheduled_end as "scheduledEnd", sl.status,
               c.name as "companyName", r.name as "roomName"
        FROM interview_slots sl
        JOIN companies c ON sl.company_id = c.id
        JOIN rooms r ON sl.room_id = r.id
        WHERE sl.student_id = $1
      `, [id]);

      return res.status(200).json({
        student: {
          ...student,
          skills: Array.isArray(student.skills) ? student.skills : []
        },
        applications: appsRes.rows,
        interviews: interviewsRes.rows,
        overlaps: [],
        history: []
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
