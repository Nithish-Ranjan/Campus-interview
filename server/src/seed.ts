import { pool } from './db.js';
import { config } from './config.js';
import { hashPassword } from './auth/crypto.js';

export interface SeedResult {
  success: boolean;
  counts: Record<string, number>;
  message: string;
}

/**
 * Idempotent Development Demo Seed for Placement Command.
 * Uses deterministic IDs and ON CONFLICT upserts.
 * Refuses execution in production environment.
 */
export async function runDevSeed(): Promise<SeedResult> {
  if (config.nodeEnv === 'production') {
    throw new Error('Refusing to run development demo seed: NODE_ENV is set to production.');
  }

  if (!pool) {
    throw new Error('Database pool is not configured. Ensure DATABASE_URL is set.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Generate standard password hash for all demo users ('Demo@2026!')
    const defaultPasswordHash = await hashPassword('Demo@2026!');

    // 1. Seed Demo Users (5 Approved Roles)
    const users = [
      {
        id: 'user-admin',
        name: 'Dr. K. Swaminathan',
        email: 'admin@placement.example',
        role: 'admin',
        assigned_panels: JSON.stringify([]),
        environment: 'demo'
      },
      {
        id: 'user-officer',
        name: 'Prof. Meera Sen',
        email: 'officer@placement.example',
        role: 'officer',
        assigned_panels: JSON.stringify([]),
        environment: 'demo'
      },
      {
        id: 'user-coord',
        name: 'Rishi Nair',
        email: 'coordinator@placement.example',
        role: 'coordinator',
        assigned_panels: JSON.stringify([]),
        environment: 'demo'
      },
      {
        id: 'user-panel',
        name: 'Dr. S. Priya',
        email: 'panel@placement.example',
        role: 'panel_coordinator',
        assigned_panels: JSON.stringify(['Room A']),
        environment: 'demo'
      },
      {
        id: 'user-student',
        name: 'Aarav Sharma',
        email: 'student@placement.example',
        role: 'student',
        assigned_panels: JSON.stringify([]),
        environment: 'demo'
      }
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, name, email, role, password_hash, assigned_panels, environment, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           role = EXCLUDED.role,
           password_hash = EXCLUDED.password_hash,
           assigned_panels = EXCLUDED.assigned_panels,
           environment = EXCLUDED.environment,
           updated_at = NOW()`,
        [u.id, u.name, u.email, u.role, defaultPasswordHash, u.assigned_panels, u.environment]
      );
    }

    // 2. Seed Student Profiles (stu-001 linked to user-student)
    const students = [
      {
        id: 'stu-001',
        user_id: 'user-student',
        roll_number: 'DEMO-0001',
        name: 'Aarav Sharma',
        branch: 'Computer Science',
        cgpa: 9.15,
        backlogs: 0,
        skills: JSON.stringify(['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'System Design']),
        email: 'student@placement.example',
        phone: '+91 98765 43210',
        resume_url: '/resumes/private/DEMO-0001-Aarav-Sharma.pdf',
        resume_file_name: 'Aarav_Sharma_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '4th Year',
        graduation_year: 2027,
        college_name: 'Apex Institute of Technology'
      },
      {
        id: 'stu-002',
        user_id: null,
        roll_number: 'DEMO-0002',
        name: 'Priya Patel',
        branch: 'Information Technology',
        cgpa: 8.85,
        backlogs: 0,
        skills: JSON.stringify(['Python', 'FastAPI', 'React', 'Docker']),
        email: 'priya.patel@student.example',
        phone: '+91 98765 43211',
        resume_url: '/resumes/private/DEMO-0002-Priya-Patel.pdf',
        resume_file_name: 'Priya_Patel_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '4th Year',
        graduation_year: 2027,
        college_name: 'Apex Institute of Technology'
      },
      {
        id: 'stu-003',
        user_id: null,
        roll_number: 'DEMO-0003',
        name: 'Rohan Verma',
        branch: 'Electronics & Comm.',
        cgpa: 8.40,
        backlogs: 0,
        skills: JSON.stringify(['C++', 'Embedded Systems', 'Linux', 'Python']),
        email: 'rohan.verma@student.example',
        phone: '+91 98765 43212',
        resume_url: '/resumes/private/DEMO-0003-Rohan-Verma.pdf',
        resume_file_name: 'Rohan_Verma_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '4th Year',
        graduation_year: 2027,
        college_name: 'Apex Institute of Technology'
      },
      {
        id: 'stu-004',
        user_id: null,
        roll_number: 'DEMO-0004',
        name: 'Sneha Iyer',
        branch: 'Data Engineering',
        cgpa: 9.05,
        backlogs: 0,
        skills: JSON.stringify(['SQL', 'Python', 'Data Modeling', 'Apache Spark']),
        email: 'sneha.iyer@student.example',
        phone: '+91 98765 43213',
        resume_url: '/resumes/private/DEMO-0004-Sneha-Iyer.pdf',
        resume_file_name: 'Sneha_Iyer_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '4th Year',
        graduation_year: 2027,
        college_name: 'Apex Institute of Technology'
      },
      {
        id: 'stu-005',
        user_id: null,
        roll_number: 'DEMO-0005',
        name: 'Vikram Rao',
        branch: 'Computer Science',
        cgpa: 8.70,
        backlogs: 0,
        skills: JSON.stringify(['Java', 'Spring Boot', 'PostgreSQL', 'Kubernetes']),
        email: 'vikram.rao@student.example',
        phone: '+91 98765 43214',
        resume_url: '/resumes/private/DEMO-0005-Vikram-Rao.pdf',
        resume_file_name: 'Vikram_Rao_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '4th Year',
        graduation_year: 2027,
        college_name: 'Apex Institute of Technology'
      },
      {
        id: 'stu-006',
        user_id: null,
        roll_number: 'DEMO-0006',
        name: 'Ananya Deshmukh',
        branch: 'Information Technology',
        cgpa: 8.20,
        backlogs: 0,
        skills: JSON.stringify(['JavaScript', 'React', 'HTML/CSS', 'Node.js']),
        email: 'ananya.d@student.example',
        phone: '+91 98765 43215',
        resume_url: '/resumes/private/DEMO-0006-Ananya-Deshmukh.pdf',
        resume_file_name: 'Ananya_Deshmukh_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '4th Year',
        graduation_year: 2027,
        college_name: 'Apex Institute of Technology'
      },
      {
        id: 'stu-007',
        user_id: null,
        roll_number: 'DEMO-0007',
        name: 'Karthik Narayanan',
        branch: 'Electronics & Comm.',
        cgpa: 7.90,
        backlogs: 0,
        skills: JSON.stringify(['MATLAB', 'VLSI', 'Verilog', 'C']),
        email: 'karthik.n@student.example',
        phone: '+91 98765 43216',
        resume_url: '/resumes/private/DEMO-0007-Karthik-N.pdf',
        resume_file_name: 'Karthik_N_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '3rd Year',
        graduation_year: 2028,
        college_name: 'Apex Institute of Technology'
      },
      {
        id: 'stu-008',
        user_id: null,
        roll_number: 'DEMO-0008',
        name: 'Meenakshi Sundaram',
        branch: 'Mechanical',
        cgpa: 8.50,
        backlogs: 0,
        skills: JSON.stringify(['AutoCAD', 'SolidWorks', 'ANSYS', 'Python']),
        email: 'meenakshi.s@student.example',
        phone: '+91 98765 43217',
        resume_url: '/resumes/private/DEMO-0008-Meenakshi-S.pdf',
        resume_file_name: 'Meenakshi_S_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '4th Year',
        graduation_year: 2027,
        college_name: 'Apex Institute of Technology'
      },
      {
        id: 'stu-009',
        user_id: null,
        roll_number: 'DEMO-0009',
        name: 'Tanvi Joshi',
        branch: 'Computer Science',
        cgpa: 9.40,
        backlogs: 0,
        skills: JSON.stringify(['Python', 'PyTorch', 'Data Structures', 'TypeScript']),
        email: 'tanvi.j@student.example',
        phone: '+91 98765 43218',
        resume_url: '/resumes/private/DEMO-0009-Tanvi-Joshi.pdf',
        resume_file_name: 'Tanvi_Joshi_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '3rd Year',
        graduation_year: 2028,
        college_name: 'Apex Institute of Technology'
      },
      {
        id: 'stu-010',
        user_id: null,
        roll_number: 'DEMO-0010',
        name: 'Rahul Nair',
        branch: 'Data Engineering',
        cgpa: 7.20,
        backlogs: 1,
        skills: JSON.stringify(['SQL', 'Python', 'Tableau']),
        email: 'rahul.n@student.example',
        phone: '+91 98765 43219',
        resume_url: '/resumes/private/DEMO-0010-Rahul-Nair.pdf',
        resume_file_name: 'Rahul_Nair_Resume.pdf',
        academic_verified: JSON.stringify({ cgpa: true, backlogs: true, branch: true, skills: true }),
        academic_year: '4th Year',
        graduation_year: 2027,
        college_name: 'Apex Institute of Technology'
      }
    ];

    for (const s of students) {
      await client.query(
        `INSERT INTO students (id, user_id, roll_number, name, branch, cgpa, backlogs, skills, email, phone, resume_url, resume_file_name, academic_verified, academic_year, graduation_year, college_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13::jsonb, $14, $15, $16, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           roll_number = EXCLUDED.roll_number,
           name = EXCLUDED.name,
           branch = EXCLUDED.branch,
           cgpa = EXCLUDED.cgpa,
           backlogs = EXCLUDED.backlogs,
           skills = EXCLUDED.skills,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           resume_url = EXCLUDED.resume_url,
           resume_file_name = EXCLUDED.resume_file_name,
           academic_verified = EXCLUDED.academic_verified,
           academic_year = EXCLUDED.academic_year,
           graduation_year = EXCLUDED.graduation_year,
           college_name = EXCLUDED.college_name,
           updated_at = NOW()`,
        [
          s.id, s.user_id, s.roll_number, s.name, s.branch, s.cgpa, s.backlogs,
          s.skills, s.email, s.phone, s.resume_url, s.resume_file_name, s.academic_verified,
          s.academic_year, s.graduation_year, s.college_name
        ]
      );
    }

    // 3. Seed Companies
    const companies = [
      {
        id: 'comp-ast',
        name: 'Asteria Systems',
        role_title: 'Software Engineer - Backend',
        round_name: 'Round 1 Technical',
        status: 'scheduled',
        criteria_version: 1,
        slots: 10
      },
      {
        id: 'comp-har',
        name: 'Harbor Analytics',
        role_title: 'Data & Cloud Platform Associate',
        round_name: 'Round 1 Technical',
        status: 'evaluating',
        criteria_version: 1,
        slots: 8
      }
    ];

    for (const c of companies) {
      await client.query(
        `INSERT INTO companies (id, name, role_title, round_name, status, criteria_version, slots, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           role_title = EXCLUDED.role_title,
           round_name = EXCLUDED.round_name,
           status = EXCLUDED.status,
           criteria_version = EXCLUDED.criteria_version,
           slots = EXCLUDED.slots,
           updated_at = NOW()`,
        [c.id, c.name, c.role_title, c.round_name, c.status, c.criteria_version, c.slots]
      );
    }

    // 4. Seed Company Criteria (Mandatory & Preferred)
    const criteria = [
      {
        id: 'crit-ast-1',
        company_id: 'comp-ast',
        version: 1,
        type: 'mandatory',
        field: 'cgpa',
        operator: 'gte',
        value: JSON.stringify(7.5),
        weight: null,
        label: 'Minimum CGPA 7.5'
      },
      {
        id: 'crit-ast-2',
        company_id: 'comp-ast',
        version: 1,
        type: 'mandatory',
        field: 'backlogs',
        operator: 'eq',
        value: JSON.stringify(0),
        weight: null,
        label: 'Zero active backlogs'
      },
      {
        id: 'crit-ast-3',
        company_id: 'comp-ast',
        version: 1,
        type: 'preferred',
        field: 'skills',
        operator: 'in',
        value: JSON.stringify(['TypeScript', 'Node.js', 'React']),
        weight: 40,
        label: 'TypeScript & Node ecosystem experience'
      },
      {
        id: 'crit-har-1',
        company_id: 'comp-har',
        version: 1,
        type: 'mandatory',
        field: 'cgpa',
        operator: 'gte',
        value: JSON.stringify(8.0),
        weight: null,
        label: 'Minimum CGPA 8.0'
      },
      {
        id: 'crit-har-2',
        company_id: 'comp-har',
        version: 1,
        type: 'mandatory',
        field: 'backlogs',
        operator: 'eq',
        value: JSON.stringify(0),
        weight: null,
        label: 'Zero active backlogs'
      },
      {
        id: 'crit-har-3',
        company_id: 'comp-har',
        version: 1,
        type: 'preferred',
        field: 'skills',
        operator: 'in',
        value: JSON.stringify(['Python', 'SQL', 'Data Modeling']),
        weight: 50,
        label: 'Data engineering & analytics background'
      }
    ];

    for (const cr of criteria) {
      await client.query(
        `INSERT INTO company_criteria (id, company_id, version, type, field, operator, value, weight, label, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           version = EXCLUDED.version,
           type = EXCLUDED.type,
           field = EXCLUDED.field,
           operator = EXCLUDED.operator,
           value = EXCLUDED.value,
           weight = EXCLUDED.weight,
           label = EXCLUDED.label`,
        [cr.id, cr.company_id, cr.version, cr.type, cr.field, cr.operator, cr.value, cr.weight, cr.label]
      );
    }

    // 5. Seed Student Applications
    const applications = [
      {
        id: 'app-ast-001',
        student_id: 'stu-001',
        company_id: 'comp-ast',
        eligibility: 'eligible',
        match_score: 96.00,
        selection: 'selected',
        rank: 1,
        waitlist_position: null,
        selection_reason: 'Passed all mandatory criteria; high preferred score on TypeScript & Node.js.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-ast-002',
        student_id: 'stu-002',
        company_id: 'comp-ast',
        eligibility: 'eligible',
        match_score: 95.00,
        selection: 'selected',
        rank: 2,
        waitlist_position: null,
        selection_reason: 'Passed all mandatory criteria; verified backend credentials.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-ast-003',
        student_id: 'stu-003',
        company_id: 'comp-ast',
        eligibility: 'eligible',
        match_score: 94.00,
        selection: 'selected',
        rank: 3,
        waitlist_position: null,
        selection_reason: 'Passed all mandatory criteria; strong algorithms background.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-har-004',
        student_id: 'stu-004',
        company_id: 'comp-har',
        eligibility: 'eligible',
        match_score: 93.00,
        selection: 'selected',
        rank: 1,
        waitlist_position: null,
        selection_reason: 'Passed CGPA >= 8.0 criteria; top rank in analytics specialization.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-ast-005',
        student_id: 'stu-005',
        company_id: 'comp-ast',
        eligibility: 'eligible',
        match_score: 91.00,
        selection: 'selected',
        rank: 4,
        waitlist_position: null,
        selection_reason: 'Passed all criteria; enterprise systems profile.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-ast-006',
        student_id: 'stu-006',
        company_id: 'comp-ast',
        eligibility: 'eligible',
        match_score: 87.00,
        selection: 'waitlisted',
        rank: null,
        waitlist_position: 1,
        selection_reason: 'Eligible; in top waitlist cohort.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-ast-007',
        student_id: 'stu-007',
        company_id: 'comp-ast',
        eligibility: 'eligible',
        match_score: 82.00,
        selection: 'waitlisted',
        rank: null,
        waitlist_position: 2,
        selection_reason: 'Eligible 3rd year candidate.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-ast-008',
        student_id: 'stu-008',
        company_id: 'comp-ast',
        eligibility: 'pending_verification',
        match_score: null,
        selection: 'not_selected_this_round',
        rank: null,
        waitlist_position: null,
        selection_reason: 'Academic records pending verification by Placement Officer.',
        criteria_summary: JSON.stringify({ passed: 0, total: 3 })
      },
      {
        id: 'app-ast-009',
        student_id: 'stu-009',
        company_id: 'comp-ast',
        eligibility: 'eligible',
        match_score: 97.50,
        selection: 'selected',
        rank: 5,
        waitlist_position: null,
        selection_reason: 'Exceptional competitive programming & data structures score.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-ast-010',
        student_id: 'stu-010',
        company_id: 'comp-ast',
        eligibility: 'ineligible',
        match_score: 45.00,
        selection: 'not_selected_this_round',
        rank: null,
        waitlist_position: null,
        selection_reason: 'Failed mandatory requirement: Active backlogs detected (1 backlog).',
        criteria_summary: JSON.stringify({ passed: 1, total: 3 })
      },
      {
        id: 'app-har-005',
        student_id: 'stu-005',
        company_id: 'comp-har',
        eligibility: 'eligible',
        match_score: 89.00,
        selection: 'selected',
        rank: 2,
        waitlist_position: null,
        selection_reason: 'Passed CGPA >= 8.0 criteria.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-har-007',
        student_id: 'stu-007',
        company_id: 'comp-har',
        eligibility: 'ineligible',
        match_score: 55.00,
        selection: 'not_selected_this_round',
        rank: null,
        waitlist_position: null,
        selection_reason: 'Failed mandatory requirement: CGPA 7.90 below required threshold 8.0.',
        criteria_summary: JSON.stringify({ passed: 1, total: 3 })
      },
      {
        id: 'app-har-008',
        student_id: 'stu-008',
        company_id: 'comp-har',
        eligibility: 'eligible',
        match_score: 86.00,
        selection: 'waitlisted',
        rank: null,
        waitlist_position: 1,
        selection_reason: 'Passed mandatory criteria; analytics portfolio on waitlist.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-har-009',
        student_id: 'stu-009',
        company_id: 'comp-har',
        eligibility: 'eligible',
        match_score: 95.00,
        selection: 'selected',
        rank: 3,
        waitlist_position: null,
        selection_reason: 'High technical aptitude and Python ML background.',
        criteria_summary: JSON.stringify({ passed: 3, total: 3 })
      },
      {
        id: 'app-har-010',
        student_id: 'stu-010',
        company_id: 'comp-har',
        eligibility: 'ineligible',
        match_score: 40.00,
        selection: 'not_selected_this_round',
        rank: null,
        waitlist_position: null,
        selection_reason: 'Failed mandatory requirements: CGPA < 8.0 and backlogs > 0.',
        criteria_summary: JSON.stringify({ passed: 0, total: 3 })
      }
    ];

    for (const app of applications) {
      await client.query(
        `INSERT INTO student_applications (id, student_id, company_id, eligibility, match_score, selection, rank, waitlist_position, selection_reason, criteria_summary, evaluated_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW(), NOW(), NOW())
         ON CONFLICT (student_id, company_id) DO UPDATE SET
           eligibility = EXCLUDED.eligibility,
           match_score = EXCLUDED.match_score,
           selection = EXCLUDED.selection,
           rank = EXCLUDED.rank,
           waitlist_position = EXCLUDED.waitlist_position,
           selection_reason = EXCLUDED.selection_reason,
           criteria_summary = EXCLUDED.criteria_summary,
           updated_at = NOW()`,
        [
          app.id, app.student_id, app.company_id, app.eligibility, app.match_score,
          app.selection, app.rank, app.waitlist_position, app.selection_reason, app.criteria_summary
        ]
      );
    }

    // 6. Seed Rooms
    const rooms = [
      { id: 'room-a', name: 'Room A', building: 'Newton Hall (Main Block)', capacity: 4 },
      { id: 'room-b', name: 'Room B', building: 'Turing Computing Lab', capacity: 4 },
      { id: 'room-c', name: 'Room C', building: 'Babbage Suite 201', capacity: 4 }
    ];

    for (const r of rooms) {
      await client.query(
        `INSERT INTO rooms (id, name, building, capacity, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           building = EXCLUDED.building,
           capacity = EXCLUDED.capacity`,
        [r.id, r.name, r.building, r.capacity]
      );
    }

    // 7. Seed Interviewers
    const interviewers = [
      { id: 'int-1', name: 'Dr. V. Rao', department: 'Computer Science & Engg', email: 'v.rao@campus.edu' },
      { id: 'int-2', name: 'Prof. A. Sharma', department: 'Information Technology', email: 'a.sharma@campus.edu' },
      { id: 'int-3', name: 'Dr. S. Priya', department: 'Electronics & Comm.', email: 's.priya@campus.edu' },
      { id: 'int-4', name: 'Dr. N. Anand', department: 'Data Science & AI', email: 'n.anand@campus.edu' }
    ];

    for (const iv of interviewers) {
      await client.query(
        `INSERT INTO interviewers (id, name, department, email, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           department = EXCLUDED.department,
           email = EXCLUDED.email`,
        [iv.id, iv.name, iv.department, iv.email]
      );
    }

    // 8. Seed Valid Scheduled Interview Slots (Conflict-Free Time Ranges)
    // Deterministic Schedule: 4 interview slots with clean non-overlapping times and room assignments
    const slots = [
      {
        id: 'slot-ast-1',
        student_id: 'stu-001', // Aarav Sharma
        company_id: 'comp-ast', // Asteria
        room_id: 'room-a',      // Room A
        scheduled_start: '2026-10-11T04:00:00.000Z', // 09:30 AM IST
        scheduled_end: '2026-10-11T04:30:00.000Z',   // 10:00 AM IST
        status: 'scheduled',
        delay_minutes: 0,
        schedule_mode: 'published',
        schedule_version: 1,
        has_moved: false,
        panel_members: ['int-1'] // Dr. V. Rao
      },
      {
        id: 'slot-ast-2',
        student_id: 'stu-002', // Priya Patel
        company_id: 'comp-ast', // Asteria
        room_id: 'room-a',      // Room A
        scheduled_start: '2026-10-11T04:30:00.000Z', // 10:00 AM IST
        scheduled_end: '2026-10-11T05:00:00.000Z',   // 10:30 AM IST
        status: 'scheduled',
        delay_minutes: 0,
        schedule_mode: 'published',
        schedule_version: 1,
        has_moved: false,
        panel_members: ['int-1'] // Dr. V. Rao (Sequential slot, zero overlap with slot-ast-1)
      },
      {
        id: 'slot-ast-3',
        student_id: 'stu-003', // Rohan Verma
        company_id: 'comp-ast', // Asteria
        room_id: 'room-a',      // Room A
        scheduled_start: '2026-10-11T05:00:00.000Z', // 10:30 AM IST
        scheduled_end: '2026-10-11T05:30:00.000Z',   // 11:00 AM IST
        status: 'scheduled',
        delay_minutes: 0,
        schedule_mode: 'published',
        schedule_version: 1,
        has_moved: false,
        panel_members: ['int-1'] // Dr. V. Rao (Sequential slot, zero overlap with slot-ast-2)
      },
      {
        id: 'slot-har-1',
        student_id: 'stu-004', // Sneha Iyer
        company_id: 'comp-har', // Harbor Analytics
        room_id: 'room-b',      // Room B
        scheduled_start: '2026-10-11T04:00:00.000Z', // 09:30 AM IST
        scheduled_end: '2026-10-11T04:30:00.000Z',   // 10:00 AM IST
        status: 'scheduled',
        delay_minutes: 0,
        schedule_mode: 'published',
        schedule_version: 1,
        has_moved: false,
        panel_members: ['int-2', 'int-4'] // Prof. A. Sharma & Dr. N. Anand
      }
    ];

    for (const sl of slots) {
      await client.query(
        `INSERT INTO interview_slots (id, student_id, company_id, room_id, scheduled_start, scheduled_end, status, delay_minutes, schedule_mode, schedule_version, has_moved, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           student_id = EXCLUDED.student_id,
           company_id = EXCLUDED.company_id,
           room_id = EXCLUDED.room_id,
           scheduled_start = EXCLUDED.scheduled_start,
           scheduled_end = EXCLUDED.scheduled_end,
           status = EXCLUDED.status,
           delay_minutes = EXCLUDED.delay_minutes,
           schedule_mode = EXCLUDED.schedule_mode,
           schedule_version = EXCLUDED.schedule_version,
           has_moved = EXCLUDED.has_moved,
           updated_at = NOW()`,
        [
          sl.id, sl.student_id, sl.company_id, sl.room_id, sl.scheduled_start, sl.scheduled_end,
          sl.status, sl.delay_minutes, sl.schedule_mode, sl.schedule_version, sl.has_moved
        ]
      );

      // 9. Link Panel Members
      for (const interviewerId of sl.panel_members) {
        await client.query(
          `INSERT INTO interview_panel_members (interview_id, interviewer_id)
           VALUES ($1, $2)
           ON CONFLICT (interview_id, interviewer_id) DO NOTHING`,
          [sl.id, interviewerId]
        );
      }
    }

    // 10. Seed Demo Recovery Proposal (Pending 2-Key Officer Approval)
    const proposal = {
      id: 'prop-rec-001',
      title: 'Recovery Proposal #1: Shift Room A Schedule by 30 mins',
      description: 'Pre-simulated draft proposal to handle potential interview overrun in Room A without room conflicts.',
      created_by_user_id: 'user-coord',
      created_by_user_name: 'Rishi Nair (Placement Coordinator)',
      status: 'pending_approval',
      base_schedule_version: 1,
      proposed_schedule_version: 2,
      diff_items: JSON.stringify([
        {
          interviewId: 'slot-ast-2',
          studentName: 'Priya Patel',
          rollNumber: 'DEMO-0002',
          companyName: 'Asteria Systems',
          before: { room: 'Room A', interviewer: 'Dr. V. Rao', time: '10:00 AM - 10:30 AM IST' },
          after: { room: 'Room A', interviewer: 'Dr. V. Rao', time: '10:30 AM - 11:00 AM IST' },
          hasConflict: false
        }
      ]),
      validation_checks: JSON.stringify([
        { id: 'vc-1', label: 'Interviewer availability verified', status: 'passed', detail: 'Dr. V. Rao has no cross-room conflict in shifted slot' },
        { id: 'vc-2', label: 'Room availability verified', status: 'passed', detail: 'Room A is reserved for Asteria Systems' },
        { id: 'vc-3', label: 'Student constraints checked', status: 'passed', detail: 'Candidate has no concurrent interview' }
      ]),
      note: 'Verified candidate availability and confirmed panel readiness.'
    };

    await client.query(
      `INSERT INTO recovery_proposals (id, title, description, created_by_user_id, created_by_user_name, status, base_schedule_version, proposed_schedule_version, diff_items, validation_checks, note, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         diff_items = EXCLUDED.diff_items,
         validation_checks = EXCLUDED.validation_checks,
         note = EXCLUDED.note,
         updated_at = NOW()`,
      [
        proposal.id, proposal.title, proposal.description, proposal.created_by_user_id,
        proposal.created_by_user_name, proposal.status, proposal.base_schedule_version,
        proposal.proposed_schedule_version, proposal.diff_items, proposal.validation_checks, proposal.note
      ]
    );

    // 11. Seed Student Notification (Aarav Sharma Confirmed Slot Notification)
    const notification = {
      id: 'notif-001',
      student_id: 'stu-001',
      title: 'Interview Slot Confirmed',
      message: 'Your Round 1 Technical interview for Asteria Systems is confirmed for 09:30 AM IST in Room A (Newton Hall).',
      type: 'schedule_change',
      is_read: false,
      is_dismissed: false
    };

    await client.query(
      `INSERT INTO student_notifications (id, student_id, title, message, type, is_read, is_dismissed, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         message = EXCLUDED.message,
         type = EXCLUDED.type`,
      [notification.id, notification.student_id, notification.title, notification.message, notification.type, notification.is_read, notification.is_dismissed]
    );

    // 12. Seed System Initialization Audit Record
    const auditEntry = {
      id: 'aud-seed-001',
      actor_id: 'user-admin',
      actor_name: 'Dr. K. Swaminathan',
      actor_role: 'admin',
      action: 'system.seed_initialized',
      category: 'auth',
      entity_type: 'system',
      entity_id: 'sys-core',
      entity_name: 'Placement Command Database',
      summary: 'Development demo seed applied: 5 roles, criteria gates, interviewers, rooms, and conflict-free schedule v1.'
    };

    await client.query(
      `INSERT INTO audit_entries (id, timestamp, actor_id, actor_name, actor_role, action, category, entity_type, entity_id, entity_name, summary)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        auditEntry.id, auditEntry.actor_id, auditEntry.actor_name, auditEntry.actor_role,
        auditEntry.action, auditEntry.category, auditEntry.entity_type, auditEntry.entity_id,
        auditEntry.entity_name, auditEntry.summary
      ]
    );

    await client.query('COMMIT');

    // Query actual counts
    const tables = [
      'users',
      'students',
      'companies',
      'company_criteria',
      'student_applications',
      'rooms',
      'interviewers',
      'interview_slots',
      'interview_panel_members',
      'recovery_proposals',
      'student_notifications',
      'audit_entries'
    ];

    const counts: Record<string, number> = {};
    for (const t of tables) {
      const countRes = await client.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM ${t}`);
      counts[t] = parseInt(countRes.rows[0]?.count || '0', 10);
    }

    return {
      success: true,
      counts,
      message: 'Development demo seed applied successfully with zero conflicts.'
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Standalone CLI runner
if (process.argv[1]?.includes('seed')) {
  console.log('\n--- Running Placement Command Development Demo Seed ---');
  runDevSeed()
    .then(result => {
      console.log('✓ Seed completed successfully!\n');
      console.table(result.counts);
      process.exit(0);
    })
    .catch(err => {
      console.error('\n✗ Seed failed:', err.message || err);
      process.exit(1);
    });
}
