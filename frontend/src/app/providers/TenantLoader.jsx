import { useEffect, useRef } from 'react';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { apiClient } from '@/lib/apiClient';
import { setTenantSlugCookie } from '@/lib/cookies';

/**
 * TenantLoader - Bootstrap tenant configuration after login
 *
 * This component handles the initial tenant loading when a user is authenticated.
 * It works alongside useTenantConfig hook:
 * - TenantLoader: handles initial bootstrap (runs once after login)
 * - useTenantConfig: provides ongoing access to tenant data via React Query
 *
 * Loading priority:
 * 1. If tenant already loaded in stores (recordId exists), skip
 * 2. If tenantId exists in auth store, fetch config using it
 * 3. Otherwise, fetch from /api/v1/config/tenant (uses JWT sub)
 *
 * The fetched data is stored in both auth store (tenantId) and tenant store (full data)
 * so that apiClient can include X-Tenant-Id header in subsequent requests.
 */
const TenantLoader = () => {
  const hasInitialized = useRef(false);
  const setTenant = useTenantStore((state) => state.setTenant);
  const setLoading = useTenantStore((state) => state.setLoading);
  const updateTokens = useAuthStore((state) => state.updateTokens);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  useEffect(() => {
    // Wait a tick to allow Zustand persist to rehydrate from localStorage
    const timer = setTimeout(() => {
      // Check current state after rehydration
      const currentTenant = useTenantStore.getState().tenant;
      const { tenantId: authTenantId } = useAuthStore.getState();
      const { isLoading } = useTenantStore.getState();

      // If tenant already has recordId AND accountCode, skip loading
      // (accountCode might be missing from old localStorage data)
      if (currentTenant?.recordId && currentTenant?.accountCode) {
        return;
      }

      // If auth store already has tenantId AND accountCode, we're good
      const { accountCode: authAccountCode } = useAuthStore.getState();
      if (authTenantId && authAccountCode && currentTenant?.recordId === authTenantId) {
        return;
      }

      // Check if tenant is already being loaded
      if (isLoading) {
        return;
      }

      // Only load tenant if user is authenticated
      if (!isAuthenticated) {
        return;
      }

      // Prevent duplicate initialization
      if (hasInitialized.current) {
        return;
      }
      hasInitialized.current = true;

      const initTenant = async () => {
        setLoading(true);

        try {
          // Fetch tenant config from backend
          // This endpoint uses JWT sub to look up the user's tenant
          // It does NOT require X-Tenant-Id header (chicken-and-egg problem)
          const response = await apiClient.get('/api/v1/config/tenant');
          const data = response.data;

          if (!data) {
            throw new Error('No tenant config returned');
          }

          // Extract canonical tenantId and accountCode
          const tenantId = data.tenantId || data.recordId || data.id;
          const accountCode = data.accountCode || data.tenant?.accountCode;

          if (!tenantId) {
            throw new Error('No tenantId in config response');
          }

          // Update auth store with tenantId and accountCode (for API headers/URLs)
          updateTokens({
            tenantId,
            accountCode,
            role: data.user?.role,
          });

          // Update tenant store with full tenant data (for UI)
          setTenant({
            recordId: tenantId,
            accountCode,
            slug: data.slug,
            name: data.name,
            plan: data.plan || 'FREE',
            settings: data.settings || {},
            theme: data.theme || {},
            featureFlags: data.featureFlags || {},
          });

          // Set cookie for SSR/middleware if needed
          if (data.slug) {
            setTenantSlugCookie(data.slug);
          }

        } catch (error) {
          console.error('[TenantLoader] Failed to load tenant config:', error.message);
          // Don't throw - allow app to continue, useTenantConfig hook will retry
        } finally {
          setLoading(false);
        }
      };

      initTenant();
    }, 100); // Wait 100ms for Zustand rehydration

    return () => clearTimeout(timer);
  }, [isAuthenticated, setTenant, setLoading, updateTokens]);

  return null;
};

export default TenantLoader;
