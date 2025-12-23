/**
 * E2E Tests - Dashboard Analytics
 * Routes: /api/v1/analytics/dashboard
 */

const { testConnection, closePool, getTestContext } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;

describe('Dashboard Analytics API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    test('returns 200 with dashboard data', async () => {
      const res = await client.get('/api/v1/analytics/dashboard');
      expect(res.status).toBe(200);
    });

    test('supports date range parameters', async () => {
      const res = await client.get('/api/v1/analytics/dashboard?start_date=2024-01-01&end_date=2024-12-31');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/analytics/dashboard', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/analytics/dashboard/summary', () => {
    test('returns 200 with summary data', async () => {
      const res = await client.get('/api/v1/analytics/dashboard/summary');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/analytics/dashboard/summary', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/analytics/dashboard/kpis', () => {
    test('returns 200 with KPIs', async () => {
      const res = await client.get('/api/v1/analytics/dashboard/kpis');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/analytics/dashboard/kpis', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
