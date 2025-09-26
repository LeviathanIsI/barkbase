const { randomUUID } = require('crypto');
const pinoHttp = require('pino-http');
const logger = require('../utils/logger');

module.exports = pinoHttp({
  logger,
  redact: ['req.headers.authorization'],
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'responseTime',
    reqId: 'requestId',
  },
  genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
  customProps: (req) => ({
    tenantSlug: req.tenantSlug,
    tenantId: req.tenantId,
    userId: req.user?.id,
  }),
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
