/**
 * Permission Filter Middleware
 * Enforces field-level security at query time
 * Filters response fields based on user's effective permissions
 *
 * NOTE: This module requires the db-layer for database access.
 * Make sure your Lambda function includes both auth-layer and db-layer.
 */

/**
 * Filter response object based on user's permissions
 * @param {object} responseData - Response data object or array
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} objectType - Object type
 * @param {object} pool - Database pool from db-layer
 * @returns {object} - Filtered response data
 */
async function filterResponse(responseData, userId, tenantId, objectType, pool) {
  if (!responseData) {
    return responseData;
  }

  // Get user's permissions for this object type
  const permissions = await getUserPermissionsForObjectType(userId, tenantId, objectType, pool);

  // Build permission map: propertyName → accessLevel
  const permissionMap = new Map();
  for (const perm of permissions) {
    permissionMap.set(perm.property_name, perm.effective_access);
  }

  // Handle array of objects
  if (Array.isArray(responseData)) {
    return responseData.map(item => filterObject(item, permissionMap));
  }

  // Handle single object
  return filterObject(responseData, permissionMap);
}

/**
 * Filter a single object based on permission map
 * @param {object} obj - Object to filter
 * @param {Map} permissionMap - Map of propertyName → accessLevel
 * @returns {object} - Filtered object
 */
function filterObject(obj, permissionMap) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const filtered = {};

  for (const key in obj) {
    const accessLevel = permissionMap.get(key);

    // If no explicit permission, default to read-only (show the field)
    if (!accessLevel || accessLevel === 'read-only' || accessLevel === 'read-write') {
      filtered[key] = obj[key];
    }
    // If 'hidden', don't include the field
    // (accessLevel === 'hidden' means skip)
  }

  return filtered;
}

/**
 * Get user's permissions for an object type
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} objectType - Object type
 * @param {object} pool - Database pool from db-layer
 * @returns {Array} - Array of { property_name, effective_access }
 */
async function getUserPermissionsForObjectType(userId, tenantId, objectType, pool) {
  const result = await pool.query(
    'SELECT * FROM get_accessible_properties($1, $2, $3, $4)',
    [userId, tenantId, objectType, 'read-only']
  );

  return result.rows;
}

/**
 * Check if user can write to specific fields
 * @param {string[]} fieldNames - Field names to check
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} objectType - Object type
 * @param {object} pool - Database pool from db-layer
 * @returns {object} - Map of fieldName → canWrite (boolean)
 */
async function checkWriteAccess(fieldNames, userId, tenantId, objectType, pool) {
  const permissions = await getUserPermissionsForObjectType(userId, tenantId, objectType, pool);

  const permissionMap = new Map();
  for (const perm of permissions) {
    permissionMap.set(perm.property_name, perm.effective_access);
  }

  const writeAccessMap = {};
  for (const fieldName of fieldNames) {
    const accessLevel = permissionMap.get(fieldName);
    writeAccessMap[fieldName] = accessLevel === 'read-write';
  }

  return writeAccessMap;
}

/**
 * Validate if user can modify specific fields
 * @param {object} updateData - Object with fields to update
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} objectType - Object type
 * @param {object} pool - Database pool from db-layer
 * @returns {object} - { canProceed: boolean, deniedFields: string[] }
 */
async function validateUpdatePermissions(updateData, userId, tenantId, objectType, pool) {
  const fieldNames = Object.keys(updateData);
  const writeAccessMap = await checkWriteAccess(fieldNames, userId, tenantId, objectType, pool);

  const deniedFields = [];
  for (const fieldName of fieldNames) {
    if (!writeAccessMap[fieldName]) {
      deniedFields.push(fieldName);
    }
  }

  return {
    canProceed: deniedFields.length === 0,
    deniedFields,
  };
}

/**
 * Create middleware function for Express/Lambda
 * @param {string} objectType - Object type
 * @param {object} pool - Database pool from db-layer
 * @returns {function} - Middleware function
 */
function createPermissionMiddleware(objectType, pool) {
  return async (event, responseData) => {
    // Extract user and tenant from event
    const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
    const userId = claims['sub'] || null;

    if (!userId) {
      // If no user, return data as-is (or throw error based on your auth strategy)
      return responseData;
    }

    // Get tenant ID from claims
    const tenantId = claims['custom:tenantId'] || claims['tenantId'] || null;

    if (!tenantId) {
      return responseData;
    }

    // Filter response
    return await filterResponse(responseData, userId, tenantId, objectType, pool);
  };
}

// Export a class-based interface for backward compatibility
class PermissionFilter {
  constructor(pool) {
    this.pool = pool;
  }

  async filterResponse(responseData, userId, tenantId, objectType) {
    return filterResponse(responseData, userId, tenantId, objectType, this.pool);
  }

  async checkWriteAccess(fieldNames, userId, tenantId, objectType) {
    return checkWriteAccess(fieldNames, userId, tenantId, objectType, this.pool);
  }

  async validateUpdatePermissions(updateData, userId, tenantId, objectType) {
    return validateUpdatePermissions(updateData, userId, tenantId, objectType, this.pool);
  }

  createMiddleware(objectType) {
    return createPermissionMiddleware(objectType, this.pool);
  }
}

module.exports = {
  PermissionFilter,
  filterResponse,
  filterObject,
  checkWriteAccess,
  validateUpdatePermissions,
  createPermissionMiddleware,
};
