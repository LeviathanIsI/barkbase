/**
 * Permission Filter Middleware
 * Enforces field-level security at query time
 * Filters response fields based on user's effective permissions
 */

const { getPool } = require('./index');

/**
 * Filter response object based on user's permissions
 * @param {object} responseData - Response data object or array
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} objectType - Object type
 * @returns {object} - Filtered response data
 */
async function filterResponse(responseData, userId, tenantId, objectType) {
  if (!responseData) {
    return responseData;
  }

  // Get user's permissions for this object type
  const permissions = await getUserPermissionsForObjectType(userId, tenantId, objectType);

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
 * @returns {Array} - Array of { property_name, effective_access }
 */
async function getUserPermissionsForObjectType(userId, tenantId, objectType) {
  const pool = getPool();

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
 * @returns {object} - Map of fieldName → canWrite (boolean)
 */
async function checkWriteAccess(fieldNames, userId, tenantId, objectType) {
  const permissions = await getUserPermissionsForObjectType(userId, tenantId, objectType);

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
 * @returns {object} - { canProceed: boolean, deniedFields: string[] }
 */
async function validateUpdatePermissions(updateData, userId, tenantId, objectType) {
  const fieldNames = Object.keys(updateData);
  const writeAccessMap = await checkWriteAccess(fieldNames, userId, tenantId, objectType);

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
 * @returns {function} - Middleware function
 */
function createPermissionMiddleware(objectType) {
  return async (event, responseData) => {
    // Extract user and tenant from event
    const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
    const userId = claims['sub'] || null;

    if (!userId) {
      // If no user, return data as-is (or throw error based on your auth strategy)
      return responseData;
    }

    // Get tenant ID (you may have a helper for this)
    const tenantId = await getTenantIdFromEvent(event);

    if (!tenantId) {
      return responseData;
    }

    // Filter response
    return await filterResponse(responseData, userId, tenantId, objectType);
  };
}

/**
 * Helper to get tenant ID from event
 * (This is a placeholder - implement based on your actual logic)
 */
async function getTenantIdFromEvent(event) {
  const { getTenantIdFromEvent: getTenantId } = require('./index');
  return await getTenantId(event);
}

module.exports = {
  filterResponse,
  filterObject,
  checkWriteAccess,
  validateUpdatePermissions,
  createPermissionMiddleware,
};

