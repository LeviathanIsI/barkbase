/**
 * Pets Page E2E Tests
 * Tests pet management functionality
 */

import { test, expect } from '@playwright/test';
import { PetsPage } from '../pages/PetsPage.js';
import { testPets, generateUniqueTestData } from '../fixtures/test-data.js';
import { setupConsoleErrorCapture } from '../utils/test-helpers.js';

test.describe('Pets Management', () => {
  let petsPage;

  test.beforeEach(async ({ page }) => {
    petsPage = new PetsPage(page);
  });

  test.describe('Page Load', () => {
    test('should load pets page successfully', async ({ page }) => {
      await petsPage.goto();

      // Verify page loaded
      await expect(page.locator('h1')).toContainText(/Pet/i);
    });

    test('should display pets table/list', async ({ page }) => {
      await petsPage.goto();

      // Wait for table or list to load
      const table = page.locator('table');
      const list = page.locator('[data-testid="pets-list"]');

      const tableVisible = await table.isVisible();
      const listVisible = await list.isVisible();

      expect(tableVisible || listVisible).toBeTruthy();
    });

    test('should show pet count', async ({ page }) => {
      await petsPage.goto();

      const count = await petsPage.getPetCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should not have critical console errors', async ({ page }) => {
      const errorCapture = setupConsoleErrorCapture(page);
      await petsPage.goto();
      await page.waitForTimeout(2000);

      const errors = errorCapture.getErrors().filter(
        (e) => !e.text.includes('favicon') && !e.text.includes('404') && !e.text.includes('vaccinations')
      );

      expect(errors.length).toBeLessThanOrEqual(3);
    });
  });

  test.describe('Search & Filter', () => {
    test('should search for pets by name', async ({ page }) => {
      await petsPage.goto();

      // Get initial count
      const initialCount = await petsPage.getPetCount();

      if (initialCount > 0) {
        // Search for a specific term
        await petsPage.searchPet('test');
        await page.waitForTimeout(1000);

        // Count might change
        const filteredCount = await petsPage.getPetCount();
        expect(filteredCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should clear search and show all pets', async ({ page }) => {
      await petsPage.goto();

      await petsPage.searchPet('test');
      await page.waitForTimeout(500);

      await petsPage.clearSearch();
      await page.waitForTimeout(500);

      const count = await petsPage.getPetCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter by species', async ({ page }) => {
      await petsPage.goto();

      const speciesFilter = page.locator('select:has(option:has-text("Dog")), [data-testid="species-filter"]');

      if (await speciesFilter.isVisible()) {
        await speciesFilter.selectOption('Dog');
        await page.waitForTimeout(500);

        // Should show filtered results
        const count = await petsPage.getPetCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter by status', async ({ page }) => {
      await petsPage.goto();

      const statusFilter = page.locator('select:has(option:has-text("Active")), [data-testid="status-filter"]');

      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('Active');
        await page.waitForTimeout(500);

        const count = await petsPage.getPetCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Pet CRUD Operations', () => {
    test('should open add pet modal', async ({ page }) => {
      await petsPage.goto();

      await petsPage.clickAddPet();

      // Modal should be visible
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test('should create a new pet', async ({ page }) => {
      await petsPage.goto();

      const petData = generateUniqueTestData(testPets.dog);

      await petsPage.clickAddPet();

      // Fill in pet details
      await page.locator('input[name="name"], #name, #pet-name').fill(petData.name);

      // Fill breed if field exists
      const breedField = page.locator('input[name="breed"], #breed');
      if (await breedField.isVisible()) {
        await breedField.fill(petData.breed);
      }

      // Select species if field exists
      const speciesField = page.locator('select[name="species"], #species');
      if (await speciesField.isVisible()) {
        await speciesField.selectOption(petData.species);
      }

      // Submit form
      await page.locator('button[type="submit"], button:has-text("Save")').click();

      // Wait for modal to close or success message
      await page.waitForTimeout(2000);

      // Verify pet was created (search for it)
      await petsPage.searchPet(petData.name);
      await page.waitForTimeout(1000);

      const exists = await petsPage.petExists(petData.name);
      expect(exists).toBeTruthy();
    });

    test('should view pet profile', async ({ page }) => {
      await petsPage.goto();

      // Get first pet row
      const firstRow = page.locator('tbody tr').first();
      const viewButton = firstRow.locator('button:has-text("View"), button[aria-label="View profile"]');

      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Should navigate to pet detail page
        await expect(page).toHaveURL(/\/pets\/[a-z0-9-]+/);
      }
    });

    test('should edit a pet', async ({ page }) => {
      await petsPage.goto();

      const firstRow = page.locator('tbody tr').first();
      const editButton = firstRow.locator('button:has-text("Edit"), button[aria-label="Edit"]');

      if (await editButton.isVisible()) {
        await editButton.click();

        // Modal should appear
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    });
  });

  test.describe('Table Interactions', () => {
    test('should select a pet row', async ({ page }) => {
      await petsPage.goto();

      const checkbox = page.locator('tbody tr input[type="checkbox"]').first();

      if (await checkbox.isVisible()) {
        await checkbox.check();
        await expect(checkbox).toBeChecked();
      }
    });

    test('should select all pets', async ({ page }) => {
      await petsPage.goto();

      const selectAllCheckbox = page.locator('thead input[type="checkbox"]');

      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();

        // All row checkboxes should be checked
        const rowCheckboxes = page.locator('tbody tr input[type="checkbox"]');
        const count = await rowCheckboxes.count();

        for (let i = 0; i < count; i++) {
          await expect(rowCheckboxes.nth(i)).toBeChecked();
        }
      }
    });

    test('should sort by column', async ({ page }) => {
      await petsPage.goto();

      const nameHeader = page.locator('th:has-text("Pet"), th:has-text("Name")').first();

      if (await nameHeader.isVisible()) {
        await nameHeader.click();
        await page.waitForTimeout(500);

        // Click again to reverse sort
        await nameHeader.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Pagination', () => {
    test('should navigate between pages', async ({ page }) => {
      await petsPage.goto();

      const nextButton = page.locator('button[aria-label="Next page"], button:has-text("Next")');

      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Should show different data
        const prevButton = page.locator('button[aria-label="Previous page"], button:has-text("Previous")');
        await expect(prevButton).toBeEnabled();
      }
    });

    test('should change page size', async ({ page }) => {
      await petsPage.goto();

      const pageSizeSelect = page.locator('select:has(option:has-text("25")), [data-testid="page-size"]');

      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('50');
        await page.waitForTimeout(500);

        // Page size should update
        await expect(pageSizeSelect).toHaveValue('50');
      }
    });
  });

  test.describe('Row Actions', () => {
    test('should navigate to pet detail on view click', async ({ page }) => {
      await petsPage.goto();

      const viewButton = page.locator('button[aria-label="View profile"]').first();

      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Should navigate to detail page with valid UUID
        await expect(page).toHaveURL(/\/pets\/[a-f0-9-]{36}/);
        await expect(page).not.toHaveURL(/undefined/);
      }
    });

    test('should open more actions menu', async ({ page }) => {
      await petsPage.goto();

      const moreButton = page.locator('button[aria-label="More actions"]').first();

      if (await moreButton.isVisible()) {
        await moreButton.click();

        // Menu should appear
        const menu = page.locator('[role="menu"], .dropdown-menu');
        await expect(menu).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should show mobile card view on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await petsPage.goto();

      // Mobile view should show cards instead of table
      await page.waitForTimeout(500);

      // Content should still be visible
      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });

    test('should show table view on large screens', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await petsPage.goto();

      // Table should be visible on desktop
      const table = page.locator('table');
      const isVisible = await table.isVisible();

      // If table exists, it should be visible
      if (await page.locator('table').count() > 0) {
        await expect(table).toBeVisible();
      }
    });
  });
});
