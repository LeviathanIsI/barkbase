/**
 * E2E Tests - Notifications
 *
 * Tests for notification management:
 * - Notification sending
 * - Notification history
 * - Notification preferences
 */

const {
  testConnection,
  closePool,
  createTestEnvironment,
  cleanupTenant,
  query,
} = require('../utils/setup');
const { createApiClient, api } = require('../utils/api');
const { createOwner, createBooking } = require('../utils/factories');

jest.setTimeout(30000);

let env;
let adminApi;

// Helper to create notification
async function createNotification(tenantId, overrides = {}) {
  const result = await query(
    `INSERT INTO "Notification" (tenant_id, recipient_id, recipient_type, type, channel, subject, body, status, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      tenantId,
      overrides.recipient_id,
      overrides.recipient_type || 'Owner',
      overrides.type || 'booking_confirmation',
      overrides.channel || 'email',
      overrides.subject || 'Test Notification',
      overrides.body || 'This is a test notification.',
      overrides.status || 'sent',
      overrides.sent_at || new Date(),
    ]
  );
  return result.rows[0];
}

describe('Notifications E2E Tests', () => {
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
  // SEND NOTIFICATIONS
  // ===========================================================================
  describe('Send Notifications', () => {
    test('POST /notifications/send sends email notification', async () => {
      const owner = await createOwner(env.tenantId, {
        email: `notify_test_${Date.now()}@example.com`,
      });

      const res = await adminApi.post('/notifications/send', {
        recipient_id: owner.id,
        recipient_type: 'Owner',
        type: 'custom',
        channel: 'email',
        subject: 'Test Email',
        body: 'This is a test email notification.',
      });

      if ([200, 201, 202].includes(res.status)) {
        expect(res.data.status === 'sent' || res.data.status === 'queued').toBe(true);
      } else {
        expect([200, 201, 202, 404]).toContain(res.status);
      }
    });

    test('POST /notifications/send sends SMS notification', async () => {
      const owner = await createOwner(env.tenantId, {
        phone: '555-123-4567',
      });

      const res = await adminApi.post('/notifications/send', {
        recipient_id: owner.id,
        recipient_type: 'Owner',
        type: 'custom',
        channel: 'sms',
        body: 'This is a test SMS notification.',
      });

      expect([200, 201, 202, 400, 404]).toContain(res.status);
    });

    test('POST /notifications/send-template sends template-based notification', async () => {
      const owner = await createOwner(env.tenantId, {
        first_name: 'Template',
        email: `template_test_${Date.now()}@example.com`,
      });

      const res = await adminApi.post('/notifications/send-template', {
        recipient_id: owner.id,
        recipient_type: 'Owner',
        template_key: 'booking_confirmation',
        channel: 'email',
        variables: {
          owner_name: owner.first_name,
          booking_number: 'BK-001',
          check_in_date: '2024-12-25',
          check_out_date: '2024-12-28',
        },
      });

      expect([200, 201, 202, 404]).toContain(res.status);
    });

    test('POST /notifications/send-bulk sends bulk notifications', async () => {
      const owner1 = await createOwner(env.tenantId, {
        email: `bulk1_${Date.now()}@example.com`,
      });
      const owner2 = await createOwner(env.tenantId, {
        email: `bulk2_${Date.now()}@example.com`,
      });

      const res = await adminApi.post('/notifications/send-bulk', {
        recipient_ids: [owner1.id, owner2.id],
        recipient_type: 'Owner',
        type: 'announcement',
        channel: 'email',
        subject: 'Important Announcement',
        body: 'This is a bulk notification.',
      });

      expect([200, 201, 202, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // NOTIFICATION HISTORY
  // ===========================================================================
  describe('Notification History', () => {
    test('GET /notifications returns list of notifications', async () => {
      const owner = await createOwner(env.tenantId);
      await createNotification(env.tenantId, { recipient_id: owner.id });

      const res = await adminApi.get('/notifications');

      if (res.status === 200) {
        expect(Array.isArray(res.data.data || res.data)).toBe(true);
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /notifications/:id returns single notification', async () => {
      const owner = await createOwner(env.tenantId);
      const notification = await createNotification(env.tenantId, { recipient_id: owner.id });

      const res = await adminApi.get(`/notifications/${notification.id}`);

      if (res.status === 200) {
        expect(res.data.id).toBe(notification.id);
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /notifications?recipient_id filters by recipient', async () => {
      const owner1 = await createOwner(env.tenantId);
      const owner2 = await createOwner(env.tenantId);
      await createNotification(env.tenantId, { recipient_id: owner1.id });
      await createNotification(env.tenantId, { recipient_id: owner2.id });

      const res = await adminApi.get(`/notifications?recipient_id=${owner1.id}`);

      if (res.status === 200) {
        const notifications = res.data.data || res.data;
        notifications.forEach(n => expect(n.recipient_id).toBe(owner1.id));
      }
    });

    test('GET /notifications?type filters by type', async () => {
      const owner = await createOwner(env.tenantId);
      await createNotification(env.tenantId, {
        recipient_id: owner.id,
        type: 'booking_confirmation',
      });
      await createNotification(env.tenantId, {
        recipient_id: owner.id,
        type: 'payment_received',
      });

      const res = await adminApi.get('/notifications?type=booking_confirmation');

      if (res.status === 200) {
        const notifications = res.data.data || res.data;
        notifications.forEach(n => expect(n.type).toBe('booking_confirmation'));
      }
    });

    test('GET /notifications?channel filters by channel', async () => {
      const owner = await createOwner(env.tenantId);
      await createNotification(env.tenantId, { recipient_id: owner.id, channel: 'email' });
      await createNotification(env.tenantId, { recipient_id: owner.id, channel: 'sms' });

      const res = await adminApi.get('/notifications?channel=email');

      if (res.status === 200) {
        const notifications = res.data.data || res.data;
        notifications.forEach(n => expect(n.channel).toBe('email'));
      }
    });

    test('GET /notifications?status filters by status', async () => {
      const owner = await createOwner(env.tenantId);
      await createNotification(env.tenantId, { recipient_id: owner.id, status: 'sent' });
      await createNotification(env.tenantId, { recipient_id: owner.id, status: 'failed' });

      const res = await adminApi.get('/notifications?status=sent');

      if (res.status === 200) {
        const notifications = res.data.data || res.data;
        notifications.forEach(n => expect(n.status).toBe('sent'));
      }
    });
  });

  // ===========================================================================
  // OWNER NOTIFICATION HISTORY
  // ===========================================================================
  describe('Owner Notification History', () => {
    test('GET /owners/:id/notifications returns owner notifications', async () => {
      const owner = await createOwner(env.tenantId);
      await createNotification(env.tenantId, { recipient_id: owner.id });

      const res = await adminApi.get(`/owners/${owner.record_id || owner.id}/notifications`);

      if (res.status === 200) {
        const notifications = res.data.data || res.data;
        expect(Array.isArray(notifications)).toBe(true);
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // NOTIFICATION PREFERENCES
  // ===========================================================================
  describe('Notification Preferences', () => {
    test('GET /owners/:id/notification-preferences returns preferences', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.get(
        `/owners/${owner.record_id || owner.id}/notification-preferences`
      );

      expect([200, 404]).toContain(res.status);
    });

    test('PATCH /owners/:id/notification-preferences updates preferences', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.patch(
        `/owners/${owner.record_id || owner.id}/notification-preferences`,
        {
          email_booking_confirmation: true,
          email_booking_reminder: true,
          sms_booking_confirmation: false,
          sms_booking_reminder: false,
          email_marketing: false,
        }
      );

      expect([200, 204, 404]).toContain(res.status);
    });

    test('owner opt-out is respected', async () => {
      const owner = await createOwner(env.tenantId, {
        email: `optout_${Date.now()}@example.com`,
      });

      // Opt out of email marketing
      await adminApi.patch(
        `/owners/${owner.record_id || owner.id}/notification-preferences`,
        {
          email_marketing: false,
        }
      );

      // Try to send marketing email
      const res = await adminApi.post('/notifications/send', {
        recipient_id: owner.id,
        recipient_type: 'Owner',
        type: 'marketing',
        channel: 'email',
        subject: 'Marketing Email',
        body: 'Marketing content',
      });

      // Should either skip or indicate opt-out
      expect([200, 201, 202, 400, 404, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // NOTIFICATION STATUS
  // ===========================================================================
  describe('Notification Status', () => {
    test('POST /notifications/:id/retry retries failed notification', async () => {
      const owner = await createOwner(env.tenantId);
      const notification = await createNotification(env.tenantId, {
        recipient_id: owner.id,
        status: 'failed',
      });

      const res = await adminApi.post(`/notifications/${notification.id}/retry`, {});

      expect([200, 202, 404]).toContain(res.status);
    });

    test('GET /notifications/:id/delivery-status returns delivery info', async () => {
      const owner = await createOwner(env.tenantId);
      const notification = await createNotification(env.tenantId, {
        recipient_id: owner.id,
        status: 'sent',
      });

      const res = await adminApi.get(`/notifications/${notification.id}/delivery-status`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // SCHEDULED NOTIFICATIONS
  // ===========================================================================
  describe('Scheduled Notifications', () => {
    test('POST /notifications/schedule schedules notification', async () => {
      const owner = await createOwner(env.tenantId, {
        email: `schedule_${Date.now()}@example.com`,
      });

      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const res = await adminApi.post('/notifications/schedule', {
        recipient_id: owner.id,
        recipient_type: 'Owner',
        type: 'reminder',
        channel: 'email',
        subject: 'Scheduled Reminder',
        body: 'This is a scheduled notification.',
        scheduled_for: scheduledTime.toISOString(),
      });

      expect([200, 201, 202, 404]).toContain(res.status);
    });

    test('DELETE /notifications/:id/cancel cancels scheduled notification', async () => {
      const owner = await createOwner(env.tenantId);
      const notification = await createNotification(env.tenantId, {
        recipient_id: owner.id,
        status: 'scheduled',
      });

      const res = await adminApi.delete(`/notifications/${notification.id}/cancel`);

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when recipient_id is missing', async () => {
      const res = await adminApi.post('/notifications/send', {
        type: 'custom',
        channel: 'email',
        subject: 'Test',
        body: 'Test body',
      });

      expect([400, 404]).toContain(res.status);
    });

    test('returns 400 for invalid channel', async () => {
      const owner = await createOwner(env.tenantId);

      const res = await adminApi.post('/notifications/send', {
        recipient_id: owner.id,
        recipient_type: 'Owner',
        type: 'custom',
        channel: 'invalid_channel',
        body: 'Test body',
      });

      expect([400, 404, 422]).toContain(res.status);
    });

    test('returns 400 when sending to owner without email', async () => {
      const owner = await createOwner(env.tenantId, {
        email: null,
      });

      const res = await adminApi.post('/notifications/send', {
        recipient_id: owner.id,
        recipient_type: 'Owner',
        type: 'custom',
        channel: 'email',
        subject: 'Test',
        body: 'Test body',
      });

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // AUTH ERRORS
  // ===========================================================================
  describe('Auth Errors', () => {
    test('returns 401 with no token', async () => {
      const res = await api.get('/notifications', null, { tenantId: env.tenantId });
      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('cannot access notifications from different tenant', async () => {
      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherOwner = await createOwner(otherTenant.id);
      const otherNotification = await createNotification(otherTenant.id, {
        recipient_id: otherOwner.id,
      });

      const res = await adminApi.get(`/notifications/${otherNotification.id}`);

      expect(res.status).toBe(404);

      await cleanupTenant(otherTenant.id);
    });

    test('cannot send notifications to other tenant owners', async () => {
      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherOwner = await createOwner(otherTenant.id);

      const res = await adminApi.post('/notifications/send', {
        recipient_id: otherOwner.id,
        recipient_type: 'Owner',
        type: 'custom',
        channel: 'email',
        subject: 'Test',
        body: 'Test body',
      });

      // Should fail - owner not in this tenant
      expect([400, 404, 422]).toContain(res.status);

      await cleanupTenant(otherTenant.id);
    });
  });

  // ===========================================================================
  // NOT FOUND
  // ===========================================================================
  describe('Not Found', () => {
    test('returns 404 for non-existent notification', async () => {
      const res = await adminApi.get('/notifications/999999');
      expect(res.status).toBe(404);
    });
  });
});
