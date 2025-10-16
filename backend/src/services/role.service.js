const { prisma } = require('../lib/prisma');
const { AppError } = require('../utils/errors');

class RoleService {
  /**
   * Create a new role
   */
  async createRole(tenantId, data, createdBy) {
    const { name, description, permissions } = data;

    // Check if role name already exists for this tenant
    const existingRole = await prisma.customRole.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name
        }
      }
    });

    if (existingRole) {
      throw new AppError('A role with this name already exists', 409);
    }

    return prisma.customRole.create({
      data: {
        tenantId,
        name,
        description,
        permissions: permissions || {},
        createdBy,
        isSystem: false,
        isActive: true
      }
    });
  }

  /**
   * Get a role by ID
   */
  async getRoleById(roleId, tenantId) {
    const role = await prisma.customRole.findFirst({
      where: {
        recordId: roleId,
        tenantId
      },
      include: {
        _count: {
          select: { userRoles: true }
        }
      }
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    return role;
  }

  /**
   * Update a role
   */
  async updateRole(roleId, tenantId, data) {
    const role = await this.getRoleById(roleId, tenantId);

    if (role.isSystem) {
      throw new AppError('System roles cannot be modified', 403);
    }

    const { name, description, permissions, isActive } = data;

    // If renaming, check if new name already exists
    if (name && name !== role.name) {
      const existingRole = await prisma.customRole.findUnique({
        where: {
          tenantId_name: {
            tenantId,
            name
          }
        }
      });

      if (existingRole) {
        throw new AppError('A role with this name already exists', 409);
      }
    }

    return prisma.customRole.update({
      where: { recordId: roleId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(permissions && { permissions }),
        ...(isActive !== undefined && { isActive })
      }
    });
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId, tenantId) {
    const role = await this.getRoleById(roleId, tenantId);

    if (role.isSystem) {
      throw new AppError('System roles cannot be deleted', 403);
    }

    // Check if role is assigned to any users
    if (role._count.userRoles > 0) {
      throw new AppError('Cannot delete role that is assigned to users', 409);
    }

    return prisma.customRole.delete({
      where: { recordId: roleId }
    });
  }

  /**
   * Get all roles for a tenant
   */
  async listRoles(tenantId, options = {}) {
    const { includeInactive = false, includeUserCount = true } = options;

    const where = { tenantId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.customRole.findMany({
      where,
      include: includeUserCount ? {
        _count: {
          select: { userRoles: true }
        }
      } : undefined,
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Clone an existing role
   */
  async cloneRole(roleId, tenantId, newName, createdBy) {
    const sourceRole = await this.getRoleById(roleId, tenantId);

    return this.createRole(tenantId, {
      name: newName,
      description: `Cloned from ${sourceRole.name}`,
      permissions: sourceRole.permissions
    }, createdBy);
  }

  /**
   * Bulk update permissions for a role
   */
  async updateRolePermissions(roleId, tenantId, permissions) {
    const role = await this.getRoleById(roleId, tenantId);

    if (role.isSystem) {
      throw new AppError('System role permissions cannot be modified', 403);
    }

    return prisma.customRole.update({
      where: { recordId: roleId },
      data: { permissions }
    });
  }

  /**
   * Add specific permissions to a role
   */
  async addPermissionsToRole(roleId, tenantId, permissionsToAdd) {
    const role = await this.getRoleById(roleId, tenantId);

    if (role.isSystem) {
      throw new AppError('System role permissions cannot be modified', 403);
    }

    const updatedPermissions = { ...role.permissions };
    permissionsToAdd.forEach(permission => {
      updatedPermissions[permission] = true;
    });

    return prisma.customRole.update({
      where: { recordId: roleId },
      data: { permissions: updatedPermissions }
    });
  }

  /**
   * Remove specific permissions from a role
   */
  async removePermissionsFromRole(roleId, tenantId, permissionsToRemove) {
    const role = await this.getRoleById(roleId, tenantId);

    if (role.isSystem) {
      throw new AppError('System role permissions cannot be modified', 403);
    }

    const updatedPermissions = { ...role.permissions };
    permissionsToRemove.forEach(permission => {
      delete updatedPermissions[permission];
    });

    return prisma.customRole.update({
      where: { recordId: roleId },
      data: { permissions: updatedPermissions }
    });
  }

  /**
   * Get users assigned to a role
   */
  async getRoleUsers(roleId, tenantId) {
    await this.getRoleById(roleId, tenantId); // Verify role exists and belongs to tenant

    const userRoles = await prisma.userRole.findMany({
      where: { roleId },
      include: {
        user: {
          select: {
            recordId: true,
            email: true,
            name: true,
            avatarUrl: true,
            isActive: true,
            lastLoginAt: true
          }
        },
        assignedByUser: {
          select: {
            recordId: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    return userRoles.map(ur => ({
      ...ur.user,
      roleAssignment: {
        assignedAt: ur.assignedAt,
        assignedBy: ur.assignedByUser
      }
    }));
  }

  /**
   * Assign users to a role in bulk
   */
  async assignUsersToRole(roleId, tenantId, userIds, assignedBy) {
    await this.getRoleById(roleId, tenantId); // Verify role exists

    // Filter out users already assigned to this role
    const existingAssignments = await prisma.userRole.findMany({
      where: {
        roleId,
        userId: { in: userIds }
      },
      select: { userId: true }
    });

    const existingUserIds = new Set(existingAssignments.map(a => a.userId));
    const newUserIds = userIds.filter(id => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return { assigned: 0, alreadyAssigned: userIds.length };
    }

    const assignments = await prisma.userRole.createMany({
      data: newUserIds.map(userId => ({
        userId,
        roleId,
        assignedBy
      }))
    });

    return {
      assigned: assignments.count,
      alreadyAssigned: existingUserIds.size
    };
  }

  /**
   * Remove users from a role in bulk
   */
  async removeUsersFromRole(roleId, tenantId, userIds) {
    await this.getRoleById(roleId, tenantId); // Verify role exists

    const result = await prisma.userRole.deleteMany({
      where: {
        roleId,
        userId: { in: userIds }
      }
    });

    return { removed: result.count };
  }
}

module.exports = new RoleService();
