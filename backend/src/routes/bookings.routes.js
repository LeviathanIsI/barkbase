const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/booking.controller');
const schemas = require('../validators/booking.validator');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.list);
router.post('/', requireAuth(['OWNER', 'ADMIN']), validate(schemas.create), controller.create);
router.post(
  '/waitlist/:bookingId/promote',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.promoteWaitlist),
  controller.promoteWaitlist,
);
router.get('/:bookingId', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.getById);
router.put(
  '/:bookingId',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.update),
  controller.update,
);
router.patch(
  '/:bookingId/status',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.updateStatus),
  controller.updateStatus,
);
router.delete('/:bookingId', requireAuth(['OWNER', 'ADMIN']), controller.remove);

module.exports = router;
