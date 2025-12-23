/**
 * E2E Tests - Revenue Analytics
 * Routes: /api/v1/analytics/revenue
 */

const { testConnection, closePool, getTestContext } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;

describe('Revenue Analytics API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/analytics/revenue', () => {
    test('returns 200 with revenue data', async () => {
      const res = await client.get('/api/v1/analytics/revenue');
      expect(res.status).toBe(200);
    });

    test('supports date range parameters', async () => {
      const res = await client.get('/api/v1/analytics/revenue?start_date=2024-01-01&end_date=2024-12-31');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/analytics/revenue', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/analytics/revenue/daily', () => {
    test('returns 200 with daily revenue', async () => {
      const res = await client.get('/api/v1/analytics/revenue/daily');
      expect(res.status).toBe(200);
    });

    test('supports date range parameters', async () => {
      const res = await client.get('/api/v1/analytics/revenue/daily?start_date=2024-01-01&end_date=2024-01-31');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/analytics/revenue/daily', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/analytics/revenue/monthly', () => {
    test('returns 200 with monthly revenue', async () => {
      const res = await client.get('/api/v1/analytics/revenue/monthly');
      expect(res.status).toBe(200);
    });

    test('supports year parameter', async () => {
      const res = await client.get('/api/v1/analytics/revenue/monthly?year=2024');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/analytics/revenue/monthly', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
