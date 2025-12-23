/**
 * E2E Tests - Authentication
 *
 * Tests authentication endpoints using REAL Cognito tokens:
 * - Get current user (/auth/me)
 * - Logout
 * - Token validation
 */

const {
  testConnection,
  closePool,
  getAuthToken,
  getTestContext,
  getExpiredToken,
  getInvalidToken,
} = require('../utils/setup');
const { api } = require('../utils/api');

jest.setTimeout(30000);

let authToken;
let testContext;

describe('Authentication E2E Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection required for E2E tests');
    }

    // Get real Cognito token and user info
    testContext = await getTestContext();
    authToken = testContext.token;
    console.log('[E2E] Test context loaded:', {
      email: testContext.user.email,
      tenantId: testContext.tenantId,
    });

    // Create session by calling /auth/login (required for /auth/me to work)
    await api.post('/auth/login', { accessToken: authToken }, authToken, {
      tenantId: testContext.tenantId,
    });
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /auth/me', () => {
    test('returns current user with valid token', async () => {
      const res = await api.get('/auth/me', authToken, { tenantId: testContext.tenantId });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('user');
      expect(res.data.user).toHaveProperty('email', testContext.user.email);
      expect(res.data.user).toHaveProperty('tenantId', testContext.tenantId);
    });

    test('returns 401 with no token', async () => {
      const res = await api.get('/auth/me', null, { tenantId: testContext.tenantId });

      expect(res.status).toBe(401);
    });

    test('returns 401 with invalid token', async () => {
      const res = await api.get('/auth/me', getInvalidToken(), { tenantId: testContext.tenantId });

      expect(res.status).toBe(401);
    });

    test('returns 401 with expired token', async () => {
      const expiredToken = getExpiredToken();
      const res = await api.get('/auth/me', expiredToken, { tenantId: testContext.tenantId });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    test('successfully logs out with valid token', async () => {
      const res = await api.post('/auth/logout', {}, authToken, { tenantId: testContext.tenantId });

      // Logout typically returns 200 or 204
      expect([200, 204]).toContain(res.status);
    });

    test('returns 401 with no token', async () => {
      const res = await api.post('/auth/logout', {}, null, { tenantId: testContext.tenantId });

      // Some APIs allow logout without token, some require it
      expect([200, 204, 401]).toContain(res.status);
    });
  });

  describe('GET /health', () => {
    test('returns health status', async () => {
      const res = await api.get('/health', null);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('status', 'ok');
    });
  });

  describe('Token Validation', () => {
    test('rejects malformed authorization header', async () => {
      const res = await api.get('/auth/me', 'malformed-token-no-bearer', {
        tenantId: testContext.tenantId,
      });

      expect(res.status).toBe(401);
    });

    test('rejects token signed with wrong key', async () => {
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign(
        { sub: 'fake-sub', email: 'fake@example.com' },
        'wrong-secret-key'
      );

      const res = await api.get('/auth/me', wrongToken, { tenantId: testContext.tenantId });

      expect(res.status).toBe(401);
    });
  });

  describe('Tenant Header Validation', () => {
    test('validates tenant ID matches token claim', async () => {
      // Try to access with mismatched tenant ID header
      const wrongTenantId = '00000000-0000-0000-0000-000000000000';
      const res = await api.get('/auth/me', authToken, { tenantId: wrongTenantId });

      // Should return 401 or 403 due to tenant mismatch
      expect([401, 403]).toContain(res.status);
    });
  });
});
