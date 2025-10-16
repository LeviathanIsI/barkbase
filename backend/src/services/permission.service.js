const { prisma } = require('../lib/prisma');
const { SYSTEM_ROLES, KENNEL_ROLE_TEMPLATES, ALL_PERMISSIONS } = require('../lib/permissions');

class PermissionService {
  /**
   * Get all effective permissions for a user
   * Combines role permissions and individual permission overrides
   */
  async getUserEffectivePermissions(userId, tenantId) {
    // 1. Get all roles for the user
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          where: {
            tenantId,
            isActive: true
          }
        }
      }
    });

    // 2. Merge permissions from all roles
    let rolePermissions = {};
    for (const userRole of userRoles) {
      if (userRole.role) {
        Object.assign(rolePermissions, userRole.role.permissions);
      }
    }

    // 3. Get individual permission overrides
    const now = new Date();
    const overrides = await prisma.userPermission.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      }
    });

    // 4. Apply overrides (they take precedence)
    let finalPermissions = { ...rolePermissions };
    for (const override of overrides) {
      if (override.granted) {
        finalPermissions[override.permission] = true;
      } else {
        delete finalPermissions[override.permission];
      }
    }

    return finalPermissions;
  }

  /**
   * Check if a user has a specific permission
   */
  async userHasPermission(userId, tenantId, permission) {
    const permissions = await this.getUserEffectivePermissions(userId, tenantId);
    return permissions[permission] === true;
  }

  /**
   * Check if a user has any of the specified permissions
   */
  async userHasAnyPermission(userId, tenantId, permissionList) {
    const permissions = await this.getUserEffectivePermissions(userId, tenantId);
    return permissionList.some(permission => permissions[permission] === true);
  }

  /**
   * Check if a user has all of the specified permissions
   */
  async userHasAllPermissions(userId, tenantId, permissionList) {
    const permissions = await this.getUserEffectivePermissions(userId, tenantId);
    return permissionList.every(permission => permissions[permission] === true);
  }

  /**
   * Get user's current role (for backward compatibility)
   * Returns the highest priority role: OWNER > ADMIN > STAFF > READONLY
   */
  async getUserLegacyRole(userId, tenantId) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId
        }
      }
    });

    // Return the existing role from membership for now
    // This maintains backward compatibility
    return membership?.role || 'READONLY';
  }

  /**
   * Initialize default system roles for a tenant
   */
  async initializeSystemRoles(tenantId, createdBy) {
    const roles = [];
    
    for (const [key, roleData] of Object.entries(SYSTEM_ROLES)) {
      const existingRole = await prisma.customRole.findUnique({
        where: {
          tenantId_name: {
            tenantId,
            name: roleData.name
          }
        }
      });

      if (!existingRole) {
        const role = await prisma.customRole.create({
          data: {
            tenantId,
            name: roleData.name,
            description: roleData.description,
            permissions: roleData.permissions,
            isSystem: true,
            isActive: true,
            createdBy
          }
        });
        roles.push(role);
      }
    }

    return roles;
  }

  /**
   * Create a new role from a template
   */
  async createRoleFromTemplate(tenantId, templateKey, customizations = {}, createdBy) {
    const template = KENNEL_ROLE_TEMPLATES[templateKey];
    if (!template) {
      throw new Error('Invalid template key');
    }

    const roleData = {
      tenantId,
      name: customizations.name || template.name,
      description: customizations.description || template.description,
      permissions: { ...template.permissions, ...(customizations.permissions || {}) },
      isSystem: false,
      isActive: true,
      createdBy
    };

    return prisma.customRole.create({ data: roleData });
  }

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(userId, roleId, assignedBy) {
    // Check if assignment already exists
    const existing = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    });

    if (existing) {
      return existing;
    }

    return prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy
      }
    });
  }

  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(userId, roleId) {
    return prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    });
  }

  /**
   * Grant a specific permission to a user
   */
  async grantPermissionToUser(userId, permission, grantedBy, expiresAt = null) {
    return prisma.userPermission.upsert({
      where: {
        userId_permission: {
          userId,
          permission
        }
      },
      create: {
        userId,
        permission,
        granted: true,
        grantedBy,
        expiresAt
      },
      update: {
        granted: true,
        grantedBy,
        grantedAt: new Date(),
        expiresAt
      }
    });
  }

  /**
   * Revoke a specific permission from a user
   */
  async revokePermissionFromUser(userId, permission, revokedBy) {
    return prisma.userPermission.upsert({
      where: {
        userId_permission: {
          userId,
          permission
        }
      },
      create: {
        userId,
        permission,
        granted: false,
        grantedBy: revokedBy
      },
      update: {
        granted: false,
        grantedBy: revokedBy,
        grantedAt: new Date()
      }
    });
  }

  /**
   * Get all roles for a tenant
   */
  async getTenantRoles(tenantId, includeInactive = false) {
    const where = { tenantId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.customRole.findMany({
      where,
      include: {
        _count: {
          select: { userRoles: true }
        }
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Get all users with a specific role
   */
  async getUsersWithRole(roleId) {
    const userRoles = await prisma.userRole.findMany({
      where: { roleId },
      include: {
        user: {
          select: {
            recordId: true,
            email: true,
            name: true,
            avatarUrl: true,
            isActive: true
          }
        }
      }
    });

    return userRoles.map(ur => ({
      ...ur.user,
      assignedAt: ur.assignedAt
    }));
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId, tenantId) {
    return prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          where: { tenantId }
        }
      }
    });
  }

  /**
   * Create a permission set
   */
  async createPermissionSet(tenantId, name, description, permissions) {
    return prisma.permissionSet.create({
      data: {
        tenantId,
        name,
        description,
        permissions
      }
    });
  }

  /**
   * Get all permission sets for a tenant
   */
  async getTenantPermissionSets(tenantId) {
    return prisma.permissionSet.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Apply a permission set to a role
   */
  async applyPermissionSetToRole(roleId, permissionSetId) {
    const permissionSet = await prisma.permissionSet.findUnique({
      where: { recordId: permissionSetId }
    });

    if (!permissionSet) {
      throw new Error('Permission set not found');
    }

    const role = await prisma.customRole.findUnique({
      where: { recordId: roleId }
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Merge permissions
    const mergedPermissions = {
      ...role.permissions,
      ...permissionSet.permissions
    };

    return prisma.customRole.update({
      where: { recordId: roleId },
      data: { permissions: mergedPermissions }
    });
  }

  /**
   * Clean up expired permissions
   */
  async cleanupExpiredPermissions() {
    const now = new Date();
    return prisma.userPermission.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });
  }
}

module.exports = new PermissionService();
