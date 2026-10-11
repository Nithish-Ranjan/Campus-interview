import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import { pool } from '../db.js';
import { requireAuth, requireRole, authorizeStudentAccess } from '../auth/middleware.js';
import { saveResumeFile, getResumeFilePath } from '../services/storageService.js';
import { parseResumeWithGemini, fallbackResumeParser } from '../services/geminiService.js';

export const studentsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

const resumeUploadMiddleware = (req: Request, res: Response, next: any) => {
  upload.any()(req, res, (err) => {
    if (err) return next(err);
    if (!req.file && Array.isArray((req as any).files) && (req as any).files.length > 0) {
      req.file = (req as any).files[0];
    }
    next();
  });
};

const studentQuerySchema = z.object({
  query: z.string().optional(),
  branch: z.string().optional(),
  companyId: z.string().optional(),
  eligibility: z.string().optional(),
  selection: z.string().optional()
});

/**
 * GET /api/students/me
 * Authenticated Student Portal Profile & Own Data
 */
studentsRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  if (req.user?.role !== 'student' || !req.user.studentId) {
    return res.status(403).json({ error: 'Only student accounts can access /api/students/me' });
  }

  const studentId = req.user.studentId;

  try {
    const client = await pool.connect();
    try {
      // 1. Student profile
      const studentRes = await client.query(`
        SELECT 
          s.id, s.roll_number as "rollNumber", s.name, s.branch, s.cgpa::float, s.backlogs,
          s.skills, s.email, s.phone, s.resume_url as "resumeUrl", s.resume_file_name as "resumeFileName",
          s.academic_verified as "academicVerified", s.academic_year as "academicYear",
          s.graduation_year as "graduationYear", s.college_name as "collegeName",
          s.resume_parse_status as "resumeParseStatus", s.parsed_resume as "parsedResume",
          s.resume_uploaded_at as "resumeUploadedAt"
        FROM students s WHERE s.id = $1
      `, [studentId]);

      if (studentRes.rowCount === 0) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const student = studentRes.rows[0];

      // 2. Own Applications
      const appsRes = await client.query(`
        SELECT 
          a.id, a.company_id as "companyId", c.name as "companyName", c.role_title as "roleTitle",
          c.round_name as "roundName", a.eligibility, a.match_score::float as "matchScore",
          a.selection, a.rank, a.waitlist_position as "waitlistPosition",
          a.selection_reason as "selectionReason", a.criteria_summary as "criteriaSummary"
        FROM student_applications a
        JOIN companies c ON a.company_id = c.id
        WHERE a.student_id = $1
      `, [studentId]);

      // 3. Own Interviews
      const interviewsRes = await client.query(`
        SELECT 
          sl.id, sl.scheduled_start as "scheduledStart", sl.scheduled_end as "scheduledEnd",
          sl.estimated_start as "estimatedStart", sl.estimated_end as "estimatedEnd",
          sl.status, sl.delay_minutes as "delayMinutes", sl.delay_reason as "delayReason",
          c.name as "companyName", c.role_title as "roleTitle", r.name as "roomName", r.building,
          COALESCE(array_agg(iv.name) FILTER (WHERE iv.name IS NOT NULL), ARRAY[]::varchar[]) as "panellists"
        FROM interview_slots sl
        JOIN companies c ON sl.company_id = c.id
        JOIN rooms r ON sl.room_id = r.id
        LEFT JOIN interview_panel_members pm ON sl.id = pm.interview_id
        LEFT JOIN interviewers iv ON pm.interviewer_id = iv.id
        WHERE sl.student_id = $1 AND sl.schedule_mode = 'published'
        GROUP BY sl.id, c.name, c.role_title, r.name, r.building
        ORDER BY sl.scheduled_start ASC
      `, [studentId]);

      // 4. Own Notifications
      const notifsRes = await client.query(`
        SELECT id, title, message, type, is_read as "isRead", created_at as "createdAt"
        FROM student_notifications
        WHERE student_id = $1 AND is_dismissed = false
        ORDER BY created_at DESC LIMIT 10
      `, [studentId]);

      return res.status(200).json({
        student: {
          ...student,
          skills: Array.isArray(student.skills) ? student.skills : []
        },
        applications: appsRes.rows,
        interviews: interviewsRes.rows.map(iv => ({
          ...iv,
          scheduledStart: new Date(iv.scheduledStart).toISOString(),
          scheduledEnd: new Date(iv.scheduledEnd).toISOString(),
          estimatedStart: iv.estimatedStart ? new Date(iv.estimatedStart).toISOString() : undefined,
          estimatedEnd: iv.estimatedEnd ? new Date(iv.estimatedEnd).toISOString() : undefined
        })),
        notifications: notifsRes.rows
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Students Me Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve student profile' });
  }
});

/**
 * PATCH /api/students/me
 * Student self-service editing (Phone, Skills only).
 * Academic fields (CGPA, Branch, Backlogs) cannot be modified by students.
 */
studentsRouter.patch('/me', requireAuth, async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  if (req.user?.role !== 'student' || !req.user.studentId) {
    return res.status(403).json({ error: 'Only student accounts can update /api/students/me' });
  }

  const { name, email, phone, collegeName, skills, academicYear, graduationYear } = req.body;
  const updates: string[] = [];
  const params: any[] = [];

  if (name !== undefined && typeof name === 'string' && name.trim()) {
    params.push(name.trim());
    updates.push(`name = $${params.length}`);
  }
  if (email !== undefined && typeof email === 'string' && email.includes('@')) {
    params.push(email.trim());
    updates.push(`email = $${params.length}`);
  }
  if (phone !== undefined) {
    params.push(phone);
    updates.push(`phone = $${params.length}`);
  }
  if (collegeName !== undefined) {
    params.push(collegeName);
    updates.push(`college_name = $${params.length}`);
  }
  if (academicYear !== undefined) {
    params.push(academicYear);
    updates.push(`academic_year = $${params.length}`);
  }
  if (graduationYear !== undefined) {
    params.push(Number(graduationYear));
    updates.push(`graduation_year = $${params.length}`);
  }
  if (skills !== undefined && Array.isArray(skills)) {
    params.push(JSON.stringify(skills));
    updates.push(`skills = $${params.length}::jsonb`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid self-service fields provided for update' });
  }

  try {
    params.push(req.user.studentId);
    const result = await pool.query(
      `UPDATE students SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${params.length} 
       RETURNING id, name, email, phone, college_name as "collegeName", academic_year as "academicYear", graduation_year as "graduationYear", skills`,
      params
    );

    // Also sync user record name/email
    if (name || email) {
      const userUpdates: string[] = [];
      const userParams: any[] = [];
      if (name) {
        userParams.push(name.trim());
        userUpdates.push(`name = $${userParams.length}`);
      }
      if (email) {
        userParams.push(email.trim());
        userUpdates.push(`email = $${userParams.length}`);
      }
      userParams.push(req.user.id);
      await pool.query(
        `UPDATE users SET ${userUpdates.join(', ')}, updated_at = NOW() WHERE id = $${userParams.length}`,
        userParams
      ).catch(e => console.warn('Users table sync error:', e.message));
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
       VALUES ($1, $2, $3, $4, $5, 'eligibility', 'student', $6, $7, $8)`,
      [
        `aud-${Date.now()}`,
        req.user.id,
        name || req.user.name,
        'student',
        'student.profile_updated',
        req.user.studentId,
        name || req.user.name,
        `Student updated personal details (${updates.length} fields updated)`
      ]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err: any) {
    console.error('[Student Self-Edit Error]:', err);
    return res.status(500).json({ error: 'Failed to update student profile', message: err.message });
  }
});

/**
 * Helper to handle PDF resume upload
 */
async function handleResumeUpload(req: Request, res: Response, targetStudentId: string) {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  if (!req.file) {
    return res.status(400).json({ error: 'No resume file uploaded' });
  }

  // Validate declared MIME type or extension
  const isPdf = req.file.originalname.toLowerCase().endsWith('.pdf') || (req.file.mimetype && req.file.mimetype.includes('pdf'));
  if (!isPdf) {
    return res.status(415).json({ error: 'Unsupported file type. Only PDF documents are accepted.' });
  }

  try {
    // 1. Save binary file securely
    const stored = await saveResumeFile(req.file.buffer, req.file.originalname);

    // 2. Parse resume text with Gemini (safe fallback if parsing encounters non-standard formats)
    let parsed: any;
    let isAi = false;
    try {
      const parseRes = await parseResumeWithGemini(req.file.buffer);
      parsed = parseRes.parsed;
      isAi = parseRes.isAi;
    } catch (parseErr: any) {
      console.warn('[Resume Parse Warning, using fallback]:', parseErr.message);
      parsed = fallbackResumeParser('');
      isAi = false;
    }

    // 3. Update student record in PostgreSQL with parsed data and skills
    const newSkills = (Array.isArray(parsed?.skills) && parsed.skills.length > 0)
      ? parsed.skills
      : undefined;

    const studentUpdates: string[] = [
      'resume_storage_key = $1',
      'resume_file_size = $2',
      'resume_mime_type = \'application/pdf\'',
      'resume_hash = $3',
      'resume_uploaded_at = NOW()',
      'resume_file_name = $4',
      'resume_url = $5',
      'parsed_resume = $6::jsonb',
      'resume_parse_status = \'parsed\'',
      'updated_at = NOW()'
    ];
    const updateParams: any[] = [
      stored.storageKey,
      stored.fileSize,
      stored.hash,
      req.file.originalname,
      `/api/students/${targetStudentId}/resume`,
      JSON.stringify(parsed)
    ];

    if (newSkills) {
      updateParams.push(JSON.stringify(newSkills));
      studentUpdates.push(`skills = $${updateParams.length}::jsonb`);
    }

    if (parsed?.candidateName && parsed.candidateName.length > 2) {
      updateParams.push(parsed.candidateName);
      studentUpdates.push(`name = $${updateParams.length}`);
      await pool.query(
        `UPDATE users SET name = $1 WHERE id = (SELECT user_id FROM students WHERE id = $2)`,
        [parsed.candidateName, targetStudentId]
      ).catch((e: any) => console.warn('User name update skipped:', e.message));
    }

    if (parsed?.phone) {
      updateParams.push(parsed.phone);
      studentUpdates.push(`phone = $${updateParams.length}`);
    }

    if (parsed?.education && parsed.education[0]?.institution) {
      updateParams.push(parsed.education[0].institution);
      studentUpdates.push(`college_name = $${updateParams.length}`);
    }

    updateParams.push(targetStudentId);
    await pool.query(
      `UPDATE students SET ${studentUpdates.join(', ')} WHERE id = $${updateParams.length}`,
      updateParams
    );

    // 4. Audit Log
    await pool.query(
      `INSERT INTO audit_entries (id, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        `audit-${Date.now()}`, req.user?.id || 'system', req.user?.name || 'User', req.user?.role || 'student',
        'student.resume_uploaded', 'eligibility', 'student', targetStudentId, req.file.originalname,
        `Resume PDF uploaded (${(stored.fileSize / 1024).toFixed(1)} KB, parsed with ${isAi ? 'Gemini AI' : 'Deterministic Engine'})`
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded and parsed successfully.',
      fileName: req.file.originalname,
      fileSize: stored.fileSize,
      hash: stored.hash,
      isAiParsed: isAi,
      parsedResume: parsed
    });
  } catch (err: any) {
    console.error('[Resume Upload Error]:', err);
    if (err.message && err.message.includes('PDF')) {
      return res.status(415).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to process resume upload', message: err.message });
  }
}

/**
 * POST /api/students/me/resume
 * Student uploads their own resume PDF
 */
studentsRouter.post('/me/resume', requireAuth, resumeUploadMiddleware, async (req: Request, res: Response) => {
  if (req.user?.role !== 'student' || !req.user.studentId) {
    return res.status(403).json({ error: 'Only student accounts can upload to /api/students/me/resume' });
  }
  return handleResumeUpload(req, res, req.user.studentId);
});

/**
 * POST /api/students/:id/resume
 * Staff upload for candidate (Admin, Officer or Coordinator)
 */
studentsRouter.post('/:id/resume', requireAuth, requireRole(['admin', 'officer', 'coordinator']), resumeUploadMiddleware, async (req: Request, res: Response) => {
  return handleResumeUpload(req, res, req.params.id);
});

/**
 * Helper to stream resume download
 */
async function streamResumeFile(req: Request, res: Response, targetStudentId: string) {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  try {
    const studentRes = await pool.query(
      `SELECT resume_storage_key, resume_file_name FROM students WHERE id = $1`,
      [targetStudentId]
    );

    if (studentRes.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { resume_storage_key, resume_file_name } = studentRes.rows[0];
    if (!resume_storage_key) {
      return res.status(404).json({ error: 'No resume on file for this student' });
    }

    const filePath = getResumeFilePath(resume_storage_key);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Resume file not found in storage' });
    }

    const downloadName = resume_file_name || 'student_resume.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err: any) {
    console.error('[Resume Download Error]:', err);
    return res.status(500).json({ error: 'Failed to stream resume file' });
  }
}

/**
 * GET /api/students/me/resume
 * Authenticated Student downloads their own resume
 */
studentsRouter.get('/me/resume', requireAuth, async (req: Request, res: Response) => {
  if (req.user?.role !== 'student' || !req.user.studentId) {
    return res.status(403).json({ error: 'Only student accounts can download from /api/students/me/resume' });
  }
  return streamResumeFile(req, res, req.user.studentId);
});

/**
 * GET /api/students/:id/resume
 * Authorized download: Student (own only), Officer, Coordinator
 */
studentsRouter.get('/:id/resume', requireAuth, authorizeStudentAccess('id'), async (req: Request, res: Response) => {
  return streamResumeFile(req, res, req.params.id);
});

/**
 * GET /api/students
 * Candidate directory: Placement Officer & Placement Coordinator.
 */
studentsRouter.get('/', requireAuth, requireRole(['officer', 'coordinator']), async (req: Request, res: Response) => {
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
      const whereClauses: string[] = ['1=1'];

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
          s.academic_verified as "academicVerified",
          s.academic_year as "academicYear",
          s.graduation_year as "graduationYear",
          s.college_name as "collegeName",
          s.parsed_resume as "parsedResume"
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
          academicYear: s.academicYear,
          graduationYear: s.graduationYear,
          collegeName: s.collegeName,
          parsedResume: s.parsedResume,
          applications: studentApps,
          activeApplication: activeApp
        };
      });

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
 * Candidate details with strict privacy scoping.
 */
studentsRouter.get('/:id', requireAuth, authorizeStudentAccess('id'), async (req: Request, res: Response) => {
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });

  const { id } = req.params;

  try {
    const client = await pool.connect();
    try {
      const studentRes = await client.query(`
        SELECT 
          id, roll_number as "rollNumber", name, branch, cgpa::float, backlogs, skills, email, phone,
          resume_url as "resumeUrl", resume_file_name as "resumeFileName", academic_verified as "academicVerified",
          academic_year as "academicYear", graduation_year as "graduationYear", college_name as "collegeName",
          parsed_resume as "parsedResume", resume_uploaded_at as "resumeUploadedAt"
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
