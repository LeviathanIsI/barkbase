/**
 * E2E Test Setup Utilities
 *
 * Uses REAL test account and tenant - no creation/cleanup needed.
 * Test account: joshua.r.bradford1@gmail.com
 * Tenant: Hades Home (BK-JRAPPW)
 */

const { Pool } = require('pg');
const path = require('path');
const {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} = require('amazon-cognito-identity-js');

// Load frontend env for Cognito config
require('dotenv').config({ path: path.join(__dirname, '../../../frontend/.env.development') });
// Load backend env for database
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env.development') });

let pool = null;

// Cognito configuration from frontend env
const COGNITO_USER_POOL_ID = process.env.VITE_COGNITO_USER_POOL_ID || 'us-east-2_Ruxq8VwmU';
const COGNITO_CLIENT_ID = process.env.VITE_COGNITO_CLIENT_ID || '7o10d6f75hrbgkksed19ij4ip9';

// Test account credentials - uses real existing account
const TEST_ACCOUNT = {
  email: 'joshua.r.bradford1@gmail.com',
  password: 'Josh1987!?!?',
};

// Cache for Cognito tokens to avoid re-authenticating
let cachedCognitoSession = null;
let cachedTestUser = null;

/**
 * Get or create the database pool
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
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[E2E Setup] Pool error:', err);
    });
  }

  return pool;
}

/**
 * Execute a SQL query
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
 * Close database pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as now');
    console.log('[E2E] Database connected:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[E2E] Database connection failed:', error.message);
    return false;
  }
}

/**
 * Authenticate with Cognito and get a real JWT token
 * @returns {Promise<{token: string, accessToken: string, session: object}>}
 */
async function authenticateWithCognito(email = TEST_ACCOUNT.email, password = TEST_ACCOUNT.password) {
  // Return cached session if still valid
  if (cachedCognitoSession) {
    const accessToken = cachedCognitoSession.getAccessToken();
    const expiration = accessToken.getExpiration();
    const now = Math.floor(Date.now() / 1000);

    // If token expires in more than 5 minutes, reuse it
    if (expiration - now > 300) {
      return {
        token: accessToken.getJwtToken(),
        accessToken: accessToken.getJwtToken(),
        session: cachedCognitoSession,
      };
    }
  }

  const userPool = new CognitoUserPool({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_CLIENT_ID,
  });

  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        cachedCognitoSession = result;
        const accessToken = result.getAccessToken().getJwtToken();
        console.log('[E2E] Cognito authentication successful');
        resolve({
          token: accessToken,
          accessToken: accessToken,
          session: result,
        });
      },
      onFailure: (err) => {
        console.error('[E2E] Cognito authentication failed:', err.message);
        reject(err);
      },
      newPasswordRequired: () => {
        reject(new Error('New password required - test account needs password reset'));
      },
    });
  });
}

/**
 * Get the real user info from the database for the test account
 * @returns {Promise<object>} User and tenant info
 */
async function getTestUserFromDatabase() {
  if (cachedTestUser) {
    return cachedTestUser;
  }

  const result = await query(
    `SELECT u.*, t.id as tenant_id, t.name as tenant_name, t.account_code, t.slug as tenant_slug
     FROM "User" u
     JOIN "Tenant" t ON u.tenant_id = t.id
     WHERE u.email = $1
     LIMIT 1`,
    [TEST_ACCOUNT.email]
  );

  if (result.rows.length === 0) {
    throw new Error(`Test user ${TEST_ACCOUNT.email} not found in database`);
  }

  cachedTestUser = result.rows[0];
  console.log('[E2E] Test user loaded:', {
    email: cachedTestUser.email,
    tenantId: cachedTestUser.tenant_id,
    tenantName: cachedTestUser.tenant_name,
    accountCode: cachedTestUser.account_code,
  });
  return cachedTestUser;
}

/**
 * Get a real auth token from Cognito
 * @returns {Promise<string>} JWT access token
 */
async function getAuthToken() {
  const { token } = await authenticateWithCognito();
  return token;
}

/**
 * Get test context with real Cognito auth and real tenant
 * This is the main function tests should use.
 * @returns {Promise<object>} Test context with token and user info
 */
async function getTestContext() {
  const [authResult, user] = await Promise.all([
    authenticateWithCognito(),
    getTestUserFromDatabase(),
  ]);

  return {
    token: authResult.token,
    accessToken: authResult.accessToken,
    user,
    tenantId: user.tenant_id,
    accountCode: user.account_code,
  };
}

/**
 * Generate an expired token (for testing 401 scenarios)
 */
function getExpiredToken() {
  return 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid';
}

/**
 * Generate an invalid JWT token
 */
function getInvalidToken() {
  return 'invalid.token.here';
}

module.exports = {
  // Database
  getPool,
  query,
  closePool,
  testConnection,

  // Cognito authentication (real tokens)
  authenticateWithCognito,
  getTestUserFromDatabase,
  getAuthToken,
  getTestContext,
  TEST_ACCOUNT,

  // For testing auth failures
  getExpiredToken,
  getInvalidToken,

  // Config
  COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID,
};
