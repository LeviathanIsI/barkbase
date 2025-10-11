import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const expiresAt = useAuthStore((state) => state.expiresAt);

  const isLoading = useMemo(() => Boolean(user) && !accessToken, [user, accessToken]);

  return {
    user,
    accessToken,
    expiresAt,
    isAuthenticated,
    isLoading,
  };
};

