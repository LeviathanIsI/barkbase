/**
 * =============================================================================
 * BarkBase Demo - Tenant Store
 * =============================================================================
 *
 * Demo version - Pre-populated with demo tenant config.
 * All feature flags enabled for full demo experience.
 *
 * =============================================================================
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import getStorage from '@/lib/storage';

// Demo theme - matches BarkBase dark theme
const demoTheme = {
  mode: 'dark',
  primaryColor: '#d97706', // Amber-600
  secondaryColor: '#059669', // Emerald-600
  accentColor: '#3b82f6', // Blue-500
};

// All features enabled for demo
const allFeatures = {
  // Core features
  boarding: true,
  daycare: true,
  grooming: true,
  training: true,
  transport: true,

  // Advanced features
  calendar: true,
  scheduling: true,
  invoicing: true,
  payments: true,
  reporting: true,
  analytics: true,

  // Communication features
  smsNotifications: true,
  emailNotifications: true,
  pushNotifications: true,
  clientPortal: true,

  // Staff features
  staffManagement: true,
  timeTracking: true,
  taskManagement: true,
  shiftScheduling: true,

  // Pet features
  vaccineTracking: true,
  medicalRecords: true,
  feedingSchedules: true,
  behaviorNotes: true,
  photoUpdates: true,

  // Facility features
  kennelManagement: true,
  capacityPlanning: true,
  facilityHeatmap: true,
  webcamIntegration: true,

  // Business features
  multiLocation: true,
  customBranding: true,
  apiAccess: true,
  integrations: true,

  // AI features
  aiAssistant: true,
  smartScheduling: true,
  demandForecasting: true,
  pricingOptimization: true,
};

// Demo tenant configuration
const demoTenant = {
  recordId: 'demo-tenant',
  accountCode: 'BK-DEMO01',
  slug: 'demo',
  name: 'Happy Paws Pet Resort',
  plan: 'ENTERPRISE',
  storageProvider: 'AWS',
  dbProvider: 'AWS',
  migrationState: 'IDLE',
  migrationInfo: null,
  customDomain: 'demo.barkbase.io',
  featureFlags: allFeatures,
  features: allFeatures,
  usage: {
    bookings: { current: 47, limit: null }, // null = unlimited
    pets: { current: 15, limit: null },
    owners: { current: 10, limit: null },
    staff: { current: 8, limit: null },
    storage: { current: 256, limit: null, unit: 'MB' },
  },
  theme: demoTheme,
  terminology: {
    pet: 'Pet',
    pets: 'Pets',
    owner: 'Pet Parent',
    owners: 'Pet Parents',
    kennel: 'Suite',
    kennels: 'Suites',
    booking: 'Reservation',
    bookings: 'Reservations',
  },
  settings: {
    timezone: 'America/Chicago',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    weekStartsOn: 0, // Sunday
    businessHours: {
      monday: { open: '07:00', close: '19:00' },
      tuesday: { open: '07:00', close: '19:00' },
      wednesday: { open: '07:00', close: '19:00' },
      thursday: { open: '07:00', close: '19:00' },
      friday: { open: '07:00', close: '19:00' },
      saturday: { open: '08:00', close: '17:00' },
      sunday: { open: '09:00', close: '15:00' },
    },
    checkInTime: '09:00',
    checkOutTime: '17:00',
    minBookingNotice: 24, // hours
    maxAdvanceBooking: 365, // days
    cancellationPolicy: '24 hours notice required for full refund',
  },
  recoveryMode: false,
};

export const useTenantStore = create(
  persist(
    (set, get) => ({
      tenant: demoTenant,
      initialized: true, // Always initialized in demo
      isLoading: false,

      // Set tenant - merge with demo defaults
      setTenant: (tenantPayload = {}) => {
        set({
          tenant: {
            ...demoTenant,
            ...tenantPayload,
            features: { ...allFeatures, ...tenantPayload.features },
            featureFlags: { ...allFeatures, ...tenantPayload.featureFlags },
          },
          initialized: true,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      // Load tenant - returns demo tenant immediately
      loadTenant: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
        set({ tenant: demoTenant, initialized: true });
        return demoTenant;
      },

      // Load tenant by ID - returns demo tenant
      loadTenantById: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        set({ tenant: demoTenant, initialized: true });
        return demoTenant;
      },

      // Update theme
      updateTheme: (overrides) => {
        const { tenant } = get();
        const mergedTheme = { ...tenant.theme, ...overrides };
        set({ tenant: { ...tenant, theme: mergedTheme } });
      },

      // Set feature flags - all flags remain enabled in demo
      setFeatureFlags: (flags = {}) => {
        const { tenant } = get();
        set({
          tenant: {
            ...tenant,
            featureFlags: { ...allFeatures, ...flags },
            features: { ...allFeatures, ...flags },
          },
        });
      },

      // Set terminology
      setTerminology: (terminology = {}) => {
        const { tenant } = get();
        set({
          tenant: {
            ...tenant,
            terminology: { ...tenant.terminology, ...terminology },
          },
        });
      },

      // Refresh plan - no-op in demo
      refreshPlan: async () => {
        console.log('[Demo] Plan refresh - demo always has ENTERPRISE');
        return demoTenant;
      },

      // Set dev plan - no-op in demo (always ENTERPRISE)
      setDevPlan: () => {
        console.log('[Demo] setDevPlan - demo always has ENTERPRISE');
      },
    }),
    {
      name: 'barkbase-demo-tenant',
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({
        tenant: state.tenant,
        initialized: state.initialized,
      }),
    },
  ),
);

// Export demo tenant for use elsewhere
export const getDemoTenant = () => demoTenant;
export const getDemoFeatures = () => allFeatures;
