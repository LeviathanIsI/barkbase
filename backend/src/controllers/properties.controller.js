const propertiesService = require('../services/properties.service');

/**
 * Get properties for an object type
 * GET /api/v1/settings/properties?object=<objectType>&includeArchived=<boolean>
 */
async function getPropertiesByObjectType(req, res) {
  try {
    const { object, includeArchived } = req.query;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Tenant not found',
      });
    }

    if (!object) {
      return res.status(400).json({
        error: 'object query parameter is required',
      });
    }

    const validObjectTypes = ['pets', 'owners', 'bookings', 'invoices', 'payments', 'tickets'];
    if (!validObjectTypes.includes(object)) {
      return res.status(400).json({
        error: `Invalid object type. Must be one of: ${validObjectTypes.join(', ')}`,
      });
    }

    const properties = await propertiesService.getProperties(
      object,
      tenantId,
      includeArchived === 'true'
    );
    return res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch properties',
    });
  }
}

/**
 * Create a custom property
 * POST /api/v1/settings/properties
 */
async function createProperty(req, res) {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Tenant not found',
      });
    }

    const property = await propertiesService.createProperty(tenantId, req.body);
    return res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    return res.status(400).json({
      error: error.message || 'Failed to create property',
    });
  }
}

/**
 * Update a property
 * PATCH /api/v1/settings/properties/:id
 */
async function updateProperty(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Tenant not found',
      });
    }

    const property = await propertiesService.updateProperty(tenantId, id, req.body);
    return res.json(property);
  } catch (error) {
    console.error('Error updating property:', error);
    return res.status(400).json({
      error: error.message || 'Failed to update property',
    });
  }
}

/**
 * Delete a property permanently
 * DELETE /api/v1/settings/properties/:id
 */
async function deleteProperty(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Tenant not found',
      });
    }

    await propertiesService.deleteProperty(tenantId, id);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting property:', error);
    return res.status(400).json({
      error: error.message || 'Failed to delete property',
    });
  }
}

/**
 * Archive a property
 * POST /api/v1/settings/properties/:id/archive
 */
async function archiveProperty(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Tenant not found',
      });
    }

    const property = await propertiesService.archiveProperty(tenantId, id);
    return res.json(property);
  } catch (error) {
    console.error('Error archiving property:', error);
    return res.status(400).json({
      error: error.message || 'Failed to archive property',
    });
  }
}

/**
 * Restore an archived property
 * POST /api/v1/settings/properties/:id/restore
 */
async function restoreProperty(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Tenant not found',
      });
    }

    const property = await propertiesService.restoreProperty(tenantId, id);
    return res.json(property);
  } catch (error) {
    console.error('Error restoring property:', error);
    return res.status(400).json({
      error: error.message || 'Failed to restore property',
    });
  }
}

/**
 * Get archived properties count
 * GET /api/v1/settings/properties/archived/count?object=<objectType>
 */
async function getArchivedCount(req, res) {
  try {
    const { object } = req.query;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Tenant not found',
      });
    }

    if (!object) {
      return res.status(400).json({
        error: 'object query parameter is required',
      });
    }

    const count = await propertiesService.getArchivedCount(tenantId, object);
    return res.json({ count });
  } catch (error) {
    console.error('Error getting archived count:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get archived count',
    });
  }
}

module.exports = {
  getPropertiesByObjectType,
  createProperty,
  updateProperty,
  deleteProperty,
  archiveProperty,
  restoreProperty,
  getArchivedCount,
};
