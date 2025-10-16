import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/lib/apiClient';

const TokenRefresher = () => {
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const user = useAuthStore((s) => s.user);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user || !expiresAt) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const now = Date.now();
    // Refresh 60s before expiry, minimum 15s from now
    const msUntil = Math.max(expiresAt - 60000 - now, 15000);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Fire a lightweight GET which will trigger apiClient refresh path if needed
      apiClient.get('/api/v1/tenants/current').catch(() => {});
    }, msUntil);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, expiresAt]);

  return null;
};

export default TokenRefresher;

