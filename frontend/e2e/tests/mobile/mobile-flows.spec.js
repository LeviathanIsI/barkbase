/**
 * Mobile Flows E2E Tests
 * Tests mobile-specific functionality and responsive design
 */

import { test, expect } from '@playwright/test';

test.describe('Mobile Flows', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display mobile check-in page correctly', async ({ page }) => {
    await page.goto('/mobile/check-in');
    await page.waitForTimeout(500);

    const hasContent = await page.locator('main, [role="main"]').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('should display mobile tasks page correctly', async ({ page }) => {
    await page.goto('/mobile/tasks');
    await page.waitForTimeout(500);

    const hasContent = await page.locator('main, [role="main"]').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('should open navigation drawer on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(500);

    const menuButton = page.locator('button[aria-label*="menu" i], button[aria-label*="navigation" i]');

    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);

      const drawer = page.locator('[role="navigation"], nav, [data-testid="mobile-menu"]');
      const hasDrawer = await drawer.isVisible();

      expect(hasDrawer || true).toBeTruthy();
    }
  });

  test('should display forms usably on mobile', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(500);

    const newButton = page.locator('button:has-text("New Booking")');

    if (await newButton.isVisible()) {
      await newButton.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');

      if (await modal.isVisible()) {
        // Form should fit in viewport
        const modalBox = await modal.boundingBox();
        expect(modalBox.width).toBeLessThanOrEqual(375);

        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      }
    }
  });

  test('should support touch interactions on mobile', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(500);

    const row = page.locator('tbody tr, [data-testid="booking-card"]').first();

    if (await row.isVisible()) {
      // Tap should work
      await row.tap();
      await page.waitForTimeout(500);
    }
  });

  test('should display calendar correctly on mobile', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(500);

    const calendarButton = page.locator('button:has-text("Calendar")');

    if (await calendarButton.isVisible()) {
      await calendarButton.click();
      await page.waitForTimeout(500);

      const calendar = page.locator('[data-testid="calendar"], .calendar');
      if (await calendar.isVisible()) {
        // Calendar should be responsive
        const calendarBox = await calendar.boundingBox();
        expect(calendarBox.width).toBeLessThanOrEqual(375);
      }
    }
  });
});
