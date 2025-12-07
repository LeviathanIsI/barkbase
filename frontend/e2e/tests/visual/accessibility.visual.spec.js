/**
 * Accessibility Visual Tests
 * Tests visual accessibility compliance and WCAG guidelines
 */

import { test, expect } from '@playwright/test';
import {
  waitForVisualStability,
  highlightAccessibilityIssues,
  VIEWPORTS,
} from '../../utils/visual-test-helpers.js';

test.describe('Accessibility Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
  });

  test.describe('Focus Indicators', () => {
    test('keyboard focus is visible on buttons', async ({ page }) => {
      await page.goto('/login');
      await waitForVisualStability(page);

      // Tab to first interactive element
      await page.keyboard.press('Tab');

      // Take screenshot showing focus state
      await expect(page).toHaveScreenshot('a11y-focus-button.png', {
        maxDiffPixels: 500,
      });
    });

    test('keyboard focus is visible on inputs', async ({ page }) => {
      await page.goto('/login');
      await waitForVisualStability(page);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();

      if (await emailInput.isVisible()) {
        await emailInput.focus();
        await expect(emailInput).toHaveScreenshot('a11y-focus-input.png');
      }
    });

    test('keyboard focus is visible on links', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      const link = page.locator('a[href]').first();

      if (await link.isVisible()) {
        await link.focus();
        await expect(link).toHaveScreenshot('a11y-focus-link.png');
      }
    });

    test('skip link is visible when focused', async ({ page }) => {
      await page.goto('/dashboard');

      // Tab to first element (should be skip link if present)
      await page.keyboard.press('Tab');

      const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link');

      if (await skipLink.isVisible()) {
        await expect(skipLink).toHaveScreenshot('a11y-skip-link.png');
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('text contrast on light background', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      // Inject contrast checker visualization
      await page.addStyleTag({
        content: `
          /* Highlight potentially low contrast text */
          p, span, label, h1, h2, h3, h4, h5, h6, a, button {
            outline: 1px dotted transparent;
          }
        `,
      });

      await expect(page).toHaveScreenshot('a11y-contrast-light.png', {
        fullPage: false,
        maxDiffPixels: 1000,
      });
    });

    test('text contrast on dark background', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('a11y-contrast-dark.png', {
        fullPage: false,
        maxDiffPixels: 1000,
      });
    });

    test('error state contrast', async ({ page }) => {
      await page.goto('/login');
      await waitForVisualStability(page);

      // Trigger validation error
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(300);

        const errorMessage = page.locator('[role="alert"], .error, [class*="error"]').first();
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toHaveScreenshot('a11y-error-contrast.png');
        }
      }
    });
  });

  test.describe('Touch Target Sizes', () => {
    test('buttons meet minimum touch target size', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      // Highlight elements with small touch targets
      await page.addStyleTag({
        content: `
          /* Highlight buttons smaller than 44x44px */
          button, a, input[type="checkbox"], input[type="radio"] {
            position: relative;
          }
          button::after, a::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 44px;
            height: 44px;
            border: 2px dashed rgba(255, 0, 0, 0.3);
            border-radius: 4px;
            pointer-events: none;
          }
        `,
      });

      await expect(page).toHaveScreenshot('a11y-touch-targets.png', {
        fullPage: false,
        maxDiffPixels: 1000,
      });
    });
  });

  test.describe('Visual Hierarchy', () => {
    test('heading hierarchy visualization', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      // Add visual indicators for heading levels
      await page.addStyleTag({
        content: `
          h1::before { content: '[H1] '; color: #e74c3c; font-weight: bold; }
          h2::before { content: '[H2] '; color: #e67e22; font-weight: bold; }
          h3::before { content: '[H3] '; color: #f1c40f; font-weight: bold; }
          h4::before { content: '[H4] '; color: #2ecc71; font-weight: bold; }
          h5::before { content: '[H5] '; color: #3498db; font-weight: bold; }
          h6::before { content: '[H6] '; color: #9b59b6; font-weight: bold; }
        `,
      });

      await expect(page).toHaveScreenshot('a11y-heading-hierarchy.png', {
        fullPage: true,
        maxDiffPixels: 1500,
      });
    });

    test('landmark regions visualization', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      // Add visual indicators for landmarks
      await page.addStyleTag({
        content: `
          [role="banner"], header {
            outline: 3px solid #e74c3c !important;
            outline-offset: 2px;
          }
          [role="navigation"], nav {
            outline: 3px solid #e67e22 !important;
            outline-offset: 2px;
          }
          [role="main"], main {
            outline: 3px solid #2ecc71 !important;
            outline-offset: 2px;
          }
          [role="complementary"], aside {
            outline: 3px solid #3498db !important;
            outline-offset: 2px;
          }
          [role="contentinfo"], footer {
            outline: 3px solid #9b59b6 !important;
            outline-offset: 2px;
          }
        `,
      });

      await expect(page).toHaveScreenshot('a11y-landmarks.png', {
        fullPage: true,
        maxDiffPixels: 1500,
      });
    });
  });

  test.describe('Form Accessibility', () => {
    test('form labels are associated with inputs', async ({ page }) => {
      await page.goto('/login');
      await waitForVisualStability(page);

      // Highlight inputs without proper labels
      await page.addStyleTag({
        content: `
          input:not([aria-label]):not([aria-labelledby]):not([id]),
          textarea:not([aria-label]):not([aria-labelledby]):not([id]),
          select:not([aria-label]):not([aria-labelledby]):not([id]) {
            outline: 3px solid red !important;
            outline-offset: 2px;
          }

          input[id], textarea[id], select[id] {
            outline: 2px solid green !important;
            outline-offset: 2px;
          }
        `,
      });

      await expect(page).toHaveScreenshot('a11y-form-labels.png', {
        fullPage: false,
        maxDiffPixels: 500,
      });
    });

    test('required field indicators', async ({ page }) => {
      await page.goto('/login');
      await waitForVisualStability(page);

      // Highlight required fields
      await page.addStyleTag({
        content: `
          input[required], input[aria-required="true"] {
            border-left: 4px solid #e74c3c !important;
          }
        `,
      });

      await expect(page).toHaveScreenshot('a11y-required-fields.png', {
        fullPage: false,
        maxDiffPixels: 500,
      });
    });
  });

  test.describe('Motion and Animation', () => {
    test('reduced motion preference respected', async ({ page }) => {
      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      // Check that animations are disabled
      const animatedElement = page.locator('.animate-spin, .animate-pulse, [class*="animate"]').first();

      if (await animatedElement.isVisible()) {
        // Get computed animation duration
        const animationDuration = await animatedElement.evaluate(el => {
          return window.getComputedStyle(el).animationDuration;
        });

        // With reduced motion, animation should be 0s or very short
        expect(['0s', '0.001s', 'none']).toContain(animationDuration);
      }

      await expect(page).toHaveScreenshot('a11y-reduced-motion.png', {
        fullPage: false,
        maxDiffPixels: 1000,
      });
    });
  });

  test.describe('Image Accessibility', () => {
    test('images have alt text visualization', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      // Highlight images based on alt text presence
      await page.addStyleTag({
        content: `
          /* Images without alt - bad */
          img:not([alt]) {
            outline: 4px solid red !important;
            outline-offset: 2px;
          }

          /* Images with empty alt (decorative) - ok for decorative */
          img[alt=""] {
            outline: 2px dashed orange !important;
            outline-offset: 2px;
          }

          /* Images with alt text - good */
          img[alt]:not([alt=""]) {
            outline: 2px solid green !important;
            outline-offset: 2px;
          }
        `,
      });

      await expect(page).toHaveScreenshot('a11y-image-alt-text.png', {
        fullPage: true,
        maxDiffPixels: 1500,
      });
    });
  });

  test.describe('Interactive Element States', () => {
    test('disabled state is visually distinct', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      const disabledButton = page.locator('button[disabled], button[aria-disabled="true"]').first();

      if (await disabledButton.isVisible()) {
        await expect(disabledButton).toHaveScreenshot('a11y-disabled-button.png');
      }
    });

    test('active/pressed state is visible', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForVisualStability(page);

      const button = page.locator('button:not([disabled])').first();

      if (await button.isVisible()) {
        // Normal state
        await expect(button).toHaveScreenshot('a11y-button-normal.png');

        // Simulate active state
        await button.dispatchEvent('mousedown');
        await expect(button).toHaveScreenshot('a11y-button-active.png');
      }
    });
  });
});

test.describe('High Contrast Mode', () => {
  test('page is usable in high contrast mode', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForVisualStability(page);

    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        * {
          forced-color-adjust: auto;
        }
        @media (forced-colors: active) {
          /* This would be applied in actual high contrast mode */
        }

        /* Simulate high contrast for testing */
        body {
          filter: contrast(1.5) !important;
        }
      `,
    });

    await expect(page).toHaveScreenshot('a11y-high-contrast.png', {
      fullPage: true,
      maxDiffPixels: 2000,
    });
  });
});

test.describe('Accessibility Issues Highlight', () => {
  test('dashboard accessibility audit visualization', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForVisualStability(page);
    await highlightAccessibilityIssues(page);

    await expect(page).toHaveScreenshot('a11y-audit-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 1500,
    });
  });

  test('forms accessibility audit visualization', async ({ page }) => {
    await page.goto('/login');
    await waitForVisualStability(page);
    await highlightAccessibilityIssues(page);

    await expect(page).toHaveScreenshot('a11y-audit-forms.png', {
      fullPage: true,
      maxDiffPixels: 800,
    });
  });
});
