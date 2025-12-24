import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { can } from '@/lib/acl';

/**
 * Check if user has access to a feature based on permissions and feature flags
 */
export const useFeatureAccess = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const role = useAuthStore((state) => state.role);

  const hasFeatureAccess = (featureKey, permission = null) => {
    // Check feature flag
    if (featureKey && !tenant?.features?.[featureKey]) {
      return false;
    }

    // Check permission
    if (permission) {
      const context = {
        role,
        plan: tenant?.plan,
        features: tenant?.features || {},
        featureFlags: tenant?.featureFlags || {},
      };
      return can(context, permission);
    }

    return true;
  };

  return { hasFeatureAccess };
};

/**
 * Feature flag definitions for BarkBase
 */
export const FEATURE_FLAGS = {
  PACKAGES: 'packages',
  SEQUENCES: 'sequences',
  CUSTOM_CODE: 'customCode',
  KNOWLEDGE_BASE: 'knowledgeBase',
};

/**
 * Permission definitions
 */
export const PERMISSIONS = {
  VIEW_PAYMENTS: 'viewPayments',
  VIEW_REPORTS: 'viewReports',
  MANAGE_TENANT: 'manageTenant',
  MANAGE_STAFF: 'manageStaff',
};
