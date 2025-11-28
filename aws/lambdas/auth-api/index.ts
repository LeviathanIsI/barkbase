/**
 * Auth API Lambda Handler
 * 
 * Routes handled:
 * - POST /api/v1/auth/login   - User login with email/password
 * - POST /api/v1/auth/logout  - User logout (revoke session)
 * - POST /api/v1/auth/refresh - Refresh access token
 * - POST /api/v1/auth/signup  - New user and tenant registration
 * 
 * Database tables used:
 * - User (recordId, email, passwordHash, name, phone, avatarUrl)
 * - Membership (userId, tenantId, role)
 * - Tenant (recordId, name, slug, plan)
 * - AuthSession (sessionId, userId, tenantId, refreshToken, isRevoked)
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import {
  // Types
  LoginRequest,
  SignupRequest,
  PublicUser,
  PublicTenant,
  AuthResponse,
  ERROR_CODES,
  RequestMetadata,
  // Security
  errorResponse,
  successResponse,
  handleOptions,
  auditLog,
  securityEvent,
  getRequestMetadata,
  checkRateLimit,
  // Database
  query,
  withTransaction,
  // Auth
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractBearerToken,
  isValidEmail,
  validatePassword,
  generateSessionId,
  sanitizeUser,
} from '../shared';
import { PoolClient } from 'pg';

/**
 * Main Lambda handler - routes requests to appropriate sub-handler
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const metadata = getRequestMetadata(event);

  console.log('[AUTH] Request received', {
    requestId: context.awsRequestId,
    path: metadata.path,
    method: metadata.method,
    stage: process.env.STAGE,
  });

  // Handle OPTIONS preflight
  if (metadata.method === 'OPTIONS') {
    return handleOptions(event);
  }

  // Rate limiting by IP
  const rateLimit = checkRateLimit(`auth:${metadata.sourceIp}`, 30, 60000); // 30 requests per minute
  if (!rateLimit.allowed) {
    securityEvent('AUTH_RATE_LIMIT', 'MEDIUM', { ip: metadata.sourceIp });
    return errorResponse(429, ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Too many requests', event);
  }

  try {
    // Route based on path
    const path = metadata.path.replace(/^\/api\/v1\/auth/, '').replace(/\/$/, '');

    switch (path) {
      case '/login':
        return await handleLogin(event, metadata);
      case '/logout':
        return await handleLogout(event, metadata);
      case '/refresh':
        return await handleRefresh(event, metadata);
      case '/signup':
        return await handleSignup(event, metadata);
      default:
        return errorResponse(404, 'NOT_FOUND', `Unknown auth route: ${path}`, event);
    }
  } catch (error) {
    console.error('[AUTH] Handler error:', error);
    securityEvent('AUTH_ERROR', 'HIGH', {
      error: (error as Error).message,
      path: metadata.path,
    });
    return errorResponse(500, ERROR_CODES.INTERNAL_ERROR, 'Internal server error', event);
  }
};

/**
 * Handle POST /api/v1/auth/login
 * 
 * Authenticates user with email and password, returns access token.
 */
async function handleLogin(
  event: APIGatewayProxyEvent,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Parse request body
  let body: LoginRequest;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return errorResponse(400, ERROR_CODES.USER_INVALID_INPUT, 'Invalid JSON body', event);
  }

  const { email, password } = body;

  // Validate input
  if (!email || !password) {
    return errorResponse(400, ERROR_CODES.USER_INVALID_INPUT, 'Email and password are required', event);
  }

  if (!isValidEmail(email)) {
    return errorResponse(400, ERROR_CODES.AUTH_INVALID_EMAIL, 'Invalid email format', event);
  }

  // Find user by email
  const userResult = await query<{
    recordId: string;
    email: string;
    passwordHash: string;
    name: string | null;
    phone: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>(
    `SELECT "recordId", "email", "passwordHash", "name", "phone", "avatarUrl", "createdAt", "updatedAt"
     FROM "User"
     WHERE LOWER("email") = LOWER($1)`,
    [email]
  );

  if (userResult.rows.length === 0) {
    auditLog('LOGIN_FAILED', { ...metadata, result: 'USER_NOT_FOUND' }, { email });
    // Don't reveal if user exists - use generic message
    return errorResponse(401, ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', event);
  }

  const user = userResult.rows[0];

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    auditLog('LOGIN_FAILED', { ...metadata, userId: user.recordId, result: 'INVALID_PASSWORD' });
    securityEvent('FAILED_LOGIN_ATTEMPT', 'MEDIUM', {
      userId: user.recordId,
      ip: metadata.sourceIp,
    });
    return errorResponse(401, ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid email or password', event);
  }

  // Get user's primary membership (tenant + role)
  const membershipResult = await query<{
    tenantId: string;
    role: string;
    tenantName: string;
    tenantSlug: string;
    tenantPlan: string;
  }>(
    `SELECT m."tenantId", m."role", t."name" as "tenantName", t."slug" as "tenantSlug", t."plan" as "tenantPlan"
     FROM "Membership" m
     INNER JOIN "Tenant" t ON t."recordId" = m."tenantId"
     WHERE m."userId" = $1
     ORDER BY m."createdAt" ASC
     LIMIT 1`,
    [user.recordId]
  );

  if (membershipResult.rows.length === 0) {
    auditLog('LOGIN_FAILED', { ...metadata, userId: user.recordId, result: 'NO_MEMBERSHIP' });
    return errorResponse(401, ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'No tenant membership found', event);
  }

  const membership = membershipResult.rows[0];

  // Create session
  const sessionId = generateSessionId();
  const refreshToken = generateRefreshToken({ sub: user.recordId, sessionId });

  // Store session in database
  try {
    await query(
      `INSERT INTO "AuthSession" ("sessionId", "userId", "tenantId", "refreshToken", "userAgent", "ipAddress", "expiresAt", "lastActive")
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '7 days', NOW())`,
      [sessionId, user.recordId, membership.tenantId, refreshToken, metadata.userAgent, metadata.sourceIp]
    );
  } catch (error) {
    // Session table might not exist in dev - log warning but continue
    console.warn('[AUTH] Failed to create session record:', (error as Error).message);
  }

  // Generate access token
  const accessToken = generateAccessToken({
    sub: user.recordId,
    email: user.email,
    tenantId: membership.tenantId,
    role: membership.role,
    sessionId,
  });

  // Build response
  const response: AuthResponse = {
    user: {
      recordId: user.recordId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    tenant: {
      recordId: membership.tenantId,
      name: membership.tenantName,
      slug: membership.tenantSlug,
      plan: membership.tenantPlan,
    },
    accessToken,
    role: membership.role,
  };

  auditLog('LOGIN_SUCCESS', {
    ...metadata,
    userId: user.recordId,
    tenantId: membership.tenantId,
    result: 'SUCCESS',
  });

  return successResponse(200, response, event);
}

/**
 * Handle POST /api/v1/auth/logout
 * 
 * Revokes the current session.
 */
async function handleLogout(
  event: APIGatewayProxyEvent,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Extract token to get session ID
  const token = extractBearerToken(event);

  if (token) {
    const payload = verifyToken(token);
    if (payload?.sessionId) {
      // Revoke session
      try {
        await query(
          `UPDATE "AuthSession" SET "isRevoked" = TRUE WHERE "sessionId" = $1`,
          [payload.sessionId]
        );
        auditLog('LOGOUT_SUCCESS', {
          ...metadata,
          userId: payload.sub,
          tenantId: payload.tenantId,
          result: 'SUCCESS',
        });
      } catch (error) {
        console.warn('[AUTH] Failed to revoke session:', (error as Error).message);
      }
    }
  }

  return successResponse(200, { message: 'Logged out successfully' }, event);
}

/**
 * Handle POST /api/v1/auth/refresh
 * 
 * Refreshes the access token using a valid refresh token.
 */
async function handleRefresh(
  event: APIGatewayProxyEvent,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Extract token
  const token = extractBearerToken(event);

  if (!token) {
    return errorResponse(401, ERROR_CODES.AUTH_MISSING_TOKEN, 'Refresh token required', event);
  }

  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    return errorResponse(401, ERROR_CODES.AUTH_INVALID_TOKEN, 'Invalid or expired token', event);
  }

  // Check session is still valid
  const sessionResult = await query<{
    sessionId: string;
    userId: string;
    tenantId: string;
    isRevoked: boolean;
  }>(
    `SELECT "sessionId", "userId", "tenantId", "isRevoked"
     FROM "AuthSession"
     WHERE "sessionId" = $1`,
    [payload.sessionId]
  );

  if (sessionResult.rows.length === 0 || sessionResult.rows[0].isRevoked) {
    auditLog('REFRESH_FAILED', { ...metadata, result: 'SESSION_REVOKED' });
    return errorResponse(401, ERROR_CODES.AUTH_SESSION_EXPIRED, 'Session expired or revoked', event);
  }

  const session = sessionResult.rows[0];

  // Get current user data and role
  const userResult = await query<{
    email: string;
    role: string;
  }>(
    `SELECT u."email", m."role"
     FROM "User" u
     INNER JOIN "Membership" m ON m."userId" = u."recordId" AND m."tenantId" = $2
     WHERE u."recordId" = $1`,
    [session.userId, session.tenantId]
  );

  if (userResult.rows.length === 0) {
    return errorResponse(401, ERROR_CODES.AUTH_USER_NOT_FOUND, 'User not found', event);
  }

  const user = userResult.rows[0];

  // Update session last active
  await query(
    `UPDATE "AuthSession" SET "lastActive" = NOW() WHERE "sessionId" = $1`,
    [session.sessionId]
  ).catch(() => {}); // Ignore errors

  // Generate new access token
  const accessToken = generateAccessToken({
    sub: session.userId,
    email: user.email,
    tenantId: session.tenantId,
    role: user.role,
    sessionId: session.sessionId,
  });

  auditLog('REFRESH_SUCCESS', {
    ...metadata,
    userId: session.userId,
    tenantId: session.tenantId,
    result: 'SUCCESS',
  });

  return successResponse(200, {
    accessToken,
    role: user.role,
  }, event);
}

/**
 * Handle POST /api/v1/auth/signup
 * 
 * Creates a new user and optionally a new tenant.
 */
async function handleSignup(
  event: APIGatewayProxyEvent,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Parse request body
  let body: SignupRequest;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return errorResponse(400, ERROR_CODES.USER_INVALID_INPUT, 'Invalid JSON body', event);
  }

  const { email, password, name, tenantName, tenantSlug } = body;

  // Validate input
  if (!email || !password) {
    return errorResponse(400, ERROR_CODES.USER_INVALID_INPUT, 'Email and password are required', event);
  }

  if (!isValidEmail(email)) {
    return errorResponse(400, ERROR_CODES.AUTH_INVALID_EMAIL, 'Invalid email format', event);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return errorResponse(400, ERROR_CODES.AUTH_WEAK_PASSWORD, passwordValidation.message!, event);
  }

  // Check if user already exists
  const existingUser = await query(
    `SELECT "recordId" FROM "User" WHERE LOWER("email") = LOWER($1)`,
    [email]
  );

  if (existingUser.rows.length > 0) {
    return errorResponse(409, ERROR_CODES.AUTH_EMAIL_EXISTS, 'A user with this email already exists', event);
  }

  // Generate slug if not provided
  const slug = tenantSlug || tenantName?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') || 
    email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');

  // Check if tenant slug already exists
  const existingTenant = await query(
    `SELECT "recordId" FROM "Tenant" WHERE "slug" = $1`,
    [slug]
  );

  if (existingTenant.rows.length > 0) {
    return errorResponse(409, ERROR_CODES.TENANT_SLUG_EXISTS, 'This tenant slug is already taken', event);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user, tenant, and membership in transaction
  const result = await withTransaction(async (client: PoolClient) => {
    // Create tenant
    const tenantResult = await client.query<{
      recordId: string;
      name: string;
      slug: string;
      plan: string;
    }>(
      `INSERT INTO "Tenant" ("recordId", "name", "slug", "plan", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'FREE', NOW())
       RETURNING "recordId", "name", "slug", "plan"`,
      [tenantName || name || email.split('@')[0], slug]
    );
    const tenant = tenantResult.rows[0];

    // Create user
    const userResult = await client.query<{
      recordId: string;
      email: string;
      name: string | null;
      phone: string | null;
      avatarUrl: string | null;
      createdAt: Date;
    }>(
      `INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())
       RETURNING "recordId", "email", "name", "phone", "avatarUrl", "createdAt"`,
      [email.toLowerCase(), passwordHash, name || null]
    );
    const user = userResult.rows[0];

    // Create membership (OWNER role for new tenant)
    await client.query(
      `INSERT INTO "Membership" ("recordId", "userId", "tenantId", "role", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW())`,
      [user.recordId, tenant.recordId]
    );

    return { user, tenant };
  });

  // Create session
  const sessionId = generateSessionId();
  const refreshToken = generateRefreshToken({ sub: result.user.recordId, sessionId });

  try {
    await query(
      `INSERT INTO "AuthSession" ("sessionId", "userId", "tenantId", "refreshToken", "userAgent", "ipAddress", "expiresAt", "lastActive")
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '7 days', NOW())`,
      [sessionId, result.user.recordId, result.tenant.recordId, refreshToken, metadata.userAgent, metadata.sourceIp]
    );
  } catch (error) {
    console.warn('[AUTH] Failed to create session record:', (error as Error).message);
  }

  // Generate access token
  const accessToken = generateAccessToken({
    sub: result.user.recordId,
    email: result.user.email,
    tenantId: result.tenant.recordId,
    role: 'OWNER',
    sessionId,
  });

  // Build response
  const response: AuthResponse = {
    user: {
      recordId: result.user.recordId,
      email: result.user.email,
      name: result.user.name,
      phone: result.user.phone,
      avatarUrl: result.user.avatarUrl,
      createdAt: result.user.createdAt,
    },
    tenant: {
      recordId: result.tenant.recordId,
      name: result.tenant.name,
      slug: result.tenant.slug,
      plan: result.tenant.plan,
    },
    accessToken,
    role: 'OWNER',
  };

  auditLog('SIGNUP_SUCCESS', {
    ...metadata,
    userId: result.user.recordId,
    tenantId: result.tenant.recordId,
    result: 'SUCCESS',
  });

  return successResponse(201, response, event);
}
