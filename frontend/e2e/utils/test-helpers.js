/**
 * Test Helper Utilities
 * Common functions used across E2E tests
 */

import { expect } from '@playwright/test';

/**
 * Wait for API response
 * @param {Page} page - Playwright page
 * @param {string} urlPattern - URL pattern to match
 * @param {number} timeout - Timeout in ms
 */
export async function waitForApiResponse(page, urlPattern, timeout = 10000) {
  return page.waitForResponse(
    (response) => response.url().includes(urlPattern) && response.status() === 200,
    { timeout }
  );
}

/**
 * Wait for API call to complete
 * @param {Page} page - Playwright page
 * @param {string} urlPattern - URL pattern to match
 */
export async function waitForApiCall(page, urlPattern) {
  return page.waitForRequest((request) => request.url().includes(urlPattern));
}

/**
 * Intercept and mock API response
 * @param {Page} page - Playwright page
 * @param {string} urlPattern - URL pattern to match
 * @param {object} responseData - Mock response data
 */
export async function mockApiResponse(page, urlPattern, responseData, status = 200) {
  await page.route(`**/${urlPattern}`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(responseData),
    });
  });
}

/**
 * Clear all route handlers
 * @param {Page} page - Playwright page
 */
export async function clearMocks(page) {
  await page.unroute('**/*');
}

/**
 * Assert element has text
 * @param {Locator} locator - Playwright locator
 * @param {string} text - Expected text
 */
export async function assertHasText(locator, text) {
  await expect(locator).toContainText(text);
}

/**
 * Assert element is visible
 * @param {Locator} locator - Playwright locator
 */
export async function assertVisible(locator) {
  await expect(locator).toBeVisible();
}

/**
 * Assert element is hidden
 * @param {Locator} locator - Playwright locator
 */
export async function assertHidden(locator) {
  await expect(locator).toBeHidden();
}

/**
 * Assert URL contains path
 * @param {Page} page - Playwright page
 * @param {string} path - Expected path
 */
export async function assertUrlContains(page, path) {
  await expect(page).toHaveURL(new RegExp(path));
}

/**
 * Assert page title
 * @param {Page} page - Playwright page
 * @param {string|RegExp} title - Expected title
 */
export async function assertTitle(page, title) {
  await expect(page).toHaveTitle(title);
}

/**
 * Take screenshot on failure
 * @param {Page} page - Playwright page
 * @param {string} testName - Test name for filename
 */
export async function screenshotOnFailure(page, testName) {
  const sanitizedName = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  await page.screenshot({
    path: `e2e/reports/screenshots/failure-${sanitizedName}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Retry action with exponential backoff
 * @param {Function} action - Action to retry
 * @param {number} maxRetries - Maximum retries
 * @param {number} baseDelay - Base delay in ms
 */
export async function retryWithBackoff(action, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Generate random string
 * @param {number} length - String length
 */
export function randomString(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Format date for input field
 * @param {Date} date - Date object
 */
export function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days from now
 * @param {number} days - Days from today
 */
export function getDateFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateForInput(date);
}

/**
 * Wait for network idle
 * @param {Page} page - Playwright page
 * @param {number} timeout - Timeout in ms
 */
export async function waitForNetworkIdle(page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Get all console errors from page
 * @param {Page} page - Playwright page
 */
export function setupConsoleErrorCapture(page) {
  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({
        text: msg.text(),
        location: msg.location(),
      });
    }
  });

  return {
    getErrors: () => errors,
    hasErrors: () => errors.length > 0,
    clear: () => (errors.length = 0),
  };
}

/**
 * Check for accessibility violations
 * @param {Page} page - Playwright page
 */
export async function checkAccessibility(page) {
  // Basic accessibility checks
  const images = await page.locator('img').all();
  const violations = [];

  for (const img of images) {
    const alt = await img.getAttribute('alt');
    if (alt === null || alt === '') {
      violations.push({
        type: 'missing-alt',
        element: await img.innerHTML(),
      });
    }
  }

  // Check for buttons without accessible names
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const text = await button.textContent();
    const ariaLabel = await button.getAttribute('aria-label');
    const title = await button.getAttribute('title');

    if (!text?.trim() && !ariaLabel && !title) {
      violations.push({
        type: 'missing-button-label',
        element: await button.innerHTML(),
      });
    }
  }

  return violations;
}

/**
 * Measure page load performance
 * @param {Page} page - Playwright page
 */
export async function measurePerformance(page) {
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');

    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
      firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find((p) => p.name === 'first-contentful-paint')?.startTime,
    };
  });

  return metrics;
}

export default {
  waitForApiResponse,
  waitForApiCall,
  mockApiResponse,
  clearMocks,
  assertHasText,
  assertVisible,
  assertHidden,
  assertUrlContains,
  assertTitle,
  screenshotOnFailure,
  retryWithBackoff,
  randomString,
  formatDateForInput,
  getDateFromNow,
  waitForNetworkIdle,
  setupConsoleErrorCapture,
  checkAccessibility,
  measurePerformance,
};
