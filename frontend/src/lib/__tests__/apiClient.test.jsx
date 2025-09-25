import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../apiClient';
import { useTenantStore } from '@/stores/tenant';

describe('apiClient tenant headers', () => {
  const originalFetch = global.fetch;

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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = global.fetch.mock.calls[0];
    const headerValue = options.headers.get('X-Tenant');
    expect(headerValue).toBe('acme');
  });
});
import { getDefaultTheme } from '@/lib/theme';

vi.mock('@/lib/offlineQueue', () => ({
  enqueueRequest: vi.fn(),
}));
