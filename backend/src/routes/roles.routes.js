const router = require('express').Router();
const roleController = require('../controllers/role.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { tenantContext } = require('../middleware/tenantContext');
const { checkPermission } = require('../middleware/checkPermission');
const validate = require('../middleware/validate');
const Joi = require('joi');

// Validation schemas
const createRoleSchema = Joi.object({
  name: Joi.string().required().max(100),
  description: Joi.string().allow('', null),
  permissions: Joi.object().pattern(Joi.string(), Joi.boolean()),
  templateKey: Joi.string()
});

const updateRoleSchema = Joi.object({
  name: Joi.string().max(100),
  description: Joi.string().allow('', null),
  permissions: Joi.object().pattern(Joi.string(), Joi.boolean()),
  isActive: Joi.boolean()
}).min(1);

const cloneRoleSchema = Joi.object({
  name: Joi.string().required().max(100)
});

const assignUsersSchema = Joi.object({
  userIds: Joi.array().items(Joi.string()).required().min(1)
});

const updatePermissionsSchema = Joi.object({
  permissions: Joi.object().pattern(Joi.string(), Joi.boolean()).required()
});

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantContext);

// List all roles
router.get(
  '/',
  checkPermission('MANAGE_ROLES'),
  roleController.list
);

// Get a specific role
router.get(
  '/:roleId',
  checkPermission('MANAGE_ROLES'),
  roleController.get
);

// Create a new role
router.post(
  '/',
  checkPermission('MANAGE_ROLES'),
  validate(createRoleSchema),
  roleController.create
);

// Update a role
router.put(
  '/:roleId',
  checkPermission('MANAGE_ROLES'),
  validate(updateRoleSchema),
  roleController.update
);

// Delete a role
router.delete(
  '/:roleId',
  checkPermission('MANAGE_ROLES'),
  roleController.remove
);

// Clone a role
router.post(
  '/:roleId/clone',
  checkPermission('MANAGE_ROLES'),
  validate(cloneRoleSchema),
  roleController.clone
);

// Get users assigned to a role
router.get(
  '/:roleId/users',
  checkPermission('MANAGE_ROLES'),
  roleController.getUsers
);

// Assign users to a role
router.post(
  '/:roleId/users',
  checkPermission('MANAGE_ROLES'),
  validate(assignUsersSchema),
  roleController.assignUsers
);

// Remove users from a role
router.delete(
  '/:roleId/users',
  checkPermission('MANAGE_ROLES'),
  validate(assignUsersSchema),
  roleController.removeUsers
);

// Update role permissions
router.put(
  '/:roleId/permissions',
  checkPermission('MANAGE_ROLES'),
  validate(updatePermissionsSchema),
  roleController.updatePermissions
);

// Initialize system roles (one-time setup)
router.post(
  '/system/initialize',
  checkPermission('MANAGE_ROLES'),
  roleController.initializeSystemRoles
);

module.exports = router;

