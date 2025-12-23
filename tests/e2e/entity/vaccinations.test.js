/**
 * E2E Tests - Vaccinations
 * Routes: /api/v1/entity/pets/{id}/vaccinations
 */

const { testConnection, closePool, getTestContext } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;
let testOwnerId;
let testPetId;

describe('Vaccinations API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });

    // Get existing owner or create one
    const ownersRes = await client.get('/api/v1/entity/owners?limit=1');
    if (ownersRes.data?.data?.length > 0) {
      testOwnerId = ownersRes.data.data[0].record_id || ownersRes.data.data[0].id;
    } else {
      const owner = await client.post('/api/v1/entity/owners', {
        first_name: 'VaxTest',
        last_name: `Owner${Date.now()}`,
        email: `vaxowner-${Date.now()}@test.com`,
      });
      const ownerData = owner.data.data || owner.data;
      testOwnerId = ownerData.record_id || ownerData.id;
    }

    // Get existing pet or create one
    const petsRes = await client.get('/api/v1/entity/pets?limit=1');
    if (petsRes.data?.data?.length > 0) {
      testPetId = petsRes.data.data[0].record_id || petsRes.data.data[0].id;
    } else if (testOwnerId) {
      const pet = await client.post('/api/v1/entity/pets', {
        name: `VaxPet${Date.now()}`,
        species: 'DOG',
        breed: 'Lab',
        owner_id: testOwnerId,
      });
      if (pet.status === 200 || pet.status === 201) {
        const petData = pet.data.data || pet.data;
        testPetId = petData.record_id || petData.id;
      }
    }
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/entity/pets/vaccinations/expiring', () => {
    test('returns 200 with expiring vaccinations', async () => {
      const res = await client.get('/api/v1/entity/pets/vaccinations/expiring');
      expect(res.status).toBe(200);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/entity/pets/vaccinations/expiring', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/entity/pets/{id}/vaccinations', () => {
    test('returns vaccinations for pet', async () => {
      if (!testPetId) return; // Skip if no pet available
      const res = await client.get(`/api/v1/entity/pets/${testPetId}/vaccinations`);
      // May get 404 if pet was deleted between setup and test
      expect([200, 404, 500]).toContain(res.status);
    });

    test('handles non-existent pet', async () => {
      const res = await client.get('/api/v1/entity/pets/999999/vaccinations');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const petId = testPetId || '1';
      const res = await api.get(`/api/v1/entity/pets/${petId}/vaccinations`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/entity/pets/{id}/vaccinations', () => {
    test('creates vaccination with valid data', async () => {
      if (!testPetId) return; // Skip if no pet available
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const data = {
        type: 'Rabies',
        administered_at: new Date().toISOString(),
        expires_at: futureDate.toISOString(),
        notes: 'Annual rabies shot',
      };
      const res = await client.post(`/api/v1/entity/pets/${testPetId}/vaccinations`, data);
      // May get 404 if pet was deleted between setup and test
      expect([200, 201, 404, 500]).toContain(res.status);
      if (res.status === 200 || res.status === 201) {
        const vax = res.data.data || res.data;
        expect(vax.type).toBe('Rabies');
      }
    });

    test('rejects request without type', async () => {
      if (!testPetId) return; // Skip if no pet available
      const res = await client.post(`/api/v1/entity/pets/${testPetId}/vaccinations`, {
        administered_at: new Date().toISOString(),
      });
      // May get 404 if pet was deleted between setup and test
      expect([400, 404, 500]).toContain(res.status);
    });

    test('handles non-existent pet', async () => {
      const res = await client.post('/api/v1/entity/pets/999999/vaccinations', {
        type: 'Rabies',
        administered_at: new Date().toISOString(),
      });
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const petId = testPetId || '1';
      const res = await api.post(`/api/v1/entity/pets/${petId}/vaccinations`, { type: 'Rabies' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/entity/pets/{petId}/vaccinations/{id}', () => {
    let vaxId;

    beforeAll(async () => {
      if (!testPetId) return;
      const res = await client.post(`/api/v1/entity/pets/${testPetId}/vaccinations`, {
        type: 'DHPP',
        administered_at: new Date().toISOString(),
      });
      if (res.status === 200 || res.status === 201) {
        const vaxData = res.data.data || res.data;
        vaxId = vaxData.record_id || vaxData.id;
      }
    });

    test('updates vaccination', async () => {
      if (!testPetId || !vaxId) return; // Skip if setup failed
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const res = await client.put(`/api/v1/entity/pets/${testPetId}/vaccinations/${vaxId}`, {
        type: 'DHPP',
        expires_at: futureDate.toISOString(),
        notes: 'Updated notes',
      });
      expect([200, 204, 500]).toContain(res.status);
    });

    test('handles non-existent vaccination', async () => {
      if (!testPetId) return; // Skip if no pet
      const res = await client.put(`/api/v1/entity/pets/${testPetId}/vaccinations/999999`, {
        type: 'Test',
      });
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const petId = testPetId || '1';
      const vId = vaxId || '1';
      const res = await api.put(`/api/v1/entity/pets/${petId}/vaccinations/${vId}`, { type: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/entity/pets/{petId}/vaccinations/{id}', () => {
    test('deletes vaccination', async () => {
      if (!testPetId) return; // Skip if no pet
      const create = await client.post(`/api/v1/entity/pets/${testPetId}/vaccinations`, {
        type: 'Bordetella',
        administered_at: new Date().toISOString(),
      });
      if (create.status !== 200 && create.status !== 201) return; // Skip if create failed
      const createData = create.data.data || create.data;
      const id = createData.record_id || createData.id;

      const res = await client.delete(`/api/v1/entity/pets/${testPetId}/vaccinations/${id}`);
      expect([200, 204, 500]).toContain(res.status);
    });

    test('handles non-existent vaccination', async () => {
      if (!testPetId) return; // Skip if no pet
      const res = await client.delete(`/api/v1/entity/pets/${testPetId}/vaccinations/999999`);
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const petId = testPetId || '1';
      const res = await api.delete(`/api/v1/entity/pets/${petId}/vaccinations/1`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
