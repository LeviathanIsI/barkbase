/**
 * E2E Tests - Multi-Tenant Isolation
 *
 * Critical security tests ensuring:
 * - Tenant A cannot see Tenant B's data
 * - Cross-tenant access returns 404 (not 403)
 * - Tenant context is properly enforced
 */

const {
  testConnection,
  closePool,
  createTestTenant,
  createTestUser,
  getAuthToken,
  cleanupTenant,
} = require('../utils/setup');
const { createApiClient } = require('../utils/api');
const {
  createOwner,
  createPet,
  createBooking,
  createInvoice,
  createPayment,
  createTask,
  createSegment,
} = require('../utils/factories');

jest.setTimeout(60000);

let tenantA, tenantB;
let userA, userB;
let tokenA, tokenB;
let apiA, apiB;

describe('Multi-Tenant Isolation E2E Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection required for E2E tests');
    }

    // Create two isolated tenants
    tenantA = await createTestTenant({ name: 'Tenant A' });
    tenantB = await createTestTenant({ name: 'Tenant B' });

    userA = await createTestUser(tenantA.id, 'ADMIN');
    userB = await createTestUser(tenantB.id, 'ADMIN');

    tokenA = getAuthToken(userA);
    tokenB = getAuthToken(userB);

    apiA = createApiClient(tokenA, tenantA.id);
    apiB = createApiClient(tokenB, tenantB.id);
  });

  afterAll(async () => {
    await cleanupTenant(tenantA?.id);
    await cleanupTenant(tenantB?.id);
    await closePool();
  });

  // ===========================================================================
  // OWNER ISOLATION
  // ===========================================================================
  describe('Owner Isolation', () => {
    let ownerA, ownerB;

    beforeAll(async () => {
      ownerA = await createOwner(tenantA.id, { first_name: 'TenantA_Owner' });
      ownerB = await createOwner(tenantB.id, { first_name: 'TenantB_Owner' });
    });

    test('Tenant A cannot access Tenant B owners', async () => {
      const res = await apiA.get(`/owners/${ownerB.record_id || ownerB.id}`);
      expect(res.status).toBe(404); // Not 403
    });

    test('Tenant B cannot access Tenant A owners', async () => {
      const res = await apiB.get(`/owners/${ownerA.record_id || ownerA.id}`);
      expect(res.status).toBe(404);
    });

    test('Tenant A cannot update Tenant B owners', async () => {
      const res = await apiA.patch(`/owners/${ownerB.record_id || ownerB.id}`, {
        first_name: 'Hacked',
      });
      expect(res.status).toBe(404);
    });

    test('Tenant A cannot delete Tenant B owners', async () => {
      const res = await apiA.delete(`/owners/${ownerB.record_id || ownerB.id}`);
      expect(res.status).toBe(404);
    });

    test('List only returns own tenant owners', async () => {
      const resA = await apiA.get('/owners');
      const resB = await apiB.get('/owners');

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      const ownersA = resA.data.data || resA.data;
      const ownersB = resB.data.data || resB.data;

      // Check Tenant A's list doesn't contain Tenant B's owner
      const hasOwnerB = ownersA.some(o => o.first_name === 'TenantB_Owner');
      expect(hasOwnerB).toBe(false);

      // Check Tenant B's list doesn't contain Tenant A's owner
      const hasOwnerA = ownersB.some(o => o.first_name === 'TenantA_Owner');
      expect(hasOwnerA).toBe(false);
    });
  });

  // ===========================================================================
  // PET ISOLATION
  // ===========================================================================
  describe('Pet Isolation', () => {
    let petA, petB;

    beforeAll(async () => {
      const ownerA = await createOwner(tenantA.id);
      const ownerB = await createOwner(tenantB.id);
      petA = await createPet(tenantA.id, ownerA.id, { name: 'TenantA_Pet' });
      petB = await createPet(tenantB.id, ownerB.id, { name: 'TenantB_Pet' });
    });

    test('Tenant A cannot access Tenant B pets', async () => {
      const res = await apiA.get(`/pets/${petB.record_id || petB.id}`);
      expect(res.status).toBe(404);
    });

    test('Tenant B cannot access Tenant A pets', async () => {
      const res = await apiB.get(`/pets/${petA.record_id || petA.id}`);
      expect(res.status).toBe(404);
    });

    test('Pet list is tenant-scoped', async () => {
      const resA = await apiA.get('/pets');
      const petsA = resA.data.data || resA.data;

      const hasPetB = petsA.some(p => p.name === 'TenantB_Pet');
      expect(hasPetB).toBe(false);
    });
  });

  // ===========================================================================
  // BOOKING ISOLATION
  // ===========================================================================
  describe('Booking Isolation', () => {
    let bookingA, bookingB;

    beforeAll(async () => {
      const ownerA = await createOwner(tenantA.id);
      const ownerB = await createOwner(tenantB.id);
      bookingA = await createBooking(tenantA.id, ownerA.id);
      bookingB = await createBooking(tenantB.id, ownerB.id);
    });

    test('Tenant A cannot access Tenant B bookings', async () => {
      const res = await apiA.get(`/bookings/${bookingB.record_id || bookingB.id}`);
      expect(res.status).toBe(404);
    });

    test('Tenant A cannot modify Tenant B bookings', async () => {
      const res = await apiA.patch(`/bookings/${bookingB.record_id || bookingB.id}`, {
        status: 'CANCELLED',
      });
      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // INVOICE ISOLATION
  // ===========================================================================
  describe('Invoice Isolation', () => {
    let invoiceA, invoiceB;

    beforeAll(async () => {
      const ownerA = await createOwner(tenantA.id);
      const ownerB = await createOwner(tenantB.id);
      invoiceA = await createInvoice(tenantA.id, ownerA.id);
      invoiceB = await createInvoice(tenantB.id, ownerB.id);
    });

    test('Tenant A cannot access Tenant B invoices', async () => {
      const res = await apiA.get(`/invoices/${invoiceB.record_id || invoiceB.id}`);
      expect(res.status).toBe(404);
    });

    test('Tenant A cannot pay Tenant B invoices', async () => {
      const res = await apiA.post('/payments', {
        invoice_id: invoiceB.id,
        amount_cents: 1000,
        method: 'CARD',
      });
      // Should fail - either 400/403/404
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // PAYMENT ISOLATION
  // ===========================================================================
  describe('Payment Isolation', () => {
    let paymentA, paymentB;

    beforeAll(async () => {
      const ownerA = await createOwner(tenantA.id);
      const ownerB = await createOwner(tenantB.id);
      paymentA = await createPayment(tenantA.id, ownerA.id);
      paymentB = await createPayment(tenantB.id, ownerB.id);
    });

    test('Tenant A cannot access Tenant B payments', async () => {
      const res = await apiA.get(`/payments/${paymentB.record_id || paymentB.id}`);
      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // TASK ISOLATION
  // ===========================================================================
  describe('Task Isolation', () => {
    let taskA, taskB;

    beforeAll(async () => {
      taskA = await createTask(tenantA.id, { title: 'TenantA_Task' });
      taskB = await createTask(tenantB.id, { title: 'TenantB_Task' });
    });

    test('Tenant A cannot access Tenant B tasks', async () => {
      const res = await apiA.get(`/tasks/${taskB.record_id || taskB.id}`);
      expect(res.status).toBe(404);
    });

    test('Tenant A cannot complete Tenant B tasks', async () => {
      const res = await apiA.patch(`/tasks/${taskB.record_id || taskB.id}`, {
        status: 'completed',
      });
      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // SEGMENT ISOLATION
  // ===========================================================================
  describe('Segment Isolation', () => {
    let segmentA, segmentB;

    beforeAll(async () => {
      segmentA = await createSegment(tenantA.id, { name: 'TenantA_Segment' });
      segmentB = await createSegment(tenantB.id, { name: 'TenantB_Segment' });
    });

    test('Tenant A cannot access Tenant B segments', async () => {
      const res = await apiA.get(`/segments/${segmentB.id}`);
      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // HEADER SPOOFING PROTECTION
  // ===========================================================================
  describe('Header Spoofing Protection', () => {
    test('Cannot access other tenant by spoofing X-Tenant-Id header', async () => {
      const ownerB = await createOwner(tenantB.id, { first_name: 'SpoofTarget' });

      // Try to use Tenant A's token with Tenant B's ID in header
      const { api } = require('../utils/api');
      const res = await api.get(
        `/owners/${ownerB.record_id || ownerB.id}`,
        tokenA,
        { tenantId: tenantB.id } // Spoofed header
      );

      // Should fail because token's tenant_id doesn't match header
      expect([401, 403, 404]).toContain(res.status);
    });

    test('Mismatched token and header tenant returns auth error', async () => {
      const { api } = require('../utils/api');
      const res = await api.get('/owners', tokenA, { tenantId: tenantB.id });

      // Security: Should reject when token tenant doesn't match header
      expect([401, 403]).toContain(res.status);
    });
  });

  // ===========================================================================
  // SEARCH ISOLATION
  // ===========================================================================
  describe('Search Isolation', () => {
    test('Search only returns own tenant results', async () => {
      // Create owners with unique names
      await createOwner(tenantA.id, { first_name: 'UniqueSearchNameA' });
      await createOwner(tenantB.id, { first_name: 'UniqueSearchNameB' });

      // Search from Tenant A
      const resA = await apiA.get('/owners?search=UniqueSearchName');
      const ownersA = resA.data.data || resA.data;

      // Should find A but not B
      expect(ownersA.some(o => o.first_name === 'UniqueSearchNameA')).toBe(true);
      expect(ownersA.some(o => o.first_name === 'UniqueSearchNameB')).toBe(false);
    });
  });

  // ===========================================================================
  // BULK OPERATIONS ISOLATION
  // ===========================================================================
  describe('Bulk Operations Isolation', () => {
    test('Bulk delete cannot affect other tenant records', async () => {
      const ownerA1 = await createOwner(tenantA.id);
      const ownerA2 = await createOwner(tenantA.id);
      const ownerB1 = await createOwner(tenantB.id);

      // Try to bulk delete including a Tenant B ID (shouldn't work)
      const res = await apiA.post('/owners/bulk-delete', {
        ids: [ownerA1.id, ownerB1.id], // B's owner shouldn't be deletable
      });

      // Verify B's owner still exists
      const checkB = await apiB.get(`/owners/${ownerB1.record_id || ownerB1.id}`);
      expect(checkB.status).toBe(200);
    });
  });
});
