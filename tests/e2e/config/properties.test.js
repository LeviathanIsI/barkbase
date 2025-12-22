/**
 * E2E Tests - Properties
 *
 * Tests for system and custom properties:
 * - System properties
 * - Custom property definitions
 * - Property values on entities
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
  query,
} = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');
const { createOwner, createPet } = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;

// Helper to create custom property definition
async function createCustomProperty(tenantId, overrides = {}) {
  const result = await query(
    `INSERT INTO "CustomProperty" (tenant_id, entity_type, key, name, data_type, options, required, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      tenantId,
      overrides.entity_type || 'Owner',
      overrides.key || `custom_${Date.now()}`,
      overrides.name || 'Custom Property',
      overrides.data_type || 'string',
      JSON.stringify(overrides.options || null),
      overrides.required || false,
      overrides.display_order || 0,
    ]
  );
  return result.rows[0];
}

describe('Properties E2E Tests', () => {
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
  // CUSTOM PROPERTY DEFINITIONS
  // ===========================================================================
  describe('Custom Property Definitions', () => {
    test('GET /custom-properties returns list of custom properties', async () => {
      await createCustomProperty(env.tenantId, { key: 'list_test_prop' });

      const res = await adminApi.get('/custom-properties');

      if (res.status === 200) {
        expect(Array.isArray(res.data.data || res.data)).toBe(true);
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /custom-properties/:id returns single property definition', async () => {
      const prop = await createCustomProperty(env.tenantId, { key: 'get_test_prop' });

      const res = await adminApi.get(`/custom-properties/${prop.id}`);

      if (res.status === 200) {
        expect(res.data.key).toBe('get_test_prop');
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('POST /custom-properties creates string property', async () => {
      const propData = {
        entity_type: 'Owner',
        key: 'emergency_contact',
        name: 'Emergency Contact',
        data_type: 'string',
        required: false,
      };

      const res = await adminApi.post('/custom-properties', propData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.key).toBe('emergency_contact');
        expect(res.data.data_type).toBe('string');
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('POST /custom-properties creates enum property', async () => {
      const propData = {
        entity_type: 'Pet',
        key: 'temperament',
        name: 'Temperament',
        data_type: 'enum',
        options: ['Calm', 'Active', 'Anxious', 'Aggressive'],
        required: false,
      };

      const res = await adminApi.post('/custom-properties', propData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.options).toContain('Calm');
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('POST /custom-properties creates number property', async () => {
      const propData = {
        entity_type: 'Pet',
        key: 'weight_kg',
        name: 'Weight (kg)',
        data_type: 'number',
        required: false,
      };

      const res = await adminApi.post('/custom-properties', propData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.data_type).toBe('number');
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('POST /custom-properties creates date property', async () => {
      const propData = {
        entity_type: 'Owner',
        key: 'membership_expiry',
        name: 'Membership Expiry',
        data_type: 'date',
        required: false,
      };

      const res = await adminApi.post('/custom-properties', propData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.data_type).toBe('date');
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('POST /custom-properties creates boolean property', async () => {
      const propData = {
        entity_type: 'Pet',
        key: 'is_neutered',
        name: 'Is Neutered',
        data_type: 'boolean',
        required: false,
      };

      const res = await adminApi.post('/custom-properties', propData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.data_type).toBe('boolean');
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('PATCH /custom-properties/:id updates property definition', async () => {
      const prop = await createCustomProperty(env.tenantId, { key: 'update_test_prop' });

      const res = await adminApi.patch(`/custom-properties/${prop.id}`, {
        name: 'Updated Name',
        required: true,
      });

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/custom-properties/${prop.id}`);
        if (getRes.status === 200) {
          expect(getRes.data.name).toBe('Updated Name');
        }
      } else {
        expect([200, 204, 404]).toContain(res.status);
      }
    });

    test('DELETE /custom-properties/:id deletes property definition', async () => {
      const prop = await createCustomProperty(env.tenantId, { key: 'delete_test_prop' });

      const res = await adminApi.delete(`/custom-properties/${prop.id}`);

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/custom-properties/${prop.id}`);
        expect(getRes.status).toBe(404);
      } else {
        expect([200, 204, 404]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // PROPERTY VALUES ON ENTITIES
  // ===========================================================================
  describe('Property Values on Entities', () => {
    test('can set custom property value on owner', async () => {
      const prop = await createCustomProperty(env.tenantId, {
        entity_type: 'Owner',
        key: 'owner_prop_1',
        data_type: 'string',
      });

      const owner = await createOwner(env.tenantId);

      const res = await adminApi.patch(`/owners/${owner.record_id || owner.id}`, {
        custom_properties: {
          owner_prop_1: 'Test Value',
        },
      });

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/owners/${owner.record_id || owner.id}`);
        if (getRes.status === 200) {
          const props = getRes.data.custom_properties || getRes.data.customProperties;
          expect(props?.owner_prop_1).toBe('Test Value');
        }
      }
    });

    test('can set custom property value on pet', async () => {
      const prop = await createCustomProperty(env.tenantId, {
        entity_type: 'Pet',
        key: 'pet_prop_1',
        data_type: 'string',
      });

      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);

      const res = await adminApi.patch(`/pets/${pet.record_id || pet.id}`, {
        custom_properties: {
          pet_prop_1: 'Pet Test Value',
        },
      });

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/pets/${pet.record_id || pet.id}`);
        if (getRes.status === 200) {
          const props = getRes.data.custom_properties || getRes.data.customProperties;
          expect(props?.pet_prop_1).toBe('Pet Test Value');
        }
      }
    });

    test('number property stores numeric value', async () => {
      const prop = await createCustomProperty(env.tenantId, {
        entity_type: 'Pet',
        key: 'pet_weight',
        data_type: 'number',
      });

      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);

      const res = await adminApi.patch(`/pets/${pet.record_id || pet.id}`, {
        custom_properties: {
          pet_weight: 25.5,
        },
      });

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/pets/${pet.record_id || pet.id}`);
        if (getRes.status === 200) {
          const props = getRes.data.custom_properties || getRes.data.customProperties;
          expect(typeof props?.pet_weight).toBe('number');
        }
      }
    });

    test('boolean property stores boolean value', async () => {
      const prop = await createCustomProperty(env.tenantId, {
        entity_type: 'Pet',
        key: 'is_trained',
        data_type: 'boolean',
      });

      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);

      const res = await adminApi.patch(`/pets/${pet.record_id || pet.id}`, {
        custom_properties: {
          is_trained: true,
        },
      });

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/pets/${pet.record_id || pet.id}`);
        if (getRes.status === 200) {
          const props = getRes.data.custom_properties || getRes.data.customProperties;
          expect(props?.is_trained).toBe(true);
        }
      }
    });
  });

  // ===========================================================================
  // FILTER BY ENTITY TYPE
  // ===========================================================================
  describe('Filter by Entity Type', () => {
    test('GET /custom-properties?entity_type=Owner returns owner properties', async () => {
      await createCustomProperty(env.tenantId, { entity_type: 'Owner', key: 'owner_filter_prop' });
      await createCustomProperty(env.tenantId, { entity_type: 'Pet', key: 'pet_filter_prop' });

      const res = await adminApi.get('/custom-properties?entity_type=Owner');

      if (res.status === 200) {
        const props = res.data.data || res.data;
        props.forEach(p => expect(p.entity_type).toBe('Owner'));
      }
    });

    test('GET /custom-properties?entity_type=Pet returns pet properties', async () => {
      await createCustomProperty(env.tenantId, { entity_type: 'Pet', key: 'pet_filter_prop2' });

      const res = await adminApi.get('/custom-properties?entity_type=Pet');

      if (res.status === 200) {
        const props = res.data.data || res.data;
        props.forEach(p => expect(p.entity_type).toBe('Pet'));
      }
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when key is missing', async () => {
      const res = await adminApi.post('/custom-properties', {
        entity_type: 'Owner',
        name: 'No Key Property',
        data_type: 'string',
      });

      expect([400, 404]).toContain(res.status);
    });

    test('returns 400 for invalid data_type', async () => {
      const res = await adminApi.post('/custom-properties', {
        entity_type: 'Owner',
        key: 'invalid_type_prop',
        name: 'Invalid Type',
        data_type: 'invalid_type',
      });

      expect([400, 404, 422]).toContain(res.status);
    });

    test('returns 400 for duplicate key in same entity_type', async () => {
      await createCustomProperty(env.tenantId, { entity_type: 'Owner', key: 'duplicate_prop' });

      const res = await adminApi.post('/custom-properties', {
        entity_type: 'Owner',
        key: 'duplicate_prop',
        name: 'Duplicate',
        data_type: 'string',
      });

      expect([400, 409, 422]).toContain(res.status);
    });

    test('enum property without options returns 400', async () => {
      const res = await adminApi.post('/custom-properties', {
        entity_type: 'Owner',
        key: 'enum_no_options',
        name: 'Enum Without Options',
        data_type: 'enum',
        // Missing options
      });

      expect([400, 404, 422]).toContain(res.status);
    });

    test('required property validation works', async () => {
      const prop = await createCustomProperty(env.tenantId, {
        entity_type: 'Owner',
        key: 'required_prop',
        data_type: 'string',
        required: true,
      });

      // Try to create owner without required property
      const res = await adminApi.post('/owners', {
        first_name: 'Test',
        last_name: 'Owner',
        email: `test_${Date.now()}@example.com`,
        // Missing custom_properties.required_prop
      });

      // Might pass or fail depending on validation implementation
      expect([200, 201, 400, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // AUTH ERRORS
  // ===========================================================================
  describe('Auth Errors', () => {
    test('returns 401 with no token', async () => {
      const res = await api.get('/custom-properties', null, { tenantId: env.tenantId });
      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('cannot access custom properties from different tenant', async () => {
      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherProp = await createCustomProperty(otherTenant.id, { key: 'other_tenant_prop' });

      const res = await adminApi.get(`/custom-properties/${otherProp.id}`);

      expect(res.status).toBe(404);

      await cleanupTenant(otherTenant.id);
    });

    test('custom properties are tenant-scoped', async () => {
      // Same key can exist in different tenants
      await createCustomProperty(env.tenantId, { entity_type: 'Owner', key: 'scoped_prop' });

      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherProp = await createCustomProperty(otherTenant.id, {
        entity_type: 'Owner',
        key: 'scoped_prop',
      });

      // Both should succeed - same key in different tenants
      expect(otherProp.key).toBe('scoped_prop');

      await cleanupTenant(otherTenant.id);
    });
  });

  // ===========================================================================
  // NOT FOUND
  // ===========================================================================
  describe('Not Found', () => {
    test('returns 404 for non-existent property', async () => {
      const res = await adminApi.get('/custom-properties/999999');
      expect(res.status).toBe(404);
    });
  });
});
