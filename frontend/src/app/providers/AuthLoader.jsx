import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import {
  initTokenRefresh,
  clearRefreshTimer,
  setupVisibilityHandler,
} from '@/lib/tokenRefreshManager';

/**
 * Get refresh token from sessionStorage.
 */
function getRefreshToken() {
  try {
    return sessionStorage.getItem('barkbase_refresh_token');
  } catch {
    return null;
  }
}

const AuthLoader = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const tenantId = useAuthStore((state) => state.tenantId);
  const updateTokens = useAuthStore((state) => state.updateTokens);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setTenant = useTenantStore((state) => state.setTenant);
  const setLoading = useTenantStore((state) => state.setLoading);

  const hasAttemptedRef = useRef(false);
  const visibilityCleanupRef = useRef(null);
  const tokenRefreshInitializedRef = useRef(false);

  // Callback to update access token in store
  const handleTokenRefresh = useCallback((newAccessToken) => {
    console.log('[AuthLoader] Token refreshed, updating store');
    updateTokens({ accessToken: newAccessToken });
  }, [updateTokens]);

  // Callback when session expires and cannot be refreshed
  const handleSessionExpired = useCallback(() => {
    console.log('[AuthLoader] Session expired, clearing auth and redirecting');
    clearAuth();
    try {
      sessionStorage.removeItem('barkbase_refresh_token');
    } catch {}
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, [clearAuth]);

  // Initialize proactive token refresh when we have an access token
  useEffect(() => {
    if (accessToken && !tokenRefreshInitializedRef.current) {
      tokenRefreshInitializedRef.current = true;
      console.log('[AuthLoader] 🚀 Initializing proactive token refresh');
      console.log('[AuthLoader] Access token (first 50 chars):', accessToken.substring(0, 50) + '...');

      // Check if refresh token exists
      const refreshToken = sessionStorage.getItem('barkbase_refresh_token');
      console.log('[AuthLoader] Refresh token exists:', !!refreshToken);

      // Set up token refresh timer
      initTokenRefresh(accessToken, handleTokenRefresh, handleSessionExpired);

      // Set up visibility handler to refresh when app comes back to foreground
      visibilityCleanupRef.current = setupVisibilityHandler(
        accessToken,
        handleTokenRefresh,
        handleSessionExpired
      );
    }

    // Cleanup on unmount
    return () => {
      if (visibilityCleanupRef.current) {
        visibilityCleanupRef.current();
        visibilityCleanupRef.current = null;
      }
      clearRefreshTimer();
    };
  }, [accessToken, handleTokenRefresh, handleSessionExpired]);

  // Reset the initialized flag when access token is cleared (logout)
  useEffect(() => {
    if (!accessToken) {
      tokenRefreshInitializedRef.current = false;
      clearRefreshTimer();
    }
  }, [accessToken]);

  // Main initialization effect - runs once on mount
  useEffect(() => {
    if (hasAttemptedRef.current) {
      return;
    }
    hasAttemptedRef.current = true;

    const attemptRefresh = async () => {
      // Handle Cognito Hosted UI callback first (exchange code for tokens)
      try {
        const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
        const hasAuthCode = url?.searchParams?.get('code');
        if (hasAuthCode) {
          const { auth, apiClient } = await import('@/lib/apiClient');
          const session = await auth.handleCallback();
          if (session?.accessToken) {
            updateTokens({
              accessToken: session.accessToken,
              tenantId: null, // Will be fetched from backend
            });

            // Store refresh token in sessionStorage
            if (session.refreshToken) {
              try {
                sessionStorage.setItem('barkbase_refresh_token', session.refreshToken);
              } catch {}
            }

            // Fetch tenant from backend using JWT sub
            const { isLoading } = useTenantStore.getState();
            if (!isLoading) {
              setLoading(true);
              try {
                const tenantResponse = await apiClient.get('/api/v1/config/tenant');
                if (tenantResponse.data) {
                  updateTokens({ tenantId: tenantResponse.data.recordId });
                  setTenant(tenantResponse.data);
                }
              } catch (tenantError) {
                console.error('[AuthLoader] Failed to fetch tenant after OAuth:', tenantError);
              } finally {
                setLoading(false);
              }
            }
          }
          return; // handleCallback already cleans the URL
        }
      } catch (err) {
        console.error('[AuthLoader] OAuth callback handling failed:', err);
      }

      // If we have a valid access token but no tenantId, fetch from backend
      if (accessToken && !tenantId) {
        const { isLoading } = useTenantStore.getState();
        if (!isLoading) {
          setLoading(true);
          try {
            const { apiClient } = await import('@/lib/apiClient');
            const tenantResponse = await apiClient.get('/api/v1/config/tenant');
            if (tenantResponse.data) {
              updateTokens({ tenantId: tenantResponse.data.recordId });
              setTenant(tenantResponse.data);
            }
          } catch (tenantError) {
            console.error('[AuthLoader] Failed to fetch tenant on init:', tenantError);
          } finally {
            setLoading(false);
          }
        }
        return;
      }

      // If there's a refresh token but no valid access token, try to get a new access token
      const refreshToken = getRefreshToken();
      if (refreshToken && !accessToken) {
        try {
          console.log('[AuthLoader] Attempting to refresh session with stored refresh token');
          const { auth, apiClient } = await import('@/lib/apiClient');
          const data = await auth.refreshSession({ refreshToken });

          if (data?.accessToken) {
            updateTokens({
              accessToken: data.accessToken,
              tenantId: null, // Will be fetched from backend
              role: data.role,
            });

            // Fetch tenant from backend after refresh
            const { isLoading } = useTenantStore.getState();
            if (!isLoading) {
              setLoading(true);
              try {
                const tenantResponse = await apiClient.get('/api/v1/config/tenant');
                if (tenantResponse.data) {
                  updateTokens({ tenantId: tenantResponse.data.recordId });
                  setTenant(tenantResponse.data);
                }
              } catch (tenantError) {
                console.error('[AuthLoader] Failed to fetch tenant after refresh:', tenantError);
              } finally {
                setLoading(false);
              }
            }
          }
        } catch (error) {
          console.error('[AuthLoader] Failed to refresh token:', error);
          // If refresh fails, clear auth state and refresh token
          clearAuth();
          try {
            sessionStorage.removeItem('barkbase_refresh_token');
          } catch {}
        }
      }
    };

    attemptRefresh();
  }, []); // Only run once on mount

  return null;
};

export default AuthLoader;
