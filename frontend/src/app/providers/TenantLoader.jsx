import { useEffect } from 'react';
import { useTenantStore } from '@/stores/tenant';

const TenantLoader = () => {
  const loadTenant = useTenantStore((state) => state.loadTenant);

  useEffect(() => {
    const resolveSlug = () => {
      if (typeof window === 'undefined') {
        return 'default';
      }

      const stored = window.localStorage?.getItem('barkbase-tenant-slug');
      if (stored) {
        return stored;
      }

      const host = window.location.host?.toLowerCase() ?? '';
      const withoutPort = host.split(':')[0];
      const parts = withoutPort.split('.').filter(Boolean);
      if (parts.length >= 3) {
        return parts[0];
      }

      const baseDomain = import.meta.env.VITE_BASE_DOMAIN?.toLowerCase();
      if (baseDomain && withoutPort.endsWith(baseDomain)) {
        const maybeSlug = withoutPort.replace(new RegExp(`\.${baseDomain}$`), '');
        if (maybeSlug && maybeSlug !== baseDomain) {
          return maybeSlug.split('.')[0];
        }
      }

      return 'default';
    };

    const slug = resolveSlug();

    loadTenant(slug).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to load tenant', error);
    });
  }, [loadTenant]);

  return null;
};

export default TenantLoader;
