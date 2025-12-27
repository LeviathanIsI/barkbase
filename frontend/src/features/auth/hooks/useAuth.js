import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth';

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

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  // Get refresh token from sessionStorage (not stored in zustand for security)
  const refreshToken = useMemo(() => getRefreshToken(), []);

  // Only treat as loading when we have a user AND we expect a refresh to occur.
  // If there's no refresh token, we shouldn't block the route guard; let it redirect to /login.
  const isLoading = useMemo(
    () => Boolean(user) && !accessToken && Boolean(refreshToken),
    [user, accessToken, refreshToken]
  );

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
  };
};

