/**
 * =============================================================================
 * BarkBase Database Layer
 * =============================================================================
 *
 * This module provides a singleton PostgreSQL connection pool for BarkBase.
 * It supports two modes:
 *
 * 1. SECRET-BASED (Lambda/Production):
 *    - Set DB_SECRET_NAME env var (e.g., "barkbase/dev/postgres/credentials")
 *    - Fetches credentials from AWS Secrets Manager
 *    - Caches the secret in memory for the Lambda lifecycle
 *
 * 2. DIRECT ENV (Local Development):
 *    - If DB_SECRET_NAME is not set, uses direct env vars:
 *      - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *
 * USAGE:
 * ------
 * const { getPool } = require('/opt/nodejs/db'); // Lambda
 * const { getPool } = require('./db');           // Local
 * const pool = getPool();
 * const result = await pool.query('SELECT NOW()');
 *
 * =============================================================================
 */

const { Pool } = require('pg');

// Singleton pool instance
let pool = null;

// Cached secret (fetched once per Lambda lifecycle)
let cachedSecret = null;

/**
 * Fetch database credentials from AWS Secrets Manager
 * @returns {Promise<Object>} Parsed secret containing host, port, username, password, dbname
 */
async function fetchSecret() {
  if (cachedSecret) {
    return cachedSecret;
  }

  const secretName = process.env.DB_SECRET_NAME;
  const region = process.env.AWS_REGION || 'us-east-2';

  if (!secretName) {
    throw new Error('DB_SECRET_NAME environment variable is required for secret-based configuration');
  }

  console.log(`[DB-LAYER] Fetching secret: ${secretName} from region: ${region}`);

  // Dynamic import of AWS SDK v3
  const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

  const client = new SecretsManagerClient({ region });
  const command = new GetSecretValueCommand({ SecretId: secretName });

  try {
    const response = await client.send(command);
    
    if (!response.SecretString) {
      throw new Error('Secret does not contain a string value');
    }

    cachedSecret = JSON.parse(response.SecretString);
    console.log('[DB-LAYER] Secret fetched and cached successfully');
    return cachedSecret;
  } catch (error) {
    console.error('[DB-LAYER] Failed to fetch secret:', error.message);
    throw error;
  }
}

/**
 * Build pool configuration from environment variables (local dev mode)
 * @returns {Object} pg Pool configuration
 */
function buildEnvConfig() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'barkbase',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  };

  console.log(`[DB-LAYER] Using direct env config: ${config.host}:${config.port}/${config.database}`);
  return config;
}

/**
 * Build pool configuration from Secrets Manager secret
 * @param {Object} secret - Parsed secret from Secrets Manager
 * @returns {Object} pg Pool configuration
 */
function buildSecretConfig(secret) {
  const config = {
    host: secret.host,
    port: parseInt(secret.port || '5432', 10),
    database: secret.dbname || secret.database || process.env.DB_NAME || 'barkbase',
    user: secret.username,
    password: secret.password,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    // SSL required for RDS
    ssl: {
      rejectUnauthorized: false, // RDS uses self-signed certs
    },
  };

  console.log(`[DB-LAYER] Using secret-based config: ${config.host}:${config.port}/${config.database}`);
  return config;
}

/**
 * Initialize the database pool asynchronously
 * Called internally when pool is first needed
 * @returns {Promise<Pool>}
 */
async function initializePool() {
  if (pool) {
    return pool;
  }

  let config;

  if (process.env.DB_SECRET_NAME) {
    // Production mode: fetch from Secrets Manager
    console.log('[DB-LAYER] Initializing pool with Secrets Manager credentials');
    const secret = await fetchSecret();
    config = buildSecretConfig(secret);
  } else {
    // Local dev mode: use direct env vars
    console.log('[DB-LAYER] Initializing pool with direct environment variables');
    config = buildEnvConfig();
  }

  pool = new Pool(config);

  // Handle pool errors gracefully
  pool.on('error', (err) => {
    console.error('[DB-LAYER] Unexpected pool error:', err.message);
  });

  // Test the connection
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    console.log(`[DB-LAYER] Pool initialized successfully. Server time: ${result.rows[0].now}`);
    client.release();
  } catch (error) {
    console.error('[DB-LAYER] Failed to verify pool connection:', error.message);
    // Don't throw - let the actual queries fail with better context
  }

  return pool;
}

/**
 * Get the database connection pool (singleton)
 * 
 * IMPORTANT: This function is SYNCHRONOUS for backwards compatibility with
 * existing code that calls `const pool = getPool()`. The pool is initialized
 * lazily on first query if not already initialized.
 * 
 * For Lambda cold starts, call initializePool() in your handler init if needed.
 * 
 * @returns {Pool} The pg Pool instance (may not be connected yet)
 */
function getPool() {
  if (pool) {
    return pool;
  }

  // Create pool synchronously for backwards compatibility
  // The actual connection happens lazily on first query
  let config;

  if (process.env.DB_SECRET_NAME) {
    // For secret-based config in Lambda, we need async initialization
    // Create a "lazy" pool that initializes on first use
    console.log('[DB-LAYER] Creating lazy pool (will fetch secret on first query)');
    
    // Return a proxy that initializes the real pool on first method call
    const lazyPool = {
      _initialized: false,
      _initPromise: null,
      
      async _ensureInitialized() {
        if (this._initialized) return;
        if (!this._initPromise) {
          this._initPromise = initializePool();
        }
        await this._initPromise;
        this._initialized = true;
      },
      
      async query(...args) {
        await this._ensureInitialized();
        return pool.query(...args);
      },
      
      async connect(...args) {
        await this._ensureInitialized();
        return pool.connect(...args);
      },
      
      async end() {
        if (pool) {
          return pool.end();
        }
      },

      on(event, handler) {
        // Queue event handlers for when pool is ready
        if (pool) {
          pool.on(event, handler);
        }
        return this;
      }
    };
    
    // Store reference so subsequent calls return same instance
    pool = lazyPool;
    return lazyPool;
  } else {
    // Local dev: synchronous initialization
    console.log('[DB-LAYER] Initializing pool synchronously (local dev mode)');
    config = buildEnvConfig();
    pool = new Pool(config);
    
    pool.on('error', (err) => {
      console.error('[DB-LAYER] Unexpected pool error:', err.message);
    });
    
    return pool;
  }
}

/**
 * Explicitly initialize the pool (useful for Lambda cold start optimization)
 * @returns {Promise<Pool>}
 */
async function warmUp() {
  return initializePool();
}

/**
 * Close the pool connection (for graceful shutdown)
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    console.log('[DB-LAYER] Closing pool');
    if (pool.end) {
      await pool.end();
    }
    pool = null;
    cachedSecret = null;
  }
}

module.exports = {
  getPool,
  warmUp,
  closePool,
};

