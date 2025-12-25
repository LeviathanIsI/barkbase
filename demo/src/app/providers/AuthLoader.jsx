import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';

const AuthLoader = () => {
  const { accessToken, refreshToken, tenantId, expiresAt, updateTokens, clearAuth } = useAuthStore();
  const { setTenant, setLoading } = useTenantStore();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Only attempt refresh once on initial mount
    if (hasAttemptedRef.current) {
      return;
    }
    hasAttemptedRef.current = true;

    const attemptRefresh = async () => {
      // Session expiry is now handled server-side via validateSessionAge() in auth-handler.js
      // Frontend will receive SESSION_EXPIRED error code on API requests and redirect to login
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
              refreshToken: session.refreshToken,
              tenantId: null, // Will be fetched from backend
              tokens: { accessTokenExpiresIn: session.expiresIn },
            });

            // Check if already loading
            const { isLoading } = useTenantStore.getState();
            if (!isLoading) {
              setLoading(true);
              // Fetch tenant from backend using JWT sub
              try {
                const tenantResponse = await apiClient.get('/api/v1/config/tenant');
                if (tenantResponse.data) {
                  updateTokens({ tenantId: tenantResponse.data.recordId });
                  setTenant(tenantResponse.data);
                }
              } catch (tenantError) {              } finally {
                setLoading(false);
              }
            }
          }
          // handleCallback already cleans the URL
        }
      } catch (err) {      }

      // If we have a valid access token but no tenantId, fetch from backend
      if (accessToken && expiresAt && Date.now() < expiresAt) {
        if (!tenantId) {
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
            } catch (tenantError) {            } finally {
              setLoading(false);
            }
          }
        }
        return;
      }

      // If there's a refresh token, try to get a new access token
      if (refreshToken) {
        try {
          // Frontend now uses Cognito refresh in the auth client
          const { auth, apiClient } = await import('@/lib/apiClient');
          const data = await auth.refreshSession({ refreshToken });

          updateTokens({
            accessToken: data.accessToken,
            tenantId: null, // Will be fetched from backend
            role: data.role,
            expiresAt: Date.now() + (15 * 60 * 1000)
          });

          // Check if already loading
          const { isLoading } = useTenantStore.getState();
          if (!isLoading) {
            setLoading(true);
            // Fetch tenant from backend after refresh
            try {
              const tenantResponse = await apiClient.get('/api/v1/config/tenant');
              if (tenantResponse.data) {
                updateTokens({ tenantId: tenantResponse.data.recordId });
                setTenant(tenantResponse.data);
              }
            } catch (tenantError) {            } finally {
              setLoading(false);
            }
          }

        } catch (error) {          // If refresh fails, clear auth state
          clearAuth();
        }
      }
    };

    attemptRefresh();
  }, []); // Only run once on mount

  return null;
};

export default AuthLoader;
