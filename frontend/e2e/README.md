# BarkBase E2E Testing Suite

Comprehensive end-to-end testing suite using Playwright for the BarkBase application.

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:e2e:install
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific browser tests
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# View test report
npm run test:e2e:report
```

## Project Structure

```
e2e/
├── tests/              # Test spec files
│   ├── auth.spec.js    # Authentication tests
│   ├── dashboard.spec.js
│   ├── pets.spec.js
│   ├── owners.spec.js
│   └── bookings.spec.js
├── pages/              # Page Object Models
│   ├── BasePage.js     # Base page with common methods
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── PetsPage.js
│   ├── OwnersPage.js
│   └── BookingsPage.js
├── fixtures/           # Test data and fixtures
│   ├── test-data.js    # Test data constants
│   └── auth.setup.js   # Auth setup fixture
├── utils/              # Helper utilities
│   ├── global-setup.js
│   ├── global-teardown.js
│   └── test-helpers.js
├── reports/            # Test reports (gitignored)
└── .auth/              # Auth state storage (gitignored)
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Application base URL | `http://localhost:5173` |
| `E2E_ADMIN_EMAIL` | Admin test user email | Set in `.env` |
| `E2E_ADMIN_PASSWORD` | Admin test user password | Set in `.env` |
| `TEST_ENV` | Test environment | `development` |

### Browser Configuration

Tests run on multiple browsers:
- **Chromium** - Default browser
- **Firefox** - Mozilla Firefox
- **WebKit** - Safari engine
- **Mobile Chrome** - Pixel 5 emulation
- **Mobile Safari** - iPhone 13 emulation
- **Tablet** - iPad Pro emulation

## Writing Tests

### Test Structure

```javascript
import { test, expect } from '@playwright/test';
import { PetsPage } from '../pages/PetsPage.js';

test.describe('Pets Management', () => {
  let petsPage;

  test.beforeEach(async ({ page }) => {
    petsPage = new PetsPage(page);
  });

  test('should load pets page', async ({ page }) => {
    await petsPage.goto();
    await expect(page.locator('h1')).toContainText('Pets');
  });
});
```

### Page Object Pattern

```javascript
import { BasePage } from './BasePage.js';

export class MyPage extends BasePage {
  constructor(page) {
    super(page);
    this.url = '/my-page';
    this.selectors = {
      ...this.selectors,
      myButton: '[data-testid="my-button"]',
    };
  }

  async clickMyButton() {
    await this.page.locator(this.selectors.myButton).click();
  }
}
```

### Test Data

```javascript
import { testPets, generateUniqueTestData } from '../fixtures/test-data.js';

// Use unique data to avoid conflicts
const petData = generateUniqueTestData(testPets.dog);
```

## Best Practices

### 1. Use Page Objects
- Keep selectors in page objects
- Create reusable methods
- Inherit from BasePage

### 2. Test Isolation
- Each test should be independent
- Use unique test data
- Clean up after tests

### 3. Stable Selectors
- Prefer `data-testid` attributes
- Use role-based selectors
- Avoid brittle CSS selectors

### 4. Wait Strategies
- Use explicit waits
- Avoid arbitrary timeouts
- Wait for network idle when needed

### 5. Error Handling
- Take screenshots on failure
- Log meaningful errors
- Use retry mechanisms

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### GitHub Actions Workflow

The workflow includes:
1. **E2E Tests** - Runs on Chromium, Firefox, WebKit
2. **Mobile Tests** - Runs on mobile emulators (main branch only)
3. **Test Summary** - Aggregates results

### Required Secrets

Set these in your GitHub repository settings:
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

## Debugging

### Interactive Mode

```bash
npm run test:e2e:ui
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### Trace Viewer

```bash
npx playwright show-trace trace.zip
```

### Screenshots

Failed tests automatically capture screenshots in `e2e/reports/screenshots/`.

## Reports

### HTML Report

```bash
npm run test:e2e:report
```

### JSON Report

Available at `e2e/reports/results.json` after test run.

## Troubleshooting

### Browser Installation Issues

```bash
npx playwright install --with-deps
```

### Auth Issues

Delete `e2e/.auth/user.json` and re-run tests.

### Timeout Issues

Increase timeouts in `playwright.config.js`:
```javascript
timeout: 60000,
expect: { timeout: 10000 },
```

### Network Issues

Check that the dev server is running or set `BASE_URL` correctly.
