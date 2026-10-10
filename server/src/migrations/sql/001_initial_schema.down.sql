-- Rollback: 001_initial_schema.down.sql
-- Description: Safely drops tables in reverse dependency order.

DROP TABLE IF EXISTS audit_entries CASCADE;
DROP TABLE IF EXISTS student_notifications CASCADE;
DROP TABLE IF EXISTS recovery_proposals CASCADE;
DROP TABLE IF EXISTS schedule_conflicts CASCADE;
DROP TABLE IF EXISTS interview_panel_members CASCADE;
DROP TABLE IF EXISTS interview_slots CASCADE;
DROP TABLE IF EXISTS interviewers CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS student_applications CASCADE;
DROP TABLE IF EXISTS company_criteria CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
