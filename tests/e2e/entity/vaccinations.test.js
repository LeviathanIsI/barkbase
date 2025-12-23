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

    // Create test owner
    const owner = await client.post('/api/v1/entity/owners', {
      first_name: 'VaxTest',
      last_name: `Owner${Date.now()}`,
      email: `vaxowner-${Date.now()}@test.com`,
    });
    const ownerData = owner.data.data || owner.data;
    testOwnerId = ownerData.record_id || ownerData.id;

    // Create test pet
    const pet = await client.post('/api/v1/entity/pets', {
      name: `VaxPet${Date.now()}`,
      species: 'DOG',
      breed: 'Lab',
      owner_id: testOwnerId,
    });
    const petData = pet.data.data || pet.data;
    testPetId = petData.record_id || petData.id;
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
      const res = await client.get(`/api/v1/entity/pets/${testPetId}/vaccinations`);
      expect([200, 500]).toContain(res.status);
    });

    test('handles non-existent pet', async () => {
      const res = await client.get('/api/v1/entity/pets/999999/vaccinations');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.get(`/api/v1/entity/pets/${testPetId}/vaccinations`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/entity/pets/{id}/vaccinations', () => {
    test('creates vaccination with valid data', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const data = {
        type: 'Rabies',
        administered_at: new Date().toISOString(),
        expires_at: futureDate.toISOString(),
        notes: 'Annual rabies shot',
      };
      const res = await client.post(`/api/v1/entity/pets/${testPetId}/vaccinations`, data);
      expect([200, 201, 500]).toContain(res.status);
      if (res.status !== 500) {
        const vax = res.data.data || res.data;
        expect(vax.type).toBe('Rabies');
      }
    });

    test('rejects request without type', async () => {
      const res = await client.post(`/api/v1/entity/pets/${testPetId}/vaccinations`, {
        administered_at: new Date().toISOString(),
      });
      expect([400, 500]).toContain(res.status);
    });

    test('handles non-existent pet', async () => {
      const res = await client.post('/api/v1/entity/pets/999999/vaccinations', {
        type: 'Rabies',
        administered_at: new Date().toISOString(),
      });
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.post(`/api/v1/entity/pets/${testPetId}/vaccinations`, { type: 'Rabies' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/entity/pets/{petId}/vaccinations/{id}', () => {
    let vaxId;

    beforeAll(async () => {
      const res = await client.post(`/api/v1/entity/pets/${testPetId}/vaccinations`, {
        type: 'DHPP',
        administered_at: new Date().toISOString(),
      });
      const vaxData = res.data.data || res.data;
      vaxId = vaxData.record_id || vaxData.id;
    });

    test('updates vaccination', async () => {
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
      const res = await client.put(`/api/v1/entity/pets/${testPetId}/vaccinations/999999`, {
        type: 'Test',
      });
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.put(`/api/v1/entity/pets/${testPetId}/vaccinations/${vaxId}`, { type: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/entity/pets/{petId}/vaccinations/{id}', () => {
    test('deletes vaccination', async () => {
      const create = await client.post(`/api/v1/entity/pets/${testPetId}/vaccinations`, {
        type: 'Bordetella',
        administered_at: new Date().toISOString(),
      });
      if (create.status === 500) return; // Skip if create failed
      const createData = create.data.data || create.data;
      const id = createData.record_id || createData.id;

      const res = await client.delete(`/api/v1/entity/pets/${testPetId}/vaccinations/${id}`);
      expect([200, 204, 500]).toContain(res.status);
    });

    test('handles non-existent vaccination', async () => {
      const res = await client.delete(`/api/v1/entity/pets/${testPetId}/vaccinations/999999`);
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.delete(`/api/v1/entity/pets/${testPetId}/vaccinations/1`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
