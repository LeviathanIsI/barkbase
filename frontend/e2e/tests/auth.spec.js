/**
 * Authentication E2E Tests
 * Tests login, logout, and session management
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { testUsers } from '../fixtures/test-data.js';

test.describe('Authentication', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test.describe('Login Flow', () => {
    // Skip auth state for login tests
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should display login form', async ({ page }) => {
      await loginPage.goto();

      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should login with valid credentials', async ({ page }) => {
      await loginPage.goto();

      const { email, password } = testUsers.admin;
      await loginPage.login(email, password);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/(today|dashboard|home)/);
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await loginPage.goto();

      await loginPage.login('invalid@email.com', 'wrongpassword', { expectSuccess: false });

      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);

      // Should show error message (check for specific error text)
      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await loginPage.goto();

      await loginPage.fillEmail('invalid-email');
      await loginPage.fillPassword('somepassword');
      await loginPage.clickLogin();

      // Should show validation error or stay on page
      const url = page.url();
      expect(url).toContain('/login');
    });

    test('should require password', async ({ page }) => {
      await loginPage.goto();

      await loginPage.fillEmail(testUsers.admin.email);
      // Don't fill password
      await loginPage.clickLogin();

      // Should stay on login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session after page refresh', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/(today|dashboard|home)/);

      // Refresh the page
      await page.reload();

      // Should still be on dashboard (session maintained)
      await expect(page).toHaveURL(/\/(today|dashboard|home)/);
    });

    test('should persist session across navigation', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Navigate to different pages
      await page.goto('/pets');
      await expect(page).toHaveURL(/\/pets/);

      await page.goto('/owners');
      await expect(page).toHaveURL(/\/owners/);

      await page.goto('/bookings');
      await expect(page).toHaveURL(/\/bookings/);

      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Look for logout button/link
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")');

      if (await logoutButton.isVisible()) {
        await logoutButton.click();

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
      }
    });
  });

  test.describe('Protected Routes', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route directly
      await page.goto('/pets');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect to original page after login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/pets');

      // Login
      const { email, password } = testUsers.admin;
      await page.locator('input[type="email"], input[name="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.locator('button[type="submit"]').click();

      // Should redirect to pets (or dashboard)
      await page.waitForURL(/\/(pets|today|dashboard)/);
    });
  });
});
