// Canonical Service:
// Domain: User Profiles & Permission Assignments
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

/**
 * User Profile Service
 * Manages user-to-profile assignments and permission calculations
 * Implements profile inheritance and effective permission caching
 */

const { Router } = require('express');
const { getPool } = require('../../lib/db');
const permissionCalculator = require('./permission-calculator');
const { ok: sendOk, fail: sendFail } = require('../../lib/utils/responses');

const router = Router();

const ok = (event, statusCode, data = '', additionalHeaders = {}) => {
  const payload = statusCode === 204 ? null : data === '' ? {} : data;
  return sendOk(event.__res, payload, statusCode, { 'Content-Type': 'application/json', ...additionalHeaders });
};

const fail = (event, statusCode, errorCodeOrBody, message, additionalHeaders = {}) => {
  const payload = typeof errorCodeOrBody === 'object' && errorCodeOrBody !== null
    ? errorCodeOrBody
    : { error: errorCodeOrBody, message };
  return sendFail(event.__res, statusCode, payload, { 'Content-Type': 'application/json', ...additionalHeaders });
};

const buildEventFromRequest = (req, res) => ({
  headers: req.headers,
  pathParameters: req.params || {},
  queryStringParameters: Object.keys(req.query || {}).length ? req.query : undefined,
  body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined,
  __res: res,
  __tenantId: req.tenantId,
  requestContext: {
    http: {
      method: req.method,
      path: (req.baseUrl || '') + req.path,
    },
    authorizer: {
      jwt: {
        claims: {
          sub: req.user?.sub || req.user?.userId,
        },
      },
    },
  },
});

const getTenantIdFromEvent = (event) => event.__tenantId;

const getCurrentUserId = (req) => req.user?.sub || req.user?.userId || null;

const withEvent = (handler) => async (req, res) => {
  const event = buildEventFromRequest(req, res);
  try {
    await handler(event, req, res);
  } catch (error) {
    console.error('[profiles] route error:', error);
    sendFail(res, 500, { error: 'Internal Server Error' });
  }
};

router.get('/users/profile', withEvent((event, req) => getCurrentUserProfile(event, getCurrentUserId(req), req.tenantId)));

router.patch('/users/profile', withEvent((event, req) => updateCurrentUserProfile(event, getCurrentUserId(req), req.tenantId, JSON.parse(event.body || '{}'))));

router.get('/profiles', withEvent((event, req) => listProfiles(event, req.tenantId)));

router.get('/profiles/:profileId', withEvent((event, req) => getProfile(event, parseInt(event.pathParameters.profileId, 10), req.tenantId)));

router.get('/users/:userId/profiles', withEvent((event, req) => getUserProfiles(event, event.pathParameters.userId, req.tenantId)));

router.post('/users/:userId/profiles', withEvent((event, req) => assignProfile(event, event.pathParameters.userId, req.tenantId, JSON.parse(event.body || '{}'), getCurrentUserId(req))));

router.delete('/users/:userId/profiles/:profileId', withEvent((event, req) => unassignProfile(event, event.pathParameters.userId, req.tenantId, parseInt(event.pathParameters.profileId, 10), getCurrentUserId(req))));

router.get('/users/:userId/effective-permissions', withEvent((event, req) => getEffectivePermissions(event, event.pathParameters.userId, req.tenantId, event.queryStringParameters?.objectType)));

router.post('/permissions/calculate', withEvent((event, req) => calculatePermissions(event, req.body?.userId, req.tenantId, req.body?.propertyId)));

router.post('/permissions/invalidate-cache', withEvent((event, req) => invalidateCache(event, req.body?.userId, req.tenantId)));

/**
 * List all permission profiles
 */
async function listProfiles(event, tenantId) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT 
      pp.*,
      parent."profile_name" AS parent_profile_name,
      (SELECT COUNT(*) FROM "UserProfileAssignment" upa 
       WHERE upa."profile_id" = pp."profile_id" 
         AND upa."tenant_id" = $1
         AND upa."is_active" = true) AS user_count
    FROM "PermissionProfile" pp
    LEFT JOIN "PermissionProfile" parent ON pp."parent_profile_id" = parent."profile_id"
    WHERE (pp."tenant_id" = $1 OR pp."is_global" = true)
      AND pp."is_active" = true
    ORDER BY pp."hierarchy_level" DESC, pp."display_order"`,
    [tenantId]
  );

  return ok(event, 200, result.rows);
}

/**
 * Get a specific profile
 */
async function getProfile(event, profileId, tenantId) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT 
      pp.*,
      parent."profile_name" AS parent_profile_name,
      (SELECT COUNT(*) FROM "PropertyPermission" pperm 
       WHERE pperm."profile_id" = pp."profile_id") AS permission_count,
      (SELECT COUNT(*) FROM "UserProfileAssignment" upa 
       WHERE upa."profile_id" = pp."profile_id" 
         AND upa."tenant_id" = $2
         AND upa."is_active" = true) AS user_count
    FROM "PermissionProfile" pp
    LEFT JOIN "PermissionProfile" parent ON pp."parent_profile_id" = parent."profile_id"
    WHERE pp."profile_id" = $1
      AND (pp."tenant_id" = $2 OR pp."is_global" = true)`,
    [profileId, tenantId]
  );

  if (result.rows.length === 0) {
    return fail(event, 404, { error: 'Profile not found' });
  }

  return ok(event, 200, result.rows[0]);
}

/**
 * Get profiles assigned to a user
 */
async function getUserProfiles(event, userId, tenantId) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT 
      upa.*,
      pp."profile_name",
      pp."profile_key",
      pp."description",
      pp."hierarchy_level",
      pp."icon",
      pp."color"
    FROM "UserProfileAssignment" upa
    INNER JOIN "PermissionProfile" pp ON upa."profile_id" = pp."profile_id"
    WHERE upa."user_id" = $1
      AND upa."tenant_id" = $2
      AND upa."is_active" = true
      AND (upa."expires_at" IS NULL OR upa."expires_at" > NOW())
    ORDER BY upa."is_primary" DESC, pp."hierarchy_level" DESC`,
    [userId, tenantId]
  );

  return ok(event, 200, result.rows);
}

/**
 * Assign a profile to a user
 */
async function assignProfile(event, userId, tenantId, data, assignedBy) {
  const pool = getPool();
  const { profileId, isPrimary, expiresAt, reason } = data;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // If setting as primary, unset other primary assignments
    if (isPrimary) {
      await client.query(
        `UPDATE "UserProfileAssignment"
         SET "is_primary" = false
         WHERE "user_id" = $1
           AND "tenant_id" = $2
           AND "is_primary" = true`,
        [userId, tenantId]
      );
    }

    // Insert assignment
    const result = await client.query(
      `INSERT INTO "UserProfileAssignment" (
        "user_id",
        "profile_id",
        "tenant_id",
        "is_primary",
        "expires_at",
        "assignment_reason",
        "assigned_by"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [userId, profileId, tenantId, isPrimary || false, expiresAt, reason, assignedBy]
    );

    // Invalidate permission cache
    await client.query(
      `UPDATE "EffectivePermissionCache"
       SET "is_valid" = false
       WHERE "user_id" = $1 AND "tenant_id" = $2`,
      [userId, tenantId]
    );

    await client.query('COMMIT');

    return ok(event, 201, result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Unassign a profile from a user
 */
async function unassignProfile(event, userId, tenantId, profileId, unassignedBy) {
  const pool = getPool();

  const result = await pool.query(
    `UPDATE "UserProfileAssignment"
     SET "is_active" = false
     WHERE "user_id" = $1
       AND "tenant_id" = $2
       AND "profile_id" = $3
     RETURNING *`,
    [userId, tenantId, profileId]
  );

  if (result.rowCount === 0) {
    return fail(event, 404, { error: 'Profile assignment not found' });
  }

  // Invalidate permission cache
  await pool.query(
    `UPDATE "EffectivePermissionCache"
     SET "is_valid" = false
     WHERE "user_id" = $1 AND "tenant_id" = $2`,
    [userId, tenantId]
  );

  return ok(event, 200, { message: 'Profile unassigned successfully' });
}

/**
 * Get effective permissions for a user
 */
async function getEffectivePermissions(event, userId, tenantId, objectType) {
  const pool = getPool();

  const result = await pool.query(
    'SELECT * FROM get_accessible_properties($1, $2, $3, $4)',
    [userId, tenantId, objectType || null, 'read-only']
  );

  return ok(event, 200, result.rows);
}

/**
 * Calculate permissions for a specific property
 */
async function calculatePermissions(event, userId, tenantId, propertyId) {
  const effectiveAccess = await permissionCalculator.calculate(userId, tenantId, propertyId);

  return ok(event, 200, {
    userId,
    tenantId,
    propertyId,
    effectiveAccess,
  });
}

/**
 * Invalidate permission cache for a user
 */
async function invalidateCache(event, userId, tenantId) {
  const pool = getPool();

  const result = await pool.query(
    `UPDATE "EffectivePermissionCache"
     SET "is_valid" = false
     WHERE "user_id" = $1 AND "tenant_id" = $2`,
    [userId, tenantId]
  );

  return ok(event, 200, {
    message: 'Permission cache invalidated',
    invalidatedCount: result.rowCount,
  });
}

module.exports = router;

async function getCurrentUserProfile(event, userId, tenantId) {
  if (!userId) {
    return fail(event, 401, { error: 'Unauthorized' });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
      u.record_id AS "recordId",
      u.avatar_url AS "avatarUrl",
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt",
      us.full_name AS "name",
      us.email,
      us.phone,
      us.language,
      us.timezone,
      us.two_factor_enabled AS "twoFactorEnabled",
      us.password_changed_at AS "passwordChangedAt",
      us.connected_email AS "connectedEmail",
      us.connected_email_connected_at AS "connectedEmailConnectedAt",
      m.role AS "membershipRole",
      m.tenant_id AS "membershipTenantId"
     FROM "User" u
     LEFT JOIN "UserSettings" us ON us.tenant_id = u.tenant_id AND us.user_record_id = u.record_id
     LEFT JOIN "Membership" m ON m.user_record_id = u.record_id AND m.tenant_id = u.tenant_id
     WHERE u.record_id = $1 AND u.tenant_id = $2`,
    [userId, tenantId]
  );

  if (rows.length === 0) {
    return fail(event, 404, { error: 'User not found' });
  }

  const profile = rows[0];

  return ok(event, 200, {
    recordId: profile.recordId,
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
    language: profile.language || 'en',
    timezone: profile.timezone || '',
    twoFactorEnabled: profile.twoFactorEnabled || false,
    passwordChangedAt: profile.passwordChangedAt,
    connectedEmail: profile.connectedEmail,
    connectedEmailConnectedAt: profile.connectedEmailConnectedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    role: profile.membershipRole,
    tenantId: profile.membershipTenantId || tenantId,
  });
}

async function updateCurrentUserProfile(event, userId, tenantId, data = {}) {
  if (!userId) {
    return fail(event, 401, { error: 'Unauthorized' });
  }

  const pool = getPool();

  // Map frontend field names to database column names
  const fieldMap = {
    name: 'full_name',
    phone: 'phone',
    language: 'language',
    timezone: 'timezone',
  };

  const updates = [];
  const values = [];
  let paramCount = 1;

  Object.entries(fieldMap).forEach(([frontendField, dbColumn]) => {
    if (data[frontendField] !== undefined) {
      updates.push(`${dbColumn} = $${paramCount++}`);
      values.push(data[frontendField]);
    }
  });

  // Handle avatarUrl separately - goes to User table
  if (data.avatarUrl !== undefined) {
    await pool.query(
      `UPDATE "User" SET avatar_url = $1, updated_at = NOW() WHERE record_id = $2 AND tenant_id = $3`,
      [data.avatarUrl, userId, tenantId]
    );
  }

  // Update UserSettings if there are fields to update
  if (updates.length > 0) {
    values.push(userId, tenantId);
    const result = await pool.query(
      `UPDATE "UserSettings"
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE user_record_id = $${paramCount} AND tenant_id = $${paramCount + 1}
       RETURNING user_record_id`,
      values
    );

    if (result.rowCount === 0) {
      return fail(event, 404, { error: 'User settings not found' });
    }
  }

  return await getCurrentUserProfile(event, userId, tenantId);
}

