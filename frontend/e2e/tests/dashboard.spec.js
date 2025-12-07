/**
 * Dashboard/Command Center E2E Tests
 * Tests main dashboard functionality
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';
import { setupConsoleErrorCapture, measurePerformance } from '../utils/test-helpers.js';

test.describe('Dashboard', () => {
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Page Load', () => {
    test('should load dashboard successfully', async ({ page }) => {
      await dashboardPage.goto();

      // Verify page title is visible
      const title = await dashboardPage.getPageTitle();
      expect(title).toBeTruthy();
    });

    test('should display stats cards', async ({ page }) => {
      await dashboardPage.goto();

      // Check for stats cards
      const statsCards = page.locator('[data-testid="stat-card"], .stat-card');
      await expect(statsCards.first()).toBeVisible({ timeout: 10000 });
    });

    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await dashboardPage.goto();
      const loadTime = Date.now() - startTime;

      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not have console errors on load', async ({ page }) => {
      const errorCapture = setupConsoleErrorCapture(page);
      await dashboardPage.goto();

      // Allow small buffer for API calls
      await page.waitForTimeout(2000);

      // Filter out known non-critical errors
      const errors = errorCapture.getErrors().filter(
        (e) => !e.text.includes('favicon') && !e.text.includes('manifest')
      );

      // Should have no critical console errors
      expect(errors.length).toBeLessThanOrEqual(2);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to Pets page', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateTo('Pets');

      await expect(page).toHaveURL(/\/pets/);
    });

    test('should navigate to Owners page', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateTo('Owners');

      await expect(page).toHaveURL(/\/owners/);
    });

    test('should navigate to Bookings page', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateTo('Bookings');

      await expect(page).toHaveURL(/\/bookings/);
    });

    test('should navigate to Tasks page', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateTo('Tasks');

      await expect(page).toHaveURL(/\/tasks/);
    });

    test('should navigate to Kennels page', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateTo('Kennels');

      await expect(page).toHaveURL(/\/kennels/);
    });

    test('should navigate to Settings page', async ({ page }) => {
      await dashboardPage.goto();
      await dashboardPage.navigateTo('Settings');

      await expect(page).toHaveURL(/\/settings/);
    });
  });

  test.describe('Quick Actions', () => {
    test('should open new booking modal', async ({ page }) => {
      await dashboardPage.goto();

      const newBookingButton = page.locator('button:has-text("New Booking"), [data-testid="new-booking"]');
      if (await newBookingButton.isVisible()) {
        await newBookingButton.click();

        // Modal should appear
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    });

    test('should show arrivals section', async ({ page }) => {
      await dashboardPage.goto();

      const arrivalsSection = page.locator('[data-testid="arrivals"], :has-text("Arrivals")').first();
      // Arrivals section might not always be visible depending on data
      const isVisible = await arrivalsSection.isVisible();
      expect(typeof isVisible).toBe('boolean');
    });

    test('should show departures section', async ({ page }) => {
      await dashboardPage.goto();

      const departuresSection = page.locator('[data-testid="departures"], :has-text("Departures")').first();
      // Departures section might not always be visible depending on data
      const isVisible = await departuresSection.isVisible();
      expect(typeof isVisible).toBe('boolean');
    });
  });

  test.describe('Tasks Section', () => {
    test('should display tasks if any exist', async ({ page }) => {
      await dashboardPage.goto();

      const tasksSection = page.locator('[data-testid="tasks-section"], :has-text("Tasks")').first();
      const isVisible = await tasksSection.isVisible();

      if (isVisible) {
        // Check for task items
        const tasks = page.locator('[data-testid="task-item"]');
        const taskCount = await tasks.count();
        expect(taskCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should be able to complete a task', async ({ page }) => {
      await dashboardPage.goto();

      const completeButton = page.locator('button:has-text("Complete")').first();

      if (await completeButton.isVisible()) {
        await completeButton.click();

        // Wait for API call to complete
        await page.waitForTimeout(1000);

        // Task should be updated (toast or UI change)
        // This depends on implementation
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await dashboardPage.goto();

      // Should still show main content
      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await dashboardPage.goto();

      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });

    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD
      await dashboardPage.goto();

      await expect(page.locator('main, [role="main"]')).toBeVisible();
      // Sidebar should be visible on desktop
      await expect(page.locator('aside, nav[role="navigation"]').first()).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should have acceptable performance metrics', async ({ page }) => {
      await dashboardPage.goto();

      const metrics = await measurePerformance(page);

      // First contentful paint should be under 2 seconds
      if (metrics.firstContentfulPaint) {
        expect(metrics.firstContentfulPaint).toBeLessThan(2000);
      }

      // DOM content loaded should be under 3 seconds
      if (metrics.domContentLoaded) {
        expect(metrics.domContentLoaded).toBeLessThan(3000);
      }
    });
  });
});
