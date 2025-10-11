import { create } from 'zustand';
import { applyTheme, getDefaultTheme, mergeTheme } from '@/lib/theme';
import { resolvePlanFeatures } from '@/features';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const defaultTenant = {
  id: null,
  slug: 'default',
  name: 'BarkBase',
  plan: 'FREE',
  storageProvider: 'SUPABASE',
  dbProvider: 'SUPABASE',
  migrationState: 'IDLE',
  migrationInfo: null,
  customDomain: null,
  featureFlags: {},
  features: resolvePlanFeatures('FREE'),
  usage: null,
  theme: getDefaultTheme(),
  terminology: {},
  settings: {},
  recoveryMode: false,
};

export const useTenantStore = create((set, get) => ({
  tenant: defaultTenant,
  initialized: false,
  setTenant: (tenantPayload = {}) => {
    const mergedTheme = mergeTheme(tenantPayload.theme);
    const plan = tenantPayload.plan ?? defaultTenant.plan;
    const featureFlags = tenantPayload.featureFlags ?? {};
    const features = tenantPayload.features ?? resolvePlanFeatures(plan, featureFlags);
    const usage = tenantPayload.usage ?? null;
    const recoveryMode = Boolean(tenantPayload.recoveryMode);
    const storageProvider = tenantPayload.storageProvider ?? defaultTenant.storageProvider;
    const dbProvider = tenantPayload.dbProvider ?? defaultTenant.dbProvider;
    const migrationState = tenantPayload.migrationState ?? defaultTenant.migrationState;
    const migrationInfo = tenantPayload.migrationInfo ?? null;
    const tenant = {
      ...defaultTenant,
      ...tenantPayload,
      plan,
      storageProvider,
      dbProvider,
      migrationState,
      migrationInfo,
      featureFlags,
      features,
      usage,
      recoveryMode,
      theme: mergedTheme,
    };
    applyTheme(mergedTheme);
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
    const nextFeatureFlags = { ...tenant.featureFlags, ...flags };
    set({
      tenant: {
        ...tenant,
        featureFlags: nextFeatureFlags,
        features: resolvePlanFeatures(tenant.plan, nextFeatureFlags),
      },
    });
  },
  setTerminology: (terminology = {}) => {
    const { tenant } = get();
    set({ tenant: { ...tenant, terminology: { ...tenant.terminology, ...terminology } } });
  },
  refreshPlan: async () => {
    const { tenant } = get();
    const response = await fetch(`${API_BASE_URL}/api/v1/tenants/current/plan`, {
      credentials: 'include',
      headers: {
        'X-Tenant': tenant.slug ?? defaultTenant.slug,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load plan (${response.status})`);
    }

    const payload = await response.json();
    const featureFlags = payload.featureFlags ?? tenant.featureFlags;
    const features = payload.features ?? resolvePlanFeatures(payload.plan, featureFlags);
    set({
      tenant: {
        ...tenant,
        plan: payload.plan,
        storageProvider: payload.storageProvider ?? tenant.storageProvider,
        dbProvider: payload.dbProvider ?? tenant.dbProvider,
        migrationState: payload.migrationState ?? tenant.migrationState,
        migrationInfo: payload.migrationInfo ?? tenant.migrationInfo ?? null,
        featureFlags,
        features,
        usage: payload.usage ?? tenant.usage ?? null,
        recoveryMode: Boolean(payload.recoveryMode),
      },
    });
    return payload;
  },
  // Development-only method to manually override plan for testing
  setDevPlan: (plan) => {
    const { tenant } = get();
    const features = resolvePlanFeatures(plan, tenant.featureFlags);

    // Update usage limits based on plan
    const updatedUsage = tenant.usage ? {
      ...tenant.usage,
      bookings: {
        ...tenant.usage.bookings,
        limit: plan === 'FREE' ? 100 : plan === 'PRO' ? 1000 : null, // null = unlimited for ENTERPRISE
      },
    } : null;

    set({
      tenant: {
        ...tenant,
        plan,
        features,
        usage: updatedUsage,
      },
    });
  },
}));
