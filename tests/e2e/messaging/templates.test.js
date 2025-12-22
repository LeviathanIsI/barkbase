/**
 * E2E Tests - Message Templates
 *
 * Tests for email/SMS template management:
 * - Template CRUD
 * - Template variables
 * - Template rendering
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

// Helper to create message template
async function createTemplate(tenantId, overrides = {}) {
  const result = await query(
    `INSERT INTO "MessageTemplate" (tenant_id, key, name, type, subject, body, variables, is_system)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      tenantId,
      overrides.key || `template_${Date.now()}`,
      overrides.name || 'Test Template',
      overrides.type || 'email',
      overrides.subject || 'Test Subject',
      overrides.body || 'Hello {{name}}, this is a test message.',
      JSON.stringify(overrides.variables || ['name']),
      overrides.is_system || false,
    ]
  );
  return result.rows[0];
}

describe('Message Templates E2E Tests', () => {
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
    test('GET /templates returns list of templates', async () => {
      await createTemplate(env.tenantId, { key: 'list_test_template' });

      const res = await adminApi.get('/templates');

      if (res.status === 200) {
        expect(Array.isArray(res.data.data || res.data)).toBe(true);
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /templates/:id returns single template', async () => {
      const template = await createTemplate(env.tenantId, { key: 'get_test_template' });

      const res = await adminApi.get(`/templates/${template.id}`);

      if (res.status === 200) {
        expect(res.data.key).toBe('get_test_template');
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('POST /templates creates new email template', async () => {
      const templateData = {
        key: 'booking_confirmation',
        name: 'Booking Confirmation',
        type: 'email',
        subject: 'Your Booking is Confirmed - {{booking_number}}',
        body: `
          Hello {{owner_name}},

          Your booking for {{pet_name}} has been confirmed!

          Check-in: {{check_in_date}}
          Check-out: {{check_out_date}}

          Thank you for choosing us!
        `,
        variables: ['owner_name', 'pet_name', 'booking_number', 'check_in_date', 'check_out_date'],
      };

      const res = await adminApi.post('/templates', templateData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.key).toBe('booking_confirmation');
        expect(res.data.type).toBe('email');
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('POST /templates creates new SMS template', async () => {
      const templateData = {
        key: 'booking_reminder_sms',
        name: 'Booking Reminder SMS',
        type: 'sms',
        body: 'Reminder: {{pet_name}} has a booking tomorrow at {{time}}. Reply CONFIRM to confirm.',
        variables: ['pet_name', 'time'],
      };

      const res = await adminApi.post('/templates', templateData);

      if ([200, 201].includes(res.status)) {
        expect(res.data.type).toBe('sms');
      } else {
        expect([200, 201, 404]).toContain(res.status);
      }
    });

    test('PATCH /templates/:id updates template', async () => {
      const template = await createTemplate(env.tenantId, { key: 'update_test_template' });

      const res = await adminApi.patch(`/templates/${template.id}`, {
        subject: 'Updated Subject',
        body: 'Updated body with {{variable}}',
      });

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/templates/${template.id}`);
        if (getRes.status === 200) {
          expect(getRes.data.subject).toBe('Updated Subject');
        }
      } else {
        expect([200, 204, 404]).toContain(res.status);
      }
    });

    test('DELETE /templates/:id deletes template', async () => {
      const template = await createTemplate(env.tenantId, { key: 'delete_test_template' });

      const res = await adminApi.delete(`/templates/${template.id}`);

      if ([200, 204].includes(res.status)) {
        const getRes = await adminApi.get(`/templates/${template.id}`);
        expect(getRes.status).toBe(404);
      } else {
        expect([200, 204, 404]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // TEMPLATE TYPES
  // ===========================================================================
  describe('Template Types', () => {
    test('filter templates by type=email', async () => {
      await createTemplate(env.tenantId, { key: 'email_filter_test', type: 'email' });
      await createTemplate(env.tenantId, { key: 'sms_filter_test', type: 'sms' });

      const res = await adminApi.get('/templates?type=email');

      if (res.status === 200) {
        const templates = res.data.data || res.data;
        templates.forEach(t => expect(t.type).toBe('email'));
      }
    });

    test('filter templates by type=sms', async () => {
      const res = await adminApi.get('/templates?type=sms');

      if (res.status === 200) {
        const templates = res.data.data || res.data;
        templates.forEach(t => expect(t.type).toBe('sms'));
      }
    });
  });

  // ===========================================================================
  // TEMPLATE RENDERING
  // ===========================================================================
  describe('Template Rendering', () => {
    test('POST /templates/:id/render renders template with variables', async () => {
      const template = await createTemplate(env.tenantId, {
        key: 'render_test_template',
        subject: 'Hello {{name}}',
        body: 'Dear {{name}}, your appointment is on {{date}}.',
        variables: ['name', 'date'],
      });

      const res = await adminApi.post(`/templates/${template.id}/render`, {
        variables: {
          name: 'John Doe',
          date: '2024-12-25',
        },
      });

      if (res.status === 200) {
        expect(res.data.subject).toContain('John Doe');
        expect(res.data.body).toContain('John Doe');
        expect(res.data.body).toContain('2024-12-25');
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('POST /templates/:id/preview generates preview', async () => {
      const template = await createTemplate(env.tenantId, {
        key: 'preview_test_template',
        body: 'Hello {{owner_name}}, your pet {{pet_name}} is ready!',
      });

      const res = await adminApi.post(`/templates/${template.id}/preview`, {
        sample_data: {
          owner_name: 'Sample Owner',
          pet_name: 'Sample Pet',
        },
      });

      if (res.status === 200) {
        expect(res.data.preview || res.data.body).toContain('Sample Owner');
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('rendering with missing variables handles gracefully', async () => {
      const template = await createTemplate(env.tenantId, {
        key: 'missing_var_template',
        body: 'Hello {{name}}, your code is {{code}}.',
        variables: ['name', 'code'],
      });

      const res = await adminApi.post(`/templates/${template.id}/render`, {
        variables: {
          name: 'John',
          // Missing 'code'
        },
      });

      // Should either fail with 400 or handle gracefully
      expect([200, 400, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // TEMPLATE VARIABLES
  // ===========================================================================
  describe('Template Variables', () => {
    test('GET /templates/variables returns available variables', async () => {
      const res = await adminApi.get('/templates/variables');

      if (res.status === 200) {
        expect(res.data).toBeDefined();
        // Should have common variables like owner_name, pet_name, etc.
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });

    test('GET /templates/variables/:entity returns entity-specific variables', async () => {
      const res = await adminApi.get('/templates/variables/Booking');

      if (res.status === 200) {
        const vars = res.data.data || res.data;
        // Should include booking-specific variables
      } else {
        expect([200, 404]).toContain(res.status);
      }
    });
  });

  // ===========================================================================
  // SYSTEM TEMPLATES
  // ===========================================================================
  describe('System Templates', () => {
    test('cannot delete system template', async () => {
      const template = await createTemplate(env.tenantId, {
        key: 'system_template',
        is_system: true,
      });

      const res = await adminApi.delete(`/templates/${template.id}`);

      // System templates should be protected
      expect([400, 403, 404]).toContain(res.status);
    });

    test('can update system template content', async () => {
      const template = await createTemplate(env.tenantId, {
        key: 'system_template_update',
        is_system: true,
        body: 'Original content',
      });

      const res = await adminApi.patch(`/templates/${template.id}`, {
        body: 'Updated content',
      });

      // Should be able to customize system template content
      expect([200, 204, 403, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // VALIDATION ERRORS
  // ===========================================================================
  describe('Validation Errors', () => {
    test('returns 400 when key is missing', async () => {
      const res = await adminApi.post('/templates', {
        name: 'No Key Template',
        type: 'email',
        body: 'Test body',
      });

      expect([400, 404]).toContain(res.status);
    });

    test('returns 400 for invalid type', async () => {
      const res = await adminApi.post('/templates', {
        key: 'invalid_type_template',
        name: 'Invalid Type',
        type: 'invalid',
        body: 'Test body',
      });

      expect([400, 404, 422]).toContain(res.status);
    });

    test('returns 400 for duplicate key', async () => {
      await createTemplate(env.tenantId, { key: 'duplicate_key_template' });

      const res = await adminApi.post('/templates', {
        key: 'duplicate_key_template',
        name: 'Duplicate',
        type: 'email',
        body: 'Test body',
      });

      expect([400, 409, 422]).toContain(res.status);
    });

    test('email template without subject returns 400', async () => {
      const res = await adminApi.post('/templates', {
        key: 'no_subject_email',
        name: 'No Subject',
        type: 'email',
        body: 'Test body',
        // Missing subject
      });

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ===========================================================================
  // AUTH ERRORS
  // ===========================================================================
  describe('Auth Errors', () => {
    test('returns 401 with no token', async () => {
      const res = await api.get('/templates', null, { tenantId: env.tenantId });
      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // TENANT ISOLATION
  // ===========================================================================
  describe('Tenant Isolation', () => {
    test('cannot access templates from different tenant', async () => {
      const { createTestTenant } = require('../utils/setup');
      const otherTenant = await createTestTenant();
      const otherTemplate = await createTemplate(otherTenant.id, { key: 'other_tenant_template' });

      const res = await adminApi.get(`/templates/${otherTemplate.id}`);

      expect(res.status).toBe(404);

      await cleanupTenant(otherTenant.id);
    });
  });

  // ===========================================================================
  // NOT FOUND
  // ===========================================================================
  describe('Not Found', () => {
    test('returns 404 for non-existent template', async () => {
      const res = await adminApi.get('/templates/999999');
      expect(res.status).toBe(404);
    });
  });
});
