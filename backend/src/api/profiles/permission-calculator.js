/**
 * Permission Calculator
 * Calculates effective permissions with caching and profile inheritance
 */

const { getPool } = require('../../lib/db');

/**
 * Calculate effective permission for a user on a property
 * Uses caching for performance
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} propertyId - Property ID
 * @returns {string} - Effective access level ('read-write', 'read-only', 'hidden')
 */
async function calculate(userId, tenantId, propertyId) {
  const pool = getPool();

  // Check cache first
  const cacheResult = await pool.query(
    `SELECT "effective_access"
     FROM "EffectivePermissionCache"
     WHERE "user_id" = $1
       AND "tenant_id" = $2
       AND "property_id" = $3
       AND "is_valid" = true
       AND "expires_at" > NOW()
     LIMIT 1`,
    [userId, tenantId, propertyId]
  );

  if (cacheResult.rows.length > 0) {
    return cacheResult.rows[0].effective_access;
  }

  // Calculate permission using database function
  const calcResult = await pool.query(
    'SELECT calculate_effective_permission($1, $2, $3) AS effective_access',
    [userId, tenantId, propertyId]
  );

  const effectiveAccess = calcResult.rows[0].effective_access;

  // Get user's profiles for cache metadata
  const profilesResult = await pool.query(
    `SELECT array_agg("profile_id") AS profile_ids
     FROM "UserProfileAssignment"
     WHERE "user_id" = $1
       AND "tenant_id" = $2
       AND "is_active" = true
       AND ("expires_at" IS NULL OR "expires_at" > NOW())`,
    [userId, tenantId]
  );

  const sourceProfiles = profilesResult.rows[0].profile_ids || [];

  // Cache the result
  await pool.query(
    `INSERT INTO "EffectivePermissionCache" (
      "user_id",
      "tenant_id",
      "property_id",
      "effective_access",
      "calculated_at",
      "expires_at",
      "is_valid",
      "source_profiles"
    ) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '1 hour', true, $5)
    ON CONFLICT ("user_id", "tenant_id", "property_id")
    DO UPDATE SET
      "effective_access" = EXCLUDED."effective_access",
      "calculated_at" = NOW(),
      "expires_at" = NOW() + INTERVAL '1 hour',
      "is_valid" = true,
      "source_profiles" = EXCLUDED."source_profiles"`,
    [userId, tenantId, propertyId, effectiveAccess, JSON.stringify(sourceProfiles)]
  );

  return effectiveAccess;
}

/**
 * Calculate permissions for multiple properties (batch)
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string[]} propertyIds - Array of property IDs
 * @returns {object} - Map of propertyId → effectiveAccess
 */
async function calculateBatch(userId, tenantId, propertyIds) {
  const results = {};

  for (const propertyId of propertyIds) {
    results[propertyId] = await calculate(userId, tenantId, propertyId);
  }

  return results;
}

/**
 * Get all permissions for a user on an object type
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} objectType - Object type
 * @param {string} minAccess - Minimum access level ('read-only' or 'read-write')
 * @returns {Array} - Array of { propertyId, propertyName, effectiveAccess }
 */
async function getPermissionsForObjectType(userId, tenantId, objectType, minAccess = 'read-only') {
  const pool = getPool();

  const result = await pool.query(
    'SELECT * FROM get_accessible_properties($1, $2, $3, $4)',
    [userId, tenantId, objectType, minAccess]
  );

  return result.rows;
}

/**
 * Check if user has specific access level to a property
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} propertyId - Property ID
 * @param {string} requiredAccess - Required access level
 * @returns {boolean} - True if user has required access
 */
async function hasAccess(userId, tenantId, propertyId, requiredAccess) {
  const effectiveAccess = await calculate(userId, tenantId, propertyId);

  if (requiredAccess === 'read-only') {
    return effectiveAccess === 'read-only' || effectiveAccess === 'read-write';
  }

  if (requiredAccess === 'read-write') {
    return effectiveAccess === 'read-write';
  }

  return false;
}

/**
 * Invalidate cached permissions for a user
 * @param {string} userId - User ID
 * @param {number} tenantId - Tenant ID
 * @param {string} propertyId - Optional specific property ID
 */
async function invalidateCache(userId, tenantId, propertyId = null) {
  const pool = getPool();

  if (propertyId) {
    await pool.query(
      `UPDATE "EffectivePermissionCache"
       SET "is_valid" = false
       WHERE "user_id" = $1
         AND "tenant_id" = $2
         AND "property_id" = $3`,
      [userId, tenantId, propertyId]
    );
  } else {
    await pool.query(
      `UPDATE "EffectivePermissionCache"
       SET "is_valid" = false
       WHERE "user_id" = $1 AND "tenant_id" = $2`,
      [userId, tenantId]
    );
  }
}

module.exports = {
  calculate,
  calculateBatch,
  getPermissionsForObjectType,
  hasAccess,
  invalidateCache,
};

