import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TenantLoader from '../TenantLoader';
import { useTenantStore } from '@/stores/tenant';
import { getDefaultTheme } from '@/lib/theme';

describe('TenantLoader', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    useTenantStore.setState({
      tenant: {
        id: null,
        slug: 'default',
        name: 'BarkBase',
        plan: 'FREE',
        featureFlags: {},
        theme: getDefaultTheme(),
        terminology: {},
      },
      initialized: false,
    });
    document.documentElement.style.cssText = '';
    window.localStorage?.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('loads tenant data and applies theme variables', async () => {
    const tenantPayload = {
      id: 'tenant-123',
      slug: 'acme',
      name: 'Acme Boarding',
      plan: 'PRO',
      featureFlags: {},
      theme: {
        colors: {
          primary: '10 20 30',
        },
        mode: 'dark',
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(tenantPayload),
    });

    window.localStorage?.setItem('barkbase-tenant-slug', 'acme');

    render(<TenantLoader />);

    await waitFor(() => expect(useTenantStore.getState().initialized).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/tenants/current'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Tenant': 'acme',
        }),
      }),
    );

    const primaryColor = document.documentElement.style.getPropertyValue('--color-primary');
    expect(primaryColor.trim()).toBe('10 20 30');
  });
});
