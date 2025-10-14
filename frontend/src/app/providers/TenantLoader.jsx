import { useEffect, useRef } from 'react';
import { useTenantStore } from '@/stores/tenant';
import { getTenantSlugCookie, setTenantSlugCookie } from '@/lib/cookies';

const TenantLoader = () => {
  const hasInitialized = useRef(false);
  const loadTenant = useTenantStore((state) => state.loadTenant);
  
  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const initTenant = async () => {
      let slug = 'default';
      
      // Try to get slug from cookie first
      const cookieSlug = getTenantSlugCookie();
      if (cookieSlug) {
        slug = cookieSlug;
      }
      
      // Check URL params
      const params = new URLSearchParams(window.location.search);
      const urlTenant = params.get('tenant');
      if (urlTenant) {
        slug = urlTenant.toLowerCase().trim();
      }
      
      // For now, hardcode to 'testing' since that's your actual tenant
      // Remove this line once you have proper tenant resolution
      if (slug === 'default') {
        slug = 'testing';
      }
      
      try {
        await loadTenant(slug);
        setTenantSlugCookie(slug);
      } catch (error) {
        console.error('Failed to load tenant:', error);
        // Set the slug in cookie anyway so we don't keep retrying with 'default'
        setTenantSlugCookie(slug);
      }
    };

    initTenant();
  }, []); // Empty deps, only run once

  return null;
};

export default TenantLoader;