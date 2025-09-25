const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/dashboard.controller');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/stats', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.stats);
router.get('/occupancy', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.occupancy);
router.get('/vaccinations', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.vaccinations);

module.exports = router;
