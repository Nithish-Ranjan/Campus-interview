import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAvailableMigrations } from './migrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQL_DIR = path.resolve(__dirname, 'sql');

export function verifyMigrationFiles(): { passed: boolean; errors: string[]; summary: Record<string, any> } {
  const errors: string[] = [];
  const migrations = getAvailableMigrations();

  if (migrations.length === 0) {
    errors.push('No migration files found in sql/ directory.');
  }

  // 1. Check for rollback counterparts
  for (const m of migrations) {
    if (!m.downFilename) {
      errors.push(`Migration ${m.filename} does not have a corresponding rollback file.`);
    }
  }

  // 2. Verify 001_initial_schema.sql contents
  const initialSqlPath = path.join(SQL_DIR, '001_initial_schema.sql');
  if (!fs.existsSync(initialSqlPath)) {
    errors.push('001_initial_schema.sql does not exist.');
    return { passed: false, errors, summary: {} };
  }

  const sql = fs.readFileSync(initialSqlPath, 'utf-8');

  // Required tables
  const requiredTables = [
    'users',
    'students',
    'companies',
    'company_criteria',
    'student_applications',
    'rooms',
    'interviewers',
    'interview_slots',
    'interview_panel_members',
    'schedule_conflicts',
    'recovery_proposals',
    'student_notifications',
    'audit_entries'
  ];

  const missingTables: string[] = [];
  for (const table of requiredTables) {
    const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${table}\\b`, 'i');
    if (!tableRegex.test(sql)) {
      missingTables.push(table);
    }
  }

  if (missingTables.length > 0) {
    errors.push(`Missing required tables: ${missingTables.join(', ')}`);
  }

  // Check 5 approved roles in role check constraint
  const requiredRoles = ['admin', 'officer', 'coordinator', 'panel_coordinator', 'student'];
  for (const role of requiredRoles) {
    if (!sql.includes(`'${role}'`)) {
      errors.push(`Role '${role}' is missing from role check constraint.`);
    }
  }

  // Check no plaintext passwords
  if (sql.includes('plaintext') || sql.includes('password VARCHAR') && !sql.includes('password_hash')) {
    errors.push('Schema must not store plaintext passwords.');
  }

  // Check scheduling safe swap integrity
  if (!sql.includes('interview_slots') || !sql.includes('scheduled_end > scheduled_start')) {
    errors.push('interview_slots missing time constraint check.');
  }

  return {
    passed: errors.length === 0,
    errors,
    summary: {
      totalMigrations: migrations.length,
      verifiedTablesCount: requiredTables.length - missingTables.length,
      requiredTablesCount: requiredTables.length,
      hasRollback: migrations.every(m => !!m.downFilename)
    }
  };
}

// Direct execution CLI runner
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('\n--- Running Schema Verification Tests ---');
  const result = verifyMigrationFiles();

  if (result.passed) {
    console.log('✓ All schema verification tests PASSED.');
    console.log(`✓ Tables verified: ${result.summary.verifiedTablesCount}/${result.summary.requiredTablesCount}`);
    console.log(`✓ Migration pairs: ${result.summary.totalMigrations} up / down matched`);
    process.exit(0);
  } else {
    console.error('✗ Schema verification FAILED:');
    result.errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
}
