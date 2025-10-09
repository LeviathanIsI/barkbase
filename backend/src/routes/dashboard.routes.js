const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/dashboard.controller');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/stats', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.stats);
router.get('/occupancy', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.occupancy);
router.get('/vaccinations', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.vaccinations);
router.get('/shift-handoff', requireAuth(['OWNER', 'ADMIN', 'STAFF']), controller.shiftHandoff);
router.get('/emergency-access', requireAuth(['OWNER', 'ADMIN', 'STAFF']), controller.emergencyAccess);
router.get('/wellness-monitoring', requireAuth(['OWNER', 'ADMIN', 'STAFF']), controller.wellnessMonitoring);
router.get('/parent-communication', requireAuth(['OWNER', 'ADMIN', 'STAFF']), controller.parentCommunication);
router.get('/facility-heatmap', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.facilityHeatmap);
router.get('/revenue-optimizer', requireAuth(['OWNER', 'ADMIN']), controller.revenueOptimizer);
router.get('/social-compatibility', requireAuth(['OWNER', 'ADMIN', 'STAFF']), controller.socialCompatibility);
router.get('/staffing-intelligence', requireAuth(['OWNER', 'ADMIN']), controller.staffingIntelligence);
router.get('/customer-clv', requireAuth(['OWNER', 'ADMIN']), controller.customerCLV);
router.get('/incident-analytics', requireAuth(['OWNER', 'ADMIN', 'STAFF']), controller.incidentAnalytics);

module.exports = router;
