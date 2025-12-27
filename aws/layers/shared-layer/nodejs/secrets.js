/**
 * =============================================================================
 * BarkBase Secrets Manager Helper
 * =============================================================================
 *
 * Provides secure access to secrets stored in AWS Secrets Manager.
 * Implements caching to minimize API calls and improve Lambda cold start times.
 *
 * Secrets are stored in: barkbase/{env}/secrets
 * Contains: DATABASE_URL, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY
 *
 * =============================================================================
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Cache secrets in memory across Lambda invocations
let cachedSecrets = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Lazy-initialized Secrets Manager client
let secretsClient = null;

/**
 * Get the Secrets Manager client (lazy initialization)
 * @returns {SecretsManagerClient}
 */
function getSecretsClient() {
  if (!secretsClient) {
    secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
    });
  }
  return secretsClient;
}

/**
 * Get the secret name based on environment
 * @returns {string} Secret name (e.g., "barkbase/dev/secrets")
 */
function getSecretName() {
  const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
  return process.env.SECRETS_NAME || `barkbase/${env}/secrets`;
}

/**
 * Fetch secrets from AWS Secrets Manager
 * Implements caching to avoid repeated API calls
 *
 * @returns {Promise<object>} Parsed secrets object
 * @throws {Error} If secrets cannot be fetched
 */
async function fetchSecrets() {
  const now = Date.now();

  // Return cached secrets if still valid
  if (cachedSecrets && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedSecrets;
  }

  const secretName = getSecretName();
  console.log(`[SECRETS] Fetching secrets from: ${secretName}`);

  try {
    const client = getSecretsClient();
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    cachedSecrets = JSON.parse(response.SecretString);
    cacheTimestamp = now;

    console.log('[SECRETS] Successfully fetched and cached secrets');
    return cachedSecrets;

  } catch (error) {
    console.error('[SECRETS] Failed to fetch secrets:', error.message);
    throw new Error(`Failed to fetch secrets from ${secretName}: ${error.message}`);
  }
}

/**
 * Get a specific secret value
 *
 * @param {string} key - Secret key (e.g., "DATABASE_URL", "GOOGLE_CLIENT_SECRET")
 * @returns {Promise<string>} Secret value
 * @throws {Error} If secret key not found
 */
async function getSecret(key) {
  const secrets = await fetchSecrets();

  if (!(key in secrets)) {
    throw new Error(`Secret key "${key}" not found in secrets`);
  }

  return secrets[key];
}

/**
 * Get DATABASE_URL from Secrets Manager
 * Falls back to environment variable for local development
 *
 * @returns {Promise<string>} Database connection URL
 */
async function getDatabaseUrl() {
  // Check environment variable first (for local dev or migration period)
  if (process.env.DATABASE_URL) {
    console.log('[SECRETS] Using DATABASE_URL from environment variable');
    return process.env.DATABASE_URL;
  }

  return getSecret('DATABASE_URL');
}

/**
 * Get GOOGLE_CLIENT_SECRET from Secrets Manager
 * Falls back to environment variable for local development
 *
 * @returns {Promise<string>} Google OAuth client secret
 */
async function getGoogleClientSecret() {
  // Check environment variable first (for local dev or migration period)
  if (process.env.GOOGLE_CLIENT_SECRET) {
    console.log('[SECRETS] Using GOOGLE_CLIENT_SECRET from environment variable');
    return process.env.GOOGLE_CLIENT_SECRET;
  }

  return getSecret('GOOGLE_CLIENT_SECRET');
}

/**
 * Get TOKEN_ENCRYPTION_KEY from Secrets Manager
 * Falls back to environment variable for local development
 *
 * @returns {Promise<string>} Token encryption key
 */
async function getTokenEncryptionKey() {
  // Check environment variable first (for local dev or migration period)
  if (process.env.TOKEN_ENCRYPTION_KEY) {
    console.log('[SECRETS] Using TOKEN_ENCRYPTION_KEY from environment variable');
    return process.env.TOKEN_ENCRYPTION_KEY;
  }

  return getSecret('TOKEN_ENCRYPTION_KEY');
}

/**
 * Preload all secrets into cache
 * Call this at Lambda cold start to minimize latency on first request
 *
 * @returns {Promise<void>}
 */
async function preloadSecrets() {
  try {
    await fetchSecrets();
    console.log('[SECRETS] Secrets preloaded successfully');
  } catch (error) {
    console.error('[SECRETS] Failed to preload secrets:', error.message);
    // Don't throw - allow Lambda to continue and try again on first request
  }
}

/**
 * Clear the secrets cache
 * Useful for testing or forcing a refresh
 */
function clearCache() {
  cachedSecrets = null;
  cacheTimestamp = null;
  console.log('[SECRETS] Cache cleared');
}

/**
 * Check if secrets are cached
 * @returns {boolean}
 */
function isCached() {
  if (!cachedSecrets || !cacheTimestamp) {
    return false;
  }
  return (Date.now() - cacheTimestamp) < CACHE_TTL_MS;
}

module.exports = {
  fetchSecrets,
  getSecret,
  getDatabaseUrl,
  getGoogleClientSecret,
  getTokenEncryptionKey,
  preloadSecrets,
  clearCache,
  isCached,
};
