# Testing Documentation

## Overview

BarkBase uses a comprehensive testing strategy with multiple layers:

| Test Type | Framework | Coverage Target |
|-----------|-----------|-----------------|
| Unit Tests | Vitest | 80%+ |
| Integration Tests | Vitest + MSW | Key flows |
| E2E Tests | Playwright | Critical paths |
| Visual Regression | Chromatic (planned) | UI components |

---

## Test Infrastructure

### Setup Files

| File | Purpose |
|------|---------|
| `/frontend/src/test/setup.js` | Global test configuration |
| `/frontend/src/test/test-utils.jsx` | Custom render with providers |
| `/frontend/src/test/factories.js` | Mock data factories |
| `/frontend/src/test/mocks/handlers.js` | MSW API handlers |
| `/frontend/src/test/mocks/server.js` | MSW server configuration |

### Global Test Setup

```javascript
// frontend/src/test/setup.js

import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { server } from './mocks/server';
import { resetMockData } from './mocks/handlers';

// Extend Vitest with Testing Library matchers
expect.extend(matchers);

// MSW server lifecycle
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  server.resetHandlers();
  resetMockData();
});

afterAll(() => {
  server.close();
});
```

### Browser API Mocks

```javascript
// setup.js (continued)

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

---

## Running Tests

### Command Reference

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage report
npm test -- --coverage

# Run specific file
npm test -- src/features/payments/__tests__/PaymentForm.test.jsx

# Run tests matching pattern
npm test -- --grep "payment"

# Run with verbose output
npm test -- --reporter=verbose

# Update snapshots
npm test -- --updateSnapshot
```

### Coverage Configuration

```javascript
// vite.config.js
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
});
```

---

## Mock Data Factories

### Owner Factory

```javascript
// frontend/src/test/factories.js

import { faker } from '@faker-js/faker';

export const createMockOwner = (overrides = {}) => ({
  id: faker.string.uuid(),
  recordId: faker.string.alphanumeric(8).toUpperCase(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.phone.number('(###) ###-####'),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state({ abbreviated: true }),
  zip: faker.location.zipCode(),
  notes: faker.lorem.sentence(),
  petCount: faker.number.int({ min: 0, max: 5 }),
  totalBookings: faker.number.int({ min: 0, max: 50 }),
  totalSpent: faker.number.float({ min: 0, max: 10000, precision: 0.01 }),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});

export const createMockOwners = (count = 10, overrides = {}) =>
  Array.from({ length: count }, () => createMockOwner(overrides));
```

### Pet Factory

```javascript
export const createMockPet = (overrides = {}) => ({
  id: faker.string.uuid(),
  recordId: faker.string.alphanumeric(8).toUpperCase(),
  name: faker.animal.dog(),
  ownerId: faker.string.uuid(),
  species: faker.helpers.arrayElement(['DOG', 'CAT']),
  breed: faker.animal.dog(),
  color: faker.color.human(),
  weight: faker.number.int({ min: 5, max: 150 }),
  weightUnit: 'LBS',
  dateOfBirth: faker.date.birthdate({ min: 1, max: 15, mode: 'age' }).toISOString(),
  sex: faker.helpers.arrayElement(['MALE', 'FEMALE']),
  isNeutered: faker.datatype.boolean(),
  microchipId: faker.string.numeric(15),
  notes: faker.lorem.sentence(),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
});
```

### Booking Factory

```javascript
export const createMockBooking = (overrides = {}) => {
  const startDate = faker.date.future();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + faker.number.int({ min: 1, max: 14 }));

  return {
    id: faker.string.uuid(),
    recordId: `BK-${faker.date.recent().getFullYear()}-${faker.string.numeric(6)}`,
    status: faker.helpers.arrayElement(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']),
    ownerId: faker.string.uuid(),
    petIds: [faker.string.uuid()],
    serviceType: faker.helpers.arrayElement(['BOARDING', 'DAYCARE', 'GROOMING']),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    runId: faker.string.uuid(),
    totalAmount: faker.number.float({ min: 50, max: 1000, precision: 0.01 }),
    depositAmount: faker.number.float({ min: 0, max: 200, precision: 0.01 }),
    notes: faker.lorem.sentence(),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
};
```

### Invoice Factory

```javascript
export const createMockInvoice = (overrides = {}) => ({
  id: faker.string.uuid(),
  recordId: `INV-${faker.string.numeric(6)}`,
  status: faker.helpers.arrayElement(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID']),
  ownerId: faker.string.uuid(),
  bookingId: faker.string.uuid(),
  subtotal: faker.number.float({ min: 50, max: 1000, precision: 0.01 }),
  taxAmount: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
  totalAmount: faker.number.float({ min: 50, max: 1100, precision: 0.01 }),
  paidAmount: faker.number.float({ min: 0, max: 1100, precision: 0.01 }),
  dueDate: faker.date.future().toISOString(),
  lineItems: [
    {
      description: 'Boarding',
      quantity: faker.number.int({ min: 1, max: 14 }),
      unitPrice: faker.number.float({ min: 30, max: 100, precision: 0.01 }),
    },
  ],
  createdAt: faker.date.past().toISOString(),
  ...overrides,
});
```

### Payment Factory

```javascript
export const createMockPayment = (overrides = {}) => ({
  id: faker.string.uuid(),
  invoiceId: faker.string.uuid(),
  amount: faker.number.float({ min: 10, max: 1000, precision: 0.01 }),
  method: faker.helpers.arrayElement(['CARD', 'CASH', 'CHECK', 'ACH']),
  status: faker.helpers.arrayElement(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
  stripePaymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
  last4: faker.string.numeric(4),
  cardBrand: faker.helpers.arrayElement(['visa', 'mastercard', 'amex']),
  processedAt: faker.date.recent().toISOString(),
  createdAt: faker.date.past().toISOString(),
  ...overrides,
});
```

---

## MSW Handlers

### Server Configuration

```javascript
// frontend/src/test/mocks/server.js

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### API Handlers

```javascript
// frontend/src/test/mocks/handlers.js

import { http, HttpResponse } from 'msw';
import {
  createMockOwner,
  createMockOwners,
  createMockPet,
  createMockBooking,
  createMockInvoice,
  createMockPayment,
} from '../factories';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Mutable mock data store
let mockOwners = createMockOwners(20);
let mockPets = [];
let mockBookings = [];

export function resetMockData() {
  mockOwners = createMockOwners(20);
  mockPets = [];
  mockBookings = [];
}

export const handlers = [
  // ============ OWNERS ============
  http.get(`${API_BASE}/api/v1/entity/owners`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '25');
    const search = url.searchParams.get('search')?.toLowerCase();

    let filtered = mockOwners;
    if (search) {
      filtered = mockOwners.filter(
        (o) =>
          o.firstName.toLowerCase().includes(search) ||
          o.lastName.toLowerCase().includes(search) ||
          o.email.toLowerCase().includes(search)
      );
    }

    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return HttpResponse.json({
      owners: paged,
      total: filtered.length,
      page,
      pageSize,
    });
  }),

  http.get(`${API_BASE}/api/v1/entity/owners/:id`, ({ params }) => {
    const owner = mockOwners.find((o) => o.id === params.id);
    if (!owner) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(owner);
  }),

  http.post(`${API_BASE}/api/v1/entity/owners`, async ({ request }) => {
    const body = await request.json();
    const newOwner = createMockOwner(body);
    mockOwners.push(newOwner);
    return HttpResponse.json(newOwner, { status: 201 });
  }),

  // ============ PETS ============
  http.get(`${API_BASE}/api/v1/entity/pets`, () => {
    return HttpResponse.json({
      pets: mockPets,
      total: mockPets.length,
    });
  }),

  // ============ BOOKINGS ============
  http.get(`${API_BASE}/api/v1/operations/bookings`, () => {
    return HttpResponse.json({
      bookings: mockBookings,
      total: mockBookings.length,
    });
  }),

  http.post(`${API_BASE}/api/v1/operations/bookings`, async ({ request }) => {
    const body = await request.json();
    const newBooking = createMockBooking(body);
    mockBookings.push(newBooking);
    return HttpResponse.json(newBooking, { status: 201 });
  }),

  // ============ PAYMENTS ============
  http.post(`${API_BASE}/api/v1/financial/payments`, async ({ request }) => {
    const body = await request.json();

    // Simulate validation
    if (!body.amount || body.amount <= 0) {
      return HttpResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const payment = createMockPayment(body);
    return HttpResponse.json(payment, { status: 201 });
  }),

  // ============ AUTH ============
  http.get(`${API_BASE}/api/v1/entity/users/me`, () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'ADMIN',
      tenantId: 'test-tenant-id',
    });
  }),

  // ============ CONFIG ============
  http.get(`${API_BASE}/api/v1/config/tenant`, () => {
    return HttpResponse.json({
      id: 'test-tenant-id',
      name: 'Test Kennel',
      plan: 'PROFESSIONAL',
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        taxRate: 7.0,
      },
    });
  }),
];
```

---

## Test Categories

### Unit Tests

Unit tests verify individual components and functions in isolation.

**Example: PaymentForm Component**

```javascript
// frontend/src/features/payments/__tests__/PaymentForm.test.jsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from '../components/PaymentForm';
import { TestProviders } from '@/test/test-utils';

describe('PaymentForm', () => {
  const defaultProps = {
    invoiceId: 'invoice-123',
    amount: 100.00,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  const renderComponent = (props = {}) =>
    render(
      <TestProviders>
        <PaymentForm {...defaultProps} {...props} />
      </TestProviders>
    );

  it('renders payment amount correctly', () => {
    renderComponent();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('shows validation error for invalid amount', async () => {
    renderComponent({ amount: -50 });
    expect(screen.getByText(/invalid amount/i)).toBeInTheDocument();
  });

  it('calls onSuccess after successful payment', async () => {
    const onSuccess = vi.fn();
    renderComponent({ onSuccess });

    await userEvent.click(screen.getByRole('button', { name: /pay/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('disables submit button while processing', async () => {
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /pay/i });
    await userEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
  });
});
```

**Example: Validation Function**

```javascript
// frontend/src/lib/__tests__/validation.test.js

import { describe, it, expect } from 'vitest';
import { validateEmail, validatePaymentAmount } from '../validation';

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
    expect(validateEmail('user+tag@example.co.uk').valid).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('invalid').valid).toBe(false);
    expect(validateEmail('missing@domain').valid).toBe(false);
    expect(validateEmail('@nodomain.com').valid).toBe(false);
  });

  it('allows empty email (optional field)', () => {
    expect(validateEmail('').valid).toBe(true);
    expect(validateEmail(null).valid).toBe(true);
  });
});

describe('validatePaymentAmount', () => {
  it('accepts valid amounts', () => {
    expect(validatePaymentAmount(100).valid).toBe(true);
    expect(validatePaymentAmount(0.01).valid).toBe(true);
    expect(validatePaymentAmount(999999.99).valid).toBe(true);
  });

  it('rejects invalid amounts', () => {
    expect(validatePaymentAmount(0).valid).toBe(false);
    expect(validatePaymentAmount(-50).valid).toBe(false);
    expect(validatePaymentAmount(1000001).valid).toBe(false);
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

**Example: Booking Flow**

```javascript
// frontend/src/features/bookings/__tests__/BookingFlow.test.jsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingWizard } from '../components/BookingWizard';
import { TestProviders } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Booking Flow Integration', () => {
  it('completes full booking flow', async () => {
    const user = userEvent.setup();

    render(
      <TestProviders>
        <BookingWizard />
      </TestProviders>
    );

    // Step 1: Select owner
    await user.click(screen.getByRole('combobox', { name: /owner/i }));
    await user.click(screen.getByText('John Doe'));

    // Step 2: Select pets
    await user.click(screen.getByRole('checkbox', { name: /max/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: Select dates
    await user.click(screen.getByLabelText(/start date/i));
    // ... select dates

    // Step 4: Select service
    await user.click(screen.getByRole('radio', { name: /boarding/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 5: Confirm
    await user.click(screen.getByRole('button', { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    server.use(
      http.post('*/api/v1/operations/bookings', () => {
        return HttpResponse.json(
          { error: 'Booking conflict' },
          { status: 409 }
        );
      })
    );

    // ... render and interact

    await waitFor(() => {
      expect(screen.getByText(/booking conflict/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

```javascript
// e2e/booking.spec.js

import { test, expect } from '@playwright/test';

test.describe('Booking Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('creates new booking', async ({ page }) => {
    await page.goto('/bookings/new');

    // Select owner
    await page.click('[data-testid="owner-select"]');
    await page.click('text=John Doe');

    // Select pet
    await page.click('[data-testid="pet-checkbox-max"]');

    // Select dates
    await page.fill('[name="startDate"]', '2024-12-20');
    await page.fill('[name="endDate"]', '2024-12-27');

    // Submit
    await page.click('button:has-text("Create Booking")');

    // Verify success
    await expect(page.locator('text=Booking created')).toBeVisible();
  });
});
```

---

## Custom Test Utilities

### TestProviders Wrapper

```jsx
// frontend/src/test/test-utils.jsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export function TestProviders({ children }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui, options = {}) {
  return render(ui, { wrapper: TestProviders, ...options });
}
```

### Custom Matchers

```javascript
// Additional custom matchers can be added to setup.js

expect.extend({
  toHaveBeenCalledWithAmount(received, expectedAmount) {
    const calls = received.mock.calls;
    const hasMatch = calls.some((call) =>
      call.some((arg) => arg?.amount === expectedAmount)
    );

    return {
      pass: hasMatch,
      message: () =>
        `Expected function to have been called with amount ${expectedAmount}`,
    };
  },
});
```

---

## CI Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request

```yaml
# .github/workflows/ci.yml (test job)
test-frontend:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    - run: npm ci
      working-directory: frontend
    - run: npm run test -- --coverage --reporter=verbose
      working-directory: frontend
    - uses: codecov/codecov-action@v3
      with:
        directory: frontend/coverage
```

---

## Coverage Targets

| Area | Target | Current |
|------|--------|---------|
| Statements | 70% | TBD |
| Branches | 70% | TBD |
| Functions | 70% | TBD |
| Lines | 70% | TBD |

### Priority Areas for Coverage

1. **Payment processing** - Critical path, requires high coverage
2. **Authentication** - Security-critical
3. **Booking creation** - Core business logic
4. **Form validation** - User input handling
5. **API error handling** - Error resilience
