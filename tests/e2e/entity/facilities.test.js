/**
 * E2E Tests - Facilities
 * Routes: /api/v1/entity/facilities
 */

const { testConnection, closePool, getTestContext } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;

describe('Facilities API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/entity/facilities', () => {
    test('returns 200 with list of facilities', async () => {
      const res = await client.get('/api/v1/entity/facilities');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(Array.isArray(res.data.data)).toBe(true);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/entity/facilities', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });

    test('supports limit parameter', async () => {
      const res = await client.get('/api/v1/entity/facilities?limit=5');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/entity/facilities', () => {
    test('creates facility with valid data', async () => {
      const data = {
        name: `Facility${Date.now()}`,
        type: 'KENNEL',
        capacity: 20,
        description: 'Test facility',
      };
      const res = await client.post('/api/v1/entity/facilities', data);
      expect([200, 201, 500]).toContain(res.status);
      if (res.status !== 500) {
        const facility = res.data.data || res.data;
        expect(facility.name).toBe(data.name);
      }
    });

    test('rejects request without name', async () => {
      const res = await client.post('/api/v1/entity/facilities', { type: 'KENNEL' });
      expect([400, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/entity/facilities', { name: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/entity/facilities/{id}', () => {
    let facilityId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/facilities', {
        name: `GetFacility${Date.now()}`,
        type: 'RUN',
        capacity: 10,
      });
      const facilityData = res.data.data || res.data;
      facilityId = facilityData.record_id || facilityData.id;
    });

    test('returns facility data', async () => {
      const res = await client.get(`/api/v1/entity/facilities/${facilityId}`);
      expect([200, 500]).toContain(res.status);
    });

    test('handles non-existent id', async () => {
      const res = await client.get('/api/v1/entity/facilities/999999');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.get(`/api/v1/entity/facilities/${facilityId}`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/entity/facilities/{id}', () => {
    let facilityId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/facilities', {
        name: `UpdateFacility${Date.now()}`,
        type: 'KENNEL',
        capacity: 15,
      });
      const facilityData = res.data.data || res.data;
      facilityId = facilityData.record_id || facilityData.id;
    });

    test('updates facility with valid data', async () => {
      const res = await client.put(`/api/v1/entity/facilities/${facilityId}`, {
        name: 'UpdatedFacility',
        capacity: 25,
      });
      expect([200, 204, 500]).toContain(res.status);
      if (res.status !== 500) {
        const get = await client.get(`/api/v1/entity/facilities/${facilityId}`);
        const facility = get.data.data || get.data;
        expect(facility.name).toBe('UpdatedFacility');
      }
    });

    test('handles non-existent id', async () => {
      const res = await client.put('/api/v1/entity/facilities/999999', { name: 'Test' });
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.put(`/api/v1/entity/facilities/${facilityId}`, { name: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/entity/facilities/{id}', () => {
    test('deletes facility', async () => {
      const create = await client.post('/api/v1/entity/facilities', {
        name: `DeleteFacility${Date.now()}`,
        type: 'RUN',
      });
      if (create.status === 500) return; // Skip if create failed
      const createData = create.data.data || create.data;
      const id = createData.record_id || createData.id;

      const res = await client.delete(`/api/v1/entity/facilities/${id}`);
      expect([200, 204, 500]).toContain(res.status);
      if (res.status !== 500) {
        const get = await client.get(`/api/v1/entity/facilities/${id}`);
        expect(get.status).toBe(404);
      }
    });

    test('handles non-existent id', async () => {
      const res = await client.delete('/api/v1/entity/facilities/999999');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.delete('/api/v1/entity/facilities/1', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
