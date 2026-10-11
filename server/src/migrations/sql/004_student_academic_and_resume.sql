-- Migration: 004_student_academic_and_resume.sql
-- Description: Adds academic year/graduation year/college to students, private resume storage columns, user sessions, and AI match caching.

-- 1. Student Academic & Resume Metadata Columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year VARCHAR(32) NOT NULL DEFAULT '4th Year';
ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_year INTEGER NOT NULL DEFAULT 2027;
ALTER TABLE students ADD COLUMN IF NOT EXISTS college_name VARCHAR(255) NOT NULL DEFAULT 'Apex Institute of Technology';
ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_storage_key VARCHAR(255) NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_file_size INTEGER NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_mime_type VARCHAR(64) NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_hash VARCHAR(64) NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_uploaded_at TIMESTAMPTZ NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_parse_status VARCHAR(32) NOT NULL DEFAULT 'not_uploaded';
ALTER TABLE students ADD COLUMN IF NOT EXISTS parsed_resume JSONB NULL;

-- 2. User Sessions Table (Stateful Server Session Verification)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- 3. AI Match Results Cache Table
CREATE TABLE IF NOT EXISTS ai_match_results (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    resume_hash VARCHAR(64) NOT NULL,
    criteria_version INTEGER NOT NULL DEFAULT 1,
    match_report JSONB NOT NULL,
    model_name VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, company_id, criteria_version)
);

CREATE INDEX IF NOT EXISTS idx_ai_match_student ON ai_match_results(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_match_company ON ai_match_results(company_id);
