import { create } from 'zustand';
import { applyTheme, getDefaultTheme, mergeTheme } from '@/lib/theme';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const defaultTenant = {
  id: null,
  slug: 'default',
  name: 'BarkBase',
  plan: 'FREE',
  customDomain: null,
  featureFlags: {},
  theme: getDefaultTheme(),
  terminology: {},
  settings: {},
};

export const useTenantStore = create((set, get) => ({
  tenant: defaultTenant,
  initialized: false,
  setTenant: (tenantPayload = {}) => {
    const mergedTheme = mergeTheme(tenantPayload.theme);
    const tenant = {
      ...defaultTenant,
      ...tenantPayload,
      theme: mergedTheme,
    };
    applyTheme(mergedTheme);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('barkbase-tenant-slug', tenant.slug ?? defaultTenant.slug);
      } catch (error) {
        // ignore storage errors
      }
    }
    set({ tenant, initialized: true });
  },
  loadTenant: async (slug) => {
    const resolvedSlug = slug ?? get().tenant?.slug ?? defaultTenant.slug;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/tenants/current`, {
        credentials: 'include',
        headers: {
          'X-Tenant': resolvedSlug,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load tenant (${response.status})`);
      }

      const payload = await response.json();
      get().setTenant({ ...payload, slug: payload.slug ?? resolvedSlug });
      return payload;
    } catch (error) {
      // ensure we still mark the store as initialised to avoid boot loops
      set((state) => ({
        tenant: { ...state.tenant, slug: resolvedSlug },
        initialized: true,
      }));
      throw error;
    }
  },
  updateTheme: (overrides) => {
    const { tenant } = get();
    const mergedTheme = mergeTheme({ ...tenant.theme, ...overrides });
    applyTheme(mergedTheme);
    set({ tenant: { ...tenant, theme: mergedTheme } });
  },
  setFeatureFlags: (flags = {}) => {
    const { tenant } = get();
    set({ tenant: { ...tenant, featureFlags: { ...tenant.featureFlags, ...flags } } });
  },
  setTerminology: (terminology = {}) => {
    const { tenant } = get();
    set({ tenant: { ...tenant, terminology: { ...tenant.terminology, ...terminology } } });
  },
}));
