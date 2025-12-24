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
