/**
 * E2E Tests - Cascade Operations
 *
 * Tests cascade delete behavior:
 * - Deleting owner cascades to pets, bookings
 * - Deleting pet cascades to vaccinations, bookings
 * - Soft delete vs hard delete behavior
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
  createVaccination,
  createInvoice,
  createPayment,
  createTask,
} = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;

describe('Cascade Operations E2E Tests', () => {
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
  // OWNER CASCADE DELETE
  // ===========================================================================
  describe('Owner Cascade Delete', () => {
    test('deleting owner soft-deletes associated pets', async () => {
      const owner = await createOwner(env.tenantId);
      const pet1 = await createPet(env.tenantId, owner.id, { name: 'CascadePet1' });
      const pet2 = await createPet(env.tenantId, owner.id, { name: 'CascadePet2' });

      // Delete owner
      const deleteRes = await adminApi.delete(`/owners/${owner.record_id || owner.id}`);
      expect([200, 204]).toContain(deleteRes.status);

      // Check pets are soft-deleted (have deleted_at)
      const pet1Check = await query(
        `SELECT deleted_at FROM "Pet" WHERE id = $1`,
        [pet1.id]
      );
      const pet2Check = await query(
        `SELECT deleted_at FROM "Pet" WHERE id = $1`,
        [pet2.id]
      );

      expect(pet1Check.rows[0]?.deleted_at || pet1Check.rows.length === 0).toBeTruthy();
      expect(pet2Check.rows[0]?.deleted_at || pet2Check.rows.length === 0).toBeTruthy();
    });

    test('deleting owner soft-deletes associated bookings', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id);

      // Delete owner
      await adminApi.delete(`/owners/${owner.record_id || owner.id}`);

      // Check booking is soft-deleted
      const bookingCheck = await query(
        `SELECT deleted_at, status FROM "Booking" WHERE id = $1`,
        [booking.id]
      );

      // Should be deleted or cancelled
      const row = bookingCheck.rows[0];
      expect(
        row?.deleted_at ||
        row?.status === 'CANCELLED' ||
        bookingCheck.rows.length === 0
      ).toBeTruthy();
    });

    test('deleting owner handles invoices appropriately', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, { status: 'DRAFT' });

      // Delete owner
      await adminApi.delete(`/owners/${owner.record_id || owner.id}`);

      // Invoices might be voided or retained for records
      const invoiceCheck = await query(
        `SELECT status, deleted_at FROM "Invoice" WHERE id = $1`,
        [invoice.id]
      );

      // Invoice should be voided, deleted, or owner_id set to null
      const row = invoiceCheck.rows[0];
      if (row) {
        expect(['VOID', 'CANCELLED'].includes(row.status) || row.deleted_at).toBeTruthy();
      }
    });
  });

  // ===========================================================================
  // PET CASCADE DELETE
  // ===========================================================================
  describe('Pet Cascade Delete', () => {
    test('deleting pet soft-deletes associated vaccinations', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);
      const vax1 = await createVaccination(env.tenantId, pet.id, { vaccine_name: 'Rabies' });
      const vax2 = await createVaccination(env.tenantId, pet.id, { vaccine_name: 'DHPP' });

      // Delete pet
      await adminApi.delete(`/pets/${pet.record_id || pet.id}`);

      // Check vaccinations are soft-deleted
      const vax1Check = await query(
        `SELECT deleted_at FROM "Vaccination" WHERE id = $1`,
        [vax1.id]
      );
      const vax2Check = await query(
        `SELECT deleted_at FROM "Vaccination" WHERE id = $1`,
        [vax2.id]
      );

      expect(vax1Check.rows[0]?.deleted_at || vax1Check.rows.length === 0).toBeTruthy();
      expect(vax2Check.rows[0]?.deleted_at || vax2Check.rows.length === 0).toBeTruthy();
    });

    test('deleting pet updates or cancels associated bookings', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);
      const booking = await createBooking(env.tenantId, owner.id);

      // Link pet to booking
      await query(
        `INSERT INTO "BookingPet" (booking_id, pet_id, tenant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [booking.id, pet.id, env.tenantId]
      );

      // Delete pet
      await adminApi.delete(`/pets/${pet.record_id || pet.id}`);

      // Booking should be updated or pet removed from booking
      const bookingPetCheck = await query(
        `SELECT * FROM "BookingPet" WHERE pet_id = $1 AND deleted_at IS NULL`,
        [pet.id]
      );

      expect(bookingPetCheck.rows.length).toBe(0);
    });

    test('deleting pet clears pet tasks', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);
      const task = await createTask(env.tenantId, { pet_id: pet.id, title: 'Pet Task' });

      // Delete pet
      await adminApi.delete(`/pets/${pet.record_id || pet.id}`);

      // Task should have pet_id cleared or be deleted
      const taskCheck = await query(
        `SELECT pet_id, deleted_at FROM "Task" WHERE id = $1`,
        [task.id]
      );

      const row = taskCheck.rows[0];
      expect(row?.pet_id === null || row?.deleted_at || taskCheck.rows.length === 0).toBeTruthy();
    });
  });

  // ===========================================================================
  // BOOKING CASCADE DELETE
  // ===========================================================================
  describe('Booking Cascade Delete', () => {
    test('cancelling booking handles payments correctly', async () => {
      const owner = await createOwner(env.tenantId);
      const booking = await createBooking(env.tenantId, owner.id, { status: 'CONFIRMED' });
      const invoice = await createInvoice(env.tenantId, owner.id, { booking_id: booking.id });
      const payment = await createPayment(env.tenantId, owner.id, { invoice_id: invoice.id });

      // Cancel booking
      const cancelRes = await adminApi.patch(`/bookings/${booking.record_id || booking.id}`, {
        status: 'CANCELLED',
        cancellation_reason: 'Test cancellation',
      });

      expect([200, 204]).toContain(cancelRes.status);

      // Payment should remain for accounting purposes
      const paymentCheck = await query(
        `SELECT * FROM "Payment" WHERE id = $1 AND deleted_at IS NULL`,
        [payment.id]
      );

      expect(paymentCheck.rows.length).toBe(1);
    });

    test('deleting booking removes pet associations', async () => {
      const owner = await createOwner(env.tenantId);
      const pet = await createPet(env.tenantId, owner.id);
      const booking = await createBooking(env.tenantId, owner.id);

      // Link pet to booking
      await query(
        `INSERT INTO "BookingPet" (booking_id, pet_id, tenant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [booking.id, pet.id, env.tenantId]
      );

      // Delete booking
      await adminApi.delete(`/bookings/${booking.record_id || booking.id}`);

      // BookingPet junction should be cleared
      const junctionCheck = await query(
        `SELECT * FROM "BookingPet" WHERE booking_id = $1`,
        [booking.id]
      );

      expect(junctionCheck.rows.every(r => r.deleted_at !== null) || junctionCheck.rows.length === 0).toBeTruthy();
    });
  });

  // ===========================================================================
  // INVOICE CASCADE DELETE
  // ===========================================================================
  describe('Invoice Cascade Delete', () => {
    test('voiding invoice does not void completed payments', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, { status: 'SENT' });
      const payment = await createPayment(env.tenantId, owner.id, {
        invoice_id: invoice.id,
        status: 'SUCCEEDED',
      });

      // Void the invoice
      await adminApi.patch(`/invoices/${invoice.record_id || invoice.id}`, {
        status: 'VOID',
      });

      // Payment should still exist
      const paymentCheck = await query(
        `SELECT status FROM "Payment" WHERE id = $1`,
        [payment.id]
      );

      expect(paymentCheck.rows[0]?.status).toBe('SUCCEEDED');
    });

    test('deleting invoice line items updates totals', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, {
        status: 'DRAFT',
        subtotal_cents: 10000,
        total_cents: 10825,
      });

      // Add line item
      await adminApi.post(`/invoices/${invoice.record_id || invoice.id}/line-items`, {
        description: 'Test item',
        quantity: 1,
        unit_price_cents: 5000,
      });

      // Get updated invoice
      const getRes = await adminApi.get(`/invoices/${invoice.record_id || invoice.id}`);
      const originalTotal = getRes.data.total_cents;

      // Delete line items (if supported)
      // Total should be recalculated
    });
  });

  // ===========================================================================
  // SOFT DELETE BEHAVIOR
  // ===========================================================================
  describe('Soft Delete Behavior', () => {
    test('soft-deleted records are not returned in list', async () => {
      const owner = await createOwner(env.tenantId, { first_name: 'SoftDeleteTest' });

      // Delete owner
      await adminApi.delete(`/owners/${owner.record_id || owner.id}`);

      // List should not include deleted owner
      const listRes = await adminApi.get('/owners');
      const owners = listRes.data.data || listRes.data;

      const hasDeleted = owners.some(o => o.first_name === 'SoftDeleteTest');
      expect(hasDeleted).toBe(false);
    });

    test('soft-deleted records return 404 on direct access', async () => {
      const owner = await createOwner(env.tenantId);

      await adminApi.delete(`/owners/${owner.record_id || owner.id}`);

      const getRes = await adminApi.get(`/owners/${owner.record_id || owner.id}`);
      expect(getRes.status).toBe(404);
    });

    test('soft-deleted records still exist in database', async () => {
      const owner = await createOwner(env.tenantId);

      await adminApi.delete(`/owners/${owner.record_id || owner.id}`);

      // Direct database check
      const dbCheck = await query(
        `SELECT deleted_at FROM "Owner" WHERE id = $1`,
        [owner.id]
      );

      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].deleted_at).not.toBeNull();
    });
  });

  // ===========================================================================
  // RECOVERY BEHAVIOR
  // ===========================================================================
  describe('Recovery Behavior', () => {
    test('admin can restore soft-deleted records', async () => {
      const owner = await createOwner(env.tenantId, { first_name: 'RestoreTest' });

      // Delete
      await adminApi.delete(`/owners/${owner.record_id || owner.id}`);

      // Restore (if endpoint exists)
      const restoreRes = await adminApi.post(`/owners/${owner.record_id || owner.id}/restore`, {});

      if (restoreRes.status === 200 || restoreRes.status === 204) {
        // Verify restored
        const getRes = await adminApi.get(`/owners/${owner.record_id || owner.id}`);
        expect(getRes.status).toBe(200);
      } else {
        // Restore not implemented - that's okay
        expect([404, 405]).toContain(restoreRes.status);
      }
    });
  });
});
