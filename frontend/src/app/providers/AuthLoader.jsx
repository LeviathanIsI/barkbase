import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { getTenantSlugCookie } from '@/lib/cookies';
import apiClient from '@/lib/apiClient';

// In development, use empty string to leverage Vite proxy (/api -> http://localhost:4000/api)
// In production, VITE_API_URL should be set to the backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

const AuthLoader = () => {
  const user = useAuthStore((state) => state.user);
  const memberships = useAuthStore((state) => state.memberships);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const rememberMe = useAuthStore((state) => state.rememberMe);
  const updateTokens = useAuthStore((state) => state.updateTokens);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Only attempt token refresh once on mount
    if (hasAttemptedRef.current) {
      return;
    }

    // If user info is persisted but no access token, try to refresh
    // This happens when the page is refreshed
    // If rememberMe is enabled and we have a refreshToken in localStorage, use it directly
    // Otherwise, rely on the httpOnly cookie
    if (user && !accessToken) {
      hasAttemptedRef.current = true;

      const attemptRefresh = async () => {
        // Try to get tenant slug from user's first membership
        // Check both memberships array at root level and nested under user
        const userTenantSlug = 
          memberships?.[0]?.tenant?.slug ?? 
          user?.memberships?.[0]?.tenant?.slug;
        const tenantSlug =
          userTenantSlug ??
          useTenantStore.getState().tenant?.slug ??
          getTenantSlugCookie() ??
          'default';

        console.log('[AuthLoader] =================================');
        console.log('[AuthLoader] User info present:', !!user);
        console.log('[AuthLoader] User tenant slug from memberships:', userTenantSlug);
        console.log('[AuthLoader] Access token present:', !!accessToken);
        console.log('[AuthLoader] Refresh token present:', !!refreshToken);
        console.log('[AuthLoader] Remember me enabled:', rememberMe);
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
          console.log('[AuthLoader] Remember Me enabled:', rememberMe);
          console.log('[AuthLoader] Refresh token in localStorage:', !!refreshToken);

          // If rememberMe is enabled and we have a refreshToken, send it in the request body
          const body = rememberMe && refreshToken ? JSON.stringify({ refreshToken }) : undefined;
          if (body) {
            headers.set('Content-Type', 'application/json');
          }

          const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.log('[AuthLoader] Refresh response status:', response.status);

          if (!response.ok) {
            const status = response.status;
            const errorText = await response.text();
            console.warn('[AuthLoader] Refresh failed:', status, errorText);
            // Only hard-clear on true auth denial
            if (status === 401 || status === 403) {
              clearAuth();
            }
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

          // Load tenant data after successful token refresh
          try {
            console.log('[AuthLoader] Loading tenant data after token refresh');
            const tenantSlug = userTenantSlug || getTenantSlugCookie() || 'default';
            const tenantPayload = await apiClient('/api/v1/tenants/current', {
              headers: {
                'X-Tenant': tenantSlug,
                Accept: 'application/json',
              },
            });
            useTenantStore.getState().setTenant({ ...tenantPayload, slug: tenantPayload.slug ?? tenantSlug });
            console.log('[AuthLoader] Tenant data loaded successfully');
          } catch (error) {
            console.warn('[AuthLoader] Failed to load tenant data after refresh:', error.message);
            // Continue anyway - tenant data might be loaded later
          }

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
  }, [user, memberships, accessToken, refreshToken, rememberMe, updateTokens, clearAuth]);

  return null;
};

export default AuthLoader;
