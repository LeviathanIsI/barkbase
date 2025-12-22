/**
 * E2E Test Setup Utilities
 *
 * Provides isolated test environments with:
 * - Test tenant creation/cleanup
 * - Test user creation with specific roles
 * - JWT token generation for authenticated requests
 */

const { Pool } = require('pg');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env.development') });

let pool = null;

// JWT secret for test tokens (matches Lambda auth layer in test mode)
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-e2e-tests';

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
    plan: overrides.plan || 'PROFESSIONAL',
    status: overrides.status || 'active',
  };

  const result = await query(
    `INSERT INTO "Tenant" (id, name, slug, account_code, plan, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING *`,
    [
      tenantData.id,
      tenantData.name,
      tenantData.slug,
      tenantData.account_code,
      tenantData.plan,
      tenantData.status,
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
  const userId = overrides.id || generateUUID();
  const timestamp = Date.now();
  const cognitoSub = overrides.cognito_sub || `test-cognito-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;

  // Create user record
  const userResult = await query(
    `INSERT INTO "User" (
      id, tenant_id, cognito_sub, record_id, email, first_name, last_name,
      status, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [
      userId,
      tenantId,
      cognitoSub,
      overrides.record_id || `usr_${timestamp}`,
      overrides.email || `test-${timestamp}@example.com`,
      overrides.first_name || 'Test',
      overrides.last_name || 'User',
      overrides.status || 'active',
    ]
  );

  // Get or create role
  let roleResult = await query(
    `SELECT id FROM "Role" WHERE tenant_id = $1 AND name = $2`,
    [tenantId, role]
  );

  if (roleResult.rows.length === 0) {
    // Create the role
    roleResult = await query(
      `INSERT INTO "Role" (id, tenant_id, name, description, permissions, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING id`,
      [
        generateUUID(),
        tenantId,
        role,
        `${role} role for testing`,
        JSON.stringify(getRolePermissions(role)),
      ]
    );
  }

  const roleId = roleResult.rows[0].id;

  // Assign role to user
  await query(
    `INSERT INTO "UserRole" (user_id, role_id, tenant_id, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [userId, roleId, tenantId]
  );

  const user = userResult.rows[0];
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
 * Generate a JWT token for a test user
 * @param {object} user - User object from createTestUser
 * @param {object} options - Token options
 * @returns {string} JWT token
 */
function getAuthToken(user, options = {}) {
  const payload = {
    sub: user.cognito_sub,
    'custom:tenant_id': user.tenant_id,
    'custom:user_id': user.id,
    'custom:role': user.role,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (options.expiresIn || 3600),
  };

  return jwt.sign(payload, TEST_JWT_SECRET);
}

/**
 * Generate an expired JWT token
 */
function getExpiredToken(user) {
  const payload = {
    sub: user.cognito_sub,
    'custom:tenant_id': user.tenant_id,
    'custom:user_id': user.id,
    email: user.email,
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
  };

  return jwt.sign(payload, TEST_JWT_SECRET);
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
      SELECT id FROM "WorkflowExecution" WHERE tenant_id = $1
    )`,
    `DELETE FROM "WorkflowExecution" WHERE tenant_id = $1`,
    `DELETE FROM "WorkflowStep" WHERE workflow_id IN (
      SELECT id FROM "Workflow" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Workflow" WHERE tenant_id = $1`,

    // Analytics
    `DELETE FROM "SegmentMember" WHERE segment_id IN (
      SELECT id FROM "Segment" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Segment" WHERE tenant_id = $1`,
    `DELETE FROM "ReportDefinition" WHERE tenant_id = $1`,

    // Messaging
    `DELETE FROM "Notification" WHERE tenant_id = $1`,
    `DELETE FROM "MessageTemplate" WHERE tenant_id = $1`,
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
    `DELETE FROM "InvoiceLineItem" WHERE invoice_id IN (
      SELECT id FROM "Invoice" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Invoice" WHERE tenant_id = $1`,

    // Bookings
    `DELETE FROM "BookingPet" WHERE booking_id IN (
      SELECT id FROM "Booking" WHERE tenant_id = $1
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

    // Staff
    `DELETE FROM "Staff" WHERE tenant_id = $1`,

    // Facilities
    `DELETE FROM "Run" WHERE facility_id IN (
      SELECT id FROM "Facility" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Facility" WHERE tenant_id = $1`,

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
    `DELETE FROM "FeatureFlag" WHERE tenant_id = $1`,

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
  getPool,
  query,
  transaction,
  closePool,
  testConnection,
  generateUUID,
  generateAccountCode,
  createTestTenant,
  createTestUser,
  getAuthToken,
  getExpiredToken,
  getInvalidToken,
  cleanupTenant,
  createTestEnvironment,
  TEST_JWT_SECRET,
};
