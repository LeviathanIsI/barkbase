/**
 * E2E Tests - Reports Analytics
 * Routes: /api/v1/analytics/reports
 */

const { testConnection, closePool, getTestContext } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;

describe('Reports Analytics API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/analytics/reports', () => {
    test('returns 200 with list of reports', async () => {
      const res = await client.get('/api/v1/analytics/reports');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/analytics/reports', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/analytics/reports/generate', () => {
    test('generates report with valid data', async () => {
      const data = {
        type: 'revenue',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      };
      const res = await client.post('/api/v1/analytics/reports/generate', data);
      expect([200, 201, 202]).toContain(res.status);
    });

    test('accepts request without type', async () => {
      // API accepts generate requests without type field
      const res = await client.post('/api/v1/analytics/reports/generate', {});
      expect([200, 201, 202]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/analytics/reports/generate', { type: 'revenue' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/analytics/reports/query', () => {
    test('executes query with valid data', async () => {
      const data = {
        objectType: 'owners',
        columns: ['first_name', 'last_name', 'email'],
        filters: { groups: [], groupLogic: 'OR' },
      };
      const res = await client.post('/api/v1/analytics/reports/query', data);
      expect(res.status).toBe(200);
    });

    test('returns 400 without objectType', async () => {
      const res = await client.post('/api/v1/analytics/reports/query', { columns: ['name'] });
      expect(res.status).toBe(400);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/analytics/reports/query', { objectType: 'owners' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/analytics/reports/fields', () => {
    test('returns 200 with available fields', async () => {
      const res = await client.get('/api/v1/analytics/reports/fields');
      expect(res.status).toBe(200);
    });

    test('supports object_type parameter', async () => {
      const res = await client.get('/api/v1/analytics/reports/fields?object_type=owners');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/analytics/reports/fields', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/analytics/reports/saved', () => {
    test('returns 200 with saved reports', async () => {
      const res = await client.get('/api/v1/analytics/reports/saved');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/analytics/reports/saved', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
