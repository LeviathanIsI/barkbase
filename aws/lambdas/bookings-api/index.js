const { getPool } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
};

function verifyAuth(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    // TODO: Verify JWT properly
    return { userId: 'user-id', role: 'ADMIN' };
}

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = event.headers['x-tenant-id'];

    if (!tenantId) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing x-tenant-id' }) };
    }

    try {
        const user = verifyAuth(event);

        if (httpMethod === 'GET' && (path === '/api/v1/bookings' || path.endsWith('/bookings'))) {
            return await listBookings(event, tenantId);
        }
        if (httpMethod === 'POST' && (path === '/api/v1/bookings' || path.endsWith('/bookings'))) {
            return await createBooking(event, tenantId, user);
        }
        if (httpMethod === 'GET' && event.pathParameters?.bookingId) {
            return await getBooking(event, tenantId);
        }
        if (httpMethod === 'PUT' && event.pathParameters?.bookingId) {
            return await updateBooking(event, tenantId);
        }
        if (httpMethod === 'PATCH' && path.includes('/status')) {
            return await updateBookingStatus(event, tenantId);
        }
        if (httpMethod === 'POST' && path.includes('/checkin')) {
            return await checkIn(event, tenantId);
        }
        if (httpMethod === 'POST' && path.includes('/checkout')) {
            return await checkOut(event, tenantId);
        }
        if (httpMethod === 'DELETE' && event.pathParameters?.bookingId) {
            return await deleteBooking(event, tenantId);
        }

        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Bookings error:', error);
        const statusCode = error.message === 'Unauthorized' ? 401 : 500;
        return { statusCode, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

async function listBookings(event, tenantId) {
    const { status, startDate, endDate, limit = 50, offset = 0 } = event.queryStringParameters || {};
    const pool = getPool();
    
    let query = `
        SELECT b.*, 
               json_build_object('recordId', p."recordId", 'name', p."name", 'species', p."species") as pet,
               json_build_object('recordId', o."recordId", 'name', o."name", 'email', o."email") as owner
        FROM "Booking" b
        LEFT JOIN "Pet" p ON b."petId" = p."recordId"
        LEFT JOIN "Owner" o ON b."ownerId" = o."recordId"
        WHERE b."tenantId" = $1
    `;
    const params = [tenantId];
    let paramCount = 2;

    if (status) {
        query += ` AND b."status" = $${paramCount}`;
        params.push(status);
        paramCount++;
    }

    if (startDate) {
        query += ` AND b."startDate" >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
    }

    if (endDate) {
        query += ` AND b."endDate" <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
    }

    query += ` ORDER BY b."startDate" DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);
    
    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows)
    };
}

async function createBooking(event, tenantId, user) {
    const body = JSON.parse(event.body);
    const { petId, ownerId, startDate, endDate, status, notes, services, segments } = body;

    const pool = getPool();
    
    // Create booking
    const bookingResult = await pool.query(
        `INSERT INTO "Booking" ("recordId", "tenantId", "petId", "ownerId", "startDate", "endDate", "status", "notes", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()) 
         RETURNING *`,
        [tenantId, petId, ownerId, startDate, endDate, status || 'PENDING', notes]
    );
    
    const booking = bookingResult.rows[0];

    // Create segments if provided
    if (segments && segments.length > 0) {
        for (const segment of segments) {
            await pool.query(
                `INSERT INTO "BookingSegment" ("recordId", "tenantId", "bookingId", "kennelId", "startDate", "endDate", "status", "notes", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
                [tenantId, booking.recordId, segment.kennelId, segment.startDate, segment.endDate, segment.status || 'CONFIRMED', segment.notes]
            );
        }
    }

    // Create services if provided
    if (services && services.length > 0) {
        for (const service of services) {
            await pool.query(
                `INSERT INTO "BookingService" ("recordId", "tenantId", "bookingId", "serviceId", "quantity", "priceCents", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
                [tenantId, booking.recordId, service.serviceId, service.quantity || 1, service.priceCents || 0]
            );
        }
    }

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(booking)
    };
}

async function getBooking(event, tenantId) {
    const { bookingId } = event.pathParameters;
    const pool = getPool();

    const { rows } = await pool.query(
        `SELECT b.*, 
                json_build_object('recordId', p."recordId", 'name', p."name", 'species', p."species") as pet,
                json_build_object('recordId', o."recordId", 'name', o."name", 'email', o."email", 'phone', o."phone") as owner
         FROM "Booking" b
         LEFT JOIN "Pet" p ON b."petId" = p."recordId"
         LEFT JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."recordId" = $1 AND b."tenantId" = $2`,
        [bookingId, tenantId]
    );

    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Booking not found' }) };
    }

    // Get segments
    const segmentsResult = await pool.query(
        `SELECT s.*, json_build_object('recordId', k."recordId", 'name', k."name", 'type', k."type") as kennel
         FROM "BookingSegment" s
         LEFT JOIN "Kennel" k ON s."kennelId" = k."recordId"
         WHERE s."bookingId" = $1 AND s."tenantId" = $2`,
        [bookingId, tenantId]
    );

    // Get services
    const servicesResult = await pool.query(
        `SELECT bs.*, json_build_object('recordId', s."recordId", 'name', s."name", 'category', s."category") as service
         FROM "BookingService" bs
         LEFT JOIN "Service" s ON bs."serviceId" = s."recordId"
         WHERE bs."bookingId" = $1 AND bs."tenantId" = $2`,
        [bookingId, tenantId]
    );

    const booking = {
        ...rows[0],
        segments: segmentsResult.rows,
        services: servicesResult.rows
    };

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(booking)
    };
}

async function updateBooking(event, tenantId) {
    const { bookingId } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { startDate, endDate, status, notes } = body;

    const pool = getPool();

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (startDate !== undefined) {
        fields.push(`"startDate" = $${paramCount++}`);
        values.push(startDate);
    }
    if (endDate !== undefined) {
        fields.push(`"endDate" = $${paramCount++}`);
        values.push(endDate);
    }
    if (status !== undefined) {
        fields.push(`"status" = $${paramCount++}`);
        values.push(status);
    }
    if (notes !== undefined) {
        fields.push(`"notes" = $${paramCount++}`);
        values.push(notes);
    }

    if (fields.length === 0) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'No fields to update' }) };
    }

    fields.push(`"updatedAt" = NOW()`);
    values.push(bookingId, tenantId);

    const query = `UPDATE "Booking" SET ${fields.join(', ')} WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;

    const { rows } = await pool.query(query, values);

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
    const { bookingId } = event.pathParameters;
    const { status } = JSON.parse(event.body);

    if (!status) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Status required' }) };
    }

    const pool = getPool();

    const { rows } = await pool.query(
        `UPDATE "Booking" SET "status" = $1, "updatedAt" = NOW() 
         WHERE "recordId" = $2 AND "tenantId" = $3 
         RETURNING *`,
        [status, bookingId, tenantId]
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

async function checkIn(event, tenantId) {
    const { bookingId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { notes, condition } = body;

    const pool = getPool();

    // Update booking status
    await pool.query(
        `UPDATE "Booking" SET "status" = 'CHECKED_IN', "updatedAt" = NOW() WHERE "recordId" = $1 AND "tenantId" = $2`,
        [bookingId, tenantId]
    );

    // Create check-in record
    const { rows } = await pool.query(
        `INSERT INTO "CheckIn" ("recordId", "tenantId", "bookingId", "notes", "condition", "timestamp", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [tenantId, bookingId, notes, condition]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function checkOut(event, tenantId) {
    const { bookingId } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const { notes, condition, signatureUrl } = body;

    const pool = getPool();

    // Update booking status
    await pool.query(
        `UPDATE "Booking" SET "status" = 'CHECKED_OUT', "updatedAt" = NOW() WHERE "recordId" = $1 AND "tenantId" = $2`,
        [bookingId, tenantId]
    );

    // Create check-out record
    const { rows } = await pool.query(
        `INSERT INTO "CheckOut" ("recordId", "tenantId", "bookingId", "notes", "condition", "signatureUrl", "timestamp", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [tenantId, bookingId, notes, condition, signatureUrl]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function deleteBooking(event, tenantId) {
    const { bookingId } = event.pathParameters;
    const pool = getPool();

    // Delete segments first (foreign key)
    await pool.query(`DELETE FROM "BookingSegment" WHERE "bookingId" = $1 AND "tenantId" = $2`, [bookingId, tenantId]);
    
    // Delete services
    await pool.query(`DELETE FROM "BookingService" WHERE "bookingId" = $1 AND "tenantId" = $2`, [bookingId, tenantId]);

    // Delete booking
    const { rowCount } = await pool.query(
        `DELETE FROM "Booking" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [bookingId, tenantId]
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

