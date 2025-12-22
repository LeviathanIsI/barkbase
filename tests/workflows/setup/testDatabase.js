/**
 * Test Database Connection Helper
 *
 * Provides connection to the development PostgreSQL database for integration
 * and E2E tests. Uses the same connection string as the backend.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env.development') });

let pool = null;

/**
 * Get or create the database pool
 * @returns {Pool}
 */
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL not found. Ensure backend/.env.development exists with DATABASE_URL'
      );
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Log connection errors
    pool.on('error', (err) => {
      console.error('[TestDatabase] Unexpected error on idle client', err);
    });
  }

  return pool;
}

/**
 * Execute a query against the database
 * @param {string} text - SQL query
 * @param {any[]} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with multiple queries
 * @param {function(function): Promise<any>} callback - Function that receives query function
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback((text, params) => client.query(text, params));
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
 * Close the database pool
 * Call this in afterAll() to clean up connections
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as now');
    console.log('[TestDatabase] Connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[TestDatabase] Connection failed:', error.message);
    return false;
  }
}

module.exports = {
  getPool,
  query,
  transaction,
  closePool,
  testConnection,
};
