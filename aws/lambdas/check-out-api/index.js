const { getPool, getTenantIdFromEvent, getJWTValidator } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
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
    console.log('Received event:', JSON.stringify(event, null, 2));

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
        // Check-out routes
        if (httpMethod === 'POST' && path === '/api/v1/check-outs') {
            return await createCheckOut(event, tenantId, userInfo);
        }
        if (httpMethod === 'GET' && path === '/api/v1/check-outs') {
            return await listCheckOuts(event, tenantId);
        }
        if (httpMethod === 'GET' && event.pathParameters?.id) {
            return await getCheckOut(event, tenantId);
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

async function createCheckOut(event, tenantId, userInfo) {
    const pool = getPool();
    const body = JSON.parse(event.body || '{}');
    const {
        bookingId,
        lateFeeCents,
        additionalChargesCents,
        additionalChargesDescription,
        paymentCaptured,
        paymentIntentId,
        signatureUrl,
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
                    o."firstName", o."lastName", o."recordId" as "ownerId",
                    o."email", o."phone"
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

        if (booking.status !== 'CHECKED_IN') {
            throw new Error(`Cannot check out booking with status ${booking.status}`);
        }

        // Calculate total charges
        const totalCharges = (lateFeeCents || 0) + (additionalChargesCents || 0);
        const newBalance = booking.balanceDueInCents + totalCharges;

        // Update booking status, actual check-out time, and balance
        await client.query(
            `UPDATE "Booking" 
             SET "status" = 'COMPLETED', 
                 "actualCheckOut" = NOW(),
                 "balanceDueInCents" = $3,
                 "updatedAt" = NOW() 
             WHERE "recordId" = $1 AND "tenantId" = $2`,
            [bookingId, tenantId, newBalance]
        );

        // Create check-out record
        const checkOutResult = await client.query(
            `INSERT INTO "CheckOut" (
                "recordId", "bookingId", "checkedOutBy",
                "lateFeeCents", "additionalChargesCents", "additionalChargesDescription",
                "paymentCaptured", "paymentIntentId", "signatureUrl",
                "notes", "checkedOutAt"
             ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
             ) RETURNING *`,
            [
                bookingId,
                userInfo.userId,
                lateFeeCents || 0,
                additionalChargesCents || 0,
                additionalChargesDescription,
                paymentCaptured || false,
                paymentIntentId,
                signatureUrl,
                notes
            ]
        );

        // If payment was captured, create a payment record
        if (paymentCaptured && newBalance > 0) {
            await client.query(
                `INSERT INTO "Payment" (
                    "recordId", "tenantId", "ownerId", 
                    "amountCents", "method", "status", 
                    "stripePaymentIntentId", "metadata", "createdAt"
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, 'card', 'COMPLETED', $4, $5, NOW()
                )`,
                [
                    tenantId,
                    booking.ownerId,
                    newBalance,
                    paymentIntentId,
                    JSON.stringify({ bookingId, checkOutId: checkOutResult.rows[0].recordId })
                ]
            );
        }

        await client.query('COMMIT');

        const checkOut = checkOutResult.rows[0];
        checkOut.booking = {
            recordId: booking.recordId,
            petName: booking.petName,
            petId: booking.petId,
            ownerName: `${booking.firstName} ${booking.lastName}`.trim(),
            ownerId: booking.ownerId,
            ownerEmail: booking.email,
            ownerPhone: booking.phone,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            totalDue: newBalance / 100
        };

        return {
            statusCode: 201,
            headers: HEADERS,
            body: JSON.stringify(checkOut),
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Check-out error:', error);
        
        if (error.message === 'Booking not found') {
            return {
                statusCode: 404,
                headers: HEADERS,
                body: JSON.stringify({ message: error.message }),
            };
        }
        
        if (error.message.includes('Cannot check out')) {
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

async function listCheckOuts(event, tenantId) {
    const pool = getPool();
    const { date, limit = '50', offset = '0' } = event.queryStringParameters || {};

    let query = `
        SELECT co.*, 
               b."checkIn", b."checkOut", b."status" as "bookingStatus", b."balanceDueInCents",
               p."name" as "petName", p."recordId" as "petId",
               o."firstName", o."lastName", o."recordId" as "ownerId", o."email", o."phone",
               u."name" as "checkedOutByName"
        FROM "CheckOut" co
        JOIN "Booking" b ON co."bookingId" = b."recordId"
        JOIN "Pet" p ON b."petId" = p."recordId"
        JOIN "Owner" o ON b."ownerId" = o."recordId"
        LEFT JOIN "User" u ON co."checkedOutBy" = u."recordId"
        WHERE b."tenantId" = $1
    `;
    
    const params = [tenantId];
    
    if (date) {
        query += ` AND co."checkedOutAt"::date = $${params.length + 1}`;
        params.push(date);
    }
    
    query += ` ORDER BY co."checkedOutAt" DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    
    const checkOuts = result.rows.map(row => ({
        ...row,
        ownerName: `${row.firstName} ${row.lastName}`.trim(),
        totalCharges: (row.lateFeeCents + row.additionalChargesCents) / 100,
        balanceDue: row.balanceDueInCents / 100
    }));

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(checkOuts),
    };
}

async function getCheckOut(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;

    const result = await pool.query(
        `SELECT co.*, 
                b."checkIn", b."checkOut", b."status" as "bookingStatus",
                b."totalPriceInCents", b."depositInCents", b."balanceDueInCents",
                p."name" as "petName", p."recordId" as "petId",
                o."firstName", o."lastName", o."recordId" as "ownerId", o."email", o."phone",
                u."name" as "checkedOutByName",
                s."name" as "serviceName"
         FROM "CheckOut" co
         JOIN "Booking" b ON co."bookingId" = b."recordId"
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         LEFT JOIN "User" u ON co."checkedOutBy" = u."recordId"
         LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
         WHERE co."recordId" = $1 AND b."tenantId" = $2`,
        [id, tenantId]
    );

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Check-out not found' }),
        };
    }

    const checkOut = result.rows[0];
    checkOut.ownerName = `${checkOut.firstName} ${checkOut.lastName}`.trim();
    checkOut.totalPrice = checkOut.totalPriceInCents / 100;
    checkOut.deposit = checkOut.depositInCents / 100;
    checkOut.balanceDue = checkOut.balanceDueInCents / 100;
    checkOut.totalCharges = (checkOut.lateFeeCents + checkOut.additionalChargesCents) / 100;

    // Get payment history for this booking
    const paymentsResult = await pool.query(
        `SELECT p.*, 
                CASE WHEN p."metadata"::jsonb ? 'checkOutId' 
                THEN p."metadata"::jsonb->>'checkOutId' = $2 
                ELSE false END as "isCheckoutPayment"
         FROM "Payment" p
         WHERE p."tenantId" = $1 
         AND p."metadata"::jsonb->>'bookingId' = $3
         ORDER BY p."createdAt" DESC`,
        [tenantId, id, checkOut.bookingId]
    );

    checkOut.payments = paymentsResult.rows.map(p => ({
        ...p,
        amount: p.amountCents / 100
    }));

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(checkOut),
    };
}