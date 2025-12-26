import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { applyTheme, applyBranding, getDefaultTheme, mergeTheme } from '@/lib/theme';
import { resolvePlanFeatures } from '@/features';
import apiClient from '@/lib/apiClient';
import getStorage from '@/lib/storage';

// Default staff roles seeded for new tenants
const defaultStaffRoles = [
  { id: 'kennel_tech', name: 'Kennel Tech', color: '#3B82F6', isDefault: true },
  { id: 'groomer', name: 'Groomer', color: '#8B5CF6', isDefault: false },
  { id: 'manager', name: 'Manager', color: '#F59E0B', isDefault: false },
  { id: 'trainer', name: 'Trainer', color: '#10B981', isDefault: false },
];

const defaultTenant = {
  recordId: null,
  accountCode: null, // BK-XXXXXX format for URLs/display
  slug: process.env.NODE_ENV === 'development' ? 'testing' : 'default',
  name: 'BarkBase',
  plan: process.env.NODE_ENV === 'development' ? 'ENTERPRISE' : 'FREE',
  storageProvider: 'AWS',
  dbProvider: 'AWS',
  migrationState: 'IDLE',
  migrationInfo: null,
  customDomain: null,
  featureFlags: {},
  features: resolvePlanFeatures(process.env.NODE_ENV === 'development' ? 'ENTERPRISE' : 'FREE'),
  usage: null,
  theme: getDefaultTheme(),
  terminology: {},
  settings: {},
  staffRoles: defaultStaffRoles,
  recoveryMode: false,
};

export const useTenantStore = create(
  persist(
    (set, get) => ({
      tenant: defaultTenant,
      initialized: false,
      isLoading: false,
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
        const branding = tenantPayload.branding ?? null;
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
          branding,
        };
        applyTheme(mergedTheme);
        // Apply branding customizations (colors, fonts, logos)
        if (branding) {
          applyBranding(branding);
        }
        set({ tenant, initialized: true });
      },
      setLoading: (loading) => set({ isLoading: loading }),
      loadTenant: async (slug) => {
        const resolvedSlug = slug ?? get().tenant?.slug ?? defaultTenant.slug;

        try {
          // Backend exposes GET /api/v1/entity/tenants?slug=<slug>
          const res = await apiClient.get('/api/v1/entity/tenants', { params: { slug: resolvedSlug } });
          const payload = res?.data ?? null;

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
      loadTenantById: async (tenantId) => {
        if (!tenantId) throw new Error('tenantId is required');
        try {
          // Backend exposes GET /api/v1/config/tenant for current tenant config from JWT claims
          const res = await apiClient.get('/api/v1/config/tenant');
          const payload = res?.data ?? null;
          if (!payload) throw new Error('Tenant not found');
          get().setTenant(payload);
          return payload;
        } catch (error) {
          set((state) => ({ tenant: { ...state.tenant }, initialized: true }));
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
        set({ tenant: { ...tenant, terminology } });
      },
      setBranding: (branding = {}) => {
        const { tenant } = get();
        const mergedBranding = { ...tenant.branding, ...branding };
        applyBranding(mergedBranding);
        set({ tenant: { ...tenant, branding: mergedBranding } });
      },
      loadBranding: async () => {
        try {
          const res = await apiClient.get('/api/v1/config/branding');
          const branding = res?.data ?? null;
          if (branding) {
            get().setBranding(branding);
            // Also update terminology if included in branding response
            if (branding.terminology) {
              get().setTerminology(branding.terminology);
            }
          }
          return branding;
        } catch (error) {
          console.warn('[tenant] Failed to load branding:', error?.message);
          return null;
        }
      },
      setStaffRoles: (staffRoles = []) => {
        const { tenant } = get();
        // Ensure at least one role is marked as default
        const hasDefault = staffRoles.some((r) => r.isDefault);
        const normalizedRoles = hasDefault
          ? staffRoles
          : staffRoles.map((r, i) => ({ ...r, isDefault: i === 0 }));
        set({ tenant: { ...tenant, staffRoles: normalizedRoles } });
      },
      refreshPlan: async () => {
        // This custom endpoint needs a dedicated Lambda. Commenting out for now.
        // TODO: Create a '/tenants/current/plan' Lambda
        console.warn('refreshPlan is not implemented for the new AWS backend yet.');
        return;
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
    }),
    {
      name: 'barkbase-tenant',
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({
        tenant: state.tenant,
        initialized: state.initialized,
      }),
    }
  )
);
