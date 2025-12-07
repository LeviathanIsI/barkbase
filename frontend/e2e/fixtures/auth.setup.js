/**
 * Authentication Setup for E2E Tests
 * Creates authenticated browser state for test reuse
 */

import { test as setup, expect } from '@playwright/test';
import { testUsers } from './test-data.js';
import { LoginPage } from '../pages/LoginPage.js';
import fs from 'fs';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('Setting up authentication...');

  // Check if E2E credentials are configured
  const hasCredentials = process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD;

  if (!hasCredentials) {
    console.warn('⚠️  E2E test credentials not configured.');
    console.warn('   Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD environment variables');
    console.warn('   or provide valid credentials in e2e/fixtures/test-data.js');
    console.warn('   Tests requiring authentication will be skipped.');

    // Create empty auth state file so tests can continue
    // Tests that require auth will be skipped
    const emptyAuthState = {
      cookies: [],
      origins: []
    };
    fs.writeFileSync(authFile, JSON.stringify(emptyAuthState, null, 2));
    return;
  }

  const loginPage = new LoginPage(page);

  // Navigate to login
  await loginPage.goto();

  // Check if already logged in
  if (await loginPage.isLoggedIn()) {
    console.log('Already authenticated, saving state...');
    await page.context().storageState({ path: authFile });
    return;
  }

  // Perform login with admin credentials
  const { email, password } = testUsers.admin;

  try {
    await loginPage.login(email, password);

    // Verify we're logged in
    await expect(page).toHaveURL(/\/(today|dashboard|home)/, { timeout: 15000 });

    console.log('✅ Login successful, saving authentication state...');

    // Save authentication state
    await page.context().storageState({ path: authFile });
  } catch (error) {
    console.error('❌ Authentication setup failed:', error.message);
    console.error('   This may be due to invalid credentials.');
    console.error('   Tests requiring authentication will be skipped.');

    // Take screenshot for debugging
    await page.screenshot({ path: 'e2e/reports/auth-failure.png' });

    // Create empty auth state file so tests can continue
    const emptyAuthState = {
      cookies: [],
      origins: []
    };
    fs.writeFileSync(authFile, JSON.stringify(emptyAuthState, null, 2));
  }
});

setup.describe.configure({ mode: 'serial' });
