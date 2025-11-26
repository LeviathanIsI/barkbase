// Canonical Service:
// Domain: Config (Tenants / Facility / Services / Account Defaults / Roles / Associations)
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

const { getPool, getTenantIdFromEvent, getJWTValidator } = require('/opt/nodejs');
const {
    getSecureHeaders,
    errorResponse,
    successResponse,
} = require('/opt/nodejs/security-utils');

const ok = (event, statusCode, data = '', additionalHeaders = {}) => {
    if (statusCode === 204) {
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode,
            headers: {
                ...getSecureHeaders(origin, stage),
                ...additionalHeaders,
            },
            body: '',
        };
    }
    return successResponse(statusCode, data, event, additionalHeaders);
};

const fail = (event, statusCode, errorCodeOrBody, message, additionalHeaders = {}) => {
    if (typeof errorCodeOrBody === 'object' && errorCodeOrBody !== null) {
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode,
            headers: {
                ...getSecureHeaders(origin, stage),
                ...additionalHeaders,
            },
            body: JSON.stringify(errorCodeOrBody),
        };
    }
    const response = errorResponse(statusCode, errorCodeOrBody, message, event);
    return {
        ...response,
        headers: {
            ...response.headers,
            ...additionalHeaders,
        },
    };
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
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode: 200,
            headers: getSecureHeaders(origin, stage),
            body: JSON.stringify({}),
        };
    }

    // Extract user info from API Gateway authorizer with fallback to manual JWT validation
    const userInfo = await getUserInfoFromEvent(event);
    if (!userInfo) {
        return fail(event, 401, { message: 'Unauthorized' });
    }

    // Get tenant ID from JWT claims or database
    const tenantId = userInfo.tenantId || await getTenantIdFromEvent(event);
    if (!tenantId) {
        return fail(event, 401, { message: 'Missing tenant context' });
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

        // ========== ASSOCIATIONS ROUTES ==========
        if (path.startsWith('/api/v1/associations')) {
            const associationId = event.pathParameters?.associationId || event.pathParameters?.id;
            
            // POST /api/v1/associations/seed - Seed system associations (dev only)
            if (httpMethod === 'POST' && path.includes('/seed')) {
                return await seedSystemAssociations(event, tenantId, userInfo);
            }
            
            // GET /api/v1/associations - List all associations
            if (httpMethod === 'GET' && !associationId) {
                return await listAssociations(event, tenantId);
            }
            
            // GET /api/v1/associations/{id} - Get single association
            if (httpMethod === 'GET' && associationId) {
                return await getAssociationById(event, tenantId, associationId);
            }
            
            // POST /api/v1/associations - Create association
            if (httpMethod === 'POST' && !associationId) {
                return await createAssociation(event, tenantId, userInfo);
            }
            
            // PUT /api/v1/associations/{id} - Update association
            if (httpMethod === 'PUT' && associationId) {
                return await updateAssociation(event, tenantId, associationId, userInfo);
            }
            
            // DELETE /api/v1/associations/{id} - Archive/delete association
            if (httpMethod === 'DELETE' && associationId) {
                return await deleteAssociation(event, tenantId, associationId, userInfo);
            }
        }

        return fail(event, 404, { message: 'Not Found' });

    } catch (error) {
        console.error('Config service error:', error);
        return fail(event, 500, { message: 'Internal Server Error', error: error.message });
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

    return ok(event, 200, services);
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
        return fail(event, 400, { message: 'Name, category, and priceInCents are required' });
    }

    // Validate role - only OWNER or ADMIN can create services
    if (!['OWNER', 'ADMIN'].includes(userInfo.role)) {
        return fail(event, 403, { message: 'Insufficient permissions' });
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

    return ok(event, 201, service);
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
        return fail(event, 404, { message: 'Service not found' });
    }

    const service = result.rows[0];
    service.price = service.priceInCents / 100;
    service.bookingCount = parseInt(service.bookingCount);
    service.totalRevenue = (service.totalRevenueCents || 0) / 100;

    return ok(event, 200, service);
}

async function updateService(event, tenantId, userInfo) {
    const pool = getPool();
    const { id } = event.pathParameters;
    const updates = JSON.parse(event.body || '{}');

    // Validate role - only OWNER or ADMIN can update services
    if (!['OWNER', 'ADMIN'].includes(userInfo.role)) {
        return fail(event, 403, { message: 'Insufficient permissions' });
    }

    // Check if service exists
    const checkResult = await pool.query(
        'SELECT "recordId" FROM "Service" WHERE "recordId" = $1 AND "tenantId" = $2',
        [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
        return fail(event, 404, { message: 'Service not found' });
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
        return fail(event, 400, { message: 'No valid fields to update' });
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

    return ok(event, 200, service);
}

async function deleteService(event, tenantId, userInfo) {
    const pool = getPool();
    const { id } = event.pathParameters;

    // Validate role - only OWNER can delete services
    if (userInfo.role !== 'OWNER') {
        return fail(event, 403, { message: 'Only owners can delete services' });
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

        return ok(event, 200, {
                message: 'Service deactivated (has existing bookings)'
            });
    }

    // Hard delete if no bookings
    const result = await pool.query(
        'DELETE FROM "Service" WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING "recordId"',
        [id, tenantId]
    );

    if (result.rows.length === 0) {
        return fail(event, 404, { message: 'Service not found' });
    }

    return ok(event, 200, { message: 'Service deleted successfully' });
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
            return fail(event, 404, { message: 'Tenant not found' });
        }

        const tenant = result.rows[0];

        return ok(event, 200, tenant);
    } catch (error) {
        console.error('getTenantBySlug error:', error);
        return fail(event, 500, { message: error.message, stack: error.stack });
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
        return fail(event, 404, { message: 'Tenant not found' });
    }

    return ok(event, 200, rows[0]);
}

async function getTenantPlan(event, tenantId) {
    const pool = getPool();

    const { rows } = await pool.query(
        `SELECT "plan", "featureFlags" FROM "Tenant" WHERE "recordId" = $1`,
        [tenantId]
    );

    if (rows.length === 0) {
        return fail(event, 404, { message: 'Tenant not found' });
    }

    const tenant = rows[0];

    // Define plan features (matching your backend features.js)
    const planFeatures = {
        FREE: { seats: 1, locations: 1, activePets: 10, bookingsPerMonth: 150 },
        PRO: { seats: 5, locations: 3, activePets: Infinity, bookingsPerMonth: 2500, advancedReports: true },
        ENTERPRISE: { seats: Infinity, locations: Infinity, activePets: Infinity, bookingsPerMonth: Infinity }
    };

    const features = planFeatures[tenant.plan] || planFeatures.FREE;

    return ok(event, 200, { plan: tenant.plan, features, featureFlags: tenant.featureFlags });
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

    return ok(event, 200, onboarding);
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

    return ok(event, 200, rows[0]);
}

async function updateTheme(event, tenantId) {
    const theme = JSON.parse(event.body);
    const pool = getPool();

    const { rows } = await pool.query(
        `UPDATE "Tenant" SET "themeJson" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 RETURNING "recordId", "themeJson"`,
        [JSON.stringify(theme), tenantId]
    );

    return ok(event, 200, rows[0]);
}

async function updateFeatureFlags(event, tenantId) {
    const featureFlags = JSON.parse(event.body);
    const pool = getPool();

    const { rows } = await pool.query(
        `UPDATE "Tenant" SET "featureFlags" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 RETURNING "recordId", "featureFlags"`,
        [JSON.stringify(featureFlags), tenantId]
    );

    return ok(event, 200, rows[0]);
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

    return ok(event, 200, roles);
}

// ========================================
// ACCOUNT DEFAULTS HANDLERS
// ========================================

async function getAccountDefaults(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(`SELECT "settings" FROM "Tenant" WHERE "recordId" = $1`, [tenantId]);
    return ok(event, 200, rows[0]?.settings || {});
}

async function updateAccountDefaults(event, tenantId) {
    const pool = getPool();
    const settings = JSON.parse(event.body);
    await pool.query(`UPDATE "Tenant" SET "settings" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`, [JSON.stringify(settings), tenantId]);
    return ok(event, 200, settings);
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
    return ok(event, 200, rows);
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
    return ok(event, 200, rows);
}

async function getPackageById(event, tenantId, packageId) {
    const pool = getPool();

    const packageResult = await pool.query(
        `SELECT * FROM "Package" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [packageId, tenantId]
    );

    if (packageResult.rows.length === 0) {
        return fail(event, 404, { message: 'Package not found' });
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

    return ok(event, 200, { ...packageResult.rows[0], services: servicesResult.rows });
}

async function createPackage(event, tenantId) {
    const pool = getPool();
    const body = JSON.parse(event.body || '{}');
    const { name, description, price, isActive = true, displayOrder = 0, services = [] } = body;

    if (!name) {
        return fail(event, 400, { message: 'Package name is required' });
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
        return ok(event, 201, { ...newPackage, services: includedServices });
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
        return fail(event, 404, { message: 'Package not found' });
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
        return ok(event, 200, { ...updateResult.rows[0], services: servicesResult.rows });
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
        return fail(event, 404, { message: 'Package not found' });
    }

    return ok(event, 200, { message: 'Package deleted successfully', package: result.rows[0] });
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
    return ok(event, 200, rows);
}

async function updateMembership(event, tenantId) {
    const pool = getPool();
    const { role } = JSON.parse(event.body);
    const { rows } = await pool.query(
        `UPDATE "Membership" SET "role" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3 RETURNING *`,
        [role, event.pathParameters.membershipId, tenantId]
    );
    return ok(event, 200, rows[0]);
}

async function deleteMembership(event, tenantId) {
    const pool = getPool();
    const { rowCount } = await pool.query(
        `DELETE FROM "Membership" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [event.pathParameters.membershipId, tenantId]
    );
    if (rowCount === 0) {
        return fail(event, 404, { message: 'Membership not found' });
    }
    return ok(event, 204);
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
    return ok(event, 200, permissions);
}

// ========================================
// ASSOCIATIONS HANDLERS
// ========================================

/**
 * List all association labels for a tenant
 * GET /api/v1/associations?includeArchived=false&fromObjectType=pet&toObjectType=owner
 */
async function listAssociations(event, tenantId) {
    const pool = getPool();
    const { includeArchived, fromObjectType, toObjectType } = event.queryStringParameters || {};

    let query = `
        SELECT 
            al.*,
            COALESCE(
                (SELECT COUNT(*) FROM "AssociationInstance" ai 
                 WHERE ai."associationLabelId" = al."recordId"),
                0
            )::int AS "usageCount"
        FROM "AssociationLabel" al
        WHERE al."tenantId" = $1
    `;
    const params = [tenantId];
    let paramCount = 2;

    // Filter by archived status
    if (includeArchived !== 'true') {
        query += ` AND al."archived" = false`;
    }

    // Filter by fromObjectType
    if (fromObjectType) {
        query += ` AND al."fromObjectType" = $${paramCount}`;
        params.push(fromObjectType);
        paramCount++;
    }

    // Filter by toObjectType
    if (toObjectType) {
        query += ` AND al."toObjectType" = $${paramCount}`;
        params.push(toObjectType);
        paramCount++;
    }

    query += ` ORDER BY al."fromObjectType", al."toObjectType", al."label"`;

    try {
        const { rows } = await pool.query(query, params);
        return ok(event, 200, rows);
    } catch (error) {
        // Table might not exist yet - return empty array
        if (error.code === '42P01') {
            console.log('[ASSOCIATIONS] Table does not exist yet, returning empty array');
            return ok(event, 200, []);
        }
        throw error;
    }
}

/**
 * Get a single association label by ID
 * GET /api/v1/associations/{id}
 */
async function getAssociationById(event, tenantId, associationId) {
    const pool = getPool();

    try {
        const { rows } = await pool.query(
            `SELECT 
                al.*,
                COALESCE(
                    (SELECT COUNT(*) FROM "AssociationInstance" ai 
                     WHERE ai."associationLabelId" = al."recordId"),
                    0
                )::int AS "usageCount"
             FROM "AssociationLabel" al
             WHERE al."recordId" = $1 AND al."tenantId" = $2`,
            [associationId, tenantId]
        );

        if (rows.length === 0) {
            return fail(event, 404, { message: 'Association not found' });
        }

        return ok(event, 200, rows[0]);
    } catch (error) {
        if (error.code === '42P01') {
            return fail(event, 404, { message: 'Association not found' });
        }
        throw error;
    }
}

/**
 * Create a new association label
 * POST /api/v1/associations
 * Body: { label, reverseLabel, isPaired, fromObjectType, toObjectType, limitType }
 */
async function createAssociation(event, tenantId, userInfo) {
    const pool = getPool();
    const body = JSON.parse(event.body || '{}');
    const {
        label,
        reverseLabel,
        isPaired = false,
        fromObjectType,
        toObjectType,
        limitType = 'MANY_TO_MANY'
    } = body;

    // Validation
    if (!label || !label.trim()) {
        return fail(event, 400, { message: 'Label is required' });
    }
    if (!fromObjectType || !toObjectType) {
        return fail(event, 400, { message: 'fromObjectType and toObjectType are required' });
    }
    if (isPaired && (!reverseLabel || !reverseLabel.trim())) {
        return fail(event, 400, { message: 'reverseLabel is required for paired associations' });
    }

    const validObjectTypes = ['pet', 'owner', 'booking', 'invoice', 'payment', 'ticket', 'service', 'package', 'kennel'];
    if (!validObjectTypes.includes(fromObjectType) || !validObjectTypes.includes(toObjectType)) {
        return fail(event, 400, { message: 'Invalid object type' });
    }

    const validLimitTypes = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY'];
    if (!validLimitTypes.includes(limitType)) {
        return fail(event, 400, { message: 'Invalid limitType. Must be ONE_TO_ONE, ONE_TO_MANY, or MANY_TO_MANY' });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO "AssociationLabel" (
                "recordId", "tenantId", "label", "reverseLabel", "isPaired",
                "fromObjectType", "toObjectType", "limitType", "isSystemDefined", "archived"
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, false, false
            ) RETURNING *`,
            [tenantId, label.trim(), isPaired ? reverseLabel?.trim() : null, isPaired, fromObjectType, toObjectType, limitType]
        );

        const association = rows[0];
        association.usageCount = 0;

        return ok(event, 201, association);
    } catch (error) {
        console.error('[ASSOCIATIONS] Create error:', error);
        return fail(event, 500, { message: 'Failed to create association', error: error.message });
    }
}

/**
 * Update an association label
 * PUT /api/v1/associations/{id}
 * Body: { label, reverseLabel, isPaired, limitType }
 */
async function updateAssociation(event, tenantId, associationId, userInfo) {
    const pool = getPool();
    const body = JSON.parse(event.body || '{}');
    const { label, reverseLabel, isPaired, limitType } = body;

    // Check if association exists and belongs to tenant
    const existingResult = await pool.query(
        `SELECT * FROM "AssociationLabel" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [associationId, tenantId]
    );

    if (existingResult.rows.length === 0) {
        return fail(event, 404, { message: 'Association not found' });
    }

    const existing = existingResult.rows[0];

    // System associations can only have label and limitType updated
    if (existing.isSystemDefined) {
        const allowedUpdates = ['label', 'reverseLabel', 'limitType'];
        const providedKeys = Object.keys(body);
        const invalidKeys = providedKeys.filter(k => !allowedUpdates.includes(k) && body[k] !== undefined);
        if (invalidKeys.length > 0) {
            return fail(event, 400, { 
                message: 'System associations can only have label, reverseLabel, and limitType updated' 
            });
        }
    }

    // Build update query
    const updates = [];
    const values = [associationId, tenantId];
    let paramCount = 3;

    if (label !== undefined) {
        updates.push(`"label" = $${paramCount}`);
        values.push(label.trim());
        paramCount++;
    }

    if (reverseLabel !== undefined) {
        updates.push(`"reverseLabel" = $${paramCount}`);
        values.push(reverseLabel?.trim() || null);
        paramCount++;
    }

    if (isPaired !== undefined) {
        updates.push(`"isPaired" = $${paramCount}`);
        values.push(isPaired);
        paramCount++;
    }

    if (limitType !== undefined) {
        const validLimitTypes = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY'];
        if (!validLimitTypes.includes(limitType)) {
            return fail(event, 400, { message: 'Invalid limitType' });
        }
        updates.push(`"limitType" = $${paramCount}`);
        values.push(limitType);
        paramCount++;
    }

    if (updates.length === 0) {
        return fail(event, 400, { message: 'No valid fields to update' });
    }

    updates.push(`"updatedAt" = NOW()`);

    const { rows } = await pool.query(
        `UPDATE "AssociationLabel" 
         SET ${updates.join(', ')}
         WHERE "recordId" = $1 AND "tenantId" = $2
         RETURNING *`,
        values
    );

    const association = rows[0];
    
    // Get usage count
    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM "AssociationInstance" WHERE "associationLabelId" = $1`,
        [associationId]
    );
    association.usageCount = countResult.rows[0]?.count || 0;

    return ok(event, 200, association);
}

/**
 * Delete (archive) an association label
 * DELETE /api/v1/associations/{id}
 */
async function deleteAssociation(event, tenantId, associationId, userInfo) {
    const pool = getPool();

    // Check if association exists
    const existingResult = await pool.query(
        `SELECT * FROM "AssociationLabel" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [associationId, tenantId]
    );

    if (existingResult.rows.length === 0) {
        return fail(event, 404, { message: 'Association not found' });
    }

    const existing = existingResult.rows[0];

    // System associations cannot be deleted
    if (existing.isSystemDefined) {
        return fail(event, 400, { message: 'System associations cannot be deleted' });
    }

    // Check if association has any instances
    const instanceCount = await pool.query(
        `SELECT COUNT(*) FROM "AssociationInstance" WHERE "associationLabelId" = $1`,
        [associationId]
    );

    if (parseInt(instanceCount.rows[0].count) > 0) {
        // Soft delete - archive it
        await pool.query(
            `UPDATE "AssociationLabel" SET "archived" = true, "updatedAt" = NOW() 
             WHERE "recordId" = $1 AND "tenantId" = $2`,
            [associationId, tenantId]
        );
        return ok(event, 200, { message: 'Association archived (has existing instances)' });
    }

    // Hard delete if no instances
    await pool.query(
        `DELETE FROM "AssociationLabel" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [associationId, tenantId]
    );

    return ok(event, 200, { message: 'Association deleted successfully' });
}

/**
 * Seed system-defined association labels for a tenant
 * POST /api/v1/associations/seed
 */
async function seedSystemAssociations(event, tenantId, userInfo) {
    const pool = getPool();

    // System associations that every tenant should have
    const systemAssociations = [
        { label: 'Owner', reverseLabel: 'Pet', isPaired: true, fromObjectType: 'pet', toObjectType: 'owner', limitType: 'MANY_TO_MANY' },
        { label: 'Guest', reverseLabel: 'Booking', isPaired: true, fromObjectType: 'booking', toObjectType: 'pet', limitType: 'ONE_TO_MANY' },
        { label: 'Customer', reverseLabel: 'Booking', isPaired: true, fromObjectType: 'booking', toObjectType: 'owner', limitType: 'ONE_TO_MANY' },
        { label: 'Invoice', reverseLabel: 'Booking', isPaired: true, fromObjectType: 'booking', toObjectType: 'invoice', limitType: 'ONE_TO_ONE' },
        { label: 'Payment', reverseLabel: 'Invoice', isPaired: true, fromObjectType: 'invoice', toObjectType: 'payment', limitType: 'ONE_TO_MANY' },
        { label: 'Emergency Contact', reverseLabel: null, isPaired: false, fromObjectType: 'owner', toObjectType: 'owner', limitType: 'MANY_TO_MANY' },
        { label: 'Family Member', reverseLabel: null, isPaired: false, fromObjectType: 'owner', toObjectType: 'owner', limitType: 'MANY_TO_MANY' },
        { label: 'Authorized Pickup', reverseLabel: null, isPaired: false, fromObjectType: 'owner', toObjectType: 'owner', limitType: 'MANY_TO_MANY' },
    ];

    const created = [];
    const skipped = [];

    for (const assoc of systemAssociations) {
        // Check if this system association already exists
        const existing = await pool.query(
            `SELECT "recordId" FROM "AssociationLabel" 
             WHERE "tenantId" = $1 
               AND "fromObjectType" = $2 
               AND "toObjectType" = $3 
               AND "label" = $4
               AND "isSystemDefined" = true`,
            [tenantId, assoc.fromObjectType, assoc.toObjectType, assoc.label]
        );

        if (existing.rows.length > 0) {
            skipped.push(assoc.label);
            continue;
        }

        // Create the system association
        const result = await pool.query(
            `INSERT INTO "AssociationLabel" (
                "recordId", "tenantId", "label", "reverseLabel", "isPaired",
                "fromObjectType", "toObjectType", "limitType", "isSystemDefined", "archived"
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, false
            ) RETURNING "label"`,
            [tenantId, assoc.label, assoc.reverseLabel, assoc.isPaired, assoc.fromObjectType, assoc.toObjectType, assoc.limitType]
        );

        created.push(result.rows[0].label);
    }

    return ok(event, 200, {
        message: 'System associations seeded',
        created,
        skipped
    });
}
