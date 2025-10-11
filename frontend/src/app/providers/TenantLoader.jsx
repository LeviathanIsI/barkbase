import { useEffect } from 'react';
import { useTenantStore } from '@/stores/tenant';
import { getTenantSlugCookie, setTenantSlugCookie } from '@/lib/cookies';

const TenantLoader = () => {
  const loadTenant = useTenantStore((state) => state.loadTenant);

  useEffect(() => {
    const resolveSlug = () => {
      if (typeof window === 'undefined') {
        return 'default';
      }

      const search = window.location?.search ?? '';
      if (search) {
        try {
          const params = new URLSearchParams(search);
          const queryValue = params.get('tenant');
          if (queryValue) {
            const normalized = queryValue.trim().toLowerCase();
            if (normalized) {
              return normalized;
            }
          }
        } catch {
          // ignore malformed query strings
        }
      }

      const host = window.location.host?.toLowerCase() ?? '';
      const withoutPort = host.split(':')[0];
      const parts = withoutPort.split('.').filter(Boolean);
      if (parts.length >= 3) {
        return parts[0];
      }

      const cookieSlug = getTenantSlugCookie();
      if (cookieSlug) {
        return cookieSlug;
      }

      const baseDomain = import.meta.env.VITE_BASE_DOMAIN?.toLowerCase();
      if (baseDomain && withoutPort.endsWith(baseDomain)) {
        const prefix = withoutPort.slice(0, -baseDomain.length);
        const trimmedPrefix = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;
        if (trimmedPrefix) {
          return trimmedPrefix.split('.')[0];
        }
      }

      return 'default';
    };

    const slug = resolveSlug();

    loadTenant(slug)
      .then(() => {
        setTenantSlugCookie(slug);
      })
      .catch((error) => {
        console.error('Failed to load tenant', error);
      });
  }, [loadTenant]);

  return null;
};

export default TenantLoader;
