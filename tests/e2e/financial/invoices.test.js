/**
 * E2E Tests - Invoices
 *
 * CRUD operations + line items + totals for Invoice entity.
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
} = require('../utils/setup');
const { createApiClient } = require('../utils/api');
const { createOwner, createInvoice, createPayment, createBooking } = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;

describe('Invoices E2E Tests', () => {
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
    test('GET /invoices returns list of invoices', async () => {
      const owner = await createOwner(env.tenantId);
      await createInvoice(env.tenantId, owner.id);

      const res = await adminApi.get('/invoices');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data || res.data)).toBe(true);
    });

    test('GET /invoices/:id returns single invoice', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, {
        invoice_number: 'INV-TEST-001',
      });

      const res = await adminApi.get(`/invoices/${invoice.record_id || invoice.id}`);

      expect(res.status).toBe(200);
      expect(res.data.invoice_number).toBe('INV-TEST-001');
    });

    test('POST /invoices creates new invoice', async () => {
      const owner = await createOwner(env.tenantId);

      const invoiceData = {
        owner_id: owner.id,
        subtotal_cents: 10000,
        tax_cents: 825,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const res = await adminApi.post('/invoices', invoiceData);

      expect([200, 201]).toContain(res.status);
      expect(res.data.status).toBe('DRAFT');
      expect(res.data.total_cents).toBe(10825);
    });

    test('PATCH /invoices/:id updates invoice', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, { status: 'DRAFT' });

      const res = await adminApi.patch(`/invoices/${invoice.record_id || invoice.id}`, {
        notes: 'Updated notes',
        discount_cents: 500,
      });

      expect([200, 204]).toContain(res.status);
    });

    test('DELETE /invoices/:id voids invoice', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, { status: 'DRAFT' });

      const res = await adminApi.delete(`/invoices/${invoice.record_id || invoice.id}`);

      expect([200, 204]).toContain(res.status);
    });
  });

  // ===========================================================================
  // STATUS TRANSITIONS
  // ===========================================================================
  describe('Status Transitions', () => {
    test('DRAFT → SENT transition', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, { status: 'DRAFT' });

      const res = await adminApi.patch(`/invoices/${invoice.record_id || invoice.id}`, {
        status: 'SENT',
      });

      expect([200, 204]).toContain(res.status);
    });

    test('SENT → PAID transition when fully paid', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, {
        status: 'SENT',
        total_cents: 10000,
        paid_cents: 0,
      });

      // Record a payment that covers the full amount
      const paymentRes = await adminApi.post('/payments', {
        owner_id: owner.id,
        invoice_id: invoice.id,
        amount_cents: 10000,
        method: 'CARD',
      });

      expect([200, 201]).toContain(paymentRes.status);

      // Check invoice is now PAID
      const getRes = await adminApi.get(`/invoices/${invoice.record_id || invoice.id}`);
      expect(getRes.data.status).toBe('PAID');
    });

    test('SENT → PARTIAL transition when partially paid', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, {
        status: 'SENT',
        total_cents: 10000,
        paid_cents: 0,
      });

      // Record a partial payment
      await adminApi.post('/payments', {
        owner_id: owner.id,
        invoice_id: invoice.id,
        amount_cents: 5000,
        method: 'CARD',
      });

      const getRes = await adminApi.get(`/invoices/${invoice.record_id || invoice.id}`);
      expect(getRes.data.status).toBe('PARTIAL');
      expect(getRes.data.paid_cents).toBe(5000);
    });
  });

  // ===========================================================================
  // LINE ITEMS
  // ===========================================================================
  describe('Line Items', () => {
    test('POST /invoices/:id/line-items adds line item', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, { status: 'DRAFT' });

      const res = await adminApi.post(`/invoices/${invoice.record_id || invoice.id}/line-items`, {
        description: 'Boarding - 3 nights',
        quantity: 3,
        unit_price_cents: 5000,
      });

      expect([200, 201]).toContain(res.status);
    });

    test('DELETE /invoices/:id/line-items/:itemId removes line item', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, { status: 'DRAFT' });

      // Add line item
      const addRes = await adminApi.post(`/invoices/${invoice.record_id || invoice.id}/line-items`, {
        description: 'Test item',
        quantity: 1,
        unit_price_cents: 1000,
      });

      if (addRes.data?.id) {
        const deleteRes = await adminApi.delete(
          `/invoices/${invoice.record_id || invoice.id}/line-items/${addRes.data.id}`
        );
        expect([200, 204]).toContain(deleteRes.status);
      }
    });

    test('line items update invoice totals', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, {
        status: 'DRAFT',
        subtotal_cents: 0,
        tax_cents: 0,
        total_cents: 0,
      });

      await adminApi.post(`/invoices/${invoice.record_id || invoice.id}/line-items`, {
        description: 'Service 1',
        quantity: 2,
        unit_price_cents: 5000,
      });

      const getRes = await adminApi.get(`/invoices/${invoice.record_id || invoice.id}`);
      expect(getRes.data.subtotal_cents).toBe(10000);
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when owner_id is missing', async () => {
      const res = await adminApi.post('/invoices', {
        subtotal_cents: 10000,
        due_date: new Date().toISOString(),
      });

      expect(res.status).toBe(400);
    });

    test('returns 400 for negative amounts', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.post('/invoices', {
        owner_id: owner.id,
        subtotal_cents: -1000,
        due_date: new Date().toISOString(),
      });

      expect(res.status).toBe(400);
    });

    test('cannot edit PAID invoice', async () => {
      const owner = await createOwner(env.tenantId);
      const invoice = await createInvoice(env.tenantId, owner.id, { status: 'PAID' });

      const res = await adminApi.patch(`/invoices/${invoice.record_id || invoice.id}`, {
        subtotal_cents: 99999,
      });

      expect([400, 403, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('cannot access invoices from different tenant', async () => {
      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherOwner = await createOwner(otherTenant.id);
      const otherInvoice = await createInvoice(otherTenant.id, otherOwner.id);

      const res = await adminApi.get(`/invoices/${otherInvoice.record_id || otherInvoice.id}`);

      expect(res.status).toBe(404);

      await cleanupTenant(otherTenant.id);
    });
  });

  // ===========================================================================
  // FILTERING
  // ===========================================================================
  describe('Filtering', () => {
    test('filter by status works', async () => {
      const owner = await createOwner(env.tenantId);
      await createInvoice(env.tenantId, owner.id, { status: 'SENT' });
      await createInvoice(env.tenantId, owner.id, { status: 'PAID' });

      const res = await adminApi.get('/invoices?status=SENT');

      expect(res.status).toBe(200);
      const invoices = res.data.data || res.data;
      invoices.forEach(i => expect(i.status).toBe('SENT'));
    });

    test('filter by owner_id works', async () => {
      const owner1 = await createOwner(env.tenantId);
      const owner2 = await createOwner(env.tenantId);

      await createInvoice(env.tenantId, owner1.id);
      await createInvoice(env.tenantId, owner2.id);

      const res = await adminApi.get(`/invoices?owner_id=${owner1.id}`);

      expect(res.status).toBe(200);
      const invoices = res.data.data || res.data;
      invoices.forEach(i => expect(i.owner_id).toBe(owner1.id));
    });

    test('filter by overdue works', async () => {
      const owner = await createOwner(env.tenantId);
      await createInvoice(env.tenantId, owner.id, {
        status: 'SENT',
        due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      });

      const res = await adminApi.get('/invoices?overdue=true');

      expect(res.status).toBe(200);
    });
  });
});
