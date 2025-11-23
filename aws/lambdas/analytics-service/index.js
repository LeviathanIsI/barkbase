// Canonical Service:
// Domain: Analytics (Dashboard / Reports / Schedule)
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

const { getPool, getTenantIdFromEvent, getJWTValidator } = require('/opt/nodejs');
const {
    getSecureHeaders,
    errorResponse,
    successResponse,
} = require('../shared/security-utils');

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
        // Get Authorization header
        const authHeader = event?.headers?.Authorization || event?.headers?.authorization;

        if (!authHeader) {
            console.error('[AUTH] No Authorization header found');
            return null;
        }

        // Initialize JWT validator and validate token
        const jwtValidator = getJWTValidator();
        const userInfo = await jwtValidator.validateRequest(event);

        if (!userInfo) {
            console.error('[AUTH] JWT validation failed');
            return null;
        }

        console.log('[AUTH] Manual JWT validation successful');

        // Get tenant ID from the validated token or database
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

    // Handle CORS preflight
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
        // ============================================
        // DASHBOARD ROUTES (from dashboard-api)
        // ============================================
        if (httpMethod === 'GET' && path === '/api/v1/dashboard/stats') {
            return await getDashboardStats(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/dashboard/today-pets') {
            return await getTodaysPets(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/dashboard/arrivals') {
            return await getUpcomingArrivals(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/dashboard/departures') {
            return await getUpcomingDepartures(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/dashboard/occupancy') {
            return await getOccupancy(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/dashboard/revenue') {
            return await getRevenueMetrics(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/dashboard/activity') {
            return await getActivityFeed(event, tenantId);
        }

        // ============================================
        // REPORTS ROUTES (from reports-api)
        // ============================================
        if (httpMethod === 'GET' && path === '/api/v1/reports/dashboard') {
            return await getDashboardMetrics(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/reports/revenue') {
            return await getRevenueReport(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/reports/occupancy') {
            return await getOccupancyReport(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/reports/arrivals') {
            return await getReportArrivals(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/reports/departures') {
            return await getReportDepartures(event, tenantId);
        }

        // ============================================
        // SCHEDULE ROUTES (from schedule-api)
        // ============================================
        if (httpMethod === 'GET' && path === '/api/v1/schedule/capacity') {
            return await getScheduleCapacity(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/schedule') {
            return await getSchedule(event, tenantId);
        }

        // No matching route
        return fail(event, 404, { message: 'Not Found' });

    } catch (error) {
        console.error('Analytics service error:', error);
        return fail(event, 500, { message: 'Internal Server Error', error: error.message });
    }
};

// ============================================
// DASHBOARD HANDLERS (from dashboard-api)
// ============================================

async function getDashboardStats(event, tenantId) {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    // Get multiple stats in parallel
    const [
        petCount,
        ownerCount,
        activeBookings,
        todayCheckins,
        todayCheckouts,
        todayRevenue,
        weekRevenue,
        monthRevenue
    ] = await Promise.all([
        // Total pets
        pool.query(
            'SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1 AND "status" = $2',
            [tenantId, 'active']
        ),
        // Total owners
        pool.query(
            'SELECT COUNT(*) FROM "Owner" WHERE "tenantId" = $1',
            [tenantId]
        ),
        // Active bookings (checked in or confirmed for today)
        pool.query(
            `SELECT COUNT(*) FROM "Booking"
             WHERE "tenantId" = $1
             AND "status" IN ('CHECKED_IN', 'CONFIRMED')
             AND "checkIn" <= $2 AND "checkOut" >= $2`,
            [tenantId, today]
        ),
        // Today's check-ins
        pool.query(
            `SELECT COUNT(*) FROM "Booking"
             WHERE "tenantId" = $1 AND "checkIn" = $2
             AND "status" IN ('PENDING', 'CONFIRMED')`,
            [tenantId, today]
        ),
        // Today's check-outs
        pool.query(
            `SELECT COUNT(*) FROM "Booking"
             WHERE "tenantId" = $1 AND "checkOut" = $2
             AND "status" IN ('CHECKED_IN', 'CONFIRMED')`,
            [tenantId, today]
        ),
        // Today's revenue
        pool.query(
            `SELECT COALESCE(SUM("amountCents"), 0) as total
             FROM "Payment"
             WHERE "tenantId" = $1
             AND "createdAt"::date = $2
             AND "status" = 'CAPTURED'`,
            [tenantId, today]
        ),
        // This week's revenue
        pool.query(
            `SELECT COALESCE(SUM("amountCents"), 0) as total
             FROM "Payment"
             WHERE "tenantId" = $1
             AND "createdAt" >= date_trunc('week', CURRENT_DATE)
             AND "status" = 'CAPTURED'`,
            [tenantId]
        ),
        // This month's revenue
        pool.query(
            `SELECT COALESCE(SUM("amountCents"), 0) as total
             FROM "Payment"
             WHERE "tenantId" = $1
             AND "createdAt" >= date_trunc('month', CURRENT_DATE)
             AND "status" = 'CAPTURED'`,
            [tenantId]
        )
    ]);

    // Get occupancy rate
    const runCapacity = await pool.query(
        'SELECT COALESCE(SUM("maxCapacity"), 0) as total FROM "RunTemplate" WHERE "tenantId" = $1 AND "isActive" = true',
        [tenantId]
    );

    const totalCapacity = parseInt(runCapacity.rows[0].total);
    const currentOccupancy = parseInt(activeBookings.rows[0].count);
    const occupancyRate = totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;

    return ok(event, 200, {
            totalPets: parseInt(petCount.rows[0].count),
            totalOwners: parseInt(ownerCount.rows[0].count),
            activeBookings: parseInt(activeBookings.rows[0].count),
            todayCheckins: parseInt(todayCheckins.rows[0].count),
            todayCheckouts: parseInt(todayCheckouts.rows[0].count),
            occupancyRate,
            revenue: {
                today: parseInt(todayRevenue.rows[0].total) / 100,
                thisWeek: parseInt(weekRevenue.rows[0].total) / 100,
                thisMonth: parseInt(monthRevenue.rows[0].total) / 100
            }
        });
}

async function getTodaysPets(event, tenantId) {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
        `SELECT
            p."recordId", p."name" as "petName", p."breed", p."photoUrl",
            p."medicalNotes", p."behaviorNotes", p."dietaryNotes",
            o."recordId" as "ownerId", o."firstName", o."lastName",
            o."phone", o."email",
            b."recordId" as "bookingId", b."status", b."checkIn", b."checkOut",
            b."notes", b."specialRequirements",
            CASE
                WHEN b."checkIn" = $2 AND b."status" IN ('PENDING', 'CONFIRMED') THEN 'arriving'
                WHEN b."checkOut" = $2 AND b."status" IN ('CHECKED_IN') THEN 'departing'
                WHEN b."status" = 'CHECKED_IN' THEN 'checked-in'
                ELSE 'other'
            END as "todayStatus",
            (
                SELECT array_agg(DISTINCT v."type")
                FROM "Vaccination" v
                WHERE v."petId" = p."recordId"
                AND v."expiresAt" < CURRENT_DATE + INTERVAL '30 days'
                AND v."expiresAt" >= CURRENT_DATE
            ) as "expiringVaccinations"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND (
            (b."checkIn" <= $2 AND b."checkOut" >= $2 AND b."status" IN ('CHECKED_IN', 'CONFIRMED'))
            OR (b."checkIn" = $2 AND b."status" IN ('PENDING', 'CONFIRMED'))
            OR (b."checkOut" = $2 AND b."status" IN ('CHECKED_IN'))
         )
         ORDER BY
            CASE
                WHEN b."checkIn" = $2 THEN 1
                WHEN b."checkOut" = $2 THEN 2
                ELSE 3
            END,
            p."name"`,
        [tenantId, today]
    );

    const pets = result.rows.map(row => ({
        petId: row.recordId,
        petName: row.petName,
        breed: row.breed,
        photoUrl: row.photoUrl,
        owner: {
            id: row.ownerId,
            name: `${row.firstName} ${row.lastName}`.trim(),
            phone: row.phone,
            email: row.email
        },
        booking: {
            id: row.bookingId,
            status: row.status,
            checkIn: row.checkIn,
            checkOut: row.checkOut,
            // run: removed - not in schema,
            notes: row.notes,
            specialRequirements: row.specialRequirements
        },
        status: row.todayStatus,
        warnings: [],
        notes: row.notes
    }));

    // Process warnings
    pets.forEach(pet => {
        const row = result.rows.find(r => r.recordId === pet.petId);
        if (pet.booking.specialRequirements?.includes('medication')) {
            pet.warnings.push('medication');
        }
        if (pet.booking.specialRequirements?.includes('special-diet')) {
            pet.warnings.push('special-diet');
        }
        if (row?.behaviorNotes?.toLowerCase().includes('aggressive') ||
            row?.behaviorNotes?.toLowerCase().includes('bite')) {
            pet.warnings.push('aggressive');
        }
        if (row?.expiringVaccinations?.length > 0) {
            pet.warnings.push('expiring-vaccinations');
        }
    });

    return ok(event, 200, pets);
}

async function getUpcomingArrivals(event, tenantId) {
    const pool = getPool();
    const { days = '7' } = event.queryStringParameters || {};
    const daysNum = parseInt(days);

    const result = await pool.query(
        `SELECT
            b."recordId", b."checkIn", b."status",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND b."status" IN ('PENDING', 'CONFIRMED')
         AND b."checkIn" >= CURRENT_DATE
         AND b."checkIn" <= CURRENT_DATE + INTERVAL '${daysNum} days'
         ORDER BY b."checkIn", p."name"`,
        [tenantId]
    );

    const arrivals = result.rows.map(row => ({
        bookingId: row.recordId,
        checkIn: row.checkIn,
        status: row.status,
        pet: {
            id: row.petId,
            name: row.petName,
            breed: row.breed
        },
        owner: {
            id: row.ownerId,
            name: `${row.firstName} ${row.lastName}`.trim()
        }
    }));

    return ok(event, 200, arrivals);
}

async function getUpcomingDepartures(event, tenantId) {
    const pool = getPool();
    const { days = '7' } = event.queryStringParameters || {};
    const daysNum = parseInt(days);

    const result = await pool.query(
        `SELECT
            b."recordId", b."checkOut", b."status", b."balanceDueCents",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND b."status" IN ('CHECKED_IN', 'CONFIRMED')
         AND b."checkOut" >= CURRENT_DATE
         AND b."checkOut" <= CURRENT_DATE + INTERVAL '${daysNum} days'
         ORDER BY b."checkOut", p."name"`,
        [tenantId]
    );

    const departures = result.rows.map(row => ({
        bookingId: row.recordId,
        checkOut: row.checkOut,
        status: row.status,
        balanceDue: row.balanceDueCents / 100,
        pet: {
            id: row.petId,
            name: row.petName,
            breed: row.breed
        },
        owner: {
            id: row.ownerId,
            name: `${row.firstName} ${row.lastName}`.trim()
        }
    }));

    return ok(event, 200, departures);
}

async function getOccupancy(event, tenantId) {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    // Get total capacity
    const capacityResult = await pool.query(
        `SELECT SUM("maxCapacity") as total
         FROM "RunTemplate"
         WHERE "tenantId" = $1 AND "isActive" = true`,
        [tenantId]
    );

    // Get current occupancy
    const occupancyResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM "Booking" b
         WHERE b."tenantId" = $1
         AND b."status" = 'CHECKED_IN'
         AND b."checkIn" <= $2
         AND b."checkOut" >= $2`,
        [tenantId, today]
    );

    const capacity = capacityResult.rows[0];
    const occupancy = occupancyResult.rows[0];

    return ok(event, 200, {
            current: parseInt(occupancy.total),
            total: parseInt(capacity.total) || 0,
            percentage: capacity.total > 0
                ? Math.round((parseInt(occupancy.total) / parseInt(capacity.total)) * 100)
                : 0
        });
}

async function getRevenueMetrics(event, tenantId) {
    const pool = getPool();
    const { period = 'month' } = event.queryStringParameters || {};

    let dateFilter = '';
    switch (period) {
        case 'week':
            dateFilter = "AND i.\"createdAt\" >= date_trunc('week', CURRENT_DATE)";
            break;
        case 'month':
            dateFilter = "AND i.\"createdAt\" >= date_trunc('month', CURRENT_DATE)";
            break;
        case 'year':
            dateFilter = "AND i.\"createdAt\" >= date_trunc('year', CURRENT_DATE)";
            break;
    }

    // Get revenue summary
    const result = await pool.query(
        `SELECT
            SUM(i."totalCents") as total,
            SUM(i."paidCents") as collected,
            SUM(i."totalCents" - i."paidCents") as pending,
            SUM(CASE
                WHEN i."dueDate" < CURRENT_DATE AND i."paidCents" < i."totalCents"
                THEN i."totalCents" - i."paidCents"
                ELSE 0
            END) as overdue
         FROM "Invoice" i
         WHERE i."tenantId" = $1
         AND i."status" != 'CANCELLED'
         ${dateFilter}`,
        [tenantId]
    );

    // Get chart data - daily for last 30 days
    const chartResult = await pool.query(
        `SELECT
            DATE(p."createdAt") as date,
            SUM(p."amountCents") as amount
         FROM "Payment" p
         WHERE p."tenantId" = $1
         AND p."status" = 'CAPTURED'
         AND p."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY DATE(p."createdAt")
         ORDER BY date`,
        [tenantId]
    );

    const summary = result.rows[0];
    const chartData = chartResult.rows.map(row => ({
        date: row.date,
        amount: parseInt(row.amount) / 100
    }));

    return ok(event, 200, {
            total: parseInt(summary.total) / 100 || 0,
            collected: parseInt(summary.collected) / 100 || 0,
            pending: parseInt(summary.pending) / 100 || 0,
            overdue: parseInt(summary.overdue) / 100 || 0,
            chartData
        });
}

async function getActivityFeed(event, tenantId) {
    const pool = getPool();
    const { limit = '20' } = event.queryStringParameters || {};
    const limitNum = parseInt(limit);

    // Get recent activity - check-ins, check-outs, new bookings, payments
    const result = await pool.query(
        `(
            SELECT
                'check-in' as type,
                ci."createdAt" as timestamp,
                p."name" as petName,
                o."firstName" || ' ' || o."lastName" as ownerName,
                NULL as amount
            FROM "CheckIn" ci
            JOIN "Booking" b ON ci."bookingId" = b."recordId"
            JOIN "Pet" p ON b."petId" = p."recordId"
            JOIN "Owner" o ON b."ownerId" = o."recordId"
            WHERE b."tenantId" = $1
        )
        UNION ALL
        (
            SELECT
                'check-out' as type,
                co."createdAt" as timestamp,
                p."name" as petName,
                o."firstName" || ' ' || o."lastName" as ownerName,
                NULL as amount
            FROM "CheckOut" co
            JOIN "Booking" b ON co."bookingId" = b."recordId"
            JOIN "Pet" p ON b."petId" = p."recordId"
            JOIN "Owner" o ON b."ownerId" = o."recordId"
            WHERE b."tenantId" = $1
        )
        UNION ALL
        (
            SELECT
                'booking' as type,
                b."createdAt" as timestamp,
                p."name" as petName,
                o."firstName" || ' ' || o."lastName" as ownerName,
                NULL as amount
            FROM "Booking" b
            JOIN "Pet" p ON b."petId" = p."recordId"
            JOIN "Owner" o ON b."ownerId" = o."recordId"
            WHERE b."tenantId" = $1
            AND b."createdAt" >= CURRENT_DATE - INTERVAL '7 days'
        )
        UNION ALL
        (
            SELECT
                'payment' as type,
                pay."createdAt" as timestamp,
                NULL as petName,
                o."firstName" || ' ' || o."lastName" as ownerName,
                pay."amountCents" as amount
            FROM "Payment" pay
            JOIN "Owner" o ON pay."ownerId" = o."recordId"
            WHERE pay."tenantId" = $1
            AND pay."status" = 'CAPTURED'
        )
        ORDER BY timestamp DESC
        LIMIT $2`,
        [tenantId, limitNum]
    );

    const activities = result.rows.map(row => ({
        type: row.type,
        timestamp: row.timestamp,
        petName: row.petname,
        ownerName: row.ownername,
        amount: row.amount ? row.amount / 100 : null,
        message: formatActivityMessage(row)
    }));

    return ok(event, 200, activities);
}

function formatActivityMessage(activity) {
    switch (activity.type) {
        case 'check-in':
            return `${activity.petname} checked in (${activity.ownername})`;
        case 'check-out':
            return `${activity.petname} checked out (${activity.ownername})`;
        case 'booking':
            return `New booking for ${activity.petname} (${activity.ownername})`;
        case 'payment':
            return `Payment received from ${activity.ownername} - $${activity.amount / 100}`;
        default:
            return 'Unknown activity';
    }
}

// ============================================
// REPORTS HANDLERS (from reports-api)
// ============================================

async function getDashboardMetrics(event, tenantId) {
    const pool = getPool();

    const metrics = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM "Booking" WHERE "tenantId" = $1 AND "status" = 'CONFIRMED'`, [tenantId]),
        pool.query(`SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1`, [tenantId]),
        pool.query(`SELECT COUNT(*) FROM "Owner" WHERE "tenantId" = $1`, [tenantId]),
        pool.query(`SELECT SUM("amountCents") FROM "Payment" WHERE "tenantId" = $1 AND "status" = 'CAPTURED'`, [tenantId])
    ]);

    return ok(event, 200, {
            activeBookings: parseInt(metrics[0].rows[0].count),
            totalPets: parseInt(metrics[1].rows[0].count),
            totalOwners: parseInt(metrics[2].rows[0].count),
            totalRevenueCents: parseInt(metrics[3].rows[0].sum || 0)
        });
}

async function getRevenueReport(event, tenantId) {
    const { startDate, endDate } = event.queryStringParameters || {};
    const pool = getPool();

    let query = `SELECT DATE("createdAt") as date, SUM("amountCents") as revenue
                 FROM "Payment"
                 WHERE "tenantId" = $1 AND "status" = 'CAPTURED'`;
    const params = [tenantId];
    let paramCount = 2;

    if (startDate) {
        query += ` AND "createdAt" >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
    }

    if (endDate) {
        query += ` AND "createdAt" <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
    }

    query += ` GROUP BY DATE("createdAt") ORDER BY date DESC`;

    const { rows } = await pool.query(query, params);

    return ok(event, 200, rows);
}

async function getOccupancyReport(event, tenantId) {
    const { startDate, endDate } = event.queryStringParameters || {};
    const pool = getPool();

    const query = `
        SELECT DATE(bs."startDate") as date, COUNT(*) as occupied_kennels
        FROM "BookingSegment" bs
        WHERE bs."tenantId" = $1
        AND bs."startDate" >= $2
        AND bs."endDate" <= $3
        GROUP BY DATE(bs."startDate")
        ORDER BY date
    `;

    const { rows } = await pool.query(query, [tenantId, startDate || '2020-01-01', endDate || '2099-12-31']);

    return ok(event, 200, rows);
}

async function getReportArrivals(event, tenantId) {
    const pool = getPool();
    const { days = '7' } = event.queryStringParameters || {};
    const daysNum = parseInt(days);

    const result = await pool.query(
        `SELECT
            b."recordId", b."checkIn", b."status",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName", o."phone", o."email"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND b."status" IN ('PENDING', 'CONFIRMED')
         AND b."checkIn" >= CURRENT_DATE
         AND b."checkIn" <= CURRENT_DATE + INTERVAL '${daysNum} days'
         ORDER BY b."checkIn", p."name"`,
        [tenantId]
    );

    return ok(event, 200, {
            arrivals: result.rows.map(row => ({
                bookingId: row.recordId,
                checkIn: row.checkIn,
                status: row.status,
                pet: {
                    id: row.petId,
                    name: row.petName,
                    breed: row.breed
                },
                owner: {
                    id: row.ownerId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    phone: row.phone,
                    email: row.email
                }
            }))
        });
}

async function getReportDepartures(event, tenantId) {
    const pool = getPool();
    const { days = '7' } = event.queryStringParameters || {};
    const daysNum = parseInt(days);

    const result = await pool.query(
        `SELECT
            b."recordId", b."checkOut", b."status", b."balanceDueCents",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName", o."phone", o."email"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND b."status" IN ('CHECKED_IN', 'CONFIRMED')
         AND b."checkOut" >= CURRENT_DATE
         AND b."checkOut" <= CURRENT_DATE + INTERVAL '${daysNum} days'
         ORDER BY b."checkOut", p."name"`,
        [tenantId]
    );

    return ok(event, 200, {
            departures: result.rows.map(row => ({
                bookingId: row.recordId,
                checkOut: row.checkOut,
                status: row.status,
                balanceDueCents: parseInt(row.balanceDueCents || 0),
                pet: {
                    id: row.petId,
                    name: row.petName,
                    breed: row.breed
                },
                owner: {
                    id: row.ownerId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    phone: row.phone,
                    email: row.email
                }
            }))
        });
}

// ============================================
// SCHEDULE HANDLERS (from schedule-api)
// ============================================

async function getScheduleCapacity(event, tenantId) {
    const pool = getPool();
    const { startDate, endDate } = event.queryStringParameters || {};


    // Generate all dates in range and count bookings staying on each day
    const { rows } = await pool.query(
        `WITH date_series AS (
            SELECT generate_series(
                $2::date,
                $3::date,
                '1 day'::interval
            )::date AS date
        ),
        total_capacity AS (
            SELECT COUNT(*) as count FROM "Kennel" WHERE "tenantId" = $1
        )
        SELECT
            ds.date,
            COUNT(DISTINCT b."recordId") as "bookedCount",
            tc.count as "totalCapacity",
            ROUND(
                COALESCE(COUNT(DISTINCT b."recordId")::numeric / NULLIF(tc.count, 0) * 100, 0),
                2
            ) as "utilizationPercent"
        FROM date_series ds
        CROSS JOIN total_capacity tc
        LEFT JOIN "Booking" b ON
            b."tenantId" = $1
            AND b."checkIn"::date <= ds.date
            AND b."checkOut"::date >= ds.date
            AND b."status" != 'CANCELLED'
        GROUP BY ds.date, tc.count
        ORDER BY ds.date`,
        [tenantId, startDate || '2020-01-01', endDate || '2099-12-31']
    );


    return ok(event, 200, rows);
}

async function getSchedule(event, tenantId) {
    const pool = getPool();
    const { from, to, startDate, endDate } = event.queryStringParameters || {};
    const dateFrom = from || startDate || '2020-01-01';
    const dateTo = to || endDate || '2099-12-31';

    const { rows } = await pool.query(
        `SELECT
            b."recordId",
            b."checkIn",
            b."checkOut",
            b."status",
            b."serviceType",
            p."name" as "petName",
            p."recordId" as "petId",
            o."firstName" || ' ' || o."lastName" as "ownerName",
            o."recordId" as "ownerId",
            json_agg(
                json_build_object(
                    'kennelId', bs."kennelId",
                    'kennel', json_build_object('recordId', k."recordId", 'name', k."name")
                )
            ) FILTER (WHERE bs."kennelId" IS NOT NULL) as segments
         FROM "Booking" b
         LEFT JOIN "Pet" p ON b."petId" = p."recordId"
         LEFT JOIN "Owner" o ON p."ownerId" = o."recordId"
         LEFT JOIN "BookingSegment" bs ON b."recordId" = bs."bookingId"
         LEFT JOIN "Kennel" k ON bs."kennelId" = k."recordId"
         WHERE b."tenantId" = $1
           AND b."checkIn" <= $3
           AND b."checkOut" >= $2
         GROUP BY b."recordId", b."checkIn", b."checkOut", b."status", b."serviceType",
                  p."name", p."recordId", o."firstName", o."lastName", o."recordId"
         ORDER BY b."checkIn"`,
        [tenantId, dateFrom, dateTo]
    );

    return ok(event, 200, rows);
}
