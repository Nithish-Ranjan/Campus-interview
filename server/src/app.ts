import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { testDbConnection } from './db.js';
import { authenticateSession } from './auth/middleware.js';

export const app = express();

// Configure CORS for frontend origin(s)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-actor-id, x-actor-name');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Middleware for parsing JSON, URL-encoded bodies, and cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session resolution middleware (attaches req.user if session cookie/token present)
app.use(authenticateSession);

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
 * GET /api/health
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
 * GET /api/health/db
 * Real PostgreSQL connectivity test.
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
    hint: 'Configure a valid DATABASE_URL in server/.env and ensure PostgreSQL is running.',
  });
});

import { authRouter } from './routes/auth.js';
import { aiRouter } from './routes/ai.js';
import { interviewsRouter } from './routes/interviews.js';
import { companiesRouter } from './routes/companies.js';
import { studentsRouter } from './routes/students.js';
import { overviewRouter } from './routes/overview.js';
import recoveryRouter from './routes/recovery.js';
import auditRouter from './routes/audit.js';
import usersRouter from './routes/users.js';
import notificationsRouter from './routes/notifications.js';

// Route mounting
app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/overview', overviewRouter);
app.use('/api/recovery-proposals', recoveryRouter);
app.use('/api/audit', auditRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);

// Global Error Handler (Multer errors & uncaught route exceptions)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File size exceeds 5 MB limit. Please upload a smaller PDF.' });
  }
  console.error('[Unhandled Server Error]:', err);
  return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});
