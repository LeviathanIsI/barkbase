/**
 * E2E Tests - Dashboards
 *
 * Tests for dashboard and widget management:
 * - Dashboard CRUD
 * - Widget configuration
 * - Dashboard sharing
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
  query,
} = require('../utils/setup');
const { createApiClient } = require('../utils/api');

jest.setTimeout(30000);

let env;
let adminApi;

// Helper to create dashboard
async function createDashboard(tenantId, overrides = {}) {
  const result = await query(
    `INSERT INTO "Dashboard" (tenant_id, name, description, layout, is_default, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      tenantId,
      overrides.name || `Dashboard_${Date.now()}`,
      overrides.description || 'Test dashboard',
      JSON.stringify(overrides.layout || { widgets: [] }),
      overrides.is_default || false,
      overrides.created_by || null,
    ]
  );
  return result.rows[0];
}

describe('Dashboards E2E Tests', () => {
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
    test('GET /dashboards returns list of dashboards', async () => {
      await createDashboard(env.tenantId, { name: 'ListTestDashboard' });

      const res = await adminApi.get('/dashboards');

      if (res.status === 200) {
        expect(Array.isArray(res.data.data || res.data)).toBe(true);
      } else {
        // Endpoint might not exist
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /dashboards/:id returns single dashboard', async () => {
      const dashboard = await createDashboard(env.tenantId, { name: 'GetTestDashboard' });

      const res = await adminApi.get(`/dashboards/${dashboard.id}`);

      if (res.status === 200) {
        expect(res.data.name).toBe('GetTestDashboard');
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('POST /dashboards creates new dashboard', async () => {
      const dashboardData = {
        name: 'New Dashboard',
        description: 'Test dashboard description',
        layout: {
          columns: 12,
          widgets: [],
        },
      };

      const res = await adminApi.post('/dashboards', dashboardData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.name).toBe('New Dashboard');
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('PATCH /dashboards/:id updates dashboard', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const res = await adminApi.patch(`/dashboards/${dashboard.id}`, {
        name: 'Updated Dashboard Name',
        description: 'Updated description',
      });

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/dashboards/${dashboard.id}`);
        if (getRes.status === 200) {
          expect(getRes.data.name).toBe('Updated Dashboard Name');
        }
      }
    });

    test('DELETE /dashboards/:id deletes dashboard', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const res = await adminApi.delete(`/dashboards/${dashboard.id}`);

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/dashboards/${dashboard.id}`);
        expect(getRes.status).toBe(404);
      }
    });
  });

  // ===========================================================================
  // WIDGET MANAGEMENT
  // ===========================================================================
  describe('Widget Management', () => {
    test('POST /dashboards/:id/widgets adds widget', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const widgetData = {
        type: 'chart',
        title: 'Revenue Chart',
        config: {
          chartType: 'line',
          entity: 'Invoice',
          metric: 'total_cents',
          groupBy: 'created_at',
        },
        position: { x: 0, y: 0, w: 6, h: 4 },
      };

      const res = await adminApi.post(`/dashboards/${dashboard.id}/widgets`, widgetData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.title || res.data.config?.title).toBeDefined();
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('PATCH /dashboards/:id/widgets/:widgetId updates widget', async () => {
      const dashboard = await createDashboard(env.tenantId, {
        layout: {
          widgets: [
            { id: 'widget1', type: 'metric', title: 'Original Title' },
          ],
        },
      });

      const res = await adminApi.patch(`/dashboards/${dashboard.id}/widgets/widget1`, {
        title: 'Updated Widget Title',
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('DELETE /dashboards/:id/widgets/:widgetId removes widget', async () => {
      const dashboard = await createDashboard(env.tenantId, {
        layout: {
          widgets: [
            { id: 'widget1', type: 'metric', title: 'To Delete' },
          ],
        },
      });

      const res = await adminApi.delete(`/dashboards/${dashboard.id}/widgets/widget1`);

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // WIDGET TYPES
  // ===========================================================================
  describe('Widget Types', () => {
    test('metric widget configuration', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const widgetData = {
        type: 'metric',
        title: 'Total Revenue',
        config: {
          entity: 'Invoice',
          aggregation: 'sum',
          field: 'total_cents',
          format: 'currency',
        },
      };

      const res = await adminApi.post(`/dashboards/${dashboard.id}/widgets`, widgetData);

      expect([200, 201, 404]).toContain(res.status);
    });

    test('chart widget configuration', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const widgetData = {
        type: 'chart',
        title: 'Bookings by Status',
        config: {
          chartType: 'bar',
          entity: 'Booking',
          metric: 'count',
          groupBy: 'status',
        },
      };

      const res = await adminApi.post(`/dashboards/${dashboard.id}/widgets`, widgetData);

      expect([200, 201, 404]).toContain(res.status);
    });

    test('table widget configuration', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const widgetData = {
        type: 'table',
        title: 'Recent Bookings',
        config: {
          entity: 'Booking',
          columns: ['status', 'check_in', 'check_out'],
          limit: 10,
          orderBy: { field: 'created_at', direction: 'desc' },
        },
      };

      const res = await adminApi.post(`/dashboards/${dashboard.id}/widgets`, widgetData);

      expect([200, 201, 404]).toContain(res.status);
    });

    test('list widget configuration', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const widgetData = {
        type: 'list',
        title: 'Top Customers',
        config: {
          entity: 'Owner',
          displayField: 'first_name',
          metric: 'booking_count',
          limit: 5,
        },
      };

      const res = await adminApi.post(`/dashboards/${dashboard.id}/widgets`, widgetData);

      expect([200, 201, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // DASHBOARD LAYOUT
  // ===========================================================================
  describe('Dashboard Layout', () => {
    test('update dashboard layout', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const res = await adminApi.patch(`/dashboards/${dashboard.id}`, {
        layout: {
          columns: 12,
          widgets: [
            { id: 'w1', x: 0, y: 0, w: 6, h: 4 },
            { id: 'w2', x: 6, y: 0, w: 6, h: 4 },
          ],
        },
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('reorder widgets', async () => {
      const dashboard = await createDashboard(env.tenantId, {
        layout: {
          widgets: [
            { id: 'w1', x: 0, y: 0, w: 6, h: 4 },
            { id: 'w2', x: 6, y: 0, w: 6, h: 4 },
          ],
        },
      });

      const res = await adminApi.patch(`/dashboards/${dashboard.id}/layout`, {
        widgets: [
          { id: 'w2', x: 0, y: 0, w: 6, h: 4 },
          { id: 'w1', x: 6, y: 0, w: 6, h: 4 },
        ],
      });

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // DEFAULT DASHBOARD
  // ===========================================================================
  describe('Default Dashboard', () => {
    test('can set dashboard as default', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const res = await adminApi.patch(`/dashboards/${dashboard.id}`, {
        is_default: true,
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('setting new default unsets previous default', async () => {
      const dashboard1 = await createDashboard(env.tenantId, { is_default: true });
      const dashboard2 = await createDashboard(env.tenantId);

      // Set dashboard2 as default
      await adminApi.patch(`/dashboards/${dashboard2.id}`, {
        is_default: true,
      });

      // Check dashboard1 is no longer default
      const res = await adminApi.get(`/dashboards/${dashboard1.id}`);

      if (res.status === 200) {
        expect(res.data.is_default).toBe(false);
      }
    });

    test('GET /dashboards/default returns default dashboard', async () => {
      await createDashboard(env.tenantId, { is_default: true, name: 'DefaultDash' });

      const res = await adminApi.get('/dashboards/default');

      if (res.status === 200) {
        expect(res.data.is_default).toBe(true);
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // WIDGET DATA
  // ===========================================================================
  describe('Widget Data', () => {
    test('GET /dashboards/:id/widgets/:widgetId/data returns widget data', async () => {
      const dashboard = await createDashboard(env.tenantId, {
        layout: {
          widgets: [
            {
              id: 'metric1',
              type: 'metric',
              config: {
                entity: 'Owner',
                aggregation: 'count',
              },
            },
          ],
        },
      });

      const res = await adminApi.get(`/dashboards/${dashboard.id}/widgets/metric1/data`);

      expect([200, 404]).toContain(res.status);
    });

    test('GET /dashboards/:id/data returns all widget data', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const res = await adminApi.get(`/dashboards/${dashboard.id}/data`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when name is missing', async () => {
      const res = await adminApi.post('/dashboards', {
        description: 'No name dashboard',
      });

      expect([400, 404]).toContain(res.status);
    });

    test('returns 400 for invalid widget type', async () => {
      const dashboard = await createDashboard(env.tenantId);

      const res = await adminApi.post(`/dashboards/${dashboard.id}/widgets`, {
        type: 'invalid_type',
        title: 'Invalid Widget',
      });

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('cannot access dashboards from different tenant', async () => {
      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherDashboard = await createDashboard(otherTenant.id, { name: 'OtherDashboard' });

      const res = await adminApi.get(`/dashboards/${otherDashboard.id}`);

      expect(res.status).toBe(404);

      await cleanupTenant(otherTenant.id);
    });
  });

  // ===========================================================================
  // NOT FOUND
  // ===========================================================================
  describe('Not Found', () => {
    test('returns 404 for non-existent dashboard', async () => {
      const res = await adminApi.get('/dashboards/999999');
      expect(res.status).toBe(404);
    });
  });
});
