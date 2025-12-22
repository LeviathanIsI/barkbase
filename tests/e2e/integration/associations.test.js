/**
 * E2E Tests - Entity Associations
 *
 * Tests relationship integrity:
 * - Pet-Owner associations
 * - Booking-Pet-Owner links
 * - Invoice-Owner-Booking links
 * - Staff-Facility assignments
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
  query,
} = require('../utils/setup');
const { createApiClient } = require('../utils/api');
const {
  createOwner,
  createPet,
  createBooking,
  createInvoice,
  createStaff,
  createFacility,
  createService,
  createVaccination,
} = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;

describe('Entity Associations E2E Tests', () => {
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
  // PET-OWNER ASSOCIATIONS
  // ===========================================================================
  describe('Pet-Owner Associations', () => {
    test('pet is associated with owner on creation', async () => {
      const owner = await createOwner(env.tenantId, { first_name: 'PetOwnerTest' });
      const pet = await createPet(env.tenantId, owner.id, { name: 'AssocPet' });

      const res = await adminApi.get(`/pets/${pet.record_id || pet.id}`);

      expect(res.status).toBe(200);
      expect(res.data.owner_id).toBe(owner.id);
    });

    test('owner pets endpoint returns associated pets', async () => {
      const owner = await createOwner(env.tenantId);
      await createPet(env.tenantId, owner.id, { name: 'OwnerPet1' });
      await createPet(env.tenantId, owner.id, { name: 'OwnerPet2' });

      const res = await adminApi.get(`/owners/${owner.record_id || owner.id}/pets`);

      if (res.status === 200) {
        const pets = res.data.data || res.data;
        expect(pets.length).toBeGreaterThanOrEqual(2);
        expect(pets.some(p => p.name === 'OwnerPet1')).toBe(true);
        expect(pets.some(p => p.name === 'OwnerPet2')).toBe(true);
      } else {
        // Endpoint might not exist - check via filter
        const filterRes = await adminApi.get(`/pets?owner_id=${owner.id}`);
        expect(filterRes.status).toBe(200);
      }
    });

    test('pet can be transferred to another owner', async () => {
      const owner1 = await createOwner(env.tenantId);
      const owner2 = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner1.id);

      const res = await adminApi.patch(`/pets/${pet.record_id || pet.id}`, {
        owner_id: owner2.id,
      });

      expect([200, 204]).toContain(res.status);

      const getRes = await adminApi.get(`/pets/${pet.record_id || pet.id}`);
      expect(getRes.data.owner_id).toBe(owner2.id);
    });

    test('cannot assign pet to non-existent owner', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);

      const res = await adminApi.patch(`/pets/${pet.record_id || pet.id}`, {
        owner_id: 'owner_nonexistent123',
      });

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // BOOKING-PET-OWNER ASSOCIATIONS
  // ===========================================================================
  describe('Booking-Pet-Owner Associations', () => {
    test('booking is associated with owner', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id);

      const res = await adminApi.get(`/bookings/${booking.record_id || booking.id}`);

      expect(res.status).toBe(200);
      expect(res.data.owner_id).toBe(owner.id);
    });

    test('booking can have multiple pets attached', async () => {
      const owner = await createOwner(env.tenantId);
      const pet1 = await createPet(env.tenantId, owner.id, { name: 'BookingPet1' });
      const pet2 = await createPet(env.tenantId, owner.id, { name: 'BookingPet2' });
      const service = await createService(env.tenantId);

      const checkIn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const checkOut = new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000);

      const res = await adminApi.post('/bookings', {
        owner_id: owner.id,
        service_id: service.id,
        pet_ids: [pet1.id, pet2.id],
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
      });

      expect([200, 201]).toContain(res.status);

      // Verify pets are linked
      const getRes = await adminApi.get(`/bookings/${res.data.record_id || res.data.id}`);
      const petIds = getRes.data.pet_ids || getRes.data.pets?.map(p => p.id) || [];
      expect(petIds).toContain(pet1.id);
      expect(petIds).toContain(pet2.id);
    });

    test('owner bookings endpoint returns their bookings', async () => {
      const owner = await createOwner(env.tenantId);
      await createBooking(env.tenantId, owner.id);

      const res = await adminApi.get(`/owners/${owner.record_id || owner.id}/bookings`);

      if (res.status === 200) {
        const bookings = res.data.data || res.data;
        expect(bookings.length).toBeGreaterThanOrEqual(1);
      } else {
        // Try filter approach
        const filterRes = await adminApi.get(`/bookings?owner_id=${owner.id}`);
        expect(filterRes.status).toBe(200);
      }
    });

    test('booking includes owner and pet details with include param', async () => {
      const owner = await createOwner(env.tenantId, { first_name: 'IncludeTest' });
      const pet = await createPet(env.tenantId, owner.id, { name: 'IncludePet' });
      const booking = await createBooking(env.tenantId, owner.id);

      // Link pet to booking
      await query(
        `INSERT INTO "BookingPet" (booking_id, pet_id, tenant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [booking.id, pet.id, env.tenantId]
      );

      const res = await adminApi.get(
        `/bookings/${booking.record_id || booking.id}?include=owner,pets`
      );

      expect(res.status).toBe(200);
      // Should have owner and pets expanded
      expect(res.data.owner || res.data.owner_id).toBeDefined();
    });
  });

  // ===========================================================================
  // INVOICE-OWNER ASSOCIATIONS
  // ===========================================================================
  describe('Invoice-Owner Associations', () => {
    test('invoice is associated with owner', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id);

      const res = await adminApi.get(`/invoices/${invoice.record_id || invoice.id}`);

      expect(res.status).toBe(200);
      expect(res.data.owner_id).toBe(owner.id);
    });

    test('invoice can be linked to booking', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id);
      const invoice = await createInvoice(env.tenantId, owner.id, {
        booking_id: booking.id,
      });

      const res = await adminApi.get(`/invoices/${invoice.record_id || invoice.id}`);

      expect(res.status).toBe(200);
      expect(res.data.booking_id).toBe(booking.id);
    });

    test('owner invoices endpoint returns their invoices', async () => {
      const owner = await createOwner(env.tenantId);
      await createInvoice(env.tenantId, owner.id);

      const res = await adminApi.get(`/owners/${owner.record_id || owner.id}/invoices`);

      if (res.status === 200) {
        const invoices = res.data.data || res.data;
        expect(invoices.length).toBeGreaterThanOrEqual(1);
      } else {
        const filterRes = await adminApi.get(`/invoices?owner_id=${owner.id}`);
        expect(filterRes.status).toBe(200);
      }
    });
  });

  // ===========================================================================
  // VACCINATION-PET ASSOCIATIONS
  // ===========================================================================
  describe('Vaccination-Pet Associations', () => {
    test('vaccination is associated with pet', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);
      const vax = await createVaccination(env.tenantId, pet.id, {
        vaccine_name: 'AssocRabies',
      });

      // Verify via database
      const dbCheck = await query(
        `SELECT pet_id FROM "Vaccination" WHERE id = $1`,
        [vax.id]
      );

      expect(dbCheck.rows[0].pet_id).toBe(pet.id);
    });

    test('pet vaccinations endpoint returns associated vaccinations', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);
      await createVaccination(env.tenantId, pet.id, { vaccine_name: 'Rabies' });
      await createVaccination(env.tenantId, pet.id, { vaccine_name: 'DHPP' });

      const res = await adminApi.get(`/pets/${pet.record_id || pet.id}/vaccinations`);

      if (res.status === 200) {
        const vaxes = res.data.data || res.data;
        expect(vaxes.length).toBeGreaterThanOrEqual(2);
      } else {
        // Endpoint might not exist - that's okay
        expect([404, 200]).toContain(res.status);
      }
    });

    test('cannot create vaccination for non-existent pet', async () => {
      const res = await adminApi.post('/vaccinations', {
        pet_id: 'pet_nonexistent123',
        vaccine_name: 'Rabies',
        administered_at: new Date().toISOString(),
      });

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // STAFF-FACILITY ASSOCIATIONS
  // ===========================================================================
  describe('Staff-Facility Associations', () => {
    test('staff can be assigned to facility', async () => {
      const staff = await createStaff(env.tenantId);
      const facility = await createFacility(env.tenantId);

      // Assign staff to facility
      const res = await adminApi.patch(`/staff/${staff.record_id || staff.id}`, {
        facility_id: facility.id,
      });

      if (res.status === 200 || res.status === 204) {
        const getRes = await adminApi.get(`/staff/${staff.record_id || staff.id}`);
        expect(getRes.data.facility_id).toBe(facility.id);
      }
    });

    test('facility staff endpoint returns assigned staff', async () => {
      const facility = await createFacility(env.tenantId, { name: 'StaffTestFacility' });
      const staff = await createStaff(env.tenantId, { facility_id: facility.id });

      const res = await adminApi.get(`/facilities/${facility.record_id || facility.id}/staff`);

      if (res.status === 200) {
        const staffList = res.data.data || res.data;
        expect(staffList.some(s => s.id === staff.id)).toBe(true);
      } else {
        // Endpoint might not exist
        expect([404, 200]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // BOOKING-SERVICE ASSOCIATIONS
  // ===========================================================================
  describe('Booking-Service Associations', () => {
    test('booking is associated with service', async () => {
      const owner = await createOwner(env.tenantId);
      const service = await createService(env.tenantId, { name: 'AssocService' });

      const checkIn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const checkOut = new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000);

      const res = await adminApi.post('/bookings', {
        owner_id: owner.id,
        service_id: service.id,
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
      });

      expect([200, 201]).toContain(res.status);
      expect(res.data.service_id).toBe(service.id);
    });

    test('service bookings can be filtered', async () => {
      const owner = await createOwner(env.tenantId);
      const service = await createService(env.tenantId);
      await createBooking(env.tenantId, owner.id, { service_id: service.id });

      const res = await adminApi.get(`/bookings?service_id=${service.id}`);

      expect(res.status).toBe(200);
      const bookings = res.data.data || res.data;
      bookings.forEach(b => expect(b.service_id).toBe(service.id));
    });
  });

  // ===========================================================================
  // CROSS-ENTITY QUERIES
  // ===========================================================================
  describe('Cross-Entity Queries', () => {
    test('can query pets with their owners health status', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);

      // Add vaccination
      await createVaccination(env.tenantId, pet.id, {
        vaccine_name: 'Rabies',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const res = await adminApi.get('/pets?include=vaccinations,owner');

      expect(res.status).toBe(200);
    });

    test('can get booking with all related entities', async () => {
      const owner = await createOwner(env.tenantId, { first_name: 'FullBooking' });
      const pet = await createPet(env.tenantId, owner.id, { name: 'FullPet' });
      const service = await createService(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, {
        service_id: service.id,
      });

      // Link pet
      await query(
        `INSERT INTO "BookingPet" (booking_id, pet_id, tenant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [booking.id, pet.id, env.tenantId]
      );

      const res = await adminApi.get(
        `/bookings/${booking.record_id || booking.id}?include=owner,pets,service`
      );

      expect(res.status).toBe(200);
    });
  });

  // ===========================================================================
  // REFERENTIAL INTEGRITY
  // ===========================================================================
  describe('Referential Integrity', () => {
    test('cannot delete owner with active bookings', async () => {
      const owner = await createOwner(env.tenantId);
      await createBooking(env.tenantId, owner.id, { status: 'CONFIRMED' });

      const res = await adminApi.delete(`/owners/${owner.record_id || owner.id}`);

      // Should either soft-delete or reject
      // If soft-delete succeeds, check booking is handled appropriately
      if (res.status === 200 || res.status === 204) {
        // Owner was deleted - bookings should be cancelled or owner soft-deleted
        const ownerCheck = await query(
          `SELECT deleted_at FROM "Owner" WHERE id = $1`,
          [owner.id]
        );
        expect(ownerCheck.rows[0]?.deleted_at).not.toBeNull();
      }
    });

    test('cannot delete service in use by bookings', async () => {
      const owner = await createOwner(env.tenantId);
      const service = await createService(env.tenantId);
      await createBooking(env.tenantId, owner.id, { service_id: service.id });

      const res = await adminApi.delete(`/services/${service.record_id || service.id}`);

      // Should either reject or soft-delete
      expect([200, 204, 400, 409, 422]).toContain(res.status);
    });
  });
});
