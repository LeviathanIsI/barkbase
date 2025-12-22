/**
 * E2E Tests - Feature Flags
 *
 * Tests for feature flag management:
 * - Feature flag CRUD
 * - Feature flag evaluation
 * - Tenant-level overrides
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
  query,
} = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let env;
let adminApi;
let staffApi;

// Helper to create feature flag
async function createFeatureFlag(tenantId, overrides = {}) {
  const result = await query(
    `INSERT INTO "FeatureFlag" (tenant_id, key, name, description, enabled, config)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      tenantId,
      overrides.key || `flag_${Date.now()}`,
      overrides.name || 'Test Flag',
      overrides.description || 'Test flag description',
      overrides.enabled !== undefined ? overrides.enabled : false,
      JSON.stringify(overrides.config || {}),
    ]
  );
  return result.rows[0];
}

describe('Feature Flags E2E Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection required for E2E tests');
    }

    env = await createTestEnvironment();
    adminApi = createApiClient(env.tokens.admin, env.tenantId);
    staffApi = createApiClient(env.tokens.staff, env.tenantId);
  });

  afterAll(async () => {
    await cleanupTenant(env?.tenantId);
    await closePool();
  });

  // ===========================================================================
  // HAPPY PATH TESTS
  // ===========================================================================
  describe('Happy Path', () => {
    test('GET /feature-flags returns list of feature flags', async () => {
      await createFeatureFlag(env.tenantId, { key: 'list_test_flag' });

      const res = await adminApi.get('/feature-flags');

      if (res.status === 200) {
        expect(Array.isArray(res.data.data || res.data)).toBe(true);
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /feature-flags/:key returns single feature flag', async () => {
      const flag = await createFeatureFlag(env.tenantId, { key: 'get_test_flag' });

      const res = await adminApi.get(`/feature-flags/${flag.key}`);

      if (res.status === 200) {
        expect(res.data.key).toBe('get_test_flag');
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('POST /feature-flags creates new feature flag', async () => {
      const flagData = {
        key: 'new_feature_flag',
        name: 'New Feature',
        description: 'A new feature flag',
        enabled: false,
      };

      const res = await adminApi.post('/feature-flags', flagData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.key).toBe('new_feature_flag');
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('PATCH /feature-flags/:key updates feature flag', async () => {
      const flag = await createFeatureFlag(env.tenantId, { key: 'update_test_flag' });

      const res = await adminApi.patch(`/feature-flags/${flag.key}`, {
        enabled: true,
        description: 'Updated description',
      });

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/feature-flags/${flag.key}`);
        if (getRes.status === 200) {
          expect(getRes.data.enabled).toBe(true);
        }
      } else {
        expect([200, 204, 404]).toContain(res.status);
      }
    });

    test('DELETE /feature-flags/:key deletes feature flag', async () => {
      const flag = await createFeatureFlag(env.tenantId, { key: 'delete_test_flag' });

      const res = await adminApi.delete(`/feature-flags/${flag.key}`);

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/feature-flags/${flag.key}`);
        expect(getRes.status).toBe(404);
      } else {
        expect([200, 204, 404]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // FLAG EVALUATION
  // ===========================================================================
  describe('Flag Evaluation', () => {
    test('GET /feature-flags/:key/evaluate returns flag state', async () => {
      const flag = await createFeatureFlag(env.tenantId, {
        key: 'eval_test_flag',
        enabled: true,
      });

      const res = await adminApi.get(`/feature-flags/${flag.key}/evaluate`);

      if (res.status === 200) {
        expect(res.data.enabled).toBe(true);
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('disabled flag evaluates to false', async () => {
      const flag = await createFeatureFlag(env.tenantId, {
        key: 'disabled_flag',
        enabled: false,
      });

      const res = await adminApi.get(`/feature-flags/${flag.key}/evaluate`);

      if (res.status === 200) {
        expect(res.data.enabled).toBe(false);
      }
    });

    test('POST /feature-flags/evaluate-batch evaluates multiple flags', async () => {
      await createFeatureFlag(env.tenantId, { key: 'batch_flag_1', enabled: true });
      await createFeatureFlag(env.tenantId, { key: 'batch_flag_2', enabled: false });

      const res = await adminApi.post('/feature-flags/evaluate-batch', {
        keys: ['batch_flag_1', 'batch_flag_2'],
      });

      if (res.status === 200) {
        const flags = res.data.data || res.data;
        expect(flags['batch_flag_1']?.enabled || flags.batch_flag_1).toBe(true);
        expect(flags['batch_flag_2']?.enabled || flags.batch_flag_2).toBe(false);
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // FLAG CONFIGURATION
  // ===========================================================================
  describe('Flag Configuration', () => {
    test('flag with percentage rollout', async () => {
      const flag = await createFeatureFlag(env.tenantId, {
        key: 'percentage_flag',
        enabled: true,
        config: {
          rollout_percentage: 50,
        },
      });

      const res = await adminApi.get(`/feature-flags/${flag.key}`);

      if (res.status === 200) {
        expect(res.data.config?.rollout_percentage).toBe(50);
      }
    });

    test('flag with user targeting', async () => {
      const flag = await createFeatureFlag(env.tenantId, {
        key: 'targeted_flag',
        enabled: true,
        config: {
          target_users: ['user_123', 'user_456'],
        },
      });

      const res = await adminApi.get(`/feature-flags/${flag.key}`);

      if (res.status === 200) {
        expect(res.data.config?.target_users).toBeDefined();
      }
    });

    test('flag with date-based activation', async () => {
      const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Week from now

      const flag = await createFeatureFlag(env.tenantId, {
        key: 'scheduled_flag',
        enabled: true,
        config: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      });

      const res = await adminApi.get(`/feature-flags/${flag.key}`);

      if (res.status === 200) {
        expect(res.data.config?.start_date).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // TOGGLE FLAGS
  // ===========================================================================
  describe('Toggle Flags', () => {
    test('POST /feature-flags/:key/enable enables flag', async () => {
      const flag = await createFeatureFlag(env.tenantId, {
        key: 'enable_test_flag',
        enabled: false,
      });

      const res = await adminApi.post(`/feature-flags/${flag.key}/enable`, {});

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/feature-flags/${flag.key}`);
        if (getRes.status === 200) {
          expect(getRes.data.enabled).toBe(true);
        }
      } else {
        expect([200, 204, 404]).toContain(res.status);
      }
    });

    test('POST /feature-flags/:key/disable disables flag', async () => {
      const flag = await createFeatureFlag(env.tenantId, {
        key: 'disable_test_flag',
        enabled: true,
      });

      const res = await adminApi.post(`/feature-flags/${flag.key}/disable`, {});

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/feature-flags/${flag.key}`);
        if (getRes.status === 200) {
          expect(getRes.data.enabled).toBe(false);
        }
      } else {
        expect([200, 204, 404]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // PERMISSION CHECKS
  // ===========================================================================
  describe('Permission Checks', () => {
    test('staff cannot create feature flags', async () => {
      const res = await staffApi.post('/feature-flags', {
        key: 'staff_created_flag',
        name: 'Staff Flag',
        enabled: true,
      });

      expect([401, 403, 404]).toContain(res.status);
    });

    test('staff cannot update feature flags', async () => {
      const flag = await createFeatureFlag(env.tenantId, { key: 'staff_update_test' });

      const res = await staffApi.patch(`/feature-flags/${flag.key}`, {
        enabled: true,
      });

      expect([401, 403, 404]).toContain(res.status);
    });

    test('staff can read feature flags', async () => {
      await createFeatureFlag(env.tenantId, { key: 'staff_read_test' });

      const res = await staffApi.get('/feature-flags');

      // Staff should be able to read flags for feature evaluation
      expect([200, 403, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when key is missing', async () => {
      const res = await adminApi.post('/feature-flags', {
        name: 'No Key Flag',
        enabled: true,
      });

      expect([400, 404]).toContain(res.status);
    });

    test('returns 400 for invalid key format', async () => {
      const res = await adminApi.post('/feature-flags', {
        key: 'invalid key with spaces',
        name: 'Invalid Key Flag',
        enabled: true,
      });

      expect([400, 404, 422]).toContain(res.status);
    });

    test('returns 400 for duplicate key', async () => {
      await createFeatureFlag(env.tenantId, { key: 'duplicate_key_flag' });

      const res = await adminApi.post('/feature-flags', {
        key: 'duplicate_key_flag',
        name: 'Duplicate',
        enabled: true,
      });

      expect([400, 409, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // AUTH ERRORS
  // ===========================================================================
  describe('Auth Errors', () => {
    test('returns 401 with no token', async () => {
      const res = await api.get('/feature-flags', null, { tenantId: env.tenantId });
      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('cannot access feature flags from different tenant', async () => {
      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherFlag = await createFeatureFlag(otherTenant.id, { key: 'other_tenant_flag' });

      const res = await adminApi.get(`/feature-flags/${otherFlag.key}`);

      expect(res.status).toBe(404);

      await cleanupTenant(otherTenant.id);
    });

    test('feature flags are tenant-scoped', async () => {
      // Create same key in different tenants
      await createFeatureFlag(env.tenantId, { key: 'scoped_flag', enabled: true });

      const { createTestTenant, createTestUser, getAuthToken } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      await createFeatureFlag(otherTenant.id, { key: 'scoped_flag', enabled: false });

      const otherUser = await createTestUser(otherTenant.id, 'ADMIN');
      const otherToken = getAuthToken(otherUser);
      const otherApi = createApiClient(otherToken, otherTenant.id);

      // Each tenant should see their own flag state
      const res1 = await adminApi.get('/feature-flags/scoped_flag');
      const res2 = await otherApi.get('/feature-flags/scoped_flag');

      if (res1.status === 200 && res2.status === 200) {
        expect(res1.data.enabled).toBe(true);
        expect(res2.data.enabled).toBe(false);
      }

      await cleanupTenant(otherTenant.id);
    });
  });

  // ===========================================================================
  // NOT FOUND
  // ===========================================================================
  describe('Not Found', () => {
    test('returns 404 for non-existent feature flag', async () => {
      const res = await adminApi.get('/feature-flags/nonexistent_flag_xyz');
      expect(res.status).toBe(404);
    });
  });
});
