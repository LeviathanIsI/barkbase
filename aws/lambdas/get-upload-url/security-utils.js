/**
 * Shared Security Utilities for BarkBase Lambda Functions
 * Provides CORS handling, security headers, and audit logging
 *
 * Usage:
 *   const { getSecureHeaders, auditLog, validateRequest } = require('./shared/security-utils');
 */

// Environment-based CORS configuration
const ALLOWED_ORIGINS = {
  production: [
    'https://app.barkbase.com',
    'https://www.barkbase.com'
  ],
  staging: [
    'https://staging.barkbase.com',
    'https://staging-app.barkbase.com'
  ],
  development: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173'
  ]
};

/**
 * Get allowed CORS origin based on request origin and environment
 * Implements allowlist-based CORS to prevent CSRF attacks
 *
 * @param {string} requestOrigin - Origin from request header
 * @param {string} stage - Deployment stage (dev, staging, prod)
 * @returns {string} Allowed origin or first allowed origin as fallback
 */
function getAllowedOrigin(requestOrigin, stage = process.env.STAGE || 'development') {
  // Normalize stage name
  const normalizedStage = stage === 'dev' ? 'development' :
                          stage === 'prod' ? 'production' :
                          stage;

  // Get allowed origins for current stage
  const stageOrigins = ALLOWED_ORIGINS[normalizedStage] || ALLOWED_ORIGINS.development;

  // In development, allow all configured dev origins
  if (normalizedStage === 'development') {
    if (requestOrigin && stageOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    // Default to first dev origin
    return stageOrigins[0];
  }

  // In staging/production, strictly validate origin
  if (requestOrigin && stageOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Log unauthorized origin attempt
  console.warn(`[SECURITY] Unauthorized origin blocked: ${requestOrigin} (stage: ${normalizedStage})`);

  // Return first allowed origin as fallback (required for CORS)
  return stageOrigins[0];
}

/**
 * Get comprehensive security headers for Lambda responses
 * Implements defense-in-depth security controls
 *
 * @param {string} requestOrigin - Origin from request header
 * @param {string} stage - Deployment stage
 * @param {boolean} allowCredentials - Whether to allow credentials
 * @returns {Object} Security headers object
 */
function getSecureHeaders(requestOrigin, stage, allowCredentials = true) {
  const allowedOrigin = getAllowedOrigin(requestOrigin, stage);

  return {
    // CORS Configuration
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': allowCredentials ? 'true' : 'false',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
    'Access-Control-Max-Age': '3600', // Cache preflight for 1 hour

    // Content Security Policy (Defense against XSS)
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://cognito-idp.*.amazonaws.com https://*.execute-api.*.amazonaws.com",

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // XSS Protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // HTTPS Strict Transport Security (only in production)
    ...(stage === 'production' || stage === 'prod' ? {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    } : {}),

    // Cache Control (prevent sensitive data caching)
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

/**
 * Structured audit logging for security-relevant events
 * Logs in JSON format for CloudWatch Insights analysis
 *
 * @param {string} action - Action being performed (e.g., 'LOGIN_ATTEMPT', 'AUTHORIZATION_FAILURE')
 * @param {Object} context - Context information
 * @param {string} context.userId - User ID (if authenticated)
 * @param {string} context.tenantId - Tenant ID
 * @param {string} context.sourceIp - Source IP address
 * @param {string} context.userAgent - User agent string
 * @param {string} context.resource - Resource being accessed
 * @param {string} context.result - Result (SUCCESS, FAILURE, DENIED)
 * @param {Object} metadata - Additional metadata
 */
function auditLog(action, context = {}, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'AUDIT',
    action,
    userId: context.userId || context.sub || 'anonymous',
    tenantId: context.tenantId || 'none',
    sourceIp: context.sourceIp || 'unknown',
    userAgent: context.userAgent || 'unknown',
    resource: context.resource || 'unknown',
    result: context.result || 'UNKNOWN',
    ...metadata
  };

  // Use console.log for CloudWatch JSON parsing
  console.log(JSON.stringify(logEntry));
}

/**
 * Security event logging for monitoring and alerting
 * Triggers CloudWatch alarms for suspicious activities
 *
 * @param {string} eventType - Type of security event
 * @param {string} severity - Severity level (LOW, MEDIUM, HIGH, CRITICAL)
 * @param {Object} details - Event details
 */
function securityEvent(eventType, severity, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    level: 'SECURITY_EVENT',
    eventType,
    severity,
    ...details
  };

  console.warn(JSON.stringify(event));

  // For critical events, also use console.error for separate metric
  if (severity === 'CRITICAL') {
    console.error(`[CRITICAL_SECURITY_EVENT] ${eventType}`, event);
  }
}

/**
 * Extract request metadata for audit logging
 *
 * @param {Object} event - Lambda event object
 * @returns {Object} Request metadata
 */
function getRequestMetadata(event) {
  return {
    sourceIp: event.requestContext?.http?.sourceIp ||
              event.requestContext?.identity?.sourceIp ||
              'unknown',
    userAgent: event.requestContext?.http?.userAgent ||
               event.headers?.['user-agent'] ||
               event.headers?.['User-Agent'] ||
               'unknown',
    requestId: event.requestContext?.requestId || 'unknown',
    path: event.requestContext?.http?.path || event.path || 'unknown',
    method: event.requestContext?.http?.method || event.httpMethod || 'unknown'
  };
}

/**
 * Validate request rate (for application-level rate limiting)
 * Note: Primary rate limiting should be at API Gateway level
 *
 * @param {string} identifier - Unique identifier (IP, userId, etc.)
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} { allowed: boolean, retryAfter: number }
 */
const requestCounts = new Map();
function checkRateLimit(identifier, maxRequests, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create request history for identifier
  let requests = requestCounts.get(identifier) || [];

  // Remove old requests outside the window
  requests = requests.filter(timestamp => timestamp > windowStart);

  // Check if rate limit exceeded
  if (requests.length >= maxRequests) {
    const oldestRequest = requests[0];
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

    securityEvent('RATE_LIMIT_EXCEEDED', 'MEDIUM', {
      identifier,
      requestCount: requests.length,
      maxRequests,
      windowMs
    });

    return { allowed: false, retryAfter };
  }

  // Add current request
  requests.push(now);
  requestCounts.set(identifier, requests);

  // Cleanup old entries (prevent memory leak)
  if (requestCounts.size > 10000) {
    const entries = Array.from(requestCounts.entries());
    entries.sort((a, b) => b[1][b[1].length - 1] - a[1][a[1].length - 1]);
    requestCounts.clear();
    entries.slice(0, 5000).forEach(([key, value]) => requestCounts.set(key, value));
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Create error response with security headers
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Application error code
 * @param {string} message - Error message
 * @param {Object} event - Lambda event for CORS origin
 * @returns {Object} Lambda response with security headers
 */
function errorResponse(statusCode, errorCode, message, event) {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const stage = process.env.STAGE || 'development';

  return {
    statusCode,
    headers: getSecureHeaders(origin, stage),
    body: JSON.stringify({
      error: errorCode,
      message
    })
  };
}

/**
 * Create success response with security headers
 *
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Response data
 * @param {Object} event - Lambda event for CORS origin
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} Lambda response with security headers
 */
function successResponse(statusCode, data, event, additionalHeaders = {}) {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const stage = process.env.STAGE || 'development';

  return {
    statusCode,
    headers: {
      ...getSecureHeaders(origin, stage),
      ...additionalHeaders
    },
    body: JSON.stringify(data)
  };
}

module.exports = {
  getAllowedOrigin,
  getSecureHeaders,
  auditLog,
  securityEvent,
  getRequestMetadata,
  checkRateLimit,
  errorResponse,
  successResponse,
  ALLOWED_ORIGINS
};
