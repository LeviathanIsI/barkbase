// This Lambda function will be attached to the 'db-layer'
// The 'pg' and 'bcryptjs' libraries will be available.
const { Router } = require('express');
const { getPool } = require('../../lib/db');
const bcrypt = require("bcryptjs");

const router = Router();

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
};

const BCRYPT_ROUNDS = 12; // OWASP recommended minimum

// Error codes for standardized responses
const ERROR_CODES = {
  UNAUTHORIZED: 'USER_001',
  FORBIDDEN: 'USER_002',
  NOT_FOUND: 'USER_003',
  DUPLICATE: 'USER_004',
  INVALID_INPUT: 'USER_005',
  INTERNAL_ERROR: 'SYS_001'
};

/**
 * Extract user info from API Gateway JWT authorizer
 * @param {Object} event - Lambda event object
 * @returns {Object|null} User info with sub, tenantId, role
 */
function getUserInfoFromEvent(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims) {
    console.error('[USERS] No JWT claims found in event');
    return null;
  }

  return {
    sub: claims.sub, // User ID
    email: claims.email,
    tenantId: claims['custom:tenantId'] || claims.tenantId,
    role: claims['custom:role'] || claims.role
  };
}

/**
 * Create standardized error response
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Application error code
 * @param {string} message - User-facing error message
 * @param {Object} error - Original error for logging
 * @returns {Object} Lambda response object
 */
function errorResponse(statusCode, errorCode, message, error = null) {
  if (error) {
    console.error(`[USERS_ERROR] ${errorCode}: ${message}`, {
      error: error.message,
      stack: error.stack
    });
  }

  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify({
      error: errorCode,
      message
    })
  };
}

const buildRequestingUser = (req) => ({
  sub: req.user?.sub || req.user?.userId || req.user?.id,
  email: req.user?.email,
  tenantId: req.tenantId,
  role: req.user?.role,
});

const buildEventFromRequest = (req) => {
  const path = (req.baseUrl || '') + req.path;
  const body = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null;
  const claims = {
    sub: req.user?.sub || req.user?.userId || req.user?.id,
    email: req.user?.email,
    tenantId: req.tenantId,
    'custom:tenantId': req.tenantId,
    role: req.user?.role,
    'custom:role': req.user?.role,
  };

  return {
    headers: req.headers,
    pathParameters: req.params,
    queryStringParameters: Object.keys(req.query || {}).length ? req.query : undefined,
    body,
    requestContext: {
      http: {
        method: req.method,
        path,
      },
      authorizer: {
        jwt: {
          claims,
        },
      },
    },
  };
};

const sendLambdaResponse = (res, lambdaResponse) => {
  if (!lambdaResponse) {
    return res.status(204).end();
  }

  const { statusCode = 200, headers = {}, body = '' } = lambdaResponse;
  if (headers) {
    res.set(headers);
  }

  if (statusCode === 204 || body === '') {
    return res.status(statusCode).end();
  }

  try {
    const parsed = JSON.parse(body);
    return res.status(statusCode).json(parsed);
  } catch (err) {
    return res.status(statusCode).send(body);
  }
};

router.get('/users/:id', async (req, res) => {
  try {
    const event = buildEventFromRequest(req);
    const response = await getUserById(event, buildRequestingUser(req));
    return sendLambdaResponse(res, response);
  } catch (error) {
    console.error('[users] getUserById failed', error);
    return res.status(500).json({ error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Server Error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const event = buildEventFromRequest(req);
    const response = await listUsers(event, buildRequestingUser(req));
    return sendLambdaResponse(res, response);
  } catch (error) {
    console.error('[users] listUsers failed', error);
    return res.status(500).json({ error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Server Error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const event = buildEventFromRequest(req);
    const response = await createUser(event, buildRequestingUser(req));
    return sendLambdaResponse(res, response);
  } catch (error) {
    console.error('[users] createUser failed', error);
    return res.status(500).json({ error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Server Error' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const event = buildEventFromRequest(req);
    const response = await updateUser(event, buildRequestingUser(req));
    return sendLambdaResponse(res, response);
  } catch (error) {
    console.error('[users] updateUser failed', error);
    return res.status(500).json({ error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Server Error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const event = buildEventFromRequest(req);
    const response = await deleteUser(event, buildRequestingUser(req));
    return sendLambdaResponse(res, response);
  } catch (error) {
    console.error('[users] deleteUser failed', error);
    return res.status(500).json({ error: ERROR_CODES.INTERNAL_ERROR, message: 'Internal Server Error' });
  }
});

module.exports = router;

/**
 * CRITICAL SECURITY FIX: Get user by ID with tenant isolation
 *
 * SECURITY REQUIREMENTS:
 * 1. Only allow access to users within requesting user's tenant
 * 2. Verify shared tenant membership via Membership table JOIN
 * 3. Return 404 (not 403) to maintain security through obscurity
 * 4. Never expose user data across tenant boundaries
 *
 * @param {Object} event - Lambda event
 * @param {Object} requestingUser - Authenticated user from JWT
 * @returns {Object} Lambda response
 */
const getUserById = async (event, requestingUser) => {
  const userId = event.pathParameters.id;
  if (!userId) {
    return errorResponse(400, ERROR_CODES.INVALID_INPUT, "User ID is required");
  }

  const pool = getPool();

  // SECURITY: Verify requesting user has access to target user via shared tenant
  // Using JOIN with Membership table to ensure tenant isolation
  const { rows } = await pool.query(
    `SELECT DISTINCT u."recordId", u."email", u."name", u."phone", u."avatarUrl", u."createdAt"
     FROM "User" u
     INNER JOIN "Membership" m1 ON u."recordId" = m1."userId"
     INNER JOIN "Membership" m2 ON m1."tenantId" = m2."tenantId"
     WHERE u."recordId" = $1
       AND m2."userId" = $2
       AND m2."tenantId" = $3`,
    [userId, requestingUser.sub, requestingUser.tenantId]
  );

  // SECURITY: Return 404 instead of 403 to prevent tenant enumeration
  if (rows.length === 0) {
    console.log(`[USERS] Access denied: User ${requestingUser.sub} attempted to access user ${userId} (tenant: ${requestingUser.tenantId})`);
    return errorResponse(404, ERROR_CODES.NOT_FOUND, "User not found");
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(rows[0]),
  };
};

/**
 * CRITICAL SECURITY FIX: List users with tenant isolation
 *
 * SECURITY REQUIREMENTS:
 * 1. Only return users within requesting user's tenant
 * 2. Filter via Membership table JOIN
 * 3. Include role information for UI
 *
 * @param {Object} event - Lambda event
 * @param {Object} requestingUser - Authenticated user from JWT
 * @returns {Object} Lambda response
 */
const listUsers = async (event, requestingUser) => {
  const limit = parseInt(event.queryStringParameters?.limit) || 20;
  const offset = parseInt(event.queryStringParameters?.offset) || 0;

  // Input validation
  if (limit > 100) {
    return errorResponse(400, ERROR_CODES.INVALID_INPUT, "Limit cannot exceed 100");
  }
  if (limit < 1 || offset < 0) {
    return errorResponse(400, ERROR_CODES.INVALID_INPUT, "Invalid pagination parameters");
  }

  const pool = getPool();

  // SECURITY: Only return users in requesting user's tenant
  const { rows } = await pool.query(
    `SELECT DISTINCT u."recordId", u."email", u."name", u."createdAt", m."role"
     FROM "User" u
     INNER JOIN "Membership" m ON u."recordId" = m."userId"
     WHERE m."tenantId" = $1
     ORDER BY u."createdAt" DESC
     LIMIT $2 OFFSET $3`,
    [requestingUser.tenantId, limit, offset]
  );

  // SECURITY: Count only users in requesting user's tenant
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(DISTINCT u."recordId") as count
     FROM "User" u
     INNER JOIN "Membership" m ON u."recordId" = m."userId"
     WHERE m."tenantId" = $1`,
    [requestingUser.tenantId]
  );
  const totalCount = parseInt(countRows[0].count, 10);

  return {
    statusCode: 200,
    headers: {
      ...HEADERS,
      "X-Total-Count": totalCount,
    },
    body: JSON.stringify(rows),
  };
};

/**
 * Create user (Note: Consider using /api/v1/auth/register instead for production)
 * This endpoint is kept for backward compatibility but should verify tenant permissions
 *
 * @param {Object} event - Lambda event
 * @param {Object} requestingUser - Authenticated user from JWT
 * @returns {Object} Lambda response
 */
const createUser = async (event, requestingUser) => {
  const body = JSON.parse(event.body);
  const { email, password, name, phone } = body;

  if (!email || !password) {
    return errorResponse(400, ERROR_CODES.INVALID_INPUT, "Email and password are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return errorResponse(400, ERROR_CODES.INVALID_INPUT, "Invalid email format");
  }

  // Validate password strength
  if (password.length < 8) {
    return errorResponse(400, ERROR_CODES.INVALID_INPUT, "Password must be at least 8 characters");
  }

  // SECURITY: Hash password with OWASP recommended rounds
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      'INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "phone", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING "recordId", "email", "name", "createdAt"',
      [email.toLowerCase(), passwordHash, name, phone]
    );

    console.log(`[USERS] User created: ${rows[0].recordId} by ${requestingUser.sub}`);

    return {
      statusCode: 201,
      headers: HEADERS,
      body: JSON.stringify(rows[0]),
    };
  } catch (error) {
    // Check for unique constraint violation (duplicate email)
    if (error.code === "23505") {
      return errorResponse(409, ERROR_CODES.DUPLICATE, "A user with this email already exists");
    }
    throw error; // Rethrow other errors to be caught by the main handler
  }
};

/**
 * SECURITY FIX: Update user with tenant isolation
 * Users can only update other users in their tenant, or themselves
 *
 * @param {Object} event - Lambda event
 * @param {Object} requestingUser - Authenticated user from JWT
 * @returns {Object} Lambda response
 */
const updateUser = async (event, requestingUser) => {
  const userId = event.pathParameters.id;
  const body = JSON.parse(event.body);
  const { name, phone, avatarUrl, timezone, language, preferences } = body;

  // Dynamically build the update query
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    fields.push(`"name" = $${paramCount++}`);
    values.push(name);
  }
  if (phone !== undefined) {
    fields.push(`"phone" = $${paramCount++}`);
    values.push(phone);
  }
  if (avatarUrl !== undefined) {
    fields.push(`"avatarUrl" = $${paramCount++}`);
    values.push(avatarUrl);
  }
  if (timezone !== undefined) {
    fields.push(`"timezone" = $${paramCount++}`);
    values.push(timezone);
  }
  if (language !== undefined) {
    fields.push(`"language" = $${paramCount++}`);
    values.push(language);
  }
  if (preferences !== undefined) {
    fields.push(`"preferences" = $${paramCount++}`);
    values.push(JSON.stringify(preferences));
  }

  if (fields.length === 0) {
    return errorResponse(400, ERROR_CODES.INVALID_INPUT, "No valid fields provided for update");
  }

  const pool = getPool();

  // SECURITY: Verify user has access to target user via shared tenant
  const accessCheck = await pool.query(
    `SELECT COUNT(*) as count
     FROM "User" u
     INNER JOIN "Membership" m1 ON u."recordId" = m1."userId"
     INNER JOIN "Membership" m2 ON m1."tenantId" = m2."tenantId"
     WHERE u."recordId" = $1
       AND m2."userId" = $2
       AND m2."tenantId" = $3`,
    [userId, requestingUser.sub, requestingUser.tenantId]
  );

  if (parseInt(accessCheck.rows[0].count) === 0) {
    console.log(`[USERS] Update denied: User ${requestingUser.sub} attempted to update user ${userId}`);
    return errorResponse(404, ERROR_CODES.NOT_FOUND, "User not found");
  }

  const setClause = fields.join(", ");
  const query = `UPDATE "User" SET ${setClause}, "updatedAt" = NOW() WHERE "recordId" = $${paramCount} RETURNING "recordId", "email", "name", "phone", "avatarUrl", "updatedAt"`;
  values.push(userId);

  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    return errorResponse(404, ERROR_CODES.NOT_FOUND, "User not found");
  }

  console.log(`[USERS] User updated: ${userId} by ${requestingUser.sub}`);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(rows[0]),
  };
};

/**
 * SECURITY FIX: Delete user with tenant isolation
 * Only OWNER/ADMIN can delete users, and only within their tenant
 *
 * @param {Object} event - Lambda event
 * @param {Object} requestingUser - Authenticated user from JWT
 * @returns {Object} Lambda response
 */
const deleteUser = async (event, requestingUser) => {
  const userId = event.pathParameters.id;

  // SECURITY: Only OWNER/ADMIN can delete users
  if (!['OWNER', 'ADMIN'].includes(requestingUser.role)) {
    return errorResponse(403, ERROR_CODES.FORBIDDEN, "Insufficient permissions");
  }

  const pool = getPool();

  // SECURITY: Verify user exists in requesting user's tenant before deleting
  const accessCheck = await pool.query(
    `SELECT COUNT(*) as count
     FROM "User" u
     INNER JOIN "Membership" m ON u."recordId" = m."userId"
     WHERE u."recordId" = $1 AND m."tenantId" = $2`,
    [userId, requestingUser.tenantId]
  );

  if (parseInt(accessCheck.rows[0].count) === 0) {
    console.log(`[USERS] Delete denied: User ${requestingUser.sub} attempted to delete user ${userId}`);
    return errorResponse(404, ERROR_CODES.NOT_FOUND, "User not found");
  }

  // Prevent self-deletion
  if (userId === requestingUser.sub) {
    return errorResponse(400, ERROR_CODES.INVALID_INPUT, "Cannot delete your own account");
  }

  const { rowCount } = await pool.query(
    'DELETE FROM "User" WHERE "recordId" = $1',
    [userId]
  );

  if (rowCount === 0) {
    return errorResponse(404, ERROR_CODES.NOT_FOUND, "User not found");
  }

  console.log(`[USERS] User deleted: ${userId} by ${requestingUser.sub}`);

  return {
    statusCode: 204, // No Content
    headers: HEADERS,
    body: "",
  };
};
