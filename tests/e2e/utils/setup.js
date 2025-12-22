/**
 * E2E Test Setup Utilities
 *
 * Provides isolated test environments with:
 * - Real Cognito authentication
 * - Test tenant creation/cleanup
 * - Test user creation with specific roles
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

// Test account credentials
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
 * Execute a transaction
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
 * Generate a valid UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a unique account code
 */
function generateAccountCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Object type codes for the record_id system
 * Must match aws/layers/db-layer/nodejs/db.js OBJECT_TYPE_CODES
 */
const OBJECT_TYPE_CODES = {
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
  Workflow: 20,
  WorkflowStep: 21,
  WorkflowExecution: 22,
  Service: 30,
  Package: 31,
  Run: 40,
  Kennel: 41,
  RunAssignment: 43,
  User: 50,
  Role: 52,
  UserRole: 53,
  TimeEntry: 55,
  Conversation: 60,
  Message: 61,
  Notification: 62,
  Segment: 27,
  SegmentMember: 28,
  AuditLog: 90,
};

/**
 * Get the next record_id for a table using the database function
 * @param {string} tenantId - Tenant UUID
 * @param {string} tableName - Table name (e.g., "User", "Owner")
 * @returns {Promise<number>} Next record_id
 */
async function getNextRecordId(tenantId, tableName) {
  const objectTypeCode = OBJECT_TYPE_CODES[tableName];
  if (!objectTypeCode) {
    throw new Error(`Unknown table "${tableName}" - not registered in OBJECT_TYPE_CODES`);
  }

  const result = await query(
    'SELECT next_record_id($1, $2) as record_id',
    [tenantId, objectTypeCode]
  );

  return result.rows[0].record_id;
}

/**
 * Create a test tenant with isolated data
 * @param {object} overrides - Field overrides
 * @returns {Promise<object>} Created tenant
 */
async function createTestTenant(overrides = {}) {
  const tenantId = overrides.id || generateUUID();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  const tenantData = {
    id: tenantId,
    name: overrides.name || `E2E Test Tenant ${timestamp}`,
    slug: overrides.slug || `e2e-test-${timestamp}-${randomSuffix}`,
    account_code: overrides.account_code || generateAccountCode(),
    plan: overrides.plan || 'PRO',
  };

  const result = await query(
    `INSERT INTO "Tenant" (id, name, slug, account_code, plan, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [
      tenantData.id,
      tenantData.name,
      tenantData.slug,
      tenantData.account_code,
      tenantData.plan,
    ]
  );

  // Create TenantSettings with defaults
  await query(
    `INSERT INTO "TenantSettings" (tenant_id)
     VALUES ($1)
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId]
  );

  return result.rows[0];
}

/**
 * Create a test user with a specific role
 * @param {string} tenantId - Tenant ID
 * @param {string} role - Role name (ADMIN, MANAGER, STAFF, VIEWER)
 * @param {object} overrides - Field overrides
 * @returns {Promise<object>} Created user with role
 */
async function createTestUser(tenantId, role = 'ADMIN', overrides = {}) {
  const timestamp = Date.now();
  const cognitoSub = overrides.cognito_sub || `test-cognito-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

  // Get next record_id for User table
  const userRecordId = await getNextRecordId(tenantId, 'User');

  // Create user record
  const userResult = await query(
    `INSERT INTO "User" (
      tenant_id, record_id, cognito_sub, email, first_name, last_name, is_active, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      tenantId,
      userRecordId,
      cognitoSub,
      overrides.email || `test-${timestamp}@example.com`,
      overrides.first_name || 'Test',
      overrides.last_name || 'User',
      overrides.is_active !== undefined ? overrides.is_active : true,
    ]
  );

  const user = userResult.rows[0];

  // Get or create role
  let roleResult = await query(
    `SELECT record_id FROM "Role" WHERE tenant_id = $1 AND name = $2`,
    [tenantId, role]
  );

  if (roleResult.rows.length === 0) {
    // Get next record_id for Role table
    const roleRecordId = await getNextRecordId(tenantId, 'Role');
    roleResult = await query(
      `INSERT INTO "Role" (tenant_id, record_id, name, description, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       RETURNING record_id`,
      [
        tenantId,
        roleRecordId,
        role,
        `${role} role for testing`,
      ]
    );
  }

  const roleId = roleResult.rows[0].record_id;

  // Get next record_id for UserRole
  const userRoleRecordId = await getNextRecordId(tenantId, 'UserRole');

  // Assign role to user
  await query(
    `INSERT INTO "UserRole" (tenant_id, record_id, user_id, role_id, assigned_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT DO NOTHING`,
    [tenantId, userRoleRecordId, user.record_id, roleId]
  );

  user.role = role;
  user.roleId = roleId;

  return user;
}

/**
 * Get permissions for a role
 */
function getRolePermissions(role) {
  const permissions = {
    ADMIN: {
      '*': ['create', 'read', 'update', 'delete'],
    },
    MANAGER: {
      owners: ['create', 'read', 'update', 'delete'],
      pets: ['create', 'read', 'update', 'delete'],
      bookings: ['create', 'read', 'update', 'delete'],
      invoices: ['create', 'read', 'update'],
      payments: ['create', 'read'],
      staff: ['read'],
      reports: ['read'],
    },
    STAFF: {
      owners: ['read'],
      pets: ['read', 'update'],
      bookings: ['read', 'update'],
      tasks: ['read', 'update'],
    },
    VIEWER: {
      owners: ['read'],
      pets: ['read'],
      bookings: ['read'],
    },
  };

  return permissions[role] || permissions.VIEWER;
}

/**
 * Authenticate with Cognito and get a real JWT token
 * @returns {Promise<{token: string, session: object}>}
 */
async function authenticateWithCognito(email = TEST_ACCOUNT.email, password = TEST_ACCOUNT.password) {
  // Return cached session if still valid
  if (cachedCognitoSession) {
    const idToken = cachedCognitoSession.getIdToken();
    const expiration = idToken.getExpiration();
    const now = Math.floor(Date.now() / 1000);

    // If token expires in more than 5 minutes, reuse it
    if (expiration - now > 300) {
      return {
        token: idToken.getJwtToken(),
        accessToken: cachedCognitoSession.getAccessToken().getJwtToken(),
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
        console.log('[E2E] Cognito authentication successful');
        resolve({
          token: result.getIdToken().getJwtToken(),
          accessToken: result.getAccessToken().getJwtToken(),
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
  return cachedTestUser;
}

/**
 * Get a real auth token from Cognito
 * This is the main function tests should use
 * @returns {Promise<string>} JWT token
 */
async function getAuthToken() {
  const { token } = await authenticateWithCognito();
  return token;
}

/**
 * Get test context with real Cognito auth
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
 * Note: This is a fake token that will be rejected
 */
function getExpiredToken() {
  // Return a structurally valid but expired JWT
  // The API will reject this with 401
  return 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid';
}

/**
 * Generate an invalid JWT token
 */
function getInvalidToken() {
  return 'invalid.token.here';
}

/**
 * Clean up all test data for a tenant
 * @param {string} tenantId - Tenant ID
 */
async function cleanupTenant(tenantId) {
  if (!tenantId) return;

  const deleteQueries = [
    // Workflow data
    `DELETE FROM "WorkflowExecutionLog" WHERE execution_id IN (
      SELECT record_id FROM "WorkflowExecution" WHERE tenant_id = $1
    )`,
    `DELETE FROM "WorkflowExecution" WHERE tenant_id = $1`,
    `DELETE FROM "WorkflowStep" WHERE workflow_id IN (
      SELECT record_id FROM "Workflow" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Workflow" WHERE tenant_id = $1`,

    // Analytics
    `DELETE FROM "SegmentMember" WHERE segment_id IN (
      SELECT record_id FROM "Segment" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Segment" WHERE tenant_id = $1`,
    `DELETE FROM "ReportDefinition" WHERE tenant_id = $1`,

    // Messaging
    `DELETE FROM "Notification" WHERE tenant_id = $1`,
    `DELETE FROM "Conversation" WHERE tenant_id = $1`,
    `DELETE FROM "Message" WHERE tenant_id = $1`,

    // Operations
    `DELETE FROM "Task" WHERE tenant_id = $1`,
    `DELETE FROM "Incident" WHERE tenant_id = $1`,
    `DELETE FROM "TimeEntry" WHERE tenant_id = $1`,
    `DELETE FROM "RunAssignment" WHERE tenant_id = $1`,
    `DELETE FROM "Note" WHERE tenant_id = $1`,

    // Financial
    `DELETE FROM "Payment" WHERE tenant_id = $1`,
    `DELETE FROM "InvoiceLine" WHERE invoice_id IN (
      SELECT record_id FROM "Invoice" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Invoice" WHERE tenant_id = $1`,

    // Bookings
    `DELETE FROM "BookingPet" WHERE booking_id IN (
      SELECT record_id FROM "Booking" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Booking" WHERE tenant_id = $1`,

    // Vaccinations
    `DELETE FROM "Vaccination" WHERE tenant_id = $1`,

    // Pet-Owner relationships
    `DELETE FROM "PetOwner" WHERE tenant_id = $1`,

    // Pets
    `DELETE FROM "Pet" WHERE tenant_id = $1`,

    // Owners
    `DELETE FROM "Owner" WHERE tenant_id = $1`,

    // Runs and Kennels
    `DELETE FROM "Run" WHERE tenant_id = $1`,
    `DELETE FROM "Kennel" WHERE tenant_id = $1`,

    // Services
    `DELETE FROM "Service" WHERE tenant_id = $1`,
    `DELETE FROM "Package" WHERE tenant_id = $1`,

    // Properties
    `DELETE FROM "PropertyValue" WHERE tenant_id = $1`,
    `DELETE FROM "Property" WHERE tenant_id = $1`,
    `DELETE FROM "PropertyGroup" WHERE tenant_id = $1`,

    // User roles
    `DELETE FROM "UserRole" WHERE tenant_id = $1`,
    `DELETE FROM "Role" WHERE tenant_id = $1`,

    // Users
    `DELETE FROM "User" WHERE tenant_id = $1`,

    // Settings
    `DELETE FROM "TenantSettings" WHERE tenant_id = $1`,

    // Tenant
    `DELETE FROM "Tenant" WHERE id = $1`,
  ];

  for (const sql of deleteQueries) {
    try {
      await query(sql, [tenantId]);
    } catch (error) {
      // Ignore errors for tables that might not exist
      if (!error.message.includes('does not exist')) {
        console.warn(`[Cleanup] Warning: ${error.message}`);
      }
    }
  }
}

/**
 * Create a test environment with tenant and users
 * @returns {Promise<object>} Test context
 */
async function createTestEnvironment() {
  const tenant = await createTestTenant();
  const adminUser = await createTestUser(tenant.id, 'ADMIN');
  const managerUser = await createTestUser(tenant.id, 'MANAGER');
  const staffUser = await createTestUser(tenant.id, 'STAFF');
  const viewerUser = await createTestUser(tenant.id, 'VIEWER');

  return {
    tenant,
    tenantId: tenant.id,
    accountCode: tenant.account_code,
    users: {
      admin: adminUser,
      manager: managerUser,
      staff: staffUser,
      viewer: viewerUser,
    },
    tokens: {
      admin: getAuthToken(adminUser),
      manager: getAuthToken(managerUser),
      staff: getAuthToken(staffUser),
      viewer: getAuthToken(viewerUser),
    },
  };
}

module.exports = {
  // Database
  getPool,
  query,
  transaction,
  closePool,
  testConnection,

  // Utilities
  generateUUID,
  generateAccountCode,
  getNextRecordId,
  OBJECT_TYPE_CODES,

  // Test data creation
  createTestTenant,
  createTestUser,
  cleanupTenant,
  createTestEnvironment,

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
