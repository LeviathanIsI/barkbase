import { useEffect } from 'react';

import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { isSessionExpired } from '@/lib/sessionManager';

/**
 * SessionExpiryMonitor Component
 * Monitors session expiry and automatically logs out users at 11:59 PM
 */
const SessionExpiryMonitor = () => {
  const { sessionStartTime, sessionExpiryTime, clearAuth, isAuthenticated } = useAuthStore();
  const autoLogoutIntervalHours = useTenantStore((s) => s.tenant?.autoLogoutIntervalHours || 24);

  useEffect(() => {
    // Only run if user is authenticated
    if (!isAuthenticated()) {
      return;
    }

    // Check session expiry every minute
    const checkInterval = setInterval(() => {
      if (sessionStartTime && sessionExpiryTime) {
        const intervalHours = autoLogoutIntervalHours;
        
        if (isSessionExpired(sessionStartTime, sessionExpiryTime, intervalHours)) {
          console.log('[SessionMonitor] Session expired, logging out');
          clearAuth();
          
          // Clear any cached data
          try {
            sessionStorage.removeItem('barkbase_refresh_token');
            sessionStorage.removeItem('barkbase_return_path');
          } catch (e) {
            // ignore
          }
          
          // Redirect to login
          window.location.href = '/login';
        }
      }
    }, 60 * 1000); // Check every minute

    // Also check immediately on mount
    if (sessionStartTime && sessionExpiryTime) {
      const intervalHours = autoLogoutIntervalHours;
      if (isSessionExpired(sessionStartTime, sessionExpiryTime, intervalHours)) {
        console.log('[SessionMonitor] Session already expired on mount');
        clearAuth();
        window.location.href = '/login';
      }
    }

    return () => clearInterval(checkInterval);
  }, [sessionStartTime, sessionExpiryTime, clearAuth, isAuthenticated, autoLogoutIntervalHours]);

  return null; // This component doesn't render anything
};

export default SessionExpiryMonitor;
