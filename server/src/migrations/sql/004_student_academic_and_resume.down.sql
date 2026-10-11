-- Rollback: 004_student_academic_and_resume.down.sql
DROP TABLE IF EXISTS ai_match_results;
DROP TABLE IF EXISTS user_sessions;

ALTER TABLE students DROP COLUMN IF EXISTS parsed_resume;
ALTER TABLE students DROP COLUMN IF EXISTS resume_parse_status;
ALTER TABLE students DROP COLUMN IF EXISTS resume_uploaded_at;
ALTER TABLE students DROP COLUMN IF EXISTS resume_hash;
ALTER TABLE students DROP COLUMN IF EXISTS resume_mime_type;
ALTER TABLE students DROP COLUMN IF EXISTS resume_file_size;
ALTER TABLE students DROP COLUMN IF EXISTS resume_storage_key;
ALTER TABLE students DROP COLUMN IF EXISTS college_name;
ALTER TABLE students DROP COLUMN IF EXISTS graduation_year;
ALTER TABLE students DROP COLUMN IF EXISTS academic_year;
