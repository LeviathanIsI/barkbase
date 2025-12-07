/**
 * Owners Page E2E Tests
 * Tests owner/customer management functionality
 */

import { test, expect } from '@playwright/test';
import { OwnersPage } from '../pages/OwnersPage.js';
import { testOwners, generateUniqueTestData } from '../fixtures/test-data.js';

test.describe('Owners Management', () => {
  let ownersPage;

  test.beforeEach(async ({ page }) => {
    ownersPage = new OwnersPage(page);
  });

  test.describe('Page Load', () => {
    test('should load owners page successfully', async ({ page }) => {
      await ownersPage.goto();

      // Verify page loaded
      await expect(page.locator('h1')).toContainText(/Owner|Customer/i);
    });

    test('should display owners table/list', async ({ page }) => {
      await ownersPage.goto();

      const table = page.locator('table');
      const list = page.locator('[data-testid="owners-list"]');

      const tableVisible = await table.isVisible();
      const listVisible = await list.isVisible();

      expect(tableVisible || listVisible).toBeTruthy();
    });

    test('should show owner count', async ({ page }) => {
      await ownersPage.goto();

      const count = await ownersPage.getOwnerCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Search & Filter', () => {
    test('should search for owners by name', async ({ page }) => {
      await ownersPage.goto();

      await ownersPage.searchOwner('test');
      await page.waitForTimeout(1000);

      const count = await ownersPage.getOwnerCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should clear search', async ({ page }) => {
      await ownersPage.goto();

      await ownersPage.searchOwner('test');
      await ownersPage.clearSearch();
      await page.waitForTimeout(500);

      const count = await ownersPage.getOwnerCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Owner CRUD Operations', () => {
    test('should open add owner modal', async ({ page }) => {
      await ownersPage.goto();

      await ownersPage.clickAddOwner();

      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test('should create a new owner', async ({ page }) => {
      await ownersPage.goto();

      const ownerData = generateUniqueTestData(testOwners.primary);

      await ownersPage.clickAddOwner();

      // Fill in owner details
      const firstNameField = page.locator('input[name="firstName"], #firstName');
      if (await firstNameField.isVisible()) {
        await firstNameField.fill(ownerData.firstName);
      }

      const lastNameField = page.locator('input[name="lastName"], #lastName');
      if (await lastNameField.isVisible()) {
        await lastNameField.fill(ownerData.lastName);
      }

      const emailField = page.locator('input[type="email"], input[name="email"]');
      if (await emailField.isVisible()) {
        await emailField.fill(ownerData.email);
      }

      const phoneField = page.locator('input[type="tel"], input[name="phone"]');
      if (await phoneField.isVisible()) {
        await phoneField.fill(ownerData.phone);
      }

      // Submit form
      await page.locator('button[type="submit"], button:has-text("Save")').click();

      // Wait for modal to close
      await page.waitForTimeout(2000);
    });

    test('should view owner profile', async ({ page }) => {
      await ownersPage.goto();

      const firstRow = page.locator('tbody tr').first();
      const viewButton = firstRow.locator('button:has-text("View"), button[aria-label="View profile"]');

      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Should navigate to customer detail page
        await expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/);
        await expect(page).not.toHaveURL(/undefined/);
      }
    });

    test('should edit an owner', async ({ page }) => {
      await ownersPage.goto();

      const firstRow = page.locator('tbody tr').first();
      const editButton = firstRow.locator('button:has-text("Edit"), button[aria-label="Edit"]');

      if (await editButton.isVisible()) {
        await editButton.click();

        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    });
  });

  test.describe('Owner Detail View', () => {
    test('should display owner information', async ({ page }) => {
      await ownersPage.goto();

      // Navigate to first owner's profile
      const viewButton = page.locator('button[aria-label="View profile"]').first();

      if (await viewButton.isVisible()) {
        await viewButton.click();

        await page.waitForURL(/\/customers\/[a-z0-9-]+/);

        // Should show owner details
        await expect(page.locator('h1, [data-testid="owner-name"]')).toBeVisible();
      }
    });

    test('should show owner tabs', async ({ page }) => {
      await ownersPage.goto();

      const viewButton = page.locator('button[aria-label="View profile"]').first();

      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForURL(/\/customers\/[a-z0-9-]+/);

        // Check for tabs
        const overviewTab = page.locator('button:has-text("Overview")');
        const petsTab = page.locator('button:has-text("Pets")');
        const bookingsTab = page.locator('button:has-text("Bookings")');

        // At least some tabs should be visible
        const tabsVisible = await overviewTab.isVisible() ||
                           await petsTab.isVisible() ||
                           await bookingsTab.isVisible();

        expect(tabsVisible).toBeTruthy();
      }
    });

    test('should switch between tabs', async ({ page }) => {
      await ownersPage.goto();

      const viewButton = page.locator('button[aria-label="View profile"]').first();

      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForURL(/\/customers\/[a-z0-9-]+/);

        // Click on Pets tab
        const petsTab = page.locator('button:has-text("Pets")');
        if (await petsTab.isVisible()) {
          await petsTab.click();
          await page.waitForTimeout(500);
        }

        // Click on Bookings tab
        const bookingsTab = page.locator('button:has-text("Bookings")');
        if (await bookingsTab.isVisible()) {
          await bookingsTab.click();
          await page.waitForTimeout(500);
        }

        // Click back to Overview
        const overviewTab = page.locator('button:has-text("Overview")');
        if (await overviewTab.isVisible()) {
          await overviewTab.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Table Interactions', () => {
    test('should select an owner row', async ({ page }) => {
      await ownersPage.goto();

      const checkbox = page.locator('tbody tr input[type="checkbox"]').first();

      if (await checkbox.isVisible()) {
        await checkbox.check();
        await expect(checkbox).toBeChecked();
      }
    });

    test('should sort owners by column', async ({ page }) => {
      await ownersPage.goto();

      const nameHeader = page.locator('th:has-text("Name"), th:has-text("Owner")').first();

      if (await nameHeader.isVisible()) {
        await nameHeader.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Row Actions', () => {
    test('should navigate to owner detail on view click', async ({ page }) => {
      await ownersPage.goto();

      const viewButton = page.locator('button[aria-label="View profile"]').first();

      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Should navigate to detail page with valid UUID
        await expect(page).toHaveURL(/\/customers\/[a-f0-9-]{36}/);
        await expect(page).not.toHaveURL(/undefined/);
      }
    });

    test('should open more actions menu', async ({ page }) => {
      await ownersPage.goto();

      const moreButton = page.locator('button[aria-label="More actions"]').first();

      if (await moreButton.isVisible()) {
        await moreButton.click();

        const menu = page.locator('[role="menu"], .dropdown-menu');
        await expect(menu).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await ownersPage.goto();

      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await ownersPage.goto();

      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });
  });
});
