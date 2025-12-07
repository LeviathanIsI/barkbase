# Visual Regression Testing

This directory contains visual regression tests for the BarkBase frontend application using Playwright's built-in screenshot comparison.

## Quick Start

```bash
# Run all visual tests
npm run test:visual

# Update visual baselines (after intentional UI changes)
npm run test:visual:update

# Run specific test suites
npm run test:visual:components  # Component tests
npm run test:visual:pages       # Full page tests
npm run test:visual:responsive  # Responsive tests
npm run test:visual:a11y        # Accessibility tests

# View test report
npm run test:visual:report
```

## Test Structure

```
e2e/tests/visual/
├── components.visual.spec.js   # UI component visual tests
├── pages.visual.spec.js        # Full page visual tests
├── responsive.visual.spec.js   # Responsive viewport tests
├── accessibility.visual.spec.js # Accessibility visual tests
└── README.md                   # This file

e2e/visual-baselines/           # Baseline screenshots (committed to git)
e2e/utils/visual-test-helpers.js # Shared utilities
```

## Test Categories

### Component Tests (`components.visual.spec.js`)
Tests individual UI components in isolation:
- Buttons (primary, secondary, disabled states)
- Form inputs (default, focused, filled, error states)
- Cards and containers
- Navigation elements
- Tables and data displays
- Modals and dialogs
- Alerts and notifications

### Page Tests (`pages.visual.spec.js`)
Tests full page layouts:
- Authentication pages (login, signup, forgot password)
- Dashboard and command center
- Entity pages (pets, owners, bookings)
- Settings pages
- Financial pages
- Error pages (404, etc.)

### Responsive Tests (`responsive.visual.spec.js`)
Tests across multiple viewport sizes:
- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1280x720)
- Large Desktop (1920x1080)

Includes:
- Mobile navigation
- Table scrolling on small screens
- Card stacking
- Breakpoint transitions

### Accessibility Tests (`accessibility.visual.spec.js`)
Visual accessibility validation:
- Focus indicators
- Color contrast
- Touch target sizes
- Heading hierarchy
- Landmark regions
- Form labels
- Image alt text
- High contrast mode

## Configuration

Visual testing settings are in `playwright.config.js`:

```javascript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,        // Max pixel differences allowed
    maxDiffPixelRatio: 0.01,   // Max percentage difference
    threshold: 0.2,            // Pixel comparison threshold
    animations: 'disabled',    // Disable animations for stability
  },
},
snapshotDir: './e2e/visual-baselines',
```

## Workflow

### 1. Writing Visual Tests

```javascript
import { test, expect } from '@playwright/test';
import { waitForVisualStability, hideDynamicContent } from '../../utils/visual-test-helpers.js';

test('component appearance', async ({ page }) => {
  await page.goto('/page');
  await waitForVisualStability(page);
  await hideDynamicContent(page);  // Hides timestamps, etc.

  await expect(page.locator('.component')).toHaveScreenshot('component-name.png');
});
```

### 2. Creating Baselines

First run will fail and create baseline images:

```bash
npm run test:visual:update
```

### 3. Reviewing Changes

When tests fail, Playwright generates:
- `*-expected.png` - The baseline image
- `*-actual.png` - What was captured
- `*-diff.png` - Visual diff highlighting changes

### 4. Updating Baselines

After intentional UI changes:

```bash
npm run test:visual:update
git add e2e/visual-baselines/
git commit -m "Update visual baselines after UI changes"
```

## Best Practices

### 1. Stable Selectors
Use data-testid attributes for reliable element selection:
```javascript
const button = page.locator('[data-testid="submit-button"]');
```

### 2. Handle Dynamic Content
Use `hideDynamicContent()` to mask:
- Timestamps and dates
- Random avatars
- Loading spinners
- Animations

### 3. Wait for Stability
Always use `waitForVisualStability()` before screenshots:
- Waits for network idle
- Waits for fonts to load
- Waits for images to load

### 4. Appropriate Thresholds
Set `maxDiffPixels` based on element size:
- Small components: 50-100
- Cards/sections: 200-500
- Full pages: 1000-1500

### 5. Mask Volatile Elements
```javascript
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.locator('.random-content')],
});
```

## CI Integration

Visual tests run automatically on:
- Push to `main` or `develop`
- Pull requests

The workflow:
1. Runs visual tests against baselines
2. Uploads diff artifacts on failure
3. Comments on PRs with failure summary
4. Allows manual baseline updates via workflow dispatch

### Updating Baselines in CI

1. Go to Actions > Visual Regression Tests
2. Click "Run workflow"
3. Check "Update visual baselines"
4. Download and commit the new baselines

## Troubleshooting

### Flaky Tests
1. Increase `waitForVisualStability` timeout
2. Add more specific waits for dynamic content
3. Increase `maxDiffPixels` threshold

### Font Rendering Differences
Different OS may render fonts differently. Solutions:
- Run tests on consistent environment (CI)
- Use web fonts with explicit loading
- Increase threshold for text-heavy areas

### Animation Issues
Ensure animations are disabled:
```javascript
await page.addStyleTag({
  content: '*, *::before, *::after { animation: none !important; transition: none !important; }'
});
```

### Large Diff Files
If diffs are too large:
1. Check for obvious layout breaks
2. Verify dynamic content is hidden
3. Consider splitting into smaller tests
