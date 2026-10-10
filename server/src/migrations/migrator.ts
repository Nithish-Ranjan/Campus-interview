import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { pool } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQL_DIR = path.resolve(__dirname, 'sql');

export interface MigrationInfo {
  version: string;
  name: string;
  filename: string;
  downFilename?: string;
  applied: boolean;
  appliedAt?: string;
}

/**
 * Ensures the migration tracking table exists in PostgreSQL.
 */
export async function ensureMigrationTable(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Discovers all versioned migration files in the sql/ directory.
 */
export function getAvailableMigrations(): Omit<MigrationInfo, 'applied' | 'appliedAt'>[] {
  if (!fs.existsSync(SQL_DIR)) {
    return [];
  }

  const files = fs.readdirSync(SQL_DIR);
  const upFiles = files.filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql'));

  return upFiles
    .map(filename => {
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      const version = match ? match[1]! : filename;
      const name = match ? match[2]! : filename;
      const downFilename = `${version}_${name}.down.sql`;
      const hasDown = files.includes(downFilename);

      return {
        version,
        name,
        filename,
        downFilename: hasDown ? downFilename : undefined
      };
    })
    .sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Returns migration status for all migrations (applied and pending).
 */
export async function getMigrationStatus(): Promise<MigrationInfo[]> {
  if (!pool) {
    throw new Error('Database pool is not configured. Check DATABASE_URL in .env.');
  }

  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);

    const res = await client.query<{ version: string; name: string; applied_at: Date }>(
      'SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC'
    );
    const appliedMap = new Map(res.rows.map(r => [r.version, r.applied_at.toISOString()]));

    const available = getAvailableMigrations();
    return available.map(m => ({
      ...m,
      applied: appliedMap.has(m.version),
      appliedAt: appliedMap.get(m.version)
    }));
  } finally {
    client.release();
  }
}

/**
 * Applies all pending migrations in sequential transactions.
 */
export async function runMigrationsUp(): Promise<{ appliedCount: number; migrations: string[] }> {
  if (!pool) {
    throw new Error('Database pool is not configured. Check DATABASE_URL in .env.');
  }

  const client = await pool.connect();
  const appliedList: string[] = [];

  try {
    await ensureMigrationTable(client);

    const res = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
    const appliedSet = new Set(res.rows.map(r => r.version));

    const available = getAvailableMigrations();
    const pending = available.filter(m => !appliedSet.has(m.version));

    for (const m of pending) {
      const filePath = path.join(SQL_DIR, m.filename);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      console.log(`[Migrator] Applying ${m.filename}...`);

      try {
        await client.query('BEGIN');
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [m.version, m.name]
        );
        await client.query('COMMIT');
        appliedList.push(m.filename);
        console.log(`[Migrator] Successfully applied ${m.filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migrator] Failed applying ${m.filename}. Rolled back transaction.`, err);
        throw err;
      }
    }

    return { appliedCount: appliedList.length, migrations: appliedList };
  } finally {
    client.release();
  }
}

/**
 * Safe development reset strategy: applies .down.sql files in reverse order.
 * Never drops the entire database.
 */
export async function runMigrationsReset(): Promise<{ revertedCount: number; migrations: string[] }> {
  if (!pool) {
    throw new Error('Database pool is not configured. Check DATABASE_URL in .env.');
  }

  const client = await pool.connect();
  const revertedList: string[] = [];

  try {
    await ensureMigrationTable(client);

    const res = await client.query<{ version: string; name: string }>(
      'SELECT version, name FROM schema_migrations ORDER BY version DESC'
    );
    const applied = res.rows;

    for (const m of applied) {
      const downFilename = `${m.version}_${m.name}.down.sql`;
      const downFilePath = path.join(SQL_DIR, downFilename);

      if (!fs.existsSync(downFilePath)) {
        console.warn(`[Migrator] Warning: No rollback file found for ${m.version}_${m.name}. Skipping down.`);
        continue;
      }

      const sqlContent = fs.readFileSync(downFilePath, 'utf-8');
      console.log(`[Migrator] Reverting ${downFilename}...`);

      try {
        await client.query('BEGIN');
        await client.query(sqlContent);
        await client.query('DELETE FROM schema_migrations WHERE version = $1', [m.version]);
        await client.query('COMMIT');
        revertedList.push(downFilename);
        console.log(`[Migrator] Successfully reverted ${downFilename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migrator] Failed reverting ${downFilename}. Rolled back transaction.`, err);
        throw err;
      }
    }

    return { revertedCount: revertedList.length, migrations: revertedList };
  } finally {
    client.release();
  }
}
