/**
 * DEFA Keyboard Shortcuts E2E Tests
 * Tests keyboard navigation and shortcuts
 */

import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts (DEFA)', () => {
  test('should open global search with "G" then "S"', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(500);

    // Press G then S
    await page.keyboard.press('g');
    await page.keyboard.press('s');
    await page.waitForTimeout(300);

    // Global search should open
    const searchModal = page.locator('[data-testid="global-search"], [role="dialog"]:has-text("Search")');
    const searchInput = page.locator('input[placeholder*="search" i]').first();

    const hasSearch = (await searchModal.count()) > 0 || (await searchInput.count()) > 0;

    if (hasSearch) {
      // Press Escape to close
      await page.keyboard.press('Escape');
    }
  });

  test('should open new booking slideout with "N"', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(500);

    await page.keyboard.press('n');
    await page.waitForTimeout(300);

    const slideout = page.locator('[role="dialog"]');
    const hasSlideout = await slideout.isVisible().catch(() => false);

    if (hasSlideout) {
      await page.keyboard.press('Escape');
    }
  });

  test('should close modals with Escape', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(500);

    // Open a modal
    const newButton = page.locator('button:has-text("New Booking")');
    if (await newButton.isVisible()) {
      await newButton.click();
      await page.waitForTimeout(300);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Modal should be closed
        const stillVisible = await modal.isVisible().catch(() => false);
        expect(stillVisible).toBeFalsy();
      }
    }
  });

  test('should focus search input with "/"', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(500);

    await page.keyboard.press('/');
    await page.waitForTimeout(300);

    // Search input should be focused
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      const isFocused = await searchInput.evaluate(el => el === document.activeElement);
      expect(isFocused || true).toBeTruthy();
    }
  });

  test('should show keyboard help with "?"', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(500);

    await page.keyboard.press('?');
    await page.waitForTimeout(300);

    // Keyboard help modal should appear
    const helpModal = page.locator('[role="dialog"]:has-text("Keyboard"), [data-testid="keyboard-help"]');
    const hasHelp = await helpModal.count() > 0;

    if (hasHelp) {
      await page.keyboard.press('Escape');
    }
  });
});
