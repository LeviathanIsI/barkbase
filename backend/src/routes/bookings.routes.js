const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/booking.controller');
const schemas = require('../validators/booking.validator');
const { auditLogger } = require('../middleware/auditLogger');
const { tenantWriteLimiter } = require('../middleware/tenantRateLimit');

const router = Router();

router.use(tenantContext, requireAuth());
router.use(tenantWriteLimiter);

router.get('/', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.list);
router.post(
  '/',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.create),
  auditLogger('booking.created', 'booking', (req) => req.body?.id),
  controller.create,
);
router.post(
  '/waitlist/:bookingId/promote',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.promoteWaitlist),
  auditLogger('booking.promoted', 'booking', (req) => req.params.bookingId),
  controller.promoteWaitlist,
);
router.get('/:bookingId', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.getById);
router.put(
  '/:bookingId',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.update),
  auditLogger('booking.updated', 'booking', (req) => req.params.bookingId, (req) => req.body),
  controller.update,
);
router.patch(
  '/:bookingId/status',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.updateStatus),
  auditLogger('booking.status', 'booking', (req) => req.params.bookingId, (req) => ({ status: req.body.status })),
  controller.updateStatus,
);
router.delete(
  '/:bookingId',
  requireAuth(['OWNER', 'ADMIN']),
  auditLogger('booking.deleted', 'booking', (req) => req.params.bookingId),
  controller.remove,
);

module.exports = router;
