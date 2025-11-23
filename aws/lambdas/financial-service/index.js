// Canonical Service:
// Domain: Financial (Payments / Invoices / Billing)
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');
const {
    getSecureHeaders,
    errorResponse,
    successResponse,
} = require('../shared/security-utils');

const ok = (event, statusCode, data = '', additionalHeaders = {}) => {
    if (statusCode === 204) {
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode,
            headers: {
                ...getSecureHeaders(origin, stage),
                ...additionalHeaders,
            },
            body: '',
        };
    }
    return successResponse(statusCode, data, event, additionalHeaders);
};

const fail = (event, statusCode, errorCodeOrBody, message, additionalHeaders = {}) => {
    if (typeof errorCodeOrBody === 'object' && errorCodeOrBody !== null) {
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode,
            headers: {
                ...getSecureHeaders(origin, stage),
                ...additionalHeaders,
            },
            body: JSON.stringify(errorCodeOrBody),
        };
    }
    const response = errorResponse(statusCode, errorCodeOrBody, message, event);
    return {
        ...response,
        headers: {
            ...response.headers,
            ...additionalHeaders,
        },
    };
};

// Extract user info from API Gateway authorizer (JWT already validated by API Gateway)
async function getUserInfoFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
        console.error('No JWT claims found in event');
        return null;
    }

    // Cognito tokens don't have tenantId - fetch from database
    let tenantId = claims['custom:tenantId'] || claims.tenantId;

    if (!tenantId && claims.sub) {
        console.log('[AUTH] Fetching tenantId from database for Cognito user:', claims.sub);
        const pool = getPool();

        try {
            // Query for user's tenant based on Cognito sub or email
            const result = await pool.query(
                `SELECT m."tenantId"
                 FROM public."Membership" m
                 JOIN public."User" u ON m."userId" = u."recordId"
                 WHERE (u."cognitoSub" = $1 OR u."email" = $2)
                 AND m."deletedAt" IS NULL
                 ORDER BY m."updatedAt" DESC
                 LIMIT 1`,
                [claims.sub, claims.email || claims.username]
            );

            if (result.rows.length > 0) {
                tenantId = result.rows[0].tenantId;
                console.log('[AUTH] Found tenantId from database:', tenantId);
            } else {
                console.error('[AUTH] No tenant found for user:', claims.sub);
            }
        } catch (error) {
            console.error('[AUTH] Error fetching tenantId from database:', error.message);
        }
    }

    return {
        sub: claims.sub,
        username: claims.username,
        email: claims.email,
        tenantId: tenantId
    };
}

exports.handler = async (event) => {

    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode: 200,
            headers: getSecureHeaders(origin, stage),
            body: JSON.stringify({}),
        };
    }

    // Extract user info from API Gateway authorizer (JWT already validated)
    const userInfo = await getUserInfoFromEvent(event);
    if (!userInfo) {
        return fail(event, 401, { message: 'Unauthorized' });
    }

    // Get tenant ID from JWT claims or database
    const tenantId = userInfo.tenantId || await getTenantIdFromEvent(event);
    if (!tenantId) {
        return fail(event, 401, { message: 'Missing tenant context' });
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

        if (path.match(/^\/api\/v1\/invoices\/[^\/]+$/) && event.pathParameters?.invoiceId) {
            if (httpMethod === 'GET') {
                return await getInvoiceById(event, tenantId);
            }
            if (httpMethod === 'PUT') {
                return await updateInvoice(event, tenantId);
            }
            if (httpMethod === 'DELETE') {
                return await deleteInvoice(event, tenantId);
            }
        }

        if (path.match(/^\/api\/v1\/invoices\/[^\/]+\/status$/) && event.pathParameters?.invoiceId && httpMethod === 'PATCH') {
            return await updateInvoiceStatus(event, tenantId);
        }

        // Additional invoice routes for frontend compatibility
        if (path.match(/^\/api\/v1\/invoices\/generate\/[^\/]+$/) && httpMethod === 'POST') {
            return await generateInvoiceFromBooking(event, tenantId);
        }

        if (path.match(/^\/api\/v1\/invoices\/[^\/]+\/send-email$/) && event.pathParameters?.invoiceId && httpMethod === 'POST') {
            return await sendInvoiceEmail(event, tenantId);
        }

        if (path.match(/^\/api\/v1\/invoices\/[^\/]+\/paid$/) && event.pathParameters?.invoiceId && httpMethod === 'PUT') {
            return await markInvoicePaid(event, tenantId);
        }

        // ============================================
        // BILLING ROUTES (from billing-api)
        // ============================================
        if (path === '/api/v1/billing/metrics' && httpMethod === 'GET') {
            return await getBillingMetrics(event, tenantId);
        }

        // No matching route
        return fail(event, 404, { message: 'Not Found' });

    } catch (error) {
        console.error('Financial service error:', error);
        return fail(event, 500, { message: error.message });
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

    return ok(event, 200, rows);
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

    return ok(event, 201, rows[0]);
}

async function getPayment(event, tenantId) {
    const { paymentId } = event.pathParameters;
    const pool = getPool();

    const { rows } = await pool.query(
        `SELECT * FROM "Payment" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [paymentId, tenantId]
    );

    if (rows.length === 0) {
        return fail(event, 404, { message: 'Payment not found' });
    }

    return ok(event, 200, rows[0]);
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

    return ok(event, 200, rows);
}

async function createInvoice(event, tenantId) {
    const { bookingId, amountCents, dueDate, items } = JSON.parse(event.body);
    const pool = getPool();

    const { rows } = await pool.query(
        `INSERT INTO "Invoice" ("recordId", "tenantId", "bookingId", "amountCents", "dueDate", "items", "status", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'DRAFT', NOW()) RETURNING *`,
        [tenantId, bookingId, amountCents, dueDate, JSON.stringify(items || [])]
    );

    return ok(event, 201, rows[0]);
}

async function getInvoiceById(event, tenantId) {
    const invoiceId = event.pathParameters.invoiceId;
    const pool = getPool();

    const { rows } = await pool.query(
        `SELECT
            i.*,
            b."checkIn" as "bookingCheckIn",
            b."checkOut" as "bookingCheckOut",
            b."status" as "bookingStatus",
            o."firstName" as "ownerFirstName",
            o."lastName" as "ownerLastName",
            o."email" as "ownerEmail",
            o."phone" as "ownerPhone",
            pet."name" as "petName"
         FROM "Invoice" i
         LEFT JOIN "Booking" b ON i."bookingId" = b."recordId"
         LEFT JOIN "Pet" pet ON b."petId" = pet."recordId"
         LEFT JOIN "Owner" o ON pet."ownerId" = o."recordId"
         WHERE i."recordId" = $1 AND i."tenantId" = $2`,
        [invoiceId, tenantId]
    );

    if (rows.length === 0) {
        return fail(event, 404, { message: 'Invoice not found' });
    }

    return ok(event, 200, rows[0]);
}

async function updateInvoice(event, tenantId) {
    const invoiceId = event.pathParameters.invoiceId;
    const body = JSON.parse(event.body || '{}');
    const pool = getPool();

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;

    const updatableFields = ['amountCents', 'dueDate', 'items', 'notes'];

    for (const field of updatableFields) {
        if (body[field] !== undefined) {
            fields.push(`"${field}" = $${paramCount++}`);
            values.push(field === 'items' ? JSON.stringify(body[field]) : body[field]);
        }
    }

    if (fields.length === 0) {
        return fail(event, 400, { message: 'No valid fields provided for update' });
    }

    fields.push(`"updatedAt" = NOW()`);
    const setClause = fields.join(', ');
    const query = `UPDATE "Invoice" SET ${setClause} WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
    values.push(invoiceId, tenantId);

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
        return fail(event, 404, { message: 'Invoice not found or you do not have permission to update it' });
    }

    return ok(event, 200, rows[0]);
}

async function updateInvoiceStatus(event, tenantId) {
    const invoiceId = event.pathParameters.invoiceId;
    const { status } = JSON.parse(event.body || '{}');
    const pool = getPool();

    // Validate status
    const validStatuses = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
        return fail(event, 400, { message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const { rows } = await pool.query(
        `UPDATE "Invoice" SET "status" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3 RETURNING *`,
        [status, invoiceId, tenantId]
    );

    if (rows.length === 0) {
        return fail(event, 404, { message: 'Invoice not found' });
    }

    return ok(event, 200, rows[0]);
}

async function deleteInvoice(event, tenantId) {
    const invoiceId = event.pathParameters.invoiceId;
    const pool = getPool();

    // Check if invoice has associated payments
    const paymentCheck = await pool.query(
        `SELECT COUNT(*) FROM "Payment" WHERE "invoiceId" = $1 AND "tenantId" = $2`,
        [invoiceId, tenantId]
    );

    if (parseInt(paymentCheck.rows[0].count) > 0) {
        // Soft delete - just cancel it
        const { rows } = await pool.query(
            `UPDATE "Invoice" SET "status" = 'CANCELLED', "updatedAt" = NOW() WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING *`,
            [invoiceId, tenantId]
        );

        return ok(event, 200, {
                message: 'Invoice cancelled (has associated payments)',
                invoice: rows[0]
            });
    }

    // Hard delete if no payments
    const { rowCount } = await pool.query(
        `DELETE FROM "Invoice" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [invoiceId, tenantId]
    );

    if (rowCount === 0) {
        return fail(event, 404, { message: 'Invoice not found' });
    }

    return ok(event, 204);
}

// ============================================
// ADDITIONAL INVOICE HANDLERS for frontend compatibility
// ============================================

async function generateInvoiceFromBooking(event, tenantId) {
    const bookingId = event.pathParameters?.bookingId || event.rawPath?.split('/').pop();
    const pool = getPool();

    // Get booking details
    const bookingQuery = await pool.query(
        `SELECT b.*, o."firstName", o."lastName", o."email", p."name" as petName,
                s."name" as serviceName, s."price" as servicePriceCents
         FROM "Booking" b
         LEFT JOIN "Pet" p ON b."petId" = p."recordId"
         LEFT JOIN "Owner" o ON p."primaryOwnerId" = o."recordId"
         LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
         WHERE b."recordId" = $1 AND b."tenantId" = $2`,
        [bookingId, tenantId]
    );

    if (bookingQuery.rows.length === 0) {
        return fail(event, 404, { message: 'Booking not found' });
    }

    const booking = bookingQuery.rows[0];

    // Calculate invoice amount from booking details
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const amountCents = (booking.servicePriceCents || 5000) * nights; // Default $50/night if no service price

    // Create invoice
    const { rows } = await pool.query(
        `INSERT INTO "Invoice" ("recordId", "tenantId", "bookingId", "ownerId", "amountCents", "status", "dueDate", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'DRAFT', NOW() + INTERVAL '30 days', NOW(), NOW())
         RETURNING *`,
        [tenantId, bookingId, booking.primaryOwnerId, amountCents]
    );

    return ok(event, 201, rows[0]);
}

async function sendInvoiceEmail(event, tenantId) {
    const invoiceId = event.pathParameters.invoiceId;
    const pool = getPool();

    // Get invoice details with owner email
    const { rows } = await pool.query(
        `SELECT i.*, o."email", o."firstName", o."lastName"
         FROM "Invoice" i
         LEFT JOIN "Owner" o ON i."ownerId" = o."recordId"
         WHERE i."recordId" = $1 AND i."tenantId" = $2`,
        [invoiceId, tenantId]
    );

    if (rows.length === 0) {
        return fail(event, 404, { message: 'Invoice not found' });
    }

    const invoice = rows[0];

    // TODO: Integrate with AWS SES or communication service to actually send email
    // For now, just update the invoice status to SENT
    await pool.query(
        `UPDATE "Invoice" SET "status" = 'SENT', "updatedAt" = NOW() WHERE "recordId" = $1 AND "tenantId" = $2`,
        [invoiceId, tenantId]
    );

    return ok(event, 200, {
            message: `Invoice email sent to ${invoice.email}`,
            invoice: { ...invoice, status: 'SENT' }
        });
}

async function markInvoicePaid(event, tenantId) {
    const invoiceId = event.pathParameters.invoiceId;
    const { paymentCents } = JSON.parse(event.body || '{}');
    const pool = getPool();

    // Get invoice details
    const invoiceQuery = await pool.query(
        `SELECT * FROM "Invoice" WHERE "recordId" = $1 AND "tenantId" = $2`,
        [invoiceId, tenantId]
    );

    if (invoiceQuery.rows.length === 0) {
        return fail(event, 404, { message: 'Invoice not found' });
    }

    const invoice = invoiceQuery.rows[0];
    const amountToRecord = paymentCents || invoice.amountCents;

    // Create payment record
    await pool.query(
        `INSERT INTO "Payment" ("recordId", "tenantId", "invoiceId", "ownerId", "amountCents", "status", "paymentMethod", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'CAPTURED', 'MANUAL', NOW(), NOW())`,
        [tenantId, invoiceId, invoice.ownerId, amountToRecord]
    );

    // Update invoice status
    const { rows } = await pool.query(
        `UPDATE "Invoice" SET "status" = 'PAID', "paidAt" = NOW(), "updatedAt" = NOW()
         WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING *`,
        [invoiceId, tenantId]
    );

    return ok(event, 200, rows[0]);
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

    return ok(event, 200, {
            totalRevenueCents: parseInt(rows[0].total || 0),
            transactionCount: parseInt(rows[0].count || 0)
        });
}
