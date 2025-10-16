const roleService = require('../services/role.service');
const permissionService = require('../services/permission.service');
const { KENNEL_ROLE_TEMPLATES } = require('../lib/permissions');

class RoleController {
  /**
   * List all roles for the tenant
   */
  async list(req, res, next) {
    try {
      const { includeInactive = false } = req.query;
      const roles = await roleService.listRoles(req.tenantId, {
        includeInactive: includeInactive === 'true'
      });

      res.json({
        roles,
        templates: KENNEL_ROLE_TEMPLATES // Include templates for UI
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific role
   */
  async get(req, res, next) {
    try {
      const { roleId } = req.params;
      const role = await roleService.getRoleById(roleId, req.tenantId);
      
      // Include users if requested
      if (req.query.includeUsers === 'true') {
        role.users = await roleService.getRoleUsers(roleId, req.tenantId);
      }

      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new role
   */
  async create(req, res, next) {
    try {
      const { name, description, permissions, templateKey } = req.body;
      let role;

      if (templateKey) {
        // Create from template
        role = await permissionService.createRoleFromTemplate(
          req.tenantId,
          templateKey,
          { name, description, permissions },
          req.user.recordId
        );
      } else {
        // Create custom role
        role = await roleService.createRole(
          req.tenantId,
          { name, description, permissions },
          req.user.recordId
        );
      }

      res.status(201).json(role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a role
   */
  async update(req, res, next) {
    try {
      const { roleId } = req.params;
      const { name, description, permissions, isActive } = req.body;

      const role = await roleService.updateRole(
        roleId,
        req.tenantId,
        { name, description, permissions, isActive }
      );

      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a role
   */
  async remove(req, res, next) {
    try {
      const { roleId } = req.params;
      await roleService.deleteRole(roleId, req.tenantId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clone a role
   */
  async clone(req, res, next) {
    try {
      const { roleId } = req.params;
      const { name } = req.body;

      const role = await roleService.cloneRole(
        roleId,
        req.tenantId,
        name,
        req.user.recordId
      );

      res.status(201).json(role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users assigned to a role
   */
  async getUsers(req, res, next) {
    try {
      const { roleId } = req.params;
      const users = await roleService.getRoleUsers(roleId, req.tenantId);
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign users to a role
   */
  async assignUsers(req, res, next) {
    try {
      const { roleId } = req.params;
      const { userIds } = req.body;

      const result = await roleService.assignUsersToRole(
        roleId,
        req.tenantId,
        userIds,
        req.user.recordId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove users from a role
   */
  async removeUsers(req, res, next) {
    try {
      const { roleId } = req.params;
      const { userIds } = req.body;

      const result = await roleService.removeUsersFromRole(
        roleId,
        req.tenantId,
        userIds
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update role permissions
   */
  async updatePermissions(req, res, next) {
    try {
      const { roleId } = req.params;
      const { permissions } = req.body;

      const role = await roleService.updateRolePermissions(
        roleId,
        req.tenantId,
        permissions
      );

      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initialize system roles for a tenant
   */
  async initializeSystemRoles(req, res, next) {
    try {
      const roles = await permissionService.initializeSystemRoles(
        req.tenantId,
        req.user.recordId
      );

      res.json({
        message: 'System roles initialized',
        roles
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoleController();

