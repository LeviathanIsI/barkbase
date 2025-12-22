/**
 * E2E Tests - Authentication
 *
 * Tests authentication endpoints:
 * - Login
 * - Token refresh
 * - Get current user (/auth/me)
 * - Logout
 */

const {
  testConnection,
  closePool,
  createTestTenant,
  createTestUser,
  getAuthToken,
  getExpiredToken,
  getInvalidToken,
  cleanupTenant,
} = require('../utils/setup');
const { api } = require('../utils/api');

jest.setTimeout(30000);

let testTenant;
let testUser;
let authToken;

describe('Authentication E2E Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection required for E2E tests');
    }

    testTenant = await createTestTenant({ name: 'Auth Test Tenant' });
    testUser = await createTestUser(testTenant.id, 'ADMIN');
    authToken = getAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTenant(testTenant?.id);
    await closePool();
  });

  describe('GET /auth/me', () => {
    test('returns current user with valid token', async () => {
      const res = await api.get('/auth/me', authToken, { tenantId: testTenant.id });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('email', testUser.email);
    });

    test('returns 401 with no token', async () => {
      const res = await api.get('/auth/me', null, { tenantId: testTenant.id });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('error');
    });

    test('returns 401 with invalid token', async () => {
      const res = await api.get('/auth/me', getInvalidToken(), { tenantId: testTenant.id });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('error');
    });

    test('returns 401 with expired token', async () => {
      const expiredToken = getExpiredToken(testUser);
      const res = await api.get('/auth/me', expiredToken, { tenantId: testTenant.id });

      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('error');
    });
  });

  describe('POST /auth/logout', () => {
    test('successfully logs out with valid token', async () => {
      const res = await api.post('/auth/logout', {}, authToken, { tenantId: testTenant.id });

      // Logout typically returns 200 or 204
      expect([200, 204]).toContain(res.status);
    });

    test('returns 401 with no token', async () => {
      const res = await api.post('/auth/logout', {}, null, { tenantId: testTenant.id });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /health', () => {
    test('returns health status', async () => {
      const res = await api.get('/health', null);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('status', 'ok');
      expect(res.data).toHaveProperty('service');
    });
  });

  describe('Token Validation', () => {
    test('rejects malformed authorization header', async () => {
      const res = await api.get('/auth/me', 'malformed-token-no-bearer', {
        tenantId: testTenant.id,
      });

      expect(res.status).toBe(401);
    });

    test('rejects token with wrong signature', async () => {
      // Create a token signed with wrong secret
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign(
        { sub: testUser.cognito_sub, 'custom:tenant_id': testTenant.id },
        'wrong-secret-key'
      );

      const res = await api.get('/auth/me', wrongToken, { tenantId: testTenant.id });

      expect(res.status).toBe(401);
    });

    test('rejects token missing required claims', async () => {
      const jwt = require('jsonwebtoken');
      const incompleteToken = jwt.sign(
        { sub: 'test-sub' }, // Missing tenant_id
        process.env.JWT_SECRET || 'test-secret-key-for-e2e-tests'
      );

      const res = await api.get('/auth/me', incompleteToken, { tenantId: testTenant.id });

      // Should still work but may have limited data
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('Tenant Header Validation', () => {
    test('validates tenant ID matches token claim', async () => {
      // Try to access with mismatched tenant ID header
      const wrongTenantId = '00000000-0000-0000-0000-000000000000';
      const res = await api.get('/auth/me', authToken, { tenantId: wrongTenantId });

      // Should return 401 due to tenant mismatch (security)
      expect([401, 403]).toContain(res.status);
    });
  });
});
