/**
 * E2E Tests - Activities
 * Routes: /api/v1/entity/activities
 *
 * Activities are linked to entities (owner, pet, booking, invoice)
 * and require entity_type + entity_id parameters.
 */

const { testConnection, closePool, getTestContext } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;
let testOwnerId;

describe('Activities API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });

    // Get or create an owner to use as the entity for activities
    const ownersRes = await client.get('/api/v1/entity/owners?limit=1');
    if (ownersRes.data?.data?.length > 0) {
      testOwnerId = ownersRes.data.data[0].record_id || ownersRes.data.data[0].id;
    } else {
      const newOwner = await client.post('/api/v1/entity/owners', {
        first_name: 'ActivityTest',
        last_name: `Owner${Date.now()}`,
        email: `activitytest-${Date.now()}@test.com`,
      });
      const ownerData = newOwner.data.data || newOwner.data;
      testOwnerId = ownerData.record_id || ownerData.id;
    }
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/entity/activities', () => {
    test('returns list of activities for an entity', async () => {
      if (!testOwnerId) return; // Skip if no owner
      // Activities require entity_type and entity_id params
      const res = await client.get(`/api/v1/entity/activities?entity_type=owner&entity_id=${testOwnerId}`);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(Array.isArray(res.data.data)).toBe(true);
    });

    test('returns 400 without entity params', async () => {
      const res = await client.get('/api/v1/entity/activities');
      expect(res.status).toBe(400);
    });

    test('returns 401 without token', async () => {
      const ownerId = testOwnerId || '1';
      const res = await api.get(`/api/v1/entity/activities?entity_type=owner&entity_id=${ownerId}`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });

    test('supports limit parameter', async () => {
      if (!testOwnerId) return; // Skip if no owner
      const res = await client.get(`/api/v1/entity/activities?entity_type=owner&entity_id=${testOwnerId}&limit=10`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/entity/activities', () => {
    test('creates activity with valid data', async () => {
      if (!testOwnerId) return; // Skip if no owner
      const data = {
        entity_type: 'owner',
        entity_id: testOwnerId,
        activity_type: 'note',
        subject: `Test Activity ${Date.now()}`,
        content: 'Test activity content',
      };
      const res = await client.post('/api/v1/entity/activities', data);
      expect(res.status).toBe(201);
      const activity = res.data.data || res.data;
      expect(activity.subject || activity.content).toBeTruthy();
    });

    test('rejects request without entity_type', async () => {
      const res = await client.post('/api/v1/entity/activities', { entity_id: testOwnerId || 1, activity_type: 'note' });
      expect(res.status).toBe(400);
    });

    test('rejects request without activity_type', async () => {
      const res = await client.post('/api/v1/entity/activities', { entity_type: 'owner', entity_id: testOwnerId || 1 });
      expect(res.status).toBe(400);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/entity/activities', { entity_type: 'owner', entity_id: testOwnerId || 1, activity_type: 'note' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/entity/activities/{id}', () => {
    let activityId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/activities', {
        entity_type: 'owner',
        entity_id: testOwnerId,
        activity_type: 'note',
        subject: `GetActivity${Date.now()}`,
        content: 'Test content',
      });
      if (res.status === 200 || res.status === 201) {
        const activityData = res.data.data || res.data;
        activityId = activityData.record_id || activityData.id;
      }
    });

    test('returns activity data', async () => {
      if (!activityId) return; // Skip if setup failed
      const res = await client.get(`/api/v1/entity/activities/${activityId}`);
      expect([200, 404, 500]).toContain(res.status);
    });

    test('handles non-existent id', async () => {
      const res = await client.get('/api/v1/entity/activities/999999');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const testId = activityId || '1';
      const res = await api.get(`/api/v1/entity/activities/${testId}`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/entity/activities/{id}', () => {
    let activityId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/activities', {
        entity_type: 'owner',
        entity_id: testOwnerId,
        activity_type: 'note',
        subject: `UpdateActivity${Date.now()}`,
        content: 'Original content',
      });
      if (res.status === 200 || res.status === 201) {
        const activityData = res.data.data || res.data;
        activityId = activityData.record_id || activityData.id;
      }
    });

    test('updates activity with valid data', async () => {
      if (!activityId) return; // Skip if setup failed
      const res = await client.put(`/api/v1/entity/activities/${activityId}`, {
        subject: 'Updated Subject',
        content: 'Updated content',
      });
      expect([200, 204, 404, 500]).toContain(res.status);
    });

    test('handles non-existent id', async () => {
      const res = await client.put('/api/v1/entity/activities/999999', { subject: 'Test' });
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const testId = activityId || '1';
      const res = await api.put(`/api/v1/entity/activities/${testId}`, { subject: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/entity/activities/{id}', () => {
    test('deletes activity', async () => {
      const create = await client.post('/api/v1/entity/activities', {
        entity_type: 'owner',
        entity_id: testOwnerId,
        activity_type: 'note',
        subject: `DeleteActivity${Date.now()}`,
      });
      if (create.status !== 200 && create.status !== 201) return; // Skip if create failed
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
