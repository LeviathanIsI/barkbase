const express = require('express');
const router = express.Router();
const associationController = require('../controllers/association.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { tenantContext } = require('../middleware/tenantContext');

// Apply tenant context to all routes
router.use(tenantContext);

// List associations
router.get(
  '/',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  associationController.listAssociations
);

// Get associations for a specific object type pair
router.get(
  '/pair/:fromObjectType/:toObjectType',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  associationController.getAssociationsForObjectPair
);

// Get a single association
router.get(
  '/:id',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  associationController.getAssociation
);

// Create a new association
router.post(
  '/',
  requireAuth(['OWNER', 'ADMIN']),
  associationController.createAssociation
);

// Update an association
router.put(
  '/:id',
  requireAuth(['OWNER', 'ADMIN']),
  associationController.updateAssociation
);

// Delete (archive) an association
router.delete(
  '/:id',
  requireAuth(['OWNER', 'ADMIN']),
  associationController.deleteAssociation
);

// Seed system associations (for development/setup)
router.post(
  '/seed/system',
  requireAuth(['OWNER']),
  associationController.seedSystemAssociations
);

module.exports = router;
