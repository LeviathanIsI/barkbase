// TODO (Decommission Phase):
// This Lambda is legacy. Its functionality has been superseded by entity-service (pets/owners/staff).
// Do NOT add new endpoints or business logic here.
// This Lambda will be retired in a future decommission phase once all callers are migrated.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
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
        // Owner routes
        if (httpMethod === 'GET' && path === '/api/v1/owners') {
            return await listOwners(event, tenantId);
        }
        if (httpMethod === 'POST' && path === '/api/v1/owners') {
            return await createOwner(event, tenantId);
        }
        if (httpMethod === 'GET' && event.pathParameters?.id) {
            return await getOwnerById(event, tenantId);
        }
        if (httpMethod === 'PUT' && event.pathParameters?.id) {
            return await updateOwner(event, tenantId);
        }
        if (httpMethod === 'DELETE' && event.pathParameters?.id) {
            return await deleteOwner(event, tenantId);
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

/**
 * SECURITY FIX: List owners with input validation
 * Prevents ReDoS attacks and SQL injection attempts
 *
 * @param {Object} event - Lambda event
 * @param {string} tenantId - Validated tenant ID from JWT
 * @returns {Object} Lambda response
 */
async function listOwners(event, tenantId) {
    const pool = getPool();
    const { search, limit = '50', offset = '0' } = event.queryStringParameters || {};

    // INPUT VALIDATION: Validate and sanitize pagination parameters
    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Invalid limit parameter. Must be between 1 and 200.' }),
        };
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Invalid offset parameter. Must be non-negative.' }),
        };
    }

    let query = `
        SELECT o.*,
               COUNT(DISTINCT po."petId") as "petCount",
               array_agg(
                   DISTINCT jsonb_build_object(
                       'recordId', p."recordId",
                       'name', p."name",
                       'species', p."species",
                       'breed', p."breed"
                   )
               ) FILTER (WHERE p."recordId" IS NOT NULL) as pets
        FROM "Owner" o
        LEFT JOIN "PetOwner" po ON o."recordId" = po."ownerId"
        LEFT JOIN "Pet" p ON po."petId" = p."recordId"
        WHERE o."tenantId" = $1`;

    const params = [tenantId];

    if (search) {
        // INPUT VALIDATION: Sanitize search input
        // 1. Limit length to prevent DoS
        if (search.length > 100) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: 'Search query too long. Maximum 100 characters.' }),
            };
        }

        // 2. Validate character set (alphanumeric, spaces, common punctuation only)
        const safeSearchRegex = /^[a-zA-Z0-9\s\-_@.]+$/;
        if (!safeSearchRegex.test(search)) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: 'Search query contains invalid characters.' }),
            };
        }

        // 3. Escape ILIKE special characters to prevent pattern injection
        const escapedSearch = search
            .replace(/\\/g, '\\\\')  // Escape backslashes first
            .replace(/%/g, '\\%')     // Escape percent signs
            .replace(/_/g, '\\_');    // Escape underscores

        query += ` AND (
            o."firstName" ILIKE $${params.length + 1} OR
            o."lastName" ILIKE $${params.length + 1} OR
            o."email" ILIKE $${params.length + 1} OR
            o."phone" ILIKE $${params.length + 1}
        )`;
        params.push(`%${escapedSearch}%`);
    }

    query += ` GROUP BY o."recordId"`;
    query += ` ORDER BY o."lastName", o."firstName"`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parsedLimit, parsedOffset);

    // Add query timeout to prevent long-running queries
    try {
        const result = await pool.query(query, params);

        const owners = result.rows.map(row => ({
            ...row,
            name: `${row.firstName} ${row.lastName}`.trim(),
            pets: row.pets || []
        }));

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify(owners),
        };
    } catch (error) {
        console.error('[OWNERS] Query error:', error.message);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
}

async function createOwner(event, tenantId) {
    const pool = getPool();
    const {
        firstName,
        lastName,
        email,
        phone,
        address,
        emergencyContact,
        emergencyPhone,
        notes
    } = JSON.parse(event.body || '{}');

    if (!firstName || !lastName) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'First name and last name are required' }),
        };
    }

    const result = await pool.query(
        `INSERT INTO "Owner" (
            "recordId", "tenantId", "firstName", "lastName", 
            "email", "phone", "address", "emergencyContact", 
            "emergencyPhone", "notes"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *`,
        [
            tenantId, firstName, lastName, email, phone,
            address, emergencyContact, emergencyPhone, notes
        ]
    );

    const owner = result.rows[0];
    owner.name = `${owner.firstName} ${owner.lastName}`.trim();
    owner.pets = [];
    owner.petCount = 0;

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(owner),
    };
}

async function getOwnerById(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;

    // Get owner with pets
    const ownerResult = await pool.query(
        `SELECT o.*, 
                array_agg(
                    DISTINCT jsonb_build_object(
                        'recordId', p."recordId",
                        'name', p."name",
                        'species', p."species",
                        'breed', p."breed",
                        'status', p."status",
                        'photoUrl', p."photoUrl"
                    )
                ) FILTER (WHERE p."recordId" IS NOT NULL) as pets
         FROM "Owner" o
         LEFT JOIN "PetOwner" po ON o."recordId" = po."ownerId"
         LEFT JOIN "Pet" p ON po."petId" = p."recordId" AND p."tenantId" = $1
         WHERE o."recordId" = $2 AND o."tenantId" = $1
         GROUP BY o."recordId"`,
        [tenantId, id]
    );

    if (ownerResult.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Owner not found' }),
        };
    }

    const owner = ownerResult.rows[0];
    owner.name = `${owner.firstName} ${owner.lastName}`.trim();
    owner.pets = owner.pets || [];
    owner.petCount = owner.pets.length;

    // Get recent bookings for this owner
    const bookingsResult = await pool.query(
        `SELECT b."recordId", b."status", b."checkIn", b."checkOut",
                p."name" as "petName", s."name" as "serviceName"
         FROM "Booking" b
         LEFT JOIN "Pet" p ON b."petId" = p."recordId"
         LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
         WHERE b."ownerId" = $1 AND b."tenantId" = $2
         ORDER BY b."checkIn" DESC
         LIMIT 5`,
        [id, tenantId]
    );

    owner.recentBookings = bookingsResult.rows;

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(owner),
    };
}

async function updateOwner(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;
    const updates = JSON.parse(event.body || '{}');

    // Check if owner exists
    const checkResult = await pool.query(
        'SELECT "recordId" FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2',
        [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Owner not found' }),
        };
    }

    // Build dynamic update query
    const allowedFields = [
        'firstName', 'lastName', 'email', 'phone', 
        'address', 'emergencyContact', 'emergencyPhone', 'notes'
    ];
    
    const updateFields = [];
    const values = [];
    let paramCount = 2; // Starting after $1 (id) and $2 (tenantId)

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
            updateFields.push(`"${key}" = $${++paramCount}`);
            values.push(updates[key]);
        }
    });

    if (updateFields.length === 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'No valid fields to update' }),
        };
    }

    const updateQuery = `
        UPDATE "Owner" 
        SET ${updateFields.join(', ')}
        WHERE "recordId" = $1 AND "tenantId" = $2
        RETURNING *
    `;

    const result = await pool.query(updateQuery, [id, tenantId, ...values]);
    const owner = result.rows[0];
    owner.name = `${owner.firstName} ${owner.lastName}`.trim();

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(owner),
    };
}

async function deleteOwner(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;

    // Check if owner has active bookings
    const bookingCheck = await pool.query(
        `SELECT COUNT(*) FROM "Booking" 
         WHERE "ownerId" = $1 AND "tenantId" = $2 
         AND "status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')`,
        [id, tenantId]
    );

    if (parseInt(bookingCheck.rows[0].count) > 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ 
                message: 'Cannot delete owner with active bookings' 
            }),
        };
    }

    const result = await pool.query(
        'DELETE FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING "recordId"',
        [id, tenantId]
    );

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Owner not found' }),
        };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ message: 'Owner deleted successfully' }),
    };
}