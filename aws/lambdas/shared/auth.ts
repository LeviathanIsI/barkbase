/**
 * Authentication Utilities for BarkBase Lambda Handlers
 * 
 * Handles JWT generation, validation, and password hashing.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { JwtPayload, RequestUser, ERROR_CODES } from './types';
import { securityEvent } from './security';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'barkbase-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Password hashing configuration (OWASP recommended minimum)
const BCRYPT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT access token
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload as object, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Generate a JWT refresh token (longer lived)
 */
export function generateRefreshToken(payload: { sub: string; sessionId: string }): string {
  return jwt.sign(payload as object, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      securityEvent('TOKEN_EXPIRED', 'LOW', { error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      securityEvent('INVALID_TOKEN', 'MEDIUM', { error: (error as Error).message });
    }
    return null;
  }
}

/**
 * Extract Authorization header token
 */
export function extractBearerToken(event: APIGatewayProxyEvent): string | null {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and just "<token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Extract and validate user from request
 * Supports multiple auth methods:
 * 1. JWT in Authorization header
 * 2. API Gateway JWT authorizer claims
 * 3. Dev mode headers (X-User-Id, X-Tenant-Id)
 */
export function extractUser(event: APIGatewayProxyEvent): RequestUser | null {
  // Try JWT from Authorization header first
  const token = extractBearerToken(event);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      return {
        sub: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        role: payload.role,
        sessionId: payload.sessionId,
      };
    }
  }

  // Try API Gateway JWT authorizer claims (for Cognito integration)
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  if (claims?.sub) {
    return {
      sub: claims.sub,
      email: claims.email,
      tenantId: claims['custom:tenantId'] || claims.tenantId,
      role: claims['custom:role'] || claims.role || 'USER',
    };
  }

  // Dev mode: extract from headers (only in development)
  const stage = process.env.STAGE || 'development';
  if (stage === 'dev' || stage === 'development') {
    const tenantId = event.headers?.['x-tenant-id'] || event.headers?.['X-Tenant-Id'];
    const userId = event.headers?.['x-user-id'] || event.headers?.['X-User-Id'];

    if (tenantId && userId) {
      return {
        sub: userId,
        tenantId,
        role: event.headers?.['x-user-role'] || event.headers?.['X-User-Role'] || 'USER',
      };
    }
  }

  return null;
}

/**
 * Require authenticated user or return 401
 */
export function requireAuth(event: APIGatewayProxyEvent): { user: RequestUser } | { error: { code: string; message: string } } {
  const user = extractUser(event);

  if (!user) {
    return {
      error: {
        code: ERROR_CODES.AUTH_MISSING_TOKEN,
        message: 'Authentication required',
      },
    };
  }

  if (!user.tenantId) {
    return {
      error: {
        code: ERROR_CODES.TENANT_NOT_FOUND,
        message: 'Tenant context required',
      },
    };
  }

  return { user };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }

  // Additional strength checks (optional, enable for production)
  // if (!/[A-Z]/.test(password)) {
  //   return { valid: false, message: 'Password must contain at least one uppercase letter' };
  // }
  // if (!/[a-z]/.test(password)) {
  //   return { valid: false, message: 'Password must contain at least one lowercase letter' };
  // }
  // if (!/[0-9]/.test(password)) {
  //   return { valid: false, message: 'Password must contain at least one number' };
  // }

  return { valid: true };
}

/**
 * Generate a random session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Sanitize user data for response (remove sensitive fields)
 */
export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash, ...sanitized } = user;
  return sanitized as Omit<T, 'passwordHash'>;
}

