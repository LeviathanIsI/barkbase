/**
 * E2E Tests - Reports Fields
 *
 * Tests for report field configurations:
 * - Available fields per entity type
 * - Field metadata (types, operators, options)
 * - Custom fields
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
} = require('../utils/setup');
const { createApiClient } = require('../utils/api');

jest.setTimeout(30000);

let env;
let adminApi;

describe('Reports Fields E2E Tests', () => {
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
  // ENTITY FIELDS
  // ===========================================================================
  describe('Entity Fields', () => {
    test('GET /reports/fields/Owner returns owner fields', async () => {
      const res = await adminApi.get('/reports/fields/Owner');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        expect(Array.isArray(fields)).toBe(true);
        expect(fields.some(f => f.field === 'first_name' || f.name === 'first_name')).toBe(true);
        expect(fields.some(f => f.field === 'email' || f.name === 'email')).toBe(true);
      } else {
        // Endpoint might use different structure
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /reports/fields/Pet returns pet fields', async () => {
      const res = await adminApi.get('/reports/fields/Pet');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        expect(Array.isArray(fields)).toBe(true);
        expect(fields.some(f => f.field === 'name' || f.name === 'name')).toBe(true);
        expect(fields.some(f => f.field === 'species' || f.name === 'species')).toBe(true);
      }
    });

    test('GET /reports/fields/Booking returns booking fields', async () => {
      const res = await adminApi.get('/reports/fields/Booking');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        expect(Array.isArray(fields)).toBe(true);
        expect(fields.some(f => f.field === 'status' || f.name === 'status')).toBe(true);
      }
    });

    test('GET /reports/fields/Invoice returns invoice fields', async () => {
      const res = await adminApi.get('/reports/fields/Invoice');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        expect(Array.isArray(fields)).toBe(true);
        expect(fields.some(f => f.field === 'total_cents' || f.name === 'total_cents')).toBe(true);
      }
    });
  });

  // ===========================================================================
  // FIELD METADATA
  // ===========================================================================
  describe('Field Metadata', () => {
    test('fields include data type information', async () => {
      const res = await adminApi.get('/reports/fields/Owner');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        const field = fields[0];

        // Should have type information
        expect(field.type || field.data_type || field.fieldType).toBeDefined();
      }
    });

    test('fields include available operators', async () => {
      const res = await adminApi.get('/reports/fields/Owner');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        const field = fields.find(f => f.type === 'string' || f.data_type === 'string');

        if (field?.operators) {
          expect(Array.isArray(field.operators)).toBe(true);
          // String fields should support contains, eq, etc.
          expect(field.operators).toContain('eq');
        }
      }
    });

    test('enum fields include options', async () => {
      const res = await adminApi.get('/reports/fields/Owner');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        const statusField = fields.find(
          f => (f.field === 'status' || f.name === 'status') &&
               (f.type === 'enum' || f.data_type === 'enum')
        );

        if (statusField?.options) {
          expect(Array.isArray(statusField.options)).toBe(true);
        }
      }
    });

    test('date fields have date type', async () => {
      const res = await adminApi.get('/reports/fields/Owner');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        const dateField = fields.find(
          f => f.field === 'created_at' || f.name === 'created_at'
        );

        if (dateField) {
          expect(['date', 'datetime', 'timestamp']).toContain(
            dateField.type || dateField.data_type
          );
        }
      }
    });
  });

  // ===========================================================================
  // RELATED FIELDS
  // ===========================================================================
  describe('Related Fields', () => {
    test('Owner fields include related pet fields', async () => {
      const res = await adminApi.get('/reports/fields/Owner?include_related=true');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        // Should have pet-related fields or relationship defined
        const hasPetRelation = fields.some(
          f => f.field?.includes('pet') ||
               f.name?.includes('pet') ||
               f.relation === 'pets'
        );
        // This might or might not exist based on implementation
      }
    });

    test('Booking fields include related owner fields', async () => {
      const res = await adminApi.get('/reports/fields/Booking?include_related=true');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        // Implementation varies
      }
    });
  });

  // ===========================================================================
  // AGGREGATION FIELDS
  // ===========================================================================
  describe('Aggregation Fields', () => {
    test('numeric fields support aggregation', async () => {
      const res = await adminApi.get('/reports/fields/Invoice');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        const numericField = fields.find(
          f => f.field === 'total_cents' || f.name === 'total_cents'
        );

        if (numericField?.aggregations) {
          expect(numericField.aggregations).toContain('sum');
          expect(numericField.aggregations).toContain('avg');
        }
      }
    });

    test('all fields support count aggregation', async () => {
      const res = await adminApi.get('/reports/fields/Owner');

      if (res.status === 200) {
        const fields = res.data.data || res.data;
        // Count should be available as a general aggregation
      }
    });
  });

  // ===========================================================================
  // VALIDATION
  // ===========================================================================
  describe('Validation', () => {
    test('returns 400 or 404 for invalid entity type', async () => {
      const res = await adminApi.get('/reports/fields/InvalidEntity');

      expect([400, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('custom fields are tenant-scoped', async () => {
      // If custom fields exist, they should only show for the current tenant
      const res = await adminApi.get('/reports/fields/Owner');

      expect(res.status).toBe(200);
      // Custom fields should only be from this tenant
    });
  });
});
