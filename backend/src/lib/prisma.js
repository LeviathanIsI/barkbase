const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { getDatabaseUrl, getConnectionInfo } = require('../config/databaseUrl');

const MAX_RETRIES = Number(process.env.PRISMA_CONNECT_MAX_RETRIES || 5);
const INITIAL_DELAY_MS = Number(process.env.PRISMA_CONNECT_INITIAL_DELAY_MS || 250);

const databaseUrl = getDatabaseUrl();
const connectionInfo = getConnectionInfo();

let prismaSingleton = globalThis.__PRISMA_SINGLETON;
let shutdownHooksRegistered = false;
let connected = false;

if (!prismaSingleton) {
  const baseClient = new PrismaClient({
    log: ['warn', 'error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  // No longer need id extension since we're using recordId directly in the schema
  prismaSingleton = baseClient;

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__PRISMA_SINGLETON = prismaSingleton;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry() {
  if (connected) return;

  let attempt = 0;
  let delay = INITIAL_DELAY_MS;
  let lastError;

  while (attempt < MAX_RETRIES) {
    attempt += 1;
    try {
      await prismaSingleton.$connect();
      connected = true;
      const modeLabel = connectionInfo.isPooler ? 'Supabase PgBouncer' : 'Supabase';
      logger.info(
        {
          host: connectionInfo.host,
          port: connectionInfo.port,
          pooler: connectionInfo.isPooler,
          attempt,
        },
        `Connected to ${modeLabel} (${connectionInfo.host}:${connectionInfo.port})`,
      );
      registerShutdownHooks();
      return;
    } catch (error) {
      lastError = error;
      logger.warn(
        {
          attempt,
          maxRetries: MAX_RETRIES,
          delay,
          error: error.message,
          host: connectionInfo.host,
          port: connectionInfo.port,
          pooler: connectionInfo.isPooler,
        },
        'Failed to connect to Supabase database',
      );
      await sleep(delay);
      delay = Math.min(delay * 2, 2000);
    }
  }

  logger.error(
    {
      attempts: MAX_RETRIES,
      host: connectionInfo.host,
      port: connectionInfo.port,
      pooler: connectionInfo.isPooler,
      error: lastError?.message,
    },
    'Unable to connect to Supabase database after retries',
  );
  throw lastError;
}

async function healthCheck() {
  try {
    await prismaSingleton.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn(
      {
        host: connectionInfo.host,
        port: connectionInfo.port,
        pooler: connectionInfo.isPooler,
        error: error.message,
      },
      'Database health check failed',
    );
    return false;
  }
}

async function disconnect() {
  if (!connected) return;
  await prismaSingleton.$disconnect();
  connected = false;
}

const handleSignal = async (signal) => {
  logger.info({ signal }, 'Received signal, disconnecting Prisma');
  try {
    await disconnect();
  } catch (error) {
    logger.error({ signal, error: error.message }, 'Failed to disconnect Prisma on signal');
  }
};

const registerShutdownHooks = () => {
  if (shutdownHooksRegistered) return;

  process.once('beforeExit', async () => {
    await disconnect();
  });

  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);

  shutdownHooksRegistered = true;
};

prismaSingleton.healthCheck = healthCheck;
prismaSingleton.connectWithRetry = connectWithRetry;
prismaSingleton.disconnect = disconnect;
prismaSingleton.getConnectionInfo = getConnectionInfo;

module.exports = prismaSingleton;
