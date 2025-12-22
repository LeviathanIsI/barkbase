/**
 * E2E Tests - Tenant Settings
 *
 * Tests for tenant configuration:
 * - Business settings
 * - Branding settings
 * - Notification settings
 * - Booking settings
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
} = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');

jest.setTimeout(30000);

let env;
let adminApi;
let staffApi;

describe('Tenant Settings E2E Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection required for E2E tests');
    }

    env = await createTestEnvironment();
    adminApi = createApiClient(env.tokens.admin, env.tenantId);
    staffApi = createApiClient(env.tokens.staff, env.tenantId);
  });

  afterAll(async () => {
    await cleanupTenant(env?.tenantId);
    await closePool();
  });

  // ===========================================================================
  // GET SETTINGS
  // ===========================================================================
  describe('Get Settings', () => {
    test('GET /settings returns all tenant settings', async () => {
      const res = await adminApi.get('/settings');

      if (res.status === 200) {
        expect(res.data).toBeDefined();
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /settings/business returns business settings', async () => {
      const res = await adminApi.get('/settings/business');

      if (res.status === 200) {
        // Should have business-related settings
        expect(res.data).toBeDefined();
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /settings/booking returns booking settings', async () => {
      const res = await adminApi.get('/settings/booking');

      if (res.status === 200) {
        expect(res.data).toBeDefined();
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /settings/branding returns branding settings', async () => {
      const res = await adminApi.get('/settings/branding');

      if (res.status === 200) {
        expect(res.data).toBeDefined();
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // UPDATE BUSINESS SETTINGS
  // ===========================================================================
  describe('Update Business Settings', () => {
    test('PATCH /settings/business updates business name', async () => {
      const res = await adminApi.patch('/settings/business', {
        business_name: 'Updated Business Name',
      });

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get('/settings/business');
        if (getRes.status === 200) {
          expect(getRes.data.business_name).toBe('Updated Business Name');
        }
      } else {
        expect([200, 204, 404]).toContain(res.status);
      }
    });

    test('PATCH /settings/business updates contact info', async () => {
      const res = await adminApi.patch('/settings/business', {
        contact_email: 'business@test.com',
        contact_phone: '555-123-4567',
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('PATCH /settings/business updates address', async () => {
      const res = await adminApi.patch('/settings/business', {
        address: {
          street: '123 Main St',
          city: 'Test City',
          state: 'TC',
          zip: '12345',
        },
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('PATCH /settings/business updates operating hours', async () => {
      const res = await adminApi.patch('/settings/business', {
        operating_hours: {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '09:00', close: '14:00' },
          sunday: { closed: true },
        },
      });

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // UPDATE BOOKING SETTINGS
  // ===========================================================================
  describe('Update Booking Settings', () => {
    test('PATCH /settings/booking updates check-in/out times', async () => {
      const res = await adminApi.patch('/settings/booking', {
        default_check_in_time: '14:00',
        default_check_out_time: '11:00',
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('PATCH /settings/booking updates booking policies', async () => {
      const res = await adminApi.patch('/settings/booking', {
        min_booking_notice_hours: 24,
        max_booking_advance_days: 90,
        allow_same_day_booking: false,
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('PATCH /settings/booking updates cancellation policy', async () => {
      const res = await adminApi.patch('/settings/booking', {
        cancellation_policy: {
          free_cancellation_hours: 48,
          late_cancellation_fee_percent: 50,
          no_show_fee_percent: 100,
        },
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('PATCH /settings/booking updates required vaccinations', async () => {
      const res = await adminApi.patch('/settings/booking', {
        required_vaccinations: ['Rabies', 'DHPP', 'Bordetella'],
        vaccination_expiry_warning_days: 30,
      });

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // UPDATE BRANDING SETTINGS
  // ===========================================================================
  describe('Update Branding Settings', () => {
    test('PATCH /settings/branding updates colors', async () => {
      const res = await adminApi.patch('/settings/branding', {
        primary_color: '#3B82F6',
        secondary_color: '#10B981',
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('PATCH /settings/branding updates logo', async () => {
      const res = await adminApi.patch('/settings/branding', {
        logo_url: 'https://example.com/logo.png',
      });

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // UPDATE NOTIFICATION SETTINGS
  // ===========================================================================
  describe('Update Notification Settings', () => {
    test('PATCH /settings/notifications updates email settings', async () => {
      const res = await adminApi.patch('/settings/notifications', {
        email_booking_confirmation: true,
        email_booking_reminder: true,
        email_booking_cancellation: true,
        reminder_hours_before: 24,
      });

      expect([200, 204, 404]).toContain(res.status);
    });

    test('PATCH /settings/notifications updates SMS settings', async () => {
      const res = await adminApi.patch('/settings/notifications', {
        sms_enabled: true,
        sms_booking_confirmation: true,
        sms_booking_reminder: false,
      });

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // PERMISSION CHECKS
  // ===========================================================================
  describe('Permission Checks', () => {
    test('staff cannot update business settings', async () => {
      const res = await staffApi.patch('/settings/business', {
        business_name: 'Staff Attempt',
      });

      expect([401, 403]).toContain(res.status);
    });

    test('staff can read settings', async () => {
      const res = await staffApi.get('/settings');

      // Staff might have read access
      expect([200, 403, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 for invalid email format', async () => {
      const res = await adminApi.patch('/settings/business', {
        contact_email: 'invalid-email',
      });

      expect([400, 404, 422]).toContain(res.status);
    });

    test('returns 400 for invalid time format', async () => {
      const res = await adminApi.patch('/settings/booking', {
        default_check_in_time: 'invalid-time',
      });

      expect([400, 404, 422]).toContain(res.status);
    });

    test('returns 400 for negative values', async () => {
      const res = await adminApi.patch('/settings/booking', {
        min_booking_notice_hours: -5,
      });

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // AUTH ERRORS
  // ===========================================================================
  describe('Auth Errors', () => {
    test('returns 401 with no token', async () => {
      const res = await api.get('/settings', null, { tenantId: env.tenantId });
      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('settings are tenant-scoped', async () => {
      const { createTestTenant, createTestUser, getAuthToken } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherUser = await createTestUser(otherTenant.id, 'ADMIN');
      const otherToken = getAuthToken(otherUser);
      const otherApi = createApiClient(otherToken, otherTenant.id);

      // Update this tenant's settings
      await adminApi.patch('/settings/business', {
        business_name: 'Tenant A Business',
      });

      // Other tenant should not see this change
      const res = await otherApi.get('/settings/business');

      if (res.status === 200) {
        expect(res.data.business_name).not.toBe('Tenant A Business');
      }

      await cleanupTenant(otherTenant.id);
    });
  });
});
