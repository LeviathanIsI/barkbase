const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const facilityController = require('../controllers/facility.controller');

const router = Router();

// All facility routes require authentication and tenant context
router.use(tenantContext, requireAuth());

// Facility settings endpoints
router.get('/settings', facilityController.getFacilitySettings);
router.put('/settings', requireAuth(['OWNER', 'ADMIN']), facilityController.updateFacilitySettings);

// Inventory management
router.get('/inventory', facilityController.getInventory);
router.post('/inventory', requireAuth(['OWNER', 'ADMIN']), facilityController.createInventoryItem);
router.put('/inventory/:itemId', requireAuth(['OWNER', 'ADMIN']), facilityController.updateInventoryItem);
router.delete('/inventory/:itemId', requireAuth(['OWNER', 'ADMIN']), facilityController.deleteInventoryItem);

// Location management
router.get('/locations', facilityController.getLocations);
router.post('/locations/buildings', requireAuth(['OWNER', 'ADMIN']), facilityController.createBuilding);
router.put('/locations/buildings/:buildingId', requireAuth(['OWNER', 'ADMIN']), facilityController.updateBuilding);
router.delete('/locations/buildings/:buildingId', requireAuth(['OWNER', 'ADMIN']), facilityController.deleteBuilding);
router.post('/locations/areas', requireAuth(['OWNER', 'ADMIN']), facilityController.createArea);
router.put('/locations/areas/:areaId', requireAuth(['OWNER', 'ADMIN']), facilityController.updateArea);
router.delete('/locations/areas/:areaId', requireAuth(['OWNER', 'ADMIN']), facilityController.deleteArea);

// Schedule management
router.get('/schedules', facilityController.getSchedules);
router.post('/schedules/training', requireAuth(['OWNER', 'ADMIN']), facilityController.createTrainingSchedule);
router.put('/schedules/training/:scheduleId', requireAuth(['OWNER', 'ADMIN']), facilityController.updateTrainingSchedule);
router.delete('/schedules/training/:scheduleId', requireAuth(['OWNER', 'ADMIN']), facilityController.deleteTrainingSchedule);
router.post('/schedules/maintenance', requireAuth(['OWNER', 'ADMIN']), facilityController.createMaintenanceSchedule);
router.put('/schedules/maintenance/:scheduleId', requireAuth(['OWNER', 'ADMIN']), facilityController.updateMaintenanceSchedule);
router.delete('/schedules/maintenance/:scheduleId', requireAuth(['OWNER', 'ADMIN']), facilityController.deleteMaintenanceSchedule);

module.exports = router;

