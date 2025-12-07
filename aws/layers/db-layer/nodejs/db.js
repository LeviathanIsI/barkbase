/**
 * =============================================================================
 * BarkBase Database Layer
 * =============================================================================
 * 
 * Provides PostgreSQL connection pooling with AWS Secrets Manager integration.
 * This module is designed to work in both Lambda and local development.
 * 
 * Features:
 * - Connection pooling with pg
 * - Automatic credential fetching from Secrets Manager
 * - Connection reuse across Lambda invocations
 * - Graceful error handling
 * 
 * =============================================================================
 */

const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const fs = require('fs');
const path = require('path');

// Load RDS CA certificate bundle for secure SSL connections
let rdsCaCert = null;
try {
  const certPath = path.join(__dirname, 'rds-ca-us-east-2-bundle.pem');
  if (fs.existsSync(certPath)) {
    rdsCaCert = fs.readFileSync(certPath).toString();
    console.log('[DB] Loaded RDS CA certificate bundle');
  }
} catch (err) {
  console.warn('[DB] Could not load RDS CA certificate bundle:', err.message);
}

// Connection pool (reused across Lambda invocations)
let pool = null;
let cachedCredentials = null;
let credentialsFetchTime = null;
const CREDENTIALS_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse DATABASE_URL into connection components
 * Format: postgresql://user:password@host:port/database
 */
function parseDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      dbname: parsed.pathname.slice(1), // Remove leading slash
    };
  } catch (error) {
    console.error('[DB] Failed to parse DATABASE_URL:', error.message);
    throw new Error('Invalid DATABASE_URL format');
  }
}

/**
 * Get database credentials from environment variables or Secrets Manager
 */
async function getDbCredentials() {
  const now = Date.now();

  // Return cached credentials if still valid
  if (cachedCredentials && credentialsFetchTime && (now - credentialsFetchTime) < CREDENTIALS_TTL_MS) {
    return cachedCredentials;
  }

  // Priority 1: DATABASE_URL (preferred - set by CDK from .env files)
  if (process.env.DATABASE_URL) {
    cachedCredentials = parseDatabaseUrl(process.env.DATABASE_URL);
    credentialsFetchTime = now;
    console.log('[DB] Using DATABASE_URL for connection');
    return cachedCredentials;
  }

  // Priority 2: Individual environment variables
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    cachedCredentials = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dbname: process.env.DB_NAME || 'barkbase',
    };
    credentialsFetchTime = now;
    console.log('[DB] Using individual DB_* env vars for connection');
    return cachedCredentials;
  }

  // Priority 3: Secrets Manager (legacy)
  const secretArn = process.env.DB_SECRET_ARN;
  if (secretArn) {
    try {
      const client = new SecretsManagerClient({
        region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
      });

      const command = new GetSecretValueCommand({ SecretId: secretArn });
      const response = await client.send(command);

      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      const secret = JSON.parse(response.SecretString);

      cachedCredentials = {
        host: secret.host,
        port: parseInt(secret.port || '5432', 10),
        username: secret.username,
        password: secret.password,
        dbname: secret.dbname || process.env.DB_NAME || 'barkbase',
      };
      credentialsFetchTime = now;

      console.log('[DB] Successfully fetched credentials from Secrets Manager');
      return cachedCredentials;
    } catch (error) {
      console.error('[DB] Failed to fetch credentials from Secrets Manager:', error.message);
      throw error;
    }
  }

  throw new Error('No database configuration found. Set DATABASE_URL, DB_* env vars, or DB_SECRET_ARN');
}

/**
 * Initialize and return the connection pool
 */
async function initPool() {
  if (pool) {
    return pool;
  }

  const credentials = await getDbCredentials();

  pool = new Pool({
    host: credentials.host,
    port: credentials.port,
    user: credentials.username,
    password: credentials.password,
    database: credentials.dbname,
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'false' ? false : {
      rejectUnauthorized: true,
      // Use RDS CA certificate bundle for proper certificate validation
      // Falls back to system CA if bundle not available (less secure but functional)
      ...(rdsCaCert ? { ca: rdsCaCert } : {}),
    },
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err);
  });

  // Test the connection
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB] Connection pool initialized successfully');
  } catch (error) {
    console.error('[DB] Failed to initialize connection pool:', error.message);
    pool = null;
    throw error;
  }

  return pool;
}

/**
 * Get the connection pool (async initialization)
 * @returns {Promise<Pool>} PostgreSQL connection pool
 */
async function getPoolAsync() {
  return initPool();
}

/**
 * Get the connection pool (synchronous - returns existing pool or throws)
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() first or use getPoolAsync()');
  }
  return pool;
}

/**
 * Execute a query with automatic pool initialization
 * @param {string} text - SQL query text
 * @param {any[]} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  const p = await getPoolAsync();
  const start = Date.now();
  
  try {
    const result = await p.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('[DB] Query error:', error.message);
    console.error('[DB] Query:', text.substring(0, 200));
    throw error;
  }
}

/**
 * Get a client from the pool for transaction support
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  const p = await getPoolAsync();
  return p.connect();
}

/**
 * Close the connection pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    cachedCredentials = null;
    credentialsFetchTime = null;
    console.log('[DB] Connection pool closed');
  }
}

/**
 * Soft delete a record by archiving it to DeletedRecord table then removing from original table.
 *
 * NEW SCHEMA PATTERN:
 * - No deleted_at columns on tables
 * - Deleted records are moved to DeletedRecord archive table
 * - Original record is then hard-deleted
 *
 * @param {string} tableName - The table name (e.g., "Booking", "Task")
 * @param {string} id - Record ID (UUID)
 * @param {string} tenantId - Tenant ID for isolation
 * @param {string|null} deletedBy - User ID who performed deletion (optional)
 * @returns {Promise<object|null>} - The archived record or null if not found
 */
async function softDelete(tableName, id, tenantId, deletedBy = null) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Fetch the record to archive
    const fetchResult = await client.query(
      `SELECT * FROM "${tableName}" WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (fetchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const record = fetchResult.rows[0];

    // Archive to DeletedRecord table
    await client.query(
      `INSERT INTO "DeletedRecord" (tenant_id, original_table, original_id, data, deleted_at, deleted_by)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [tenantId, tableName, id, JSON.stringify(record), deletedBy]
    );

    // Hard delete the original record
    await client.query(
      `DELETE FROM "${tableName}" WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    await client.query('COMMIT');

    console.log(`[DB] Soft deleted ${tableName} record ${id} for tenant ${tenantId}`);
    return record;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[DB] Soft delete failed for ${tableName}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Batch soft delete multiple records by archiving them to DeletedRecord table.
 *
 * @param {string} tableName - The table name (e.g., "Booking", "Task")
 * @param {string[]} ids - Array of record IDs (UUIDs)
 * @param {string} tenantId - Tenant ID for isolation
 * @param {string|null} deletedBy - User ID who performed deletion (optional)
 * @returns {Promise<number>} - Number of records deleted
 */
async function softDeleteBatch(tableName, ids, tenantId, deletedBy = null) {
  if (!ids || ids.length === 0) return 0;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Fetch all records to archive
    const fetchResult = await client.query(
      `SELECT * FROM "${tableName}" WHERE id = ANY($1) AND tenant_id = $2`,
      [ids, tenantId]
    );

    if (fetchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return 0;
    }

    // Archive each record to DeletedRecord table
    for (const record of fetchResult.rows) {
      await client.query(
        `INSERT INTO "DeletedRecord" (tenant_id, original_table, original_id, data, deleted_at, deleted_by)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [tenantId, tableName, record.id, JSON.stringify(record), deletedBy]
      );
    }

    // Hard delete the original records
    const deleteResult = await client.query(
      `DELETE FROM "${tableName}" WHERE id = ANY($1) AND tenant_id = $2`,
      [ids, tenantId]
    );

    await client.query('COMMIT');

    console.log(`[DB] Batch soft deleted ${deleteResult.rowCount} ${tableName} records for tenant ${tenantId}`);
    return deleteResult.rowCount;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[DB] Batch soft delete failed for ${tableName}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getPool,
  getPoolAsync,
  initPool,
  query,
  getClient,
  closePool,
  softDelete,
  softDeleteBatch,
};

