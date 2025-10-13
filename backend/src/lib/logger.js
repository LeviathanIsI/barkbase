const pino = require('pino');
const env = require('../config/env');

const baseLogger = pino({
  level: env.nodeEnv === 'development' ? 'debug' : 'info',
  transport:
    env.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});

function withTenant(sourceLogger = baseLogger, tenantId) {
  if (!tenantId) {
    return sourceLogger;
  }
  return sourceLogger.child({ tenantId });
}

function withReq(sourceLogger = baseLogger, reqId) {
  if (!reqId) {
    return sourceLogger;
  }
  return sourceLogger.child({ reqId });
}

module.exports = {
  logger: baseLogger,
  withTenant,
  withReq,
};
