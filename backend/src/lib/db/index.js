/**
 * =============================================================================
 * BarkBase Database Access - Single Entrypoint
 * =============================================================================
 *
 * This module is the SINGLE entrypoint for database access across:
 * - Backend Express server (local development)
 * - AWS Lambda functions (production)
 *
 * It delegates to the db-layer module which handles:
 * - Connection pooling via pg (node-postgres)
 * - Secrets Manager credential fetching (in Lambda)
 * - Direct env var configuration (local dev)
 *
 * RESOLUTION STRATEGY:
 * --------------------
 * 1. In Lambda: db-layer is mounted at /opt/nodejs/db
 * 2. In local dev: Falls back to relative path to aws/layers/db-layer/nodejs/db
 *
 * USAGE:
 * ------
 * const { getPool } = require('../../lib/db');
 * const pool = getPool();
 * const result = await pool.query('SELECT * FROM "Pet" WHERE "tenantId" = $1', [tenantId]);
 *
 * =============================================================================
 */

let dbLayer;

// Try to load db-layer from Lambda runtime path first
try {
  // In Lambda, layers are mounted at /opt/nodejs/
  // eslint-disable-next-line import/no-unresolved, global-require
  dbLayer = require('/opt/nodejs/db');
} catch (e) {
  // Not in Lambda - fall back to local development path
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    dbLayer = require('../../../../aws/layers/db-layer/nodejs/db');
  } catch (e2) {
    console.error('[DB] Failed to load db-layer from both Lambda and local paths');
    console.error('[DB] Lambda path error:', e.message);
    console.error('[DB] Local path error:', e2.message);
    throw new Error('Could not load db-layer module');
  }
}

const { getPool } = dbLayer;

// Re-export getPool as the primary interface
// Other exports (getTenantIdFromEvent, getJWTValidator) are deprecated
// and should be handled by middleware instead
module.exports = {
  getPool,
};
