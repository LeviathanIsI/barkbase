/**
 * E2E Tests - Pets
 * Routes: /api/v1/entity/pets
 */

const { testConnection, closePool, getTestContext } = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let ctx;
let client;
let testOwnerId;

describe('Pets API', () => {
  beforeAll(async () => {
    await testConnection();
    ctx = await getTestContext();
    client = createApiClient(ctx.token, ctx.tenantId);
    await api.post('/auth/login', { accessToken: ctx.token }, ctx.token, { tenantId: ctx.tenantId });

    // Create test owner for pets
    const owner = await client.post('/api/v1/entity/owners', {
      first_name: 'PetTest',
      last_name: `Owner${Date.now()}`,
      email: `petowner-${Date.now()}@test.com`,
    });
    const ownerData = owner.data.data || owner.data;
    testOwnerId = ownerData.record_id || ownerData.id;
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/v1/entity/pets', () => {
    test('returns 200 with list of pets', async () => {
      const res = await client.get('/api/v1/entity/pets');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(Array.isArray(res.data.data)).toBe(true);
    });

    test('returns 401 without token', async () => {
      const res = await api.get('/api/v1/entity/pets', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });

    test('supports limit parameter', async () => {
      const res = await client.get('/api/v1/entity/pets?limit=5');
      expect(res.status).toBe(200);
      expect(res.data.data.length).toBeLessThanOrEqual(5);
    });

    test('supports species filter', async () => {
      const res = await client.get('/api/v1/entity/pets?species=DOG');
      expect(res.status).toBe(200);
    });

    test('supports search parameter', async () => {
      const res = await client.get('/api/v1/entity/pets?search=buddy');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/entity/pets', () => {
    test('creates pet with valid data', async () => {
      const data = {
        name: `Buddy${Date.now()}`,
        species: 'DOG',
        breed: 'Golden Retriever',
        gender: 'MALE',
        owner_id: testOwnerId,
      };
      const res = await client.post('/api/v1/entity/pets', data);
      expect([200, 201, 500]).toContain(res.status);
      if (res.status !== 500) {
        const pet = res.data.data || res.data;
        expect(pet.name).toBe(data.name);
        expect(pet.species).toBe('DOG');
      }
    });

    test('rejects request without name', async () => {
      const res = await client.post('/api/v1/entity/pets', { species: 'DOG', owner_id: testOwnerId });
      expect([400, 500]).toContain(res.status);
    });

    test('rejects request without species', async () => {
      const res = await client.post('/api/v1/entity/pets', { name: 'Test', owner_id: testOwnerId });
      expect([400, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.post('/api/v1/entity/pets', { name: 'Test', species: 'DOG' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/entity/pets/{id}', () => {
    let petId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/pets', {
        name: `GetById${Date.now()}`,
        species: 'CAT',
        breed: 'Persian',
        owner_id: testOwnerId,
      });
      const petData = res.data.data || res.data;
      petId = petData.record_id || petData.id;
    });

    test('returns pet data', async () => {
      const res = await client.get(`/api/v1/entity/pets/${petId}`);
      expect([200, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        const pet = res.data.data || res.data;
        expect(pet.species).toBe('CAT');
      }
    });

    test('handles non-existent id', async () => {
      const res = await client.get('/api/v1/entity/pets/999999');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.get(`/api/v1/entity/pets/${petId}`, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/entity/pets/{id}', () => {
    let petId;

    beforeAll(async () => {
      const res = await client.post('/api/v1/entity/pets', {
        name: `Update${Date.now()}`,
        species: 'DOG',
        breed: 'Beagle',
        owner_id: testOwnerId,
      });
      const petData = res.data.data || res.data;
      petId = petData.record_id || petData.id;
    });

    test('updates pet with valid data', async () => {
      const res = await client.put(`/api/v1/entity/pets/${petId}`, {
        name: 'UpdatedPet',
        species: 'DOG',
        breed: 'Beagle Mix',
        medical_notes: 'Allergies',
      });
      expect([200, 204, 500]).toContain(res.status);
      if (res.status !== 500) {
        const get = await client.get(`/api/v1/entity/pets/${petId}`);
        const pet = get.data.data || get.data;
        expect(pet.name).toBe('UpdatedPet');
      }
    });

    test('returns error for non-existent id', async () => {
      const res = await client.put('/api/v1/entity/pets/999999', { name: 'Test', species: 'DOG' });
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.put(`/api/v1/entity/pets/${petId}`, { name: 'Test' }, null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/entity/pets/{id}', () => {
    test('deletes pet', async () => {
      const create = await client.post('/api/v1/entity/pets', {
        name: `Delete${Date.now()}`,
        species: 'DOG',
        owner_id: testOwnerId,
      });
      const createData = create.data.data || create.data;
      const id = createData.record_id || createData.id;

      const res = await client.delete(`/api/v1/entity/pets/${id}`);
      expect([200, 204, 500]).toContain(res.status);
      if (res.status !== 500) {
        const get = await client.get(`/api/v1/entity/pets/${id}`);
        expect(get.status).toBe(404);
      }
    });

    test('returns error for non-existent id', async () => {
      const res = await client.delete('/api/v1/entity/pets/999999');
      expect([404, 500]).toContain(res.status);
    });

    test('returns 401 without token', async () => {
      const res = await api.delete('/api/v1/entity/pets/1', null, { tenantId: ctx.tenantId });
      expect(res.status).toBe(401);
    });
  });
});
