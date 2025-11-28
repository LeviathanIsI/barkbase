/**
 * =============================================================================
 * BarkBase JWT Validator
 * =============================================================================
 * 
 * Validates Cognito JWTs using JWKS (JSON Web Key Set).
 * Implements key caching for performance.
 * 
 * =============================================================================
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS client cache (reused across Lambda invocations)
let jwksClientInstance = null;
let cachedJwksUrl = null;

/**
 * Get or create JWKS client
 */
function getJwksClient(jwksUrl) {
  if (jwksClientInstance && cachedJwksUrl === jwksUrl) {
    return jwksClientInstance;
  }

  jwksClientInstance = jwksClient({
    jwksUri: jwksUrl,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });
  cachedJwksUrl = jwksUrl;

  return jwksClientInstance;
}

/**
 * Get signing key from JWKS
 */
function getSigningKey(jwksUrl, kid) {
  return new Promise((resolve, reject) => {
    const client = getJwksClient(jwksUrl);
    
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        console.error('[JWT] Failed to get signing key:', err.message);
        reject(err);
        return;
      }
      
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

/**
 * Validate a Cognito JWT token
 * @param {string} token - The JWT token to validate
 * @param {object} options - Validation options
 * @param {string} options.jwksUrl - JWKS URL for Cognito User Pool
 * @param {string} options.issuer - Expected issuer (Cognito User Pool URL)
 * @param {string} options.clientId - Expected audience (Cognito App Client ID)
 * @param {string} [options.tokenType='access'] - Token type: 'access' or 'id'
 * @returns {Promise<object>} Decoded and validated token payload
 */
async function validateToken(token, options) {
  const { jwksUrl, issuer, clientId, tokenType = 'access' } = options;

  if (!token) {
    throw new Error('Token is required');
  }

  if (!jwksUrl || !issuer) {
    throw new Error('JWKS URL and issuer are required for token validation');
  }

  // Decode token header to get kid
  const decoded = jwt.decode(token, { complete: true });
  
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('Invalid token format - missing key ID');
  }

  const { kid } = decoded.header;

  // Get the signing key
  const signingKey = await getSigningKey(jwksUrl, kid);

  // Verify the token
  return new Promise((resolve, reject) => {
    const verifyOptions = {
      issuer,
      algorithms: ['RS256'],
    };

    // Add audience check for ID tokens
    if (tokenType === 'id' && clientId) {
      verifyOptions.audience = clientId;
    }

    jwt.verify(token, signingKey, verifyOptions, (err, payload) => {
      if (err) {
        console.error('[JWT] Token verification failed:', err.message);
        reject(err);
        return;
      }

      // Additional validation for access tokens
      if (tokenType === 'access') {
        if (payload.token_use !== 'access') {
          reject(new Error('Token is not an access token'));
          return;
        }
        
        if (clientId && payload.client_id !== clientId) {
          reject(new Error('Token client_id does not match'));
          return;
        }
      }

      // Additional validation for ID tokens
      if (tokenType === 'id' && payload.token_use !== 'id') {
        reject(new Error('Token is not an ID token'));
        return;
      }

      resolve(payload);
    });
  });
}

/**
 * Extract and validate token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @param {object} options - Validation options
 * @returns {Promise<object>} Validated token payload
 */
async function validateAuthHeader(authHeader, options) {
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  // Support both "Bearer <token>" and raw token
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  return validateToken(token, options);
}

module.exports = {
  validateToken,
  validateAuthHeader,
  getJwksClient,
};

