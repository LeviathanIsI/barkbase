const { PrismaClient } = require('../../generated/prisma');
const env = require('./env');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.database.url,
    },
  },
  log: env.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

module.exports = prisma;

