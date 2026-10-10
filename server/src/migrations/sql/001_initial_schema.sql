-- Migration: 001_initial_schema.sql
-- Description: Core schema for Placement Command with normalized tables, constraints, and indexes.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'officer', 'coordinator', 'panel_coordinator', 'student', 'observer')),
    password_hash VARCHAR(255) NULL,
    assigned_panels JSONB NOT NULL DEFAULT '[]'::jsonb,
    environment VARCHAR(16) NOT NULL DEFAULT 'demo' CHECK (environment IN ('production', 'demo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL UNIQUE,
    roll_number VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    branch VARCHAR(128) NOT NULL,
    cgpa NUMERIC(4, 2) NOT NULL CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    backlogs INTEGER NOT NULL DEFAULT 0 CHECK (backlogs >= 0),
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    email VARCHAR(255) NULL,
    phone VARCHAR(32) NULL,
    resume_url VARCHAR(1024) NULL,
    resume_file_name VARCHAR(255) NULL,
    academic_verified JSONB NOT NULL DEFAULT '{"cgpa": true, "backlogs": true, "branch": true, "skills": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    round_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'evaluating' CHECK (status IN ('active', 'evaluating', 'scheduled', 'completed')),
    criteria_version INTEGER NOT NULL DEFAULT 1 CHECK (criteria_version >= 1),
    slots INTEGER NOT NULL CHECK (slots > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Company Criteria Table
CREATE TABLE IF NOT EXISTS company_criteria (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    type VARCHAR(16) NOT NULL CHECK (type IN ('mandatory', 'preferred')),
    field VARCHAR(64) NOT NULL,
    operator VARCHAR(16) NOT NULL CHECK (operator IN ('gte', 'lte', 'eq', 'in', 'min', 'max')),
    value JSONB NOT NULL,
    weight INTEGER NULL CHECK (weight IS NULL OR (weight >= 1 AND weight <= 100)),
    label VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Student Applications Table
CREATE TABLE IF NOT EXISTS student_applications (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    eligibility VARCHAR(32) NOT NULL DEFAULT 'pending_verification' CHECK (eligibility IN ('eligible', 'ineligible', 'pending_verification')),
    match_score NUMERIC(5, 2) NULL CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
    selection VARCHAR(32) NOT NULL DEFAULT 'not_selected_this_round' CHECK (selection IN ('selected', 'waitlisted', 'not_selected_this_round')),
    rank INTEGER NULL,
    waitlist_position INTEGER NULL,
    selection_reason TEXT NULL,
    criteria_summary JSONB NOT NULL DEFAULT '{"passed": 0, "total": 0}'::jsonb,
    explanation JSONB NULL,
    evaluated_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, company_id)
);

-- 6. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    building VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Interviewers Table
CREATE TABLE IF NOT EXISTS interviewers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Interview Slots Table
CREATE TABLE IF NOT EXISTS interview_slots (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ NULL,
    actual_end TIMESTAMPTZ NULL,
    estimated_start TIMESTAMPTZ NULL,
    estimated_end TIMESTAMPTZ NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'in_progress', 'completed', 'delayed', 'no_show', 'cancelled')),
    delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
    delay_reason TEXT NULL,
    schedule_mode VARCHAR(16) NOT NULL DEFAULT 'published' CHECK (schedule_mode IN ('published', 'draft', 'simulation')),
    schedule_version INTEGER NOT NULL DEFAULT 1,
    has_moved BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_actions JSONB NOT NULL DEFAULT '["check_in", "start", "mark_delayed", "cancel"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_slot_time CHECK (scheduled_end > scheduled_start)
);

-- 9. Interview Panel Members Join Table
CREATE TABLE IF NOT EXISTS interview_panel_members (
    interview_id VARCHAR(64) NOT NULL REFERENCES interview_slots(id) ON DELETE CASCADE,
    interviewer_id VARCHAR(64) NOT NULL REFERENCES interviewers(id) ON DELETE RESTRICT,
    PRIMARY KEY (interview_id, interviewer_id)
);

-- 10. Schedule Conflicts Table
CREATE TABLE IF NOT EXISTS schedule_conflicts (
    id VARCHAR(64) PRIMARY KEY,
    interview_id VARCHAR(64) NOT NULL REFERENCES interview_slots(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('interviewer', 'room', 'student', 'cross_company_student')),
    resource VARCHAR(255) NOT NULL,
    time_range VARCHAR(128) NOT NULL,
    counterpart VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL
);

-- 11. Recovery Proposals Table (Two-Key Governance)
CREATE TABLE IF NOT EXISTS recovery_proposals (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_by_user_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'stale')),
    simulation_id VARCHAR(64) NULL,
    base_schedule_version INTEGER NOT NULL,
    proposed_schedule_version INTEGER NOT NULL,
    diff_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
    note TEXT NULL,
    decided_by_user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ NULL,
    decision_note TEXT NULL,
    is_stale BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Student Notifications Table (Privacy-Preserved)
CREATE TABLE IF NOT EXISTS student_notifications (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'schedule_change',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Audit Entries Table (Append-Only Governance Log)
CREATE TABLE IF NOT EXISTS audit_entries (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('company', 'eligibility', 'capacity', 'schedule', 'live', 'recovery', 'approval', 'auth')),
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    details JSONB NULL
);

-- Performance & Integrity Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_criteria_company_version ON company_criteria(company_id, version);
CREATE INDEX IF NOT EXISTS idx_applications_student ON student_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_company ON student_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_slots_student ON interview_slots(student_id);
CREATE INDEX IF NOT EXISTS idx_slots_room_time ON interview_slots(room_id, scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_slots_company ON interview_slots(company_id);
CREATE INDEX IF NOT EXISTS idx_slots_mode_version ON interview_slots(schedule_mode, schedule_version);
CREATE INDEX IF NOT EXISTS idx_panel_interviewer ON interview_panel_members(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_interview ON schedule_conflicts(interview_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON recovery_proposals(status);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON student_notifications(student_id, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_entries(category);
