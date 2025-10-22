const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
};

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = getTenantIdFromEvent(event);

    if (!tenantId) {
        return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };
    }

    try {
        if (httpMethod === 'GET' && path === '/api/v1/payments') {
            return await listPayments(event, tenantId);
        }
        if (httpMethod === 'POST' && path === '/api/v1/payments') {
            return await createPayment(event, tenantId);
        }
        if (httpMethod === 'GET' && event.pathParameters?.paymentId) {
            return await getPayment(event, tenantId);
        }

        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Payments error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

async function listPayments(event, tenantId) {
    const { status, limit = 50, offset = 0 } = event.queryStringParameters || {};
    const pool = getPool();

    let query = `
        SELECT 
            p.*,
            o."firstName" as "ownerFirstName",
            o."lastName" as "ownerLastName",
            o."email" as "ownerEmail",
            o."phone" as "ownerPhone",
            b."recordId" as "bookingRecordId",
            b."checkIn" as "bookingCheckIn",
            b."checkOut" as "bookingCheckOut",
            pet."name" as "petName",
            pet."breed" as "petBreed"
        FROM "Payment" p
        LEFT JOIN "Owner" o ON p."ownerId" = o."recordId"
        LEFT JOIN "Booking" b ON p."bookingId" = b."recordId"
        LEFT JOIN "Pet" pet ON b."petId" = pet."recordId"
        WHERE p."tenantId" = $1
    `;
    const params = [tenantId];
    let paramCount = 2;

    if (status) {
        query += ` AND p."status" = $${paramCount}`;
        params.push(status);
        paramCount++;
    }

    query += ` ORDER BY p."createdAt" DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows)
    };
}

async function createPayment(event, tenantId) {
    const { bookingId, amountCents, method, status, metadata } = JSON.parse(event.body);

    const pool = getPool();

    const { rows } = await pool.query(
        `INSERT INTO "Payment" ("recordId", "tenantId", "bookingId", "amountCents", "method", "status", "metadata", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [tenantId, bookingId, amountCents, method || 'CARD', status || 'PENDING', JSON.stringify(metadata || {})]
    );

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function getPayment(event, tenantId) {
    const { paymentId } = event.pathParameters;
    const pool = getPool();

    const { rows } = await pool.query(
        `SELECT * FROM "Payment" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [paymentId, tenantId]
    );

    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Payment not found' }) };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

