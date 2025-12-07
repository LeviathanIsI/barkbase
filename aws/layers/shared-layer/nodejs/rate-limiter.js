/**
 * =============================================================================
 * BarkBase Rate Limiting Utility
 * =============================================================================
 *
 * In-memory rate limiter for Lambda functions.
 * Uses IP-based tracking with configurable limits per endpoint.
 *
 * NOTE: This is an in-memory implementation that resets on Lambda cold starts.
 * For production with multiple Lambda instances, consider using:
 * - DynamoDB for distributed rate limiting
 * - AWS WAF for infrastructure-level rate limiting (preferred)
 * - ElastiCache Redis for high-performance distributed limiting
 *
 * Current implementation provides basic protection within a single Lambda instance.
 *
 * =============================================================================
 */

// In-memory store for rate limiting
// Structure: Map<ipAddress, Map<endpoint, { count, resetTime }>>
const requestCounts = new Map();

// Clean up old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, endpoints] of requestCounts.entries()) {
    for (const [endpoint, data] of endpoints.entries()) {
      if (now > data.resetTime) {
        endpoints.delete(endpoint);
      }
    }
    if (endpoints.size === 0) {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit configurations for different endpoint types
 */
const RATE_LIMITS = {
  // Strict limits for authentication endpoints
  AUTH_LOGIN: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many login attempts. Please try again in 1 minute.',
  },
  AUTH_REGISTER: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many registration attempts. Please try again in 1 minute.',
  },
  AUTH_REFRESH: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many token refresh attempts. Please try again in 1 minute.',
  },

  // Moderate limits for data modification endpoints
  WRITE_OPERATIONS: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.',
  },

  // Generous limits for read operations
  READ_OPERATIONS: {
    maxRequests: 500,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.',
  },

  // Default fallback
  DEFAULT: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please slow down.',
  },
};

/**
 * Extract client IP from Lambda event
 * Handles both API Gateway v1 and v2 formats
 * @param {object} event - Lambda event object
 * @returns {string} Client IP address
 */
function getClientIp(event) {
  // Try various sources for the client IP
  const ip =
    event.requestContext?.http?.sourceIp || // API Gateway HTTP API (v2)
    event.requestContext?.identity?.sourceIp || // API Gateway REST API (v1)
    event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || // Load balancer/proxy
    event.headers?.['X-Forwarded-For']?.split(',')[0]?.trim() ||
    'unknown';

  return ip;
}

/**
 * Determine rate limit configuration based on endpoint path and method
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @returns {object} Rate limit configuration
 */
function getRateLimitConfig(path, method) {
  // Authentication endpoints - strict limits
  if (path.includes('/auth/login')) {
    return RATE_LIMITS.AUTH_LOGIN;
  }
  if (path.includes('/auth/register')) {
    return RATE_LIMITS.AUTH_REGISTER;
  }
  if (path.includes('/auth/refresh')) {
    return RATE_LIMITS.AUTH_REFRESH;
  }

  // Write operations - moderate limits
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method?.toUpperCase())) {
    return RATE_LIMITS.WRITE_OPERATIONS;
  }

  // Read operations - generous limits
  if (method?.toUpperCase() === 'GET') {
    return RATE_LIMITS.READ_OPERATIONS;
  }

  // Default
  return RATE_LIMITS.DEFAULT;
}

/**
 * Check if request should be rate limited
 * @param {object} event - Lambda event object
 * @returns {object} Rate limit result
 */
function checkRateLimit(event) {
  const ip = getClientIp(event);
  const path = event.requestContext?.http?.path || event.path || '/';
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';

  // Skip rate limiting for health checks
  if (path.includes('/health')) {
    return { allowed: true };
  }

  const config = getRateLimitConfig(path, method);
  const endpointKey = `${method}:${path}`;
  const now = Date.now();

  // Initialize tracking for this IP if not exists
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, new Map());
  }

  const ipData = requestCounts.get(ip);

  // Initialize or get tracking for this endpoint
  if (!ipData.has(endpointKey) || now > ipData.get(endpointKey).resetTime) {
    ipData.set(endpointKey, {
      count: 0,
      resetTime: now + config.windowMs,
    });
  }

  const endpointData = ipData.get(endpointKey);

  // Increment count
  endpointData.count++;

  // Check if limit exceeded
  if (endpointData.count > config.maxRequests) {
    const retryAfter = Math.ceil((endpointData.resetTime - now) / 1000);

    return {
      allowed: false,
      retryAfter,
      message: config.message,
      limit: config.maxRequests,
      remaining: 0,
      reset: endpointData.resetTime,
    };
  }

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - endpointData.count,
    reset: endpointData.resetTime,
  };
}

/**
 * Create rate limit response headers
 * @param {object} rateLimitResult - Result from checkRateLimit
 * @returns {object} Headers to include in response
 */
function getRateLimitHeaders(rateLimitResult) {
  const headers = {};

  if (rateLimitResult.limit !== undefined) {
    headers['X-RateLimit-Limit'] = String(rateLimitResult.limit);
  }

  if (rateLimitResult.remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = String(rateLimitResult.remaining);
  }

  if (rateLimitResult.reset !== undefined) {
    headers['X-RateLimit-Reset'] = String(Math.floor(rateLimitResult.reset / 1000));
  }

  if (rateLimitResult.retryAfter !== undefined) {
    headers['Retry-After'] = String(rateLimitResult.retryAfter);
  }

  return headers;
}

/**
 * Middleware function to apply rate limiting to Lambda handler
 * @param {object} event - Lambda event object
 * @returns {object|null} Error response if rate limited, null if allowed
 */
function applyRateLimit(event) {
  const result = checkRateLimit(event);
  const headers = getRateLimitHeaders(result);

  if (!result.allowed) {
    const { createResponse } = require('./auth-handler');

    return createResponse(
      429,
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: result.message || 'Too many requests',
        retryAfter: result.retryAfter,
      },
      headers
    );
  }

  return null; // No rate limit, proceed with request
}

/**
 * Get rate limiting statistics for monitoring
 * @returns {object} Current rate limiting statistics
 */
function getRateLimitStats() {
  const stats = {
    totalIps: requestCounts.size,
    totalEndpoints: 0,
    topIps: [],
  };

  const ipCounts = [];

  for (const [ip, endpoints] of requestCounts.entries()) {
    let totalRequests = 0;
    for (const data of endpoints.values()) {
      totalRequests += data.count;
      stats.totalEndpoints++;
    }
    ipCounts.push({ ip, requests: totalRequests, endpoints: endpoints.size });
  }

  // Sort by request count and get top 10
  ipCounts.sort((a, b) => b.requests - a.requests);
  stats.topIps = ipCounts.slice(0, 10);

  return stats;
}

module.exports = {
  checkRateLimit,
  getRateLimitHeaders,
  applyRateLimit,
  getClientIp,
  getRateLimitConfig,
  getRateLimitStats,
  RATE_LIMITS,
};
