/**
 * User Profile Service
 * Manages user-to-profile assignments and permission calculations
 * Implements profile inheritance and effective permission caching
 */

const { getPool } = require('/opt/nodejs');
const { getTenantIdFromEvent } = require('/opt/nodejs');
const permissionCalculator = require('./permission-calculator');

exports.handler = async (event) => {

  const { httpMethod: method, path } = event.requestContext.http;
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};

  // Extract tenant context
  const tenantId = await getTenantIdFromEvent(event);
  if (!tenantId) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing tenant context' }),
    };
  }

  // Extract user ID
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  const currentUserId = claims['sub'] || null;

  console.log('[ROUTING DEBUG]', {
    route: path,
    method,
    tenantId,
    userId: currentUserId,
  });

  try {
    // Route: GET /api/v1/users/profile
    if (method === 'GET' && path === '/api/v1/users/profile') {
      return await getCurrentUserProfile(currentUserId, tenantId);
    }

    // Route: PATCH /api/v1/users/profile
    if (method === 'PATCH' && path === '/api/v1/users/profile') {
      return await updateCurrentUserProfile(currentUserId, tenantId, body);
    }

    // Route: GET /api/v1/profiles
    if (method === 'GET' && path.endsWith('/profiles')) {
      return await listProfiles(tenantId);
    }

    // Route: GET /api/v1/profiles/{profileId}
    if (method === 'GET' && path.match(/\/profiles\/\d+$/)) {
      const profileId = parseInt(pathParams.profileId, 10);
      return await getProfile(profileId, tenantId);
    }

    // Route: GET /api/v1/users/{userId}/profiles
    if (method === 'GET' && path.match(/\/users\/[^/]+\/profiles$/)) {
      const userId = pathParams.userId;
      return await getUserProfiles(userId, tenantId);
    }

    // Route: POST /api/v1/users/{userId}/profiles
    if (method === 'POST' && path.match(/\/users\/[^/]+\/profiles$/)) {
      const userId = pathParams.userId;
      return await assignProfile(userId, tenantId, body, currentUserId);
    }

    // Route: DELETE /api/v1/users/{userId}/profiles/{profileId}
    if (method === 'DELETE' && path.match(/\/users\/[^/]+\/profiles\/\d+$/)) {
      const userId = pathParams.userId;
      const profileId = parseInt(pathParams.profileId, 10);
      return await unassignProfile(userId, tenantId, profileId, currentUserId);
    }

    // Route: GET /api/v1/users/{userId}/effective-permissions
    if (method === 'GET' && path.match(/\/users\/[^/]+\/effective-permissions$/)) {
      const userId = pathParams.userId;
      const objectType = queryParams.objectType;
      return await getEffectivePermissions(userId, tenantId, objectType);
    }

    // Route: POST /api/v1/permissions/calculate
    if (method === 'POST' && path.endsWith('/permissions/calculate')) {
      return await calculatePermissions(body.userId, tenantId, body.propertyId);
    }

    // Route: POST /api/v1/permissions/invalidate-cache
    if (method === 'POST' && path.endsWith('/permissions/invalidate-cache')) {
      return await invalidateCache(body.userId, tenantId);
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (error) {
    console.error('Error in user-profile-service:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

/**
 * List all permission profiles
 */
async function listProfiles(tenantId) {
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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.rows),
  };
}

/**
 * Get a specific profile
 */
async function getProfile(profileId, tenantId) {
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
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Profile not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.rows[0]),
  };
}

/**
 * Get profiles assigned to a user
 */
async function getUserProfiles(userId, tenantId) {
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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.rows),
  };
}

/**
 * Assign a profile to a user
 */
async function assignProfile(userId, tenantId, data, assignedBy) {
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

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0]),
    };
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
async function unassignProfile(userId, tenantId, profileId, unassignedBy) {
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
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Profile assignment not found' }),
    };
  }

  // Invalidate permission cache
  await pool.query(
    `UPDATE "EffectivePermissionCache"
     SET "is_valid" = false
     WHERE "user_id" = $1 AND "tenant_id" = $2`,
    [userId, tenantId]
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Profile unassigned successfully' }),
  };
}

/**
 * Get effective permissions for a user
 */
async function getEffectivePermissions(userId, tenantId, objectType) {
  const pool = getPool();

  const result = await pool.query(
    'SELECT * FROM get_accessible_properties($1, $2, $3, $4)',
    [userId, tenantId, objectType || null, 'read-only']
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.rows),
  };
}

/**
 * Calculate permissions for a specific property
 */
async function calculatePermissions(userId, tenantId, propertyId) {
  const effectiveAccess = await permissionCalculator.calculate(userId, tenantId, propertyId);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      tenantId,
      propertyId,
      effectiveAccess,
    }),
  };
}

/**
 * Invalidate permission cache for a user
 */
async function invalidateCache(userId, tenantId) {
  const pool = getPool();

  const result = await pool.query(
    `UPDATE "EffectivePermissionCache"
     SET "is_valid" = false
     WHERE "user_id" = $1 AND "tenant_id" = $2`,
    [userId, tenantId]
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Permission cache invalidated',
      invalidatedCount: result.rowCount,
    }),
  };
}

async function getCurrentUserProfile(userId, tenantId) {
  if (!userId) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const pool = getPool();
  const { rows } = await pool.query(
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

  if (rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'User not found' }),
    };
  }

  const profile = rows[0];

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recordId: profile.recordId,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      role: profile.membershipRole,
      tenantId: profile.membershipTenantId || tenantId,
    }),
  };
}

async function updateCurrentUserProfile(userId, tenantId, data = {}) {
  if (!userId) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const allowedFields = ['name', 'phone', 'avatarUrl'];
  const updates = [];
  const values = [];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      updates.push(`"${field}" = $${updates.length + 1}`);
      values.push(data[field]);
    }
  });

  if (updates.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'No valid fields provided' }),
    };
  }

  values.push(userId);

  const pool = getPool();
  const result = await pool.query(
    `UPDATE "User"
     SET ${updates.join(', ')}, "updatedAt" = NOW()
     WHERE "recordId" = $${values.length}
     RETURNING "recordId"`,
    values
  );

  if (result.rowCount === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'User not found' }),
    };
  }

  return await getCurrentUserProfile(userId, tenantId);
}

