import { app } from './app.js';
import { config } from './config.js';
import { testDbConnection } from './db.js';

const server = app.listen(config.port, async () => {
  console.log(`====================================================`);
  console.log(` Placement Command Backend Server is running!`);
  console.log(` Port:        ${config.port}`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(` Health URL:  http://localhost:${config.port}/api/health`);
  console.log(` DB Health:   http://localhost:${config.port}/api/health/db`);
  console.log(` CORS:        ${config.corsOrigins.join(', ')}`);
  console.log(`====================================================`);

  // Log database connectivity status on startup
  const dbStatus = await testDbConnection();
  if (dbStatus.ok) {
    console.log(`[DB] Connected to PostgreSQL in ${dbStatus.latencyMs}ms`);
  } else {
    console.log(`[DB] PostgreSQL status: ${dbStatus.message} (${dbStatus.error})`);
  }
});

// Graceful shutdown handling
const handleShutdown = () => {
  console.log('\nGracefully shutting down backend server...');
  server.close(() => {
    console.log('Backend HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
