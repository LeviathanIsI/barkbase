const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const tenantContext = require('../middleware/tenantContext');
const validate = require('../middleware/validate');
const {
  createOwnerSchema,
  updateOwnerSchema,
  listOwnersQuerySchema,
} = require('../validators/owner.validator');
const ownerController = require('../controllers/owner.controller');

const router = express.Router();

// Apply tenant context to all routes
router.use(tenantContext);

/**
 * GET /api/v1/owners
 * List all owners with pagination and search
 */
router.get(
  '/',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(listOwnersQuerySchema, 'query'),
  ownerController.listOwners
);

/**
 * GET /api/v1/owners/:id
 * Get a single owner by ID
 */
router.get(
  '/:id',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  ownerController.getOwner
);

/**
 * GET /api/v1/owners/:id/pets
 * Get all pets for an owner
 */
router.get(
  '/:id/pets',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  ownerController.getOwnerPets
);

/**
 * POST /api/v1/owners
 * Create a new owner
 */
router.post(
  '/',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(createOwnerSchema),
  ownerController.createOwner
);

/**
 * PUT /api/v1/owners/:id
 * Update an existing owner
 */
router.put(
  '/:id',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(updateOwnerSchema),
  ownerController.updateOwner
);

/**
 * DELETE /api/v1/owners/:id
 * Delete an owner (only if no active pets)
 */
router.delete(
  '/:id',
  requireAuth(['OWNER', 'ADMIN']),
  ownerController.deleteOwner
);

module.exports = router;
