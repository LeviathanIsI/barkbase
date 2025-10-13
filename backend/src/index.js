const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const prisma = require('./lib/prisma');
const readiness = require('./lib/readiness');
const { getConnectionInfo } = require('./config/databaseUrl');
const { initSocket } = require('./lib/socket');
const { scheduleVaccinationReminders } = require('./jobs/vaccinationReminders');
const { scheduleStorageMaintenance } = require('./jobs/storageMaintenance');
const { scheduleAuditRetentionJob } = require('./jobs/auditRetention');
const { startScheduler } = require('./jobs/flowScheduler');

const connectionInfo = getConnectionInfo();

async function boot() {
  try {
    await prisma.connectWithRetry();
    const healthy = await prisma.healthCheck();
    if (!healthy) {
      throw new Error('Initial database health check failed');
    }
    readiness.setDbHealthy(true);
  } catch (error) {
    readiness.setDbHealthy(false);
    const message = connectionInfo.isPooler
      ? 'Prod DB unreachable (pooler 6543). Open port 6543 or deploy where it is reachable.'
      : 'Dev DB unreachable (direct 5432). Verify credentials, sslmode=require, and Supabase availability.';
    logger.error(
      {
        error: error.message,
        host: connectionInfo.host,
        port: connectionInfo.port,
        pooler: connectionInfo.isPooler,
      },
      message,
    );
    process.exit(1);
  }

  const server = http.createServer(app);
  initSocket(server);
  scheduleVaccinationReminders();
  scheduleStorageMaintenance();
  scheduleAuditRetentionJob();
  // startScheduler(); // Disabled: HandlerFlow model not in schema

  const gracefulShutdown = async (signal) => {
    logger.info({ signal }, 'Received shutdown signal - closing server');
    readiness.setAppReady(false);

    server.close(() => {
      prisma
        .disconnect()
        .then(() => {
          logger.info('HTTP server closed');
          process.exit(0);
        })
        .catch((error) => {
          logger.error({ error: error.message }, 'Error during Prisma disconnect on shutdown');
          process.exit(1);
        });
    });

    setTimeout(() => {
      logger.warn('Forcing shutdown after grace period');
      process.exit(1);
    }, 10000).unref();
  };

  process.once('SIGINT', gracefulShutdown);
  process.once('SIGTERM', gracefulShutdown);

  server.listen(env.port, env.host, () => {
    readiness.setAppReady(true);
    logger.info(
      {
        port: env.port,
        host: env.host,
        dbHost: connectionInfo.host,
        dbPort: connectionInfo.port,
        pooler: connectionInfo.isPooler,
      },
      'API server started',
    );
  });
}

boot().catch((error) => {
  logger.error({ error: error.message }, 'Unexpected error during server startup');
  process.exit(1);
});
