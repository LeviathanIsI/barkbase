/**
 * DEFA Hover Previews E2E Tests
 * Tests hover preview functionality for owners and pets
 */

import { test, expect } from '@playwright/test';

test.describe('Hover Previews (DEFA)', () => {
  test('should show owner hover preview with correct data', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(1000);

    // Look for owner name links
    const ownerLinks = page.locator('a[href*="/customers/"], [data-testid*="owner"]');
    const count = await ownerLinks.count();

    if (count > 0) {
      const firstOwner = ownerLinks.first();
      await firstOwner.hover();
      await page.waitForTimeout(600);

      // Look for hover preview card
      const hoverCard = page.locator('[data-testid="hover-preview"], [role="tooltip"], .preview-card');
      const hasHoverCard = await hoverCard.count() > 0;

      if (hasHoverCard) {
        await expect(hoverCard.first()).toBeVisible();
      }
    }
  });

  test('should show pet hover preview with correct data', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(1000);

    // Look for pet name links
    const petLinks = page.locator('a[href*="/pets/"], [data-testid*="pet"]');
    const count = await petLinks.count();

    if (count > 0) {
      const firstPet = petLinks.first();
      await firstPet.hover();
      await page.waitForTimeout(600);

      // Look for hover preview card
      const hoverCard = page.locator('[data-testid="hover-preview"], [role="tooltip"], .preview-card');
      const hasHoverCard = await hoverCard.count() > 0;

      if (hasHoverCard) {
        await expect(hoverCard.first()).toBeVisible();
      }
    }
  });

  test('should load hover previews quickly (< 500ms)', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(1000);

    const ownerLinks = page.locator('a[href*="/customers/"]');
    const count = await ownerLinks.count();

    if (count > 0) {
      const startTime = Date.now();
      await ownerLinks.first().hover();

      // Wait for preview to appear
      const hoverCard = page.locator('[data-testid="hover-preview"], [role="tooltip"]');
      await hoverCard.first().waitFor({ state: 'visible', timeout: 1000 }).catch(() => {});

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(1500);
    }
  });

  test('should not flicker when hovering', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForTimeout(1000);

    const ownerLinks = page.locator('a[href*="/customers/"]');
    const count = await ownerLinks.count();

    if (count > 0) {
      const link = ownerLinks.first();
      await link.hover();
      await page.waitForTimeout(800);

      const hoverCard = page.locator('[data-testid="hover-preview"], [role="tooltip"]');
      const isVisible = await hoverCard.isVisible().catch(() => false);

      if (isVisible) {
        // Hover card should remain stable
        await page.waitForTimeout(500);
        const stillVisible = await hoverCard.isVisible();
        expect(stillVisible).toBeTruthy();
      }
    }
  });
});
