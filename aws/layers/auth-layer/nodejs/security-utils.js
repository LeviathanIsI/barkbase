/**
 * Shared Security Utilities for BarkBase Lambda Functions
 * Provides CORS handling, security headers, and audit logging
 *
 * Usage (from Lambda using auth-layer):
 *   const { getSecureHeaders, auditLog } = require('/opt/nodejs/security-utils');
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
 */
function getAllowedOrigin(requestOrigin, stage = process.env.STAGE || 'development') {
  const normalizedStage = stage === 'dev' ? 'development' :
                          stage === 'prod' ? 'production' :
                          stage;

  const stageOrigins = ALLOWED_ORIGINS[normalizedStage] || ALLOWED_ORIGINS.development;

  if (normalizedStage === 'development') {
    if (requestOrigin && stageOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    return stageOrigins[0];
  }

  if (requestOrigin && stageOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  console.warn(`[SECURITY] Unauthorized origin blocked: ${requestOrigin} (stage: ${normalizedStage})`);
  return stageOrigins[0];
}

/**
 * Get comprehensive security headers for Lambda responses
 */
function getSecureHeaders(requestOrigin, stage, allowCredentials = true) {
  const allowedOrigin = getAllowedOrigin(requestOrigin, stage);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': allowCredentials ? 'true' : 'false',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
    'Access-Control-Max-Age': '3600',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://cognito-idp.*.amazonaws.com https://*.execute-api.*.amazonaws.com",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...(stage === 'production' || stage === 'prod' ? {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    } : {}),
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

/**
 * Structured audit logging for security-relevant events
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
  console.log(JSON.stringify(logEntry));
}

/**
 * Security event logging for monitoring and alerting
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
  if (severity === 'CRITICAL') {
    console.error(`[CRITICAL_SECURITY_EVENT] ${eventType}`, event);
  }
}

/**
 * Extract request metadata for audit logging
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
 * Validate request rate (application-level rate limiting)
 */
const requestCounts = new Map();
function checkRateLimit(identifier, maxRequests, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;
  let requests = requestCounts.get(identifier) || [];
  requests = requests.filter(timestamp => timestamp > windowStart);

  if (requests.length >= maxRequests) {
    const oldestRequest = requests[0];
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
    securityEvent('RATE_LIMIT_EXCEEDED', 'MEDIUM', { identifier, requestCount: requests.length, maxRequests, windowMs });
    return { allowed: false, retryAfter };
  }

  requests.push(now);
  requestCounts.set(identifier, requests);

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
 */
function errorResponse(statusCode, errorCode, message, event) {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const stage = process.env.STAGE || 'development';
  return {
    statusCode,
    headers: {
      ...getSecureHeaders(origin, stage),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ error: errorCode, message })
  };
}

/**
 * Create success response with security headers
 */
function successResponse(statusCode, data, event, additionalHeaders = {}) {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const stage = process.env.STAGE || 'development';
  return {
    statusCode,
    headers: {
      ...getSecureHeaders(origin, stage),
      'Content-Type': 'application/json',
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

