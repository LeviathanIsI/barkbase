/**
 * Page Visual Regression Tests
 * Tests visual appearance of full pages
 */

import { test, expect } from '@playwright/test';
import {
  waitForVisualStability,
  hideDynamicContent,
  VIEWPORTS,
} from '../../utils/visual-test-helpers.js';

test.describe('Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
  });

  test.describe('Authentication Pages', () => {
    test('login page appearance', async ({ page }) => {
      await page.goto('/login');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('page-login.png', {
        fullPage: true,
        maxDiffPixels: 500,
      });
    });

    test('signup page appearance', async ({ page }) => {
      await page.goto('/signup');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('page-signup.png', {
        fullPage: true,
        maxDiffPixels: 500,
      });
    });

    test('forgot password page', async ({ page }) => {
      await page.goto('/forgot-password');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('page-forgot-password.png', {
        fullPage: true,
        maxDiffPixels: 500,
      });
    });
  });

  test.describe('Dashboard', () => {
    test('dashboard overview', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-dashboard.png', {
        fullPage: true,
        maxDiffPixels: 1000,
        mask: [
          page.locator('.timestamp'),
          page.locator('[data-testid*="date"]'),
        ],
      });
    });

    test('command center view', async ({ page }) => {
      await page.goto('/command-center');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-command-center.png', {
        fullPage: true,
        maxDiffPixels: 1000,
      });
    });
  });

  test.describe('Entity Management Pages', () => {
    test('pets list page', async ({ page }) => {
      await page.goto('/pets');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-pets-list.png', {
        fullPage: true,
        maxDiffPixels: 1000,
      });
    });

    test('pet detail page', async ({ page }) => {
      // Navigate to first pet detail
      await page.goto('/pets');
      await waitForVisualStability(page);

      const firstPetLink = page.locator('a[href*="/pets/"]').first();
      if (await firstPetLink.isVisible()) {
        await firstPetLink.click();
        await waitForVisualStability(page);
        await hideDynamicContent(page);

        await expect(page).toHaveScreenshot('page-pet-detail.png', {
          fullPage: true,
          maxDiffPixels: 1000,
        });
      }
    });

    test('owners list page', async ({ page }) => {
      await page.goto('/owners');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-owners-list.png', {
        fullPage: true,
        maxDiffPixels: 1000,
      });
    });

    test('owner detail page', async ({ page }) => {
      await page.goto('/owners');
      await waitForVisualStability(page);

      const firstOwnerLink = page.locator('a[href*="/owners/"]').first();
      if (await firstOwnerLink.isVisible()) {
        await firstOwnerLink.click();
        await waitForVisualStability(page);
        await hideDynamicContent(page);

        await expect(page).toHaveScreenshot('page-owner-detail.png', {
          fullPage: true,
          maxDiffPixels: 1000,
        });
      }
    });
  });

  test.describe('Booking Pages', () => {
    test('bookings list page', async ({ page }) => {
      await page.goto('/bookings');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-bookings-list.png', {
        fullPage: true,
        maxDiffPixels: 1000,
      });
    });

    test('calendar view', async ({ page }) => {
      await page.goto('/calendar');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-calendar.png', {
        fullPage: true,
        maxDiffPixels: 1500,
      });
    });

    test('booking detail page', async ({ page }) => {
      await page.goto('/bookings');
      await waitForVisualStability(page);

      const firstBookingLink = page.locator('a[href*="/bookings/"]').first();
      if (await firstBookingLink.isVisible()) {
        await firstBookingLink.click();
        await waitForVisualStability(page);
        await hideDynamicContent(page);

        await expect(page).toHaveScreenshot('page-booking-detail.png', {
          fullPage: true,
          maxDiffPixels: 1000,
        });
      }
    });
  });

  test.describe('Operations Pages', () => {
    test('kennels page', async ({ page }) => {
      await page.goto('/kennels');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-kennels.png', {
        fullPage: true,
        maxDiffPixels: 1000,
      });
    });

    test('tasks page', async ({ page }) => {
      await page.goto('/tasks');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-tasks.png', {
        fullPage: true,
        maxDiffPixels: 1000,
      });
    });
  });

  test.describe('Settings Pages', () => {
    test('settings overview', async ({ page }) => {
      await page.goto('/settings');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('page-settings.png', {
        fullPage: true,
        maxDiffPixels: 800,
      });
    });

    test('profile settings', async ({ page }) => {
      await page.goto('/settings/profile');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('page-settings-profile.png', {
        fullPage: true,
        maxDiffPixels: 800,
      });
    });

    test('security settings', async ({ page }) => {
      await page.goto('/settings/security');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('page-settings-security.png', {
        fullPage: true,
        maxDiffPixels: 800,
      });
    });

    test('notifications settings', async ({ page }) => {
      await page.goto('/settings/notifications');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('page-settings-notifications.png', {
        fullPage: true,
        maxDiffPixels: 800,
      });
    });
  });

  test.describe('Financial Pages', () => {
    test('payments page', async ({ page }) => {
      await page.goto('/payments');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-payments.png', {
        fullPage: true,
        maxDiffPixels: 1000,
      });
    });

    test('invoices page', async ({ page }) => {
      await page.goto('/invoices');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('page-invoices.png', {
        fullPage: true,
        maxDiffPixels: 1000,
      });
    });
  });

  test.describe('Error Pages', () => {
    test('404 page appearance', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('page-404.png', {
        fullPage: true,
        maxDiffPixels: 300,
      });
    });
  });
});

test.describe('Page Interaction States', () => {
  test('sidebar collapsed state', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForVisualStability(page);

    // Look for sidebar toggle
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"], button[aria-label*="sidebar"]').first();

    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
      await page.waitForTimeout(300); // Wait for animation

      await expect(page).toHaveScreenshot('page-sidebar-collapsed.png', {
        fullPage: false,
        maxDiffPixels: 500,
      });
    }
  });

  test('modal open state', async ({ page }) => {
    await page.goto('/pets');
    await waitForVisualStability(page);

    // Try to open add pet modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(300);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        await expect(page).toHaveScreenshot('page-with-modal.png', {
          fullPage: false,
          maxDiffPixels: 1000,
        });
      }
    }
  });

  test('dropdown menu open', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForVisualStability(page);

    // Find and click a dropdown trigger
    const dropdownTrigger = page.locator('[data-testid="user-menu"], [aria-haspopup="menu"]').first();

    if (await dropdownTrigger.isVisible()) {
      await dropdownTrigger.click();
      await page.waitForTimeout(200);

      await expect(page).toHaveScreenshot('page-dropdown-open.png', {
        fullPage: false,
        maxDiffPixels: 500,
      });
    }
  });
});
