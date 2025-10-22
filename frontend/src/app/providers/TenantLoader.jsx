import { useEffect, useRef } from 'react';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { setTenantSlugCookie } from '@/lib/cookies';

const TenantLoader = () => {
  const hasInitialized = useRef(false);
  const loadTenant = useTenantStore((state) => state.loadTenant);
  const loadTenantById = useTenantStore((state) => state.loadTenantById);
  const tenant = useTenantStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const memberships = useAuthStore((state) => state.memberships);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  useEffect(() => {
    // Only load tenant if user is authenticated and tenant data is not already loaded
    if (!isAuthenticated || tenant.recordId) {
      return;
    }

    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const initTenant = async () => {
      // Prefer tenantId from auth store when present
      const { tenantId: authTenantId } = useAuthStore.getState();
      if (authTenantId) {
        try {
          await loadTenantById(authTenantId);
          return;
        } catch (e) {
          console.warn('Tenant load by id failed:', e.message);
        }
      }

      const slug = memberships?.[0]?.tenant?.slug ?? user?.memberships?.[0]?.tenant?.slug;
      if (!slug) return;
      try {
        await loadTenant(slug);
        setTenantSlugCookie(slug);
      } catch (error) {
        console.warn('Tenant load failed for user membership slug:', slug, error.message);
      }
    };

    initTenant();
  }, [isAuthenticated, user, memberships]); // Re-run if authentication status or user data changes

  return null;
};

export default TenantLoader;