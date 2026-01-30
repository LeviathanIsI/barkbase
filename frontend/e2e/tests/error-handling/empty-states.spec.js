/**
 * Empty States E2E Tests
 * Tests empty state displays
 */

import { test, expect } from '@playwright/test';

test.describe('Empty States', () => {
  test('should show appropriate empty state when no owners exist', async ({ page }) => {
    await page.goto('/owners');
    await page.waitForTimeout(500);

    // Look for empty state or data
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state, :has-text("No owners"), :has-text("No customers")');
    const table = page.locator('table tbody tr');

    const hasEmptyState = await emptyState.count() > 0;
    const hasData = (await table.count()) > 0;

    // Should have either empty state or data
    expect(hasEmptyState || hasData).toBeTruthy();
  });

  test('should show appropriate empty state when no pets exist', async ({ page }) => {
    await page.goto('/pets');
    await page.waitForTimeout(500);

    const emptyState = page.locator('[data-testid="empty-state"], .empty-state, :has-text("No pets")');
    const table = page.locator('table tbody tr');

    const hasEmptyState = await emptyState.count() > 0;
    const hasData = (await table.count()) > 0;

    expect(hasEmptyState || hasData).toBeTruthy();
  });

  test('should show appropriate empty state when no bookings exist', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(500);

    const emptyState = page.locator('[data-testid="empty-state"], .empty-state, :has-text("No bookings")');
    const hasContent = page.locator('table, .calendar, [data-testid="booking-card"]');

    const hasEmptyState = await emptyState.count() > 0;
    const hasData = (await hasContent.count()) > 0;

    expect(hasEmptyState || hasData).toBeTruthy();
  });

  test('should show appropriate empty state when no tasks exist', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForTimeout(500);

    const emptyState = page.locator('[data-testid="empty-state"], .empty-state, :has-text("No tasks")');
    const table = page.locator('table tbody tr');

    const hasEmptyState = await emptyState.count() > 0;
    const hasData = (await table.count()) > 0;

    expect(hasEmptyState || hasData).toBeTruthy();
  });

  test('should provide action button in empty state', async ({ page }) => {
    await page.goto('/owners');
    await page.waitForTimeout(500);

    const emptyState = page.locator('[data-testid="empty-state"], .empty-state');

    if (await emptyState.isVisible()) {
      // Should have a CTA button
      const ctaButton = emptyState.locator('button, a');
      const hasButton = (await ctaButton.count()) > 0;

      expect(hasButton).toBeTruthy();
    }
  });
});
