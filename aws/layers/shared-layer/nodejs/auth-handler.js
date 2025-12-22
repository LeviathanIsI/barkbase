/**
 * =============================================================================
 * BarkBase Auth Handler
 * =============================================================================
 *
 * Middleware for authenticating Lambda requests using Cognito JWTs.
 *
 * AUTHORIZATION ARCHITECTURE - DEFENSE IN DEPTH
 * ==============================================
 *
 * We follow the enterprise security pattern of separating authentication from authorization:
 *
 * COGNITO (Authentication):
 * - Validates user identity (who they are)
 * - Handles passwords, MFA, sessions
 * - Provides the `sub` (user ID) we can trust
 * - Provides verified email
 *
 * DATABASE (Authorization):
 * - Determines tenant membership (which tenant they belong to)
 * - Determines role/permissions (what they can do)
 * - Single source of truth for access control
 * - User.status and Tenant.status must be 'active'
 *
 * WHY THIS PATTERN:
 * 1. Cognito custom attributes CAN be mutable (ours are, due to existing User Pool)
 * 2. Even with immutable attributes, defense-in-depth is best practice
 * 3. If Cognito is compromised, authorization layer remains secure
 * 4. Allows role/tenant changes without touching Cognito (instant effect)
 * 5. Audit trail lives in our database
 *
 * NEVER USE FOR AUTHORIZATION:
 * - custom:tenantId from token (UNTRUSTED)
 * - custom:role from token (UNTRUSTED)
 * - Any Cognito custom attribute for access decisions
 *
 * ALWAYS USE:
 * - Database lookup by cognito_sub (User.cognito_sub column)
 * - getUserAuthorizationFromDB() function
 *
 * =============================================================================
 */

const { validateAuthHeader } = require('./jwt-validator');
// Note: extractUserFromToken is exported from security-utils but NOT used here
// authenticateRequest uses getUserAuthorizationFromDB for authorization (defense-in-depth)

// Request-scoped cache for user authorization to avoid multiple DB hits per request
// Using WeakMap allows GC to clean up after request completes
const requestAuthCache = new WeakMap();

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
    userPoolId,
    jwksUrl: process.env.COGNITO_JWKS_URL ||
      `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
    issuer: process.env.COGNITO_ISSUER_URL ||
      `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    clientId,
  };
}

/**
 * Validate session age against tenant's auto_logout_interval_hours
 *
 * NEW SCHEMA NOTES:
 * - UserSession has user_id FK (not cognito_sub column)
 * - Column names: session_start, last_activity (not session_start_time, last_activity_time)
 * - No updated_at column on UserSession
 * - Auto logout hours stored in TenantSettings (via JSONB or we default to 24h)
 *
 * @param {string} cognitoSub - User's Cognito sub
 * @param {string} tenantId - Tenant ID (UUID)
 * @returns {Promise<object>} Validation result
 */
async function validateSessionAge(cognitoSub, tenantId) {
  try {
    const { query } = require('/opt/nodejs/db');

    // NEW SCHEMA: UserSession has user_id FK, not cognito_sub
    // Need to join through User to find session by cognito_sub
    // Auto logout hours from TenantSettings (default 24h if not set)
    const result = await query(
      `SELECT
        s.record_id as session_id,
        s.session_start,
        s.last_activity,
        s.user_id,
        COALESCE((ts.notification_prefs->>'auto_logout_hours')::INTEGER, 24) as auto_logout_hours
       FROM "UserSession" s
       JOIN "User" u ON s.user_id = u.record_id
       LEFT JOIN "TenantSettings" ts ON s.tenant_id = ts.tenant_id
       WHERE u.cognito_sub = $1
         AND s.tenant_id = $2
         AND s.is_active = true
       ORDER BY s.session_start DESC
       LIMIT 1`,
      [cognitoSub, tenantId]
    );

    if (!result.rows.length) {
      return {
        valid: false,
        code: 'SESSION_NOT_FOUND',
        message: 'No active session found. Please log in again.',
      };
    }

    const { session_id, session_start, auto_logout_hours, user_id } = result.rows[0];
    const intervalHours = auto_logout_hours || 24;
    const maxAgeMs = intervalHours * 60 * 60 * 1000;
    const sessionAgeMs = Date.now() - new Date(session_start).getTime();

    if (sessionAgeMs > maxAgeMs) {
      // Session expired - mark as inactive
      // NEW SCHEMA: Use user_id instead of cognito_sub
      await query(
        `UPDATE "UserSession"
         SET is_active = false, logged_out_at = NOW()
         WHERE user_id = $1 AND is_active = true`,
        [user_id]
      );

      return {
        valid: false,
        code: 'SESSION_EXPIRED',
        message: `Session expired after ${intervalHours} hours. Please log in again.`,
        sessionAge: sessionAgeMs,
        maxAge: maxAgeMs,
      };
    }

    // Update last activity time
    // NEW SCHEMA: Column is last_activity, no updated_at
    await query(
      `UPDATE "UserSession"
       SET last_activity = NOW()
       WHERE record_id = $1`,
      [session_id]
    );

    return {
      valid: true,
      sessionAge: sessionAgeMs,
      maxAge: maxAgeMs,
      remainingMs: maxAgeMs - sessionAgeMs,
    };

  } catch (error) {
    console.error('[SESSION] Validation error:', error);
    return {
      valid: false,
      code: 'SESSION_VALIDATION_ERROR',
      message: 'Failed to validate session',
    };
  }
}

/**
 * Get user authorization context from database.
 * This is the ONLY source of truth for tenant membership and roles.
 *
 * SECURITY: This function implements defense-in-depth by looking up
 * authorization from the database, NOT from Cognito token claims.
 *
 * NEW SCHEMA NOTES:
 * - User table has NO role column - use UserRole junction table
 * - Roles are in Role table, linked via UserRole
 * - Permissions are in Permission table, linked via RolePermission
 * - No deleted_at columns - use DeletedRecord archive table
 * - TenantSettings is a separate 1:1 table (contains timezone, etc.)
 *
 * @param {string} cognitoSub - The Cognito user ID (sub claim from JWT)
 * @returns {Promise<Object|null>} User authorization context or null if not found/inactive
 */
async function getUserAuthorizationFromDB(cognitoSub) {
  if (!cognitoSub) {
    console.warn('[AUTH] No cognitoSub provided for authorization lookup');
    return null;
  }

  try {
    const { query } = require('/opt/nodejs/db');

    // NEW SCHEMA: Role comes from UserRole -> Role junction tables
    // No deleted_at columns - records are either in table or in DeletedRecord archive
    const result = await query(
      `SELECT
        u.record_id,
        u.cognito_sub,
        u.tenant_id,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        t.id as tenant_record_id,
        t.name as tenant_name,
        t.slug as tenant_slug,
        t.plan as tenant_plan,
        t.feature_flags as tenant_feature_flags,
        ts.timezone as tenant_timezone,
        COALESCE(
          (SELECT array_agg(r.name) FROM "UserRole" ur
           JOIN "Role" r ON ur.role_id = r.record_id
           WHERE ur.user_id = u.record_id),
          ARRAY[]::VARCHAR[]
        ) as roles
      FROM "User" u
      LEFT JOIN "Tenant" t ON u.tenant_id = t.id
      LEFT JOIN "TenantSettings" ts ON t.id = ts.tenant_id
      WHERE u.cognito_sub = $1
        AND u.is_active = true`,
      [cognitoSub]
    );

    if (result.rows.length === 0) {
      console.warn(`[AUTH] No user found for cognitoSub: ${cognitoSub}`);
      return null;
    }

    const user = result.rows[0];

    // Determine primary role for backwards compatibility
    // Priority: OWNER > MANAGER > STAFF > RECEPTIONIST > GROOMER > VIEWER
    const roleHierarchy = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'STAFF', 'RECEPTIONIST', 'GROOMER', 'VIEWER'];
    const userRoles = user.roles || [];
    const primaryRole = roleHierarchy.find(r => userRoles.map(ur => ur?.toUpperCase()).includes(r)) || userRoles[0] || null;

    console.log(`[AUTH] Authorization loaded from DB: userId=${user.record_id}, cognitoSub=${user.cognito_sub}, tenant=${user.tenant_id}, roles=${userRoles.join(',')}, primaryRole=${primaryRole}`);

    return {
      // User identification
      // BACKWARDS COMPATIBILITY: Many handlers use user.id expecting cognitoSub
      // We preserve this behavior while also providing explicit fields
      id: user.cognito_sub,           // For backwards compat (handlers expect cognito sub here)
      visibleId: user.cognito_sub,    // For backwards compat
      cognitoSub: user.cognito_sub,   // Explicit cognito sub
      userId: user.record_id,         // Database User.record_id (UUID)
      recordId: user.record_id,       // Database User.record_id (UUID)

      // AUTHORIZATION - from DATABASE via UserRole junction table
      tenantId: user.tenant_id,
      roles: userRoles,               // NEW: Array of role names from UserRole junction
      role: primaryRole,              // BACKWARDS COMPAT: Primary role for legacy code

      // User profile
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      isActive: user.is_active,

      // Tenant context
      tenant: user.tenant_id ? {
        id: user.tenant_id,
        recordId: user.tenant_record_id,
        name: user.tenant_name,
        slug: user.tenant_slug,
        plan: user.tenant_plan,
        featureFlags: user.tenant_feature_flags,
        timezone: user.tenant_timezone,
      } : null,

      // Authorization metadata
      _authSource: 'database', // Marker to indicate this came from DB, not token
    };
  } catch (error) {
    console.error('[AUTH] Database authorization lookup failed:', error.message);
    // Don't throw - return null to indicate authorization lookup failed
    return null;
  }
}

/**
 * Get user authorization with request-scoped caching.
 * Uses WeakMap to cache per-request to avoid multiple DB hits.
 *
 * @param {object} event - Lambda event (used as cache key)
 * @param {string} cognitoSub - The Cognito user ID
 * @returns {Promise<Object|null>} Cached or fresh user authorization
 */
async function getCachedUserAuthorization(event, cognitoSub) {
  // Check cache first
  if (requestAuthCache.has(event)) {
    const cached = requestAuthCache.get(event);
    if (cached.cognitoSub === cognitoSub) {
      console.log('[AUTH] Using cached authorization for user:', cached.id);
      return cached;
    }
  }

  // Fetch from database
  const authorization = await getUserAuthorizationFromDB(cognitoSub);

  // Cache the result (even if null, to avoid repeated lookups)
  if (authorization) {
    requestAuthCache.set(event, authorization);
  }

  return authorization;
}

/**
 * Check if request is an admin request from Ops Center
 * Admin requests come via IAM-authorized /admin/v1/* routes
 *
 * SECURITY: Admin routes MUST be authenticated via AWS IAM, not just headers.
 * The X-Admin-User header is only trusted AFTER IAM validation passes.
 *
 * @param {object} event - Lambda event
 * @returns {boolean} True if this is a valid admin request
 */
function isAdminRequest(event) {
  // Check if already flagged as admin by handleAdminPathRewrite
  if (event.isAdminRequest === true) {
    return true;
  }

  const path = event.requestContext?.http?.path || event.path || '';

  // Must be an admin path
  if (!path.startsWith('/admin/v1/')) {
    return false;
  }

  // SECURITY: Validate IAM authentication
  // API Gateway sets these when using AWS_IAM authorization
  const requestContext = event.requestContext || {};
  const identity = requestContext.identity || {};
  const iamAuthorizer = requestContext.authorizer?.iam || {};

  // Check for IAM authentication markers set by API Gateway
  const hasIamAuth = !!(
    identity.userArn ||
    identity.caller ||
    identity.accountId ||
    iamAuthorizer.userArn ||
    iamAuthorizer.cognitoIdentityId
  );

  if (!hasIamAuth) {
    console.warn('[AUTH] Admin request REJECTED - no IAM authentication present');
    console.warn('[AUTH] Path:', path);
    console.warn('[AUTH] Request context identity:', JSON.stringify(identity));
    return false;
  }

  // Validate the caller ARN matches expected Ops Lambda role (optional additional check)
  const callerArn = identity.userArn || iamAuthorizer.userArn || '';

  // Log for audit purposes
  console.log('[AUTH] IAM-authenticated admin request from:', callerArn);

  // Now we can trust the X-Admin-User header for audit logging
  const adminUser = event.headers?.['x-admin-user'] || event.headers?.['X-Admin-User'];
  if (adminUser) {
    event.adminOperator = adminUser; // Store for audit logging
    console.log('[AUTH] Admin operator (from header):', adminUser);
  }

  return true;
}

/**
 * Create admin user context from headers
 * @param {object} event - Lambda event
 * @returns {object} Admin user context
 */
function getAdminContext(event) {
  const headers = event.headers || {};
  const adminUser = headers['x-admin-user'] || headers['X-Admin-User'];
  const tenantId = headers['x-tenant-id'] || headers['X-Tenant-Id'];

  return {
    id: 'ops-admin',
    email: adminUser,
    tenantId: tenantId || null,
    role: 'ops_admin',
    isAdmin: true,
  };
}

/**
 * Authenticate a Lambda event
 * @param {object} event - Lambda event
 * @param {object} options - Auth options
 * @param {boolean} options.skipSessionCheck - Skip session age validation (for login/logout)
 * @returns {Promise<object>} Auth result with user info
 */
async function authenticateRequest(event, options = {}) {
  // Check for admin requests from Ops Center (IAM-authorized)
  // These requests are already authenticated at the API Gateway level via IAM
  if (isAdminRequest(event)) {
    // Rewrite path for internal routing (/admin/v1/* -> /api/v1/*)
    if (event.path) {
      event.path = event.path.replace('/admin/v1/', '/api/v1/');
    }
    if (event.rawPath) {
      event.rawPath = event.rawPath.replace('/admin/v1/', '/api/v1/');
    }
    if (event.requestContext?.http?.path) {
      event.requestContext.http.path = event.requestContext.http.path.replace('/admin/v1/', '/api/v1/');
    }

    console.log('[AUTH] Admin request detected, using IAM authentication');
    console.log('[AUTH] Rewrote path to:', event.path || event.requestContext?.http?.path);

    return {
      authenticated: true,
      user: getAdminContext(event),
      payload: null,
      error: null,
      code: null,
      isAdmin: true,
    };
  }

  const config = { ...getAuthConfig(), ...options };
  const skipSessionCheck = options.skipSessionCheck || false;

  // Extract authorization header (case-insensitive)
  const headers = event.headers || {};
  const authHeader = headers.Authorization || headers.authorization || '';

  if (!authHeader) {
    return {
      authenticated: false,
      error: 'No authorization header',
      code: 'UNAUTHORIZED',
      user: null,
    };
  }

  try {
    // Step 1: Validate JWT token (AUTHENTICATION)
    const payload = await validateAuthHeader(authHeader, {
      jwksUrl: config.jwksUrl,
      issuer: config.issuer,
      clientId: config.clientId,
      tokenType: 'access',
    });

    // Step 2: Get user AUTHORIZATION from DATABASE (not from token claims!)
    // This is the defense-in-depth pattern - we only trust the sub (user ID) from JWT
    const cognitoSub = payload.sub;
    const user = await getCachedUserAuthorization(event, cognitoSub);

    if (!user) {
      console.warn('[AUTH] User not found or inactive in database for sub:', cognitoSub);
      return {
        authenticated: false,
        error: 'User account not found or inactive',
        code: 'USER_NOT_FOUND',
        user: null,
      };
    }

    // Check session age unless explicitly skipped (e.g., for login/logout endpoints)
    if (!skipSessionCheck && user.tenantId) {
      const sessionCheck = await validateSessionAge(user.cognitoSub, user.tenantId);

      if (!sessionCheck.valid) {
        return {
          authenticated: false,
          error: sessionCheck.message,
          code: sessionCheck.code,
          user: null,
        };
      }
    }

    return {
      authenticated: true,
      user,
      payload,
      error: null,
      code: null,
    };
  } catch (error) {
    console.error('[AUTH] Authentication failed:', error.message);

    return {
      authenticated: false,
      error: error.message,
      code: 'INVALID_TOKEN',
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
 * Validate request origin against allowed origins list
 * Returns the matching origin if valid, or first allowed origin as fallback
 *
 * @param {string} requestOrigin - Origin header from request
 * @param {string} allowedOrigins - Comma-separated list of allowed origins
 * @returns {string} Valid origin to use in CORS header
 */
function getCorsOrigin(requestOrigin, allowedOrigins) {
  const allowedList = allowedOrigins.split(',').map(o => o.trim()).filter(Boolean);

  // If no origins configured, use a safe default
  if (allowedList.length === 0) {
    return 'http://localhost:5173';
  }

  // Check if request origin is in the allowed list
  if (requestOrigin && allowedList.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Check for wildcard (only in development!)
  if (allowedList.includes('*')) {
    console.warn('[AUTH] CORS wildcard enabled - this should only be used in development');
    return requestOrigin || '*';
  }

  // Log blocked origins for debugging (but don't expose in production)
  if (requestOrigin && !allowedList.includes(requestOrigin)) {
    console.warn(`[AUTH] CORS origin not in allowed list: ${requestOrigin}`);
  }

  // Default to first allowed origin (for non-browser requests or blocked origins)
  return allowedList[0];
}

// Store request context for CORS (set by handler before calling createResponse)
let currentRequestOrigin = null;

/**
 * Set the current request origin (call this at start of each request)
 * @param {object} event - Lambda event
 */
function setRequestContext(event) {
  currentRequestOrigin = event?.headers?.origin || event?.headers?.Origin || null;
}

/**
 * Create response with CORS headers
 * @param {number} statusCode - HTTP status code
 * @param {object} body - Response body
 * @param {object} headers - Additional headers
 * @returns {object} Lambda response
 */
function createResponse(statusCode, body, headers = {}, options = {}) {
  const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:5173';
  const corsOrigin = getCorsOrigin(currentRequestOrigin, corsOrigins);

  // Import security headers utility
  const { mergeSecurityHeaders } = require('./security-headers');

  // Determine if this is an auth endpoint based on common patterns
  // This is a heuristic - can be overridden by passing X-Auth-Endpoint header
  const isAuthEndpoint = headers['X-Auth-Endpoint'] === 'true';

  // Remove the marker header if present
  delete headers['X-Auth-Endpoint'];

  // Cache control options for performance optimization
  const {
    cacheable = false,
    maxAge = 0,
    private: isPrivate = true,
    staleWhileRevalidate = 0,
  } = options;

  // Build cache headers
  let cacheHeaders = {};
  if (cacheable && statusCode === 200) {
    // Generate ETag for cacheable responses
    const crypto = require('crypto');
    const content = typeof body === 'string' ? body : JSON.stringify(body);
    const etag = `"${crypto.createHash('md5').update(content).digest('hex')}"`;

    let cacheControl = isPrivate ? 'private' : 'public';
    cacheControl += `, max-age=${maxAge}`;
    if (staleWhileRevalidate > 0) {
      cacheControl += `, stale-while-revalidate=${staleWhileRevalidate}`;
    }

    cacheHeaders = {
      'Cache-Control': cacheControl,
      'ETag': etag,
    };
  } else {
    cacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    };
  }

  // Merge security headers with CORS, cache, and custom headers
  const finalHeaders = mergeSecurityHeaders(
    {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Tenant-Id,X-Request-Id',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      ...cacheHeaders,
      ...headers,
    },
    isAuthEndpoint
  );

  return {
    statusCode,
    headers: finalHeaders,
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

  // Session errors (401)
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_VALIDATION_ERROR: 'SESSION_VALIDATION_ERROR',

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
  isAdminRequest,
  getAdminContext,
  authenticateRequest,
  validateSessionAge,
  requireAuth,
  createResponse,
  parseBody,
  getPathParams,
  getQueryParams,
  // CORS utilities
  setRequestContext,
  getCorsOrigin,
  // Database authorization (defense-in-depth)
  getUserAuthorizationFromDB,
  getCachedUserAuthorization,
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

