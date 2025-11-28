/**
 * Shared Security Utilities for BarkBase Lambda Handlers
 * 
 * Ported from backend/src/lib/utils/security.js to TypeScript
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RequestMetadata, ErrorCode } from './types';

// Environment-based CORS configuration
const ALLOWED_ORIGINS: Record<string, string[]> = {
  production: [
    'https://app.barkbase.com',
    'https://www.barkbase.com',
  ],
  staging: [
    'https://staging.barkbase.com',
    'https://staging-app.barkbase.com',
  ],
  development: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
  ],
};

/**
 * Get allowed origin for CORS based on request origin and stage
 */
export function getAllowedOrigin(requestOrigin?: string, stage = process.env.STAGE || 'development'): string {
  const normalizedStage = stage === 'dev'
    ? 'development'
    : stage === 'prod'
      ? 'production'
      : stage;

  const stageOrigins = ALLOWED_ORIGINS[normalizedStage] || ALLOWED_ORIGINS.development;

  // In development, be permissive with origins
  if (normalizedStage === 'development') {
    if (requestOrigin && stageOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    // Allow any origin in dev for flexibility
    return requestOrigin || stageOrigins[0];
  }

  // In production/staging, strict origin checking
  if (requestOrigin && stageOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  console.warn(`[SECURITY] Unauthorized origin blocked: ${requestOrigin} (stage: ${normalizedStage})`);
  return stageOrigins[0];
}

/**
 * Build secure response headers with CORS and security policies
 */
export function getSecureHeaders(requestOrigin?: string, stage?: string, allowCredentials = true): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(requestOrigin, stage);

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': allowCredentials ? 'true' : 'false',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Tenant-Id,X-User-Id,X-User-Role',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
    'Access-Control-Max-Age': '3600',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...(stage === 'production' || stage === 'prod'
      ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload' }
      : {}),
  };
}

/**
 * Log an audit event with consistent structure
 */
export function auditLog(
  action: string,
  context: {
    userId?: string;
    sub?: string;
    tenantId?: string;
    sourceIp?: string;
    userAgent?: string;
    resource?: string;
    result?: string;
  } = {},
  metadata: Record<string, unknown> = {}
): void {
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
    ...metadata,
  };

  console.log(JSON.stringify(logEntry));
}

/**
 * Log a security event with severity level
 */
export function securityEvent(
  eventType: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  details: Record<string, unknown> = {}
): void {
  const event = {
    timestamp: new Date().toISOString(),
    level: 'SECURITY_EVENT',
    eventType,
    severity,
    ...details,
  };

  console.warn(JSON.stringify(event));

  if (severity === 'CRITICAL') {
    console.error(`[CRITICAL_SECURITY_EVENT] ${eventType}`, event);
  }
}

/**
 * Extract request metadata from API Gateway event
 */
export function getRequestMetadata(event: APIGatewayProxyEvent): RequestMetadata {
  return {
    sourceIp: event.requestContext?.identity?.sourceIp
      || (event.requestContext as any)?.http?.sourceIp
      || 'unknown',
    userAgent: event.headers?.['user-agent']
      || event.headers?.['User-Agent']
      || (event.requestContext as any)?.http?.userAgent
      || 'unknown',
    requestId: event.requestContext?.requestId || 'unknown',
    path: event.path
      || (event.requestContext as any)?.http?.path
      || 'unknown',
    method: event.httpMethod
      || (event.requestContext as any)?.http?.method
      || 'unknown',
  };
}

/**
 * Simple in-memory rate limiter (for single Lambda instance)
 * Note: For production, use DynamoDB or Redis for distributed rate limiting
 */
const requestCounts = new Map<string, number[]>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let requests = requestCounts.get(identifier) || [];
  requests = requests.filter((timestamp) => timestamp > windowStart);

  if (requests.length >= maxRequests) {
    const oldestRequest = requests[0];
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

    securityEvent('RATE_LIMIT_EXCEEDED', 'MEDIUM', {
      identifier,
      requestCount: requests.length,
      maxRequests,
      windowMs,
    });

    return { allowed: false, retryAfter };
  }

  requests.push(now);
  requestCounts.set(identifier, requests);

  // Cleanup old entries periodically
  if (requestCounts.size > 10000) {
    const entries = Array.from(requestCounts.entries());
    entries.sort((a, b) => b[1][b[1].length - 1] - a[1][a[1].length - 1]);
    requestCounts.clear();
    entries.slice(0, 5000).forEach(([key, value]) => requestCounts.set(key, value));
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Build a standardized error response
 */
export function errorResponse(
  statusCode: number,
  errorCode: ErrorCode | string,
  message: string,
  event?: APIGatewayProxyEvent
): APIGatewayProxyResult {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const stage = process.env.STAGE || 'development';

  return {
    statusCode,
    headers: getSecureHeaders(origin, stage),
    body: JSON.stringify({
      error: errorCode,
      message,
    }),
  };
}

/**
 * Build a standardized success response
 */
export function successResponse<T>(
  statusCode: number,
  data: T,
  event?: APIGatewayProxyEvent,
  additionalHeaders: Record<string, string> = {}
): APIGatewayProxyResult {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const stage = process.env.STAGE || 'development';

  return {
    statusCode,
    headers: {
      ...getSecureHeaders(origin, stage),
      ...additionalHeaders,
    },
    body: JSON.stringify(data),
  };
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleOptions(event: APIGatewayProxyEvent): APIGatewayProxyResult {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const stage = process.env.STAGE || 'development';

  return {
    statusCode: 204,
    headers: getSecureHeaders(origin, stage),
    body: '',
  };
}

