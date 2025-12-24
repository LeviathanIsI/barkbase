import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TenantLoader from '../TenantLoader';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { getDefaultTheme } from '@/lib/theme';

// Mock apiClient
vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock cookies
vi.mock('@/lib/cookies', () => ({
  setTenantSlugCookie: vi.fn(),
}));

describe('TenantLoader', () => {
  beforeEach(() => {
    // Reset tenant store to default state
    useTenantStore.setState({
      tenant: {
        recordId: null,
        slug: 'default',
        name: 'BarkBase',
        plan: 'FREE',
        featureFlags: {},
        theme: getDefaultTheme(),
        terminology: {},
        settings: {},
      },
      initialized: false,
      isLoading: false,
    });

    // Reset auth store - not authenticated by default
    useAuthStore.setState({
      accessToken: null,
      tenantId: null,
      user: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders null (no visible content)', () => {
    const { container } = render(<TenantLoader />);
    expect(container.firstChild).toBeNull();
  });

  it('does not immediately update stores on mount', () => {
    render(<TenantLoader />);

    // Initially, store state should remain as set in beforeEach
    expect(useTenantStore.getState().initialized).toBe(false);
    expect(useTenantStore.getState().isLoading).toBe(false);
  });

  it('skips loading when tenant already has recordId', async () => {
    const { apiClient } = await import('@/lib/apiClient');

    // Set tenant with existing recordId (already loaded)
    useTenantStore.setState({
      tenant: {
        recordId: 'existing-tenant',
        slug: 'existing',
        name: 'Existing Tenant',
        plan: 'PRO',
      },
      initialized: true,
    });

    // Set authenticated state
    useAuthStore.setState({
      accessToken: 'valid-token',
      tenantId: 'existing-tenant',
      user: { id: 'user-1' },
    });

    render(<TenantLoader />);

    // Wait a bit for any potential calls
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should not have called API since tenant already loaded
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('does not fetch when user is not authenticated', async () => {
    const { apiClient } = await import('@/lib/apiClient');

    // Ensure not authenticated
    useAuthStore.setState({
      accessToken: null,
      tenantId: null,
      user: null,
    });

    render(<TenantLoader />);

    // Wait past the 100ms delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should not have called API
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
