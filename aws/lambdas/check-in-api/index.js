// TODO (Decommission Phase):
// This Lambda is legacy. Its functionality has been superseded by operations-service (bookings/runs/check-ins).
// Do NOT add new endpoints or business logic here.
// This Lambda will be retired in a future decommission phase once all callers are migrated.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
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
        userId: claims.sub,  // Map userId to sub for compatibility
        username: claims.username,
        email: claims.email,
        tenantId: claims['custom:tenantId'] || claims.tenantId
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
        // Check-in routes
        if (httpMethod === 'POST' && path === '/api/v1/check-ins') {
            return await createCheckIn(event, tenantId, userInfo);
        }
        if (httpMethod === 'GET' && path === '/api/v1/check-ins') {
            return await listCheckIns(event, tenantId);
        }
        if (httpMethod === 'GET' && event.pathParameters?.id) {
            return await getCheckIn(event, tenantId);
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

async function createCheckIn(event, tenantId, userInfo) {
    const pool = getPool();
    const body = JSON.parse(event.body || '{}');
    const {
        bookingId,
        weight,
        conditionRating,
        vaccinationsVerified,
        belongings,
        photoUrls,
        notes
    } = body;

    if (!bookingId) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'bookingId is required' }),
        };
    }

    // Begin transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if booking exists and is in valid status
        const bookingResult = await client.query(
            `SELECT b.*, 
                    p."name" as "petName", p."recordId" as "petId",
                    o."firstName", o."lastName", o."recordId" as "ownerId"
             FROM "Booking" b
             JOIN "Pet" p ON b."petId" = p."recordId"
             JOIN "Owner" o ON b."ownerId" = o."recordId"
             WHERE b."recordId" = $1 AND b."tenantId" = $2`,
            [bookingId, tenantId]
        );

        if (bookingResult.rows.length === 0) {
            throw new Error('Booking not found');
        }

        const booking = bookingResult.rows[0];

        if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
            throw new Error(`Cannot check in booking with status ${booking.status}`);
        }

        // Update booking status and actual check-in time
        await client.query(
            `UPDATE "Booking" 
             SET "status" = 'CHECKED_IN', 
                 "actualCheckIn" = NOW(), 
                 "updatedAt" = NOW() 
             WHERE "recordId" = $1 AND "tenantId" = $2`,
            [bookingId, tenantId]
        );

        // Create check-in record
        const checkInResult = await client.query(
            `INSERT INTO "CheckIn" (
                "recordId", "bookingId", "checkedInBy",
                "weight", "conditionRating", "vaccinationsVerified",
                "belongings", "photoUrls", "notes", "checkedInAt"
             ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW()
             ) RETURNING *`,
            [
                bookingId, 
                userInfo.userId,
                weight,
                conditionRating,
                vaccinationsVerified || false,
                JSON.stringify(belongings || []),
                JSON.stringify(photoUrls || []),
                notes
            ]
        );

        await client.query('COMMIT');

        const checkIn = checkInResult.rows[0];
        checkIn.booking = {
            recordId: booking.recordId,
            petName: booking.petName,
            petId: booking.petId,
            ownerName: `${booking.firstName} ${booking.lastName}`.trim(),
            ownerId: booking.ownerId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut
        };

        return {
            statusCode: 201,
            headers: HEADERS,
            body: JSON.stringify(checkIn),
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Check-in error:', error);
        
        if (error.message === 'Booking not found') {
            return {
                statusCode: 404,
                headers: HEADERS,
                body: JSON.stringify({ message: error.message }),
            };
        }
        
        if (error.message.includes('Cannot check in')) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: error.message }),
            };
        }
        
        throw error;
    } finally {
        client.release();
    }
}

async function listCheckIns(event, tenantId) {
    const pool = getPool();
    const { date, limit = '50', offset = '0' } = event.queryStringParameters || {};

    let query = `
        SELECT ci.*, 
               b."checkIn", b."checkOut", b."status" as "bookingStatus",
               p."name" as "petName", p."recordId" as "petId",
               o."firstName", o."lastName", o."recordId" as "ownerId",
               u."name" as "checkedInByName"
        FROM "CheckIn" ci
        JOIN "Booking" b ON ci."bookingId" = b."recordId"
        JOIN "Pet" p ON b."petId" = p."recordId"
        JOIN "Owner" o ON b."ownerId" = o."recordId"
        LEFT JOIN "User" u ON ci."checkedInBy" = u."recordId"
        WHERE b."tenantId" = $1
    `;
    
    const params = [tenantId];
    
    if (date) {
        query += ` AND ci."checkedInAt"::date = $${params.length + 1}`;
        params.push(date);
    }
    
    query += ` ORDER BY ci."checkedInAt" DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    
    const checkIns = result.rows.map(row => ({
        ...row,
        ownerName: `${row.firstName} ${row.lastName}`.trim(),
        belongings: typeof row.belongings === 'string' ? JSON.parse(row.belongings) : row.belongings,
        photoUrls: typeof row.photoUrls === 'string' ? JSON.parse(row.photoUrls) : row.photoUrls
    }));

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(checkIns),
    };
}

async function getCheckIn(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;

    const result = await pool.query(
        `SELECT ci.*, 
                b."checkIn", b."checkOut", b."status" as "bookingStatus",
                p."name" as "petName", p."recordId" as "petId",
                o."firstName", o."lastName", o."recordId" as "ownerId", o."email", o."phone",
                u."name" as "checkedInByName"
         FROM "CheckIn" ci
         JOIN "Booking" b ON ci."bookingId" = b."recordId"
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         LEFT JOIN "User" u ON ci."checkedInBy" = u."recordId"
         WHERE ci."recordId" = $1 AND b."tenantId" = $2`,
        [id, tenantId]
    );

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Check-in not found' }),
        };
    }

    const checkIn = result.rows[0];
    checkIn.ownerName = `${checkIn.firstName} ${checkIn.lastName}`.trim();
    checkIn.belongings = typeof checkIn.belongings === 'string' ? JSON.parse(checkIn.belongings) : checkIn.belongings;
    checkIn.photoUrls = typeof checkIn.photoUrls === 'string' ? JSON.parse(checkIn.photoUrls) : checkIn.photoUrls;

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(checkIn),
    };
}