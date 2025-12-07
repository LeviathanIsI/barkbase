/**
 * Responsive Visual Regression Tests
 * Tests visual appearance across different viewport sizes
 */

import { test, expect } from '@playwright/test';
import {
  waitForVisualStability,
  hideDynamicContent,
  VIEWPORTS,
} from '../../utils/visual-test-helpers.js';

// Key pages to test across viewports
const PAGES_TO_TEST = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'pets-list', path: '/pets' },
  { name: 'bookings', path: '/bookings' },
  { name: 'calendar', path: '/calendar' },
  { name: 'settings', path: '/settings' },
];

// Viewports to test
const TEST_VIEWPORTS = [
  { name: 'mobile', ...VIEWPORTS.mobile },
  { name: 'tablet', ...VIEWPORTS.tablet },
  { name: 'desktop', ...VIEWPORTS.desktop },
  { name: 'desktop-large', ...VIEWPORTS.desktopLarge },
];

test.describe('Responsive Visual Tests', () => {
  for (const viewport of TEST_VIEWPORTS) {
    test.describe(`${viewport.name} viewport (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      for (const pageConfig of PAGES_TO_TEST) {
        test(`${pageConfig.name} page renders correctly`, async ({ page }) => {
          await page.goto(pageConfig.path);
          await waitForVisualStability(page);
          await hideDynamicContent(page);

          await expect(page).toHaveScreenshot(
            `responsive-${pageConfig.name}-${viewport.name}.png`,
            {
              fullPage: true,
              maxDiffPixels: 1500,
            }
          );
        });
      }
    });
  }
});

test.describe('Mobile-Specific Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
  });

  test('mobile navigation menu', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForVisualStability(page);

    // Look for mobile menu toggle (hamburger button)
    const menuToggle = page.locator(
      '[data-testid="mobile-menu"], ' +
      'button[aria-label*="menu"], ' +
      'button[aria-label*="Menu"], ' +
      '.hamburger-menu'
    ).first();

    if (await menuToggle.isVisible()) {
      await expect(page).toHaveScreenshot('mobile-nav-closed.png', {
        maxDiffPixels: 500,
      });

      await menuToggle.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('mobile-nav-open.png', {
        maxDiffPixels: 500,
      });
    }
  });

  test('mobile table scrolling', async ({ page }) => {
    await page.goto('/pets');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    // Check if table has horizontal scroll
    const tableContainer = page.locator('.overflow-x-auto, [class*="table-container"]').first();

    if (await tableContainer.isVisible()) {
      await expect(tableContainer).toHaveScreenshot('mobile-table-scroll.png', {
        maxDiffPixels: 500,
      });
    }
  });

  test('mobile form layout', async ({ page }) => {
    await page.goto('/login');
    await waitForVisualStability(page);

    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('mobile-form-layout.png', {
      maxDiffPixels: 300,
    });
  });

  test('mobile card stacking', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    await expect(page).toHaveScreenshot('mobile-card-stacking.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });
});

test.describe('Tablet-Specific Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
  });

  test('tablet sidebar behavior', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('tablet-sidebar.png', {
      maxDiffPixels: 800,
    });
  });

  test('tablet grid layout', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    await expect(page).toHaveScreenshot('tablet-grid-layout.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });

  test('tablet calendar view', async ({ page }) => {
    await page.goto('/calendar');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    await expect(page).toHaveScreenshot('tablet-calendar.png', {
      fullPage: true,
      maxDiffPixels: 1200,
    });
  });
});

test.describe('Desktop Large Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktopLarge);
  });

  test('wide dashboard layout', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    await expect(page).toHaveScreenshot('desktop-large-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 1500,
    });
  });

  test('wide table layout', async ({ page }) => {
    await page.goto('/pets');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    await expect(page).toHaveScreenshot('desktop-large-table.png', {
      fullPage: true,
      maxDiffPixels: 1200,
    });
  });
});

test.describe('Breakpoint Transition Tests', () => {
  test('layout changes between mobile and tablet', async ({ page }) => {
    // Start at mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/dashboard');
    await waitForVisualStability(page);

    const mobileScreenshot = await page.screenshot({ fullPage: true });

    // Transition to tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await waitForVisualStability(page);

    const tabletScreenshot = await page.screenshot({ fullPage: true });

    // Screenshots should be different (layout changed)
    expect(mobileScreenshot).not.toEqual(tabletScreenshot);

    // But specific elements should still be visible
    await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible();
  });

  test('layout changes between tablet and desktop', async ({ page }) => {
    // Start at tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto('/dashboard');
    await waitForVisualStability(page);

    const tabletScreenshot = await page.screenshot({ fullPage: true });

    // Transition to desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await waitForVisualStability(page);

    const desktopScreenshot = await page.screenshot({ fullPage: true });

    // Verify layout adaptation
    expect(tabletScreenshot).not.toEqual(desktopScreenshot);
  });
});

test.describe('Orientation Tests', () => {
  test('portrait orientation', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad portrait
    await page.goto('/dashboard');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    await expect(page).toHaveScreenshot('orientation-portrait.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });

  test('landscape orientation', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 }); // iPad landscape
    await page.goto('/dashboard');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    await expect(page).toHaveScreenshot('orientation-landscape.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });
});

test.describe('Content Overflow Tests', () => {
  test('long text truncation on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/pets');
    await waitForVisualStability(page);

    // Check table cells for text overflow handling
    const tableCell = page.locator('td, [role="cell"]').first();

    if (await tableCell.isVisible()) {
      await expect(tableCell).toHaveScreenshot('mobile-text-truncation.png');
    }
  });

  test('button wrapping on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 }); // iPhone SE
    await page.goto('/dashboard');
    await waitForVisualStability(page);

    // Look for button groups
    const buttonGroup = page.locator('.button-group, [class*="flex"][class*="gap"]').first();

    if (await buttonGroup.isVisible()) {
      await expect(buttonGroup).toHaveScreenshot('narrow-button-group.png');
    }
  });
});
