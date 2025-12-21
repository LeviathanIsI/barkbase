/**
 * =============================================================================
 * BarkBase Tenant Service
 * =============================================================================
 *
 * Service layer for tenant management with the new ID system.
 *
 * Key features:
 * - UUID tenant_id for internal use
 * - account_code (BK-XXXXXX) for customer-facing identification
 * - Automatic TenantSettings creation
 *
 * =============================================================================
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Character set for account code generation
 * Excludes confusing characters: 0/O, 1/I/L
 */
const ACCOUNT_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ACCOUNT_CODE_LENGTH = 6;
const ACCOUNT_CODE_PREFIX = 'BK-';
const MAX_CODE_GENERATION_ATTEMPTS = 10;

/**
 * Generate a random account code (not guaranteed unique)
 * @returns {string} Account code in format BK-XXXXXX
 */
function generateAccountCode() {
  let code = ACCOUNT_CODE_PREFIX;
  for (let i = 0; i < ACCOUNT_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * ACCOUNT_CODE_CHARSET.length);
    code += ACCOUNT_CODE_CHARSET[randomIndex];
  }
  return code;
}

/**
 * Generate a unique account code, checking against existing codes in database
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @returns {Promise<string>} Unique account code
 * @throws {Error} If unable to generate unique code after max attempts
 */
async function generateUniqueAccountCode(pool) {
  for (let attempt = 1; attempt <= MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
    const code = generateAccountCode();

    const result = await pool.query(
      'SELECT 1 FROM "Tenant" WHERE account_code = $1 LIMIT 1',
      [code]
    );

    if (result.rows.length === 0) {
      console.log(`[TenantService] Generated unique account code on attempt ${attempt}: ${code}`);
      return code;
    }

    console.log(`[TenantService] Account code collision on attempt ${attempt}: ${code}`);
  }

  throw new Error(
    `Failed to generate unique account code after ${MAX_CODE_GENERATION_ATTEMPTS} attempts.`
  );
}

/**
 * Create a new tenant with all required initialization
 *
 * This function:
 * 1. Generates UUID for tenant_id
 * 2. Generates unique account_code
 * 3. Creates tenant record
 * 4. Creates TenantSettings with defaults
 * 5. Creates default roles
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {object} tenantData - Tenant creation data
 * @param {string} tenantData.name - Business name
 * @param {string} [tenantData.slug] - URL slug (auto-generated if not provided)
 * @param {string} [tenantData.plan='FREE'] - Subscription plan
 * @param {object} [tenantData.featureFlags={}] - Feature flags
 * @returns {Promise<object>} Created tenant with account_code
 */
async function createTenant(pool, tenantData) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Generate IDs
    const tenantId = uuidv4();
    const accountCode = await generateUniqueAccountCode(pool);

    // Generate slug if not provided
    const slug = tenantData.slug ||
      tenantData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);

    // Create tenant record
    const tenantResult = await client.query(
      `INSERT INTO "Tenant" (id, account_code, name, slug, plan, feature_flags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        accountCode,
        tenantData.name,
        slug,
        tenantData.plan || 'FREE',
        JSON.stringify(tenantData.featureFlags || {}),
      ]
    );

    const tenant = tenantResult.rows[0];

    // Create TenantSettings with defaults
    await client.query(
      `INSERT INTO "TenantSettings" (tenant_id, business_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [tenantId, tenantData.name]
    );

    // Create default roles
    const defaultRoles = [
      { name: 'Owner', description: 'Full access to all features', isSystem: true },
      { name: 'Manager', description: 'Manage bookings, staff, and operations', isSystem: true },
      { name: 'Staff', description: 'Basic access to daily operations', isSystem: true },
    ];

    for (const role of defaultRoles) {
      const roleRecordId = await getNextRecordIdFromClient(client, tenantId, 'Role');
      await client.query(
        `INSERT INTO "Role" (id, record_id, tenant_id, name, description, is_system, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
        [roleRecordId, tenantId, role.name, role.description, role.isSystem]
      );
    }

    await client.query('COMMIT');

    console.log(`[TenantService] Created tenant: ${tenant.name} (${accountCode})`);

    return {
      tenantId: tenant.id,
      accountCode: tenant.account_code,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      createdAt: tenant.created_at,
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[TenantService] Failed to create tenant:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper to get next record_id using a transaction client
 *
 * @param {import('pg').PoolClient} client - Transaction client
 * @param {string} tenantId - Tenant UUID
 * @param {string} tableName - Table name
 * @returns {Promise<number>} Next record_id
 */
async function getNextRecordIdFromClient(client, tenantId, tableName) {
  const objectTypeCodes = {
    Role: 52,
    User: 50,
    // Add other tables as needed
  };

  const code = objectTypeCodes[tableName];
  if (!code) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  const result = await client.query(
    'SELECT next_record_id($1, $2) as record_id',
    [tenantId, code]
  );

  return result.rows[0].record_id;
}

/**
 * Get tenant by account code
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} accountCode - Account code (e.g., "BK-7X3M9P")
 * @returns {Promise<object|null>} Tenant or null
 */
async function getTenantByAccountCode(pool, accountCode) {
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
    [accountCode.toUpperCase()]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get tenant by ID
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<object|null>} Tenant or null
 */
async function getTenantById(pool, tenantId) {
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

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update tenant information
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} tenantId - Tenant UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object|null>} Updated tenant or null
 */
async function updateTenant(pool, tenantId, updates) {
  const allowedFields = ['name', 'slug', 'plan', 'feature_flags'];
  const setClause = [];
  const values = [tenantId];
  let paramIndex = 2;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${paramIndex}`);
      values.push(key === 'feature_flags' ? JSON.stringify(value) : value);
      paramIndex++;
    }
  }

  if (setClause.length === 0) {
    return getTenantById(pool, tenantId);
  }

  setClause.push('updated_at = NOW()');

  const result = await pool.query(
    `UPDATE "Tenant"
     SET ${setClause.join(', ')}
     WHERE id = $1
     RETURNING
       id as tenant_id,
       account_code,
       name,
       slug,
       plan,
       feature_flags,
       created_at,
       updated_at`,
    values
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

module.exports = {
  createTenant,
  getTenantByAccountCode,
  getTenantById,
  updateTenant,
  generateUniqueAccountCode,
  // Export for testing
  generateAccountCode,
};
