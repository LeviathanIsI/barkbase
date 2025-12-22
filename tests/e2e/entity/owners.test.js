/**
 * E2E Tests - Owners
 *
 * Full CRUD operations + search + pagination for Owner entity.
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
  getAuthToken,
  getExpiredToken,
  getInvalidToken,
} = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');
const { createOwner, createPet } = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;

describe('Owners E2E Tests', () => {
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
    test('GET /owners returns list of owners', async () => {
      // Create some test data
      await createOwner(env.tenantId);
      await createOwner(env.tenantId);

      const res = await adminApi.get('/owners');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data || res.data)).toBe(true);
    });

    test('GET /owners/:id returns single owner', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.get(`/owners/${owner.record_id || owner.id}`);

      expect(res.status).toBe(200);
      expect(res.data.first_name).toBe(owner.first_name);
      expect(res.data.last_name).toBe(owner.last_name);
    });

    test('POST /owners creates new owner', async () => {
      const ownerData = {
        first_name: 'New',
        last_name: 'Owner',
        email: `new-owner-${Date.now()}@example.com`,
        phone: '+15551234567',
      };

      const res = await adminApi.post('/owners', ownerData);

      expect([200, 201]).toContain(res.status);
      expect(res.data.first_name).toBe(ownerData.first_name);
      expect(res.data.last_name).toBe(ownerData.last_name);
      expect(res.data.email).toBe(ownerData.email);
    });

    test('PATCH /owners/:id updates owner', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.patch(`/owners/${owner.record_id || owner.id}`, {
        first_name: 'Updated',
        phone: '+15559999999',
      });

      expect([200, 204]).toContain(res.status);

      // Verify update
      const getRes = await adminApi.get(`/owners/${owner.record_id || owner.id}`);
      expect(getRes.data.first_name).toBe('Updated');
    });

    test('DELETE /owners/:id soft-deletes owner', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.delete(`/owners/${owner.record_id || owner.id}`);

      expect([200, 204]).toContain(res.status);

      // Verify deleted (should return 404)
      const getRes = await adminApi.get(`/owners/${owner.record_id || owner.id}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ===========================================================================
  // VALIDATION ERROR TESTS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when first_name is missing', async () => {
      const res = await adminApi.post('/owners', {
        last_name: 'Only',
        email: 'test@example.com',
      });

      expect(res.status).toBe(400);
      expect(res.data.error || res.data.message).toMatch(/first_name|required/i);
    });

    test('returns 400 when last_name is missing', async () => {
      const res = await adminApi.post('/owners', {
        first_name: 'Only',
        email: 'test@example.com',
      });

      expect(res.status).toBe(400);
      expect(res.data.error || res.data.message).toMatch(/last_name|required/i);
    });

    test('returns 400 for invalid email format', async () => {
      const res = await adminApi.post('/owners', {
        first_name: 'Test',
        last_name: 'User',
        email: 'not-an-email',
      });

      expect(res.status).toBe(400);
      expect(res.data.error || res.data.message).toMatch(/email|invalid/i);
    });

    test('returns 400 for empty request body', async () => {
      const res = await adminApi.post('/owners', {});

      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // AUTH ERROR TESTS
  // ===========================================================================
  describe('Auth Errors', () => {
    test('returns 401 with no token', async () => {
      const res = await api.get('/owners', null, { tenantId: env.tenantId });

      expect(res.status).toBe(401);
    });

    test('returns 401 with invalid token', async () => {
      const res = await api.get('/owners', getInvalidToken(), { tenantId: env.tenantId });

      expect(res.status).toBe(401);
    });

    test('returns 401 with expired token', async () => {
      const expiredToken = getExpiredToken(env.users.admin);
      const res = await api.get('/owners', expiredToken, { tenantId: env.tenantId });

      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION TESTS
  // ===========================================================================
  describe('Tenant Isolation', () => {
    let otherTenant;
    let otherUser;
    let otherToken;
    let ownerInOtherTenant;

    beforeAll(async () => {
      const { createTestTenant, createTestUser, getAuthToken } = require('../utils/setup');
      otherTenant = await createTestTenant({ name: 'Other Tenant' });
      otherUser = await createTestUser(otherTenant.id, 'ADMIN');
      otherToken = getAuthToken(otherUser);
      ownerInOtherTenant = await createOwner(otherTenant.id);
    });

    afterAll(async () => {
      await cleanupTenant(otherTenant?.id);
    });

    test('cannot access owners from different tenant (returns 404)', async () => {
      const res = await adminApi.get(`/owners/${ownerInOtherTenant.record_id || ownerInOtherTenant.id}`);

      // Should return 404, not 403 (don't leak existence)
      expect(res.status).toBe(404);
    });

    test('cannot update owners from different tenant', async () => {
      const res = await adminApi.patch(`/owners/${ownerInOtherTenant.record_id || ownerInOtherTenant.id}`, {
        first_name: 'Hacked',
      });

      expect(res.status).toBe(404);
    });

    test('cannot delete owners from different tenant', async () => {
      const res = await adminApi.delete(`/owners/${ownerInOtherTenant.record_id || ownerInOtherTenant.id}`);

      expect(res.status).toBe(404);
    });

    test('list only returns owners from own tenant', async () => {
      // Create owner in our tenant
      await createOwner(env.tenantId, { first_name: 'OurTenant' });

      const res = await adminApi.get('/owners');

      expect(res.status).toBe(200);
      const owners = res.data.data || res.data;

      // None should have the other tenant's owner
      const hasOtherTenantOwner = owners.some(
        o => o.id === ownerInOtherTenant.id || o.first_name === ownerInOtherTenant.first_name
      );
      expect(hasOtherTenantOwner).toBe(false);
    });
  });

  // ===========================================================================
  // NOT FOUND TESTS
  // ===========================================================================
  describe('Not Found', () => {
    test('returns 404 for non-existent owner ID', async () => {
      const res = await adminApi.get('/owners/own_nonexistent123');

      expect(res.status).toBe(404);
    });

    test('returns 404 for invalid UUID format', async () => {
      const res = await adminApi.get('/owners/not-a-valid-id');

      expect([400, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // SEARCH & PAGINATION
  // ===========================================================================
  describe('Search & Pagination', () => {
    beforeAll(async () => {
      // Create 25 owners for pagination testing
      const promises = [];
      for (let i = 0; i < 25; i++) {
        promises.push(createOwner(env.tenantId, {
          first_name: `Pagination${i}`,
          last_name: 'Test',
        }));
      }
      await Promise.all(promises);
    });

    test('respects limit parameter', async () => {
      const res = await adminApi.get('/owners?limit=10');

      expect(res.status).toBe(200);
      const owners = res.data.data || res.data;
      expect(owners.length).toBeLessThanOrEqual(10);
    });

    test('respects offset parameter', async () => {
      const page1 = await adminApi.get('/owners?limit=10&offset=0');
      const page2 = await adminApi.get('/owners?limit=10&offset=10');

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      const owners1 = page1.data.data || page1.data;
      const owners2 = page2.data.data || page2.data;

      // Ensure different results
      if (owners1.length > 0 && owners2.length > 0) {
        expect(owners1[0].id).not.toBe(owners2[0].id);
      }
    });

    test('search by name works', async () => {
      const uniqueName = `UniqueSearch${Date.now()}`;
      await createOwner(env.tenantId, { first_name: uniqueName });

      const res = await adminApi.get(`/owners?search=${uniqueName}`);

      expect(res.status).toBe(200);
      const owners = res.data.data || res.data;
      expect(owners.some(o => o.first_name === uniqueName)).toBe(true);
    });

    test('search by email works', async () => {
      const uniqueEmail = `unique-${Date.now()}@searchtest.com`;
      await createOwner(env.tenantId, { email: uniqueEmail });

      const res = await adminApi.get(`/owners?search=${uniqueEmail}`);

      expect(res.status).toBe(200);
      const owners = res.data.data || res.data;
      expect(owners.some(o => o.email === uniqueEmail)).toBe(true);
    });

    test('filter by is_active works', async () => {
      await createOwner(env.tenantId, { is_active: false, first_name: 'Inactive' });

      const activeRes = await adminApi.get('/owners?is_active=true');
      const inactiveRes = await adminApi.get('/owners?is_active=false');

      expect(activeRes.status).toBe(200);
      expect(inactiveRes.status).toBe(200);

      const activeOwners = activeRes.data.data || activeRes.data;
      const inactiveOwners = inactiveRes.data.data || inactiveRes.data;

      // All active owners should have is_active=true
      activeOwners.forEach(o => expect(o.is_active).toBe(true));
      // All inactive owners should have is_active=false
      inactiveOwners.forEach(o => expect(o.is_active).toBe(false));
    });
  });

  // ===========================================================================
  // ASSOCIATIONS
  // ===========================================================================
  describe('Associations', () => {
    test('GET /owners/:id/pets returns owner pets', async () => {
      const owner = await createOwner(env.tenantId);
      await createPet(env.tenantId, owner.id, { name: 'Pet1' });
      await createPet(env.tenantId, owner.id, { name: 'Pet2' });

      const res = await adminApi.get(`/owners/${owner.record_id || owner.id}/pets`);

      expect(res.status).toBe(200);
      const pets = res.data.data || res.data;
      expect(pets.length).toBeGreaterThanOrEqual(2);
    });

    test('owner includes pet_count or pets when requested', async () => {
      const owner = await createOwner(env.tenantId);
      await createPet(env.tenantId, owner.id);
      await createPet(env.tenantId, owner.id);

      const res = await adminApi.get(`/owners/${owner.record_id || owner.id}?include=pets`);

      expect(res.status).toBe(200);
      // Check if pets are included or pet_count is provided
      expect(res.data.pets || res.data.pet_count !== undefined).toBe(true);
    });
  });
});
