/**
 * Visual Testing Helpers
 * Utilities for visual regression testing with Playwright
 */

/**
 * Standard viewport sizes for responsive testing
 */
export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },      // iPhone SE
  mobileLarge: { width: 428, height: 926 }, // iPhone 14 Pro Max
  tablet: { width: 768, height: 1024 },     // iPad
  tabletLarge: { width: 1024, height: 1366 }, // iPad Pro
  desktop: { width: 1280, height: 720 },    // Standard desktop
  desktopLarge: { width: 1920, height: 1080 }, // Full HD
  desktopWide: { width: 2560, height: 1440 }, // 2K
};

/**
 * Color scheme options
 */
export const COLOR_SCHEMES = {
  light: 'light',
  dark: 'dark',
};

/**
 * Wait for page to be visually stable
 * @param {import('@playwright/test').Page} page
 * @param {object} options
 */
export async function waitForVisualStability(page, options = {}) {
  const { timeout = 5000 } = options;

  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Wait for images to load
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve); // Resolve even on error
        });
      })
    );
  });

  // Small delay for any final rendering
  await page.waitForTimeout(100);
}

/**
 * Hide dynamic content that changes between test runs
 * @param {import('@playwright/test').Page} page
 */
export async function hideDynamicContent(page) {
  await page.addStyleTag({
    content: `
      /* Hide timestamps and dates */
      [data-testid*="timestamp"],
      [data-testid*="date"],
      .timestamp,
      .date-time,
      time {
        visibility: hidden !important;
      }

      /* Hide user avatars with random colors */
      .avatar-placeholder {
        background: #cccccc !important;
      }

      /* Disable animations */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }

      /* Hide loading spinners */
      .spinner,
      .loading,
      [data-loading="true"] {
        visibility: hidden !important;
      }

      /* Standardize scrollbars */
      ::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
      }
      ::-webkit-scrollbar-track {
        background: #f1f1f1 !important;
      }
      ::-webkit-scrollbar-thumb {
        background: #888 !important;
      }
    `,
  });
}

/**
 * Mask specific elements in screenshots
 * @param {import('@playwright/test').Page} page
 * @param {string[]} selectors - CSS selectors to mask
 */
export async function maskElements(page, selectors) {
  for (const selector of selectors) {
    const elements = await page.locator(selector).all();
    for (const element of elements) {
      await element.evaluate(el => {
        el.style.backgroundColor = '#808080';
        el.style.color = 'transparent';
        el.innerHTML = '';
      });
    }
  }
}

/**
 * Screenshot options for consistent visual testing
 */
export const screenshotOptions = {
  fullPage: {
    fullPage: true,
    animations: 'disabled',
  },
  viewport: {
    fullPage: false,
    animations: 'disabled',
  },
  component: {
    animations: 'disabled',
    scale: 'device',
  },
};

/**
 * Take a visual regression screenshot with standard settings
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Screenshot name
 * @param {object} options
 */
export async function takeVisualSnapshot(page, name, options = {}) {
  const {
    fullPage = false,
    mask = [],
    hideDynamic = true,
    waitForStability = true,
  } = options;

  if (waitForStability) {
    await waitForVisualStability(page);
  }

  if (hideDynamic) {
    await hideDynamicContent(page);
  }

  const screenshotOpts = {
    animations: 'disabled',
    fullPage,
    mask: mask.map(selector => page.locator(selector)),
  };

  return page.screenshot(screenshotOpts);
}

/**
 * Compare element screenshot
 * @param {import('@playwright/test').Locator} locator
 * @param {string} name - Screenshot name
 * @param {object} options
 */
export async function compareElementScreenshot(locator, name, options = {}) {
  const {
    threshold = 0.2,
    maxDiffPixels = 100,
  } = options;

  await locator.screenshot({
    animations: 'disabled',
    path: `e2e/visual-baselines/elements/${name}.png`,
  });
}

/**
 * Test helper for responsive visual testing
 * @param {import('@playwright/test').Page} page
 * @param {string} testName
 * @param {string} url
 */
export async function testResponsiveVisuals(page, testName, url) {
  const results = {};

  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await waitForVisualStability(page);
    await hideDynamicContent(page);

    results[viewportName] = await page.screenshot({
      fullPage: true,
      animations: 'disabled',
    });
  }

  return results;
}

/**
 * Accessibility visual test helper
 * Highlights accessibility issues visually
 * @param {import('@playwright/test').Page} page
 */
export async function highlightAccessibilityIssues(page) {
  await page.addStyleTag({
    content: `
      /* Highlight images without alt text */
      img:not([alt]),
      img[alt=""] {
        outline: 3px solid red !important;
        outline-offset: 2px !important;
      }

      /* Highlight form inputs without labels */
      input:not([aria-label]):not([aria-labelledby]):not([id]),
      textarea:not([aria-label]):not([aria-labelledby]):not([id]),
      select:not([aria-label]):not([aria-labelledby]):not([id]) {
        outline: 3px solid orange !important;
        outline-offset: 2px !important;
      }

      /* Highlight buttons without accessible names */
      button:not([aria-label]):empty,
      [role="button"]:not([aria-label]):empty {
        outline: 3px solid purple !important;
        outline-offset: 2px !important;
      }

      /* Highlight links without text */
      a:not([aria-label]):empty {
        outline: 3px solid blue !important;
        outline-offset: 2px !important;
      }

      /* Highlight low contrast text (simplified check) */
      [style*="color: #999"],
      [style*="color: #aaa"],
      [style*="color: #bbb"],
      [style*="color: #ccc"] {
        outline: 2px dashed yellow !important;
      }
    `,
  });
}

/**
 * Theme testing helper
 * @param {import('@playwright/test').Page} page
 * @param {'light' | 'dark'} theme
 */
export async function setTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });

  // Also set via localStorage if the app uses it
  await page.evaluate((themeName) => {
    localStorage.setItem('theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(themeName);
  }, theme);

  // Wait for theme to apply
  await page.waitForTimeout(100);
}

/**
 * Focus state testing helper
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function testFocusStates(page, selector) {
  const element = page.locator(selector);

  // Default state
  const defaultScreenshot = await element.screenshot({ animations: 'disabled' });

  // Focus state
  await element.focus();
  const focusScreenshot = await element.screenshot({ animations: 'disabled' });

  // Hover state
  await element.hover();
  const hoverScreenshot = await element.screenshot({ animations: 'disabled' });

  return {
    default: defaultScreenshot,
    focus: focusScreenshot,
    hover: hoverScreenshot,
  };
}

export default {
  VIEWPORTS,
  COLOR_SCHEMES,
  waitForVisualStability,
  hideDynamicContent,
  maskElements,
  screenshotOptions,
  takeVisualSnapshot,
  compareElementScreenshot,
  testResponsiveVisuals,
  highlightAccessibilityIssues,
  setTheme,
  testFocusStates,
};
