/**
 * =============================================================================
 * BarkBase Auth Handler
 * =============================================================================
 * 
 * Middleware for authenticating Lambda requests using Cognito JWTs.
 * 
 * =============================================================================
 */

const { validateAuthHeader } = require('./jwt-validator');
const { extractUserFromToken } = require('./security-utils');

/**
 * Create auth middleware configuration from environment
 */
function getAuthConfig() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const region = process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2';

  if (!userPoolId) {
    console.warn('[AUTH] COGNITO_USER_POOL_ID not configured');
  }

  return {
    jwksUrl: process.env.COGNITO_JWKS_URL || 
      `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
    issuer: process.env.COGNITO_ISSUER_URL ||
      `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    clientId,
  };
}

/**
 * Authenticate a Lambda event
 * @param {object} event - Lambda event
 * @param {object} options - Auth options
 * @returns {Promise<object>} Auth result with user info
 */
async function authenticateRequest(event, options = {}) {
  const config = { ...getAuthConfig(), ...options };
  
  // Extract authorization header (case-insensitive)
  const headers = event.headers || {};
  const authHeader = headers.Authorization || headers.authorization || '';

  if (!authHeader) {
    return {
      authenticated: false,
      error: 'No authorization header',
      user: null,
    };
  }

  try {
    const payload = await validateAuthHeader(authHeader, {
      jwksUrl: config.jwksUrl,
      issuer: config.issuer,
      clientId: config.clientId,
      tokenType: 'access',
    });

    const user = extractUserFromToken(payload);

    return {
      authenticated: true,
      user,
      payload,
      error: null,
    };
  } catch (error) {
    console.error('[AUTH] Authentication failed:', error.message);
    
    return {
      authenticated: false,
      error: error.message,
      user: null,
    };
  }
}

/**
 * Create an authenticated response wrapper
 * @param {function} handler - Request handler function
 * @param {object} options - Auth options
 * @returns {function} Wrapped handler
 */
function requireAuth(handler, options = {}) {
  return async (event, context) => {
    const authResult = await authenticateRequest(event, options);

    if (!authResult.authenticated) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Unauthorized',
          message: authResult.error || 'Authentication required',
        }),
      };
    }

    // Attach user to event for handler access
    event.user = authResult.user;
    event.authPayload = authResult.payload;

    return handler(event, context);
  };
}

/**
 * Create response with CORS headers
 * @param {number} statusCode - HTTP status code
 * @param {object} body - Response body
 * @param {object} headers - Additional headers
 * @returns {object} Lambda response
 */
function createResponse(statusCode, body, headers = {}) {
  const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:5173';
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigins.split(',')[0],
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Tenant-Id,X-Request-Id',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

/**
 * Parse request body (handles both string and object)
 * @param {object} event - Lambda event
 * @returns {object} Parsed body
 */
function parseBody(event) {
  if (!event.body) {
    return {};
  }

  if (typeof event.body === 'object') {
    return event.body;
  }

  try {
    return JSON.parse(event.body);
  } catch (error) {
    console.error('[AUTH] Failed to parse request body:', error.message);
    return {};
  }
}

/**
 * Extract path parameters from event
 * @param {object} event - Lambda event
 * @returns {object} Path parameters
 */
function getPathParams(event) {
  return event.pathParameters || {};
}

/**
 * Extract query parameters from event
 * @param {object} event - Lambda event
 * @returns {object} Query parameters
 */
function getQueryParams(event) {
  return event.queryStringParameters || {};
}

module.exports = {
  authenticateRequest,
  requireAuth,
  createResponse,
  parseBody,
  getPathParams,
  getQueryParams,
  getAuthConfig,
};

