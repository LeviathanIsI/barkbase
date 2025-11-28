/**
 * Database Connection Utility for BarkBase Lambda Handlers
 * 
 * Uses pg Pool with credentials from AWS Secrets Manager.
 * Connection is reused across Lambda invocations (warm starts).
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

// Cache the pool for connection reuse across invocations
let pool: Pool | null = null;
let cachedSecret: DbCredentials | null = null;

interface DbCredentials {
  username: string;
  password: string;
  host?: string;
  port?: number;
  dbname?: string;
}

/**
 * Retrieve database credentials from Secrets Manager
 */
async function getDbCredentials(): Promise<DbCredentials> {
  if (cachedSecret) {
    return cachedSecret;
  }

  const secretArn = process.env.DB_SECRET_ARN;
  const secretId = process.env.DB_SECRET_ID;

  if (!secretArn && !secretId) {
    throw new Error('DB_SECRET_ARN or DB_SECRET_ID environment variable is required');
  }

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'us-east-2',
  });

  const command = new GetSecretValueCommand({
    SecretId: secretArn || secretId,
  });

  const response = await client.send(command);

  if (!response.SecretString) {
    throw new Error('Secret value is empty');
  }

  cachedSecret = JSON.parse(response.SecretString) as DbCredentials;
  return cachedSecret;
}

/**
 * Get or create the database connection pool
 */
export async function getPool(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const credentials = await getDbCredentials();

  pool = new Pool({
    host: process.env.DB_HOST || credentials.host,
    port: parseInt(process.env.DB_PORT || String(credentials.port) || '5432', 10),
    database: process.env.DB_NAME || credentials.dbname || 'barkbase',
    user: credentials.username,
    password: credentials.password,
    // Lambda-optimized settings
    max: 1, // Single connection per Lambda instance
    idleTimeoutMillis: 120000, // 2 minutes
    connectionTimeoutMillis: 10000, // 10 seconds
    ssl: process.env.DB_SSL === 'false' ? false : {
      rejectUnauthorized: false, // For RDS certificates
    },
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('[DB] Pool error:', err);
    pool = null; // Reset pool on error
  });

  return pool;
}

/**
 * Execute a query with automatic pool management
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = await getPool();
  try {
    const start = Date.now();
    const result = await p.query<T>(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    console.error('[DB] Query error:', { text: text.substring(0, 100), error });
    throw error;
  }
}

/**
 * Get a client for transaction support
 */
export async function getClient(): Promise<PoolClient> {
  const p = await getPool();
  return p.connect();
}

/**
 * Execute a function within a transaction
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Clean up pool on Lambda shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

