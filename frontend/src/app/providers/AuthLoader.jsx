import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { getTenantSlugCookie } from '@/lib/cookies';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const AuthLoader = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateTokens = useAuthStore((state) => state.updateTokens);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Only attempt token refresh once on mount
    if (hasAttemptedRef.current) {
      return;
    }

    // If user info is persisted but no access token, try to refresh
    // This happens when the page is refreshed (tokens are not persisted for security)
    if (user && !accessToken) {
      hasAttemptedRef.current = true;

      const attemptRefresh = async () => {
        const tenantSlug =
          useTenantStore.getState().tenant?.slug ?? getTenantSlugCookie() ?? 'default';

        console.log('[AuthLoader] Attempting token refresh for tenant:', tenantSlug);

        const headers = new Headers();
        if (tenantSlug) {
          headers.set('X-Tenant', tenantSlug);
        }

        try {
          // Create an AbortController with a 5-second timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          console.log('[AuthLoader] Sending refresh request to:', `${API_BASE_URL}/api/v1/auth/refresh`);
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.log('[AuthLoader] Refresh response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[AuthLoader] Refresh failed:', response.status, errorText);
            // Refresh failed, clear persisted auth state
            clearAuth();
            return;
          }

          const payload = await response.json();
          console.log('[AuthLoader] Refresh successful, accessToken present:', !!payload?.accessToken);

          if (!payload?.accessToken) {
            console.error('[AuthLoader] No accessToken in refresh response');
            clearAuth();
            return;
          }

          // Successfully refreshed, update tokens in store
          console.log('[AuthLoader] Updating tokens in store');
          updateTokens({
            accessToken: payload.accessToken,
            role: payload.role,
            tokens: {
              accessToken: payload.accessToken,
              accessTokenExpiresIn: payload.expiresIn,
            },
          });
          console.log('[AuthLoader] Token refresh complete');
        } catch (error) {
          // Network error, timeout, or other issue - clear auth state
          if (error.name === 'AbortError') {
            console.error('[AuthLoader] Token refresh timed out on app load');
          } else {
            console.error('[AuthLoader] Token refresh failed on app load:', error);
          }
          clearAuth();
        }
      };

      attemptRefresh();
    } else if (user && accessToken) {
      // User has both user info and token, mark as attempted
      hasAttemptedRef.current = true;
    }
  }, [user, accessToken, updateTokens, clearAuth]);

  return null;
};

export default AuthLoader;
