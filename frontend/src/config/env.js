/**
 * =============================================================================
 * BarkBase Environment Configuration
 * =============================================================================
 *
 * Centralized configuration module for all environment variables.
 * All app code should import from this module instead of accessing
 * import.meta.env directly.
 *
 * USAGE:
 * ------
 * import { config } from '@/config/env';
 *
 * =============================================================================
 */

// =============================================================================
// ENVIRONMENT FLAGS
// =============================================================================

/**
 * Development mode flag
 */
export const isDevelopment = import.meta.env.DEV;

/**
 * Production mode flag
 */
export const isProduction = import.meta.env.PROD;

// =============================================================================
// AUTHENTICATION CONFIG
// =============================================================================

/**
 * Authentication mode:
 *
 * SUPPORTED (Production):
 * - 'embedded' (default, RECOMMENDED): Direct Cognito USER_PASSWORD_AUTH from
 *   BarkBase's own login form. Best for branded login experience.
 * - 'hosted': Cognito Hosted UI with OAuth2 + PKCE redirect flow. Good for
 *   SSO/social login integrations.
 * - 'password': Alias for 'embedded'.
 *
 * LEGACY (Dev-only, BLOCKED in production):
 * - 'db': Legacy database-based authentication. Does NOT integrate with Cognito
 *   properly and will be blocked in production builds. See aws-client/db-auth-client.js.
 */
export const authMode = (import.meta.env.VITE_AUTH_MODE || 'embedded').toLowerCase();

/**
 * AWS Region for Cognito and other services
 */
export const awsRegion = import.meta.env.VITE_COGNITO_REGION || import.meta.env.VITE_AWS_REGION || 'us-east-2';

/**
 * Cognito User Pool ID
 */
export const cognitoUserPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';

/**
 * Cognito User Pool Client ID
 */
export const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

/**
 * Cognito Domain (without https://)
 * Example: barkbase-dev-4375.auth.us-east-2.amazoncognito.com
 */
export const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN || '';

/**
 * Full Cognito Domain URL (with https://)
 */
export const cognitoDomainUrl = cognitoDomain ? `https://${cognitoDomain}` : '';

/**
 * OAuth redirect URI after login
 */
export const redirectUri = import.meta.env.VITE_REDIRECT_URI ||
  (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '');

/**
 * Logout redirect URI
 */
export const logoutUri = import.meta.env.VITE_LOGOUT_URI ||
  (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * Cognito Issuer URL for JWT validation
 */
export const cognitoIssuerUrl = cognitoUserPoolId
  ? `https://cognito-idp.${awsRegion}.amazonaws.com/${cognitoUserPoolId}`
  : '';

/**
 * Check if Cognito is properly configured
 */
export const isCognitoConfigured = !!(cognitoUserPoolId && cognitoClientId && cognitoDomain);

// =============================================================================
// API CONFIG
// =============================================================================

/**
 * API Gateway base URL
 */
export const apiBaseUrl = import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL_UNIFIED ||
  '/api';

// =============================================================================
// REAL-TIME / WEBSOCKET CONFIG (Optional)
// =============================================================================

/**
 * WebSocket feature flag
 */
export const websocketEnabled = import.meta.env.VITE_WEBSOCKET_ENABLED === 'true';

/**
 * WebSocket URL for real-time updates
 */
export const websocketUrl = import.meta.env.VITE_WS_URL || '';

/**
 * Real-time service URL (alternative naming)
 */
export const realtimeUrl = import.meta.env.VITE_REALTIME_URL || '';

// =============================================================================
// RUNTIME VALIDATION
// =============================================================================

/**
 * Validate critical configuration on startup
 */
(() => {
  const warnings = [];
  const errors = [];

  // Production-only checks
  if (isProduction) {
    // DB auth is NOT supported in production
    if (authMode === 'db') {
      errors.push(
        'AUTH_MODE="db" is NOT SUPPORTED in production. ' +
        'DB auth is a legacy/dev-only mode. ' +
        'Please use AUTH_MODE="embedded" (recommended) or AUTH_MODE="hosted". ' +
        'The app will fall back to Cognito embedded auth.'
      );
    }

    // Cognito must be configured in production
    if (!cognitoClientId) {
      errors.push('VITE_COGNITO_CLIENT_ID is required for production - authentication will not work');
    }

    if (authMode === 'hosted' && !cognitoDomain) {
      errors.push('VITE_COGNITO_DOMAIN is required for hosted UI auth mode in production');
    }
  }

  // Development warnings (non-blocking)
  if (isDevelopment) {
    if (!apiBaseUrl || apiBaseUrl === '/api') {
      warnings.push('VITE_API_URL is not set - API calls will use relative /api path');
    }

    if (authMode === 'db') {
      warnings.push(
        'Using legacy DB auth mode (VITE_AUTH_MODE="db"). ' +
        'This mode is DEV-ONLY and will be blocked in production. ' +
        'SignUp flow is BROKEN in this mode.'
      );
    } else if (!cognitoClientId) {
      warnings.push('VITE_COGNITO_CLIENT_ID is not set - authentication will not work');
    }

    if (authMode === 'hosted' && !cognitoDomain) {
      warnings.push('VITE_COGNITO_DOMAIN is required for hosted UI auth mode');
    }
  }

  // Log errors (production issues)
  if (errors.length > 0) {
    console.error('[BarkBase Config] CONFIGURATION ERRORS:');
    errors.forEach(e => console.error(`  ❌ ${e}`));
  }

  // Log warnings (dev hints)
  if (warnings.length > 0) {
    console.warn('[BarkBase Config] Environment warnings:');
    warnings.forEach(w => console.warn(`  ⚠️ ${w}`));
  }
})();

// =============================================================================
// COMBINED CONFIG OBJECT
// =============================================================================

/**
 * Combined configuration object for easy import
 */
export const config = {
  // Environment flags
  isDevelopment,
  isProduction,

  // Auth config
  authMode,
  awsRegion,
  cognitoUserPoolId,
  cognitoClientId,
  cognitoDomain,
  cognitoDomainUrl,
  redirectUri,
  logoutUri,
  cognitoIssuerUrl,
  isCognitoConfigured,

  // API config
  apiBaseUrl,

  // Real-time config
  websocketEnabled,
  websocketUrl,
  realtimeUrl,
};

export default config;

