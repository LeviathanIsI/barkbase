const { Router } = require('express');
const { getPool } = require('../../lib/db');
const { ok: sendOk, fail: sendFail } = require('../../lib/utils/responses');

const router = Router();

const ok = (event, statusCode, data = '', additionalHeaders = {}) => {
  const payload = statusCode === 204 ? null : data === '' ? {} : data;
  return sendOk(event.__res, payload, statusCode, additionalHeaders);
};

const fail = (event, statusCode, errorCodeOrBody, message, additionalHeaders = {}) => {
  if (additionalHeaders && Object.keys(additionalHeaders).length > 0) {
    event.__res.set(additionalHeaders);
  }
  const payload = typeof errorCodeOrBody === 'object' && errorCodeOrBody !== null
    ? errorCodeOrBody
    : { error: errorCodeOrBody, message };
  return sendFail(event.__res, statusCode, payload);
};

const buildEvent = (req, res) => ({
  path: (req.baseUrl || '') + req.path,
  httpMethod: req.method,
  headers: req.headers,
  queryStringParameters: Object.keys(req.query || {}).length ? req.query : undefined,
  pathParameters: req.params || {},
  body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined,
  __res: res,
});

const routeHandler = (handler, { includeUser = false } = {}) => async (req, res) => {
  const event = buildEvent(req, res);
  try {
    const args = [event, req.tenantId];
    if (includeUser) {
      args.push(req.user);
    }
    await handler(...args);
  } catch (error) {
    console.error('[config] route error:', error);
    sendFail(res, 500, { message: 'Internal Server Error' });
  }
};

router.get('/services', routeHandler(listServices));
router.post('/services', routeHandler(createService, { includeUser: true }));
router.get('/services/:id', routeHandler(getServiceById));
router.put('/services/:id', routeHandler(updateService, { includeUser: true }));
router.delete('/services/:id', routeHandler(deleteService, { includeUser: true }));

router.get('/tenants', async (req, res) => {
  const event = buildEvent(req, res);
  const slug = req.query?.slug;
  if (!slug) {
    return sendFail(res, 400, { message: 'slug query parameter required' });
  }
  try {
    await getTenantBySlug(event, slug);
  } catch (error) {
    console.error('[config] tenants slug route error:', error);
    sendFail(res, 500, { message: 'Internal Server Error' });
  }
});
router.get('/tenants/current', routeHandler(getCurrentTenant));
router.get('/tenants/current/plan', routeHandler(getTenantPlan));
router.get('/tenants/current/onboarding', routeHandler(getOnboarding));
router.patch('/tenants/current/onboarding', routeHandler(updateOnboarding));
router.put('/tenants/theme', routeHandler(updateTheme));
router.put('/tenants/current/theme', routeHandler(updateTheme));
router.put('/tenants/features', routeHandler(updateFeatureFlags));

router.get('/roles', routeHandler(getRoles));

router.get('/account-defaults', routeHandler(getAccountDefaults));
router.put('/account-defaults', routeHandler(updateAccountDefaults));

router.get('/facility', routeHandler(getFacilityOverview));

router.get('/packages', routeHandler(getPackages));
router.post('/packages', routeHandler(createPackage));
router.get('/packages/:packageId', routeHandler(getPackageById));
router.put('/packages/:packageId', routeHandler(updatePackage));
router.delete('/packages/:packageId', routeHandler(deletePackage));

router.get('/memberships', routeHandler(getMemberships));
router.put('/memberships/:membershipId', routeHandler(updateMembership));
router.delete('/memberships/:membershipId', routeHandler(deleteMembership));

router.get('/user-permissions', routeHandler(getUserPermissions));

// ========================================
// IMPORT-EXPORT HANDLERS
// ========================================

router.get('/import-export/jobs', routeHandler(getImportExportJobs));
router.post('/import-export/export', routeHandler(handleExport, { includeUser: true }));
router.post('/import-export/import', routeHandler(handleImport, { includeUser: true }));

module.exports = router;

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

async function getPackageById(event, tenantId) {
    const pool = getPool();
    const { packageId } = event.pathParameters;

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

async function updatePackage(event, tenantId) {
    const pool = getPool();
    const { packageId } = event.pathParameters;
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

async function deletePackage(event, tenantId) {
    const pool = getPool();
    const { packageId } = event.pathParameters;
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
// IMPORT-EXPORT HANDLERS
// ========================================

async function getImportExportJobs(event, tenantId) {
    const pool = getPool();
    try {
        const tableCheck = await pool.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ImportExportJob') as exists`
        );

        if (!tableCheck.rows[0]?.exists) {
            return ok(event, 200, { jobs: [] });
        }

        const result = await pool.query(
            `SELECT id, type, status, scope, format, filename, record_count as "recordCount",
                    error_message as "errorMessage", created_at as "createdAt", completed_at as "completedAt"
             FROM "ImportExportJob"
             WHERE tenant_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [tenantId]
        );
        return ok(event, 200, { jobs: result.rows });
    } catch (error) {
        console.error('[import-export] getJobs error:', error);
        return fail(event, 500, { message: error.message });
    }
}

async function handleExport(event, tenantId, user) {
    // For now, just return a stub - full export logic can be added later
    return fail(event, 501, { message: 'Export not implemented in local backend. Use production API.' });
}

async function handleImport(event, tenantId, user) {
    const pool = getPool();

    let body;
    try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
        return fail(event, 400, { message: 'Invalid request body' });
    }

    console.log('[import] Received payload:', JSON.stringify({
        entityTypes: body.entityTypes,
        dataLength: body.data?.length,
        mappings: body.mappings,
        sampleData: body.data?.slice(0, 2)
    }));

    const {
        entityTypes = [],
        data = [],
        mappings = {},
        importModes = {},
        options = {},
        filename = 'import',
    } = body;

    if (!data || data.length === 0) {
        return fail(event, 400, { message: 'No data provided for import' });
    }

    if (!entityTypes || entityTypes.length === 0) {
        return fail(event, 400, { message: 'No entity types specified' });
    }

    let recordCount = 0;
    const errors = [];

    try {
        for (const entityType of entityTypes) {
            const mode = importModes[entityType] || 'create_update';

            switch (entityType) {
                case 'owners': {
                    const result = await importOwners(pool, tenantId, data, mode);
                    recordCount += result.count;
                    errors.push(...result.errors);
                    break;
                }
                case 'pets': {
                    const result = await importPets(pool, tenantId, data, mode);
                    recordCount += result.count;
                    errors.push(...result.errors);
                    break;
                }
                default:
                    errors.push(`Import for ${entityType} not yet implemented`);
            }
        }

        return ok(event, 200, {
            success: errors.length === 0,
            recordCount,
            errors: errors.length > 0 ? errors : undefined,
            message: errors.length > 0
                ? `Import completed with ${errors.length} error(s). ${recordCount} record(s) imported.`
                : `Successfully imported ${recordCount} record(s)`,
        });
    } catch (error) {
        console.error('[import] Import failed:', error.message, error.stack);
        return fail(event, 500, {
            message: 'Import failed: ' + error.message,
            debugStack: error.stack
        });
    }
}

async function importOwners(pool, tenantId, owners, mode) {
    const errors = [];
    let count = 0;

    for (const owner of owners) {
        try {
            if (!owner.email) {
                errors.push(`Owner skipped: missing required field 'email'`);
                continue;
            }

            // Check if owner exists by email
            const existing = await pool.query(
                `SELECT "recordId" FROM "Owner" WHERE "tenantId" = $1 AND "email" = $2`,
                [tenantId, owner.email]
            );

            if (existing.rows.length > 0) {
                if (mode === 'create_only') continue;

                // Update existing - use correct column names for local DB
                await pool.query(
                    `UPDATE "Owner" SET
                        "firstName" = COALESCE($3, "firstName"),
                        "lastName" = COALESCE($4, "lastName"),
                        "phone" = COALESCE($5, "phone"),
                        "addressStreet" = COALESCE($6, "addressStreet"),
                        "addressCity" = COALESCE($7, "addressCity"),
                        "addressState" = COALESCE($8, "addressState"),
                        "addressZip" = COALESCE($9, "addressZip"),
                        "updatedAt" = NOW()
                    WHERE "recordId" = $1 AND "tenantId" = $2`,
                    [
                        existing.rows[0].recordId,
                        tenantId,
                        owner.first_name || null,
                        owner.last_name || null,
                        owner.phone || null,
                        owner.address_street || null,
                        owner.address_city || null,
                        owner.address_state || null,
                        owner.address_zip || null
                    ]
                );
                count++;
            } else {
                if (mode === 'update_only') continue;

                // Insert new
                await pool.query(
                    `INSERT INTO "Owner" ("tenantId", "firstName", "lastName", "email", "phone",
                                          "addressStreet", "addressCity", "addressState", "addressZip", "isActive")
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
                    [
                        tenantId,
                        owner.first_name || null,
                        owner.last_name || null,
                        owner.email,
                        owner.phone || null,
                        owner.address_street || null,
                        owner.address_city || null,
                        owner.address_state || null,
                        owner.address_zip || null
                    ]
                );
                count++;
            }
        } catch (e) {
            console.error('[import] Owner error:', e.message, 'Data:', JSON.stringify(owner));
            errors.push(`Owner "${owner.email || 'unknown'}": ${e.message}`);
        }
    }

    return { count, errors };
}

async function importPets(pool, tenantId, pets, mode) {
    const errors = [];
    let count = 0;

    // First resolve owner emails to IDs
    const ownerEmails = [...new Set(pets.filter(p => p.owner_email).map(p => p.owner_email))];
    const emailToId = {};

    if (ownerEmails.length > 0) {
        const placeholders = ownerEmails.map((_, i) => `$${i + 2}`).join(', ');
        const result = await pool.query(
            `SELECT "recordId", "email" FROM "Owner" WHERE "tenantId" = $1 AND "email" IN (${placeholders})`,
            [tenantId, ...ownerEmails]
        );
        result.rows.forEach(row => {
            emailToId[row.email.toLowerCase()] = row.recordId;
        });
    }

    for (const pet of pets) {
        try {
            if (!pet.name) {
                errors.push(`Pet skipped: missing required field 'name'`);
                continue;
            }

            const ownerId = pet.owner_id || (pet.owner_email ? emailToId[pet.owner_email.toLowerCase()] : null);

            if (!ownerId) {
                errors.push(`Pet "${pet.name}" skipped: could not resolve owner`);
                continue;
            }

            // Check if pet exists
            const existing = await pool.query(
                `SELECT "recordId" FROM "Pet" WHERE "tenantId" = $1 AND "name" = $2 AND "ownerId" = $3`,
                [tenantId, pet.name, ownerId]
            );

            if (existing.rows.length > 0) {
                if (mode === 'create_only') continue;

                await pool.query(
                    `UPDATE "Pet" SET
                        "species" = COALESCE($3, "species"),
                        "breed" = COALESCE($4, "breed"),
                        "weight" = COALESCE($5, "weight"),
                        "dateOfBirth" = COALESCE($6, "dateOfBirth"),
                        "gender" = COALESCE($7, "gender"),
                        "color" = COALESCE($8, "color"),
                        "updatedAt" = NOW()
                    WHERE "recordId" = $1 AND "tenantId" = $2`,
                    [
                        existing.rows[0].recordId,
                        tenantId,
                        pet.species || null,
                        pet.breed || null,
                        pet.weight || null,
                        pet.date_of_birth || null,
                        pet.gender || null,
                        pet.color || null
                    ]
                );
                count++;
            } else {
                if (mode === 'update_only') continue;

                await pool.query(
                    `INSERT INTO "Pet" ("tenantId", "ownerId", "name", "species", "breed", "weight",
                                        "dateOfBirth", "gender", "color", "isActive")
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
                    [
                        tenantId,
                        ownerId,
                        pet.name,
                        pet.species || null,
                        pet.breed || null,
                        pet.weight || null,
                        pet.date_of_birth || null,
                        pet.gender || null,
                        pet.color || null
                    ]
                );
                count++;
            }
        } catch (e) {
            console.error('[import] Pet error:', e.message, 'Data:', JSON.stringify(pet));
            errors.push(`Pet "${pet.name || 'unknown'}": ${e.message}`);
        }
    }

    return { count, errors };
}
