const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const { auditLogger } = require('../middleware/auditLogger');
const { tenantWriteLimiter } = require('../middleware/tenantRateLimit');
const controller = require('../controllers/incident.controller');
const schemas = require('../validators/incident.validator');

const router = Router();

router.use(tenantContext, requireAuth());

router.get(
  '/',
  requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']),
  validate(schemas.query, 'query'),
  controller.list,
);

router.post(
  '/',
  tenantWriteLimiter,
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.create),
  auditLogger('incident.created', 'incident', (req) => req.body?.bookingId ?? req.body?.petId),
  controller.create,
);

module.exports = router;
