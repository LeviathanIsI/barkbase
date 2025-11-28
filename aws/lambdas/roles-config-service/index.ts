/**
 * Roles Config Service Lambda Handler
 * 
 * Routes handled:
 * - GET /api/v1/roles           - List all roles
 * - GET /api/v1/roles/{roleId}  - Get a specific role
 * - POST /api/v1/roles          - Create a new role
 * - GET /api/v1/user-permissions/{userId} - Get user's permissions
 * - POST /api/v1/user-permissions/{userId} - Assign permissions to user
 * - PATCH /api/v1/user-permissions/{userId} - Update user permissions
 * 
 * Database tables used:
 * - PermissionProfile (profile_id, profile_name, profile_key, description, permissions)
 * - UserProfileAssignment (user_id, profile_id, tenant_id, is_primary)
 * - Membership (userId, tenantId, role)
 * 
 * Note: This is a minimal read-only implementation for Phase 7.
 * Full CRUD operations will be added in a later phase.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import {
  // Types
  ERROR_CODES,
  RequestMetadata,
  // Security
  errorResponse,
  successResponse,
  handleOptions,
  auditLog,
  getRequestMetadata,
  // Database
  query,
  // Auth
  requireAuth,
} from '../shared';

// Define built-in roles (these can be overridden by tenant-specific roles in DB)
const BUILT_IN_ROLES = [
  {
    roleKey: 'OWNER',
    roleName: 'Owner',
    description: 'Full access to all tenant resources and settings',
    level: 100,
    permissions: ['*'],
  },
  {
    roleKey: 'ADMIN',
    roleName: 'Administrator',
    description: 'Administrative access to manage users and settings',
    level: 90,
    permissions: [
      'users:read', 'users:write', 'users:delete',
      'settings:read', 'settings:write',
      'reports:read',
      'bookings:read', 'bookings:write', 'bookings:delete',
      'pets:read', 'pets:write',
      'owners:read', 'owners:write',
    ],
  },
  {
    roleKey: 'STAFF',
    roleName: 'Staff',
    description: 'Day-to-day operations access',
    level: 50,
    permissions: [
      'bookings:read', 'bookings:write',
      'check-ins:read', 'check-ins:write',
      'pets:read', 'pets:write',
      'owners:read', 'owners:write',
      'tasks:read', 'tasks:write',
      'kennels:read', 'kennels:write',
    ],
  },
  {
    roleKey: 'USER',
    roleName: 'User',
    description: 'Basic read-only access',
    level: 10,
    permissions: [
      'bookings:read',
      'pets:read',
      'owners:read',
      'profile:read', 'profile:write',
    ],
  },
];

/**
 * Main Lambda handler - routes requests to appropriate sub-handler
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const metadata = getRequestMetadata(event);

  console.log('[ROLES-CONFIG] Request received', {
    requestId: context.awsRequestId,
    path: metadata.path,
    method: metadata.method,
    stage: process.env.STAGE,
  });

  // Handle OPTIONS preflight
  if (metadata.method === 'OPTIONS') {
    return handleOptions(event);
  }

  // Require authentication
  const authResult = requireAuth(event);
  if ('error' in authResult) {
    return errorResponse(401, authResult.error.code, authResult.error.message, event);
  }

  const { user } = authResult;

  try {
    // Parse path to determine route
    const path = metadata.path.replace(/\/$/, '');

    // /api/v1/roles routes
    if (path === '/api/v1/roles') {
      if (metadata.method === 'GET') {
        return await handleListRoles(event, user.tenantId, metadata);
      }
      if (metadata.method === 'POST') {
        return await handleCreateRole(event, user, metadata);
      }
    }

    // /api/v1/roles/{roleId}
    const rolesMatch = path.match(/^\/api\/v1\/roles\/([^/]+)$/);
    if (rolesMatch) {
      const roleId = rolesMatch[1];
      if (metadata.method === 'GET') {
        return await handleGetRole(event, roleId, user.tenantId, metadata);
      }
    }

    // /api/v1/user-permissions/{userId}
    const permissionsMatch = path.match(/^\/api\/v1\/user-permissions\/([^/]+)$/);
    if (permissionsMatch) {
      const targetUserId = permissionsMatch[1];
      if (metadata.method === 'GET') {
        return await handleGetUserPermissions(event, targetUserId, user.tenantId, metadata);
      }
      if (metadata.method === 'POST') {
        return await handleAssignPermissions(event, targetUserId, user, metadata);
      }
      if (metadata.method === 'PATCH') {
        return await handleUpdatePermissions(event, targetUserId, user, metadata);
      }
    }

    return errorResponse(404, 'NOT_FOUND', `Unknown route: ${metadata.method} ${path}`, event);
  } catch (error) {
    console.error('[ROLES-CONFIG] Handler error:', error);
    return errorResponse(500, ERROR_CODES.INTERNAL_ERROR, 'Internal server error', event);
  }
};

/**
 * Handle GET /api/v1/roles
 * 
 * Returns all available roles for the tenant.
 * Combines built-in roles with custom tenant-specific roles from PermissionProfile table.
 */
async function handleListRoles(
  event: APIGatewayProxyEvent,
  tenantId: string,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Try to get custom roles from PermissionProfile table
  let customRoles: Array<{
    profile_id: number;
    profile_name: string;
    profile_key: string;
    description: string;
    hierarchy_level: number;
    permissions: object | null;
    is_global: boolean;
  }> = [];

  try {
    const result = await query<{
      profile_id: number;
      profile_name: string;
      profile_key: string;
      description: string;
      hierarchy_level: number;
      permissions: object | null;
      is_global: boolean;
    }>(
      `SELECT "profile_id", "profile_name", "profile_key", "description", 
              "hierarchy_level", "permissions", "is_global"
       FROM "PermissionProfile"
       WHERE ("tenant_id" = $1 OR "is_global" = true)
         AND "is_active" = true
       ORDER BY "hierarchy_level" DESC, "display_order"`,
      [tenantId]
    );
    customRoles = result.rows;
  } catch (error) {
    // PermissionProfile table might not exist - use built-in roles only
    console.warn('[ROLES-CONFIG] Could not query PermissionProfile:', (error as Error).message);
  }

  // If we have custom roles, return them
  if (customRoles.length > 0) {
    const roles = customRoles.map(role => ({
      id: role.profile_id,
      roleKey: role.profile_key,
      roleName: role.profile_name,
      description: role.description,
      level: role.hierarchy_level,
      permissions: role.permissions || [],
      isGlobal: role.is_global,
    }));

    auditLog('ROLES_LIST_SUCCESS', { ...metadata, tenantId, result: 'SUCCESS' }, { count: roles.length });
    return successResponse(200, { roles }, event);
  }

  // Fall back to built-in roles
  auditLog('ROLES_LIST_SUCCESS', { ...metadata, tenantId, result: 'SUCCESS' }, { count: BUILT_IN_ROLES.length, source: 'built-in' });
  return successResponse(200, { roles: BUILT_IN_ROLES }, event);
}

/**
 * Handle GET /api/v1/roles/{roleId}
 * 
 * Returns a specific role by ID or key.
 */
async function handleGetRole(
  event: APIGatewayProxyEvent,
  roleId: string,
  tenantId: string,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Check if roleId is a built-in role key
  const builtInRole = BUILT_IN_ROLES.find(r => r.roleKey === roleId.toUpperCase());
  if (builtInRole) {
    return successResponse(200, builtInRole, event);
  }

  // Try to get from database
  try {
    const result = await query<{
      profile_id: number;
      profile_name: string;
      profile_key: string;
      description: string;
      hierarchy_level: number;
      permissions: object | null;
      is_global: boolean;
    }>(
      `SELECT "profile_id", "profile_name", "profile_key", "description", 
              "hierarchy_level", "permissions", "is_global"
       FROM "PermissionProfile"
       WHERE ("profile_id" = $1 OR "profile_key" = $2)
         AND ("tenant_id" = $3 OR "is_global" = true)
         AND "is_active" = true`,
      [parseInt(roleId, 10) || 0, roleId, tenantId]
    );

    if (result.rows.length > 0) {
      const role = result.rows[0];
      return successResponse(200, {
        id: role.profile_id,
        roleKey: role.profile_key,
        roleName: role.profile_name,
        description: role.description,
        level: role.hierarchy_level,
        permissions: role.permissions || [],
        isGlobal: role.is_global,
      }, event);
    }
  } catch (error) {
    console.warn('[ROLES-CONFIG] Could not query role:', (error as Error).message);
  }

  return errorResponse(404, 'ROLE_NOT_FOUND', `Role not found: ${roleId}`, event);
}

/**
 * Handle POST /api/v1/roles
 * 
 * Creates a new custom role (requires OWNER or ADMIN).
 * TODO: Full implementation in later phase.
 */
async function handleCreateRole(
  event: APIGatewayProxyEvent,
  user: { sub: string; tenantId: string; role: string },
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Check permission
  if (!['OWNER', 'ADMIN'].includes(user.role)) {
    return errorResponse(403, ERROR_CODES.USER_FORBIDDEN, 'Insufficient permissions to create roles', event);
  }

  // TODO: Implement role creation
  return errorResponse(501, 'NOT_IMPLEMENTED', 'Role creation not yet implemented', event);
}

/**
 * Handle GET /api/v1/user-permissions/{userId}
 * 
 * Returns the effective permissions for a user.
 */
async function handleGetUserPermissions(
  event: APIGatewayProxyEvent,
  targetUserId: string,
  tenantId: string,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Get user's membership role
  const membershipResult = await query<{
    role: string;
    userId: string;
  }>(
    `SELECT "role", "userId"
     FROM "Membership"
     WHERE "userId" = $1 AND "tenantId" = $2`,
    [targetUserId, tenantId]
  );

  if (membershipResult.rows.length === 0) {
    return errorResponse(404, ERROR_CODES.USER_NOT_FOUND, 'User not found in this tenant', event);
  }

  const membership = membershipResult.rows[0];
  const roleKey = membership.role;

  // Get base permissions from role
  const builtInRole = BUILT_IN_ROLES.find(r => r.roleKey === roleKey);
  let basePermissions = builtInRole?.permissions || [];

  // Try to get profile-based permissions
  try {
    const profileResult = await query<{
      profile_key: string;
      permissions: string[] | null;
    }>(
      `SELECT pp."profile_key", pp."permissions"
       FROM "UserProfileAssignment" upa
       INNER JOIN "PermissionProfile" pp ON upa."profile_id" = pp."profile_id"
       WHERE upa."user_id" = $1
         AND upa."tenant_id" = $2
         AND upa."is_active" = true
         AND (upa."expires_at" IS NULL OR upa."expires_at" > NOW())`,
      [targetUserId, tenantId]
    );

    if (profileResult.rows.length > 0) {
      // Merge permissions from all assigned profiles
      const allPermissions = new Set<string>(basePermissions);
      for (const row of profileResult.rows) {
        if (row.permissions) {
          row.permissions.forEach(p => allPermissions.add(p));
        }
      }
      basePermissions = Array.from(allPermissions);
    }
  } catch (error) {
    console.warn('[ROLES-CONFIG] Could not query user profiles:', (error as Error).message);
  }

  const response = {
    userId: targetUserId,
    tenantId,
    role: roleKey,
    roleName: builtInRole?.roleName || roleKey,
    permissions: basePermissions,
    // Helper function results
    canManageUsers: basePermissions.includes('*') || basePermissions.includes('users:write'),
    canManageSettings: basePermissions.includes('*') || basePermissions.includes('settings:write'),
    canManageBookings: basePermissions.includes('*') || basePermissions.includes('bookings:write'),
  };

  auditLog('USER_PERMISSIONS_GET', { ...metadata, userId: targetUserId, tenantId, result: 'SUCCESS' });

  return successResponse(200, response, event);
}

/**
 * Handle POST /api/v1/user-permissions/{userId}
 * 
 * Assigns a profile/permissions to a user (requires OWNER or ADMIN).
 * TODO: Full implementation in later phase.
 */
async function handleAssignPermissions(
  event: APIGatewayProxyEvent,
  targetUserId: string,
  user: { sub: string; tenantId: string; role: string },
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Check permission
  if (!['OWNER', 'ADMIN'].includes(user.role)) {
    return errorResponse(403, ERROR_CODES.USER_FORBIDDEN, 'Insufficient permissions to assign roles', event);
  }

  // TODO: Implement permission assignment
  return errorResponse(501, 'NOT_IMPLEMENTED', 'Permission assignment not yet implemented', event);
}

/**
 * Handle PATCH /api/v1/user-permissions/{userId}
 * 
 * Updates a user's permissions (requires OWNER or ADMIN).
 * TODO: Full implementation in later phase.
 */
async function handleUpdatePermissions(
  event: APIGatewayProxyEvent,
  targetUserId: string,
  user: { sub: string; tenantId: string; role: string },
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Check permission
  if (!['OWNER', 'ADMIN'].includes(user.role)) {
    return errorResponse(403, ERROR_CODES.USER_FORBIDDEN, 'Insufficient permissions to update roles', event);
  }

  // TODO: Implement permission update
  return errorResponse(501, 'NOT_IMPLEMENTED', 'Permission update not yet implemented', event);
}
