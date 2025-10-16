import { useEffect, useRef } from 'react';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { getTenantSlugCookie, setTenantSlugCookie } from '@/lib/cookies';

const TenantLoader = () => {
  const hasInitialized = useRef(false);
  const loadTenant = useTenantStore((state) => state.loadTenant);
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
      let slug = process.env.NODE_ENV === 'development' ? 'testing' : 'default';

      // Try to get slug from user's memberships first
      const userTenantSlug =
        memberships?.[0]?.tenant?.slug ??
        user?.memberships?.[0]?.tenant?.slug;

      if (userTenantSlug) {
        slug = userTenantSlug;
      } else {
        // Fallback to cookie
        const cookieSlug = getTenantSlugCookie();
        if (cookieSlug) {
          slug = cookieSlug;
        }

        // Check URL params as final fallback
        const params = new URLSearchParams(window.location.search);
        const urlTenant = params.get('tenant');
        if (urlTenant) {
          slug = urlTenant.toLowerCase().trim();
        }
      }

      try {
        await loadTenant(slug);
        setTenantSlugCookie(slug);
      } catch (error) {
        console.warn('Tenant not found or failed to load:', slug, error.message);
        // Don't set cookie for failed tenant loads - let login handle proper tenant setup
        // This prevents persisting invalid tenant slugs
      }
    };

    initTenant();
  }, [isAuthenticated, user, memberships]); // Re-run if authentication status or user data changes

  return null;
};

export default TenantLoader;