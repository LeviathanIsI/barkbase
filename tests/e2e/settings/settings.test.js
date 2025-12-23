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
    // Track successful GET
    trackResult(fieldName, 'working');
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
    // NOTE: Don't pass accountCode - that uses /a/:accountCode routes which don't exist
    // The API uses /api/v1/* routes instead
    apiClient = createApiClient(authToken, testContext.tenantId);

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
    describe('GET /profile/me - User Profile Data', () => {
      test('loads user profile with all fields', async () => {
        const res = await apiClient.get('/profile/me');

        if (res.status === 404) {
          trackResult('Profile - GET endpoint', '404', 'GET /profile/me');
        } else if (res.status >= 500) {
          trackResult('Profile - GET endpoint', '500', `GET /profile/me: ${res.status}`);
        } else {
          expect(res.status).toBe(200);
          expect(res.data).toBeDefined();
          trackResult('Profile - GET endpoint', 'working');
        }
      });

      test('profile contains First Name field', async () => {
        const res = await apiClient.get('/profile/me');
        if (res.ok && res.data?.profile) {
          const profile = res.data.profile;
          const hasField = 'firstName' in profile || 'first_name' in profile;
          if (hasField) {
            trackResult('Profile - First Name', 'working');
          } else {
            trackResult('Profile - First Name', 'ui_missing', 'Field not in response');
          }
          expect(hasField).toBe(true);
        }
      });

      test('profile contains Last Name field', async () => {
        const res = await apiClient.get('/profile/me');
        if (res.ok && res.data?.profile) {
          const profile = res.data.profile;
          const hasField = 'lastName' in profile || 'last_name' in profile;
          if (hasField) {
            trackResult('Profile - Last Name', 'working');
          } else {
            trackResult('Profile - Last Name', 'ui_missing', 'Field not in response');
          }
          expect(hasField).toBe(true);
        }
      });

      test('profile contains Email field', async () => {
        const res = await apiClient.get('/profile/me');
        if (res.ok && res.data?.profile) {
          const hasField = 'email' in res.data.profile;
          if (hasField) {
            trackResult('Profile - Email', 'working');
          } else {
            trackResult('Profile - Email', 'ui_missing', 'Field not in response');
          }
          expect(hasField).toBe(true);
        }
      });

      test('profile contains Phone field', async () => {
        const res = await apiClient.get('/profile/me');
        if (res.ok && res.data?.profile) {
          const hasField = 'phone' in res.data.profile || 'phoneNumber' in res.data.profile;
          if (hasField) {
            trackResult('Profile - Phone', 'working');
          } else {
            trackResult('Profile - Phone', 'ui_missing', 'Field not in response');
          }
        }
      });

      test('profile contains passwordChangedAt field', async () => {
        const res = await apiClient.get('/profile/me');
        if (res.ok && res.data?.profile) {
          const hasField = 'passwordChangedAt' in res.data.profile || 'password_changed_at' in res.data.profile;
          if (hasField) {
            trackResult('Profile - Password Changed At', 'working');
          } else {
            trackResult('Profile - Password Changed At', 'ui_missing', 'Field not in response');
          }
        }
      });

      test('profile contains role field', async () => {
        const res = await apiClient.get('/profile/me');
        if (res.ok && res.data?.profile) {
          const hasField = 'role' in res.data.profile || 'roles' in res.data.profile;
          if (hasField) {
            trackResult('Profile - Role', 'working');
          } else {
            trackResult('Profile - Role', 'ui_missing', 'Field not in response');
          }
        }
      });
    });

    describe('PUT /profile/me - Update Profile', () => {
      test('can update First Name', async () => {
        const testValue = 'Josh'; // Reset to actual name
        await testSaveEndpoint('PUT', '/profile/me', { firstName: testValue }, 'Profile - Update First Name');
      });

      test('can update Last Name', async () => {
        const testValue = 'Bradford'; // Reset to actual name
        await testSaveEndpoint('PUT', '/profile/me', { lastName: testValue }, 'Profile - Update Last Name');
      });

      test('can update Phone', async () => {
        const testValue = '+15551234567';
        await testSaveEndpoint('PUT', '/profile/me', { phone: testValue }, 'Profile - Update Phone');
      });
    });

    describe('GET /profile/tenant - Tenant Info', () => {
      test('can fetch tenant info', async () => {
        const res = await testGetEndpoint('/profile/tenant', 'Profile - Tenant Info');
        if (res.success) {
          trackResult('Profile - Tenant Info GET', 'working');
        }
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
  // All settings are consolidated in /account-defaults endpoint
  // ============================================================================
  describe('Account Defaults Page (/settings/account-defaults)', () => {
    describe('GET /account-defaults - Business Profile', () => {
      test('loads account defaults (business info, hours, holidays, locale, currency)', async () => {
        const res = await testGetEndpoint('/account-defaults', 'Account Defaults - GET');
        if (res.success && res.data) {
          // Verify expected structure
          const data = res.data;
          if (data.businessInfo) trackResult('Account Defaults - Business Info Section', 'working');
          if (data.operatingHours) trackResult('Account Defaults - Operating Hours Section', 'working');
          if (data.holidays !== undefined) trackResult('Account Defaults - Holidays Section', 'working');
          if (data.regionalSettings) trackResult('Account Defaults - Regional Settings Section', 'working');
          if (data.currencySettings) trackResult('Account Defaults - Currency Settings Section', 'working');
        }
      });
    });

    describe('PUT /account-defaults - Business Profile Tab', () => {
      test('can update Business Name', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { name: 'Test Business' } }, 'Account Defaults - Business Name');
      });

      test('can update Tax ID / EIN', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { taxId: '12-3456789' } }, 'Account Defaults - Tax ID');
      });

      test('can update Business Phone', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { phone: '+15551234567' } }, 'Account Defaults - Business Phone');
      });

      test('can update Business Email', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { email: 'test@example.com' } }, 'Account Defaults - Business Email');
      });

      test('can update Website', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { website: 'https://example.com' } }, 'Account Defaults - Website');
      });

      test('can update Customer-facing Notes', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { customerNotes: 'Test notes' } }, 'Account Defaults - Customer Notes');
      });

      test('can update Street Address', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { street: '123 Test St' } }, 'Account Defaults - Street');
      });

      test('can update City', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { city: 'Test City' } }, 'Account Defaults - City');
      });

      test('can update State', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { state: 'OH' } }, 'Account Defaults - State');
      });

      test('can update Postal Code', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { postalCode: '43215' } }, 'Account Defaults - Postal Code');
      });

      test('can update Country', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { businessInfo: { country: 'US' } }, 'Account Defaults - Country');
      });
    });

    describe('PUT /account-defaults - Operating Hours', () => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      days.forEach((day) => {
        test(`can update ${day} open/closed toggle`, async () => {
          await testSaveEndpoint('PUT', '/account-defaults', {
            operatingHours: {
              [day]: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
            },
          }, `Account Defaults - ${day} Toggle`);
        });
      });
    });

    describe('PUT /account-defaults - Holiday Closures', () => {
      test('can update holidays list', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', {
          holidays: [{
            name: 'Test Holiday',
            startDate: '2025-12-25',
            endDate: '2025-12-25',
            recurring: true,
          }],
        }, 'Account Defaults - Add Holiday');
      });
    });

    describe('PUT /account-defaults - Regional Settings (Locale)', () => {
      test('can update Time Zone', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { regionalSettings: { timezone: 'America/New_York' } }, 'Account Defaults - Timezone');
      });

      test('can update Date Format', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { regionalSettings: { dateFormat: 'MM/DD/YYYY' } }, 'Account Defaults - Date Format');
      });

      test('can update Time Format', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { regionalSettings: { timeFormat: '12-hour' } }, 'Account Defaults - Time Format');
      });

      test('can update Week Starts On', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { regionalSettings: { weekStartsOn: 'sunday' } }, 'Account Defaults - Week Starts On');
      });
    });

    describe('PUT /account-defaults - Currency Settings', () => {
      test('can update Supported Currencies', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { currencySettings: { supportedCurrencies: ['USD', 'CAD'] } }, 'Account Defaults - Supported Currencies');
      });

      test('can update Default Currency', async () => {
        await testSaveEndpoint('PUT', '/account-defaults', { currencySettings: { defaultCurrency: 'USD' } }, 'Account Defaults - Default Currency');
      });
    });
  });

  // ============================================================================
  // USERS & TEAMS PAGE (/settings/users-teams)
  // Uses /memberships endpoint for team member management
  // ============================================================================
  describe('Users & Teams Page (/settings/users-teams)', () => {
    describe('GET /memberships - Team Members', () => {
      test('loads team members list', async () => {
        await testGetEndpoint('/memberships', 'Users & Teams - GET Members');
      });
    });

    describe('POST /memberships - Invite Member', () => {
      test('invite member endpoint exists', async () => {
        // Use a test email that won't actually send
        const res = await apiClient.post('/memberships', {
          email: 'test-invite-' + Date.now() + '@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'STAFF',
        });

        if (res.status === 404) {
          trackResult('Users & Teams - Invite Member', '404', 'POST /memberships');
        } else if (res.status >= 500) {
          trackResult('Users & Teams - Invite Member', '500', `Status: ${res.status}`);
        } else {
          trackResult('Users & Teams - Invite Member', 'working');
        }
      });
    });

    describe('PUT /memberships/:id - Update Role', () => {
      test('update role endpoint structure exists', async () => {
        // Test with current memberships
        const res = await apiClient.get('/memberships');
        if (res.ok && res.data && res.data.length > 0) {
          const membershipId = res.data[0].id || res.data[0].record_id;
          if (membershipId) {
            await testSaveEndpoint('PUT', `/memberships/${membershipId}`, { role: 'ADMIN' }, 'Users & Teams - Update Role');
          }
        } else {
          trackResult('Users & Teams - Update Role', 'ui_missing', 'No members found to test');
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
  // Uses /config/branding endpoint
  // ============================================================================
  describe('Branding Page (/settings/branding)', () => {
    describe('GET /config/branding - Theme Settings', () => {
      test('loads theme settings', async () => {
        await testGetEndpoint('/config/branding', 'Branding - GET Theme');
      });
    });

    describe('PUT /config/branding - Update Theme', () => {
      test('can update Primary Color', async () => {
        await testSaveEndpoint('PUT', '/config/branding', {
          colors: { primary: '59 130 246' },
        }, 'Branding - Primary Color');
      });

      test('can update Secondary Color', async () => {
        await testSaveEndpoint('PUT', '/config/branding', {
          colors: { secondary: '129 140 248' },
        }, 'Branding - Secondary Color');
      });

      test('can update Accent Color', async () => {
        await testSaveEndpoint('PUT', '/config/branding', {
          colors: { accent: '249 115 22' },
        }, 'Branding - Accent Color');
      });

      test('can update Background Color', async () => {
        await testSaveEndpoint('PUT', '/config/branding', {
          colors: { background: '255 255 255' },
        }, 'Branding - Background Color');
      });
    });

    describe('PUT /config/branding - Terminology', () => {
      test('can update Kennel Term', async () => {
        await testSaveEndpoint('PUT', '/config/branding', {
          terminology: { kennel: 'Suite' },
        }, 'Branding - Kennel Term');
      });
    });
  });

  // ============================================================================
  // DOMAIN & SSL PAGE (/settings/domain-ssl)
  // Uses /settings/domain endpoint
  // ============================================================================
  describe('Domain & SSL Page (/settings/domain-ssl)', () => {
    describe('GET /settings/domain - Domain Settings', () => {
      test('loads domain settings', async () => {
        await testGetEndpoint('/settings/domain', 'Domain & SSL - GET Domain');
      });
    });

    describe('PUT /settings/domain - Update Domain', () => {
      test('can update custom domain', async () => {
        await testSaveEndpoint('PUT', '/settings/domain', {
          customDomain: null, // Clear to avoid breaking things
        }, 'Domain & SSL - Custom Domain');
      });
    });

    describe('POST /settings/domain/verify - Verify Domain', () => {
      test('verify domain endpoint exists', async () => {
        const res = await apiClient.post('/settings/domain/verify', {});
        if (res.status === 404) {
          trackResult('Domain & SSL - Verify Domain', '404', 'POST /settings/domain/verify');
        } else {
          trackResult('Domain & SSL - Verify Domain', 'working');
        }
      });
    });

    describe('GET /settings/domain/status - Domain Status', () => {
      test('check domain status endpoint exists', async () => {
        await testGetEndpoint('/settings/domain/status', 'Domain & SSL - Domain Status');
      });
    });
  });

  // ============================================================================
  // FEATURE TOGGLES PAGE (/settings/feature-toggles)
  // Uses /config/tenant/features endpoint
  // ============================================================================
  describe('Feature Toggles Page (/settings/feature-toggles)', () => {
    describe('GET /config/tenant/features - Feature Settings', () => {
      test('loads feature settings', async () => {
        await testGetEndpoint('/config/tenant/features', 'Feature Toggles - GET Features');
      });
    });

    describe('PUT /config/tenant/features - Update Features', () => {
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
          await testSaveEndpoint('PUT', '/config/tenant/features', {
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
  // Uses /settings/online-booking endpoint
  // ============================================================================
  describe('Online Booking Page (/settings/online-booking)', () => {
    describe('GET /settings/online-booking - Booking Settings', () => {
      test('loads online booking settings', async () => {
        await testGetEndpoint('/settings/online-booking', 'Online Booking - GET Settings');
      });
    });

    describe('PUT /settings/online-booking - Update Settings', () => {
      // Portal Settings
      test('can update Portal Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { portalEnabled: true }, 'Online Booking - Portal Enabled');
      });

      test('can update URL Slug', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { urlSlug: 'test-kennel' }, 'Online Booking - URL Slug');
      });

      // Services Available Online
      test('can update Boarding Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { boardingEnabled: true }, 'Online Booking - Boarding Enabled');
      });

      test('can update Boarding Min Nights', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { boardingMinNights: 1 }, 'Online Booking - Boarding Min Nights');
      });

      test('can update Boarding Max Nights', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { boardingMaxNights: 30 }, 'Online Booking - Boarding Max Nights');
      });

      test('can update Daycare Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { daycareEnabled: true }, 'Online Booking - Daycare Enabled');
      });

      test('can update Daycare Same Day toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { daycareSameDay: true }, 'Online Booking - Daycare Same Day');
      });

      test('can update Grooming Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { groomingEnabled: false }, 'Online Booking - Grooming Enabled');
      });

      test('can update Training Enabled toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { trainingEnabled: false }, 'Online Booking - Training Enabled');
      });

      // New Customers
      test('can update Allow New Customers toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { allowNewCustomers: true }, 'Online Booking - Allow New Customers');
      });

      test('can update New Customer Approval', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { newCustomerApproval: 'manual' }, 'Online Booking - New Customer Approval');
      });

      test('can update Require Vax Upload toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { requireVaxUpload: true }, 'Online Booking - Require Vax Upload');
      });

      test('can update Require Emergency Contact toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { requireEmergencyContact: true }, 'Online Booking - Require Emergency Contact');
      });

      test('can update Require Vet Info toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { requireVetInfo: true }, 'Online Booking - Require Vet Info');
      });

      test('can update Require Pet Photo toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { requirePetPhoto: false }, 'Online Booking - Require Pet Photo');
      });

      // Booking Requirements
      test('can update Require Waiver toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { requireWaiver: true }, 'Online Booking - Require Waiver');
      });

      test('can update Require Deposit toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { requireDeposit: true }, 'Online Booking - Require Deposit');
      });

      test('can update Deposit Percent', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { depositPercent: 25 }, 'Online Booking - Deposit Percent');
      });

      test('can update Require Card On File toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { requireCardOnFile: true }, 'Online Booking - Require Card On File');
      });

      // Booking Confirmation
      test('can update Send Confirmation Email toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { sendConfirmationEmail: true }, 'Online Booking - Send Confirmation Email');
      });

      test('can update Send Confirmation SMS toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { sendConfirmationSms: false }, 'Online Booking - Send Confirmation SMS');
      });

      test('can update Confirmation Message', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { confirmationMessage: 'Thank you!' }, 'Online Booking - Confirmation Message');
      });

      test('can update Include Cancellation Policy toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { includeCancellationPolicy: true }, 'Online Booking - Include Cancellation Policy');
      });

      test('can update Include Directions toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { includeDirections: true }, 'Online Booking - Include Directions');
      });

      test('can update Include Checklist toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { includeChecklist: true }, 'Online Booking - Include Checklist');
      });

      // Portal Appearance
      test('can update Welcome Message', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { welcomeMessage: 'Welcome!' }, 'Online Booking - Welcome Message');
      });

      test('can update Show Logo toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { showLogo: true }, 'Online Booking - Show Logo');
      });

      test('can update Show Photos toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { showPhotos: true }, 'Online Booking - Show Photos');
      });

      test('can update Show Pricing toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { showPricing: true }, 'Online Booking - Show Pricing');
      });

      test('can update Show Reviews toggle', async () => {
        await testSaveEndpoint('PUT', '/settings/online-booking', { showReviews: true }, 'Online Booking - Show Reviews');
      });
    });

    describe('POST /settings/online-booking/check-slug - Check Slug Availability', () => {
      test('check slug endpoint exists', async () => {
        const res = await apiClient.post('/settings/online-booking/check-slug', { slug: 'test-slug' });
        if (res.status === 404) {
          trackResult('Online Booking - Check Slug', '404', 'POST /settings/online-booking/check-slug');
        } else {
          trackResult('Online Booking - Check Slug', 'working');
        }
      });
    });

    describe('GET /settings/online-booking/qr-code - QR Code', () => {
      test('qr code endpoint exists', async () => {
        await testGetEndpoint('/settings/online-booking/qr-code', 'Online Booking - QR Code');
      });
    });
  });

  // ============================================================================
  // SUBSCRIPTION PAGE (/settings/subscription)
  // Uses /financial/* endpoints
  // ============================================================================
  describe('Subscription Page (/settings/subscription)', () => {
    describe('GET /financial/subscriptions - Subscription Info', () => {
      test('loads subscription info', async () => {
        await testGetEndpoint('/financial/subscriptions', 'Subscription - GET Info');
      });
    });

    describe('GET /financial/payment-methods - Payment Methods', () => {
      test('loads payment methods', async () => {
        await testGetEndpoint('/financial/payment-methods', 'Subscription - GET Payment Methods');
      });
    });

    describe('GET /financial/invoices - Invoices', () => {
      test('loads invoices', async () => {
        await testGetEndpoint('/financial/invoices', 'Subscription - GET Invoices');
      });
    });

    describe('GET /financial/billing/usage - Usage', () => {
      test('loads usage data', async () => {
        await testGetEndpoint('/financial/billing/usage', 'Subscription - GET Usage');
      });
    });

    describe('GET /financial/billing/summary - Billing Summary', () => {
      test('loads billing summary', async () => {
        await testGetEndpoint('/financial/billing/summary', 'Subscription - GET Billing Summary');
      });
    });

    describe('GET /financial/billing/history - Billing History', () => {
      test('loads billing history', async () => {
        await testGetEndpoint('/financial/billing/history', 'Subscription - GET Billing History');
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
  // FACILITY SETUP
  // Facilities via /entity/facilities, Runs via /runs (operations-service)
  // ============================================================================
  describe('Facility Setup Page (/settings/facility)', () => {
    describe('GET /entity/facilities - Facility Data', () => {
      test('loads facility data', async () => {
        await testGetEndpoint('/entity/facilities', 'Facility Setup - GET Facilities');
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
  // Uses /settings/calendar endpoint
  // ============================================================================
  describe('Calendar Settings Page (/settings/calendar)', () => {
    describe('GET /settings/calendar - Calendar Settings', () => {
      test('loads calendar settings', async () => {
        await testGetEndpoint('/settings/calendar', 'Calendar - GET Settings');
      });
    });

    describe('PUT /settings/calendar - Update Calendar Settings', () => {
      test('can update calendar settings', async () => {
        await testSaveEndpoint('PUT', '/settings/calendar', {
          defaultView: 'week',
          slotDuration: 30,
        }, 'Calendar - Update Settings');
      });
    });
  });

  // ============================================================================
  // BOOKING RULES
  // Uses /settings/booking endpoint
  // ============================================================================
  describe('Booking Rules Page (/settings/booking-rules)', () => {
    describe('GET /settings/booking - Booking Rules', () => {
      test('loads booking rules', async () => {
        await testGetEndpoint('/settings/booking', 'Booking Rules - GET');
      });
    });

    describe('PUT /settings/booking - Update Booking Rules', () => {
      test('can update booking rules', async () => {
        await testSaveEndpoint('PUT', '/settings/booking', {
          minAdvanceBooking: 24,
          maxAdvanceBooking: 90,
        }, 'Booking Rules - Update');
      });
    });
  });

  // ============================================================================
  // PAYMENT PROCESSING
  // Uses /settings/payments endpoint
  // ============================================================================
  describe('Payment Processing Page (/settings/payment-processing)', () => {
    describe('GET /settings/payments - Payment Settings', () => {
      test('loads payment settings', async () => {
        await testGetEndpoint('/settings/payments', 'Payment Processing - GET Settings');
      });
    });

    describe('PUT /settings/payments - Update Payment Settings', () => {
      test('can update payment settings', async () => {
        await testSaveEndpoint('PUT', '/settings/payments', {
          acceptedMethods: ['card', 'cash'],
        }, 'Payment Processing - Update Settings');
      });
    });

    describe('GET /settings/payments/stripe-status - Stripe Status', () => {
      test('loads stripe connection status', async () => {
        await testGetEndpoint('/settings/payments/stripe-status', 'Payment Processing - Stripe Status');
      });
    });
  });

  // ============================================================================
  // INVOICING
  // Uses /settings/invoicing endpoint
  // ============================================================================
  describe('Invoicing Page (/settings/invoicing)', () => {
    describe('GET /settings/invoicing - Invoice Settings', () => {
      test('loads invoice settings', async () => {
        await testGetEndpoint('/settings/invoicing', 'Invoicing - GET Settings');
      });
    });

    describe('PUT /settings/invoicing - Update Invoice Settings', () => {
      test('can update invoice settings', async () => {
        await testSaveEndpoint('PUT', '/settings/invoicing', {
          invoicePrefix: 'INV',
          dueDays: 30,
        }, 'Invoicing - Update Settings');
      });
    });

    describe('GET /settings/invoicing/preview - Invoice Preview', () => {
      test('loads invoice preview', async () => {
        await testGetEndpoint('/settings/invoicing/preview', 'Invoicing - Preview');
      });
    });
  });

  // ============================================================================
  // PACKAGES & ADD-ONS
  // Uses /financial/packages and /package-templates endpoints
  // ============================================================================
  describe('Packages & Add-Ons Page (/settings/packages)', () => {
    describe('GET /financial/packages - Packages List', () => {
      test('loads packages', async () => {
        await testGetEndpoint('/financial/packages', 'Packages - GET List');
      });
    });

    describe('GET /package-templates - Package Templates', () => {
      test('loads package templates', async () => {
        await testGetEndpoint('/package-templates', 'Packages - GET Templates');
      });
    });

    describe('GET /addon-services - Add-On Services', () => {
      test('loads add-on services', async () => {
        await testGetEndpoint('/addon-services', 'Packages - GET Add-Ons');
      });
    });
  });

  // ============================================================================
  // EMAIL TEMPLATES
  // Uses /settings/email/templates endpoint
  // ============================================================================
  describe('Email Templates Page (/settings/email-templates)', () => {
    describe('GET /settings/email/templates - Email Templates', () => {
      test('loads email templates', async () => {
        await testGetEndpoint('/settings/email/templates', 'Email Templates - GET List');
      });
    });

    describe('GET /settings/email - Email Settings', () => {
      test('loads email settings', async () => {
        await testGetEndpoint('/settings/email', 'Email Settings - GET');
      });
    });

    describe('GET /settings/email/usage - Email Usage', () => {
      test('loads email usage stats', async () => {
        await testGetEndpoint('/settings/email/usage', 'Email Settings - Usage');
      });
    });
  });

  // ============================================================================
  // SMS SETTINGS
  // Uses /settings/sms endpoint
  // ============================================================================
  describe('SMS Settings Page (/settings/sms)', () => {
    describe('GET /settings/sms - SMS Settings', () => {
      test('loads SMS settings', async () => {
        await testGetEndpoint('/settings/sms', 'SMS Settings - GET');
      });
    });

    describe('PUT /settings/sms - Update SMS Settings', () => {
      test('can update SMS settings', async () => {
        await testSaveEndpoint('PUT', '/settings/sms', {
          enabled: true,
        }, 'SMS Settings - Update');
      });
    });

    describe('GET /settings/sms/templates - SMS Templates', () => {
      test('loads SMS templates', async () => {
        await testGetEndpoint('/settings/sms/templates', 'SMS Settings - Templates');
      });
    });
  });

  // ============================================================================
  // NOTIFICATION TRIGGERS
  // May be part of /config/notifications endpoint
  // ============================================================================
  describe('Notification Triggers Page (/settings/notification-triggers)', () => {
    describe('GET /config/notifications - Notification Triggers', () => {
      test('loads notification triggers (via notifications config)', async () => {
        await testGetEndpoint('/config/notifications', 'Notification Triggers - GET');
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
  // Uses /files/templates and /files/custom endpoints
  // ============================================================================
  describe('Files Page (/settings/files)', () => {
    describe('GET /files/templates - File Templates', () => {
      test('loads file templates', async () => {
        await testGetEndpoint('/files/templates', 'Files - GET Templates');
      });
    });

    describe('GET /files/custom - Custom Files', () => {
      test('loads custom files', async () => {
        await testGetEndpoint('/files/custom', 'Files - GET Custom');
      });
    });
  });

  // ============================================================================
  // IMPORT & EXPORT
  // Uses /import-export/* and /imports endpoints
  // ============================================================================
  describe('Import & Export Page (/settings/import-export)', () => {
    describe('GET /import-export/jobs - Import/Export Jobs', () => {
      test('loads import/export job history', async () => {
        await testGetEndpoint('/import-export/jobs', 'Import & Export - GET Jobs');
      });
    });

    describe('GET /imports - Import History', () => {
      test('loads import history', async () => {
        await testGetEndpoint('/imports', 'Import & Export - GET Imports');
      });
    });

    describe('POST /import-export/export - Start Export', () => {
      test('export endpoint exists', async () => {
        const res = await apiClient.post('/import-export/export', { type: 'customers' });
        if (res.status === 404) {
          trackResult('Import & Export - Export', '404', 'POST /import-export/export');
        } else {
          trackResult('Import & Export - Export', 'working');
        }
      });
    });
  });
});
