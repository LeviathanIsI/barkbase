/**
 * =============================================================================
 * AWS Client Factory
 * =============================================================================
 *
 * Creates an AWS client based on the configured authentication mode.
 *
 * SUPPORTED AUTH MODES (Production):
 * -----------------------------------
 * Cognito-based authentication is the ONLY supported auth mode for production
 * deployments. BarkBase is an enterprise SaaS application that requires proper
 * identity management via AWS Cognito.
 *
 * - 'embedded' (default): Direct Cognito USER_PASSWORD_AUTH from BarkBase's
 *   own login form. Uses CognitoPasswordClient. RECOMMENDED for most deployments.
 * - 'hosted': Uses Cognito Hosted UI with OAuth2 + PKCE redirect flow.
 *   Uses LambdaAuthClient. Good for SSO/social login integrations.
 * - 'password': Alias for 'embedded' (direct Cognito USER_PASSWORD_AUTH).
 *
 * LEGACY / DEV-ONLY MODE:
 * -----------------------
 * - 'db': Legacy database-based authentication. BLOCKED in production builds.
 *   Only available in development for testing without Cognito setup.
 *   See db-auth-client.js for details on why this mode is unsupported.
 *
 * The auth client provides:
 * - signIn({ email, password }): Authenticates user (embedded mode)
 * - signIn(): Redirects to Cognito Hosted UI (hosted mode)
 * - signOut(): Logs out and clears session
 * - handleCallback(): Exchanges OAuth code for tokens (hosted mode only)
 * - refreshSession(): Refreshes the access token
 * - getIdToken(): Gets the current ID token
 *
 * =============================================================================
 */

import { LambdaAuthClient } from './lambda-auth-client';
import { CognitoPasswordClient } from './cognito-password-client';
import { DbAuthClient } from './db-auth-client';
import { S3Client } from './aws-s3-client';
import { ApiClient } from './aws-api-client';
import { config } from '@/config/env';

/**
 * Check if running in production mode
 */
const isProduction = import.meta.env.PROD;

/**
 * Factory function to create a new AWS client.
 * @param {object} overrideConfig - Optional configuration overrides
 * @returns {object} Client with auth, storage, and from methods
 */
export const createAWSClient = (overrideConfig = {}) => {
  // Merge environment config with any overrides
  const clientConfig = {
    region: config.awsRegion,
    userPoolId: config.cognitoUserPoolId,
    clientId: config.cognitoClientId,
    apiUrl: config.apiBaseUrl,
    cognitoDomain: config.cognitoDomainUrl, // Full URL with https://
    redirectUri: config.redirectUri,
    logoutUri: config.logoutUri,
    ...overrideConfig,
  };

  // Select auth client based on mode
  const mode = (overrideConfig.authMode || config.authMode || 'embedded').toLowerCase();

  let auth;
  switch (mode) {
    case 'embedded':
    case 'password':
      // Direct Cognito USER_PASSWORD_AUTH from BarkBase's own login form
      // This is the RECOMMENDED mode for production deployments
      auth = new CognitoPasswordClient(clientConfig);
      break;

    case 'hosted':
      // Cognito Hosted UI with OAuth2 + PKCE redirect
      // Good for SSO/social login integrations
      auth = new LambdaAuthClient(clientConfig);
      break;

    case 'db':
      // LEGACY: Database-based authentication - DEV ONLY
      // This mode is BLOCKED in production builds
      if (isProduction) {
        console.error(
          '[BarkBase Auth] ERROR: AUTH_MODE="db" is not supported in production. ' +
          'DB auth is a legacy/dev-only mode that does not integrate with Cognito. ' +
          'Please use AUTH_MODE="embedded" (recommended) or AUTH_MODE="hosted". ' +
          'Falling back to Cognito embedded auth.'
        );
        auth = new CognitoPasswordClient(clientConfig);
      } else {
        // Allow in development with a clear warning
        console.warn(
          '[BarkBase Auth] WARNING: Using legacy DB auth mode. ' +
          'This mode is DEV-ONLY and will be blocked in production. ' +
          'SignUp flow is BROKEN in this mode. Use Cognito-based auth for full functionality.'
        );
        auth = new DbAuthClient(clientConfig);
      }
      break;

    default:
      // Default to embedded (direct Cognito) for BarkBase-branded login
      if (mode !== 'embedded') {
        console.warn(
          `[BarkBase Auth] Unknown AUTH_MODE="${mode}". ` +
          'Falling back to "embedded" (Cognito USER_PASSWORD_AUTH).'
        );
      }
      auth = new CognitoPasswordClient(clientConfig);
      break;
  }

  return {
    auth,
    storage: new S3Client(clientConfig, auth),
    from: (table) => new ApiClient(table, clientConfig, auth),
  };
};
