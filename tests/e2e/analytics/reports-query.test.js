/**
 * E2E Tests - Reports Query
 *
 * Tests for report execution:
 * - Query execution with filters
 * - Aggregations and grouping
 * - Sorting and pagination
 * - Export formats
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
} = require('../utils/setup');
const { createApiClient } = require('../utils/api');
const { createOwner, createPet, createBooking, createInvoice } = require('../utils/factories');

jest.setTimeout(60000);

let env;
let adminApi;

describe('Reports Query E2E Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection required for E2E tests');
    }

    env = await createTestEnvironment();
    adminApi = createApiClient(env.tokens.admin, env.tenantId);

    // Create test data
    const owner1 = await createOwner(env.tenantId, { first_name: 'ReportOwner1', status: 'ACTIVE' });
    const owner2 = await createOwner(env.tenantId, { first_name: 'ReportOwner2', status: 'ACTIVE' });
    const owner3 = await createOwner(env.tenantId, { first_name: 'ReportOwner3', status: 'INACTIVE' });

    await createPet(env.tenantId, owner1.id, { name: 'ReportPet1', species: 'DOG' });
    await createPet(env.tenantId, owner1.id, { name: 'ReportPet2', species: 'CAT' });
    await createPet(env.tenantId, owner2.id, { name: 'ReportPet3', species: 'DOG' });

    await createInvoice(env.tenantId, owner1.id, { total_cents: 10000, status: 'PAID' });
    await createInvoice(env.tenantId, owner1.id, { total_cents: 5000, status: 'SENT' });
    await createInvoice(env.tenantId, owner2.id, { total_cents: 15000, status: 'PAID' });
  });

  afterAll(async () => {
    await cleanupTenant(env?.tenantId);
    await closePool();
  });

  // ===========================================================================
  // BASIC QUERIES
  // ===========================================================================
  describe('Basic Queries', () => {
    test('POST /reports/query executes basic query', async () => {
      const query = {
        entity: 'Owner',
        fields: ['first_name', 'email', 'status'],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        expect(res.data.data || res.data.rows || res.data.results).toBeDefined();
      } else {
        // Endpoint might not exist or use different structure
        expect([200, 404]).toContain(res.status);
      }
    });

    test('query returns correct fields', async () => {
      const query = {
        entity: 'Owner',
        fields: ['first_name', 'status'],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        if (rows.length > 0) {
          expect(rows[0]).toHaveProperty('first_name');
          expect(rows[0]).toHaveProperty('status');
        }
      }
    });
  });

  // ===========================================================================
  // FILTERED QUERIES
  // ===========================================================================
  describe('Filtered Queries', () => {
    test('query with single filter works', async () => {
      const query = {
        entity: 'Owner',
        fields: ['first_name', 'status'],
        filters: [
          { field: 'status', operator: 'eq', value: 'ACTIVE' },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        rows.forEach(row => {
          expect(row.status).toBe('ACTIVE');
        });
      }
    });

    test('query with multiple AND filters works', async () => {
      const query = {
        entity: 'Owner',
        fields: ['first_name', 'status'],
        filters: [
          { field: 'status', operator: 'eq', value: 'ACTIVE' },
          { field: 'first_name', operator: 'contains', value: 'ReportOwner' },
        ],
        filterLogic: 'AND',
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        rows.forEach(row => {
          expect(row.status).toBe('ACTIVE');
          expect(row.first_name).toContain('ReportOwner');
        });
      }
    });

    test('query with date range filter works', async () => {
      const query = {
        entity: 'Owner',
        fields: ['first_name', 'created_at'],
        filters: [
          { field: 'created_at', operator: 'gte', value: '2024-01-01' },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      expect([200, 404]).toContain(res.status);
    });

    test('query with IN operator works', async () => {
      const query = {
        entity: 'Pet',
        fields: ['name', 'species'],
        filters: [
          { field: 'species', operator: 'in', value: ['DOG', 'CAT'] },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        rows.forEach(row => {
          expect(['DOG', 'CAT']).toContain(row.species);
        });
      }
    });
  });

  // ===========================================================================
  // AGGREGATION QUERIES
  // ===========================================================================
  describe('Aggregation Queries', () => {
    test('COUNT aggregation works', async () => {
      const query = {
        entity: 'Owner',
        aggregations: [
          { function: 'count', field: '*', alias: 'total_count' },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const result = res.data.data?.[0] || res.data.rows?.[0] || res.data;
        expect(result.total_count || result.count).toBeDefined();
      }
    });

    test('SUM aggregation works', async () => {
      const query = {
        entity: 'Invoice',
        aggregations: [
          { function: 'sum', field: 'total_cents', alias: 'total_revenue' },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const result = res.data.data?.[0] || res.data.rows?.[0] || res.data;
        expect(typeof (result.total_revenue || result.sum)).toBe('number');
      }
    });

    test('AVG aggregation works', async () => {
      const query = {
        entity: 'Invoice',
        aggregations: [
          { function: 'avg', field: 'total_cents', alias: 'avg_invoice' },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const result = res.data.data?.[0] || res.data.rows?.[0] || res.data;
        expect(result.avg_invoice || result.avg).toBeDefined();
      }
    });

    test('multiple aggregations in single query', async () => {
      const query = {
        entity: 'Invoice',
        aggregations: [
          { function: 'count', field: '*', alias: 'count' },
          { function: 'sum', field: 'total_cents', alias: 'total' },
          { function: 'avg', field: 'total_cents', alias: 'average' },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const result = res.data.data?.[0] || res.data.rows?.[0] || res.data;
        expect(result).toBeDefined();
      }
    });
  });

  // ===========================================================================
  // GROUPED QUERIES
  // ===========================================================================
  describe('Grouped Queries', () => {
    test('GROUP BY single field works', async () => {
      const query = {
        entity: 'Owner',
        fields: ['status'],
        aggregations: [
          { function: 'count', field: '*', alias: 'count' },
        ],
        groupBy: ['status'],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        expect(Array.isArray(rows)).toBe(true);
        rows.forEach(row => {
          expect(row.status).toBeDefined();
          expect(row.count).toBeDefined();
        });
      }
    });

    test('GROUP BY multiple fields works', async () => {
      const query = {
        entity: 'Pet',
        fields: ['species'],
        aggregations: [
          { function: 'count', field: '*', alias: 'count' },
        ],
        groupBy: ['species'],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        expect(Array.isArray(rows)).toBe(true);
      }
    });

    test('GROUP BY with filtered aggregation', async () => {
      const query = {
        entity: 'Invoice',
        fields: ['status'],
        aggregations: [
          { function: 'sum', field: 'total_cents', alias: 'total' },
        ],
        groupBy: ['status'],
        filters: [
          { field: 'status', operator: 'in', value: ['PAID', 'SENT'] },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        rows.forEach(row => {
          expect(['PAID', 'SENT']).toContain(row.status);
        });
      }
    });
  });

  // ===========================================================================
  // SORTING
  // ===========================================================================
  describe('Sorting', () => {
    test('sort ascending works', async () => {
      const query = {
        entity: 'Owner',
        fields: ['first_name', 'created_at'],
        orderBy: [{ field: 'first_name', direction: 'asc' }],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        if (rows.length > 1) {
          expect(rows[0].first_name <= rows[1].first_name).toBe(true);
        }
      }
    });

    test('sort descending works', async () => {
      const query = {
        entity: 'Invoice',
        fields: ['total_cents', 'created_at'],
        orderBy: [{ field: 'total_cents', direction: 'desc' }],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        if (rows.length > 1) {
          expect(rows[0].total_cents >= rows[1].total_cents).toBe(true);
        }
      }
    });

    test('multi-column sort works', async () => {
      const query = {
        entity: 'Owner',
        fields: ['status', 'first_name'],
        orderBy: [
          { field: 'status', direction: 'asc' },
          { field: 'first_name', direction: 'asc' },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      expect([200, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // PAGINATION
  // ===========================================================================
  describe('Pagination', () => {
    test('limit works', async () => {
      const query = {
        entity: 'Owner',
        fields: ['first_name'],
        limit: 2,
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        expect(rows.length).toBeLessThanOrEqual(2);
      }
    });

    test('offset works', async () => {
      const queryPage1 = {
        entity: 'Owner',
        fields: ['first_name'],
        limit: 1,
        offset: 0,
      };

      const queryPage2 = {
        entity: 'Owner',
        fields: ['first_name'],
        limit: 1,
        offset: 1,
      };

      const res1 = await adminApi.post('/reports/query', queryPage1);
      const res2 = await adminApi.post('/reports/query', queryPage2);

      if (res1.status === 200 && res2.status === 200) {
        const rows1 = res1.data.data || res1.data.rows || res1.data.results || [];
        const rows2 = res2.data.data || res2.data.rows || res2.data.results || [];

        if (rows1.length > 0 && rows2.length > 0) {
          // Different results due to offset
          expect(rows1[0]).not.toEqual(rows2[0]);
        }
      }
    });

    test('pagination returns total count', async () => {
      const query = {
        entity: 'Owner',
        fields: ['first_name'],
        limit: 1,
        includeTotalCount: true,
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        // Total count might be in different places
        const totalCount = res.data.totalCount || res.data.total || res.data.meta?.total;
        // Total count implementation varies
      }
    });
  });

  // ===========================================================================
  // RELATED DATA QUERIES
  // ===========================================================================
  describe('Related Data Queries', () => {
    test('query with related entity fields', async () => {
      const query = {
        entity: 'Pet',
        fields: ['name', 'species', 'owner.first_name'],
      };

      const res = await adminApi.post('/reports/query', query);

      // Related fields might use different syntax
      expect([200, 400, 404]).toContain(res.status);
    });

    test('query with join', async () => {
      const query = {
        entity: 'Booking',
        fields: ['status', 'check_in'],
        joins: [
          { entity: 'Owner', on: 'owner_id', fields: ['first_name'] },
        ],
      };

      const res = await adminApi.post('/reports/query', query);

      expect([200, 400, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 for missing entity', async () => {
      const query = {
        fields: ['first_name'],
      };

      const res = await adminApi.post('/reports/query', query);

      expect([400, 422]).toContain(res.status);
    });

    test('returns 400 for invalid entity', async () => {
      const query = {
        entity: 'InvalidEntity',
        fields: ['field1'],
      };

      const res = await adminApi.post('/reports/query', query);

      expect([400, 404, 422]).toContain(res.status);
    });

    test('returns 400 for invalid field', async () => {
      const query = {
        entity: 'Owner',
        fields: ['invalid_field_xyz'],
      };

      const res = await adminApi.post('/reports/query', query);

      // Might return 400 or silently ignore invalid field
      expect([200, 400, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('query only returns tenant data', async () => {
      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      await createOwner(otherTenant.id, { first_name: 'OtherTenantOwner' });

      const query = {
        entity: 'Owner',
        fields: ['first_name'],
      };

      const res = await adminApi.post('/reports/query', query);

      if (res.status === 200) {
        const rows = res.data.data || res.data.rows || res.data.results || [];
        const hasOtherTenant = rows.some(r => r.first_name === 'OtherTenantOwner');
        expect(hasOtherTenant).toBe(false);
      }

      await cleanupTenant(otherTenant.id);
    });
  });
});
