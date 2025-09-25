const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/staff.controller');
const schemas = require('../validators/staff.validator');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/', requireAuth(['OWNER', 'ADMIN']), controller.list);
router.patch(
  '/:staffId/status',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.status),
  controller.updateStatus,
);

module.exports = router;
