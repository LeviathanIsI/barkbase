const permissionService = require('../services/permission.service');
const { prisma } = require('../lib/prisma');
const { AppError } = require('../utils/errors');
const { PERMISSION_CATEGORIES } = require('../lib/permissions');

class UserPermissionController {
  /**
   * Get user's effective permissions
   */
  async getUserPermissions(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Allow users to view their own permissions
      if (userId !== req.user.recordId && !req.userPermissions.MANAGE_USERS) {
        throw new AppError('Forbidden', 403);
      }

      const permissions = await permissionService.getUserEffectivePermissions(userId, req.tenantId);
      const roles = await permissionService.getUserRoles(userId, req.tenantId);

      res.json({
        permissions,
        roles: roles.map(ur => ({
          recordId: ur.role.recordId,
          name: ur.role.name,
          description: ur.role.description,
          assignedAt: ur.assignedAt
        })),
        permissionCategories: PERMISSION_CATEGORIES // For UI display
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's roles
   */
  async getUserRoles(req, res, next) {
    try {
      const { userId } = req.params;
      
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            where: { tenantId: req.tenantId }
          },
          assignedByUser: {
            select: {
              recordId: true,
              email: true,
              name: true
            }
          }
        }
      });

      res.json(userRoles.filter(ur => ur.role !== null));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign roles to a user
   */
  async assignRoles(req, res, next) {
    try {
      const { userId } = req.params;
      const { roleIds } = req.body;

      const results = await Promise.all(
        roleIds.map(roleId =>
          permissionService.assignRoleToUser(userId, roleId, req.user.recordId)
            .then(result => ({ success: true, roleId, result }))
            .catch(error => ({ success: false, roleId, error: error.message }))
        )
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        assigned: successful.length,
        failed: failed.length,
        details: failed
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove roles from a user
   */
  async removeRoles(req, res, next) {
    try {
      const { userId } = req.params;
      const { roleIds } = req.body;

      const results = await Promise.all(
        roleIds.map(roleId =>
          permissionService.removeRoleFromUser(userId, roleId)
            .then(() => ({ success: true, roleId }))
            .catch(error => ({ success: false, roleId, error: error.message }))
        )
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        removed: successful.length,
        failed: failed.length,
        details: failed
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Grant specific permission to a user
   */
  async grantPermission(req, res, next) {
    try {
      const { userId } = req.params;
      const { permission, expiresAt } = req.body;

      const result = await permissionService.grantPermissionToUser(
        userId,
        permission,
        req.user.recordId,
        expiresAt ? new Date(expiresAt) : null
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke specific permission from a user
   */
  async revokePermission(req, res, next) {
    try {
      const { userId } = req.params;
      const { permission } = req.body;

      const result = await permissionService.revokePermissionFromUser(
        userId,
        permission,
        req.user.recordId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's individual permission overrides
   */
  async getUserOverrides(req, res, next) {
    try {
      const { userId } = req.params;

      const overrides = await prisma.userPermission.findMany({
        where: { userId },
        include: {
          grantedByUser: {
            select: {
              recordId: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { grantedAt: 'desc' }
      });

      res.json(overrides);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test permissions for a user
   */
  async testPermissions(req, res, next) {
    try {
      const { userId } = req.params;
      const { permissions } = req.body;

      const results = {};
      for (const permission of permissions) {
        results[permission] = await permissionService.userHasPermission(
          userId,
          req.tenantId,
          permission
        );
      }

      res.json(results);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's permissions (for frontend)
   */
  async getMyPermissions(req, res, next) {
    try {
      const permissions = await permissionService.getUserEffectivePermissions(
        req.user.recordId,
        req.tenantId
      );

      const roles = await permissionService.getUserRoles(
        req.user.recordId,
        req.tenantId
      );

      res.json({
        permissions,
        roles: roles.map(ur => ({
          recordId: ur.role.recordId,
          name: ur.role.name,
          description: ur.role.description
        })),
        legacyRole: await permissionService.getUserLegacyRole(
          req.user.recordId,
          req.tenantId
        )
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserPermissionController();

