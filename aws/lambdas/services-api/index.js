const { getPool, getTenantIdFromEvent, getJWTValidator } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
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
        // Service routes
        if (httpMethod === 'GET' && path === '/api/v1/services') {
            return await listServices(event, tenantId);
        }
        if (httpMethod === 'POST' && path === '/api/v1/services') {
            return await createService(event, tenantId, userInfo);
        }
        if (httpMethod === 'GET' && event.pathParameters?.id) {
            return await getServiceById(event, tenantId);
        }
        if (httpMethod === 'PUT' && event.pathParameters?.id) {
            return await updateService(event, tenantId, userInfo);
        }
        if (httpMethod === 'DELETE' && event.pathParameters?.id) {
            return await deleteService(event, tenantId, userInfo);
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

async function listServices(event, tenantId) {
    const pool = getPool();
    const { category, isActive } = event.queryStringParameters || {};

    let query = `
        SELECT s.*,
               COUNT(DISTINCT b."recordId") as "bookingCount"
        FROM "Service" s
        LEFT JOIN "Booking" b ON s."recordId" = b."serviceId" AND b."tenantId" = $1
        WHERE s."tenantId" = $1`;
    
    const params = [tenantId];
    
    if (category) {
        query += ` AND s."category" = $${params.length + 1}`;
        params.push(category);
    }
    
    if (isActive !== undefined) {
        query += ` AND s."isActive" = $${params.length + 1}`;
        params.push(isActive === 'true');
    }
    
    query += ` GROUP BY s."recordId"`;
    query += ` ORDER BY s."category", s."name"`;

    const result = await pool.query(query, params);
    
    const services = result.rows.map(row => ({
        ...row,
        price: row.priceInCents / 100,
        bookingCount: parseInt(row.bookingCount)
    }));

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(services),
    };
}

async function createService(event, tenantId, userInfo) {
    const pool = getPool();
    const {
        name,
        category,
        description,
        priceInCents,
        duration,
        isActive = true,
        settings = {}
    } = JSON.parse(event.body || '{}');

    if (!name || !category || priceInCents === undefined) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Name, category, and priceInCents are required' }),
        };
    }

    // Validate role - only OWNER or ADMIN can create services
    if (!['OWNER', 'ADMIN'].includes(userInfo.role)) {
        return {
            statusCode: 403,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Insufficient permissions' }),
        };
    }

    const result = await pool.query(
        `INSERT INTO "Service" (
            "recordId", "tenantId", "name", "category", 
            "description", "priceInCents", "duration", 
            "isActive", "settings"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *`,
        [
            tenantId, name, category, description,
            priceInCents, duration, isActive,
            JSON.stringify(settings)
        ]
    );

    const service = result.rows[0];
    service.price = service.priceInCents / 100;

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(service),
    };
}

async function getServiceById(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;

    const result = await pool.query(
        `SELECT s.*,
                COUNT(DISTINCT b."recordId") as "bookingCount",
                SUM(b."totalPriceInCents") as "totalRevenueCents"
         FROM "Service" s
         LEFT JOIN "Booking" b ON s."recordId" = b."serviceId" 
            AND b."tenantId" = $1
            AND b."status" IN ('COMPLETED', 'CHECKED_IN')
         WHERE s."recordId" = $2 AND s."tenantId" = $1
         GROUP BY s."recordId"`,
        [tenantId, id]
    );

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Service not found' }),
        };
    }

    const service = result.rows[0];
    service.price = service.priceInCents / 100;
    service.bookingCount = parseInt(service.bookingCount);
    service.totalRevenue = (service.totalRevenueCents || 0) / 100;

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(service),
    };
}

async function updateService(event, tenantId, userInfo) {
    const pool = getPool();
    const { id } = event.pathParameters;
    const updates = JSON.parse(event.body || '{}');

    // Validate role - only OWNER or ADMIN can update services
    if (!['OWNER', 'ADMIN'].includes(userInfo.role)) {
        return {
            statusCode: 403,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Insufficient permissions' }),
        };
    }

    // Check if service exists
    const checkResult = await pool.query(
        'SELECT "recordId" FROM "Service" WHERE "recordId" = $1 AND "tenantId" = $2',
        [id, tenantId]
    );

    if (checkResult.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Service not found' }),
        };
    }

    // Build dynamic update query
    const allowedFields = [
        'name', 'category', 'description', 'priceInCents', 
        'duration', 'isActive', 'settings'
    ];
    
    const updateFields = [];
    const values = [];
    let paramCount = 3; // Starting after id and tenantId

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
            updateFields.push(`"${key}" = $${paramCount++}`);
            values.push(key === 'settings' ? JSON.stringify(updates[key]) : updates[key]);
        }
    });

    if (updateFields.length === 0) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'No valid fields to update' }),
        };
    }

    updateFields.push(`"updatedAt" = NOW()`);

    const updateQuery = `
        UPDATE "Service" 
        SET ${updateFields.join(', ')}
        WHERE "recordId" = $1 AND "tenantId" = $2
        RETURNING *
    `;

    const result = await pool.query(updateQuery, [id, tenantId, ...values]);
    const service = result.rows[0];
    service.price = service.priceInCents / 100;

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(service),
    };
}

async function deleteService(event, tenantId, userInfo) {
    const pool = getPool();
    const { id } = event.pathParameters;

    // Validate role - only OWNER can delete services
    if (userInfo.role !== 'OWNER') {
        return {
            statusCode: 403,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Only owners can delete services' }),
        };
    }

    // Check if service is used in any bookings
    const bookingCheck = await pool.query(
        'SELECT COUNT(*) FROM "Booking" WHERE "serviceId" = $1 AND "tenantId" = $2',
        [id, tenantId]
    );

    if (parseInt(bookingCheck.rows[0].count) > 0) {
        // Soft delete - just deactivate it
        await pool.query(
            'UPDATE "Service" SET "isActive" = false, "updatedAt" = NOW() WHERE "recordId" = $1 AND "tenantId" = $2',
            [id, tenantId]
        );
        
        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({ 
                message: 'Service deactivated (has existing bookings)' 
            }),
        };
    }

    // Hard delete if no bookings
    const result = await pool.query(
        'DELETE FROM "Service" WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING "recordId"',
        [id, tenantId]
    );

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Service not found' }),
        };
    }

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ message: 'Service deleted successfully' }),
    };
}