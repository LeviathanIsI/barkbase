/**
 * SessionExpiryMonitor Component
 *
 * NOTE: Token refresh is now handled proactively by AuthLoader using tokenRefreshManager.
 * This component is kept for backwards compatibility but the main session management
 * is done via proactive token refresh (refreshing 5 minutes before JWT expiry).
 *
 * The actual Cognito access token expiry is handled by:
 * - tokenRefreshManager.js: Proactively refreshes tokens before they expire
 * - AuthLoader.jsx: Initializes token refresh on app load
 *
 * Server-side session validation via validateSessionAge() in auth-handler.js
 * will return SESSION_EXPIRED error code if needed.
 */
const SessionExpiryMonitor = () => {
  // Token refresh is now handled by AuthLoader + tokenRefreshManager
  // This component is kept as a placeholder for any future session monitoring needs
  return null;
};

export default SessionExpiryMonitor;
