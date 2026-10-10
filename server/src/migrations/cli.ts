import { getMigrationStatus, runMigrationsUp, runMigrationsReset } from './migrator.js';
import { pool } from '../db.js';
import { config } from '../config.js';

const command = process.argv[2] || 'status';

async function main() {
  try {
    switch (command) {
      case 'status': {
        console.log('\n================ MIGRATION STATUS ================');
        const statusList = await getMigrationStatus();
        if (statusList.length === 0) {
          console.log('No migration files found in server/src/migrations/sql/');
        } else {
          console.table(
            statusList.map(m => ({
              Version: m.version,
              Name: m.name,
              Status: m.applied ? 'APPLIED' : 'PENDING',
              'Applied At': m.appliedAt || 'N/A',
              'Rollback File': m.downFilename ? 'YES' : 'NO'
            }))
          );
        }
        console.log('==================================================\n');
        break;
      }

      case 'up': {
        console.log('\n[Migrator] Running pending migrations...');
        const result = await runMigrationsUp();
        if (result.appliedCount === 0) {
          console.log('[Migrator] Database is already up to date. No migrations to apply.');
        } else {
          console.log(`[Migrator] Applied ${result.appliedCount} migration(s): ${result.migrations.join(', ')}`);
        }
        break;
      }

      case 'reset': {
        if (config.nodeEnv === 'production') {
          throw new Error('MIGRATION RESET IS BLOCKED: migrate:reset is strictly forbidden in production.');
        }

        const isConfirmed = process.argv.includes('--confirm');
        if (!isConfirmed) {
          throw new Error(
            'Safety abort: Resetting migrations will drop and recreate development schema tables.\n' +
            'To proceed in development, re-run with explicit confirmation flag: npm run migrate:reset -- --confirm'
          );
        }

        console.log('\n[Migrator] Reverting applied migrations in development...');
        const result = await runMigrationsReset();
        if (result.revertedCount === 0) {
          console.log('[Migrator] No applied migrations to revert.');
        } else {
          console.log(`[Migrator] Reverted ${result.revertedCount} migration(s): ${result.migrations.join(', ')}`);
        }
        break;
      }

      default:
        console.error(`Unknown migration command: ${command}`);
        console.log('Available commands: status, up, reset');
        process.exitCode = 1;
    }
  } catch (err: any) {
    console.error('\n[Migrator Error]:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
