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

// Connection pool (reused across Lambda invocations)
let pool = null;
let cachedCredentials = null;
let credentialsFetchTime = null;
const CREDENTIALS_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get database credentials from Secrets Manager
 */
async function getDbCredentials() {
  const now = Date.now();
  
  // Return cached credentials if still valid
  if (cachedCredentials && credentialsFetchTime && (now - credentialsFetchTime) < CREDENTIALS_TTL_MS) {
    return cachedCredentials;
  }

  const secretArn = process.env.DB_SECRET_ARN;
  
  if (!secretArn) {
    // Fall back to environment variables for local development
    if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
      return {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        dbname: process.env.DB_NAME || 'barkbase',
      };
    }
    throw new Error('DB_SECRET_ARN environment variable is not set and no local DB config found');
  }

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
      rejectUnauthorized: false, // Required for RDS
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

module.exports = {
  getPool,
  getPoolAsync,
  initPool,
  query,
  getClient,
  closePool,
};

