// Canonical Service:
// Domain: Config (Tenants / Facility / Services / Account Defaults / Roles)
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

const { getPool, getTenantIdFromEvent, getJWTValidator } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
};

// Enhanced authorization with fallback JWT validation
async function getUserInfoFromEvent(event) {
    // First, try to get claims from API Gateway JWT authorizer
    const claims = event?.requestContext?.authorizer?.jwt?.claims;

    if (claims) {
        console.log('[AUTH] Using API Gateway JWT claims');

        // Cognito tokens don't have tenantId - fetch from database
        let tenantId = claims['custom:tenantId'] || claims.tenantId;

        if (!tenantId && claims.sub) {
            console.log('[AUTH] Fetching tenantId from database for Cognito user:', claims.sub);
            const pool = getPool();

            try {
                // Query for user's tenant based on Cognito sub or email
                const result = await pool.query(
                    `SELECT m."tenantId"
                     FROM public."Membership" m
                     JOIN public."User" u ON m."userId" = u."recordId"
                     WHERE (u."cognitoSub" = $1 OR u."email" = $2)
                     AND m."deletedAt" IS NULL
                     ORDER BY m."updatedAt" DESC
                     LIMIT 1`,
                    [claims.sub, claims.email || claims['cognito:username']]
                );

                if (result.rows.length > 0) {
                    tenantId = result.rows[0].tenantId;
                    console.log('[AUTH] Found tenantId from database:', tenantId);
                } else {
                    console.error('[AUTH] No tenant found for user:', claims.sub);
                }
            } catch (error) {
                console.error('[AUTH] Error fetching tenantId from database:', error.message);
            }
        }

        return {
            sub: claims.sub,
            username: claims.username || claims['cognito:username'],
            email: claims.email,
            tenantId: tenantId,
            userId: claims.sub,
            role: claims['custom:role'] || 'USER'
        };
    }

    // Fallback: Manual JWT validation
    console.log('[AUTH] No API Gateway claims found, falling back to manual JWT validation');

    try {
        const authHeader = event?.headers?.Authorization || event?.headers?.authorization;

        if (!authHeader) {
            console.error('[AUTH] No Authorization header found');
            return null;
        }

        const jwtValidator = getJWTValidator();
        const userInfo = await jwtValidator.validateRequest(event);

        if (!userInfo) {
            console.error('[AUTH] JWT validation failed');
            return null;
        }

        console.log('[AUTH] Manual JWT validation successful');

        const tenantId = userInfo.tenantId || userInfo['custom:tenantId'] || await getTenantIdFromEvent(event);

        return {
            sub: userInfo.sub,
            username: userInfo.username || userInfo['cognito:username'],
            email: userInfo.email,
            tenantId: tenantId,
            userId: userInfo.sub,
            role: userInfo.role || userInfo['custom:role'] || 'USER'
        };
    } catch (error) {
        console.error('[AUTH] Manual JWT validation error:', error.message);
        return null;
    }
}

exports.handler = async (event) => {
    // Debug logging to see actual event structure
    console.log('[DEBUG] Full event:', JSON.stringify(event, null, 2));
    console.log('[DEBUG] requestContext:', JSON.stringify(event.requestContext, null, 2));
    console.log('[DEBUG] headers:', JSON.stringify(event.headers, null, 2));

    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const path = event.requestContext?.http?.path || event.path;

    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: HEADERS, body: '' };
    }

    // Extract user info from API Gateway authorizer with fallback to manual JWT validation
    const userInfo = await getUserInfoFromEvent(event);
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
            if (httpMethod === 'GET' && path === '/api/v1/packages') {
                return await getPackages(event, tenantId);
            }
            if (httpMethod === 'POST' && path === '/api/v1/packages') {
                return await createPackage(event, tenantId);
            }
            if (httpMethod === 'GET' && event.pathParameters?.packageId) {
                return await getPackageById(event, tenantId, event.pathParameters.packageId);
            }
            if (httpMethod === 'PUT' && event.pathParameters?.packageId) {
                return await updatePackage(event, tenantId, event.pathParameters.packageId);
            }
            if (httpMethod === 'DELETE' && event.pathParameters?.packageId) {
                return await deletePackage(event, tenantId, event.pathParameters.packageId);
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
               0 as "bookingCount"
        FROM "Service" s
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
    const { rows } = await pool.query(
        `SELECT * FROM "Package"
         WHERE "tenantId" = $1
         ORDER BY "displayOrder" ASC, "name" ASC`,
        [tenantId]
    );
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
}

async function getPackageById(event, tenantId, packageId) {
    const pool = getPool();

    const packageResult = await pool.query(
        `SELECT * FROM "Package" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [packageId, tenantId]
    );

    if (packageResult.rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Package not found' }) };
    }

    const servicesResult = await pool.query(
        `SELECT ps."recordId" as "packageServiceId", ps."quantity",
                s."recordId" as "serviceId", s."name", s."category",
                s."description", s."priceInCents", s."duration"
         FROM "PackageService" ps
         JOIN "Service" s ON ps."serviceId" = s."recordId"
         WHERE ps."packageId" = $1
         ORDER BY s."name" ASC`,
        [packageId]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ ...packageResult.rows[0], services: servicesResult.rows })
    };
}

async function createPackage(event, tenantId) {
    const pool = getPool();
    const body = JSON.parse(event.body || '{}');
    const { name, description, price, isActive = true, displayOrder = 0, services = [] } = body;

    if (!name) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Package name is required' }) };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const packageResult = await client.query(
            `INSERT INTO "Package" ("recordId", "tenantId", "name", "description", "price", "isActive", "displayOrder", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
            [tenantId, name, description || null, price || 0, isActive, displayOrder]
        );

        const newPackage = packageResult.rows[0];
        const includedServices = [];

        for (const service of services) {
            if (service.serviceId && service.quantity) {
                const serviceResult = await client.query(
                    `INSERT INTO "PackageService" ("recordId", "packageId", "serviceId", "quantity", "createdAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, NOW()) RETURNING *`,
                    [newPackage.recordId, service.serviceId, service.quantity]
                );
                includedServices.push(serviceResult.rows[0]);
            }
        }

        await client.query('COMMIT');
        return { statusCode: 201, headers: HEADERS, body: JSON.stringify({ ...newPackage, services: includedServices }) };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function updatePackage(event, tenantId, packageId) {
    const pool = getPool();
    const body = JSON.parse(event.body || '{}');
    const { name, description, price, isActive, displayOrder, services } = body;

    const existingPackage = await pool.query(
        `SELECT * FROM "Package" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [packageId, tenantId]
    );

    if (existingPackage.rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Package not found' }) };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE "Package" SET "name" = COALESCE($1, "name"), "description" = COALESCE($2, "description"),
                "price" = COALESCE($3, "price"), "isActive" = COALESCE($4, "isActive"),
                "displayOrder" = COALESCE($5, "displayOrder"), "updatedAt" = NOW()
             WHERE "recordId" = $6 AND "tenantId" = $7 RETURNING *`,
            [name, description, price, isActive, displayOrder, packageId, tenantId]
        );

        if (services && Array.isArray(services)) {
            await client.query(`DELETE FROM "PackageService" WHERE "packageId" = $1`, [packageId]);
            for (const service of services) {
                if (service.serviceId && service.quantity) {
                    await client.query(
                        `INSERT INTO "PackageService" ("recordId", "packageId", "serviceId", "quantity", "createdAt")
                         VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
                        [packageId, service.serviceId, service.quantity]
                    );
                }
            }
        }

        const servicesResult = await client.query(
            `SELECT ps."recordId" as "packageServiceId", ps."quantity", s."recordId" as "serviceId",
                    s."name", s."category", s."description", s."priceInCents", s."duration"
             FROM "PackageService" ps JOIN "Service" s ON ps."serviceId" = s."recordId"
             WHERE ps."packageId" = $1 ORDER BY s."name" ASC`,
            [packageId]
        );

        await client.query('COMMIT');
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ...updateResult.rows[0], services: servicesResult.rows }) };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function deletePackage(event, tenantId, packageId) {
    const pool = getPool();
    const result = await pool.query(
        `UPDATE "Package" SET "isActive" = false, "updatedAt" = NOW()
         WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING *`,
        [packageId, tenantId]
    );

    if (result.rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Package not found' }) };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ message: 'Package deleted successfully', package: result.rows[0] }) };
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
