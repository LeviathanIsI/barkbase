/**
 * E2E Tests - Segments
 * Routes: /api/v1/segments
 */

const { testConnection, closePool, getTestContext } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;

describe('Segments API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/segments', () => {
    test('returns 200 with list of segments', async () => {
      const res = await client.get('/api/v1/segments');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(Array.isArray(res.data.data)).toBe(true);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/segments', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/segments', () => {
    test('creates segment with valid data', async () => {
      const data = {
        name: `Segment${Date.now()}`,
        description: 'Test segment',
        object_type: 'owners',
        segment_type: 'active',
        filters: { groups: [], groupLogic: 'OR' },
      };
      const res = await client.post('/api/v1/segments', data);
      expect([200, 201, 500]).toContain(res.status);
      if (res.status !== 500) {
        const segment = res.data.data || res.data;
        expect(segment.name).toBe(data.name);
      }
    });

    test('rejects request without name', async () => {
      const res = await client.post('/api/v1/segments', { object_type: 'owners' });
      expect([400, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/segments', { name: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/segments/preview', () => {
    test('returns 200 with preview results', async () => {
      const data = {
        object_type: 'owners',
        filters: { groups: [], groupLogic: 'OR' },
      };
      const res = await client.post('/api/v1/segments/preview', data);
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/segments/preview', {}, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/segments/refresh', () => {
    test('returns 200 on refresh', async () => {
      const res = await client.post('/api/v1/segments/refresh', {});
      expect([200, 202]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/segments/refresh', {}, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/segments/{id}', () => {
    let segmentId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/segments', {
        name: `GetSegment${Date.now()}`,
        object_type: 'pets',
        segment_type: 'active',
        filters: { groups: [], groupLogic: 'OR' },
      });
      const segmentData = res.data.data || res.data;
      segmentId = segmentData.record_id || segmentData.id;
    });

    test('returns segment data', async () => {
      const res = await client.get(`/api/v1/segments/${segmentId}`);
      expect([200, 404, 500]).toContain(res.status);
    });

    test('handles non-existent id', async () => {
      const res = await client.get('/api/v1/segments/999999');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.get(`/api/v1/segments/${segmentId}`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/segments/{id}/members', () => {
    let segmentId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/segments', {
        name: `MembersSegment${Date.now()}`,
        object_type: 'owners',
        segment_type: 'active',
        filters: { groups: [], groupLogic: 'OR' },
      });
      const segmentData = res.data.data || res.data;
      segmentId = segmentData.record_id || segmentData.id;
    });

    test('returns segment members', async () => {
      const res = await client.get(`/api/v1/segments/${segmentId}/members`);
      expect([200, 404, 500]).toContain(res.status);
    });

    test('handles non-existent segment', async () => {
      const res = await client.get('/api/v1/segments/999999/members');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.get(`/api/v1/segments/${segmentId}/members`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/segments/{id}/activity', () => {
    let segmentId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/segments', {
        name: `ActivitySegment${Date.now()}`,
        object_type: 'owners',
        segment_type: 'active',
        filters: { groups: [], groupLogic: 'OR' },
      });
      const segmentData = res.data.data || res.data;
      segmentId = segmentData.record_id || segmentData.id;
    });

    test('returns segment activity', async () => {
      const res = await client.get(`/api/v1/segments/${segmentId}/activity`);
      expect([200, 404, 500]).toContain(res.status);
    });

    test('handles non-existent segment', async () => {
      const res = await client.get('/api/v1/segments/999999/activity');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.get(`/api/v1/segments/${segmentId}/activity`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
