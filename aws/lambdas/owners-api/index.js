const { getPool } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
};

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = event.headers['x-tenant-id'];

    if (!tenantId) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing x-tenant-id' }) };
    }

    try {
        if (httpMethod === 'GET' && (path === '/api/v1/owners' || path.endsWith('/owners'))) {
            return await listOwners(event, tenantId);
        }
        if (httpMethod === 'POST' && (path === '/api/v1/owners' || path.endsWith('/owners'))) {
            return await createOwner(event, tenantId);
        }
        if (httpMethod === 'GET' && event.pathParameters?.ownerId) {
            return await getOwner(event, tenantId);
        }
        if (httpMethod === 'PUT' && event.pathParameters?.ownerId) {
            return await updateOwner(event, tenantId);
        }
        if (httpMethod === 'DELETE' && event.pathParameters?.ownerId) {
            return await deleteOwner(event, tenantId);
        }

        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Owners error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

async function listOwners(event, tenantId) {
    const { search, limit = 50, offset = 0 } = event.queryStringParameters || {};
    const pool = getPool();

    const params = [tenantId];
    let whereClause = `WHERE o."tenantId" = $1`;
    if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND (o."name" ILIKE $${params.length} OR o."email" ILIKE $${params.length})`;
    }
    params.push(parseInt(limit), parseInt(offset));

    const query = `
        SELECT
            o.*,
            COALESCE(bk.total_bookings, 0)  AS "totalBookings",
            bk.last_booking                AS "lastBooking",
            COALESCE(pay.total_paid, 0)    AS "lifetimeValue",
            COALESCE(pets.pet_names, ARRAY[]::text[]) AS "petNames"
        FROM "Owner" o
        LEFT JOIN (
            SELECT "ownerId", COUNT(*) AS total_bookings, MAX("checkIn") AS last_booking
            FROM "Booking"
            GROUP BY "ownerId"
        ) bk ON bk."ownerId" = o."recordId"
        LEFT JOIN (
            SELECT "ownerId", SUM("amountCents") AS total_paid
            FROM "Payment"
            WHERE "status" IN ('CAPTURED','SUCCESSFUL')
            GROUP BY "ownerId"
        ) pay ON pay."ownerId" = o."recordId"
        LEFT JOIN (
            SELECT po."ownerId", array_agg(p."name" ORDER BY p."name") AS pet_names
            FROM "PetOwner" po
            JOIN "Pet" p ON p."recordId" = po."petId"
            GROUP BY po."ownerId"
        ) pets ON pets."ownerId" = o."recordId"
        ${whereClause}
        ORDER BY o."name" ASC
        LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await pool.query(query, params);

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
}

async function createOwner(event, tenantId) {
    const { name, email, phone, address, emergencyContact, notes } = JSON.parse(event.body);

    if (!name) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Name is required' }) };
    }

    const pool = getPool();

    const { rows } = await pool.query(
        `INSERT INTO "Owner" ("recordId", "tenantId", "name", "email", "phone", "address", "emergencyContact", "notes", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [tenantId, name, email, phone, address, emergencyContact, notes]
    );

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function getOwner(event, tenantId) {
    const { ownerId } = event.pathParameters;
    const pool = getPool();

    // Get owner
    const { rows } = await pool.query(
        `SELECT * FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [ownerId, tenantId]
    );

    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Owner not found' }) };
    }

    const owner = rows[0];

    // Get pets
    const petsResult = await pool.query(
        `SELECT p.* FROM "Pet" p
         INNER JOIN "PetOwner" po ON p."recordId" = po."petId"
         WHERE po."ownerId" = $1 AND p."tenantId" = $2`,
        [ownerId, tenantId]
    );

    owner.pets = petsResult.rows;

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(owner)
    };
}

async function updateOwner(event, tenantId) {
    const { ownerId } = event.pathParameters;
    const body = JSON.parse(event.body);

    const fields = [];
    const values = [];
    let paramCount = 1;

    const updatableFields = ['name', 'email', 'phone', 'address', 'emergencyContact', 'notes'];
    
    for (const field of updatableFields) {
        if (body[field] !== undefined) {
            fields.push(`"${field}" = $${paramCount++}`);
            values.push(body[field]);
        }
    }

    if (fields.length === 0) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'No fields to update' }) };
    }

    fields.push(`"updatedAt" = NOW()`);
    values.push(ownerId, tenantId);

    const pool = getPool();
    const query = `UPDATE "Owner" SET ${fields.join(', ')} WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Owner not found' }) };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

async function deleteOwner(event, tenantId) {
    const { ownerId } = event.pathParameters;
    const pool = getPool();

    const { rowCount } = await pool.query(
        `DELETE FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [ownerId, tenantId]
    );

    if (rowCount === 0) {
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Owner not found' }) };
    }

    return {
        statusCode: 204,
        headers: HEADERS,
        body: ''
    };
}

