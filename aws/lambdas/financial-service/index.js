const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

// Unified CORS headers (superset of all 3 original Lambdas)
const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PATCH'
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

    // Handle CORS preflight
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
        // ============================================
        // PAYMENTS ROUTES (from payments-api)
        // ============================================
        if (path === '/api/v1/payments') {
            if (httpMethod === 'GET') {
                return await listPayments(event, tenantId);
            }
            if (httpMethod === 'POST') {
                return await createPayment(event, tenantId);
            }
        }

        if (path.match(/^\/api\/v1\/payments\/[^\/]+$/) && event.pathParameters?.paymentId) {
            if (httpMethod === 'GET') {
                return await getPayment(event, tenantId);
            }
        }

        // ============================================
        // INVOICES ROUTES (from invoices-api)
        // ============================================
        if (path === '/api/v1/invoices') {
            if (httpMethod === 'GET') {
                return await listInvoices(event, tenantId);
            }
            if (httpMethod === 'POST') {
                return await createInvoice(event, tenantId);
            }
        }

        // ============================================
        // BILLING ROUTES (from billing-api)
        // ============================================
        if (path === '/api/v1/billing/metrics' && httpMethod === 'GET') {
            return await getBillingMetrics(event, tenantId);
        }

        // No matching route
        return {
            statusCode: 404,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Not Found' })
        };

    } catch (error) {
        console.error('Financial service error:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: error.message })
        };
    }
};

// ============================================
// PAYMENT HANDLERS (from payments-api)
// ============================================

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

// ============================================
// INVOICE HANDLERS (from invoices-api)
// ============================================

async function listInvoices(event, tenantId) {
    const pool = getPool();

    const { rows } = await pool.query(
        `SELECT * FROM "Invoice" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC`,
        [tenantId]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows)
    };
}

async function createInvoice(event, tenantId) {
    const { bookingId, amountCents, dueDate, items } = JSON.parse(event.body);
    const pool = getPool();

    const { rows } = await pool.query(
        `INSERT INTO "Invoice" ("recordId", "tenantId", "bookingId", "amountCents", "dueDate", "items", "status", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'DRAFT', NOW()) RETURNING *`,
        [tenantId, bookingId, amountCents, dueDate, JSON.stringify(items || [])]
    );

    return {
        statusCode: 201,
        headers: HEADERS,
        body: JSON.stringify(rows[0])
    };
}

// ============================================
// BILLING HANDLERS (from billing-api)
// ============================================

async function getBillingMetrics(event, tenantId) {
    const pool = getPool();

    // Get billing metrics for last 30 days
    const { rows } = await pool.query(
        `SELECT SUM("amountCents") as total, COUNT(*) as count
         FROM "Payment"
         WHERE "tenantId" = $1 AND "status" = 'CAPTURED' AND "createdAt" >= NOW() - INTERVAL '30 days'`,
        [tenantId]
    );

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
            totalRevenueCents: parseInt(rows[0].total || 0),
            transactionCount: parseInt(rows[0].count || 0)
        })
    };
}
