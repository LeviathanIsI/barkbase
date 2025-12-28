/**
 * =============================================================================
 * Canonical useTenantConfig Hook
 * =============================================================================
 *
 * Fetches the current tenant configuration from /api/v1/config/tenant.
 * This is the single source of truth for tenant + user config after login.
 *
 * IMPORTANT: This hook also syncs the fetched data to Zustand stores (auth, tenant)
 * so that other parts of the app (especially apiClient headers) have access to tenantId.
 *
 * Backend Response Shape (from config-service):
 * {
 *   id: string;              // tenant UUID
 *   recordId: string;        // alias for id
 *   tenantId: string;        // alias for id (canonical)
 *   userId: string;          // current user's database ID
 *   hasOnboardingCompleted: boolean;
 *   name: string;            // tenant display name
 *   slug: string;            // tenant slug for URLs
 *   plan: 'FREE' | 'PRO' | 'ENTERPRISE';
 *   settings: Record<string, any>;
 *   theme: Record<string, any>;
 *   featureFlags: Record<string, any>;
 *   createdAt: string;
 *   user: {
 *     id: string;
 *     email: string;
 *     firstName: string;
 *     lastName: string;
 *     role: string;
 *   };
 *   tenant: {
 *     id: string;
 *     recordId: string;
 *     name: string;
 *     slug: string;
 *     plan: string;
 *   };
 * }
 *
 * =============================================================================
 */

import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Query key for tenant config
 */
export const tenantConfigQueryKey = ['tenantConfig'];

/**
 * Normalize the backend response into a consistent shape
 */
function normalizeTenantConfig(data) {
  if (!data) return null;

  const tenantId = data.tenantId || data.recordId || data.id;

  return {
    // Core identifiers - tenantId is THE canonical identifier
    tenantId,
    userId: data.userId,

    // Onboarding status
    hasOnboardingCompleted: Boolean(data.hasOnboardingCompleted),

    // Tenant info (top-level for convenience)
    name: data.name,
    slug: data.slug,
    plan: data.plan || 'FREE',
    settings: data.settings || {},
    theme: data.theme || {},
    featureFlags: data.featureFlags || {},
    createdAt: data.createdAt,

    // Nested user object
    user: data.user ? {
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      role: data.user.role,
    } : null,

    // Nested tenant object (for components that expect this shape)
    tenant: {
      id: tenantId,
      recordId: tenantId,
      name: data.tenant?.name || data.name,
      slug: data.tenant?.slug || data.slug,
      plan: data.tenant?.plan || data.plan || 'FREE',
    },

    // Raw response for any edge cases
    _raw: data,
  };
}

/**
 * Canonical hook to fetch tenant configuration.
 *
 * This hook:
 * 1. Fetches config from /api/v1/config/tenant
 * 2. Normalizes the response
 * 3. Syncs tenantId to auth store (for API headers)
 * 4. Syncs tenant data to tenant store (for UI)
 *
 * @param {Object} options - React Query options override
 * @returns {Object} React Query result with tenant config data
 *
 * @example
 * const { data: config, isLoading, error } = useTenantConfig();
 * * }
 */
export const useTenantConfig = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateTokens = useAuthStore((state) => state.updateTokens);
  const setTenant = useTenantStore((state) => state.setTenant);

  const queryResult = useQuery({
    queryKey: tenantConfigQueryKey,
    queryFn: async () => {
      // Note: This request needs to work without X-Tenant-Id header
      // The backend uses JWT sub to look up the user's tenant
      const response = await apiClient.get(canonicalEndpoints.settings.tenant);
      const data = response.data;

      if (!data) {
        throw new Error('No tenant config returned from server');
      }

      return normalizeTenantConfig(data);
    },
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });

  // Sync successful data to Zustand stores
  // This ensures apiClient can access tenantId via auth store
  useEffect(() => {
    const data = queryResult.data;
    if (data?.tenantId) {
      // Update auth store with tenantId and role (for API headers)
      updateTokens({
        tenantId: data.tenantId,
        role: data.user?.role,
      });

      // Update tenant store with full tenant data (for UI)
      setTenant({
        recordId: data.tenantId,
        slug: data.slug,
        name: data.name,
        plan: data.plan,
        settings: data.settings,
        theme: data.theme,
        featureFlags: data.featureFlags,
      });
    }
  }, [queryResult.data, updateTokens, setTenant]);

  return queryResult;
};

/**
 * Hook to get just the tenant ID (convenience wrapper)
 * Returns null while loading, the tenantId once loaded
 */
export const useTenantId = () => {
  const { data, isLoading, isError } = useTenantConfig();
  return data?.tenantId ?? null;
};

/**
 * Hook to check if tenant config is ready (loaded successfully)
 * Use this to guard tenant-scoped queries
 */
export const useTenantReady = () => {
  const { data, isLoading, isError } = useTenantConfig();
  return {
    isReady: Boolean(data?.tenantId),
    isLoading,
    isError,
    tenantId: data?.tenantId ?? null,
  };
};

/**
 * Hook to get just the user info from tenant config
 */
export const useConfigUser = () => {
  const { data } = useTenantConfig();
  return data?.user ?? null;
};

/**
 * Hook to check onboarding completion status
 */
export const useHasOnboardingCompleted = () => {
  const { data, isLoading } = useTenantConfig();
  return {
    hasCompleted: data?.hasOnboardingCompleted ?? false,
    isLoading,
  };
};

export default useTenantConfig;
