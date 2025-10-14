const { Router } = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { tenantContext } = require('../middleware/tenantContext');
const validate = require('../middleware/validate');
const { updateAccountDefaults } = require('../validators/accountDefaults.validator');
const { upload } = require('../lib/uploads');
const accountDefaultsController = require('../controllers/accountDefaults.controller');

const router = Router();

router.use(tenantContext);

router.get(
  '/',
  requireAuth(['OWNER', 'ADMIN']),
  accountDefaultsController.getAccountDefaults
);

router.patch(
  '/',
  requireAuth(['OWNER', 'ADMIN']),
  validate(updateAccountDefaults),
  accountDefaultsController.updateAccountDefaults
);

router.post(
  '/logo',
  requireAuth(['OWNER', 'ADMIN']),
  upload.single('logo'),
  accountDefaultsController.uploadLogo
);

module.exports = router;
