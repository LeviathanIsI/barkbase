const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/admin.controller');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/status', requireAuth(['OWNER', 'ADMIN']), controller.status);

module.exports = router;
