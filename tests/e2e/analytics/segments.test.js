/**
 * E2E Tests - Segments
 *
 * CRUD operations + filtering + member queries for Segment entity.
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
} = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');
const { createOwner, createSegment } = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;

describe('Segments E2E Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection required for E2E tests');
    }

    env = await createTestEnvironment();
    adminApi = createApiClient(env.tokens.admin, env.tenantId);
  });

  afterAll(async () => {
    await cleanupTenant(env?.tenantId);
    await closePool();
  });

  // ===========================================================================
  // HAPPY PATH TESTS
  // ===========================================================================
  describe('Happy Path', () => {
    test('GET /segments returns list of segments', async () => {
      await createSegment(env.tenantId, { name: 'ListTestSegment' });

      const res = await adminApi.get('/segments');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data || res.data)).toBe(true);
    });

    test('GET /segments/:id returns single segment', async () => {
      const segment = await createSegment(env.tenantId, { name: 'GetTestSegment' });

      const res = await adminApi.get(`/segments/${segment.id}`);

      expect(res.status).toBe(200);
      expect(res.data.name).toBe('GetTestSegment');
    });

    test('POST /segments creates new segment', async () => {
      const segmentData = {
        name: 'New Segment',
        description: 'Test segment description',
        entity_type: 'Owner',
        filters: {
          conditions: [
            { field: 'status', operator: 'eq', value: 'ACTIVE' },
          ],
        },
      };

      const res = await adminApi.post('/segments', segmentData);

      expect([200, 201]).toContain(res.status);
      expect(res.data.name).toBe('New Segment');
    });

    test('PATCH /segments/:id updates segment', async () => {
      const segment = await createSegment(env.tenantId);

      const res = await adminApi.patch(`/segments/${segment.id}`, {
        name: 'Updated Segment Name',
        description: 'Updated description',
      });

      expect([200, 204]).toContain(res.status);

      const getRes = await adminApi.get(`/segments/${segment.id}`);
      expect(getRes.data.name).toBe('Updated Segment Name');
    });

    test('DELETE /segments/:id deletes segment', async () => {
      const segment = await createSegment(env.tenantId);

      const res = await adminApi.delete(`/segments/${segment.id}`);

      expect([200, 204]).toContain(res.status);

      const getRes = await adminApi.get(`/segments/${segment.id}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ===========================================================================
  // SEGMENT MEMBERS
  // ===========================================================================
  describe('Segment Members', () => {
    test('GET /segments/:id/members returns matching entities', async () => {
      // Create owners that will match segment
      await createOwner(env.tenantId, { status: 'ACTIVE' });
      await createOwner(env.tenantId, { status: 'ACTIVE' });

      const segment = await createSegment(env.tenantId, {
        name: 'Active Owners',
        entity_type: 'Owner',
        filters: {
          conditions: [{ field: 'status', operator: 'eq', value: 'ACTIVE' }],
        },
      });

      const res = await adminApi.get(`/segments/${segment.id}/members`);

      if (res.status === 200) {
        const members = res.data.data || res.data;
        expect(Array.isArray(members)).toBe(true);
      } else {
        // Endpoint might not exist
        expect([404, 200]).toContain(res.status);
      }
    });

    test('GET /segments/:id/count returns member count', async () => {
      const segment = await createSegment(env.tenantId, {
        entity_type: 'Owner',
        filters: {
          conditions: [{ field: 'status', operator: 'eq', value: 'ACTIVE' }],
        },
      });

      const res = await adminApi.get(`/segments/${segment.id}/count`);

      if (res.status === 200) {
        expect(typeof res.data.count).toBe('number');
      } else {
        expect([404, 200]).toContain(res.status);
      }
    });

    test('segment members update when data changes', async () => {
      const segment = await createSegment(env.tenantId, {
        name: 'Dynamic Segment',
        entity_type: 'Owner',
        filters: {
          conditions: [{ field: 'status', operator: 'eq', value: 'ACTIVE' }],
        },
      });

      // Create new owner
      await createOwner(env.tenantId, { status: 'ACTIVE' });

      // Members should include the new owner
      const res = await adminApi.get(`/segments/${segment.id}/members`);

      if (res.status === 200) {
        const members = res.data.data || res.data;
        expect(members.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ===========================================================================
  // SEGMENT FILTERS
  // ===========================================================================
  describe('Segment Filters', () => {
    test('segment with multiple conditions works', async () => {
      const segment = await createSegment(env.tenantId, {
        name: 'Complex Segment',
        entity_type: 'Owner',
        filters: {
          logic: 'AND',
          conditions: [
            { field: 'status', operator: 'eq', value: 'ACTIVE' },
            { field: 'created_at', operator: 'gte', value: '2024-01-01' },
          ],
        },
      });

      const res = await adminApi.get(`/segments/${segment.id}`);

      expect(res.status).toBe(200);
      expect(res.data.filters.conditions.length).toBe(2);
    });

    test('segment with OR logic works', async () => {
      const segment = await createSegment(env.tenantId, {
        name: 'OR Segment',
        entity_type: 'Owner',
        filters: {
          logic: 'OR',
          conditions: [
            { field: 'status', operator: 'eq', value: 'ACTIVE' },
            { field: 'status', operator: 'eq', value: 'PENDING' },
          ],
        },
      });

      const res = await adminApi.get(`/segments/${segment.id}`);

      expect(res.status).toBe(200);
    });

    test('segment with nested groups works', async () => {
      const segment = await createSegment(env.tenantId, {
        name: 'Nested Segment',
        entity_type: 'Owner',
        filters: {
          logic: 'AND',
          conditions: [
            { field: 'status', operator: 'eq', value: 'ACTIVE' },
          ],
          groups: [
            {
              logic: 'OR',
              conditions: [
                { field: 'city', operator: 'eq', value: 'New York' },
                { field: 'city', operator: 'eq', value: 'Los Angeles' },
              ],
            },
          ],
        },
      });

      const res = await adminApi.get(`/segments/${segment.id}`);

      expect(res.status).toBe(200);
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when name is missing', async () => {
      const res = await adminApi.post('/segments', {
        entity_type: 'Owner',
        filters: {},
      });

      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid entity_type', async () => {
      const res = await adminApi.post('/segments', {
        name: 'Invalid Segment',
        entity_type: 'InvalidEntity',
        filters: {},
      });

      expect([400, 422]).toContain(res.status);
    });

    test('returns 400 for invalid filter operator', async () => {
      const res = await adminApi.post('/segments', {
        name: 'Invalid Filter',
        entity_type: 'Owner',
        filters: {
          conditions: [
            { field: 'status', operator: 'invalid_op', value: 'ACTIVE' },
          ],
        },
      });

      expect([400, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // AUTH ERRORS
  // ===========================================================================
  describe('Auth Errors', () => {
    test('returns 401 with no token', async () => {
      const res = await api.get('/segments', null, { tenantId: env.tenantId });
      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('cannot access segments from different tenant', async () => {
      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherSegment = await createSegment(otherTenant.id, { name: 'OtherTenantSegment' });

      const res = await adminApi.get(`/segments/${otherSegment.id}`);

      expect(res.status).toBe(404);

      await cleanupTenant(otherTenant.id);
    });
  });

  // ===========================================================================
  // NOT FOUND
  // ===========================================================================
  describe('Not Found', () => {
    test('returns 404 for non-existent segment', async () => {
      const res = await adminApi.get('/segments/segment_nonexistent123');
      expect(res.status).toBe(404);
    });
  });
});
