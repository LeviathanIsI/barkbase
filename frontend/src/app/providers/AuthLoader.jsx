import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const AuthLoader = () => {
  const { accessToken, refreshToken, tenantId, expiresAt, updateTokens, clearAuth } = useAuthStore();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Only attempt refresh once on initial mount
    if (hasAttemptedRef.current) {
      return;
    }
    hasAttemptedRef.current = true;

    const attemptRefresh = async () => {
      // If we have a valid access token, no need to refresh
      if (accessToken && expiresAt && Date.now() < expiresAt) {
        console.log('[AuthLoader] Valid access token found, no refresh needed');
        return;
      }

      // If there's a refresh token, try to get a new access token
      if (refreshToken) {
        console.log('[AuthLoader] Attempting to refresh access token...');
        try {
          // Frontend now uses Cognito refresh in the auth client
          const { auth } = await import('@/lib/apiClient');
          const data = await auth.refreshSession({ refreshToken });
          updateTokens({ accessToken: data.accessToken, role: data.role, expiresAt: Date.now() + (15 * 60 * 1000) });
          
          console.log('[AuthLoader] Access token refreshed successfully');
        } catch (error) {
          console.error('[AuthLoader] Failed to refresh token:', error);
          // If refresh fails, clear auth state
          clearAuth();
        }
      } else {
        console.log('[AuthLoader] No refresh token found, user needs to sign in.');
      }
    };

    attemptRefresh();
  }, []); // Only run once on mount

  return null;
};

export default AuthLoader;
