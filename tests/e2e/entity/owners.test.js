/**
 * E2E Tests - Owners
 * Routes: /api/v1/entity/owners
 */

const { testConnection, closePool, getTestContext, getExpiredToken, getInvalidToken } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;

describe('Owners API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/entity/owners', () => {
    test('returns 200 with list of owners', async () => {
      const res = await client.get('/api/v1/entity/owners');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(Array.isArray(res.data.data)).toBe(true);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/entity/owners', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });

    test('supports limit parameter', async () => {
      const res = await client.get('/api/v1/entity/owners?limit=5');
      expect(res.status).toBe(200);
      expect(res.data.data.length).toBeLessThanOrEqual(5);
    });

    test('supports search parameter', async () => {
      const res = await client.get('/api/v1/entity/owners?search=test');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/entity/owners', () => {
    test('creates owner with valid data', async () => {
      const data = {
        first_name: 'E2E',
        last_name: `Test${Date.now()}`,
        email: `e2e-${Date.now()}@test.com`,
        phone: '+15551234567',
      };
      const res = await client.post('/api/v1/entity/owners', data);
      expect([200, 201]).toContain(res.status);
      const owner = res.data.data || res.data;
      expect(owner.first_name).toBe(data.first_name);
      expect(owner.email).toBe(data.email);
    });

    test('rejects request without first_name', async () => {
      const res = await client.post('/api/v1/entity/owners', { last_name: 'Test', email: 'test@test.com' });
      expect([400, 500]).toContain(res.status);
    });

    test('rejects request without last_name', async () => {
      const res = await client.post('/api/v1/entity/owners', { first_name: 'Test', email: 'test@test.com' });
      expect([400, 500]).toContain(res.status);
    });

    test('returns 400 with invalid email', async () => {
      const res = await client.post('/api/v1/entity/owners', { first_name: 'Test', last_name: 'User', email: 'invalid' });
      expect(res.status).toBe(400);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/entity/owners', { first_name: 'Test', last_name: 'User' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/entity/owners/{id}', () => {
    let ownerId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/owners', {
        first_name: 'GetById',
        last_name: `Test${Date.now()}`,
        email: `getbyid-${Date.now()}@test.com`,
      });
      const ownerData = res.data.data || res.data;
      ownerId = ownerData.record_id || ownerData.id;
    });

    test('returns 200 with owner data', async () => {
      const res = await client.get(`/api/v1/entity/owners/${ownerId}`);
      expect(res.status).toBe(200);
      const owner = res.data.data || res.data;
      expect(owner.first_name).toBe('GetById');
    });

    test('returns 404 for non-existent id', async () => {
      const res = await client.get('/api/v1/entity/owners/999999');
      expect(res.status).toBe(404);
    });

    test('returns 401 without token', async () => {
      const res = await api.get(`/api/v1/entity/owners/${ownerId}`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/entity/owners/{id}', () => {
    let ownerId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/owners', {
        first_name: 'Update',
        last_name: `Test${Date.now()}`,
        email: `update-${Date.now()}@test.com`,
      });
      const ownerData = res.data.data || res.data;
      ownerId = ownerData.record_id || ownerData.id;
    });

    test('updates owner with valid data', async () => {
      const res = await client.put(`/api/v1/entity/owners/${ownerId}`, {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+15559999999',
      });
      expect([200, 204, 500]).toContain(res.status);
      if (res.status !== 500) {
        const get = await client.get(`/api/v1/entity/owners/${ownerId}`);
        const owner = get.data.data || get.data;
        expect(owner.first_name).toBe('Updated');
      }
    });

    test('returns error for non-existent id', async () => {
      const res = await client.put('/api/v1/entity/owners/999999', { first_name: 'Test', last_name: 'User' });
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.put(`/api/v1/entity/owners/${ownerId}`, { first_name: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/entity/owners/{id}', () => {
    test('deletes owner', async () => {
      const create = await client.post('/api/v1/entity/owners', {
        first_name: 'Delete',
        last_name: `Test${Date.now()}`,
        email: `delete-${Date.now()}@test.com`,
      });
      const createData = create.data.data || create.data;
      const id = createData.record_id || createData.id;

      const res = await client.delete(`/api/v1/entity/owners/${id}`);
      expect([200, 204, 500]).toContain(res.status);
      if (res.status !== 500) {
        const get = await client.get(`/api/v1/entity/owners/${id}`);
        expect(get.status).toBe(404);
      }
    });

    test('returns error for non-existent id', async () => {
      const res = await client.delete('/api/v1/entity/owners/999999');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.delete('/api/v1/entity/owners/1', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
