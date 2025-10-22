const { getPool } = require('/opt/nodejs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,x-tenant-slug',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Credentials': 'true'
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_ACCESS_TTL = '15m';
const JWT_REFRESH_TTL = '30d';

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

        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Auth error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

async function login(event) {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Email and password required' }) };
    }

    const pool = getPool();

    // Get user with ALL their memberships
    const userResult = await pool.query(
        `SELECT u."recordId", u."email", u."passwordHash", u."name",
                m."recordId" as "membershipId", m."role", m."tenantId",
                t."recordId" as "tenantRecordId", t."slug", t."name" as "tenantName", t."plan"
         FROM "User" u
         INNER JOIN "Membership" m ON u."recordId" = m."userId"
         INNER JOIN "Tenant" t ON m."tenantId" = t."recordId"
         WHERE u."email" = $1
         LIMIT 1`,
        [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
        return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Invalid credentials' }) };
    }

    const user = userResult.rows[0];
    const tenant = {
        recordId: user.tenantRecordId,
        slug: user.slug,
        name: user.tenantName,
        plan: user.plan
    };

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
        return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Invalid credentials' }) };
    }

    // Generate tokens
    const accessToken = jwt.sign(
        { sub: user.recordId, tenantId: tenant.recordId, membershipId: user.membershipId, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_ACCESS_TTL }
    );

    const refreshToken = jwt.sign(
        { sub: user.recordId, tenantId: tenant.recordId, membershipId: user.membershipId },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_TTL }
    );

    // Store refresh token
    await pool.query(
        `UPDATE "Membership" SET "refreshToken" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
        [refreshToken, user.membershipId]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
            accessToken,
            refreshToken,
            user: {
                recordId: user.recordId,
                email: user.email,
                role: user.role
            },
            tenant: {
                recordId: tenant.recordId,
                slug: tenant.slug,
                name: tenant.name,
                plan: tenant.plan
            }
        })
    };
}

async function signup(event) {
    const { email, password, tenantName, tenantSlug, name } = JSON.parse(event.body);

    if (!email || !password || !tenantName || !tenantSlug) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing required fields' }) };
    }

    const pool = getPool();

    // Check if tenant slug exists
    const existingTenant = await pool.query(`SELECT "recordId" FROM "Tenant" WHERE "slug" = $1`, [tenantSlug]);
    if (existingTenant.rows.length > 0) {
        return { statusCode: 409, headers: HEADERS, body: JSON.stringify({ message: 'Tenant slug already taken' }) };
    }

    // Check if user exists
    const existingUser = await pool.query(`SELECT "recordId" FROM "User" WHERE "email" = $1`, [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
        return { statusCode: 409, headers: HEADERS, body: JSON.stringify({ message: 'User already exists' }) };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

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
        JWT_SECRET,
        { expiresIn: JWT_ACCESS_TTL }
    );

    const refreshToken = jwt.sign(
        { sub: user.recordId, tenantId: tenant.recordId, membershipId: membership.recordId },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_TTL }
    );

    // Store refresh token
    await pool.query(
        `UPDATE "Membership" SET "refreshToken" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
        [refreshToken, membership.recordId]
    );

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify({
            message: 'Workspace created successfully',
            accessToken,
            refreshToken,
            user,
            tenant
        })
    };
}

async function refresh(event) {
    const { refreshToken } = JSON.parse(event.body || '{}');
    if (!refreshToken) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing refresh token' }) };
    }

    try {
        const payload = jwt.verify(refreshToken, JWT_SECRET);
        const pool = getPool();

        // Verify refresh token in database
        const result = await pool.query(
            `SELECT "recordId", "role", "userId" FROM "Membership" 
             WHERE "recordId" = $1 AND "tenantId" = $2 AND "refreshToken" = $3`,
            [payload.membershipId, payload.tenantId, refreshToken]
        );

        if (result.rows.length === 0) {
            return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Invalid refresh token' }) };
        }

        const membership = result.rows[0];

        // Issue new access token
        const accessToken = jwt.sign(
            { sub: membership.userId, tenantId: payload.tenantId, membershipId: membership.recordId, role: membership.role },
            JWT_SECRET,
            { expiresIn: JWT_ACCESS_TTL }
        );

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({ accessToken, role: membership.role })
        };
    } catch (error) {
        return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Invalid or expired token' }) };
    }
}

async function logout(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const payload = jwt.verify(token, JWT_SECRET);
            
            const pool = getPool();
            await pool.query(
                `UPDATE "Membership" SET "refreshToken" = NULL, "updatedAt" = NOW() WHERE "recordId" = $1`,
                [payload.membershipId]
            );
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    return {
        statusCode: 204,
        headers: HEADERS,
        body: ''
    };
}

async function register(event) {
    const { email, password, name, role } = JSON.parse(event.body);
    const tenantId = event.headers['x-tenant-id'];
    
    // TODO: Verify the requesting user is OWNER/ADMIN
    
    const pool = getPool();
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Check if user exists
    let userResult = await pool.query(`SELECT "recordId" FROM "User" WHERE "email" = $1`, [email.toLowerCase()]);
    let userId;
    
    if (userResult.rows.length > 0) {
        userId = userResult.rows[0].recordId;
    } else {
        const newUser = await pool.query(
            `INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "updatedAt") 
             VALUES (gen_random_uuid(), $1, $2, $3, NOW()) 
             RETURNING "recordId"`,
            [email.toLowerCase(), passwordHash, name]
        );
        userId = newUser.rows[0].recordId;
    }
    
    // Create membership
    const membershipResult = await pool.query(
        `INSERT INTO "Membership" ("recordId", "userId", "tenantId", "role", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, $3, NOW()) 
         RETURNING "recordId", "role"`,
        [userId, tenantId, role || 'STAFF']
    );
    
    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify({ message: 'User registered', membership: membershipResult.rows[0] })
    };
}

