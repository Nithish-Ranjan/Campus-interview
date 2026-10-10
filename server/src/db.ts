import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool: pg.Pool | null = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000
    })
  : null;

// Graceful pool error listener
if (pool) {
  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Unexpected Error]:', err.message);
  });
}

export interface DbConnectionResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
  serverTime?: string;
  version?: string;
  error?: string;
}

/**
 * Actively tests PostgreSQL connection by running a query.
 * Never fakes success: reports real database connectivity status.
 */
export async function testDbConnection(): Promise<DbConnectionResult> {
  if (!config.databaseUrl || !pool) {
    return {
      ok: false,
      message: 'PostgreSQL connection failed: DATABASE_URL is not set in environment.',
      error: 'DATABASE_URL_NOT_CONFIGURED'
    };
  }

  const startTime = Date.now();
  let client: pg.PoolClient | null = null;

  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version;');
    const latencyMs = Date.now() - startTime;
    const row = result.rows[0];

    return {
      ok: true,
      message: 'PostgreSQL connection healthy and verified.',
      latencyMs,
      serverTime: row?.current_time ? new Date(row.current_time).toISOString() : undefined,
      version: row?.version
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      message: 'PostgreSQL connection failed.',
      latencyMs,
      error: error?.message || 'Unknown database error'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}
