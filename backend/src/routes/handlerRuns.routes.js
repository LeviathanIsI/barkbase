const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/handlerFlow.controller');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/:runId', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.getRunById);
router.get('/:runId/logs', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.getRunLogs);

module.exports = router;
