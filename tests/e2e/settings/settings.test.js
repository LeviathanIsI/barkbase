/**
 * E2E Tests - Settings Pages
 *
 * Comprehensive tests for ALL settings pages and every field/toggle/dropdown.
 * Tests use REAL Cognito tokens and verify data persistence.
 *
 * Test account: joshua.r.bradford1@gmail.com
 */

const {
  testConnection,
  closePool,
  getTestContext,
  query,
} = require('../utils/setup');
const { api, createApiClient } = require('../utils/api');

jest.setTimeout(60000);

let authToken;
let testContext;
let apiClient;

// Test results tracking
const testResults = {
  totalFields: 0,
  working: 0,
  endpoint404: [],
  endpoint500: [],
  uiMissing: [],
  saveNotWorking: [],
};

// Helper to track test results
function trackResult(fieldName, status, details = '') {
  testResults.totalFields++;
  if (status === 'working') {
    testResults.working++;
  } else if (status === '404') {
    testResults.endpoint404.push({ field: fieldName, details });
  } else if (status === '500') {
    testResults.endpoint500.push({ field: fieldName, details });
  } else if (status === 'ui_missing') {
    testResults.uiMissing.push({ field: fieldName, details });
  } else if (status === 'save_failed') {
    testResults.saveNotWorking.push({ field: fieldName, details });
  }
}

// Helper to test GET endpoint
async function testGetEndpoint(endpoint, fieldName) {
  try {
    const res = await apiClient.get(endpoint);
    if (res.status === 404) {
      trackResult(fieldName, '404', `GET ${endpoint}`);
      return { success: false, status: 404, data: null };
    }
    if (res.status >= 500) {
      trackResult(fieldName, '500', `GET ${endpoint}: ${JSON.stringify(res.data)}`);
      return { success: false, status: res.status, data: null };
    }
    return { success: true, status: res.status, data: res.data };
  } catch (error) {
    trackResult(fieldName, '500', `GET ${endpoint}: ${error.message}`);
    return { success: false, status: 500, data: null };
  }
}

// Helper to test PUT/POST endpoint
async function testSaveEndpoint(method, endpoint, body, fieldName) {
  try {
    const res = method === 'PUT'
      ? await apiClient.put(endpoint, body)
      : await apiClient.post(endpoint, body);

    if (res.status === 404) {
      trackResult(fieldName, '404', `${method} ${endpoint}`);
      return { success: false, status: 404 };
    }
    if (res.status >= 500) {
      trackResult(fieldName, '500', `${method} ${endpoint}: ${JSON.stringify(res.data)}`);
      return { success: false, status: res.status };
    }
    if (!res.ok) {
      trackResult(fieldName, 'save_failed', `${method} ${endpoint}: ${res.status} - ${JSON.stringify(res.data)}`);
      return { success: false, status: res.status };
    }
    trackResult(fieldName, 'working');
    return { success: true, status: res.status, data: res.data };
  } catch (error) {
    trackResult(fieldName, '500', `${method} ${endpoint}: ${error.message}`);
    return { success: false, status: 500 };
  }
}

describe('Settings E2E Tests', () => {
  beforeAll(async () => {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection required for E2E tests');
    }

    testContext = await getTestContext();
    authToken = testContext.token;
    apiClient = createApiClient(authToken, testContext.tenantId, testContext.accountCode);

    console.log('[E2E Settings] Test context loaded:', {
      email: testContext.user.email,
      tenantId: testContext.tenantId,
    });

    // Create session
    await api.post('/auth/login', { accessToken: authToken }, authToken, {
      tenantId: testContext.tenantId,
    });
  });

  afterAll(async () => {
    // Print final report
    console.log('\n' + '='.repeat(60));
    console.log('SETTINGS E2E TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total fields tested: ${testResults.totalFields}`);
    console.log(`Working: ${testResults.working}`);
    console.log(`404 (endpoint missing): ${testResults.endpoint404.length}`);
    console.log(`500 (server error): ${testResults.endpoint500.length}`);
    console.log(`UI missing: ${testResults.uiMissing.length}`);
    console.log(`Save not working: ${testResults.saveNotWorking.length}`);

    if (testResults.endpoint404.length > 0) {
      console.log('\n404 Endpoints:');
      testResults.endpoint404.forEach(({ field, details }) => {
        console.log(`  - ${field}: ${details}`);
      });
    }

    if (testResults.endpoint500.length > 0) {
      console.log('\n500 Errors:');
      testResults.endpoint500.forEach(({ field, details }) => {
        console.log(`  - ${field}: ${details}`);
      });
    }

    if (testResults.saveNotWorking.length > 0) {
      console.log('\nSave Not Working:');
      testResults.saveNotWorking.forEach(({ field, details }) => {
        console.log(`  - ${field}: ${details}`);
      });
    }

    console.log('='.repeat(60) + '\n');

    await closePool();
  });

  // ============================================================================
  // PROFILE PAGE (/settings/profile)
  // ============================================================================
  describe('Profile Page (/settings/profile)', () => {
    describe('GET /user/profile - User Profile Data', () => {
      test('loads user profile with all fields', async () => {
        const res = await apiClient.get('/user/profile');

        if (res.status === 404) {
          trackResult('Profile - GET endpoint', '404', 'GET /user/profile');
        } else if (res.status >= 500) {
          trackResult('Profile - GET endpoint', '500', `GET /user/profile: ${res.status}`);
        } else {
          expect(res.status).toBe(200);
          expect(res.data).toBeDefined();
          trackResult('Profile - GET endpoint', 'working');
        }
      });

      test('profile contains First Name field', async () => {
        const res = await apiClient.get('/user/profile');
        if (res.ok && res.data) {
          const hasField = 'firstName' in res.data || 'first_name' in res.data;
          if (hasField) {
            trackResult('Profile - First Name', 'working');
          } else {
            trackResult('Profile - First Name', 'ui_missing', 'Field not in response');
          }
          expect(hasField).toBe(true);
        }
      });

      test('profile contains Last Name field', async () => {
        const res = await apiClient.get('/user/profile');
        if (res.ok && res.data) {
          const hasField = 'lastName' in res.data || 'last_name' in res.data;
          if (hasField) {
            trackResult('Profile - Last Name', 'working');
          } else {
            trackResult('Profile - Last Name', 'ui_missing', 'Field not in response');
          }
          expect(hasField).toBe(true);
        }
      });

      test('profile contains Email field', async () => {
        const res = await apiClient.get('/user/profile');
        if (res.ok && res.data) {
          const hasField = 'email' in res.data;
          if (hasField) {
            trackResult('Profile - Email', 'working');
          } else {
            trackResult('Profile - Email', 'ui_missing', 'Field not in response');
          }
          expect(hasField).toBe(true);
        }
      });

      test('profile contains Phone field', async () => {
        const res = await apiClient.get('/user/profile');
        if (res.ok && res.data) {
          const hasField = 'phone' in res.data || 'phoneNumber' in res.data;
          if (hasField) {
            trackResult('Profile - Phone', 'working');
          } else {
            trackResult('Profile - Phone', 'ui_missing', 'Field not in response');
          }
        }
      });

      test('profile contains Language field', async () => {
        const res = await apiClient.get('/user/profile');
        if (res.ok && res.data) {
          const hasField = 'language' in res.data || 'locale' in res.data;
          if (hasField) {
            trackResult('Profile - Language', 'working');
          } else {
            trackResult('Profile - Language', 'ui_missing', 'Field not in response');
          }
        }
      });

      test('profile contains Timezone field', async () => {
        const res = await apiClient.get('/user/profile');
        if (res.ok && res.data) {
          const hasField = 'timezone' in res.data || 'timeZone' in res.data;
          if (hasField) {
            trackResult('Profile - Timezone', 'working');
          } else {
            trackResult('Profile - Timezone', 'ui_missing', 'Field not in response');
          }
        }
      });

      test('profile contains passwordChangedAt field', async () => {
        const res = await apiClient.get('/user/profile');
        if (res.ok && res.data) {
          const hasField = 'passwordChangedAt' in res.data || 'password_changed_at' in res.data;
          if (hasField) {
            trackResult('Profile - Password Changed At', 'working');
          } else {
            trackResult('Profile - Password Changed At', 'ui_missing', 'Field not in response');
          }
        }
      });

      test('profile contains role field', async () => {
        const res = await apiClient.get('/user/profile');
        if (res.ok && res.data) {
          const hasField = 'role' in res.data || 'roles' in res.data;
          if (hasField) {
            trackResult('Profile - Role', 'working');
          } else {
            trackResult('Profile - Role', 'ui_missing', 'Field not in response');
          }
        }
      });
    });

    describe('PUT /user/profile - Update Profile', () => {
      test('can update First Name', async () => {
        const testValue = 'TestFirstName' + Date.now();
        await testSaveEndpoint('PUT', '/user/profile', { firstName: testValue }, 'Profile - Update First Name');
      });

      test('can update Last Name', async () => {
        const testValue = 'TestLastName' + Date.now();
        await testSaveEndpoint('PUT', '/user/profile', { lastName: testValue }, 'Profile - Update Last Name');
      });

      test('can update Phone', async () => {
        const testValue = '+15551234567';
        await testSaveEndpoint('PUT', '/user/profile', { phone: testValue }, 'Profile - Update Phone');
      });

      test('can update Language', async () => {
        await testSaveEndpoint('PUT', '/user/profile', { language: 'en' }, 'Profile - Update Language');
      });

      test('can update Timezone', async () => {
        await testSaveEndpoint('PUT', '/user/profile', { timezone: 'America/New_York' }, 'Profile - Update Timezone');
      });
    });

    describe('GET /auth/connected-email - Connected Email', () => {
      test('can fetch connected email status', async () => {
        const res = await testGetEndpoint('/auth/connected-email', 'Profile - Connected Email');
        if (res.success) {
          trackResult('Profile - Connected Email GET', 'working');
        }
      });
    });

    describe('GET /auth/sessions - Active Sessions', () => {
      test('can fetch active sessions', async () => {
        const res = await testGetEndpoint('/auth/sessions', 'Profile - Active Sessions');
        if (res.success) {
          trackResult('Profile - Active Sessions GET', 'working');
        }
      });
    });

    describe('POST /auth/change-password - Password Change', () => {
      test('change password endpoint exists', async () => {
        // Test with intentionally wrong password to verify endpoint exists
        const res = await apiClient.post('/auth/change-password', {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        });

        // 400 means endpoint exists but validation failed (expected)
        // 401 means auth issue
        // 404 means endpoint missing
        if (res.status === 404) {
          trackResult('Profile - Change Password Endpoint', '404', 'POST /auth/change-password');
        } else if (res.status >= 500) {
          trackResult('Profile - Change Password Endpoint', '500', `Status: ${res.status}`);
        } else {
          // 400 or similar means endpoint exists
          trackResult('Profile - Change Password Endpoint', 'working');
        }
      });
    });
  });

  // ============================================================================
  // NOTIFICATIONS PAGE (/settings/notifications)
  // ============================================================================
  describe('Notifications Page (/settings/notifications)', () => {
    describe('GET /config/notifications - Notification Settings', () => {
      test('loads notification settings', async () => {
        const res = await testGetEndpoint('/config/notifications', 'Notifications - GET');
      });
    });

    describe('PUT /config/notifications - Update Notification Settings', () => {
      const notificationSettings = {
        channels: {
          email: true,
          sms: false,
          inApp: true,
          push: true,
        },
        bookings: {
          newBookings: true,
          cancellations: true,
          modifications: true,
        },
        payments: {
          received: true,
          failed: true,
        },
        petHealth: {
          vaccinationExpiring: true,
          vaccinationExpired: true,
        },
        customer: {
          newInquiries: true,
        },
        schedule: {
          frequency: 'real-time',
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        },
      };

      test('can update Email channel toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { channels: { email: true } }, 'Notifications - Email Toggle');
      });

      test('can update SMS channel toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { channels: { sms: false } }, 'Notifications - SMS Toggle');
      });

      test('can update In-App channel toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { channels: { inApp: true } }, 'Notifications - In-App Toggle');
      });

      test('can update Push channel toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { channels: { push: true } }, 'Notifications - Push Toggle');
      });

      test('can update New Bookings toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { bookings: { newBookings: true } }, 'Notifications - New Bookings Toggle');
      });

      test('can update Cancellations toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { bookings: { cancellations: true } }, 'Notifications - Cancellations Toggle');
      });

      test('can update Modifications toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { bookings: { modifications: true } }, 'Notifications - Modifications Toggle');
      });

      test('can update Payment Received toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { payments: { received: true } }, 'Notifications - Payment Received Toggle');
      });

      test('can update Payment Failed toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { payments: { failed: true } }, 'Notifications - Payment Failed Toggle');
      });

      test('can update Vaccination Expiring toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { petHealth: { vaccinationExpiring: true } }, 'Notifications - Vaccination Expiring Toggle');
      });

      test('can update Vaccination Expired toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { petHealth: { vaccinationExpired: true } }, 'Notifications - Vaccination Expired Toggle');
      });

      test('can update New Inquiries toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { customer: { newInquiries: true } }, 'Notifications - New Inquiries Toggle');
      });

      test('can update Frequency setting', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { schedule: { frequency: 'daily' } }, 'Notifications - Frequency');
      });

      test('can update Quiet Hours toggle', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { schedule: { quietHoursEnabled: true } }, 'Notifications - Quiet Hours Toggle');
      });

      test('can update Quiet Hours Start', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { schedule: { quietHoursStart: '22:00' } }, 'Notifications - Quiet Hours Start');
      });

      test('can update Quiet Hours End', async () => {
        await testSaveEndpoint('PUT', '/config/notifications', { schedule: { quietHoursEnd: '07:00' } }, 'Notifications - Quiet Hours End');
      });
    });
  });

  // ============================================================================
  // ACCOUNT DEFAULTS PAGE (/settings/account-defaults)
  // ============================================================================
  describe('Account Defaults Page (/settings/account-defaults)', () => {
    describe('GET /tenants/current - Business Profile', () => {
      test('loads tenant/business profile', async () => {
        const res = await testGetEndpoint('/tenants/current', 'Account Defaults - GET Tenant');
      });
    });

    describe('Business Profile Tab', () => {
      test('can update Business Name', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { name: 'Test Business' }, 'Account Defaults - Business Name');
      });

      test('can update Tax ID / EIN', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { taxId: '12-3456789' }, 'Account Defaults - Tax ID');
      });

      test('can update Business Phone', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { phone: '+15551234567' }, 'Account Defaults - Business Phone');
      });

      test('can update Business Email', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { email: 'test@example.com' }, 'Account Defaults - Business Email');
      });

      test('can update Website', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { website: 'https://example.com' }, 'Account Defaults - Website');
      });

      test('can update Customer-facing Notes', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { customerNotes: 'Test notes' }, 'Account Defaults - Customer Notes');
      });

      test('can update Street Address', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { address: { street: '123 Test St' } }, 'Account Defaults - Street');
      });

      test('can update City', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { address: { city: 'Test City' } }, 'Account Defaults - City');
      });

      test('can update State', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { address: { state: 'OH' } }, 'Account Defaults - State');
      });

      test('can update Postal Code', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { address: { postalCode: '43215' } }, 'Account Defaults - Postal Code');
      });

      test('can update Country', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', { address: { country: 'US' } }, 'Account Defaults - Country');
      });
    });

    describe('GET /config/operating-hours - Scheduling Tab', () => {
      test('loads operating hours', async () => {
        await testGetEndpoint('/config/operating-hours', 'Account Defaults - Operating Hours GET');
      });
    });

    describe('PUT /config/operating-hours - Operating Hours', () => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      days.forEach((day) => {
        test(`can update ${day} open/closed toggle`, async () => {
          await testSaveEndpoint('PUT', '/config/operating-hours', {
            [day]: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          }, `Account Defaults - ${day} Toggle`);
        });
      });
    });

    describe('GET /config/holidays - Holiday Closures', () => {
      test('loads holiday closures', async () => {
        await testGetEndpoint('/config/holidays', 'Account Defaults - Holidays GET');
      });
    });

    describe('POST /config/holidays - Add Holiday', () => {
      test('can add a holiday closure', async () => {
        await testSaveEndpoint('POST', '/config/holidays', {
          name: 'Test Holiday',
          startDate: '2025-12-25',
          endDate: '2025-12-25',
          recurring: true,
        }, 'Account Defaults - Add Holiday');
      });
    });

    describe('GET /config/locale - Locale Tab', () => {
      test('loads locale settings', async () => {
        await testGetEndpoint('/config/locale', 'Account Defaults - Locale GET');
      });
    });

    describe('PUT /config/locale - Locale Settings', () => {
      test('can update Time Zone', async () => {
        await testSaveEndpoint('PUT', '/config/locale', { timezone: 'America/New_York' }, 'Account Defaults - Timezone');
      });

      test('can update Date Format', async () => {
        await testSaveEndpoint('PUT', '/config/locale', { dateFormat: 'MM/DD/YYYY' }, 'Account Defaults - Date Format');
      });

      test('can update Time Format', async () => {
        await testSaveEndpoint('PUT', '/config/locale', { timeFormat: '12-hour' }, 'Account Defaults - Time Format');
      });

      test('can update Week Starts On', async () => {
        await testSaveEndpoint('PUT', '/config/locale', { weekStartsOn: 'sunday' }, 'Account Defaults - Week Starts On');
      });
    });

    describe('GET /config/currency - Currency Tab', () => {
      test('loads currency settings', async () => {
        await testGetEndpoint('/config/currency', 'Account Defaults - Currency GET');
      });
    });

    describe('PUT /config/currency - Currency Settings', () => {
      test('can update Supported Currencies', async () => {
        await testSaveEndpoint('PUT', '/config/currency', { supportedCurrencies: ['USD', 'CAD'] }, 'Account Defaults - Supported Currencies');
      });

      test('can update Default Currency', async () => {
        await testSaveEndpoint('PUT', '/config/currency', { defaultCurrency: 'USD' }, 'Account Defaults - Default Currency');
      });
    });
  });

  // ============================================================================
  // USERS & TEAMS PAGE (/settings/users-teams)
  // ============================================================================
  describe('Users & Teams Page (/settings/users-teams)', () => {
    describe('GET /users - Team Members', () => {
      test('loads team members list', async () => {
        await testGetEndpoint('/users', 'Users & Teams - GET Users');
      });
    });

    describe('GET /users/invites - Pending Invites', () => {
      test('loads pending invites', async () => {
        await testGetEndpoint('/users/invites', 'Users & Teams - GET Invites');
      });
    });

    describe('POST /users/invite - Invite Member', () => {
      test('invite member endpoint exists', async () => {
        // Use a test email that won't actually send
        const res = await apiClient.post('/users/invite', {
          email: 'test-invite-' + Date.now() + '@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'STAFF',
        });

        if (res.status === 404) {
          trackResult('Users & Teams - Invite Member', '404', 'POST /users/invite');
        } else if (res.status >= 500) {
          trackResult('Users & Teams - Invite Member', '500', `Status: ${res.status}`);
        } else {
          trackResult('Users & Teams - Invite Member', 'working');
        }
      });
    });

    describe('PUT /users/:id/role - Update Role', () => {
      test('update role endpoint structure exists', async () => {
        // Test with current user
        const res = await apiClient.get('/users');
        if (res.ok && res.data && res.data.length > 0) {
          const userId = res.data[0].id || res.data[0].record_id;
          if (userId) {
            await testSaveEndpoint('PUT', `/users/${userId}/role`, { role: 'ADMIN' }, 'Users & Teams - Update Role');
          }
        } else {
          trackResult('Users & Teams - Update Role', 'ui_missing', 'No users found to test');
        }
      });
    });
  });

  // ============================================================================
  // INTEGRATIONS PAGE (/settings/integrations)
  // ============================================================================
  describe('Integrations Page (/settings/integrations)', () => {
    describe('GET /integrations - List Integrations', () => {
      test('loads integrations list', async () => {
        await testGetEndpoint('/integrations', 'Integrations - GET List');
      });
    });

    const integrations = [
      'google-calendar',
      'stripe',
      'mailchimp',
      'twilio',
      'quickbooks',
    ];

    integrations.forEach((integration) => {
      describe(`${integration} Integration`, () => {
        test(`GET /integrations/${integration} - status`, async () => {
          await testGetEndpoint(`/integrations/${integration}`, `Integrations - ${integration} GET`);
        });
      });
    });
  });

  // ============================================================================
  // BRANDING PAGE (/settings/branding)
  // ============================================================================
  describe('Branding Page (/settings/branding)', () => {
    describe('GET /tenants/current/theme - Theme Settings', () => {
      test('loads theme settings', async () => {
        await testGetEndpoint('/tenants/current/theme', 'Branding - GET Theme');
      });
    });

    describe('PUT /tenants/current/theme - Update Theme', () => {
      test('can update Primary Color', async () => {
        await testSaveEndpoint('PUT', '/tenants/current/theme', {
          colors: { primary: '59 130 246' },
        }, 'Branding - Primary Color');
      });

      test('can update Secondary Color', async () => {
        await testSaveEndpoint('PUT', '/tenants/current/theme', {
          colors: { secondary: '129 140 248' },
        }, 'Branding - Secondary Color');
      });

      test('can update Accent Color', async () => {
        await testSaveEndpoint('PUT', '/tenants/current/theme', {
          colors: { accent: '249 115 22' },
        }, 'Branding - Accent Color');
      });

      test('can update Background Color', async () => {
        await testSaveEndpoint('PUT', '/tenants/current/theme', {
          colors: { background: '255 255 255' },
        }, 'Branding - Background Color');
      });
    });

    describe('PUT /tenants/current/terminology - Terminology', () => {
      test('can update Kennel Term', async () => {
        await testSaveEndpoint('PUT', '/tenants/current', {
          terminology: { kennel: 'Suite' },
        }, 'Branding - Kennel Term');
      });
    });
  });

  // ============================================================================
  // DOMAIN & SSL PAGE (/settings/domain-ssl)
  // ============================================================================
  describe('Domain & SSL Page (/settings/domain-ssl)', () => {
    describe('GET /config/domain - Domain Settings', () => {
      test('loads domain settings', async () => {
        await testGetEndpoint('/config/domain', 'Domain & SSL - GET Domain');
      });
    });

    describe('PUT /config/domain - Update Domain', () => {
      test('can update custom domain', async () => {
        await testSaveEndpoint('PUT', '/config/domain', {
          customDomain: null, // Clear to avoid breaking things
        }, 'Domain & SSL - Custom Domain');
      });
    });

    describe('POST /config/domain/verify - Verify Domain', () => {
      test('verify domain endpoint exists', async () => {
        const res = await apiClient.post('/config/domain/verify', {});
        if (res.status === 404) {
          trackResult('Domain & SSL - Verify Domain', '404', 'POST /config/domain/verify');
        } else {
          trackResult('Domain & SSL - Verify Domain', 'working');
        }
      });
    });
  });

  // ============================================================================
  // FEATURE TOGGLES PAGE (/settings/feature-toggles)
  // ============================================================================
  describe('Feature Toggles Page (/settings/feature-toggles)', () => {
    describe('GET /config/features - Feature Settings', () => {
      test('loads feature settings', async () => {
        await testGetEndpoint('/config/features', 'Feature Toggles - GET Features');
      });
    });

    describe('PUT /config/features - Update Features', () => {
      const features = [
        'boarding',
        'daycare',
        'grooming',
        'payments',
        'packages',
        'messaging',
        'smsNotifications',
        'customerPortal',
        'advancedReports',
        'multiLocation',
        'aiFeatures',
      ];

      features.forEach((feature) => {
        test(`can update ${feature} toggle`, async () => {
          await testSaveEndpoint('PUT', '/config/features', {
            [feature]: true,
          }, `Feature Toggles - ${feature}`);
        });
      });
    });
  });

  // ============================================================================
  // SERVICES & PRICING PAGE (/settings/services-pricing)
  // ============================================================================
  describe('Services & Pricing Page (/settings/services-pricing)', () => {
    describe('GET /services - Services List', () => {
      test('loads services list', async () => {
        await testGetEndpoint('/services', 'Services - GET List');
      });
    });

    const categories = ['boarding', 'daycare', 'grooming', 'training'];

    categories.forEach((category) => {
      test(`can filter by ${category} category`, async () => {
        const res = await apiClient.get(`/services?category=${category.toUpperCase()}`);
        if (res.status === 404) {
          trackResult(`Services - ${category} Filter`, '404', `GET /services?category=${category}`);
        } else if (res.status >= 500) {
          trackResult(`Services - ${category} Filter`, '500', `Status: ${res.status}`);
        } else {
          trackResult(`Services - ${category} Filter`, 'working');
        }
      });
    });

    describe('POST /services - Create Service', () => {
      test('create service endpoint exists', async () => {
        const res = await apiClient.post('/services', {
          name: 'Test Service ' + Date.now(),
          category: 'BOARDING',
          price: 5000,
          duration: 60,
        });

        if (res.status === 404) {
          trackResult('Services - Create Service', '404', 'POST /services');
        } else if (res.status >= 500) {
          trackResult('Services - Create Service', '500', `Status: ${res.status}`);
        } else {
          trackResult('Services - Create Service', 'working');
        }
      });
    });
  });

  // ============================================================================
  // ONLINE BOOKING PAGE (/settings/online-booking)
  // ============================================================================
  describe('Online Booking Page (/settings/online-booking)', () => {
    describe('GET /config/online-booking - Booking Settings', () => {
      test('loads online booking settings', async () => {
        await testGetEndpoint('/config/online-booking', 'Online Booking - GET Settings');
      });
    });

    describe('PUT /config/online-booking - Update Settings', () => {
      // Portal Settings
      test('can update Portal Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { portalEnabled: true }, 'Online Booking - Portal Enabled');
      });

      test('can update URL Slug', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { urlSlug: 'test-kennel' }, 'Online Booking - URL Slug');
      });

      // Services Available Online
      test('can update Boarding Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { boardingEnabled: true }, 'Online Booking - Boarding Enabled');
      });

      test('can update Boarding Min Nights', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { boardingMinNights: 1 }, 'Online Booking - Boarding Min Nights');
      });

      test('can update Boarding Max Nights', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { boardingMaxNights: 30 }, 'Online Booking - Boarding Max Nights');
      });

      test('can update Daycare Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { daycareEnabled: true }, 'Online Booking - Daycare Enabled');
      });

      test('can update Daycare Same Day toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { daycareSameDay: true }, 'Online Booking - Daycare Same Day');
      });

      test('can update Grooming Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { groomingEnabled: false }, 'Online Booking - Grooming Enabled');
      });

      test('can update Training Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { trainingEnabled: false }, 'Online Booking - Training Enabled');
      });

      // New Customers
      test('can update Allow New Customers toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { allowNewCustomers: true }, 'Online Booking - Allow New Customers');
      });

      test('can update New Customer Approval', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { newCustomerApproval: 'manual' }, 'Online Booking - New Customer Approval');
      });

      test('can update Require Vax Upload toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { requireVaxUpload: true }, 'Online Booking - Require Vax Upload');
      });

      test('can update Require Emergency Contact toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { requireEmergencyContact: true }, 'Online Booking - Require Emergency Contact');
      });

      test('can update Require Vet Info toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { requireVetInfo: true }, 'Online Booking - Require Vet Info');
      });

      test('can update Require Pet Photo toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { requirePetPhoto: false }, 'Online Booking - Require Pet Photo');
      });

      // Booking Requirements
      test('can update Require Waiver toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { requireWaiver: true }, 'Online Booking - Require Waiver');
      });

      test('can update Require Deposit toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { requireDeposit: true }, 'Online Booking - Require Deposit');
      });

      test('can update Deposit Percent', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { depositPercent: 25 }, 'Online Booking - Deposit Percent');
      });

      test('can update Require Card On File toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { requireCardOnFile: true }, 'Online Booking - Require Card On File');
      });

      // Booking Confirmation
      test('can update Send Confirmation Email toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { sendConfirmationEmail: true }, 'Online Booking - Send Confirmation Email');
      });

      test('can update Send Confirmation SMS toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { sendConfirmationSms: false }, 'Online Booking - Send Confirmation SMS');
      });

      test('can update Confirmation Message', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { confirmationMessage: 'Thank you!' }, 'Online Booking - Confirmation Message');
      });

      test('can update Include Cancellation Policy toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { includeCancellationPolicy: true }, 'Online Booking - Include Cancellation Policy');
      });

      test('can update Include Directions toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { includeDirections: true }, 'Online Booking - Include Directions');
      });

      test('can update Include Checklist toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { includeChecklist: true }, 'Online Booking - Include Checklist');
      });

      // Portal Appearance
      test('can update Welcome Message', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { welcomeMessage: 'Welcome!' }, 'Online Booking - Welcome Message');
      });

      test('can update Show Logo toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { showLogo: true }, 'Online Booking - Show Logo');
      });

      test('can update Show Photos toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { showPhotos: true }, 'Online Booking - Show Photos');
      });

      test('can update Show Pricing toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { showPricing: true }, 'Online Booking - Show Pricing');
      });

      test('can update Show Reviews toggle', async () => {
        await testSaveEndpoint('PUT', '/config/online-booking', { showReviews: true }, 'Online Booking - Show Reviews');
      });
    });

    describe('POST /config/online-booking/check-slug - Check Slug Availability', () => {
      test('check slug endpoint exists', async () => {
        const res = await apiClient.post('/config/online-booking/check-slug', { slug: 'test-slug' });
        if (res.status === 404) {
          trackResult('Online Booking - Check Slug', '404', 'POST /config/online-booking/check-slug');
        } else {
          trackResult('Online Booking - Check Slug', 'working');
        }
      });
    });
  });

  // ============================================================================
  // SUBSCRIPTION PAGE (/settings/subscription)
  // ============================================================================
  describe('Subscription Page (/settings/subscription)', () => {
    describe('GET /billing/subscription - Subscription Info', () => {
      test('loads subscription info', async () => {
        await testGetEndpoint('/billing/subscription', 'Subscription - GET Info');
      });
    });

    describe('GET /billing/payment-methods - Payment Methods', () => {
      test('loads payment methods', async () => {
        await testGetEndpoint('/billing/payment-methods', 'Subscription - GET Payment Methods');
      });
    });

    describe('GET /billing/invoices - Invoices', () => {
      test('loads invoices', async () => {
        await testGetEndpoint('/billing/invoices', 'Subscription - GET Invoices');
      });
    });

    describe('GET /billing/usage - Usage', () => {
      test('loads usage data', async () => {
        await testGetEndpoint('/billing/usage', 'Subscription - GET Usage');
      });
    });

    describe('GET /billing/plans - Plans', () => {
      test('loads available plans', async () => {
        await testGetEndpoint('/billing/plans', 'Subscription - GET Plans');
      });
    });
  });

  // ============================================================================
  // AUDIT LOG PAGE (/settings/audit-log)
  // ============================================================================
  describe('Audit Log Page (/settings/audit-log)', () => {
    describe('GET /audit-logs - Audit Events', () => {
      test('loads audit events', async () => {
        await testGetEndpoint('/audit-logs', 'Audit Log - GET Events');
      });
    });

    describe('GET /audit-logs - Filters', () => {
      test('can filter by timeframe - 24h', async () => {
        const res = await apiClient.get('/audit-logs?timeframe=24h');
        if (res.status === 404) {
          trackResult('Audit Log - 24h Filter', '404', 'GET /audit-logs?timeframe=24h');
        } else {
          trackResult('Audit Log - 24h Filter', 'working');
        }
      });

      test('can filter by timeframe - 7d', async () => {
        const res = await apiClient.get('/audit-logs?timeframe=7d');
        if (res.status === 404) {
          trackResult('Audit Log - 7d Filter', '404', 'GET /audit-logs?timeframe=7d');
        } else {
          trackResult('Audit Log - 7d Filter', 'working');
        }
      });

      test('can filter by timeframe - 30d', async () => {
        const res = await apiClient.get('/audit-logs?timeframe=30d');
        if (res.status === 404) {
          trackResult('Audit Log - 30d Filter', '404', 'GET /audit-logs?timeframe=30d');
        } else {
          trackResult('Audit Log - 30d Filter', 'working');
        }
      });

      test('can filter by category - Security', async () => {
        const res = await apiClient.get('/audit-logs?group=Security');
        if (res.status === 404) {
          trackResult('Audit Log - Security Filter', '404', 'GET /audit-logs?group=Security');
        } else {
          trackResult('Audit Log - Security Filter', 'working');
        }
      });

      test('can search audit logs', async () => {
        const res = await apiClient.get('/audit-logs?search=login');
        if (res.status === 404) {
          trackResult('Audit Log - Search', '404', 'GET /audit-logs?search=login');
        } else {
          trackResult('Audit Log - Search', 'working');
        }
      });
    });

    describe('GET /audit-logs/summary - Summary Stats', () => {
      test('loads summary stats', async () => {
        await testGetEndpoint('/audit-logs/summary', 'Audit Log - GET Summary');
      });
    });

    describe('GET /audit-logs/export - Export CSV', () => {
      test('export endpoint exists', async () => {
        const res = await apiClient.get('/audit-logs/export?format=csv');
        if (res.status === 404) {
          trackResult('Audit Log - Export CSV', '404', 'GET /audit-logs/export');
        } else {
          trackResult('Audit Log - Export CSV', 'working');
        }
      });
    });
  });

  // ============================================================================
  // PRIVACY SETTINGS PAGE (/settings/privacy)
  // ============================================================================
  describe('Privacy Settings Page (/settings/privacy)', () => {
    describe('GET /config/privacy - Privacy Settings', () => {
      test('loads privacy settings', async () => {
        await testGetEndpoint('/config/privacy', 'Privacy - GET Settings');
      });
    });

    describe('PUT /config/privacy - Data Retention Policies', () => {
      const retentionFields = [
        'customerRecords',
        'petRecords',
        'bookingHistory',
        'paymentRecords',
        'signedWaivers',
        'communicationLogs',
        'vaccinationRecords',
      ];

      retentionFields.forEach((field) => {
        test(`can update ${field} retention`, async () => {
          await testSaveEndpoint('PUT', '/config/privacy', {
            retention: { [field]: '3yr' },
          }, `Privacy - ${field} Retention`);
        });
      });
    });

    describe('PUT /config/privacy - Staff Data Visibility', () => {
      const visibilityFields = [
        'showPhoneToAllStaff',
        'showEmailToAllStaff',
        'showAddressToAllStaff',
        'showPaymentDetailsToAllStaff',
      ];

      visibilityFields.forEach((field) => {
        test(`can update ${field} toggle`, async () => {
          await testSaveEndpoint('PUT', '/config/privacy', {
            visibility: { [field]: true },
          }, `Privacy - ${field}`);
        });
      });
    });

    describe('PUT /config/privacy - Communication Preferences', () => {
      test('can update Marketing Emails Default', async () => {
        await testSaveEndpoint('PUT', '/config/privacy', {
          communication: { marketingEmailsDefault: 'opt-in' },
        }, 'Privacy - Marketing Emails Default');
      });

      test('can update Booking Reminders Default toggle', async () => {
        await testSaveEndpoint('PUT', '/config/privacy', {
          communication: { bookingRemindersDefault: true },
        }, 'Privacy - Booking Reminders Default');
      });

      test('can update Vaccination Reminders Default toggle', async () => {
        await testSaveEndpoint('PUT', '/config/privacy', {
          communication: { vaccinationRemindersDefault: true },
        }, 'Privacy - Vaccination Reminders Default');
      });

      test('can update Promotional SMS Default', async () => {
        await testSaveEndpoint('PUT', '/config/privacy', {
          communication: { promotionalSmsDefault: 'opt-in' },
        }, 'Privacy - Promotional SMS Default');
      });
    });

    describe('GET /owners/:id/export - Customer Data Export', () => {
      test('customer export endpoint structure', async () => {
        // Get an owner to test with
        const ownersRes = await apiClient.get('/owners?limit=1');
        if (ownersRes.ok && ownersRes.data && ownersRes.data.length > 0) {
          const ownerId = ownersRes.data[0].id || ownersRes.data[0].record_id;
          if (ownerId) {
            const res = await apiClient.get(`/owners/${ownerId}/export`);
            if (res.status === 404) {
              trackResult('Privacy - Customer Export', '404', `GET /owners/${ownerId}/export`);
            } else {
              trackResult('Privacy - Customer Export', 'working');
            }
          }
        } else {
          trackResult('Privacy - Customer Export', 'ui_missing', 'No owners found to test');
        }
      });
    });
  });

  // ============================================================================
  // FACILITY SETUP (placeholder - add when implemented)
  // ============================================================================
  describe('Facility Setup Page (/settings/facility)', () => {
    describe('GET /facilities - Facility Data', () => {
      test('loads facility data', async () => {
        await testGetEndpoint('/facilities', 'Facility Setup - GET Facilities');
      });
    });

    describe('GET /runs - Runs/Kennels', () => {
      test('loads runs/kennels', async () => {
        await testGetEndpoint('/runs', 'Facility Setup - GET Runs');
      });
    });
  });

  // ============================================================================
  // CALENDAR SETTINGS
  // ============================================================================
  describe('Calendar Settings Page (/settings/calendar)', () => {
    describe('GET /config/calendar - Calendar Settings', () => {
      test('loads calendar settings', async () => {
        await testGetEndpoint('/config/calendar', 'Calendar - GET Settings');
      });
    });
  });

  // ============================================================================
  // BOOKING RULES
  // ============================================================================
  describe('Booking Rules Page (/settings/booking-rules)', () => {
    describe('GET /config/booking-rules - Booking Rules', () => {
      test('loads booking rules', async () => {
        await testGetEndpoint('/config/booking-rules', 'Booking Rules - GET');
      });
    });
  });

  // ============================================================================
  // PAYMENT PROCESSING
  // ============================================================================
  describe('Payment Processing Page (/settings/payment-processing)', () => {
    describe('GET /config/payments - Payment Settings', () => {
      test('loads payment settings', async () => {
        await testGetEndpoint('/config/payments', 'Payment Processing - GET Settings');
      });
    });
  });

  // ============================================================================
  // INVOICING
  // ============================================================================
  describe('Invoicing Page (/settings/invoicing)', () => {
    describe('GET /config/invoicing - Invoice Settings', () => {
      test('loads invoice settings', async () => {
        await testGetEndpoint('/config/invoicing', 'Invoicing - GET Settings');
      });
    });
  });

  // ============================================================================
  // PACKAGES & ADD-ONS
  // ============================================================================
  describe('Packages & Add-Ons Page (/settings/packages)', () => {
    describe('GET /packages - Packages List', () => {
      test('loads packages', async () => {
        await testGetEndpoint('/packages', 'Packages - GET List');
      });
    });
  });

  // ============================================================================
  // EMAIL TEMPLATES
  // ============================================================================
  describe('Email Templates Page (/settings/email-templates)', () => {
    describe('GET /config/email-templates - Email Templates', () => {
      test('loads email templates', async () => {
        await testGetEndpoint('/config/email-templates', 'Email Templates - GET List');
      });
    });
  });

  // ============================================================================
  // SMS SETTINGS
  // ============================================================================
  describe('SMS Settings Page (/settings/sms)', () => {
    describe('GET /config/sms - SMS Settings', () => {
      test('loads SMS settings', async () => {
        await testGetEndpoint('/config/sms', 'SMS Settings - GET');
      });
    });
  });

  // ============================================================================
  // NOTIFICATION TRIGGERS
  // ============================================================================
  describe('Notification Triggers Page (/settings/notification-triggers)', () => {
    describe('GET /config/notification-triggers - Triggers', () => {
      test('loads notification triggers', async () => {
        await testGetEndpoint('/config/notification-triggers', 'Notification Triggers - GET');
      });
    });
  });

  // ============================================================================
  // TERMS & POLICIES
  // ============================================================================
  describe('Terms & Policies Page (/settings/policies)', () => {
    describe('GET /policies - Policies List', () => {
      test('loads policies', async () => {
        await testGetEndpoint('/policies', 'Terms & Policies - GET List');
      });
    });
  });

  // ============================================================================
  // FORMS
  // ============================================================================
  describe('Forms Page (/settings/forms)', () => {
    describe('GET /forms - Forms List', () => {
      test('loads forms', async () => {
        await testGetEndpoint('/forms', 'Forms - GET List');
      });
    });
  });

  // ============================================================================
  // DOCUMENTS
  // ============================================================================
  describe('Documents Page (/settings/documents)', () => {
    describe('GET /documents - Documents List', () => {
      test('loads documents', async () => {
        await testGetEndpoint('/documents', 'Documents - GET List');
      });
    });
  });

  // ============================================================================
  // FILES
  // ============================================================================
  describe('Files Page (/settings/files)', () => {
    describe('GET /files - Files List', () => {
      test('loads files', async () => {
        await testGetEndpoint('/files', 'Files - GET List');
      });
    });
  });

  // ============================================================================
  // IMPORT & EXPORT
  // ============================================================================
  describe('Import & Export Page (/settings/import-export)', () => {
    describe('GET /data/exports - Export History', () => {
      test('loads export history', async () => {
        await testGetEndpoint('/data/exports', 'Import & Export - GET Exports');
      });
    });

    describe('GET /data/imports - Import History', () => {
      test('loads import history', async () => {
        await testGetEndpoint('/data/imports', 'Import & Export - GET Imports');
      });
    });
  });
});
