const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/report.controller');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/dashboard', requireAuth(['OWNER', 'ADMIN']), controller.dashboard);

module.exports = router;
