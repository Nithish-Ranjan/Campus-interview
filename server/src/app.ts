import express from 'express';
import cors from 'express';
import { config } from './config.js';
import { testDbConnection } from './db.js';

export const app = express();

// Configure CORS for frontend origin(s)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lightweight request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

/**
 * 2. GET /api/health
 * Simple health probe to verify API server is alive
 */
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'placement-command-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * 4. GET /api/health/db
 * Real PostgreSQL connectivity test.
 * Does not fake success: returns 200 if connected, 503 if unreachable/unconfigured.
 */
app.get('/api/health/db', async (_req, res) => {
  const result = await testDbConnection();

  if (result.ok) {
    return res.status(200).json({
      status: 'connected',
      database: 'postgresql',
      latencyMs: result.latencyMs,
      serverTime: result.serverTime,
      version: result.version,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(503).json({
    status: 'disconnected',
    database: 'postgresql',
    message: result.message,
    error: result.error,
    hint: 'Configure a valid DATABASE_URL in server/.env (e.g. postgresql://postgres:postgres@localhost:5432/placement_command) and ensure PostgreSQL is running.',
  });
});

import { interviewsRouter } from './routes/interviews.js';
import { companiesRouter } from './routes/companies.js';
import { studentsRouter } from './routes/students.js';
import { overviewRouter } from './routes/overview.js';
import recoveryRouter from './routes/recovery.js';
import auditRouter from './routes/audit.js';
import usersRouter from './routes/users.js';
import notificationsRouter from './routes/notifications.js';

// Read-only PostgreSQL Endpoints
app.use('/api/interviews', interviewsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/overview', overviewRouter);
app.use('/api/recovery-proposals', recoveryRouter);
app.use('/api/audit', auditRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
