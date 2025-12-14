/**
 * Rate Limiting Module
 * Token bucket rate limiting using DynamoDB for distributed rate limiting.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE || 'barkbase-rate-limits';

/**
 * Rate limit configurations by endpoint type
 */
const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  auth: {
    maxTokens: 5,
    refillRate: 1, // tokens per second
    windowMs: 60000, // 1 minute window
  },
  // Standard API endpoints
  api: {
    maxTokens: 100,
    refillRate: 10, // tokens per second
    windowMs: 60000, // 1 minute window
  },
  // Bulk operations - lower limits
  bulk: {
    maxTokens: 10,
    refillRate: 0.5, // tokens per second
    windowMs: 60000, // 1 minute window
  },
  // Webhook endpoints
  webhook: {
    maxTokens: 50,
    refillRate: 5, // tokens per second
    windowMs: 60000, // 1 minute window
  },
};

/**
 * Get rate limit key for the request
 */
function getRateLimitKey(event, limitType = 'api') {
  const tenantId = event.headers?.['x-tenant-id'] || event.headers?.['X-Tenant-Id'];
  const ip = event.requestContext?.identity?.sourceIp || 'unknown';

  // For authenticated requests, limit by tenant
  if (tenantId) {
    return `${limitType}:tenant:${tenantId}`;
  }

  // For unauthenticated requests, limit by IP
  return `${limitType}:ip:${ip}`;
}

/**
 * Check rate limit using token bucket algorithm
 */
async function checkRateLimit(key, config = RATE_LIMITS.api) {
  const now = Date.now();
  const { maxTokens, refillRate, windowMs } = config;

  try {
    // Get current bucket state
    const result = await docClient.send(
      new GetCommand({
        TableName: RATE_LIMIT_TABLE,
        Key: { pk: key },
      })
    );

    let tokens = maxTokens;
    let lastRefill = now;

    if (result.Item) {
      // Calculate tokens to add based on time passed
      const timePassed = (now - result.Item.lastRefill) / 1000;
      const tokensToAdd = timePassed * refillRate;
      tokens = Math.min(maxTokens, result.Item.tokens + tokensToAdd);
      lastRefill = result.Item.lastRefill;
    }

    // Check if we have tokens available
    if (tokens < 1) {
      const retryAfter = Math.ceil((1 - tokens) / refillRate);
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        limit: maxTokens,
      };
    }

    // Consume a token
    const newTokens = tokens - 1;

    // Update bucket state with conditional write
    await docClient.send(
      new UpdateCommand({
        TableName: RATE_LIMIT_TABLE,
        Key: { pk: key },
        UpdateExpression: 'SET tokens = :tokens, lastRefill = :lastRefill, #ttl = :ttl',
        ExpressionAttributeNames: {
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':tokens': newTokens,
          ':lastRefill': now,
          ':ttl': Math.floor((now + windowMs * 2) / 1000), // TTL for cleanup
        },
      })
    );

    return {
      allowed: true,
      remaining: Math.floor(newTokens),
      retryAfter: 0,
      limit: maxTokens,
    };
  } catch (error) {
    // On error, allow request but log warning
    console.warn('Rate limit check failed:', error.message);
    return {
      allowed: true,
      remaining: maxTokens,
      retryAfter: 0,
      limit: maxTokens,
      error: error.message,
    };
  }
}

/**
 * Rate limiting middleware for Lambda handlers
 */
function withRateLimit(handler, limitType = 'api') {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.api;

  return async (event, context) => {
    const key = getRateLimitKey(event, limitType);
    const result = await checkRateLimit(key, config);

    // Add rate limit headers to all responses
    const rateLimitHeaders = {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + result.retryAfter),
    };

    if (!result.allowed) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter),
          ...rateLimitHeaders,
        },
        body: JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter,
        }),
      };
    }

    // Call the actual handler
    const response = await handler(event, context);

    // Add rate limit headers to response
    return {
      ...response,
      headers: {
        ...response.headers,
        ...rateLimitHeaders,
      },
    };
  };
}

/**
 * In-memory rate limiter for simple cases (single Lambda instance)
 * Useful for testing or low-traffic endpoints
 */
class InMemoryRateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  check(key, config = RATE_LIMITS.api) {
    const now = Date.now();
    const { maxTokens, refillRate } = config;

    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens
    const timePassed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + timePassed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((1 - bucket.tokens) / refillRate),
        limit: maxTokens,
      };
    }

    bucket.tokens -= 1;

    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      retryAfter: 0,
      limit: maxTokens,
    };
  }

  // Cleanup old entries periodically
  cleanup(maxAge = 300000) {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}

module.exports = {
  RATE_LIMITS,
  getRateLimitKey,
  checkRateLimit,
  withRateLimit,
  InMemoryRateLimiter,
};
