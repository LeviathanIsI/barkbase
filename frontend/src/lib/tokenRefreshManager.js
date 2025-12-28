/**
 * =============================================================================
 * Token Refresh Manager
 * =============================================================================
 *
 * Proactively refreshes Cognito access tokens before they expire.
 *
 * - Decodes JWT to get expiration time
 * - Sets a timer to refresh ~5 minutes before expiry
 * - Updates auth store with new access token
 * - Handles refresh failures by redirecting to login
 *
 * =============================================================================
 */

import { auth } from './apiClient';

// Refresh 5 minutes before token expires
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Minimum time before we bother setting a refresh timer (30 seconds)
const MIN_REFRESH_INTERVAL_MS = 30 * 1000;

let refreshTimerId = null;
let isRefreshing = false;

/**
 * Decode a JWT token payload without verification.
 * We only need the expiration time, not to verify the signature.
 */
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Handle base64url encoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[TokenRefresh] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Get the expiration timestamp from a JWT token.
 * @returns {number|null} Expiration timestamp in milliseconds, or null if invalid
 */
function getTokenExpiration(token) {
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;

  // exp is in seconds, convert to milliseconds
  return payload.exp * 1000;
}

/**
 * Calculate time until token expires.
 * @returns {number} Milliseconds until expiration (negative if expired)
 */
function getTimeUntilExpiry(token) {
  const expiresAt = getTokenExpiration(token);
  if (!expiresAt) return -1;

  return expiresAt - Date.now();
}

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

/**
 * Clear the refresh timer.
 */
export function clearRefreshTimer() {
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

/**
 * Perform the token refresh.
 * @returns {Promise<string|null>} New access token or null if refresh failed
 */
async function performRefresh() {
  if (isRefreshing) {
    return null;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.warn('[TokenRefresh] No refresh token available in sessionStorage');
    return null;
  }

  isRefreshing = true;

  try {
    const result = await auth.refreshSession({ refreshToken });

    if (!result?.accessToken) {
      throw new Error('No access token in refresh response');
    }
    return result.accessToken;
  } catch (error) {
    console.error('[TokenRefresh] ❌ Cognito refresh failed:', error);
    console.error('[TokenRefresh] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
    });

    // Clear stored tokens and redirect to login
    try {
      sessionStorage.removeItem('barkbase_refresh_token');
    } catch {}

    return null;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Schedule a token refresh.
 * @param {string} accessToken - Current access token
 * @param {function} onRefreshSuccess - Callback when refresh succeeds, receives new access token
 * @param {function} onRefreshFailure - Callback when refresh fails
 */
export function scheduleTokenRefresh(accessToken, onRefreshSuccess, onRefreshFailure) {
  // Clear any existing timer
  clearRefreshTimer();

  if (!accessToken) {
    return;
  }

  const timeUntilExpiry = getTimeUntilExpiry(accessToken);
  const expiresAt = getTokenExpiration(accessToken);

  if (timeUntilExpiry < 0) {
    // Token already expired, try to refresh immediately
    performRefresh().then((newToken) => {
      if (newToken) {
        onRefreshSuccess?.(newToken);
        // Schedule next refresh
        scheduleTokenRefresh(newToken, onRefreshSuccess, onRefreshFailure);
      } else {
        onRefreshFailure?.();
      }
    });
    return;
  }

  // Calculate when to refresh (5 minutes before expiry)
  const refreshIn = Math.max(timeUntilExpiry - REFRESH_BUFFER_MS, MIN_REFRESH_INTERVAL_MS);

  const refreshTime = new Date(Date.now() + refreshIn);

  refreshTimerId = setTimeout(async () => {
    const newToken = await performRefresh();

    if (newToken) {
      onRefreshSuccess?.(newToken);
      // Schedule next refresh for the new token
      scheduleTokenRefresh(newToken, onRefreshSuccess, onRefreshFailure);
    } else {
      onRefreshFailure?.();
    }
  }, refreshIn);
}

/**
 * Initialize token refresh management.
 * Call this after login or when the app loads with an existing session.
 * @param {string} accessToken - Current access token
 * @param {function} updateAccessToken - Function to update access token in state
 * @param {function} onSessionExpired - Function to call when session cannot be refreshed
 */
export function initTokenRefresh(accessToken, updateAccessToken, onSessionExpired) {
  scheduleTokenRefresh(
    accessToken,
    (newToken) => {
      updateAccessToken?.(newToken);
    },
    () => {
      onSessionExpired?.();
    }
  );
}

/**
 * Handle app visibility change.
 * Re-check token when app comes back to foreground.
 */
export function setupVisibilityHandler(accessToken, updateAccessToken, onSessionExpired) {
  if (typeof document === 'undefined') return () => {};

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {

      // Get current access token from store
      import('@/stores/auth').then(({ useAuthStore }) => {
        const currentToken = useAuthStore.getState().accessToken;
        if (currentToken) {
          const timeUntilExpiry = getTimeUntilExpiry(currentToken);

          if (timeUntilExpiry < REFRESH_BUFFER_MS) {
            // Token expired or about to expire, refresh immediately
            performRefresh().then((newToken) => {
              if (newToken) {
                updateAccessToken?.(newToken);
                scheduleTokenRefresh(newToken, updateAccessToken, onSessionExpired);
              } else {
                onSessionExpired?.();
              }
            });
          } else {
            // Token still valid, ensure timer is running
            scheduleTokenRefresh(currentToken, updateAccessToken, onSessionExpired);
          }
        }
      });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

export default {
  initTokenRefresh,
  clearRefreshTimer,
  scheduleTokenRefresh,
  setupVisibilityHandler,
  getTimeUntilExpiry,
};
