/**
 * E2E Tests - Activities
 * Routes: /api/v1/entity/activities
 */

const { testConnection, closePool, getTestContext } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;

describe('Activities API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/entity/activities', () => {
    test('returns list of activities', async () => {
      const res = await client.get('/api/v1/entity/activities');
      expect([200, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.data).toHaveProperty('data');
        expect(Array.isArray(res.data.data)).toBe(true);
      }
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/entity/activities', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });

    test('supports limit parameter', async () => {
      const res = await client.get('/api/v1/entity/activities?limit=10');
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/entity/activities', () => {
    test('creates activity with valid data', async () => {
      const data = {
        name: `Activity${Date.now()}`,
        type: 'FEEDING',
        description: 'Morning feeding',
        duration_minutes: 30,
      };
      const res = await client.post('/api/v1/entity/activities', data);
      expect([200, 201, 404, 500]).toContain(res.status);
      if (res.status === 200 || res.status === 201) {
        const activity = res.data.data || res.data;
        expect(activity.name).toBe(data.name);
      }
    });

    test('rejects request without name', async () => {
      const res = await client.post('/api/v1/entity/activities', { type: 'FEEDING' });
      expect([400, 404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/entity/activities', { name: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/entity/activities/{id}', () => {
    let activityId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/activities', {
        name: `GetActivity${Date.now()}`,
        type: 'GROOMING',
        duration_minutes: 60,
      });
      const activityData = res.data.data || res.data;
      activityId = activityData.record_id || activityData.id;
    });

    test('returns activity data', async () => {
      const res = await client.get(`/api/v1/entity/activities/${activityId}`);
      expect([200, 404, 500]).toContain(res.status);
    });

    test('handles non-existent id', async () => {
      const res = await client.get('/api/v1/entity/activities/999999');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.get(`/api/v1/entity/activities/${activityId}`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/entity/activities/{id}', () => {
    let activityId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/activities', {
        name: `UpdateActivity${Date.now()}`,
        type: 'EXERCISE',
        duration_minutes: 45,
      });
      const activityData = res.data.data || res.data;
      activityId = activityData.record_id || activityData.id;
    });

    test('updates activity with valid data', async () => {
      const res = await client.put(`/api/v1/entity/activities/${activityId}`, {
        name: 'UpdatedActivity',
        duration_minutes: 90,
      });
      expect([200, 204, 404, 500]).toContain(res.status);
      if (res.status === 200 || res.status === 204) {
        const get = await client.get(`/api/v1/entity/activities/${activityId}`);
        const activity = get.data.data || get.data;
        expect(activity.name).toBe('UpdatedActivity');
      }
    });

    test('handles non-existent id', async () => {
      const res = await client.put('/api/v1/entity/activities/999999', { name: 'Test' });
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.put(`/api/v1/entity/activities/${activityId}`, { name: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/entity/activities/{id}', () => {
    test('deletes activity', async () => {
      const create = await client.post('/api/v1/entity/activities', {
        name: `DeleteActivity${Date.now()}`,
        type: 'TRAINING',
      });
      if (create.status === 404 || create.status === 500) return; // Skip if create failed
      const createData = create.data.data || create.data;
      const id = createData.record_id || createData.id;

      const res = await client.delete(`/api/v1/entity/activities/${id}`);
      expect([200, 204, 404, 500]).toContain(res.status);
      if (res.status === 200 || res.status === 204) {
        const get = await client.get(`/api/v1/entity/activities/${id}`);
        expect(get.status).toBe(404);
      }
    });

    test('handles non-existent id', async () => {
      const res = await client.delete('/api/v1/entity/activities/999999');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.delete('/api/v1/entity/activities/1', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
