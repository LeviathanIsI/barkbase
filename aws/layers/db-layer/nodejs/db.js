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

    // Fetch the record to archive (using record_id as primary key)
    const fetchResult = await client.query(
      `SELECT * FROM "${tableName}" WHERE record_id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (fetchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const record = fetchResult.rows[0];

    // Get next record_id for DeletedRecord table
    const deletedRecordId = await getNextRecordId(tenantId, 'DeletedRecord');

    // Archive to DeletedRecord table
    await client.query(
      `INSERT INTO "DeletedRecord" (record_id, tenant_id, original_table, original_id, data, deleted_at, deleted_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [deletedRecordId, tenantId, tableName, id, JSON.stringify(record), deletedBy]
    );

    // Hard delete the original record
    await client.query(
      `DELETE FROM "${tableName}" WHERE record_id = $1 AND tenant_id = $2`,
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

    // Fetch all records to archive (using record_id)
    const fetchResult = await client.query(
      `SELECT * FROM "${tableName}" WHERE record_id = ANY($1) AND tenant_id = $2`,
      [ids, tenantId]
    );

    if (fetchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return 0;
    }

    // Archive each record to DeletedRecord table
    for (const record of fetchResult.rows) {
      const deletedRecordId = await getNextRecordId(tenantId, 'DeletedRecord');
      await client.query(
        `INSERT INTO "DeletedRecord" (record_id, tenant_id, original_table, original_id, data, deleted_at, deleted_by)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [deletedRecordId, tenantId, tableName, record.record_id, JSON.stringify(record), deletedBy]
      );
    }

    // Hard delete the original records
    const deleteResult = await client.query(
      `DELETE FROM "${tableName}" WHERE record_id = ANY($1) AND tenant_id = $2`,
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

// ============================================================================
// New ID System Functions
// ============================================================================

/**
 * Object type codes for the new record_id system
 * These match the codes in backend/src/constants/objectTypes.js
 */
const OBJECT_TYPE_CODES = {
  // Core CRM Objects (1-19)
  Owner: 1,
  Pet: 2,
  Booking: 3,
  Payment: 4,
  Invoice: 5,
  InvoiceLine: 6,
  Task: 7,
  Note: 8,
  Vaccination: 9,
  Incident: 10,
  Veterinarian: 11,
  // Workflow Objects (20-29)
  Workflow: 20,
  WorkflowStep: 21,
  WorkflowExecution: 22,
  WorkflowExecutionLog: 23,
  WorkflowFolder: 24,
  WorkflowRevision: 25,
  WorkflowTemplate: 26,
  Segment: 27,
  SegmentMember: 28,
  SegmentActivity: 29,
  // Service Objects (30-39)
  Service: 30,
  Package: 31,
  // Facility Objects (40-49)
  Run: 40,
  Kennel: 41,
  RunTemplate: 42,
  RunAssignment: 43,
  // User/Staff Objects (50-59)
  User: 50,
  Staff: 51,
  Role: 52,
  UserRole: 53,
  UserSession: 54,
  TimeEntry: 55,
  TimePunch: 56,
  Shift: 57,
  ShiftTemplate: 58,
  // Communication Objects (60-69)
  Conversation: 60,
  Message: 61,
  Notification: 62,
  EmailTemplate: 63,
  Communication: 64,
  // Configuration Objects (70-79)
  CustomProperty: 70,
  ObjectSettings: 71,
  ObjectAssociation: 72,
  ObjectPipeline: 73,
  PipelineStage: 74,
  ObjectStatus: 75,
  SavedView: 76,
  AssociationLabel: 77,
  ObjectIndexSettings: 78,
  ObjectRecordLayout: 79,
  // Property System Objects (80-89)
  Property: 80,
  PropertyGroup: 81,
  PropertyLogicRule: 82,
  PropertyValue: 83,
  PropertyTemplate: 84,
  PropertyHistory: 85,
  // System Objects (90-99)
  AuditLog: 90,
  DeletedRecord: 91,
  Import: 92,
  Activity: 93,
  SegmentSnapshot: 94,
  ObjectPreviewLayout: 95,
  // Booking Extensions (100-109)
  RecurringBooking: 100,
  RecurringBookingInstance: 101,
};

/**
 * Get the object type code for a table name
 * @param {string} tableName - Database table name
 * @returns {number|null} Object type code or null if not found
 */
function getObjectTypeCode(tableName) {
  return OBJECT_TYPE_CODES[tableName] || null;
}

/**
 * Get the next record_id for a given tenant and table
 * Uses the database function next_record_id() for atomic operation
 *
 * @param {string} tenantId - Tenant UUID
 * @param {string} tableName - Database table name (e.g., "Pet", "Owner")
 * @returns {Promise<number>} Next record_id (BIGINT)
 * @throws {Error} If table name is not registered
 */
async function getNextRecordId(tenantId, tableName) {
  const objectTypeCode = getObjectTypeCode(tableName);
  if (!objectTypeCode) {
    throw new Error(
      `Unknown table "${tableName}" - not registered in OBJECT_TYPE_CODES. ` +
      'Ensure the table is defined in the db-layer.'
    );
  }

  const result = await query(
    'SELECT next_record_id($1, $2) as record_id',
    [tenantId, objectTypeCode]
  );

  const recordId = result.rows[0].record_id;
  console.log(`[DB] Generated record_id ${recordId} for ${tableName} in tenant ${tenantId}`);

  return recordId;
}

/**
 * Get tenant by account code
 *
 * @param {string} accountCode - Account code (e.g., "BK-7X3M9P")
 * @returns {Promise<object|null>} Tenant record or null
 */
async function getTenantByAccountCode(accountCode) {
  const result = await query(
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
 * @param {string} accountCode - Account code (e.g., "BK-7X3M9P")
 * @returns {Promise<string|null>} tenant_id UUID or null
 */
async function resolveTenantId(accountCode) {
  const tenant = await getTenantByAccountCode(accountCode);
  return tenant ? tenant.tenant_id : null;
}

/**
 * Generate a unique account code for a new tenant
 *
 * @returns {Promise<string>} Unique account code (e.g., "BK-7X3M9P")
 * @throws {Error} If unable to generate unique code after max attempts
 */
async function generateUniqueAccountCode() {
  const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const MAX_ATTEMPTS = 10;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Generate random 6-character code
    let code = 'BK-';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * CHARSET.length);
      code += CHARSET[randomIndex];
    }

    // Check if code already exists
    const result = await query(
      'SELECT 1 FROM "Tenant" WHERE account_code = $1 LIMIT 1',
      [code]
    );

    if (result.rows.length === 0) {
      console.log(`[DB] Generated unique account code on attempt ${attempt}: ${code}`);
      return code;
    }

    console.log(`[DB] Account code collision on attempt ${attempt}: ${code}, retrying...`);
  }

  throw new Error(
    `Failed to generate unique account code after ${MAX_ATTEMPTS} attempts.`
  );
}

/**
 * Soft delete a record using the new record_id system
 *
 * @param {string} tableName - The table name (e.g., "Booking", "Task")
 * @param {number} recordId - Record ID (BIGINT)
 * @param {string} tenantId - Tenant ID (UUID)
 * @param {number|null} deletedByRecordId - User record_id who performed deletion (optional)
 * @returns {Promise<object|null>} - The archived record or null if not found
 */
async function softDeleteByRecordId(tableName, recordId, tenantId, deletedByRecordId = null) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Fetch the record to archive
    const fetchResult = await client.query(
      `SELECT * FROM "${tableName}" WHERE record_id = $1 AND tenant_id = $2`,
      [recordId, tenantId]
    );

    if (fetchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const record = fetchResult.rows[0];

    // Get next record_id for DeletedRecord table
    const deletedRecordId = await getNextRecordId(tenantId, 'DeletedRecord');

    // Archive to DeletedRecord table
    await client.query(
      `INSERT INTO "DeletedRecord" (record_id, tenant_id, original_table, original_id, data, deleted_at, deleted_by_record_id)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [deletedRecordId, tenantId, tableName, record.id, JSON.stringify(record), deletedByRecordId]
    );

    // Hard delete the original record
    await client.query(
      `DELETE FROM "${tableName}" WHERE record_id = $1 AND tenant_id = $2`,
      [recordId, tenantId]
    );

    await client.query('COMMIT');

    console.log(`[DB] Soft deleted ${tableName} record_id=${recordId} for tenant ${tenantId}`);
    return record;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[DB] Soft delete failed for ${tableName}:`, error.message);
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
  // New ID system functions
  getNextRecordId,
  getTenantByAccountCode,
  resolveTenantId,
  generateUniqueAccountCode,
  softDeleteByRecordId,
  getObjectTypeCode,
  OBJECT_TYPE_CODES,
};


// Force rebuild 12/25/2025 18:11:26
