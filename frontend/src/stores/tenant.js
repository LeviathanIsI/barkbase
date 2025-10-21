import { create } from 'zustand';
import { applyTheme, getDefaultTheme, mergeTheme } from '@/lib/theme';
import { resolvePlanFeatures } from '@/features';
import { from } from '@/lib/apiClient'; // Use the new client

const defaultTenant = { recordId: null,
  slug: process.env.NODE_ENV === 'development' ? 'testing' : 'default',
  name: 'BarkBase',
  plan: process.env.NODE_ENV === 'development' ? 'ENTERPRISE' : 'FREE',
  storageProvider: 'SUPABASE',
  dbProvider: 'SUPABASE',
  migrationState: 'IDLE',
  migrationInfo: null,
  customDomain: null,
  featureFlags: {},
  features: resolvePlanFeatures(process.env.NODE_ENV === 'development' ? 'ENTERPRISE' : 'FREE'),
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
    // Override plan to ENTERPRISE for all users in development mode
    const plan = process.env.NODE_ENV === 'development' ? 'ENTERPRISE' : (tenantPayload.plan ?? defaultTenant.plan);
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

    // Development indicator
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 DEVELOPMENT MODE: Enterprise access enabled for all users');
      console.log('Current plan:', tenant.plan);
      console.log('Available features:', Object.keys(tenant.features).filter(key => tenant.features[key]));
    }
  },
  loadTenant: async (slug) => {
    const resolvedSlug = slug ?? get().tenant?.slug ?? defaultTenant.slug;

    try {
      // The old backend used a special '/current' endpoint with a header.
      // The new approach will be to query the 'tenants' table by its slug.
      // This assumes the API Gateway is configured for a route like /tenants?slug=...
      const { data, error } = await from('tenants').select('*').eq('slug', resolvedSlug).get();
      
      if (error) throw new Error(error.message);

      // The new API returns an array, so we take the first result.
      const payload = data && data.length > 0 ? data[0] : null;

      if (!payload) {
        throw new Error('Tenant not found');
      }

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
    // This custom endpoint needs a dedicated Lambda. Commenting out for now.
    // TODO: Create a '/tenants/current/plan' Lambda
    console.warn('refreshPlan is not implemented for the new AWS backend yet.');
    return;
    /*
    const { tenant } = get();
    const { data, error } = await from('tenants').customAction('plan', { slug: tenant.slug });
    if (error) throw new Error(error.message);
    // ... logic to update store with payload
    */
  },
  // Development-only method to manually override plan for testing
  setDevPlan: (plan) => {
    // In development, force enterprise access unless explicitly testing other plans
    const effectivePlan = process.env.NODE_ENV === 'development' && plan !== 'FREE' && plan !== 'PRO' ? 'ENTERPRISE' : plan;

    const { tenant } = get();
    const features = resolvePlanFeatures(effectivePlan, tenant.featureFlags);

    // Update usage limits based on plan
    const updatedUsage = tenant.usage ? {
      ...tenant.usage,
      bookings: {
        ...tenant.usage.bookings,
        limit: effectivePlan === 'FREE' ? 100 : effectivePlan === 'PRO' ? 1000 : null, // null = unlimited for ENTERPRISE
      },
    } : null;

    set({
      tenant: {
        ...tenant,
        plan: effectivePlan,
        features,
        usage: updatedUsage,
      },
    });
  },
}));
