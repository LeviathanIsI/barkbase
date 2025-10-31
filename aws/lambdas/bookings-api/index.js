const { getPool, getTenantIdFromEvent, getJWTValidator } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
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

        if (httpMethod === 'GET' && (path === '/api/v1/bookings' || path.endsWith('/bookings'))) {
            return await listBookings(event, tenantId);
        }
        if (httpMethod === 'POST' && (path === '/api/v1/bookings' || path.endsWith('/bookings'))) {
            return await createBooking(event, tenantId, userInfo);
        }
        if (httpMethod === 'GET' && event.pathParameters?.id) {
            return await getBooking(event, tenantId);
        }
        if (httpMethod === 'PUT' && event.pathParameters?.id) {
            return await updateBooking(event, tenantId);
        }
        if (httpMethod === 'PATCH' && event.pathParameters?.id && path.includes('/status')) {
            return await updateBookingStatus(event, tenantId);
        }
        if (httpMethod === 'POST' && event.pathParameters?.id && path.includes('/checkin')) {
            return await checkIn(event, tenantId, userInfo);
        }
        if (httpMethod === 'POST' && event.pathParameters?.id && path.includes('/checkout')) {
            return await checkOut(event, tenantId, userInfo);
        }
        if (httpMethod === 'DELETE' && event.pathParameters?.id) {
            return await deleteBooking(event, tenantId);
        }

        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

async function listBookings(event, tenantId) {
    const { status, startDate, endDate, from, to, limit = 50, offset = 0 } = event.queryStringParameters || {};
    const pool = getPool();
    
    const dateFrom = from || startDate;
    const dateTo = to || endDate;
    
    let query = `
        SELECT b.*, 
               json_build_object(
                   'recordId', p."recordId", 
                   'name', p."name", 
                   'species', p."species", 
                   'breed', p."breed",
                   'medicalNotes', p."medicalNotes",
                   'behaviorNotes', p."behaviorNotes",
                   'dietaryNotes', p."dietaryNotes"
               ) as pet,
               json_build_object(
                   'recordId', o."recordId", 
                   'firstName', o."firstName", 
                   'lastName', o."lastName", 
                   'email', o."email",
                   'phone', o."phone"
               ) as owner,
               s."name" as "serviceName",
               rt."name" as "runName"
        FROM "Booking" b
        LEFT JOIN "Pet" p ON b."petId" = p."recordId"
        LEFT JOIN "Owner" o ON b."ownerId" = o."recordId"
        LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
        LEFT JOIN "RunTemplate" rt ON b."runTemplateId" = rt."recordId"
        WHERE b."tenantId" = $1
    `;
    const params = [tenantId];
    let paramCount = 2;

    if (status) {
        query += ` AND b."status" = $${paramCount}`;
        params.push(status);
        paramCount++;
    }

    if (dateFrom) {
        query += ` AND b."checkOut" >= $${paramCount}`;
        params.push(dateFrom);
        paramCount++;
    }

    if (dateTo) {
        query += ` AND b."checkIn" <= $${paramCount}`;
        params.push(dateTo);
        paramCount++;
    }

    query += ` GROUP BY b."recordId", p."recordId", o."recordId", s."name", rt."name"`;
    query += ` ORDER BY b."checkIn" DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);
    
    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows)
    };
}

async function createBooking(event, tenantId, userInfo) {
    const body = JSON.parse(event.body || '{}');
    const { 
        petId, 
        ownerId, 
        serviceId,
        runTemplateId,
        checkIn, 
        checkOut, 
        totalPriceInCents,
        depositInCents,
        notes,
        specialRequirements 
    } = body;

    const pool = getPool();
    
    // Validate required fields
    if (!petId || !ownerId || !checkIn || !checkOut) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Missing required fields: petId, ownerId, checkIn, checkOut' }),
        };
    }

    // Create booking
    const bookingResult = await pool.query(
        `INSERT INTO "Booking" (
            "recordId", "tenantId", "petId", "ownerId", 
            "serviceId", "runTemplateId", "status", 
            "checkIn", "checkOut", 
            "totalPriceInCents", "depositInCents", "balanceDueInCents",
            "notes", "specialRequirements", "createdAt", "updatedAt"
         ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
         ) RETURNING *`,
        [
            tenantId, petId, ownerId, serviceId, runTemplateId,
            'PENDING', checkIn, checkOut, 
            totalPriceInCents || 0, depositInCents || 0, 
            (totalPriceInCents || 0) - (depositInCents || 0),
            notes, specialRequirements
        ]
    );
    
    const booking = bookingResult.rows[0];

    // Get pet and owner details
    const [petResult, ownerResult] = await Promise.all([
        pool.query('SELECT * FROM "Pet" WHERE "recordId" = $1', [petId]),
        pool.query('SELECT * FROM "Owner" WHERE "recordId" = $1', [ownerId])
    ]);

    booking.pet = petResult.rows[0];
    booking.owner = ownerResult.rows[0];

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(booking)
    };
}

async function getBooking(event, tenantId) {
    const { id } = event.pathParameters;
    const pool = getPool();

    const { rows } = await pool.query(
        `SELECT b.*, 
                json_build_object(
                    'recordId', p."recordId", 
                    'name', p."name", 
                    'species', p."species",
                    'breed', p."breed",
                    'photoUrl', p."photoUrl"
                ) as pet,
                json_build_object(
                    'recordId', o."recordId", 
                    'firstName', o."firstName",
                    'lastName', o."lastName",
                    'email', o."email", 
                    'phone', o."phone"
                ) as owner,
                s."name" as "serviceName",
                rt."name" as "runName"
         FROM "Booking" b
         LEFT JOIN "Pet" p ON b."petId" = p."recordId"
         LEFT JOIN "Owner" o ON b."ownerId" = o."recordId"
         LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
         LEFT JOIN "RunTemplate" rt ON b."runTemplateId" = rt."recordId"
         WHERE b."recordId" = $1 AND b."tenantId" = $2`,
        [id, tenantId]
    );

    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Booking not found' }) };
    }

    const booking = rows[0];

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(booking)
    };
}

async function updateBooking(event, tenantId) {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { 
        checkIn, 
        checkOut, 
        serviceId,
        runTemplateId,
        totalPriceInCents,
        notes,
        specialRequirements 
    } = body;

    const pool = getPool();

    const fields = [];
    const values = [];
    let paramCount = 3; // Starting after id and tenantId

    if (checkIn !== undefined) {
        fields.push(`"checkIn" = $${paramCount++}`);
        values.push(checkIn);
    }
    if (checkOut !== undefined) {
        fields.push(`"checkOut" = $${paramCount++}`);
        values.push(checkOut);
    }
    if (serviceId !== undefined) {
        fields.push(`"serviceId" = $${paramCount++}`);
        values.push(serviceId);
    }
    if (runTemplateId !== undefined) {
        fields.push(`"runTemplateId" = $${paramCount++}`);
        values.push(runTemplateId);
    }
    if (totalPriceInCents !== undefined) {
        fields.push(`"totalPriceInCents" = $${paramCount++}`);
        values.push(totalPriceInCents);
        fields.push(`"balanceDueInCents" = "totalPriceInCents" - "depositInCents"`);
    }
    if (notes !== undefined) {
        fields.push(`"notes" = $${paramCount++}`);
        values.push(notes);
    }
    if (specialRequirements !== undefined) {
        fields.push(`"specialRequirements" = $${paramCount++}`);
        values.push(specialRequirements);
    }

    if (fields.length === 0) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'No fields to update' }) };
    }

    fields.push(`"updatedAt" = NOW()`);

    const query = `UPDATE "Booking" SET ${fields.join(', ')} WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING *`;
    const queryParams = [id, tenantId, ...values];

    const { rows } = await pool.query(query, queryParams);

    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Booking not found' }) };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function updateBookingStatus(event, tenantId) {
    const { id } = event.pathParameters;
    const { status } = JSON.parse(event.body || '{}');

    if (!status) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Status required' }) };
    }

    const pool = getPool();

    const { rows } = await pool.query(
        `UPDATE "Booking" SET "status" = $1, "updatedAt" = NOW() 
         WHERE "recordId" = $2 AND "tenantId" = $3 
         RETURNING *`,
        [status, id, tenantId]
    );

    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Booking not found' }) };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function checkIn(event, tenantId, userInfo) {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { 
        weight,
        conditionRating,
        vaccinationsVerified,
        belongings,
        notes 
    } = body;

    const pool = getPool();

    // Update booking status and actual check-in time
    await pool.query(
        `UPDATE "Booking" 
         SET "status" = 'CHECKED_IN', 
             "actualCheckIn" = NOW(), 
             "updatedAt" = NOW() 
         WHERE "recordId" = $1 AND "tenantId" = $2`,
        [id, tenantId]
    );

    // Create check-in record
    const { rows } = await pool.query(
        `INSERT INTO "CheckIn" (
            "recordId", "bookingId", "checkedInBy",
            "weight", "conditionRating", "vaccinationsVerified",
            "belongings", "notes", "checkedInAt"
         ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
         ) RETURNING *`,
        [
            id, userInfo.userId, weight, conditionRating, 
            vaccinationsVerified || false, 
            JSON.stringify(belongings || []), 
            notes
        ]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function checkOut(event, tenantId, userInfo) {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { 
        lateFeeCents,
        additionalChargesCents,
        additionalChargesDescription,
        paymentCaptured,
        paymentIntentId,
        signatureUrl,
        notes 
    } = body;

    const pool = getPool();

    // Update booking status and actual check-out time
    await pool.query(
        `UPDATE "Booking" 
         SET "status" = 'COMPLETED', 
             "actualCheckOut" = NOW(), 
             "updatedAt" = NOW() 
         WHERE "recordId" = $1 AND "tenantId" = $2`,
        [id, tenantId]
    );

    // Create check-out record
    const { rows } = await pool.query(
        `INSERT INTO "CheckOut" (
            "recordId", "bookingId", "checkedOutBy",
            "lateFeeCents", "additionalChargesCents", "additionalChargesDescription",
            "paymentCaptured", "paymentIntentId", "signatureUrl",
            "notes", "checkedOutAt"
         ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
         ) RETURNING *`,
        [
            id, userInfo.userId, 
            lateFeeCents || 0, 
            additionalChargesCents || 0,
            additionalChargesDescription,
            paymentCaptured || false,
            paymentIntentId,
            signatureUrl,
            notes
        ]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function deleteBooking(event, tenantId) {
    const { id } = event.pathParameters;
    const pool = getPool();

    // Check if booking can be deleted (not checked-in or completed)
    const checkResult = await pool.query(
        'SELECT "status" FROM "Booking" WHERE "recordId" = $1 AND "tenantId" = $2',
        [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Booking not found' }) };
    }

    const status = checkResult.rows[0].status;
    if (status === 'CHECKED_IN' || status === 'COMPLETED') {
        return { 
            statusCode: 400, 
            headers: HEADERS, 
            body: JSON.stringify({ message: 'Cannot delete booking that has been checked in' }) 
        };
    }

    // Delete check-in/check-out records if any
    await pool.query('DELETE FROM "CheckIn" WHERE "bookingId" = $1', [id]);
    await pool.query('DELETE FROM "CheckOut" WHERE "bookingId" = $1', [id]);

    // Delete booking
    const { rowCount } = await pool.query(
        'DELETE FROM "Booking" WHERE "recordId" = $1 AND "tenantId" = $2',
        [id, tenantId]
    );

    if (rowCount === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Booking not found' }) };
    }

    return {
        statusCode: 204,
        headers: HEADERS,
        body: ''
    };
}

