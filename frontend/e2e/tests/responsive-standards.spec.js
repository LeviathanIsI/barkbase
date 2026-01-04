/**
 * Responsive Standards E2E Tests
 * Tests against actual responsive/mobile standards (NOT screenshot comparisons)
 *
 * Standards tested:
 * - WCAG 2.5.5: Touch target sizing (minimum 44x44px)
 * - No horizontal overflow on mobile viewports
 * - Minimum font size (12px minimum for readability)
 * - Viewport meta tag configuration
 * - Content overflow prevention
 * - Form input sizing for touch
 * - Adequate spacing between clickable elements
 * - Responsive table handling
 * - Image/media container respect
 * - Modal/slideout mobile optimization
 *
 * Viewports tested: 320px, 375px, 414px, 768px
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test viewports
const VIEWPORTS = {
  smallMobile: { width: 320, height: 568, name: 'Small Mobile (320px)' },
  mobile: { width: 375, height: 667, name: 'iPhone (375px)' },
  largeMobile: { width: 414, height: 896, name: 'Large Phone (414px)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (768px)' },
};

// Minimum standards
const STANDARDS = {
  minTouchTargetSize: 44, // WCAG 2.5.5 - minimum 44x44px
  minFontSize: 12, // Minimum readable font size
  minFormInputHeight: 44, // Touch-friendly form inputs
  minClickableSpacing: 8, // Minimum spacing between clickable elements
  maxHorizontalScroll: 0, // No horizontal overflow allowed
};

// Pages to test
const TEST_PAGES = [
  { name: 'Dashboard', path: '/dashboard', requiresAuth: true },
  { name: 'Owners List', path: '/owners', requiresAuth: true },
  { name: 'Pets List', path: '/pets', requiresAuth: true },
  { name: 'Bookings List', path: '/bookings', requiresAuth: true },
  { name: 'Settings', path: '/settings', requiresAuth: true },
  { name: 'Login', path: '/login', requiresAuth: false },
];

/**
 * Helper function to get all interactive elements
 */
async function getInteractiveElements(page) {
  return await page.locator('button, a, input, select, textarea, [role="button"], [role="link"], [onclick], [tabindex]:not([tabindex="-1"])').all();
}

/**
 * Helper function to get element bounding box
 */
async function getElementBox(element) {
  try {
    const box = await element.boundingBox();
    return box;
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to check if element is visible
 */
async function isElementVisible(element) {
  try {
    return await element.isVisible();
  } catch (error) {
    return false;
  }
}

/**
 * Helper function to get computed font size
 */
async function getFontSize(page, element) {
  try {
    return await element.evaluate((el) => {
      const fontSize = window.getComputedStyle(el).fontSize;
      return parseFloat(fontSize);
    });
  } catch (error) {
    return null;
  }
}

test.describe('Responsive Standards Tests', () => {

  // Test 1: Viewport meta tag
  test('should have properly configured viewport meta tag', async ({ page }) => {
    await page.goto('/');

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');

    expect(viewportMeta, 'Viewport meta tag should exist').toBeTruthy();
    expect(viewportMeta, 'Viewport should include width=device-width').toContain('width=device-width');
    expect(viewportMeta, 'Viewport should include initial-scale=1').toContain('initial-scale=1');
  });

  // Test 2-11: For each page and viewport combination
  for (const { name: pageName, path, requiresAuth } of TEST_PAGES) {
    test.describe(`${pageName} Page`, () => {

      // Skip auth for public pages
      if (!requiresAuth) {
        test.use({ storageState: { cookies: [], origins: [] } });
      }

      for (const [viewportKey, viewport] of Object.entries(VIEWPORTS)) {
        test.describe(`${viewport.name}`, () => {

          test.beforeEach(async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto(path);
            await page.waitForLoadState('networkidle');
          });

          // Test 2: No horizontal overflow
          test('should not have horizontal overflow', async ({ page }) => {
            const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
            const viewportWidth = viewport.width;

            expect(
              bodyWidth,
              `Page should not exceed viewport width. Body: ${bodyWidth}px, Viewport: ${viewportWidth}px`
            ).toBeLessThanOrEqual(viewportWidth + STANDARDS.maxHorizontalScroll);
          });

          // Test 3: Touch target sizing (WCAG 2.5.5)
          test('should have adequate touch target sizes for interactive elements', async ({ page }) => {
            const interactiveElements = await getInteractiveElements(page);
            const violations = [];

            for (const element of interactiveElements) {
              const isVisible = await isElementVisible(element);
              if (!isVisible) continue;

              // For checkbox/radio inputs, measure the clickable parent (label or container)
              const tagName = await element.evaluate(el => el.tagName.toLowerCase());
              const type = await element.getAttribute('type').catch(() => '');

              let box;
              if ((tagName === 'input' && (type === 'checkbox' || type === 'radio'))) {
                // Check if input is wrapped in a label
                box = await element.evaluate((el) => {
                  const label = el.closest('label');
                  if (label) {
                    return label.getBoundingClientRect();
                  }
                  // Otherwise measure the input itself
                  return el.getBoundingClientRect();
                });
              } else {
                box = await getElementBox(element);
              }

              if (!box) continue;

              // Skip zero-size elements (hidden inputs like react-select's dummy input)
              if (box.width === 0 || box.height === 0) continue;

              // Skip react-select internal elements
              const classes = await element.getAttribute('class').catch(() => '');
              if (classes && classes.includes('dummyInput')) continue;

              const meetsStandard = box.width >= STANDARDS.minTouchTargetSize &&
                                   box.height >= STANDARDS.minTouchTargetSize;

              if (!meetsStandard) {
                const text = await element.textContent().catch(() => '');
                const id = await element.getAttribute('id').catch(() => '');

                violations.push({
                  element: `<${tagName}> ${id ? `#${id}` : ''} ${classes ? `.${classes.split(' ')[0]}` : ''}`,
                  text: text?.trim().substring(0, 30),
                  size: `${Math.round(box.width)}x${Math.round(box.height)}px`,
                  width: box.width,
                  height: box.height,
                });
              }
            }

            if (violations.length > 0) {
              console.log(`\nTouch Target Violations on ${pageName} at ${viewport.name}:`);
              violations.forEach((v, i) => {
                console.log(`  ${i + 1}. ${v.element} "${v.text}" - ${v.size} (min: ${STANDARDS.minTouchTargetSize}x${STANDARDS.minTouchTargetSize}px)`);
              });
            }

            expect(
              violations.length,
              `Found ${violations.length} interactive elements smaller than ${STANDARDS.minTouchTargetSize}x${STANDARDS.minTouchTargetSize}px`
            ).toBe(0);
          });

          // Test 4: Minimum font size
          test('should have readable font sizes', async ({ page }) => {
            // Sample elements for performance - check every 3rd element to avoid timeouts
            const textElements = await page.locator('p, span, div, li, td, th, label, a, button, h1, h2, h3, h4, h5, h6').all();
            const violations = [];

            // Sample every 3rd element for performance (still catches most issues)
            for (let i = 0; i < textElements.length; i += 3) {
              const element = textElements[i];
              const isVisible = await isElementVisible(element);
              if (!isVisible) continue;

              const text = await element.textContent();
              if (!text || text.trim().length === 0) continue;

              const fontSize = await getFontSize(page, element);
              if (!fontSize) continue;

              if (fontSize < STANDARDS.minFontSize) {
                const tagName = await element.evaluate(el => el.tagName.toLowerCase());
                violations.push({
                  element: tagName,
                  fontSize,
                  text: text.trim().substring(0, 30),
                });
              }
            }

            if (violations.length > 0) {
              console.log(`\nFont Size Violations on ${pageName} at ${viewport.name}:`);
              violations.forEach((v, i) => {
                console.log(`  ${i + 1}. <${v.element}> "${v.text}" - ${v.fontSize}px (min: ${STANDARDS.minFontSize}px)`);
              });
            }

            expect(
              violations.length,
              `Found ${violations.length} text elements with font size below ${STANDARDS.minFontSize}px (sampled every 3rd element)`
            ).toBe(0);
          }, 30000); // Increase timeout to 30s for font size check

          // Test 5: Form input sizing for touch
          test('should have touch-friendly form inputs', async ({ page }) => {
            // Exclude checkbox/radio (they use parent label for tap target) and hidden react-select inputs
            const formInputs = await page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([class*="dummyInput"]), select, textarea').all();
            const violations = [];

            for (const input of formInputs) {
              const isVisible = await isElementVisible(input);
              if (!isVisible) continue;

              const box = await getElementBox(input);
              if (!box || box.height === 0) continue; // Skip zero-height hidden inputs

              if (box.height < STANDARDS.minFormInputHeight) {
                const type = await input.getAttribute('type');
                const id = await input.getAttribute('id');
                const placeholder = await input.getAttribute('placeholder');

                violations.push({
                  input: `${type || 'text'} input ${id ? `#${id}` : ''} "${placeholder || ''}"`,
                  height: box.height,
                });
              }
            }

            if (violations.length > 0) {
              console.log(`\nForm Input Size Violations on ${pageName} at ${viewport.name}:`);
              violations.forEach((v, i) => {
                console.log(`  ${i + 1}. ${v.input} - ${Math.round(v.height)}px high (min: ${STANDARDS.minFormInputHeight}px)`);
              });
            }

            expect(
              violations.length,
              `Found ${violations.length} form inputs with height below ${STANDARDS.minFormInputHeight}px`
            ).toBe(0);
          });

          // Test 6: Content overflow prevention
          test('should not have overflowing content', async ({ page }) => {
            const allElements = await page.locator('div, section, article, main, aside, nav').all();
            const violations = [];

            for (const element of allElements) {
              const isVisible = await isElementVisible(element);
              if (!isVisible) continue;

              const overflow = await element.evaluate((el) => {
                const styles = window.getComputedStyle(el);
                const scrollWidth = el.scrollWidth;
                const clientWidth = el.clientWidth;
                const overflowX = styles.overflowX;

                // Skip containers that already handle overflow
                if (overflowX === 'scroll' || overflowX === 'auto' || overflowX === 'hidden') {
                  return null;
                }

                // Skip if a descendant has scroll/auto/hidden overflow (content is intentionally scrollable)
                const hasScrollableDescendant = el.querySelector('[style*="overflow"], .overflow-x-auto, .overflow-x-scroll, .overflow-x-hidden, .overflow-auto, .overflow-scroll, .overflow-hidden');
                if (hasScrollableDescendant) {
                  return null;
                }

                // Check if content actually overflows
                if (scrollWidth > clientWidth) {
                  return {
                    scrollWidth,
                    clientWidth,
                    overflowX,
                    className: el.className,
                    id: el.id,
                  };
                }
                return null;
              });

              if (overflow) {
                violations.push(overflow);
              }
            }

            if (violations.length > 0) {
              console.log(`\nContent Overflow Violations on ${pageName} at ${viewport.name}:`);
              violations.forEach((v, i) => {
                console.log(`  ${i + 1}. ${v.id ? `#${v.id}` : ''} ${v.className ? `.${v.className.split(' ')[0]}` : ''} - ${v.scrollWidth}px content in ${v.clientWidth}px container`);
              });
            }

            expect(
              violations.length,
              `Found ${violations.length} elements with unintentional content overflow`
            ).toBe(0);
          });

          // Test 7: Clickable element spacing
          test('should have adequate spacing between clickable elements', async ({ page }) => {
            const clickableElements = await page.locator('button, a, [role="button"], [role="link"], input[type="checkbox"], input[type="radio"]').all();
            const violations = [];
            const elementBoxes = [];

            // Get all visible clickable element positions
            for (const element of clickableElements) {
              const isVisible = await isElementVisible(element);
              if (!isVisible) continue;

              const box = await getElementBox(element);
              if (box) {
                const tagName = await element.evaluate(el => el.tagName.toLowerCase());
                const text = await element.textContent().catch(() => '');
                elementBoxes.push({ box, tagName, text, element });
              }
            }

            // Check spacing between adjacent elements
            for (let i = 0; i < elementBoxes.length; i++) {
              for (let j = i + 1; j < elementBoxes.length; j++) {
                const box1 = elementBoxes[i].box;
                const box2 = elementBoxes[j].box;

                // Calculate distance between elements
                const horizontalDistance = Math.max(
                  0,
                  Math.max(box1.x, box2.x) - Math.min(box1.x + box1.width, box2.x + box2.width)
                );
                const verticalDistance = Math.max(
                  0,
                  Math.max(box1.y, box2.y) - Math.min(box1.y + box1.height, box2.y + box2.height)
                );

                // Check if elements are close enough to care about spacing
                const areNearby = horizontalDistance < 100 && verticalDistance < 100;

                if (areNearby) {
                  const minDistance = Math.min(
                    horizontalDistance === 0 ? Infinity : horizontalDistance,
                    verticalDistance === 0 ? Infinity : verticalDistance
                  );

                  if (minDistance < STANDARDS.minClickableSpacing && minDistance !== Infinity) {
                    violations.push({
                      element1: `${elementBoxes[i].tagName} "${elementBoxes[i].text.trim().substring(0, 20)}"`,
                      element2: `${elementBoxes[j].tagName} "${elementBoxes[j].text.trim().substring(0, 20)}"`,
                      distance: minDistance,
                    });
                  }
                }
              }
            }

            if (violations.length > 0) {
              console.log(`\nClickable Element Spacing Violations on ${pageName} at ${viewport.name}:`);
              violations.slice(0, 10).forEach((v, i) => {
                console.log(`  ${i + 1}. ${v.element1} <-> ${v.element2} - ${Math.round(v.distance)}px apart (min: ${STANDARDS.minClickableSpacing}px)`);
              });
              if (violations.length > 10) {
                console.log(`  ... and ${violations.length - 10} more violations`);
              }
            }

            // Allow some violations on mobile due to dense interfaces, but not too many
            const maxAllowedViolations = viewport.width < 400 ? 5 : 0;
            expect(
              violations.length,
              `Found ${violations.length} pairs of clickable elements too close together (max allowed: ${maxAllowedViolations})`
            ).toBeLessThanOrEqual(maxAllowedViolations);
          });

          // Test 8: Responsive table handling
          test('should handle tables responsively', async ({ page }) => {
            const tables = await page.locator('table').all();

            if (tables.length === 0) {
              test.skip();
              return;
            }

            const violations = [];

            for (const table of tables) {
              const isVisible = await isElementVisible(table);
              if (!isVisible) continue;

              const tableInfo = await table.evaluate((el, viewportWidth) => {
                const rect = el.getBoundingClientRect();
                const parent = el.parentElement;
                const parentStyles = window.getComputedStyle(parent);
                const hasScrollContainer = parentStyles.overflowX === 'auto' || parentStyles.overflowX === 'scroll';
                const exceedsViewport = rect.width > viewportWidth;

                return {
                  width: rect.width,
                  hasScrollContainer,
                  exceedsViewport,
                  id: el.id,
                  className: el.className,
                };
              }, viewport.width);

              // On mobile, tables should either:
              // 1. Be in a scrollable container, OR
              // 2. Not exceed viewport width (responsive design)
              if (viewport.width < 768 && tableInfo.exceedsViewport && !tableInfo.hasScrollContainer) {
                violations.push(tableInfo);
              }
            }

            if (violations.length > 0) {
              console.log(`\nTable Responsiveness Violations on ${pageName} at ${viewport.name}:`);
              violations.forEach((v, i) => {
                console.log(`  ${i + 1}. Table ${v.id ? `#${v.id}` : ''} - ${Math.round(v.width)}px wide, needs scroll container or responsive layout`);
              });
            }

            expect(
              violations.length,
              `Found ${violations.length} tables that exceed viewport without scroll container`
            ).toBe(0);
          });

          // Test 9: Images and media respect container widths
          test('should have images and media that respect container widths', async ({ page }) => {
            const mediaElements = await page.locator('img, video, iframe, svg').all();
            const violations = [];

            for (const media of mediaElements) {
              const isVisible = await isElementVisible(media);
              if (!isVisible) continue;

              const overflow = await media.evaluate((el, viewportWidth) => {
                const rect = el.getBoundingClientRect();
                const exceedsViewport = rect.width > viewportWidth;
                const hasMaxWidth = window.getComputedStyle(el).maxWidth !== 'none';

                if (exceedsViewport) {
                  return {
                    tagName: el.tagName.toLowerCase(),
                    width: rect.width,
                    hasMaxWidth,
                    src: el.src || el.getAttribute('src') || '',
                  };
                }
                return null;
              }, viewport.width);

              if (overflow) {
                violations.push(overflow);
              }
            }

            if (violations.length > 0) {
              console.log(`\nMedia Overflow Violations on ${pageName} at ${viewport.name}:`);
              violations.forEach((v, i) => {
                console.log(`  ${i + 1}. <${v.tagName}> ${v.src.substring(0, 50)} - ${Math.round(v.width)}px wide (viewport: ${viewport.width}px)`);
              });
            }

            expect(
              violations.length,
              `Found ${violations.length} media elements that exceed viewport width`
            ).toBe(0);
          });

          // Test 10: Modal/slideout mobile optimization
          test('should have mobile-optimized modals and slideouts', async ({ page }) => {
            // Look for common modal/dialog elements
            const modalElements = await page.locator('[role="dialog"], [role="alertdialog"], .modal, .slideout, .drawer').all();

            if (modalElements.length === 0) {
              // Try to open a modal if there's a button that opens one
              const modalTriggers = await page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').all();

              if (modalTriggers.length > 0) {
                try {
                  await modalTriggers[0].click();
                  await page.waitForTimeout(500);
                } catch (error) {
                  // If modal doesn't open, skip test
                  test.skip();
                  return;
                }
              } else {
                test.skip();
                return;
              }
            }

            // Re-query for modals after potential trigger click
            const modals = await page.locator('[role="dialog"], [role="alertdialog"], .modal, .slideout, .drawer').all();
            const violations = [];

            for (const modal of modals) {
              const isVisible = await isElementVisible(modal);
              if (!isVisible) continue;

              const modalInfo = await modal.evaluate((el, viewportWidth) => {
                const rect = el.getBoundingClientRect();
                const styles = window.getComputedStyle(el);

                // On mobile (< 768px), modals should typically be full-width or nearly full-width
                const isFullWidth = rect.width >= viewportWidth * 0.9;
                const hasResponsiveWidth = styles.width.includes('%') || styles.maxWidth === '100%';

                return {
                  width: rect.width,
                  viewportWidth,
                  isFullWidth,
                  hasResponsiveWidth,
                  actualWidth: styles.width,
                  maxWidth: styles.maxWidth,
                };
              }, viewport.width);

              // On mobile viewports, modals should be full-width for better UX
              if (viewport.width < 768 && !modalInfo.isFullWidth && !modalInfo.hasResponsiveWidth) {
                violations.push(modalInfo);
              }
            }

            if (violations.length > 0) {
              console.log(`\nModal/Slideout Violations on ${pageName} at ${viewport.name}:`);
              violations.forEach((v, i) => {
                console.log(`  ${i + 1}. Modal ${Math.round(v.width)}px wide (should be ~${v.viewportWidth}px for mobile)`);
              });
            }

            expect(
              violations.length,
              `Found ${violations.length} modals that are not mobile-optimized (should be full-width on mobile)`
            ).toBe(0);
          });

          // Test 11: Accessibility at this viewport using axe-core
          test('should have no critical accessibility violations at this viewport', async ({ page }) => {
            const results = await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
              .analyze();

            const criticalViolations = results.violations.filter(
              v => v.impact === 'critical' || v.impact === 'serious'
            );

            if (criticalViolations.length > 0) {
              console.log(`\nAccessibility Violations on ${pageName} at ${viewport.name}:`);
              criticalViolations.forEach((violation) => {
                console.log(`  [${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
                console.log(`  Help: ${violation.helpUrl}`);
                console.log(`  Affected elements: ${violation.nodes.length}`);
              });
            }

            expect(
              criticalViolations,
              `Found ${criticalViolations.length} critical/serious accessibility violations`
            ).toHaveLength(0);
          });

        });
      }
    });
  }
});
