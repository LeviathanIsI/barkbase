/**
 * E2E Tests - RBAC Permission Checks
 *
 * Tests role-based access control:
 * - ADMIN can access everything
 * - MANAGER has limited write access
 * - STAFF has limited read/update access
 * - VIEWER has read-only access
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
} = require('../utils/setup');
const { createApiClient } = require('../utils/api');
const { createOwner, createPet, createBooking } = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;
let managerApi;
let staffApi;
let viewerApi;

describe('RBAC Permission E2E Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection required for E2E tests');
    }

    env = await createTestEnvironment();
    adminApi = createApiClient(env.tokens.admin, env.tenantId);
    managerApi = createApiClient(env.tokens.manager, env.tenantId);
    staffApi = createApiClient(env.tokens.staff, env.tenantId);
    viewerApi = createApiClient(env.tokens.viewer, env.tenantId);
  });

  afterAll(async () => {
    await cleanupTenant(env?.tenantId);
    await closePool();
  });

  describe('Owner Operations', () => {
    let testOwner;

    beforeAll(async () => {
      testOwner = await createOwner(env.tenantId);
    });

    describe('Read Access', () => {
      test('ADMIN can read owners', async () => {
        const res = await adminApi.get('/owners');
        expect(res.status).toBe(200);
      });

      test('MANAGER can read owners', async () => {
        const res = await managerApi.get('/owners');
        expect(res.status).toBe(200);
      });

      test('STAFF can read owners', async () => {
        const res = await staffApi.get('/owners');
        expect(res.status).toBe(200);
      });

      test('VIEWER can read owners', async () => {
        const res = await viewerApi.get('/owners');
        expect(res.status).toBe(200);
      });
    });

    describe('Create Access', () => {
      test('ADMIN can create owners', async () => {
        const res = await adminApi.post('/owners', {
          first_name: 'Test',
          last_name: 'Admin',
          email: `admin-test-${Date.now()}@example.com`,
        });
        expect([200, 201]).toContain(res.status);
      });

      test('MANAGER can create owners', async () => {
        const res = await managerApi.post('/owners', {
          first_name: 'Test',
          last_name: 'Manager',
          email: `manager-test-${Date.now()}@example.com`,
        });
        expect([200, 201]).toContain(res.status);
      });

      test('STAFF cannot create owners', async () => {
        const res = await staffApi.post('/owners', {
          first_name: 'Test',
          last_name: 'Staff',
          email: `staff-test-${Date.now()}@example.com`,
        });
        expect(res.status).toBe(403);
      });

      test('VIEWER cannot create owners', async () => {
        const res = await viewerApi.post('/owners', {
          first_name: 'Test',
          last_name: 'Viewer',
          email: `viewer-test-${Date.now()}@example.com`,
        });
        expect(res.status).toBe(403);
      });
    });

    describe('Update Access', () => {
      test('ADMIN can update owners', async () => {
        const res = await adminApi.patch(`/owners/${testOwner.record_id || testOwner.id}`, {
          first_name: 'Updated',
        });
        expect([200, 204]).toContain(res.status);
      });

      test('MANAGER can update owners', async () => {
        const res = await managerApi.patch(`/owners/${testOwner.record_id || testOwner.id}`, {
          first_name: 'Updated',
        });
        expect([200, 204]).toContain(res.status);
      });

      test('STAFF cannot update owners', async () => {
        const res = await staffApi.patch(`/owners/${testOwner.record_id || testOwner.id}`, {
          first_name: 'Updated',
        });
        expect(res.status).toBe(403);
      });

      test('VIEWER cannot update owners', async () => {
        const res = await viewerApi.patch(`/owners/${testOwner.record_id || testOwner.id}`, {
          first_name: 'Updated',
        });
        expect(res.status).toBe(403);
      });
    });

    describe('Delete Access', () => {
      test('ADMIN can delete owners', async () => {
        const ownerToDelete = await createOwner(env.tenantId);
        const res = await adminApi.delete(`/owners/${ownerToDelete.record_id || ownerToDelete.id}`);
        expect([200, 204]).toContain(res.status);
      });

      test('MANAGER can delete owners', async () => {
        const ownerToDelete = await createOwner(env.tenantId);
        const res = await managerApi.delete(`/owners/${ownerToDelete.record_id || ownerToDelete.id}`);
        expect([200, 204]).toContain(res.status);
      });

      test('STAFF cannot delete owners', async () => {
        const ownerToDelete = await createOwner(env.tenantId);
        const res = await staffApi.delete(`/owners/${ownerToDelete.record_id || ownerToDelete.id}`);
        expect(res.status).toBe(403);
      });

      test('VIEWER cannot delete owners', async () => {
        const ownerToDelete = await createOwner(env.tenantId);
        const res = await viewerApi.delete(`/owners/${ownerToDelete.record_id || ownerToDelete.id}`);
        expect(res.status).toBe(403);
      });
    });
  });

  describe('Pet Operations', () => {
    let testOwner;
    let testPet;

    beforeAll(async () => {
      testOwner = await createOwner(env.tenantId);
      testPet = await createPet(env.tenantId, testOwner.id);
    });

    describe('Read Access', () => {
      test('All roles can read pets', async () => {
        for (const [role, api] of [
          ['admin', adminApi],
          ['manager', managerApi],
          ['staff', staffApi],
          ['viewer', viewerApi],
        ]) {
          const res = await api.get('/pets');
          expect(res.status).toBe(200);
        }
      });
    });

    describe('Update Access', () => {
      test('STAFF can update pets (limited)', async () => {
        const res = await staffApi.patch(`/pets/${testPet.record_id || testPet.id}`, {
          medical_notes: 'Updated notes',
        });
        expect([200, 204]).toContain(res.status);
      });
    });
  });

  describe('Booking Operations', () => {
    let testOwner;
    let testBooking;

    beforeAll(async () => {
      testOwner = await createOwner(env.tenantId);
      testBooking = await createBooking(env.tenantId, testOwner.id);
    });

    describe('Status Updates', () => {
      test('STAFF can update booking status', async () => {
        const res = await staffApi.patch(`/bookings/${testBooking.record_id || testBooking.id}`, {
          status: 'CONFIRMED',
        });
        expect([200, 204]).toContain(res.status);
      });

      test('VIEWER cannot update booking status', async () => {
        const res = await viewerApi.patch(`/bookings/${testBooking.record_id || testBooking.id}`, {
          status: 'CONFIRMED',
        });
        expect(res.status).toBe(403);
      });
    });
  });

  describe('Financial Operations', () => {
    describe('Payment Access', () => {
      test('ADMIN can access payments', async () => {
        const res = await adminApi.get('/payments');
        expect(res.status).toBe(200);
      });

      test('MANAGER can access payments', async () => {
        const res = await managerApi.get('/payments');
        expect(res.status).toBe(200);
      });

      test('STAFF cannot access payments', async () => {
        const res = await staffApi.get('/payments');
        expect(res.status).toBe(403);
      });

      test('VIEWER cannot access payments', async () => {
        const res = await viewerApi.get('/payments');
        expect(res.status).toBe(403);
      });
    });

    describe('Invoice Access', () => {
      test('MANAGER can create invoices', async () => {
        const owner = await createOwner(env.tenantId);
        const res = await managerApi.post('/invoices', {
          owner_id: owner.id,
          subtotal_cents: 10000,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        expect([200, 201]).toContain(res.status);
      });

      test('MANAGER cannot delete invoices', async () => {
        const owner = await createOwner(env.tenantId);
        const invoice = await managerApi.post('/invoices', {
          owner_id: owner.id,
          subtotal_cents: 5000,
          due_date: new Date().toISOString(),
        });

        if (invoice.data?.id) {
          const res = await managerApi.delete(`/invoices/${invoice.data.id}`);
          expect(res.status).toBe(403);
        }
      });
    });
  });

  describe('Staff Management', () => {
    test('MANAGER can only read staff', async () => {
      const readRes = await managerApi.get('/staff');
      expect(res.status).toBe(200);

      const createRes = await managerApi.post('/staff', {
        first_name: 'New',
        last_name: 'Staff',
        email: `new-staff-${Date.now()}@example.com`,
      });
      expect(createRes.status).toBe(403);
    });

    test('ADMIN can manage staff', async () => {
      const createRes = await adminApi.post('/staff', {
        first_name: 'Admin',
        last_name: 'Created',
        email: `admin-staff-${Date.now()}@example.com`,
      });
      expect([200, 201]).toContain(createRes.status);
    });
  });

  describe('Report Access', () => {
    test('MANAGER can view reports', async () => {
      const res = await managerApi.get('/analytics/reports');
      expect(res.status).toBe(200);
    });

    test('STAFF cannot view reports', async () => {
      const res = await staffApi.get('/analytics/reports');
      expect(res.status).toBe(403);
    });
  });
});
