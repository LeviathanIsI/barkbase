/**
 * =============================================================================
 * BarkBase Record ID Utilities
 * =============================================================================
 *
 * Utilities for working with the new per-tenant sequential record IDs.
 *
 * Key concepts:
 * - Each record has a BIGINT record_id that is unique within a tenant
 * - Sequence is tracked per (tenant_id, object_type_code) in TenantSequence table
 * - Records are identified by composite key: (tenant_id, record_id)
 *
 * =============================================================================
 */

const { getByTable, getByCode, getByTypeId } = require('../constants/objectTypes');

/**
 * Get the next record_id for a given tenant and table
 *
 * This function atomically increments the sequence in TenantSequence table
 * using INSERT ON CONFLICT for thread-safe operation.
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} tenantId - Tenant UUID
 * @param {string} tableName - Database table name (e.g., "Pet", "Owner")
 * @returns {Promise<number>} Next record_id (BIGINT)
 * @throws {Error} If table name is not registered in objectTypes
 */
async function getNextRecordId(pool, tenantId, tableName) {
  const objectType = getByTable(tableName);
  if (!objectType) {
    throw new Error(
      `Unknown table "${tableName}" - not registered in objectTypes. ` +
      'Ensure the table is defined in backend/src/constants/objectTypes.js'
    );
  }

  const result = await pool.query(
    'SELECT next_record_id($1, $2) as record_id',
    [tenantId, objectType.code]
  );

  const recordId = result.rows[0].record_id;
  console.log(`[RecordId] Generated record_id ${recordId} for ${tableName} in tenant ${tenantId}`);

  return recordId;
}

/**
 * Get the next record_id using object type code directly
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} tenantId - Tenant UUID
 * @param {number} objectTypeCode - Object type code from objectTypes.js
 * @returns {Promise<number>} Next record_id (BIGINT)
 * @throws {Error} If object type code is not valid
 */
async function getNextRecordIdByCode(pool, tenantId, objectTypeCode) {
  const objectType = getByCode(objectTypeCode);
  if (!objectType) {
    throw new Error(`Unknown object type code: ${objectTypeCode}`);
  }

  const result = await pool.query(
    'SELECT next_record_id($1, $2) as record_id',
    [tenantId, objectTypeCode]
  );

  return result.rows[0].record_id;
}

/**
 * Get current sequence value without incrementing
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} tenantId - Tenant UUID
 * @param {string} tableName - Database table name
 * @returns {Promise<number|null>} Current last_record_id or null if no records exist
 */
async function getCurrentSequenceValue(pool, tenantId, tableName) {
  const objectType = getByTable(tableName);
  if (!objectType) {
    throw new Error(`Unknown table "${tableName}"`);
  }

  const result = await pool.query(
    `SELECT last_record_id FROM "TenantSequence"
     WHERE tenant_id = $1 AND object_type_code = $2`,
    [tenantId, objectType.code]
  );

  return result.rows.length > 0 ? result.rows[0].last_record_id : null;
}

/**
 * Parse a enterprise record reference
 *
 * Format: {account_code}/record/{type_id}/{record_id}
 * Example: BK-7X3M9P/record/0-1/1234
 *
 * @param {string} reference - Record reference string
 * @returns {object|null} { accountCode, typeId, recordId } or null if invalid
 */
function parseRecordReference(reference) {
  if (!reference || typeof reference !== 'string') {
    return null;
  }

  // Pattern: BK-XXXXXX/record/0-NN/NNNN
  const pattern = /^(BK-[A-Z0-9]{6})\/record\/(0-\d+)\/(\d+)$/i;
  const match = reference.match(pattern);

  if (!match) {
    return null;
  }

  return {
    accountCode: match[1].toUpperCase(),
    typeId: match[2],
    recordId: parseInt(match[3], 10),
  };
}

/**
 * Build a enterprise record reference
 *
 * @param {string} accountCode - Account code (e.g., "BK-7X3M9P")
 * @param {string} typeId - Type ID (e.g., "0-1")
 * @param {number} recordId - Record ID
 * @returns {string} Record reference
 */
function buildRecordReference(accountCode, typeId, recordId) {
  return `${accountCode}/record/${typeId}/${recordId}`;
}

/**
 * Extract record parameters from API path
 *
 * @param {string} path - API path (e.g., "/api/v1/owners/BK-7X3M9P/record/0-1/1234")
 * @returns {object|null} { accountCode, typeId, recordId } or null if not matching
 */
function extractRecordParamsFromPath(path) {
  if (!path || typeof path !== 'string') {
    return null;
  }

  // Pattern: .../BK-XXXXXX/record/0-NN/NNNN...
  const pattern = /(BK-[A-Z0-9]{6})\/record\/(0-\d+)\/(\d+)/i;
  const match = path.match(pattern);

  if (!match) {
    return null;
  }

  return {
    accountCode: match[1].toUpperCase(),
    typeId: match[2],
    recordId: parseInt(match[3], 10),
  };
}

/**
 * Validate that a typeId matches expected table
 *
 * @param {string} typeId - Type ID from URL (e.g., "0-1")
 * @param {string} expectedTable - Expected table name (e.g., "Owner")
 * @returns {boolean} True if typeId matches table
 */
function validateTypeIdForTable(typeId, expectedTable) {
  const objectType = getByTypeId(typeId);
  if (!objectType) {
    return false;
  }
  return objectType.table === expectedTable;
}

/**
 * Get tenant by account code
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} accountCode - Account code (e.g., "BK-7X3M9P")
 * @returns {Promise<object|null>} Tenant record or null
 */
async function getTenantByAccountCode(pool, accountCode) {
  const result = await pool.query(
    `SELECT id as tenant_id, account_code, name, slug, plan, feature_flags, created_at
     FROM "Tenant"
     WHERE account_code = $1`,
    [accountCode.toUpperCase()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Resolve tenant_id from account_code
 *
 * Convenience function that returns just the tenant_id
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {string} accountCode - Account code (e.g., "BK-7X3M9P")
 * @returns {Promise<string|null>} tenant_id UUID or null
 */
async function resolveTenantId(pool, accountCode) {
  const tenant = await getTenantByAccountCode(pool, accountCode);
  return tenant ? tenant.tenant_id : null;
}

module.exports = {
  getNextRecordId,
  getNextRecordIdByCode,
  getCurrentSequenceValue,
  parseRecordReference,
  buildRecordReference,
  extractRecordParamsFromPath,
  validateTypeIdForTable,
  getTenantByAccountCode,
  resolveTenantId,
};
