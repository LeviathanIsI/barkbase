const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/tenant.controller');
const schemas = require('../validators/tenant.validator');

const router = Router();

router.use(tenantContext);

router.get('/current', controller.current);

router.use(requireAuth());

router.put('/theme', requireAuth(['OWNER', 'ADMIN']), validate(schemas.theme), controller.updateTheme);
router.put(
  '/current/theme',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.theme),
  controller.updateTheme,
);
router.put('/features', requireAuth(['OWNER', 'ADMIN']), validate(schemas.featureFlags), controller.updateFeatureFlags);

module.exports = router;
