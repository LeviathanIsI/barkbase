/**
 * E2E Tests - Bookings
 *
 * CRUD operations + status transitions + check-in/out for Booking entity.
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
  getInvalidToken,
} = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');
const { createOwner, createPet, createBooking, createService } = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;

describe('Bookings E2E Tests', () => {
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
    test('GET /bookings returns list of bookings', async () => {
      const owner = await createOwner(env.tenantId);
      await createBooking(env.tenantId, owner.id);

      const res = await adminApi.get('/bookings');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data || res.data)).toBe(true);
    });

    test('GET /bookings/:id returns single booking', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'CONFIRMED' });

      const res = await adminApi.get(`/bookings/${booking.record_id || booking.id}`);

      expect(res.status).toBe(200);
      expect(res.data.status).toBe('CONFIRMED');
    });

    test('POST /bookings creates new booking', async () => {
      const owner = await createOwner(env.tenantId);
      const service = await createService(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);

      const checkIn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const checkOut = new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000);

      const bookingData = {
        owner_id: owner.id,
        service_id: service.id,
        pet_ids: [pet.id],
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
        total_price_cents: 15000,
      };

      const res = await adminApi.post('/bookings', bookingData);

      expect([200, 201]).toContain(res.status);
      expect(res.data.status).toBe('PENDING');
    });

    test('PATCH /bookings/:id updates booking', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id);

      const res = await adminApi.patch(`/bookings/${booking.record_id || booking.id}`, {
        notes: 'Updated notes',
        special_instructions: 'Feed twice daily',
      });

      expect([200, 204]).toContain(res.status);
    });

    test('DELETE /bookings/:id cancels booking', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id);

      const res = await adminApi.delete(`/bookings/${booking.record_id || booking.id}`);

      expect([200, 204]).toContain(res.status);
    });
  });

  // ===========================================================================
  // STATUS TRANSITIONS
  // ===========================================================================
  describe('Status Transitions', () => {
    test('PENDING → CONFIRMED transition', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'PENDING' });

      const res = await adminApi.patch(`/bookings/${booking.record_id || booking.id}`, {
        status: 'CONFIRMED',
      });

      expect([200, 204]).toContain(res.status);

      const getRes = await adminApi.get(`/bookings/${booking.record_id || booking.id}`);
      expect(getRes.data.status).toBe('CONFIRMED');
    });

    test('CONFIRMED → CHECKED_IN transition', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'CONFIRMED' });

      const res = await adminApi.patch(`/bookings/${booking.record_id || booking.id}`, {
        status: 'CHECKED_IN',
      });

      expect([200, 204]).toContain(res.status);
    });

    test('CHECKED_IN → CHECKED_OUT transition', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'CHECKED_IN' });

      const res = await adminApi.patch(`/bookings/${booking.record_id || booking.id}`, {
        status: 'CHECKED_OUT',
      });

      expect([200, 204]).toContain(res.status);
    });

    test('PENDING → CANCELLED transition', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'PENDING' });

      const res = await adminApi.patch(`/bookings/${booking.record_id || booking.id}`, {
        status: 'CANCELLED',
        cancellation_reason: 'Customer requested',
      });

      expect([200, 204]).toContain(res.status);
    });

    test('cannot transition from CHECKED_OUT back to PENDING', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'CHECKED_OUT' });

      const res = await adminApi.patch(`/bookings/${booking.record_id || booking.id}`, {
        status: 'PENDING',
      });

      // Should fail or ignore invalid transition
      expect([400, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // CHECK-IN / CHECK-OUT
  // ===========================================================================
  describe('Check-in / Check-out', () => {
    test('POST /bookings/:id/check-in performs check-in', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'CONFIRMED' });

      const res = await adminApi.post(`/bookings/${booking.record_id || booking.id}/check-in`, {});

      expect([200, 204]).toContain(res.status);

      const getRes = await adminApi.get(`/bookings/${booking.record_id || booking.id}`);
      expect(getRes.data.status).toBe('CHECKED_IN');
      expect(getRes.data.checked_in_at).toBeDefined();
    });

    test('POST /bookings/:id/check-out performs check-out', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'CHECKED_IN' });

      const res = await adminApi.post(`/bookings/${booking.record_id || booking.id}/check-out`, {});

      expect([200, 204]).toContain(res.status);

      const getRes = await adminApi.get(`/bookings/${booking.record_id || booking.id}`);
      expect(getRes.data.status).toBe('CHECKED_OUT');
      expect(getRes.data.checked_out_at).toBeDefined();
    });

    test('cannot check-in already checked-in booking', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'CHECKED_IN' });

      const res = await adminApi.post(`/bookings/${booking.record_id || booking.id}/check-in`, {});

      expect([400, 409]).toContain(res.status);
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when owner_id is missing', async () => {
      const service = await createService(env.tenantId);

      const res = await adminApi.post('/bookings', {
        service_id: service.id,
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(res.status).toBe(400);
    });

    test('returns 400 when check_out is before check_in', async () => {
      const owner = await createOwner(env.tenantId);
      const service = await createService(env.tenantId);

      const res = await adminApi.post('/bookings', {
        owner_id: owner.id,
        service_id: service.id,
        check_in: new Date(Date.now() + 86400000).toISOString(),
        check_out: new Date().toISOString(), // Before check_in
      });

      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // AUTH & TENANT ISOLATION
  // ===========================================================================
  describe('Auth & Tenant Isolation', () => {
    test('returns 401 with no token', async () => {
      const res = await api.get('/bookings', null, { tenantId: env.tenantId });
      expect(res.status).toBe(401);
    });

    test('cannot access bookings from different tenant', async () => {
      const { createTestTenant, createTestUser } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherOwner = await createOwner(otherTenant.id);
      const otherBooking = await createBooking(otherTenant.id, otherOwner.id);

      const res = await adminApi.get(`/bookings/${otherBooking.record_id || otherBooking.id}`);

      expect(res.status).toBe(404);

      await cleanupTenant(otherTenant.id);
    });
  });

  // ===========================================================================
  // FILTERING & SEARCH
  // ===========================================================================
  describe('Filtering & Search', () => {
    test('filter by status works', async () => {
      const owner = await createOwner(env.tenantId);
      await createBooking(env.tenantId, owner.id, { status: 'CONFIRMED' });
      await createBooking(env.tenantId, owner.id, { status: 'PENDING' });

      const res = await adminApi.get('/bookings?status=CONFIRMED');

      expect(res.status).toBe(200);
      const bookings = res.data.data || res.data;
      bookings.forEach(b => expect(b.status).toBe('CONFIRMED'));
    });

    test('filter by date range works', async () => {
      const owner = await createOwner(env.tenantId);
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await createBooking(env.tenantId, owner.id, {
        check_in: futureDate,
        check_out: new Date(futureDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      });

      const res = await adminApi.get(`/bookings?from=${futureDate.toISOString()}`);

      expect(res.status).toBe(200);
    });

    test('filter by owner_id works', async () => {
      const owner1 = await createOwner(env.tenantId);
      const owner2 = await createOwner(env.tenantId);

      await createBooking(env.tenantId, owner1.id);
      await createBooking(env.tenantId, owner2.id);

      const res = await adminApi.get(`/bookings?owner_id=${owner1.id}`);

      expect(res.status).toBe(200);
      const bookings = res.data.data || res.data;
      bookings.forEach(b => expect(b.owner_id).toBe(owner1.id));
    });
  });

  // ===========================================================================
  // CALENDAR VIEW
  // ===========================================================================
  describe('Calendar View', () => {
    test('GET /bookings/calendar returns calendar data', async () => {
      const owner = await createOwner(env.tenantId);
      await createBooking(env.tenantId, owner.id);

      const start = new Date().toISOString();
      const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await adminApi.get(`/bookings/calendar?start=${start}&end=${end}`);

      expect(res.status).toBe(200);
    });
  });
});
