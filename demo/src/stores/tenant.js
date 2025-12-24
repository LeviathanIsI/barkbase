/**
 * Tenant Store - Demo Version
 *
 * Always uses demo tenant with ENTERPRISE plan for full feature access.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { applyTheme, getDefaultTheme, mergeTheme } from '@/lib/theme';
import { resolvePlanFeatures } from '@/features';
import getStorage from '@/lib/storage';

// Demo tenant - always ENTERPRISE with all features enabled
const DEMO_TENANT = {
  recordId: 'demo-tenant',
  accountCode: 'BK-DEMO',
  slug: 'demo',
  name: 'BarkBase Demo',
  plan: 'ENTERPRISE',
  storageProvider: 'LOCAL',
  dbProvider: 'LOCAL',
  migrationState: 'IDLE',
  migrationInfo: null,
  customDomain: null,
  featureFlags: {},
  features: resolvePlanFeatures('ENTERPRISE'),
  usage: { bookings: { count: 5, limit: null } },
  theme: getDefaultTheme(),
  terminology: {},
  settings: {},
  recoveryMode: false,
};

const defaultTenant = DEMO_TENANT;

export const useTenantStore = create(
  persist(
    (set, get) => ({
      tenant: defaultTenant,
      initialized: true, // Always initialized in demo mode
      isLoading: false,
      setTenant: (tenantPayload = {}) => {
        const mergedTheme = mergeTheme(tenantPayload.theme);
        const plan = 'ENTERPRISE'; // Always ENTERPRISE in demo
        const featureFlags = tenantPayload.featureFlags ?? {};
        const features = tenantPayload.features ?? resolvePlanFeatures(plan, featureFlags);
        const usage = tenantPayload.usage ?? { bookings: { count: 5, limit: null } };
        const recoveryMode = Boolean(tenantPayload.recoveryMode);
        const storageProvider = 'LOCAL';
        const dbProvider = 'LOCAL';
        const migrationState = 'IDLE';
        const migrationInfo = null;
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
      setLoading: (loading) => set({ isLoading: loading }),
      // Demo mode - immediately return demo tenant
      loadTenant: async () => {
        const tenant = { ...DEMO_TENANT };
        applyTheme(tenant.theme);
        set({ tenant, initialized: true });
        return tenant;
      },
      // Demo mode - immediately return demo tenant
      loadTenantById: async () => {
        const tenant = { ...DEMO_TENANT };
        applyTheme(tenant.theme);
        set({ tenant, initialized: true });
        return tenant;
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
        // No-op for demo
        return;
      },
      setDevPlan: (plan) => {
        // No-op for demo - always ENTERPRISE
        return;
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
