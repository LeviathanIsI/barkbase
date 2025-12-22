/**
 * E2E Tests - Pets
 *
 * Full CRUD operations + owner associations for Pet entity.
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
  getInvalidToken,
} = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');
const { createOwner, createPet, createVaccination } = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;

describe('Pets E2E Tests', () => {
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
    test('GET /pets returns list of pets', async () => {
      const owner = await createOwner(env.tenantId);
      await createPet(env.tenantId, owner.id);

      const res = await adminApi.get('/pets');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data || res.data)).toBe(true);
    });

    test('GET /pets/:id returns single pet', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id, { name: 'Buddy' });

      const res = await adminApi.get(`/pets/${pet.record_id || pet.id}`);

      expect(res.status).toBe(200);
      expect(res.data.name).toBe('Buddy');
    });

    test('POST /pets creates new pet', async () => {
      const owner = await createOwner(env.tenantId);

      const petData = {
        name: 'NewPet',
        species: 'DOG',
        breed: 'Golden Retriever',
        gender: 'FEMALE',
        owner_id: owner.id,
      };

      const res = await adminApi.post('/pets', petData);

      expect([200, 201]).toContain(res.status);
      expect(res.data.name).toBe(petData.name);
      expect(res.data.species).toBe(petData.species);
    });

    test('PATCH /pets/:id updates pet', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);

      const res = await adminApi.patch(`/pets/${pet.record_id || pet.id}`, {
        name: 'UpdatedName',
        medical_notes: 'Allergic to chicken',
      });

      expect([200, 204]).toContain(res.status);

      // Verify update
      const getRes = await adminApi.get(`/pets/${pet.record_id || pet.id}`);
      expect(getRes.data.name).toBe('UpdatedName');
      expect(getRes.data.medical_notes).toBe('Allergic to chicken');
    });

    test('DELETE /pets/:id soft-deletes pet', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);

      const res = await adminApi.delete(`/pets/${pet.record_id || pet.id}`);

      expect([200, 204]).toContain(res.status);

      // Verify deleted
      const getRes = await adminApi.get(`/pets/${pet.record_id || pet.id}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ===========================================================================
  // VALIDATION ERROR TESTS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when name is missing', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.post('/pets', {
        species: 'DOG',
        owner_id: owner.id,
      });

      expect(res.status).toBe(400);
      expect(res.data.error || res.data.message).toMatch(/name|required/i);
    });

    test('returns 400 when species is missing', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.post('/pets', {
        name: 'TestPet',
        owner_id: owner.id,
      });

      expect(res.status).toBe(400);
      expect(res.data.error || res.data.message).toMatch(/species|required/i);
    });

    test('returns 400 for invalid species value', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.post('/pets', {
        name: 'TestPet',
        species: 'DRAGON',
        owner_id: owner.id,
      });

      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid gender value', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.post('/pets', {
        name: 'TestPet',
        species: 'DOG',
        gender: 'INVALID',
        owner_id: owner.id,
      });

      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // AUTH ERROR TESTS
  // ===========================================================================
  describe('Auth Errors', () => {
    test('returns 401 with no token', async () => {
      const res = await api.get('/pets', null, { tenantId: env.tenantId });
      expect(res.status).toBe(401);
    });

    test('returns 401 with invalid token', async () => {
      const res = await api.get('/pets', getInvalidToken(), { tenantId: env.tenantId });
      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    let otherTenant;
    let otherOwner;
    let petInOtherTenant;

    beforeAll(async () => {
      const { createTestTenant, createTestUser, getAuthToken } = require('../utils/setup');
      otherTenant = await createTestTenant({ name: 'Other Pet Tenant' });
      const otherUser = await createTestUser(otherTenant.id, 'ADMIN');
      otherOwner = await createOwner(otherTenant.id);
      petInOtherTenant = await createPet(otherTenant.id, otherOwner.id);
    });

    afterAll(async () => {
      await cleanupTenant(otherTenant?.id);
    });

    test('cannot access pets from different tenant (returns 404)', async () => {
      const res = await adminApi.get(`/pets/${petInOtherTenant.record_id || petInOtherTenant.id}`);
      expect(res.status).toBe(404);
    });

    test('cannot update pets from different tenant', async () => {
      const res = await adminApi.patch(`/pets/${petInOtherTenant.record_id || petInOtherTenant.id}`, {
        name: 'Hacked',
      });
      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // NOT FOUND TESTS
  // ===========================================================================
  describe('Not Found', () => {
    test('returns 404 for non-existent pet ID', async () => {
      const res = await adminApi.get('/pets/pet_nonexistent123');
      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // OWNER ASSOCIATIONS
  // ===========================================================================
  describe('Owner Associations', () => {
    test('pet includes owner information', async () => {
      const owner = await createOwner(env.tenantId, { first_name: 'PetOwner' });
      const pet = await createPet(env.tenantId, owner.id);

      const res = await adminApi.get(`/pets/${pet.record_id || pet.id}?include=owner`);

      expect(res.status).toBe(200);
      // Owner info should be included
      expect(res.data.owner || res.data.owner_id).toBeDefined();
    });

    test('can filter pets by owner', async () => {
      const owner1 = await createOwner(env.tenantId);
      const owner2 = await createOwner(env.tenantId);

      await createPet(env.tenantId, owner1.id, { name: 'Owner1Pet' });
      await createPet(env.tenantId, owner2.id, { name: 'Owner2Pet' });

      const res = await adminApi.get(`/pets?owner_id=${owner1.id}`);

      expect(res.status).toBe(200);
      const pets = res.data.data || res.data;
      // All pets should belong to owner1
      pets.forEach(pet => {
        expect(pet.owner_id === owner1.id || pet.owners?.some(o => o.id === owner1.id)).toBe(true);
      });
    });
  });

  // ===========================================================================
  // VACCINATION STATUS
  // ===========================================================================
  describe('Vaccination Status', () => {
    test('pet includes vaccination status', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);

      // Add current vaccination
      await createVaccination(env.tenantId, pet.id, {
        vaccine_name: 'Rabies',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Future
      });

      const res = await adminApi.get(`/pets/${pet.record_id || pet.id}?include=vaccinations`);

      expect(res.status).toBe(200);
      expect(res.data.vaccinations || res.data.vaccination_status).toBeDefined();
    });

    test('can filter by vaccination status', async () => {
      const owner = await createOwner(env.tenantId);
      const petWithVax = await createPet(env.tenantId, owner.id, { name: 'Vaccinated' });
      const petWithoutVax = await createPet(env.tenantId, owner.id, { name: 'NotVaccinated' });

      // Add current rabies vaccine to first pet only
      await createVaccination(env.tenantId, petWithVax.id, {
        vaccine_name: 'Rabies',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const res = await adminApi.get('/pets?vaccination_status=current');

      expect(res.status).toBe(200);
    });
  });

  // ===========================================================================
  // SEARCH & FILTER
  // ===========================================================================
  describe('Search & Filter', () => {
    test('search by name works', async () => {
      const owner = await createOwner(env.tenantId);
      const uniqueName = `UniquePet${Date.now()}`;
      await createPet(env.tenantId, owner.id, { name: uniqueName });

      const res = await adminApi.get(`/pets?search=${uniqueName}`);

      expect(res.status).toBe(200);
      const pets = res.data.data || res.data;
      expect(pets.some(p => p.name === uniqueName)).toBe(true);
    });

    test('filter by species works', async () => {
      const owner = await createOwner(env.tenantId);
      await createPet(env.tenantId, owner.id, { species: 'CAT' });

      const res = await adminApi.get('/pets?species=CAT');

      expect(res.status).toBe(200);
      const pets = res.data.data || res.data;
      pets.forEach(p => expect(p.species).toBe('CAT'));
    });

    test('filter by status works', async () => {
      const owner = await createOwner(env.tenantId);
      await createPet(env.tenantId, owner.id, { status: 'INACTIVE' });

      const res = await adminApi.get('/pets?status=INACTIVE');

      expect(res.status).toBe(200);
      const pets = res.data.data || res.data;
      pets.forEach(p => expect(p.status).toBe('INACTIVE'));
    });
  });
});
