import { useEffect, useRef } from 'react';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { apiClient } from '@/lib/apiClient';
import { setTenantSlugCookie } from '@/lib/cookies';

const TenantLoader = () => {
  const hasInitialized = useRef(false);
  const loadTenant = useTenantStore((state) => state.loadTenant);
  const loadTenantById = useTenantStore((state) => state.loadTenantById);
  const setTenant = useTenantStore((state) => state.setTenant);
  const setLoading = useTenantStore((state) => state.setLoading);
  const tenant = useTenantStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const memberships = useAuthStore((state) => state.memberships);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  useEffect(() => {
    // Wait a tick to allow Zustand persist to rehydrate from localStorage
    const timer = setTimeout(() => {
      // Check if tenant was restored from localStorage
      const currentTenant = useTenantStore.getState().tenant;
      
      // If tenant already has recordId (restored from localStorage), skip loading
      if (currentTenant?.recordId) {
        return;
      }

      // Check if tenant is already being loaded
      const { isLoading } = useTenantStore.getState();
      if (isLoading) {
        return;
      }

      // Only load tenant if user is authenticated
      if (!isAuthenticated) {
        return;
      }

      if (hasInitialized.current) {
        return;
      }
      hasInitialized.current = true;

      const initTenant = async () => {
        setLoading(true);
        
        try {
          // Path 1: Prefer tenantId from auth store when present (already fetched by Login/AuthLoader)
          const { tenantId: authTenantId } = useAuthStore.getState();
          if (authTenantId) {
            try {
              await loadTenantById(authTenantId);
              return;
            } catch (e) {
              // Tenant load by ID failed, try other paths
            }
          }

          // Path 2: Try to load by slug from memberships
          const slug = memberships?.[0]?.tenant?.slug ?? user?.memberships?.[0]?.tenant?.slug;
          if (slug) {
            try {
              await loadTenant(slug);
              setTenantSlugCookie(slug);
              return;
            } catch (error) {
              // Tenant load by slug failed, try fallback
            }
          }

          // Path 3: Ultimate fallback - fetch from backend using JWT sub
          const response = await apiClient.get('/api/v1/tenants/current');
          if (response.data) {
            setTenant(response.data);
          }
        } catch (apiError) {
          console.error('[TenantLoader] All tenant loading paths failed:', apiError);
        } finally {
          setLoading(false);
        }
      };

      initTenant();
    }, 100); // Wait 100ms for rehydration

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, memberships]); // Re-run if authentication status or user data changes

  return null;
};

export default TenantLoader;
