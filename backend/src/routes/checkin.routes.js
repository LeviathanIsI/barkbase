const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const bookingController = require('../controllers/booking.controller');
const schemas = require('../validators/booking.validator');

const router = Router();

router.use(tenantContext, requireAuth());

router.post(
  '/quick',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.quickCheckIn),
  bookingController.quickCheckIn,
);

module.exports = router;
