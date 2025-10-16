const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/booking.controller');
const schemas = require('../validators/booking.validator');
const { auditLogger } = require('../middleware/auditLogger');
const { tenantWriteLimiter } = require('../middleware/tenantRateLimit');
const { requirePlanFeature } = require('../middleware/requirePlanFeature');
const { ensureIdempotent } = require('../middleware/idempotency');

const sanitizeCheckoutAudit = (req) => {
  const { signatureUrl, metadata, ...rest } = req.body ?? {};
  return {
    ...rest,
    signatureUrl: signatureUrl ? '[provided]' : null,
    metadata: metadata ? '[metadata]' : undefined,
  };
};

const router = Router();

router.use(tenantContext, requireAuth());
router.use(tenantWriteLimiter);

router.get('/', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.list);
router.post(
  '/',
  requireAuth(['OWNER', 'ADMIN']),
  ensureIdempotent({ ttlHours: 24 }),
  validate(schemas.create),
  auditLogger('booking.created', 'booking', (req) => req.body?.recordId),
  controller.create,
);
router.post(
  '/waitlist/:bookingId/promote',
  requirePlanFeature('waitlistPromotion', {
    message: 'Waitlist promotion is available on BarkBase Pro and above.',
  }),
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
router.post(
  '/:bookingId/checkin',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.checkIn),
  auditLogger('booking.checkin', 'booking', (req) => req.params.bookingId, (req) => req.body),
  controller.checkIn,
);
router.post(
  '/:bookingId/checkout',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.checkOut),
  auditLogger(
    'booking.checkout',
    'booking',
    (req) => req.params.bookingId,
    sanitizeCheckoutAudit,
  ),
  controller.checkOut,
);
router.delete(
  '/:bookingId',
  requireAuth(['OWNER', 'ADMIN']),
  auditLogger('booking.deleted', 'booking', (req) => req.params.bookingId),
  controller.remove,
);

module.exports = router;
