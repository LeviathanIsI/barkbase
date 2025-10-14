const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/payment.controller');
const schemas = require('../validators/payment.validator');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/summary', requireAuth(['OWNER', 'ADMIN']), controller.summary);
router.get('/', requireAuth(['OWNER', 'ADMIN']), controller.list);
router.post('/', requireAuth(['OWNER', 'ADMIN']), validate(schemas.record), controller.record);
router.post(
  '/:paymentId/capture',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.capture),
  controller.capture,
);

module.exports = router;
