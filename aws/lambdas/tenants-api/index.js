// TODO (Decommission Phase):
// This Lambda is legacy. Its functionality has been superseded by config-service (tenants/account defaults/services).
// Do NOT add new endpoints or business logic here.
// This Lambda will be retired in a future decommission phase once all callers are migrated.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,PATCH'
};

exports.handler = async (event) => {
    
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = await getTenantIdFromEvent(event);
    const slug = event.queryStringParameters?.slug;


    try {
        // Public endpoint - get tenant by slug (no auth required)
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

        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Tenants error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

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

