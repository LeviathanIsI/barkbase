const { getPool } = require('/opt/nodejs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
    getSecureHeaders,
    auditLog,
    securityEvent,
    getRequestMetadata,
    errorResponse: createErrorResponse,
    successResponse: createSuccessResponse
} = require('../shared/security-utils');

// SECURITY: Fail fast if JWT_SECRET is not configured
// This prevents deployment with weak default secrets
if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set. Generate using: openssl rand -base64 64');
}

// SECURITY: Support multiple JWT secrets for rotation
// Primary secret is used for signing new tokens
// Secondary secrets support validation of tokens signed with old secrets during rotation
const JWT_SECRET_PRIMARY = process.env.JWT_SECRET;
const JWT_SECRET_SECONDARY = process.env.JWT_SECRET_OLD || null; // Old secret during rotation
const JWT_SECRETS = [JWT_SECRET_PRIMARY, JWT_SECRET_SECONDARY].filter(Boolean);

const JWT_ACCESS_TTL = '15m';
const JWT_REFRESH_TTL = '30d';
const BCRYPT_ROUNDS = 12; // OWASP recommended minimum

/**
 * Verify JWT token with support for multiple secrets (rotation)
 * Tries primary secret first, falls back to secondary if available
 *
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid with all secrets
 */
function verifyJWT(token) {
    let lastError;

    // Try each secret in order
    for (const secret of JWT_SECRETS) {
        try {
            return jwt.verify(token, secret);
        } catch (err) {
            lastError = err;
            // Continue to next secret
        }
    }

    // All secrets failed
    throw lastError || new Error('Invalid token');
}

// Error codes for client responses
const ERROR_CODES = {
    INVALID_CREDENTIALS: 'AUTH_001',
    MISSING_FIELDS: 'AUTH_002',
    DUPLICATE_USER: 'AUTH_003',
    DUPLICATE_TENANT: 'AUTH_004',
    INVALID_TOKEN: 'AUTH_005',
    UNAUTHORIZED: 'AUTH_006',
    INSUFFICIENT_PERMISSIONS: 'AUTH_007',
    DATABASE_ERROR: 'SYS_001',
    INTERNAL_ERROR: 'SYS_002'
};

/**
 * Extract user info from API Gateway JWT authorizer
 * @param {Object} event - Lambda event object
 * @returns {Object|null} User info with sub, tenantId, role, membershipId
 */
function getUserInfoFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
        console.error('[AUTH] No JWT claims found in event');
        return null;
    }

    return {
        sub: claims.sub, // User ID (Cognito sub or custom)
        username: claims.username,
        email: claims.email,
        tenantId: claims['custom:tenantId'] || claims.tenantId,
        role: claims['custom:role'] || claims.role,
        membershipId: claims.membershipId
    };
}

/**
 * Create standardized error response with security headers
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Application error code
 * @param {string} message - User-facing error message
 * @param {Object} details - Additional details (server-side logging only)
 * @param {Object} event - Lambda event for CORS origin
 * @returns {Object} Lambda response object
 */
function errorResponse(statusCode, errorCode, message, details = {}, event = null) {
    // Log detailed error server-side for debugging
    if (details.error) {
        console.error(`[AUTH_ERROR] ${errorCode}: ${message}`, {
            error: details.error.message,
            stack: details.error.stack,
            context: details.context
        });
    }

    // Use shared security utilities for response
    return createErrorResponse(statusCode, errorCode, message, event || details.event);
}

// auditLog function now imported from security-utils

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    try {
        if (httpMethod === 'POST' && path === '/api/v1/auth/login') {
            return await login(event);
        }
        if (httpMethod === 'POST' && path === '/api/v1/auth/signup') {
            return await signup(event);
        }
        if (httpMethod === 'POST' && path === '/api/v1/auth/refresh') {
            return await refresh(event);
        }
        if (httpMethod === 'POST' && path === '/api/v1/auth/logout') {
            return await logout(event);
        }
        if (httpMethod === 'POST' && path === '/api/v1/auth/register') {
            return await register(event);
        }

        return createErrorResponse(404, 'NOT_FOUND', 'Not Found', event);
    } catch (error) {
        // Log detailed error server-side only
        return errorResponse(500, ERROR_CODES.INTERNAL_ERROR, 'Internal Server Error', {
            error,
            context: { path, httpMethod },
            event
        });
    }
};

async function login(event) {
    const metadata = getRequestMetadata(event);

    try {
        const { email, password } = JSON.parse(event.body || '{}');

        if (!email || !password) {
            auditLog('LOGIN_FAILED', {
                reason: 'missing_fields',
                email: email || 'not_provided',
                result: 'FAILURE',
                ...metadata
            });
            return errorResponse(400, ERROR_CODES.MISSING_FIELDS, 'Email and password required', { event });
        }

        const pool = getPool();

        // Smoke test the DB first to surface connectivity issues clearly
        try {
            await pool.query('SELECT 1');
        } catch (dbErr) {
            console.error('[AUTH] DB connectivity check failed:', dbErr?.message || dbErr);
            securityEvent('DATABASE_CONNECTION_FAILURE', 'HIGH', { ...metadata });
            return errorResponse(500, ERROR_CODES.DATABASE_ERROR, 'Service temporarily unavailable', { event });
        }

        const userResult = await pool.query(
            `SELECT u."recordId", u."email", u."passwordHash", u."name",
                    m."recordId" as "membershipId", m."role", m."tenantId",
                    t."recordId" as "tenantRecordId", t."slug", t."name" as "tenantName", t."plan"
             FROM public."User" u
             INNER JOIN public."Membership" m ON u."recordId" = m."userId"
             INNER JOIN public."Tenant" t ON m."tenantId" = t."recordId"
             WHERE LOWER(u."email") = LOWER($1)
             ORDER BY m."updatedAt" DESC
             LIMIT 1`,
            [email]
        );

        if (userResult.rows.length === 0) {
            auditLog('LOGIN_FAILED', {
                reason: 'invalid_credentials',
                email,
                result: 'FAILURE',
                ...metadata
            });
            securityEvent('LOGIN_FAILED_USER_NOT_FOUND', 'MEDIUM', { email, ...metadata });
            return errorResponse(401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password', { event });
        }

        const user = userResult.rows[0];
        const tenant = {
            recordId: user.tenantRecordId,
            slug: user.slug,
            name: user.tenantName,
            plan: user.plan
        };

        const validPassword = await bcrypt.compare(password, user.passwordHash || '');
        if (!validPassword) {
            auditLog('LOGIN_FAILED', {
                reason: 'invalid_password',
                email,
                userId: user.recordId,
                result: 'FAILURE',
                ...metadata
            });
            securityEvent('LOGIN_FAILED_INVALID_PASSWORD', 'MEDIUM', {
                email,
                userId: user.recordId,
                ...metadata
            });
            return errorResponse(401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password', { event });
        }

        // SECURITY: Check if password hash needs upgrading (for backward compatibility)
        const needsRehash = await bcrypt.getRounds(user.passwordHash) < BCRYPT_ROUNDS;
        if (needsRehash) {
            const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            await pool.query(
                `UPDATE "User" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
                [newHash, user.recordId]
            );
            console.log(`[AUTH] Password hash upgraded for user ${user.recordId}`);
        }

        const accessToken = jwt.sign(
            { sub: user.recordId, tenantId: tenant.recordId, membershipId: user.membershipId, role: user.role },
            JWT_SECRET_PRIMARY,
            { expiresIn: JWT_ACCESS_TTL }
        );

        const refreshToken = jwt.sign(
            { sub: user.recordId, tenantId: tenant.recordId, membershipId: user.membershipId },
            JWT_SECRET_PRIMARY,
            { expiresIn: JWT_REFRESH_TTL }
        );

        await pool.query(
            `UPDATE "Membership" SET "refreshToken" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
            [refreshToken, user.membershipId]
        );

        const metadata = getRequestMetadata(event);
        auditLog('LOGIN_SUCCESS', {
            userId: user.recordId,
            tenantId: tenant.recordId,
            email,
            result: 'SUCCESS',
            ...metadata
        });

        return createSuccessResponse(200, {
            accessToken,
            refreshToken,
            user: { recordId: user.recordId, email: user.email, role: user.role },
            tenant: { recordId: tenant.recordId, slug: tenant.slug, name: tenant.name, plan: tenant.plan }
        }, event);
    } catch (err) {
        return errorResponse(500, ERROR_CODES.INTERNAL_ERROR, 'Internal Server Error', {
            error: err,
            context: { action: 'login', sourceIp }
        });
    }
}

async function signup(event) {
    const metadata = getRequestMetadata(event);

    try {
        const { email, password, tenantName, tenantSlug, name } = JSON.parse(event.body || '{}');

        if (!email || !password || !tenantName || !tenantSlug) {
            auditLog('SIGNUP_FAILED', {
                reason: 'missing_fields',
                result: 'FAILURE',
                ...metadata
            });
            return errorResponse(400, ERROR_CODES.MISSING_FIELDS, 'Missing required fields', {}, event);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return errorResponse(400, ERROR_CODES.MISSING_FIELDS, 'Invalid email format', {}, event);
        }

        // Validate password strength
        if (password.length < 8) {
            return errorResponse(400, ERROR_CODES.MISSING_FIELDS, 'Password must be at least 8 characters', {}, event);
        }

        const pool = getPool();

        // Check if tenant slug exists
        const existingTenant = await pool.query(`SELECT "recordId" FROM "Tenant" WHERE "slug" = $1`, [tenantSlug]);
        if (existingTenant.rows.length > 0) {
            auditLog('SIGNUP_FAILED', {
                reason: 'tenant_slug_taken',
                tenantSlug,
                result: 'FAILURE',
                ...metadata
            });
            return errorResponse(409, ERROR_CODES.DUPLICATE_TENANT, 'Tenant slug already taken', {}, event);
        }

        // Check if user exists
        const existingUser = await pool.query(`SELECT "recordId" FROM "User" WHERE "email" = $1`, [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            auditLog('SIGNUP_FAILED', {
                reason: 'user_exists',
                email,
                result: 'FAILURE',
                ...metadata
            });
            return errorResponse(409, ERROR_CODES.DUPLICATE_USER, 'User already exists', {}, event);
        }

        // Hash password with OWASP recommended rounds
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Create tenant
        const tenantResult = await pool.query(
            `INSERT INTO "Tenant" ("recordId", "slug", "name", "plan", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'FREE', NOW())
             RETURNING "recordId", "slug", "name", "plan"`,
            [tenantSlug, tenantName]
        );
        const tenant = tenantResult.rows[0];

        // Create user
        const userResult = await pool.query(
            `INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, NOW())
             RETURNING "recordId", "email", "name"`,
            [email.toLowerCase(), passwordHash, name]
        );
        const user = userResult.rows[0];

        // Create membership
        const membershipResult = await pool.query(
            `INSERT INTO "Membership" ("recordId", "userId", "tenantId", "role", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW())
             RETURNING "recordId", "role"`,
            [user.recordId, tenant.recordId]
        );
        const membership = membershipResult.rows[0];

        // Generate tokens
        const accessToken = jwt.sign(
            { sub: user.recordId, tenantId: tenant.recordId, membershipId: membership.recordId, role: 'OWNER' },
            JWT_SECRET_PRIMARY,
            { expiresIn: JWT_ACCESS_TTL }
        );

        const refreshToken = jwt.sign(
            { sub: user.recordId, tenantId: tenant.recordId, membershipId: membership.recordId },
            JWT_SECRET_PRIMARY,
            { expiresIn: JWT_REFRESH_TTL }
        );

        // Store refresh token
        await pool.query(
            `UPDATE "Membership" SET "refreshToken" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
            [refreshToken, membership.recordId]
        );

        auditLog('SIGNUP_SUCCESS', {
            userId: user.recordId,
            tenantId: tenant.recordId,
            email,
            result: 'SUCCESS',
            ...metadata
        });

        return createSuccessResponse(201, {
            message: 'Workspace created successfully',
            accessToken,
            refreshToken,
            user,
            tenant
        }, event);
    } catch (err) {
        return errorResponse(500, ERROR_CODES.INTERNAL_ERROR, 'Internal Server Error', {
            error: err,
            context: { action: 'signup' },
            event
        });
    }
}

async function refresh(event) {
    const { refreshToken } = JSON.parse(event.body || '{}');
    if (!refreshToken) {
        return errorResponse(400, ERROR_CODES.MISSING_FIELDS, 'Missing refresh token', {}, event);
    }

    try {
        // SECURITY: Use verifyJWT to support token rotation
        const payload = verifyJWT(refreshToken);
        const pool = getPool();

        // Verify refresh token in database
        const result = await pool.query(
            `SELECT "recordId", "role", "userId" FROM "Membership"
             WHERE "recordId" = $1 AND "tenantId" = $2 AND "refreshToken" = $3`,
            [payload.membershipId, payload.tenantId, refreshToken]
        );

        if (result.rows.length === 0) {
            return errorResponse(401, ERROR_CODES.INVALID_TOKEN, 'Invalid refresh token', {}, event);
        }

        const membership = result.rows[0];

        // Issue new access token
        const accessToken = jwt.sign(
            { sub: membership.userId, tenantId: payload.tenantId, membershipId: membership.recordId, role: membership.role },
            JWT_SECRET_PRIMARY,
            { expiresIn: JWT_ACCESS_TTL }
        );

        return createSuccessResponse(200, { accessToken, role: membership.role }, event);
    } catch (error) {
        return errorResponse(401, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired token', {}, event);
    }
}

async function logout(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            // SECURITY: Use verifyJWT to support token rotation
            const payload = verifyJWT(token);

            const pool = getPool();
            await pool.query(
                `UPDATE "Membership" SET "refreshToken" = NULL, "updatedAt" = NOW() WHERE "recordId" = $1`,
                [payload.membershipId]
            );

            const metadata = getRequestMetadata(event);
            auditLog('LOGOUT_SUCCESS', {
                userId: payload.sub,
                tenantId: payload.tenantId,
                result: 'SUCCESS',
                ...metadata
            });
        } catch (error) {
            console.error('[AUTH] Logout error:', error.message);
            // Continue with logout even if token validation fails
        }
    }

    return createSuccessResponse(204, '', event);
}

/**
 * CRITICAL SECURITY FIX: Register new user to tenant
 *
 * SECURITY REQUIREMENTS:
 * 1. Extract tenantId from JWT claims only (NEVER from headers)
 * 2. Verify requesting user has OWNER or ADMIN role in their tenant
 * 3. Only allow registration within requesting user's own tenant
 * 4. Audit all registration attempts
 *
 * @param {Object} event - Lambda event with JWT claims
 * @returns {Object} Lambda response
 */
async function register(event) {
    const metadata = getRequestMetadata(event);

    try {
        // SECURITY: Extract user info from JWT claims (validated by API Gateway)
        const requestingUser = getUserInfoFromEvent(event);

        if (!requestingUser || !requestingUser.sub || !requestingUser.tenantId) {
            auditLog('REGISTER_FAILED', {
                reason: 'missing_jwt_claims',
                result: 'FAILURE',
                ...metadata
            });
            return errorResponse(401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized', {}, event);
        }

        const { email, password, name, role } = JSON.parse(event.body || '{}');

        // Input validation
        if (!email || !password || !name) {
            auditLog('REGISTER_FAILED', {
                reason: 'missing_fields',
                requestingUserId: requestingUser.sub,
                tenantId: requestingUser.tenantId,
                result: 'FAILURE',
                ...metadata
            });
            return errorResponse(400, ERROR_CODES.MISSING_FIELDS, 'Email, password, and name are required', {}, event);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return errorResponse(400, ERROR_CODES.MISSING_FIELDS, 'Invalid email format', {}, event);
        }

        // Validate password strength (minimum 8 characters)
        if (password.length < 8) {
            return errorResponse(400, ERROR_CODES.MISSING_FIELDS, 'Password must be at least 8 characters', {}, event);
        }

        const pool = getPool();

        // SECURITY: Verify requesting user has OWNER or ADMIN role in their tenant
        const authCheck = await pool.query(
            `SELECT m."role"
             FROM "Membership" m
             WHERE m."userId" = $1 AND m."tenantId" = $2`,
            [requestingUser.sub, requestingUser.tenantId]
        );

        if (authCheck.rows.length === 0) {
            auditLog('REGISTER_FAILED', {
                reason: 'no_membership',
                requestingUserId: requestingUser.sub,
                tenantId: requestingUser.tenantId,
                result: 'FAILURE',
                ...metadata
            });
            return errorResponse(403, ERROR_CODES.UNAUTHORIZED, 'Unauthorized', {}, event);
        }

        const requestingUserRole = authCheck.rows[0].role;

        // SECURITY: Only OWNER and ADMIN can register new users
        if (!['OWNER', 'ADMIN'].includes(requestingUserRole)) {
            auditLog('REGISTER_FAILED', {
                reason: 'insufficient_permissions',
                requestingUserId: requestingUser.sub,
                requestingUserRole,
                tenantId: requestingUser.tenantId,
                targetEmail: email,
                result: 'FAILURE',
                ...metadata
            });
            return errorResponse(403, ERROR_CODES.INSUFFICIENT_PERMISSIONS, 'Only account owners and administrators can invite users', {}, event);
        }

        // SECURITY: Use tenantId from JWT claims only (never from headers)
        const tenantId = requestingUser.tenantId;

        // Validate role assignment
        const validRoles = ['OWNER', 'ADMIN', 'STAFF', 'MEMBER'];
        const assignedRole = role || 'STAFF';

        if (!validRoles.includes(assignedRole)) {
            return errorResponse(400, ERROR_CODES.MISSING_FIELDS, `Invalid role. Must be one of: ${validRoles.join(', ')}`, {}, event);
        }

        // SECURITY: Only OWNER can create other OWNERs
        if (assignedRole === 'OWNER' && requestingUserRole !== 'OWNER') {
            auditLog('REGISTER_FAILED', {
                reason: 'cannot_assign_owner_role',
                requestingUserId: requestingUser.sub,
                requestingUserRole,
                tenantId,
                targetEmail: email,
                result: 'FAILURE',
                ...metadata
            });
            return errorResponse(403, ERROR_CODES.INSUFFICIENT_PERMISSIONS, 'Only account owners can assign OWNER role', {}, event);
        }

        // Hash password with OWASP recommended rounds
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Check if user exists
        let userResult = await pool.query(
            `SELECT "recordId" FROM "User" WHERE LOWER("email") = LOWER($1)`,
            [email]
        );
        let userId;

        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].recordId;

            // Check if user already has membership in this tenant
            const existingMembership = await pool.query(
                `SELECT "recordId" FROM "Membership" WHERE "userId" = $1 AND "tenantId" = $2`,
                [userId, tenantId]
            );

            if (existingMembership.rows.length > 0) {
                auditLog('REGISTER_FAILED', {
                    reason: 'user_already_member',
                    requestingUserId: requestingUser.sub,
                    targetUserId: userId,
                    tenantId,
                    result: 'FAILURE',
                    ...metadata
                });
                return errorResponse(409, ERROR_CODES.DUPLICATE_USER, 'User already exists in this workspace', {}, event);
            }
        } else {
            // Create new user
            const newUser = await pool.query(
                `INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, NOW())
                 RETURNING "recordId"`,
                [email.toLowerCase(), passwordHash, name]
            );
            userId = newUser.rows[0].recordId;
        }

        // Create membership in requesting user's tenant only
        const membershipResult = await pool.query(
            `INSERT INTO "Membership" ("recordId", "userId", "tenantId", "role", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, NOW())
             RETURNING "recordId", "role"`,
            [userId, tenantId, assignedRole]
        );

        const metadata = getRequestMetadata(event);
        auditLog('REGISTER_SUCCESS', {
            requestingUserId: requestingUser.sub,
            requestingUserRole,
            newUserId: userId,
            newUserEmail: email,
            assignedRole,
            tenantId,
            result: 'SUCCESS',
            ...metadata
        });

        return createSuccessResponse(201, {
            message: 'User registered successfully',
            membership: membershipResult.rows[0]
        }, event);
    } catch (err) {
        return errorResponse(500, ERROR_CODES.INTERNAL_ERROR, 'Internal Server Error', {
            error: err,
            context: { action: 'register' },
            event
        });
    }
}

