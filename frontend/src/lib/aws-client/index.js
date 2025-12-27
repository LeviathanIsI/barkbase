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

// Lazy-load auth clients to reduce initial bundle size
// AWS Cognito SDK is ~113KB - only load when actually needed
import { S3Client } from './aws-s3-client';
import { ApiClient } from './aws-api-client';
import { config } from '@/config/env';

// Cached auth client instance
let cachedAuthClient = null;
let cachedAuthMode = null;

/**
 * Check if running in production mode
 */
const isProduction = import.meta.env.PROD;

/**
 * Lazily load and cache the auth client based on mode
 * This defers the heavy AWS SDK import until actually needed
 */
const getAuthClient = async (clientConfig, mode) => {
  // Return cached client if same mode
  if (cachedAuthClient && cachedAuthMode === mode) {
    return cachedAuthClient;
  }

  let auth;
  switch (mode) {
    case 'embedded':
    case 'password': {
      // Dynamically import Cognito client (includes AWS SDK ~113KB)
      const { CognitoPasswordClient } = await import('./cognito-password-client');
      auth = new CognitoPasswordClient(clientConfig);
      break;
    }

    case 'hosted': {
      const { LambdaAuthClient } = await import('./lambda-auth-client');
      auth = new LambdaAuthClient(clientConfig);
      break;
    }

    case 'db': {
      if (isProduction) {
        console.error(
          '[BarkBase Auth] ERROR: AUTH_MODE="db" is not supported in production. ' +
          'Falling back to Cognito embedded auth.'
        );
        const { CognitoPasswordClient } = await import('./cognito-password-client');
        auth = new CognitoPasswordClient(clientConfig);
      } else {
        console.warn('[BarkBase Auth] WARNING: Using legacy DB auth mode (DEV-ONLY).');
        const { DbAuthClient } = await import('./db-auth-client');
        auth = new DbAuthClient(clientConfig);
      }
      break;
    }

    default: {
      if (mode !== 'embedded') {
        console.warn(`[BarkBase Auth] Unknown AUTH_MODE="${mode}". Falling back to "embedded".`);
      }
      const { CognitoPasswordClient } = await import('./cognito-password-client');
      auth = new CognitoPasswordClient(clientConfig);
      break;
    }
  }

  cachedAuthClient = auth;
  cachedAuthMode = mode;
  return auth;
};

/**
 * Factory function to create a new AWS client.
 * Auth client is lazy-loaded to reduce initial bundle size.
 */
export const createAWSClient = (overrideConfig = {}) => {
  const clientConfig = {
    region: config.awsRegion,
    userPoolId: config.cognitoUserPoolId,
    clientId: config.cognitoClientId,
    apiUrl: config.apiBaseUrl,
    cognitoDomain: config.cognitoDomainUrl,
    redirectUri: config.redirectUri,
    logoutUri: config.logoutUri,
    ...overrideConfig,
  };

  const mode = (overrideConfig.authMode || config.authMode || 'embedded').toLowerCase();

  // Create a lazy auth proxy that loads the real client on first use
  const lazyAuth = {
    _client: null,
    _loading: null,

    async _getClient() {
      if (this._client) return this._client;
      if (this._loading) return this._loading;
      this._loading = getAuthClient(clientConfig, mode);
      this._client = await this._loading;
      this._loading = null;
      return this._client;
    },

    // Proxy all auth methods to lazy-load the client
    async signIn(credentials) {
      const client = await this._getClient();
      return client.signIn(credentials);
    },

    async signOut() {
      const client = await this._getClient();
      return client.signOut();
    },

    async handleCallback(code) {
      const client = await this._getClient();
      return client.handleCallback?.(code);
    },

    async refreshSession(params) {
      const client = await this._getClient();
      return client.refreshSession?.(params);
    },

    async getIdToken() {
      const client = await this._getClient();
      return client.getIdToken?.();
    },

    async getAccessToken() {
      const client = await this._getClient();
      return client.getAccessToken?.();
    },

    async respondToMfaChallenge(params) {
      const client = await this._getClient();
      return client.respondToMfaChallenge?.(params);
    },
  };

  return {
    auth: lazyAuth,
    storage: new S3Client(clientConfig, lazyAuth),
    from: (table) => new ApiClient(table, clientConfig, lazyAuth),
  };
};
