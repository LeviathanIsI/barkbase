import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const expiresAt = useAuthStore((state) => state.expiresAt);

  // Only treat as loading when we have a user AND we expect a refresh to occur.
  // If there's no refresh token, we shouldn't block the route guard; let it redirect to /login.
  const isLoading = useMemo(() => Boolean(user) && !accessToken && Boolean(refreshToken), [user, accessToken, refreshToken]);

  return {
    user,
    accessToken,
    refreshToken,
    expiresAt,
    isAuthenticated,
    isLoading,
  };
};

