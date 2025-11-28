/**
 * Shared TypeScript types for BarkBase Lambda handlers
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * User record from the database
 */
export interface DbUser {
  recordId: string;
  email: string;
  passwordHash: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant record from the database
 */
export interface DbTenant {
  recordId: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Membership record linking users to tenants
 */
export interface DbMembership {
  recordId: string;
  userId: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'USER';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Auth session record for session management
 */
export interface DbAuthSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  refreshToken: string;
  userAgent: string | null;
  ipAddress: string | null;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastActive: Date;
}

/**
 * JWT token payload structure
 */
export interface JwtPayload {
  sub: string;       // userId (recordId)
  email: string;
  tenantId: string;
  role: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

/**
 * User info extracted from JWT or request
 */
export interface RequestUser {
  sub: string;       // userId
  email?: string;
  tenantId: string;
  role: string;
  sessionId?: string;
}

/**
 * Public user data (safe to return to client)
 */
export interface PublicUser {
  recordId: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Public tenant data (safe to return to client)
 */
export interface PublicTenant {
  recordId: string;
  name: string;
  slug: string;
  plan: string;
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Signup request body
 */
export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
  tenantName?: string;
  tenantSlug?: string;
}

/**
 * Login/Signup response
 */
export interface AuthResponse {
  user: PublicUser;
  tenant: PublicTenant;
  accessToken: string;
  role: string;
}

/**
 * Password change request body
 */
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Request metadata for logging
 */
export interface RequestMetadata {
  sourceIp: string;
  userAgent: string;
  requestId: string;
  path: string;
  method: string;
}

/**
 * Extended API Gateway event with parsed body
 */
export interface ParsedAPIGatewayEvent<T = unknown> extends APIGatewayProxyEvent {
  parsedBody?: T;
}

/**
 * Standard error codes
 */
export const ERROR_CODES = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_USER_NOT_FOUND: 'AUTH_002',
  AUTH_SESSION_EXPIRED: 'AUTH_003',
  AUTH_INVALID_TOKEN: 'AUTH_004',
  AUTH_MISSING_TOKEN: 'AUTH_005',
  AUTH_EMAIL_EXISTS: 'AUTH_006',
  AUTH_WEAK_PASSWORD: 'AUTH_007',
  AUTH_INVALID_EMAIL: 'AUTH_008',
  
  // User errors
  USER_NOT_FOUND: 'USER_001',
  USER_FORBIDDEN: 'USER_002',
  USER_INVALID_INPUT: 'USER_003',
  
  // Tenant errors
  TENANT_NOT_FOUND: 'TENANT_001',
  TENANT_SLUG_EXISTS: 'TENANT_002',
  
  // System errors
  INTERNAL_ERROR: 'SYS_001',
  DATABASE_ERROR: 'SYS_002',
  RATE_LIMIT_EXCEEDED: 'SYS_003',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

