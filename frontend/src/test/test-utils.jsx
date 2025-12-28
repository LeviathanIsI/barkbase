/**
 * Shared Test Utilities
 *
 * Provides a custom render function that includes all necessary providers
 * for testing components in the BarkBase application.
 */

import { SlideoutProvider } from '@/components/slideout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { Toaster } from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';

/**
 * Create a fresh QueryClient for each test
 * Configured to disable retries and caching for predictable tests
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      warn: console.warn,
      error: () => {}, // Suppress error logging in tests
    },
  });
}

/**
 * All providers wrapper component
 * Wraps children with all necessary context providers
 */
function AllProviders({ children, initialEntries = ['/'] }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <SlideoutProvider>
          {children}
          <Toaster position="top-right" />
        </SlideoutProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function that includes all providers
 *
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @param {string[]} options.initialEntries - Initial router entries
 * @returns {Object} Render result with queryClient
 *
 * @example
 * import { render, screen } from '@/test/test-utils';
 *
 * test('renders component', () => {
 *   render(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 */
export function renderWithProviders(ui, options = {}) {
  const { initialEntries = ['/'], ...renderOptions } = options;
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <SlideoutProvider>
          {children}
          <Toaster position="top-right" />
        </SlideoutProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Wait for loading states to resolve
 * Useful for components that show loading spinners
 */
export async function waitForLoadingToFinish() {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    const loaders = document.querySelectorAll('[data-testid="loading"]');
    if (loaders.length > 0) {
      throw new Error('Still loading');
    }
  });
}

/**
 * Mock authenticated user state
 */
export function mockAuthenticatedUser(overrides = {}) {
  return {
    id: 'test-user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'OWNER',
    ...overrides,
  };
}

/**
 * Mock tenant state
 */
export function mockTenant(overrides = {}) {
  return {
    id: 'test-tenant-1',
    slug: 'test-kennel',
    name: 'Test Kennel',
    plan: 'PRO',
    featureFlags: {},
    ...overrides,
  };
}

/**
 * Set up auth and tenant stores for testing
 */
export async function setupTestStores(options = {}) {
  const { useAuthStore } = await import('@/stores/auth');
  const { useTenantStore } = await import('@/stores/tenant');

  const user = options.user ?? mockAuthenticatedUser();
  const tenant = options.tenant ?? mockTenant();

  useAuthStore.setState({
    user,
    accessToken: options.accessToken ?? 'test-token',
    tenantId: tenant.id,
    role: user.role,
    isAuthenticated: () => true,
  });

  useTenantStore.setState({
    tenant,
    initialized: true,
    isLoading: false,
  });

  return { user, tenant };
}

/**
 * Clear auth and tenant stores after tests
 */
export async function clearTestStores() {
  const { useAuthStore } = await import('@/stores/auth');
  const { useTenantStore } = await import('@/stores/tenant');

  useAuthStore.getState().clearAuth?.();
  useTenantStore.setState({
    tenant: null,
    initialized: false,
    isLoading: false,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { renderWithProviders as render };

