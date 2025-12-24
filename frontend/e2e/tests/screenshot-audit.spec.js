/**
 * BarkBase Comprehensive Screenshot Audit
 *
 * Captures screenshots of ALL pages for UX design audit.
 * Run with: npx playwright test e2e/tests/screenshot-audit.spec.js --project=chromium
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Screenshot output directory
const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/audits/screenshots');

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test configuration
const BASE_URL = 'http://localhost:5173';
const CREDENTIALS = {
  email: 'joshua.r.bradford1@gmail.com',
  password: 'Josh1987!?!?'
};

// Helper to take a full-page screenshot
async function captureScreenshot(page, name, description = '') {
  // Wait for any loading states to complete
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Extra buffer for animations

  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);

  await page.screenshot({
    path: filepath,
    fullPage: true,
  });

  console.log(`📸 Captured: ${filename}${description ? ` - ${description}` : ''}`);
}

// Helper to login
async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill('input[type="email"]', CREDENTIALS.email);
  await page.fill('input[type="password"]', CREDENTIALS.password);

  // Click sign in
  await page.click('button[type="submit"]');

  // Wait for redirect to authenticated area
  await page.waitForURL(/\/(today|dashboard)/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  console.log('✅ Successfully logged in');
}

// Helper to safely navigate to a page
async function navigateTo(page, path, timeout = 15000) {
  try {
    await page.goto(`${BASE_URL}${path}`, { timeout });
    await page.waitForLoadState('networkidle');
    return true;
  } catch (error) {
    console.warn(`⚠️ Failed to navigate to ${path}: ${error.message}`);
    return false;
  }
}

// =====================
// PUBLIC PAGES (No Auth)
// =====================
test.describe('Public Pages', () => {
  test('capture login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await captureScreenshot(page, '01-public-login', 'Login page');
  });

  test('capture signup page', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await captureScreenshot(page, '02-public-signup', 'Signup page');
  });

  test('capture home page', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await captureScreenshot(page, '00-public-home', 'Public home page');
  });
});

// =====================
// AUTHENTICATED PAGES
// =====================
test.describe('Authenticated Pages', () => {
  // Use stored auth state
  test.use({ storageState: 'e2e/.auth/user.json' });

  // ---- TODAY ----
  test('capture today command center', async ({ page }) => {
    await navigateTo(page, '/today');
    await captureScreenshot(page, '10-today-command-center', 'Today Command Center');
  });

  // ---- CLIENTS ----
  test.describe('Clients', () => {
    test('capture owners list', async ({ page }) => {
      await navigateTo(page, '/owners');
      await captureScreenshot(page, '20-clients-owners-list', 'Owners list');
    });

    test('capture owner detail', async ({ page }) => {
      await navigateTo(page, '/owners');
      await page.waitForLoadState('networkidle');

      // Click on first owner in the list (if exists)
      const firstOwner = page.locator('table tbody tr').first();
      if (await firstOwner.isVisible()) {
        await firstOwner.click();
        await page.waitForLoadState('networkidle');
        await captureScreenshot(page, '21-clients-owner-detail', 'Owner detail page');
      } else {
        console.log('ℹ️ No owners found, skipping owner detail');
      }
    });

    test('capture pets list', async ({ page }) => {
      await navigateTo(page, '/pets');
      await captureScreenshot(page, '22-clients-pets-list', 'Pets list');
    });

    test('capture pet detail', async ({ page }) => {
      await navigateTo(page, '/pets');
      await page.waitForLoadState('networkidle');

      // Click on first pet in the list (if exists)
      const firstPet = page.locator('table tbody tr').first();
      if (await firstPet.isVisible()) {
        await firstPet.click();
        await page.waitForLoadState('networkidle');
        await captureScreenshot(page, '23-clients-pet-detail', 'Pet detail page');
      } else {
        console.log('ℹ️ No pets found, skipping pet detail');
      }
    });

    test('capture vaccinations', async ({ page }) => {
      await navigateTo(page, '/vaccinations');
      await captureScreenshot(page, '24-clients-vaccinations', 'Vaccinations');
    });

    test('capture segments list', async ({ page }) => {
      await navigateTo(page, '/segments');
      await captureScreenshot(page, '25-clients-segments', 'Segments list');
    });

    test('capture segment builder', async ({ page }) => {
      await navigateTo(page, '/segments/new');
      await captureScreenshot(page, '26-clients-segment-builder', 'Segment builder');
    });
  });

  // ---- OPERATIONS ----
  test.describe('Operations', () => {
    test('capture bookings', async ({ page }) => {
      await navigateTo(page, '/bookings');
      await captureScreenshot(page, '30-operations-bookings', 'Bookings');
    });

    test('capture run schedules', async ({ page }) => {
      await navigateTo(page, '/run-schedules');
      await captureScreenshot(page, '31-operations-run-schedules', 'Run Schedules');
    });

    test('capture tasks', async ({ page }) => {
      await navigateTo(page, '/tasks');
      await captureScreenshot(page, '32-operations-tasks', 'Tasks');
    });

    test('capture kennels', async ({ page }) => {
      await navigateTo(page, '/kennels');
      await captureScreenshot(page, '33-operations-kennels', 'Kennels');
    });

    test('capture incidents', async ({ page }) => {
      await navigateTo(page, '/incidents');
      await captureScreenshot(page, '34-operations-incidents', 'Incidents');
    });

    test('capture workflows list', async ({ page }) => {
      await navigateTo(page, '/workflows');
      await captureScreenshot(page, '35-operations-workflows', 'Workflows list');
    });

    test('capture workflow builder', async ({ page }) => {
      await navigateTo(page, '/workflows/new');
      await captureScreenshot(page, '36-operations-workflow-builder', 'Workflow builder');
    });
  });

  // ---- COMMUNICATIONS ----
  test.describe('Communications', () => {
    test('capture messages', async ({ page }) => {
      await navigateTo(page, '/messages');
      await captureScreenshot(page, '40-communications-messages', 'Messages');
    });
  });

  // ---- FINANCE ----
  test.describe('Finance', () => {
    test('capture payments', async ({ page }) => {
      await navigateTo(page, '/payments');
      await captureScreenshot(page, '50-finance-payments', 'Payments');
    });

    test('capture invoices', async ({ page }) => {
      await navigateTo(page, '/invoices');
      await captureScreenshot(page, '51-finance-invoices', 'Invoices');
    });

    test('capture packages', async ({ page }) => {
      await navigateTo(page, '/packages');
      await captureScreenshot(page, '52-finance-packages', 'Packages');
    });
  });

  // ---- ADMINISTRATION ----
  test.describe('Administration', () => {
    test('capture staff', async ({ page }) => {
      await navigateTo(page, '/staff');
      await captureScreenshot(page, '60-admin-staff', 'Staff');
    });

    test('capture reports overview', async ({ page }) => {
      await navigateTo(page, '/reports');
      await captureScreenshot(page, '61-admin-reports-overview', 'Reports Overview');
    });

    test('capture reports live', async ({ page }) => {
      await navigateTo(page, '/reports/live');
      await captureScreenshot(page, '62-admin-reports-live', 'Reports Live');
    });

    test('capture reports scheduled', async ({ page }) => {
      await navigateTo(page, '/reports/scheduled');
      await captureScreenshot(page, '63-admin-reports-scheduled', 'Reports Scheduled');
    });

    test('capture report builder', async ({ page }) => {
      await navigateTo(page, '/reports/builder');
      await captureScreenshot(page, '64-admin-reports-builder', 'Report Builder');
    });

    test('capture custom reports', async ({ page }) => {
      await navigateTo(page, '/reports/custom');
      await captureScreenshot(page, '65-admin-reports-custom', 'Custom Reports');
    });

    test('capture reports benchmarks', async ({ page }) => {
      await navigateTo(page, '/reports/benchmarks');
      await captureScreenshot(page, '66-admin-reports-benchmarks', 'Reports Benchmarks');
    });

    test('capture reports predictive', async ({ page }) => {
      await navigateTo(page, '/reports/predictive');
      await captureScreenshot(page, '67-admin-reports-predictive', 'Reports Predictive');
    });
  });

  // ---- SETTINGS ----
  test.describe('Settings - Your Preferences', () => {
    test('capture settings profile', async ({ page }) => {
      await navigateTo(page, '/settings/profile');
      await captureScreenshot(page, '70-settings-profile', 'Settings Profile');
    });

    test('capture settings notifications', async ({ page }) => {
      await navigateTo(page, '/settings/notifications');
      await captureScreenshot(page, '71-settings-notifications', 'Settings Notifications');
    });
  });

  test.describe('Settings - Account Management', () => {
    test('capture settings account', async ({ page }) => {
      await navigateTo(page, '/settings/account');
      await captureScreenshot(page, '72-settings-account', 'Settings Account Defaults');
    });

    test('capture settings business', async ({ page }) => {
      await navigateTo(page, '/settings/business');
      await captureScreenshot(page, '73-settings-business', 'Settings Business');
    });

    test('capture settings branding', async ({ page }) => {
      await navigateTo(page, '/settings/branding');
      await captureScreenshot(page, '74-settings-branding', 'Settings Branding');
    });

    test('capture settings team', async ({ page }) => {
      await navigateTo(page, '/settings/team');
      await captureScreenshot(page, '75-settings-team', 'Settings Team');
    });

    test('capture settings roles', async ({ page }) => {
      await navigateTo(page, '/settings/team/roles');
      await captureScreenshot(page, '76-settings-roles', 'Settings Roles');
    });

    test('capture settings feature toggles', async ({ page }) => {
      await navigateTo(page, '/settings/feature-toggles');
      await captureScreenshot(page, '77-settings-feature-toggles', 'Settings Feature Toggles');
    });

    test('capture settings account security', async ({ page }) => {
      await navigateTo(page, '/settings/account-security');
      await captureScreenshot(page, '78-settings-account-security', 'Settings Account Security');
    });

    test('capture settings automation', async ({ page }) => {
      await navigateTo(page, '/settings/automation');
      await captureScreenshot(page, '79-settings-automation', 'Settings Automation');
    });

    test('capture settings audit log', async ({ page }) => {
      await navigateTo(page, '/settings/audit-log');
      await captureScreenshot(page, '80-settings-audit-log', 'Settings Audit Log');
    });

    test('capture settings billing', async ({ page }) => {
      await navigateTo(page, '/settings/billing');
      await captureScreenshot(page, '81-settings-billing', 'Settings Billing');
    });

    test('capture settings members', async ({ page }) => {
      await navigateTo(page, '/settings/members');
      await captureScreenshot(page, '82-settings-members', 'Settings Members');
    });
  });

  test.describe('Settings - Facility', () => {
    test('capture settings facility', async ({ page }) => {
      await navigateTo(page, '/settings/facility');
      await captureScreenshot(page, '83-settings-facility', 'Settings Facility');
    });
  });

  test.describe('Settings - Data Management', () => {
    test('capture settings custom fields', async ({ page }) => {
      await navigateTo(page, '/settings/custom-fields');
      await captureScreenshot(page, '84-settings-custom-fields', 'Settings Custom Fields');
    });

    test('capture settings records', async ({ page }) => {
      await navigateTo(page, '/settings/records');
      await captureScreenshot(page, '85-settings-records', 'Settings Records');
    });

    test('capture settings record keeping', async ({ page }) => {
      await navigateTo(page, '/settings/record-keeping');
      await captureScreenshot(page, '86-settings-record-keeping', 'Settings Record Keeping');
    });

    test('capture settings data quality', async ({ page }) => {
      await navigateTo(page, '/settings/data-quality');
      await captureScreenshot(page, '87-settings-data-quality', 'Settings Data Quality');
    });

    test('capture settings forms', async ({ page }) => {
      await navigateTo(page, '/settings/forms');
      await captureScreenshot(page, '88-settings-forms', 'Settings Forms');
    });

    test('capture settings documents', async ({ page }) => {
      await navigateTo(page, '/settings/documents');
      await captureScreenshot(page, '89-settings-documents', 'Settings Documents');
    });

    test('capture settings files', async ({ page }) => {
      await navigateTo(page, '/settings/files');
      await captureScreenshot(page, '90-settings-files', 'Settings Files');
    });

    test('capture settings import export', async ({ page }) => {
      await navigateTo(page, '/settings/import-export');
      await captureScreenshot(page, '91-settings-import-export', 'Settings Import/Export');
    });

    test('capture settings exports', async ({ page }) => {
      await navigateTo(page, '/settings/exports');
      await captureScreenshot(page, '92-settings-exports', 'Settings Exports');
    });
  });

  test.describe('Settings - Communication', () => {
    test('capture settings email', async ({ page }) => {
      await navigateTo(page, '/settings/email');
      await captureScreenshot(page, '93-settings-email', 'Settings Email');
    });

    test('capture settings sms', async ({ page }) => {
      await navigateTo(page, '/settings/sms');
      await captureScreenshot(page, '94-settings-sms', 'Settings SMS');
    });

    test('capture settings communication notifications', async ({ page }) => {
      await navigateTo(page, '/settings/communication-notifications');
      await captureScreenshot(page, '95-settings-communication-notifications', 'Settings Communication Notifications');
    });
  });

  test.describe('Settings - Booking & Scheduling', () => {
    test('capture settings booking config', async ({ page }) => {
      await navigateTo(page, '/settings/booking-config');
      await captureScreenshot(page, '96-settings-booking-config', 'Settings Booking Config');
    });

    test('capture settings calendar settings', async ({ page }) => {
      await navigateTo(page, '/settings/calendar-settings');
      await captureScreenshot(page, '97-settings-calendar-settings', 'Settings Calendar Settings');
    });

    test('capture settings online booking', async ({ page }) => {
      await navigateTo(page, '/settings/online-booking');
      await captureScreenshot(page, '98-settings-online-booking', 'Settings Online Booking');
    });

    test('capture settings services', async ({ page }) => {
      await navigateTo(page, '/settings/services');
      await captureScreenshot(page, '99-settings-services', 'Settings Services');
    });
  });

  test.describe('Settings - Billing', () => {
    test('capture settings payment processing', async ({ page }) => {
      await navigateTo(page, '/settings/payment-processing');
      await captureScreenshot(page, 'A0-settings-payment-processing', 'Settings Payment Processing');
    });

    test('capture settings invoicing', async ({ page }) => {
      await navigateTo(page, '/settings/invoicing');
      await captureScreenshot(page, 'A1-settings-invoicing', 'Settings Invoicing');
    });

    test('capture settings products services', async ({ page }) => {
      await navigateTo(page, '/settings/products-services');
      await captureScreenshot(page, 'A2-settings-products-services', 'Settings Products & Services');
    });
  });

  test.describe('Settings - Website & Integrations', () => {
    test('capture settings domain', async ({ page }) => {
      await navigateTo(page, '/settings/domain');
      await captureScreenshot(page, 'A3-settings-domain', 'Settings Domain');
    });

    test('capture settings integrations', async ({ page }) => {
      await navigateTo(page, '/settings/integrations');
      await captureScreenshot(page, 'A4-settings-integrations', 'Settings Integrations');
    });

    test('capture settings mobile', async ({ page }) => {
      await navigateTo(page, '/settings/mobile');
      await captureScreenshot(page, 'A5-settings-mobile', 'Settings Mobile');
    });
  });

  test.describe('Settings - Compliance', () => {
    test('capture settings privacy', async ({ page }) => {
      await navigateTo(page, '/settings/privacy');
      await captureScreenshot(page, 'A6-settings-privacy', 'Settings Privacy');
    });

    test('capture settings terms policies', async ({ page }) => {
      await navigateTo(page, '/settings/terms-policies');
      await captureScreenshot(page, 'A7-settings-terms-policies', 'Settings Terms & Policies');
    });
  });

  test.describe('Settings - Insights', () => {
    test('capture settings reporting', async ({ page }) => {
      await navigateTo(page, '/settings/reporting');
      await captureScreenshot(page, 'A8-settings-reporting', 'Settings Reporting');
    });
  });

  test.describe('Settings - Properties & Objects', () => {
    test('capture settings properties', async ({ page }) => {
      await navigateTo(page, '/settings/properties');
      await captureScreenshot(page, 'A9-settings-properties', 'Settings Properties');
    });

    test('capture settings objects owners', async ({ page }) => {
      await navigateTo(page, '/settings/objects/owners');
      await captureScreenshot(page, 'B0-settings-objects-owners', 'Settings Objects - Owners');
    });

    test('capture settings objects pets', async ({ page }) => {
      await navigateTo(page, '/settings/objects/pets');
      await captureScreenshot(page, 'B1-settings-objects-pets', 'Settings Objects - Pets');
    });

    test('capture settings objects bookings', async ({ page }) => {
      await navigateTo(page, '/settings/objects/bookings');
      await captureScreenshot(page, 'B2-settings-objects-bookings', 'Settings Objects - Bookings');
    });
  });

  // ---- MISC ----
  test.describe('Misc Pages', () => {
    test('capture facilities', async ({ page }) => {
      await navigateTo(page, '/facilities');
      await captureScreenshot(page, 'C0-misc-facilities', 'Facilities');
    });

    test('capture services', async ({ page }) => {
      await navigateTo(page, '/services');
      await captureScreenshot(page, 'C1-misc-services', 'Services');
    });

    test('capture mobile tasks', async ({ page }) => {
      await navigateTo(page, '/mobile/tasks');
      await captureScreenshot(page, 'C2-misc-mobile-tasks', 'Mobile Tasks');
    });

    test('capture mobile check-in', async ({ page }) => {
      await navigateTo(page, '/mobile/check-in');
      await captureScreenshot(page, 'C3-misc-mobile-checkin', 'Mobile Check-in');
    });

    test('capture customer portal', async ({ page }) => {
      await navigateTo(page, '/customer-portal');
      await captureScreenshot(page, 'C4-misc-customer-portal', 'Customer Portal');
    });

    test('capture admin', async ({ page }) => {
      await navigateTo(page, '/admin');
      await captureScreenshot(page, 'C5-misc-admin', 'Admin Panel');
    });
  });
});
