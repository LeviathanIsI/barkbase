/**
 * Component Visual Regression Tests
 * Tests visual appearance of core UI components
 */

import { test, expect } from '@playwright/test';
import {
  waitForVisualStability,
  hideDynamicContent,
  setTheme,
  VIEWPORTS,
} from '../../utils/visual-test-helpers.js';

test.describe('Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for component tests
    await page.setViewportSize(VIEWPORTS.desktop);
  });

  test.describe('Button Components', () => {
    test('primary button states', async ({ page }) => {
      await page.goto('/');
      await waitForVisualStability(page);

      // Find primary buttons and capture their appearance
      const primaryButton = page.locator('button.bg-primary, [data-variant="primary"]').first();

      if (await primaryButton.isVisible()) {
        await expect(primaryButton).toHaveScreenshot('button-primary-default.png');

        // Hover state
        await primaryButton.hover();
        await expect(primaryButton).toHaveScreenshot('button-primary-hover.png');
      }
    });

    test('secondary button states', async ({ page }) => {
      await page.goto('/');
      await waitForVisualStability(page);

      const secondaryButton = page.locator('button.bg-secondary, [data-variant="secondary"]').first();

      if (await secondaryButton.isVisible()) {
        await expect(secondaryButton).toHaveScreenshot('button-secondary-default.png');
      }
    });

    test('disabled button appearance', async ({ page }) => {
      await page.goto('/');
      await waitForVisualStability(page);

      const disabledButton = page.locator('button[disabled]').first();

      if (await disabledButton.isVisible()) {
        await expect(disabledButton).toHaveScreenshot('button-disabled.png');
      }
    });
  });

  test.describe('Form Components', () => {
    test('input field states', async ({ page }) => {
      // Navigate to a page with forms (login page is publicly accessible)
      await page.goto('/login');
      await waitForVisualStability(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();

      if (await emailInput.isVisible()) {
        // Default state
        await expect(emailInput).toHaveScreenshot('input-default.png');

        // Focused state
        await emailInput.focus();
        await expect(emailInput).toHaveScreenshot('input-focused.png');

        // Filled state
        await emailInput.fill('test@example.com');
        await expect(emailInput).toHaveScreenshot('input-filled.png');
      }
    });

    test('password field with toggle', async ({ page }) => {
      await page.goto('/login');
      await waitForVisualStability(page);

      const passwordField = page.locator('input[type="password"]').first();

      if (await passwordField.isVisible()) {
        await passwordField.fill('testpassword');
        await expect(passwordField).toHaveScreenshot('password-field-hidden.png');
      }
    });

    test('checkbox and radio states', async ({ page }) => {
      await page.goto('/settings');
      await waitForVisualStability(page);

      const checkbox = page.locator('input[type="checkbox"]').first();

      if (await checkbox.isVisible()) {
        // Unchecked
        await expect(checkbox).toHaveScreenshot('checkbox-unchecked.png');

        // Checked
        await checkbox.check();
        await expect(checkbox).toHaveScreenshot('checkbox-checked.png');
      }
    });
  });

  test.describe('Card Components', () => {
    test('section card appearance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      const card = page.locator('[class*="card"], [class*="Card"], .bg-surface').first();

      if (await card.isVisible()) {
        await expect(card).toHaveScreenshot('section-card.png', {
          maxDiffPixels: 200,
        });
      }
    });

    test('stats card appearance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      const statsCard = page.locator('[data-testid="stats-card"], .stats-card').first();

      if (await statsCard.isVisible()) {
        await expect(statsCard).toHaveScreenshot('stats-card.png', {
          maxDiffPixels: 200,
        });
      }
    });
  });

  test.describe('Navigation Components', () => {
    test('sidebar navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      const sidebar = page.locator('nav, [role="navigation"], .sidebar, aside').first();

      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot('sidebar-navigation.png', {
          maxDiffPixels: 300,
        });
      }
    });

    test('header/top bar', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      const header = page.locator('header, [role="banner"]').first();

      if (await header.isVisible()) {
        await expect(header).toHaveScreenshot('header-bar.png', {
          maxDiffPixels: 200,
        });
      }
    });

    test('breadcrumb navigation', async ({ page }) => {
      await page.goto('/pets');
      await waitForVisualStability(page);

      const breadcrumb = page.locator('nav[aria-label*="breadcrumb"], .breadcrumb, [class*="Breadcrumb"]').first();

      if (await breadcrumb.isVisible()) {
        await expect(breadcrumb).toHaveScreenshot('breadcrumb.png');
      }
    });
  });

  test.describe('Table Components', () => {
    test('data table appearance', async ({ page }) => {
      await page.goto('/pets');
      await waitForVisualStability(page);
      await hideDynamicContent(page);

      const table = page.locator('table, [role="table"], [class*="DataTable"]').first();

      if (await table.isVisible()) {
        await expect(table).toHaveScreenshot('data-table.png', {
          maxDiffPixels: 500,
        });
      }
    });

    test('table header with sorting', async ({ page }) => {
      await page.goto('/pets');
      await waitForVisualStability(page);

      const tableHeader = page.locator('thead, [role="rowgroup"]').first();

      if (await tableHeader.isVisible()) {
        await expect(tableHeader).toHaveScreenshot('table-header.png', {
          maxDiffPixels: 200,
        });
      }
    });

    test('empty table state', async ({ page }) => {
      // Navigate to a potentially empty table
      await page.goto('/bookings?status=cancelled');
      await waitForVisualStability(page);

      const emptyState = page.locator('[class*="empty"], [data-testid="empty-state"]').first();

      if (await emptyState.isVisible()) {
        await expect(emptyState).toHaveScreenshot('table-empty-state.png');
      }
    });
  });

  test.describe('Modal/Dialog Components', () => {
    test('confirmation dialog', async ({ page }) => {
      await page.goto('/pets');
      await waitForVisualStability(page);

      // Try to trigger a delete confirmation
      const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete"]').first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const dialog = page.locator('[role="dialog"], [role="alertdialog"], .modal');

        if (await dialog.isVisible()) {
          await expect(dialog).toHaveScreenshot('confirmation-dialog.png');

          // Close the dialog
          const cancelButton = dialog.locator('button:has-text("Cancel")');
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    });
  });

  test.describe('Alert/Toast Components', () => {
    test('alert banner appearance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      const alert = page.locator('[role="alert"], .alert, [class*="Alert"]').first();

      if (await alert.isVisible()) {
        await expect(alert).toHaveScreenshot('alert-banner.png');
      }
    });
  });

  test.describe('Loading States', () => {
    test('skeleton loader appearance', async ({ page }) => {
      // Intercept API calls to force loading state
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.continue();
      });

      await page.goto('/dashboard');

      const skeleton = page.locator('[class*="skeleton"], [class*="Skeleton"], .animate-pulse').first();

      if (await skeleton.isVisible()) {
        await expect(skeleton).toHaveScreenshot('skeleton-loader.png');
      }
    });
  });
});

test.describe('Theme Visual Tests', () => {
  test('light theme appearance', async ({ page }) => {
    await setTheme(page, 'light');
    await page.goto('/dashboard');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    await expect(page).toHaveScreenshot('dashboard-light-theme.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });

  test('dark theme appearance', async ({ page }) => {
    await setTheme(page, 'dark');
    await page.goto('/dashboard');
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    await expect(page).toHaveScreenshot('dashboard-dark-theme.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });
});
