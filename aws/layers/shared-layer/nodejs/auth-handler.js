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

// =============================================================================
// STANDARDIZED ERROR RESPONSE HELPERS
// =============================================================================

/**
 * Standard error codes for consistent frontend handling
 */
const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  INVALID_STATUS: 'INVALID_STATUS',

  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  OWNER_NOT_FOUND: 'OWNER_NOT_FOUND',
  PET_NOT_FOUND: 'PET_NOT_FOUND',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
};

/**
 * Create a standardized error response
 * @param {number} statusCode - HTTP status code
 * @param {string} errorType - Error type (e.g., 'ValidationError', 'NotFound')
 * @param {string} message - User-friendly error message
 * @param {string} code - Error code from ERROR_CODES
 * @param {object} details - Additional error details (optional)
 * @returns {object} Lambda response
 */
function createErrorResponse(statusCode, errorType, message, code, details = {}) {
  return createResponse(statusCode, {
    success: false,
    error: errorType,
    message,
    code: code || ERROR_CODES.INTERNAL_ERROR,
    ...details,
  });
}

/**
 * Helper for 400 Bad Request errors
 */
function badRequest(message, code = ERROR_CODES.VALIDATION_ERROR, details = {}) {
  return createErrorResponse(400, 'Bad Request', message, code, details);
}

/**
 * Helper for 401 Unauthorized errors
 */
function unauthorized(message = 'Authentication required', code = ERROR_CODES.UNAUTHORIZED) {
  return createErrorResponse(401, 'Unauthorized', message, code);
}

/**
 * Helper for 403 Forbidden errors
 */
function forbidden(message = 'Access denied', code = ERROR_CODES.FORBIDDEN) {
  return createErrorResponse(403, 'Forbidden', message, code);
}

/**
 * Helper for 404 Not Found errors
 */
function notFound(resourceType = 'Resource', code = ERROR_CODES.NOT_FOUND) {
  return createErrorResponse(404, 'Not Found', `${resourceType} not found`, code);
}

/**
 * Helper for 409 Conflict errors
 */
function conflict(message, code = ERROR_CODES.CONFLICT, details = {}) {
  return createErrorResponse(409, 'Conflict', message, code, details);
}

/**
 * Helper for 500 Internal Server errors
 */
function serverError(message = 'An unexpected error occurred', code = ERROR_CODES.INTERNAL_ERROR) {
  return createErrorResponse(500, 'Internal Server Error', message, code);
}

module.exports = {
  authenticateRequest,
  requireAuth,
  createResponse,
  parseBody,
  getPathParams,
  getQueryParams,
  // Error utilities
  ERROR_CODES,
  createErrorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
  getAuthConfig,
};

