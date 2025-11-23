// TODO (Decommission Phase):
// This Lambda is legacy. Its functionality has been superseded by analytics-service (dashboard/reports/schedule).
// Do NOT add new endpoints or business logic here.
// This Lambda will be retired in a future decommission phase once all callers are migrated.

const { getPool, getTenantIdFromEvent, getJWTValidator } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
};

// Helper function to validate authentication
async function validateAuth(event) {
    try {
        const jwtValidator = getJWTValidator();
        const userInfo = await jwtValidator.validateRequest(event);
        return userInfo;
    } catch (error) {
        console.error('Auth validation failed:', error);
        return null;
    }
}

exports.handler = async (event) => {

    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    if (httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: HEADERS, body: '' };
    }

    // Validate authentication
    const userInfo = await validateAuth(event);
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
        // Dashboard routes
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
        
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Not Found' }),
        };

    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

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
             AND "status" = 'COMPLETED'`,
            [tenantId, today]
        ),
        // This week's revenue
        pool.query(
            `SELECT COALESCE(SUM("amountCents"), 0) as total 
             FROM "Payment" 
             WHERE "tenantId" = $1 
             AND "createdAt" >= date_trunc('week', CURRENT_DATE)
             AND "status" = 'COMPLETED'`,
            [tenantId]
        ),
        // This month's revenue
        pool.query(
            `SELECT COALESCE(SUM("amountCents"), 0) as total 
             FROM "Payment" 
             WHERE "tenantId" = $1 
             AND "createdAt" >= date_trunc('month', CURRENT_DATE)
             AND "status" = 'COMPLETED'`,
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

            return {
                statusCode: 200,
                headers: HEADERS,
                body: JSON.stringify({
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
        }),
    };
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
            s."name" as "serviceName", rt."name" as "runName",
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
         LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
         LEFT JOIN "RunTemplate" rt ON b."runTemplateId" = rt."recordId"
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
            service: row.serviceName,
            run: row.runName,
            notes: row.notes,
            specialRequirements: row.specialRequirements
        },
        status: row.todayStatus,
        warnings: [],
        notes: row.notes
    }));

    // Process warnings
    pets.forEach(pet => {
        if (pet.booking.specialRequirements?.includes('medication')) {
            pet.warnings.push('medication');
        }
        if (pet.booking.specialRequirements?.includes('special-diet')) {
            pet.warnings.push('special-diet');
        }
        if (row.behaviorNotes?.toLowerCase().includes('aggressive') || 
            row.behaviorNotes?.toLowerCase().includes('bite')) {
            pet.warnings.push('aggressive');
        }
        if (row.expiringVaccinations?.length > 0) {
            pet.warnings.push('expiring-vaccinations');
        }
    });

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(pets),
    };
}

async function getUpcomingArrivals(event, tenantId) {
    const pool = getPool();
    const { days = '7' } = event.queryStringParameters || {};
    const daysNum = parseInt(days);
    
    const result = await pool.query(
        `SELECT 
            b."recordId", b."checkIn", b."status",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName",
            s."name" as "serviceName"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
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
        },
        service: row.serviceName
    }));

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(arrivals),
    };
}

async function getUpcomingDepartures(event, tenantId) {
    const pool = getPool();
    const { days = '7' } = event.queryStringParameters || {};
    const daysNum = parseInt(days);
    
    const result = await pool.query(
        `SELECT 
            b."recordId", b."checkOut", b."status", b."balanceDueInCents",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName",
            s."name" as "serviceName"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
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
        balanceDue: row.balanceDueInCents / 100,
        pet: {
            id: row.petId,
            name: row.petName,
            breed: row.breed
        },
        owner: {
            id: row.ownerId,
            name: `${row.firstName} ${row.lastName}`.trim()
        },
        service: row.serviceName
    }));

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(departures),
    };
}

async function getOccupancy(event, tenantId) {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];
    
    // Get total capacity
    const capacityResult = await pool.query(
        `SELECT 
            SUM("maxCapacity") as total,
            STRING_AGG(DISTINCT "category", ',') as categories,
            SUM(CASE WHEN "category" = 'Dog Run' THEN "maxCapacity" ELSE 0 END) as dogRuns,
            SUM(CASE WHEN "category" = 'Cat Room' THEN "maxCapacity" ELSE 0 END) as catRooms,
            SUM(CASE WHEN "category" = 'Suite' THEN "maxCapacity" ELSE 0 END) as suites
         FROM "RunTemplate" 
         WHERE "tenantId" = $1 AND "isActive" = true`,
        [tenantId]
    );

    // Get current occupancy by category
    const occupancyResult = await pool.query(
        `SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN rt."category" = 'Dog Run' THEN 1 END) as dogRuns,
            COUNT(CASE WHEN rt."category" = 'Cat Room' THEN 1 END) as catRooms,
            COUNT(CASE WHEN rt."category" = 'Suite' THEN 1 END) as suites
         FROM "Booking" b
         LEFT JOIN "RunTemplate" rt ON b."runTemplateId" = rt."recordId"
         WHERE b."tenantId" = $1 
         AND b."status" = 'CHECKED_IN'
         AND b."checkIn" <= $2 
         AND b."checkOut" >= $2`,
        [tenantId, today]
    );

    const capacity = capacityResult.rows[0];
    const occupancy = occupancyResult.rows[0];

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
            current: parseInt(occupancy.total),
            total: parseInt(capacity.total) || 0,
            percentage: capacity.total > 0 
                ? Math.round((parseInt(occupancy.total) / parseInt(capacity.total)) * 100) 
                : 0,
            byCategory: {
                dogRuns: {
                    current: parseInt(occupancy.dogRuns),
                    total: parseInt(capacity.dogRuns) || 0
                },
                catRooms: {
                    current: parseInt(occupancy.catRooms),
                    total: parseInt(capacity.catRooms) || 0
                },
                suites: {
                    current: parseInt(occupancy.suites),
                    total: parseInt(capacity.suites) || 0
                }
            }
        }),
    };
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
         AND p."status" = 'COMPLETED'
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

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
            total: parseInt(summary.total) / 100 || 0,
            collected: parseInt(summary.collected) / 100 || 0,
            pending: parseInt(summary.pending) / 100 || 0,
            overdue: parseInt(summary.overdue) / 100 || 0,
            chartData
        }),
    };
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
            AND pay."status" = 'COMPLETED'
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

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(activities),
    };
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