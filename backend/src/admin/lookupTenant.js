/**
 * =============================================================================
 * BarkBase Admin Portal - Tenant Lookup
 * =============================================================================
 *
 * This module provides tenant lookup functionality for the Admin Portal.
 * SECURITY: These endpoints are ONLY accessible by authenticated BarkBase
 * employees via the Admin Portal. They are NOT exposed to customers.
 *
 * =============================================================================
 */

/**
 * Lookup tenant by account code
 *
 * Used by BarkBase support staff to find tenant information when customers
 * provide their account code (displayed in their dashboard).
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} accountCode - Account code (e.g., "BK-7X3M9P")
 * @returns {Promise<object|null>} Tenant record with details or null
 */
async function lookupTenantByAccountCode(pool, accountCode) {
  // Normalize account code
  const normalizedCode = accountCode.toUpperCase().trim();

  // Validate format
  if (!/^BK-[A-Z0-9]{6}$/.test(normalizedCode)) {
    return null;
  }

  const result = await pool.query(
    `SELECT
      id as tenant_id,
      account_code,
      name,
      slug,
      plan,
      feature_flags,
      created_at,
      updated_at
     FROM "Tenant"
     WHERE account_code = $1`,
    [normalizedCode]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const tenant = result.rows[0];

  // Get additional tenant stats
  const statsResult = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM "User" WHERE tenant_id = $1) as user_count,
      (SELECT COUNT(*) FROM "Owner" WHERE tenant_id = $1) as owner_count,
      (SELECT COUNT(*) FROM "Pet" WHERE tenant_id = $1) as pet_count,
      (SELECT COUNT(*) FROM "Booking" WHERE tenant_id = $1) as booking_count`,
    [tenant.tenant_id]
  );

  return {
    ...tenant,
    stats: statsResult.rows[0],
  };
}

/**
 * Lookup tenant by tenant_id (UUID)
 *
 * Used internally when the UUID is already known.
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object|null>} Tenant record or null
 */
async function lookupTenantById(pool, tenantId) {
  const result = await pool.query(
    `SELECT
      id as tenant_id,
      account_code,
      name,
      slug,
      plan,
      feature_flags,
      created_at,
      updated_at
     FROM "Tenant"
     WHERE id = $1`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Lookup tenant by slug
 *
 * Used when looking up by URL slug.
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} slug - Tenant slug
 * @returns {Promise<object|null>} Tenant record or null
 */
async function lookupTenantBySlug(pool, slug) {
  const result = await pool.query(
    `SELECT
      id as tenant_id,
      account_code,
      name,
      slug,
      plan,
      feature_flags,
      created_at,
      updated_at
     FROM "Tenant"
     WHERE slug = $1`,
    [slug.toLowerCase().trim()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Search tenants by name (partial match)
 *
 * Used by support staff to find tenants when they don't have exact info.
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} searchTerm - Search term
 * @param {number} limit - Max results (default 20)
 * @returns {Promise<object[]>} Array of matching tenants
 */
async function searchTenants(pool, searchTerm, limit = 20) {
  const result = await pool.query(
    `SELECT
      id as tenant_id,
      account_code,
      name,
      slug,
      plan,
      created_at
     FROM "Tenant"
     WHERE name ILIKE $1 OR slug ILIKE $1 OR account_code ILIKE $1
     ORDER BY name
     LIMIT $2`,
    [`%${searchTerm}%`, limit]
  );

  return result.rows;
}

module.exports = {
  lookupTenantByAccountCode,
  lookupTenantById,
  lookupTenantBySlug,
  searchTenants,
};
