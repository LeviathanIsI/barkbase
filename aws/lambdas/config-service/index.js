const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
};

// Extract user info from API Gateway authorizer (JWT already validated by API Gateway)
function getUserInfoFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
        console.error('No JWT claims found in event');
        return null;
    }

    return {
        sub: claims.sub,
        username: claims.username,
        email: claims.email,
        tenantId: claims['custom:tenantId'] || claims.tenantId,
        role: claims['custom:role'] || claims.role
    };
}

exports.handler = async (event) => {

    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: HEADERS, body: '' };
    }

    // Extract user info from API Gateway authorizer (JWT already validated)
    const userInfo = getUserInfoFromEvent(event);
    if (!userInfo) {
        return {
            statusCode: 401,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Unauthorized' }),
        };
    }

    // Get tenant ID from JWT claims or database
    const tenantId = userInfo.tenantId || await getTenantIdFromEvent(event);
    if (!tenantId) {
        return {
            statusCode: 401,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Missing tenant context' }),
        };
    }

    try {
        // ========== SERVICES ROUTES ==========
        if (path.startsWith('/api/v1/services')) {
            if (httpMethod === 'GET' && path === '/api/v1/services') {
                return await listServices(event, tenantId);
            }
            if (httpMethod === 'POST' && path === '/api/v1/services') {
                return await createService(event, tenantId, userInfo);
            }
            if (httpMethod === 'GET' && event.pathParameters?.id) {
                return await getServiceById(event, tenantId);
            }
            if (httpMethod === 'PUT' && event.pathParameters?.id) {
                return await updateService(event, tenantId, userInfo);
            }
            if (httpMethod === 'DELETE' && event.pathParameters?.id) {
                return await deleteService(event, tenantId, userInfo);
            }
        }

        // ========== TENANTS ROUTES ==========
        if (path.startsWith('/api/v1/tenants')) {
            // Public endpoint - get tenant by slug (no auth required for this specific case)
            const slug = event.queryStringParameters?.slug;
            if (httpMethod === 'GET' && slug) {
                return await getTenantBySlug(event, slug);
            }
            if (httpMethod === 'GET' && path === '/api/v1/tenants/current') {
                return await getCurrentTenant(event, tenantId);
            }
            if (httpMethod === 'GET' && path === '/api/v1/tenants/current/plan') {
                return await getTenantPlan(event, tenantId);
            }
            if (httpMethod === 'GET' && path === '/api/v1/tenants/current/onboarding') {
                return await getOnboarding(event, tenantId);
            }
            if (httpMethod === 'PATCH' && path === '/api/v1/tenants/current/onboarding') {
                return await updateOnboarding(event, tenantId);
            }
            if (httpMethod === 'PUT' && (path === '/api/v1/tenants/theme' || path === '/api/v1/tenants/current/theme')) {
                return await updateTheme(event, tenantId);
            }
            if (httpMethod === 'PUT' && path === '/api/v1/tenants/features') {
                return await updateFeatureFlags(event, tenantId);
            }
        }

        // ========== ROLES ROUTES ==========
        if (path.startsWith('/api/v1/roles')) {
            if (httpMethod === 'GET') {
                return await getRoles(event);
            }
        }

        // ========== ACCOUNT DEFAULTS ROUTES ==========
        if (path.startsWith('/api/v1/account-defaults')) {
            if (httpMethod === 'GET') {
                return await getAccountDefaults(event, tenantId);
            }
            if (httpMethod === 'PUT') {
                return await updateAccountDefaults(event, tenantId);
            }
        }

        // ========== FACILITY ROUTES ==========
        if (path.startsWith('/api/v1/facility')) {
            if (httpMethod === 'GET') {
                return await getFacilityOverview(event, tenantId);
            }
        }

        // ========== PACKAGES ROUTES ==========
        if (path.startsWith('/api/v1/packages')) {
            if (httpMethod === 'GET') {
                return await getPackages(event, tenantId);
            }
            if (httpMethod === 'POST') {
                return await createPackage(event, tenantId);
            }
        }

        // ========== MEMBERSHIPS ROUTES ==========
        if (path.startsWith('/api/v1/memberships')) {
            if (httpMethod === 'GET') {
                return await getMemberships(event, tenantId);
            }
            if (httpMethod === 'PUT' && event.pathParameters?.membershipId) {
                return await updateMembership(event, tenantId);
            }
            if (httpMethod === 'DELETE' && event.pathParameters?.membershipId) {
                return await deleteMembership(event, tenantId);
            }
        }

        // ========== USER PERMISSIONS ROUTES ==========
        if (path.startsWith('/api/v1/user-permissions')) {
            if (httpMethod === 'GET') {
                return await getUserPermissions(event);
            }
        }

        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Not Found' }),
        };

    } catch (error) {
        console.error('Config service error:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

// ========================================
// SERVICES HANDLERS
// ========================================

async function listServices(event, tenantId) {
    const pool = getPool();
    const { category, isActive } = event.queryStringParameters || {};

    let query = `
        SELECT s.*,
               COUNT(DISTINCT b."recordId") as "bookingCount"
        FROM "Service" s
        LEFT JOIN "Booking" b ON s."recordId" = b."serviceId" AND b."tenantId" = $1
        WHERE s."tenantId" = $1`;

    const params = [tenantId];

    if (category) {
        query += ` AND s."category" = $${params.length + 1}`;
        params.push(category);
    }

    if (isActive !== undefined) {
        query += ` AND s."isActive" = $${params.length + 1}`;
        params.push(isActive === 'true');
    }

    query += ` GROUP BY s."recordId"`;
    query += ` ORDER BY s."category", s."name"`;

    const result = await pool.query(query, params);

    const services = result.rows.map(row => ({
        ...row,
        price: row.priceInCents / 100,
        bookingCount: parseInt(row.bookingCount)
    }));

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(services),
    };
}

async function createService(event, tenantId, userInfo) {
    const pool = getPool();
    const {
        name,
        category,
        description,
        priceInCents,
        duration,
        isActive = true,
        settings = {}
    } = JSON.parse(event.body || '{}');

    if (!name || !category || priceInCents === undefined) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Name, category, and priceInCents are required' }),
        };
    }

    // Validate role - only OWNER or ADMIN can create services
    if (!['OWNER', 'ADMIN'].includes(userInfo.role)) {
        return {
            statusCode: 403,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Insufficient permissions' }),
        };
    }

    const result = await pool.query(
        `INSERT INTO "Service" (
            "recordId", "tenantId", "name", "category",
            "description", "priceInCents", "duration",
            "isActive", "settings"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *`,
        [
            tenantId, name, category, description,
            priceInCents, duration, isActive,
            JSON.stringify(settings)
        ]
    );

    const service = result.rows[0];
    service.price = service.priceInCents / 100;

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(service),
    };
}

async function getServiceById(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;

    const result = await pool.query(
        `SELECT s.*,
                COUNT(DISTINCT b."recordId") as "bookingCount",
                SUM(b."totalPriceInCents") as "totalRevenueCents"
         FROM "Service" s
         LEFT JOIN "Booking" b ON s."recordId" = b."serviceId"
            AND b."tenantId" = $1
            AND b."status" IN ('COMPLETED', 'CHECKED_IN')
         WHERE s."recordId" = $2 AND s."tenantId" = $1
         GROUP BY s."recordId"`,
        [tenantId, id]
    );

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Service not found' }),
        };
    }

    const service = result.rows[0];
    service.price = service.priceInCents / 100;
    service.bookingCount = parseInt(service.bookingCount);
    service.totalRevenue = (service.totalRevenueCents || 0) / 100;

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(service),
    };
}

async function updateService(event, tenantId, userInfo) {
    const pool = getPool();
    const { id } = event.pathParameters;
    const updates = JSON.parse(event.body || '{}');

    // Validate role - only OWNER or ADMIN can update services
    if (!['OWNER', 'ADMIN'].includes(userInfo.role)) {
        return {
            statusCode: 403,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Insufficient permissions' }),
        };
    }

    // Check if service exists
    const checkResult = await pool.query(
        'SELECT "recordId" FROM "Service" WHERE "recordId" = $1 AND "tenantId" = $2',
        [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Service not found' }),
        };
    }

    // Build dynamic update query
    const allowedFields = [
        'name', 'category', 'description', 'priceInCents',
        'duration', 'isActive', 'settings'
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 3; // Starting after id and tenantId

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
            updateFields.push(`"${key}" = $${paramCount++}`);
            values.push(key === 'settings' ? JSON.stringify(updates[key]) : updates[key]);
        }
    });

    if (updateFields.length === 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'No valid fields to update' }),
        };
    }

    updateFields.push(`"updatedAt" = NOW()`);

    const updateQuery = `
        UPDATE "Service"
        SET ${updateFields.join(', ')}
        WHERE "recordId" = $1 AND "tenantId" = $2
        RETURNING *
    `;

    const result = await pool.query(updateQuery, [id, tenantId, ...values]);
    const service = result.rows[0];
    service.price = service.priceInCents / 100;

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(service),
    };
}

async function deleteService(event, tenantId, userInfo) {
    const pool = getPool();
    const { id } = event.pathParameters;

    // Validate role - only OWNER can delete services
    if (userInfo.role !== 'OWNER') {
        return {
            statusCode: 403,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Only owners can delete services' }),
        };
    }

    // Check if service is used in any bookings
    const bookingCheck = await pool.query(
        'SELECT COUNT(*) FROM "Booking" WHERE "serviceId" = $1 AND "tenantId" = $2',
        [id, tenantId]
    );

    if (parseInt(bookingCheck.rows[0].count) > 0) {
        // Soft delete - just deactivate it
        await pool.query(
            'UPDATE "Service" SET "isActive" = false, "updatedAt" = NOW() WHERE "recordId" = $1 AND "tenantId" = $2',
            [id, tenantId]
        );

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({
                message: 'Service deactivated (has existing bookings)'
            }),
        };
    }

    // Hard delete if no bookings
    const result = await pool.query(
        'DELETE FROM "Service" WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING "recordId"',
        [id, tenantId]
    );

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Service not found' }),
        };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ message: 'Service deleted successfully' }),
    };
}

// ========================================
// TENANTS HANDLERS
// ========================================

async function getTenantBySlug(event, slug) {
    try {
        const pool = getPool();

        const result = await pool.query(
            `SELECT "recordId", "slug", "name", "plan", "themeJson", "featureFlags", "customDomain", "settings", "createdAt", "updatedAt"
             FROM "Tenant" WHERE "slug" = $1`,
            [slug]
        );


        if (result.rows.length === 0) {
            return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Tenant not found' }) };
        }

        const tenant = result.rows[0];

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify(tenant)
        };
    } catch (error) {
        console.error('getTenantBySlug error:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: error.message, stack: error.stack })
        };
    }
}

async function getCurrentTenant(event, tenantId) {
    const pool = getPool();

    const { rows } = await pool.query(
        `SELECT "recordId", "slug", "name", "plan", "themeJson", "featureFlags", "customDomain", "settings", "createdAt", "updatedAt"
         FROM "Tenant" WHERE "recordId" = $1`,
        [tenantId]
    );

    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Tenant not found' }) };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function getTenantPlan(event, tenantId) {
    const pool = getPool();

    const { rows } = await pool.query(
        `SELECT "plan", "featureFlags" FROM "Tenant" WHERE "recordId" = $1`,
        [tenantId]
    );

    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Tenant not found' }) };
    }

    const tenant = rows[0];

    // Define plan features (matching your backend features.js)
    const planFeatures = {
        FREE: { seats: 1, locations: 1, activePets: 10, bookingsPerMonth: 150 },
        PRO: { seats: 5, locations: 3, activePets: Infinity, bookingsPerMonth: 2500, advancedReports: true },
        ENTERPRISE: { seats: Infinity, locations: Infinity, activePets: Infinity, bookingsPerMonth: Infinity }
    };

    const features = planFeatures[tenant.plan] || planFeatures.FREE;

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ plan: tenant.plan, features, featureFlags: tenant.featureFlags })
    };
}

async function getOnboarding(event, tenantId) {
    const pool = getPool();

    // Check if tenant has completed onboarding steps
    const checks = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM "Owner" WHERE "tenantId" = $1`, [tenantId]),
        pool.query(`SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1`, [tenantId]),
        pool.query(`SELECT COUNT(*) FROM "Kennel" WHERE "tenantId" = $1`, [tenantId]),
        pool.query(`SELECT COUNT(*) FROM "Service" WHERE "tenantId" = $1`, [tenantId]),
        pool.query(`SELECT COUNT(*) FROM "Booking" WHERE "tenantId" = $1`, [tenantId])
    ]);

    const onboarding = {
        hasOwners: parseInt(checks[0].rows[0].count) > 0,
        hasPets: parseInt(checks[1].rows[0].count) > 0,
        hasKennels: parseInt(checks[2].rows[0].count) > 0,
        hasServices: parseInt(checks[3].rows[0].count) > 0,
        hasBookings: parseInt(checks[4].rows[0].count) > 0,
        completionPercentage: 0
    };

    const completed = Object.values(onboarding).filter(v => v === true).length;
    onboarding.completionPercentage = Math.round((completed / 5) * 100);

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(onboarding)
    };
}

async function updateOnboarding(event, tenantId) {
    const { dismissed } = JSON.parse(event.body);
    const pool = getPool();

    const { rows } = await pool.query(
        `UPDATE "Tenant" SET "settings" = jsonb_set(COALESCE("settings", '{}'::jsonb), '{onboardingDismissed}', $1::jsonb), "updatedAt" = NOW()
         WHERE "recordId" = $2
         RETURNING "recordId", "settings"`,
        [JSON.stringify(dismissed), tenantId]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function updateTheme(event, tenantId) {
    const theme = JSON.parse(event.body);
    const pool = getPool();

    const { rows } = await pool.query(
        `UPDATE "Tenant" SET "themeJson" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 RETURNING "recordId", "themeJson"`,
        [JSON.stringify(theme), tenantId]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function updateFeatureFlags(event, tenantId) {
    const featureFlags = JSON.parse(event.body);
    const pool = getPool();

    const { rows } = await pool.query(
        `UPDATE "Tenant" SET "featureFlags" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 RETURNING "recordId", "featureFlags"`,
        [JSON.stringify(featureFlags), tenantId]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

// ========================================
// ROLES HANDLERS
// ========================================

async function getRoles(event) {
    const roles = [
        { recordId: 'OWNER', name: 'Owner', permissions: ['*'] },
        { recordId: 'ADMIN', name: 'Admin', permissions: ['bookings:*', 'pets:*', 'owners:*'] },
        { recordId: 'STAFF', name: 'Staff', permissions: ['bookings:read', 'pets:read'] },
        { recordId: 'READONLY', name: 'Read Only', permissions: ['*:read'] }
    ];

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(roles) };
}

// ========================================
// ACCOUNT DEFAULTS HANDLERS
// ========================================

async function getAccountDefaults(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(`SELECT "settings" FROM "Tenant" WHERE "recordId" = $1`, [tenantId]);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]?.settings || {}) };
}

async function updateAccountDefaults(event, tenantId) {
    const pool = getPool();
    const settings = JSON.parse(event.body);
    await pool.query(`UPDATE "Tenant" SET "settings" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`, [JSON.stringify(settings), tenantId]);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(settings) };
}

// ========================================
// FACILITY HANDLERS
// ========================================

async function getFacilityOverview(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(
        `SELECT "type", COUNT(*) as count, SUM("capacity") as total_capacity
         FROM "Kennel" WHERE "tenantId" = $1 GROUP BY "type"`,
        [tenantId]
    );
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
}

// ========================================
// PACKAGES HANDLERS
// ========================================

async function getPackages(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM "Package" WHERE "tenantId" = $1 ORDER BY "name"`, [tenantId]);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
}

async function createPackage(event, tenantId) {
    const pool = getPool();
    const { name, description, creditCount, priceCents, validityDays } = JSON.parse(event.body);
    const { rows } = await pool.query(
        `INSERT INTO "Package" ("recordId", "tenantId", "name", "description", "creditCount", "priceCents", "validityDays", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [tenantId, name, description, creditCount || 10, priceCents || 0, validityDays || 365]
    );
    return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
}

// ========================================
// MEMBERSHIPS HANDLERS
// ========================================

async function getMemberships(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(
        `SELECT m.*, u."name", u."email" FROM "Membership" m LEFT JOIN "User" u ON m."userId" = u."recordId" WHERE m."tenantId" = $1`,
        [tenantId]
    );
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
}

async function updateMembership(event, tenantId) {
    const pool = getPool();
    const { role } = JSON.parse(event.body);
    const { rows } = await pool.query(
        `UPDATE "Membership" SET "role" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3 RETURNING *`,
        [role, event.pathParameters.membershipId, tenantId]
    );
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
}

async function deleteMembership(event, tenantId) {
    const pool = getPool();
    const { rowCount } = await pool.query(
        `DELETE FROM "Membership" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [event.pathParameters.membershipId, tenantId]
    );
    if (rowCount === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Membership not found' }) };
    }
    return { statusCode: 204, headers: HEADERS, body: '' };
}

// ========================================
// USER PERMISSIONS HANDLERS
// ========================================

async function getUserPermissions(event) {
    const permissions = {
        OWNER: ['*'],
        ADMIN: ['bookings:*', 'pets:*', 'owners:*', 'kennels:*', 'staff:*'],
        STAFF: ['bookings:read', 'bookings:update', 'pets:read', 'owners:read'],
        READONLY: ['*:read']
    };
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(permissions) };
}
