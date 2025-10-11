const express = require('express');
const propertiesController = require('../controllers/properties.controller');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// All properties routes require authentication and tenant context
router.use(tenantContext, requireAuth());

// GET /api/v1/settings/properties?object=<objectType>&includeArchived=<boolean>
router.get('/', propertiesController.getPropertiesByObjectType);

// GET /api/v1/settings/properties/archived/count?object=<objectType>
router.get('/archived/count', propertiesController.getArchivedCount);

// POST /api/v1/settings/properties
router.post('/', propertiesController.createProperty);

// POST /api/v1/settings/properties/:id/archive
router.post('/:id/archive', propertiesController.archiveProperty);

// POST /api/v1/settings/properties/:id/restore
router.post('/:id/restore', propertiesController.restoreProperty);

// PATCH /api/v1/settings/properties/:id
router.patch('/:id', propertiesController.updateProperty);

// DELETE /api/v1/settings/properties/:id
router.delete('/:id', propertiesController.deleteProperty);

module.exports = router;
