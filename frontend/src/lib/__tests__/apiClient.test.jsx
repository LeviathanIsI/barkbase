import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient from '../apiClient';
import { useTenantStore } from '@/stores/tenant';
import { getDefaultTheme } from '@/lib/theme';

vi.mock('@/lib/offlineQueue', () => ({
  enqueueRequest: vi.fn(),
}));

describe('apiClient tenant headers', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useTenantStore.setState({
      tenant: {
        id: 'tenant-1',
        slug: 'acme',
        name: 'Acme',
        plan: 'PRO',
        theme: getDefaultTheme(),
        featureFlags: {},
        terminology: {},
      },
      initialized: true,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    useTenantStore.setState({
      tenant: {
        id: null,
        slug: 'default',
        name: 'BarkBase',
        plan: 'FREE',
        theme: getDefaultTheme(),
        featureFlags: {},
        terminology: {},
      },
      initialized: false,
    });
    vi.restoreAllMocks();
  });

  it('sends X-Tenant header with current slug', async () => {
    await apiClient('/api/test');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, options] = globalThis.fetch.mock.calls[0];
    const headerValue = options.headers.get('X-Tenant');
    expect(headerValue).toBe('acme');
  });

  it('defaults to "default" slug when tenant missing', async () => {
    useTenantStore.setState({
      tenant: {
        id: null,
        slug: null,
        name: 'BarkBase',
        plan: 'FREE',
        theme: getDefaultTheme(),
        featureFlags: {},
        terminology: {},
      },
      initialized: true,
    });

    await apiClient('/api/default-test');

    const [, options] = globalThis.fetch.mock.calls[0];
    const headerValue = options.headers.get('X-Tenant');
    expect(headerValue).toBe('default');
  });

  it('attaches a request id header to every request', async () => {
    await apiClient('/api/id-test');
    const [, options] = globalThis.fetch.mock.calls[0];
    const requestId = options.headers.get('X-Request-ID');
    expect(requestId).toBeTruthy();
  });
});
