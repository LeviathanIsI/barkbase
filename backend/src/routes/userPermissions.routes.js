const router = require('express').Router();
const userPermissionController = require('../controllers/userPermission.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { tenantContext } = require('../middleware/tenantContext');
const { checkPermission, attachUserPermissions } = require('../middleware/checkPermission');
const validate = require('../middleware/validate');
const Joi = require('joi');

// Validation schemas
const assignRolesSchema = Joi.object({
  roleIds: Joi.array().items(Joi.string()).required().min(1)
});

const grantPermissionSchema = Joi.object({
  permission: Joi.string().required(),
  expiresAt: Joi.date().iso().allow(null)
});

const revokePermissionSchema = Joi.object({
  permission: Joi.string().required()
});

const testPermissionsSchema = Joi.object({
  permissions: Joi.array().items(Joi.string()).required().min(1)
});

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantContext);
router.use(attachUserPermissions);

// Get current user's permissions
router.get(
  '/me',
  userPermissionController.getMyPermissions
);

// Get user's effective permissions
router.get(
  '/:userId/permissions',
  checkPermission('MANAGE_USERS', { allowSelf: true }),
  userPermissionController.getUserPermissions
);

// Get user's roles
router.get(
  '/:userId/roles',
  checkPermission('MANAGE_USERS', { allowSelf: true }),
  userPermissionController.getUserRoles
);

// Assign roles to a user
router.post(
  '/:userId/roles',
  checkPermission('MANAGE_USERS'),
  validate(assignRolesSchema),
  userPermissionController.assignRoles
);

// Remove roles from a user
router.delete(
  '/:userId/roles',
  checkPermission('MANAGE_USERS'),
  validate(assignRolesSchema),
  userPermissionController.removeRoles
);

// Grant specific permission to a user
router.post(
  '/:userId/permissions/grant',
  checkPermission('MANAGE_USERS'),
  validate(grantPermissionSchema),
  userPermissionController.grantPermission
);

// Revoke specific permission from a user
router.post(
  '/:userId/permissions/revoke',
  checkPermission('MANAGE_USERS'),
  validate(revokePermissionSchema),
  userPermissionController.revokePermission
);

// Get user's individual permission overrides
router.get(
  '/:userId/permissions/overrides',
  checkPermission('MANAGE_USERS'),
  userPermissionController.getUserOverrides
);

// Test permissions for a user
router.post(
  '/:userId/permissions/test',
  checkPermission('MANAGE_USERS'),
  validate(testPermissionsSchema),
  userPermissionController.testPermissions
);

module.exports = router;

