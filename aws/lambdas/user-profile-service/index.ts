/**
 * User Profile Service Lambda Handler
 * 
 * Routes handled:
 * - GET /api/v1/users/profile  - Get current user's profile
 * - POST /api/v1/users/password - Change current user's password
 * 
 * Database tables used:
 * - User (recordId, email, passwordHash, name, phone, avatarUrl)
 * - Membership (userId, tenantId, role)
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import {
  // Types
  PasswordChangeRequest,
  ERROR_CODES,
  RequestMetadata,
  // Security
  errorResponse,
  successResponse,
  handleOptions,
  auditLog,
  getRequestMetadata,
  // Database
  query,
  // Auth
  requireAuth,
  hashPassword,
  verifyPassword,
  validatePassword,
} from '../shared';

/**
 * Main Lambda handler - routes requests to appropriate sub-handler
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const metadata = getRequestMetadata(event);

  console.log('[USER-PROFILE] Request received', {
    requestId: context.awsRequestId,
    path: metadata.path,
    method: metadata.method,
    stage: process.env.STAGE,
  });

  // Handle OPTIONS preflight
  if (metadata.method === 'OPTIONS') {
    return handleOptions(event);
  }

  // Require authentication
  const authResult = requireAuth(event);
  if ('error' in authResult) {
    return errorResponse(401, authResult.error.code, authResult.error.message, event);
  }

  const { user } = authResult;

  try {
    // Route based on path and method
    const path = metadata.path.replace(/^\/api\/v1\/users/, '').replace(/\/$/, '');

    if (path === '/profile' && metadata.method === 'GET') {
      return await handleGetProfile(event, user.sub, user.tenantId, metadata);
    }

    if (path === '/profile' && metadata.method === 'PATCH') {
      return await handleUpdateProfile(event, user.sub, user.tenantId, metadata);
    }

    if (path === '/password' && metadata.method === 'POST') {
      return await handleChangePassword(event, user.sub, metadata);
    }

    return errorResponse(404, 'NOT_FOUND', `Unknown profile route: ${metadata.method} ${path}`, event);
  } catch (error) {
    console.error('[USER-PROFILE] Handler error:', error);
    return errorResponse(500, ERROR_CODES.INTERNAL_ERROR, 'Internal server error', event);
  }
};

/**
 * Handle GET /api/v1/users/profile
 * 
 * Returns the current user's profile with their membership details.
 */
async function handleGetProfile(
  event: APIGatewayProxyEvent,
  userId: string,
  tenantId: string,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Get user with membership info
  const result = await query<{
    recordId: string;
    email: string;
    name: string | null;
    phone: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    membershipRole: string | null;
    membershipTenantId: string | null;
  }>(
    `SELECT 
      u."recordId",
      u."email",
      u."name",
      u."phone",
      u."avatarUrl",
      u."createdAt",
      u."updatedAt",
      m."role" AS "membershipRole",
      m."tenantId" AS "membershipTenantId"
     FROM "User" u
     LEFT JOIN "Membership" m ON m."userId" = u."recordId" AND m."tenantId" = $2
     WHERE u."recordId" = $1`,
    [userId, tenantId]
  );

  if (result.rows.length === 0) {
    auditLog('PROFILE_GET_FAILED', { ...metadata, userId, tenantId, result: 'NOT_FOUND' });
    return errorResponse(404, ERROR_CODES.USER_NOT_FOUND, 'User not found', event);
  }

  const profile = result.rows[0];

  // Get all memberships for the user (for switching tenants)
  const membershipsResult = await query<{
    tenantId: string;
    role: string;
    tenantName: string;
    tenantSlug: string;
  }>(
    `SELECT m."tenantId", m."role", t."name" as "tenantName", t."slug" as "tenantSlug"
     FROM "Membership" m
     INNER JOIN "Tenant" t ON t."recordId" = m."tenantId"
     WHERE m."userId" = $1
     ORDER BY m."createdAt" ASC`,
    [userId]
  );

  const responseData = {
    recordId: profile.recordId,
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    role: profile.membershipRole,
    tenantId: profile.membershipTenantId || tenantId,
    memberships: membershipsResult.rows.map(m => ({
      tenantId: m.tenantId,
      role: m.role,
      tenantName: m.tenantName,
      tenantSlug: m.tenantSlug,
    })),
  };

  auditLog('PROFILE_GET_SUCCESS', { ...metadata, userId, tenantId, result: 'SUCCESS' });

  return successResponse(200, responseData, event);
}

/**
 * Handle PATCH /api/v1/users/profile
 * 
 * Updates the current user's profile fields.
 */
async function handleUpdateProfile(
  event: APIGatewayProxyEvent,
  userId: string,
  tenantId: string,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Parse request body
  let body: { name?: string; phone?: string; avatarUrl?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return errorResponse(400, ERROR_CODES.USER_INVALID_INPUT, 'Invalid JSON body', event);
  }

  // Only allow updating specific fields
  const allowedFields = ['name', 'phone', 'avatarUrl'];
  const updates: string[] = [];
  const values: (string | null)[] = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (field in body) {
      updates.push(`"${field}" = $${paramIndex}`);
      values.push((body as Record<string, string | null>)[field]);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return errorResponse(400, ERROR_CODES.USER_INVALID_INPUT, 'No valid fields provided', event);
  }

  // Add userId to values
  values.push(userId);

  // Update user
  const result = await query<{
    recordId: string;
    email: string;
    name: string | null;
    phone: string | null;
    avatarUrl: string | null;
    updatedAt: Date;
  }>(
    `UPDATE "User"
     SET ${updates.join(', ')}, "updatedAt" = NOW()
     WHERE "recordId" = $${paramIndex}
     RETURNING "recordId", "email", "name", "phone", "avatarUrl", "updatedAt"`,
    values
  );

  if (result.rows.length === 0) {
    return errorResponse(404, ERROR_CODES.USER_NOT_FOUND, 'User not found', event);
  }

  auditLog('PROFILE_UPDATE_SUCCESS', {
    ...metadata,
    userId,
    tenantId,
    result: 'SUCCESS',
  }, { updatedFields: Object.keys(body) });

  // Return full profile
  return handleGetProfile(event, userId, tenantId, metadata);
}

/**
 * Handle POST /api/v1/users/password
 * 
 * Changes the current user's password.
 */
async function handleChangePassword(
  event: APIGatewayProxyEvent,
  userId: string,
  metadata: RequestMetadata
): Promise<APIGatewayProxyResult> {
  // Parse request body
  let body: PasswordChangeRequest;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return errorResponse(400, ERROR_CODES.USER_INVALID_INPUT, 'Invalid JSON body', event);
  }

  const { currentPassword, newPassword } = body;

  // Validate input
  if (!currentPassword || !newPassword) {
    return errorResponse(400, ERROR_CODES.USER_INVALID_INPUT, 'Current password and new password are required', event);
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return errorResponse(400, ERROR_CODES.AUTH_WEAK_PASSWORD, passwordValidation.message!, event);
  }

  // Get current password hash
  const userResult = await query<{ passwordHash: string }>(
    `SELECT "passwordHash" FROM "User" WHERE "recordId" = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    return errorResponse(404, ERROR_CODES.USER_NOT_FOUND, 'User not found', event);
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(currentPassword, userResult.rows[0].passwordHash);
  if (!isCurrentPasswordValid) {
    auditLog('PASSWORD_CHANGE_FAILED', { ...metadata, userId, result: 'INVALID_CURRENT_PASSWORD' });
    return errorResponse(401, ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Current password is incorrect', event);
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await query(
    `UPDATE "User" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
    [newPasswordHash, userId]
  );

  auditLog('PASSWORD_CHANGE_SUCCESS', { ...metadata, userId, result: 'SUCCESS' });

  return successResponse(200, { message: 'Password changed successfully' }, event);
}
