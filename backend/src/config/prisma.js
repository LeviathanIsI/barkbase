const { PrismaClient } = require('@prisma/client');
const env = require('./env');

if (!env.database.url) {
  throw new Error('DATABASE_URL is not set. Please configure backend/.env before starting the server.');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.database.url,
    },
  },
  log: env.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

module.exports = prisma;
