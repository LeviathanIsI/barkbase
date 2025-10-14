const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/upgrade.controller');

const router = Router();

router.use(tenantContext, requireAuth(['OWNER', 'ADMIN']));

router.post('/start', controller.start);
router.post('/execute', controller.execute);
router.get('/status', controller.status);
router.post('/cancel', controller.cancel);

module.exports = router;
