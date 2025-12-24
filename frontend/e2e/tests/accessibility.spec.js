/**
 * Accessibility Tests using axe-core
 * Tests key pages for WCAG compliance
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Owners', path: '/owners' },
  { name: 'Pets', path: '/pets' },
  { name: 'Bookings', path: '/bookings' },
  { name: 'Settings', path: '/settings' },
];

test.describe('Accessibility Tests', () => {
  for (const { name, path } of pages) {
    test(`${name} page should have no critical or serious accessibility violations`, async ({ page }) => {
      await page.goto(path);

      // Wait for page to be ready
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Log all violations for debugging
      if (results.violations.length > 0) {
        console.log(`\n--- ${name} Page Accessibility Results ---`);

        for (const violation of results.violations) {
          const impact = violation.impact;
          const icon = impact === 'critical' || impact === 'serious' ? '❌' : '⚠️';

          console.log(`${icon} [${impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
          console.log(`   Help: ${violation.helpUrl}`);
          console.log(`   Affected elements: ${violation.nodes.length}`);

          // Show first 3 affected elements
          violation.nodes.slice(0, 3).forEach((node, i) => {
            console.log(`   ${i + 1}. ${node.target.join(' > ')}`);
          });
        }
      }

      // Filter for critical and serious violations
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      // Fail on critical or serious violations
      expect(
        criticalViolations,
        `Found ${criticalViolations.length} critical/serious accessibility violations on ${name} page`
      ).toHaveLength(0);
    });
  }
});
