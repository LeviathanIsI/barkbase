const rateLimit = require('express-rate-limit');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const createTenantRateLimiter = ({ windowMs, max }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !WRITE_METHODS.has(req.method),
    keyGenerator: (req, res) => {
      const tenantKey = req.tenantId || req.tenantSlug || req.headers['x-tenant'];
      if (tenantKey) {
        return `tenant:${tenantKey}`;
      }
      return rateLimit.ipKeyGenerator(req, res);
    },
  });

const tenantWriteLimiter = createTenantRateLimiter({ windowMs: 60 * 1000, max: 60 });

module.exports = {
  tenantWriteLimiter,
};
