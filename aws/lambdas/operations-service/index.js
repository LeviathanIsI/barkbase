// Canonical Service:
// Domain: Bookings / Runs / Check-Ins / Kennels
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

const { getPool, getTenantIdFromEvent, getJWTValidator } = require('/opt/nodejs');
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

// Enhanced authorization with fallback JWT validation
async function getUserInfoFromEvent(event) {
    // First, try to get claims from API Gateway JWT authorizer
    const claims = event?.requestContext?.authorizer?.jwt?.claims;

    if (claims) {
        console.log('[AUTH] Using API Gateway JWT claims');

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
                    [claims.sub, claims.email || claims['cognito:username']]
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
            username: claims.username || claims['cognito:username'],
            email: claims.email,
            tenantId: tenantId,
            userId: claims.sub,
            role: claims['custom:role'] || 'USER'
        };
    }

    // Fallback: Manual JWT validation
    console.log('[AUTH] No API Gateway claims found, falling back to manual JWT validation');

    try {
        const authHeader = event?.headers?.Authorization || event?.headers?.authorization;

        if (!authHeader) {
            console.error('[AUTH] No Authorization header found');
            return null;
        }

        const jwtValidator = getJWTValidator();
        const userInfo = await jwtValidator.validateRequest(event);

        if (!userInfo) {
            console.error('[AUTH] JWT validation failed');
            return null;
        }

        console.log('[AUTH] Manual JWT validation successful');

        const tenantId = userInfo.tenantId || userInfo['custom:tenantId'] || await getTenantIdFromEvent(event);

        return {
            sub: userInfo.sub,
            username: userInfo.username || userInfo['cognito:username'],
            email: userInfo.email,
            tenantId: tenantId,
            userId: userInfo.sub,
            role: userInfo.role || userInfo['custom:role'] || 'USER'
        };
    } catch (error) {
        console.error('[AUTH] Manual JWT validation error:', error.message);
        return null;
    }
}

exports.handler = async (event) => {
    // Debug logging to see actual event structure
    console.log('[DEBUG] Full event:', JSON.stringify(event, null, 2));
    console.log('[DEBUG] requestContext:', JSON.stringify(event.requestContext, null, 2));
    console.log('[DEBUG] headers:', JSON.stringify(event.headers, null, 2));

    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const path = event.requestContext?.http?.path || event.path;

    if (httpMethod === 'OPTIONS') {
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode: 200,
            headers: getSecureHeaders(origin, stage),
            body: JSON.stringify({}),
        };
    }

    // Extract user info from API Gateway authorizer with fallback to manual JWT validation
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
        // ===== BOOKINGS ROUTES =====
        if (path.startsWith('/api/v1/bookings')) {
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
        }

        // ===== RUNS ROUTES =====
        if (path.startsWith('/api/v1/runs') || path.includes('/run-templates')) {
            // RUN TEMPLATE ENDPOINTS
            if (httpMethod === 'GET' && path.includes('/run-templates') && !event.pathParameters?.id) {
                return await listRunTemplates(event, tenantId);
            }
            if (httpMethod === 'POST' && path.includes('/run-templates')) {
                return await createRunTemplate(event, tenantId);
            }
            if (httpMethod === 'PUT' && path.includes('/run-templates') && event.pathParameters?.id) {
                return await updateRunTemplate(event, tenantId);
            }
            if (httpMethod === 'DELETE' && path.includes('/run-templates') && event.pathParameters?.id) {
                return await deleteRunTemplate(event, tenantId);
            }

            // RUN ENDPOINTS
            if (httpMethod === 'GET' && path.includes('/available-slots') && event.pathParameters?.runId) {
                return await getAvailableSlots(event, tenantId);
            }
            if (httpMethod === 'GET' && path.includes('/assignments')) {
                return await getRunAssignments(event, tenantId);
            }
            if (httpMethod === 'GET' && !path.includes('/assignments') && !path.includes('/available-slots') && !path.includes('/run-templates')) {
                return await listRuns(event, tenantId);
            }
            if (httpMethod === 'POST' && !path.includes('/run-templates')) {
                return await createRun(event, tenantId);
            }
            if (httpMethod === 'PUT' && event.pathParameters?.runId) {
                return await updateRun(event, tenantId);
            }
        }

        // ===== CHECK-IN ROUTES =====
        if (path.startsWith('/api/v1/check-ins')) {
            if (httpMethod === 'POST' && path === '/api/v1/check-ins') {
                return await createCheckIn(event, tenantId, userInfo);
            }
            if (httpMethod === 'GET' && path === '/api/v1/check-ins') {
                return await listCheckIns(event, tenantId);
            }
            if (httpMethod === 'GET' && event.pathParameters?.id) {
                return await getCheckIn(event, tenantId);
            }
        }

        // ===== CHECK-OUT ROUTES =====
        if (path.startsWith('/api/v1/check-outs')) {
            if (httpMethod === 'POST' && path === '/api/v1/check-outs') {
                return await createCheckOut(event, tenantId, userInfo);
            }
            if (httpMethod === 'GET' && path === '/api/v1/check-outs') {
                return await listCheckOuts(event, tenantId);
            }
            if (httpMethod === 'GET' && event.pathParameters?.id) {
                return await getCheckOutDetail(event, tenantId);
            }
        }

        // ===== KENNELS ROUTES =====
        if (path.startsWith('/api/v1/kennels')) {
            if (httpMethod === 'GET' && path.includes('/occupancy')) {
                return await getKennelOccupancy(event, tenantId);
            }
            if (httpMethod === 'GET' && (path === '/api/v1/kennels' || path.endsWith('/kennels'))) {
                return await listKennels(event, tenantId);
            }
            if (httpMethod === 'POST' && path === '/api/v1/kennels') {
                return await createKennel(event, tenantId);
            }
            if (httpMethod === 'GET' && event.pathParameters?.kennelId) {
                return await getKennel(event, tenantId);
            }
            if (httpMethod === 'PUT' && event.pathParameters?.kennelId) {
                return await updateKennel(event, tenantId);
            }
            if (httpMethod === 'DELETE' && event.pathParameters?.kennelId) {
                return await deleteKennel(event, tenantId);
            }
        }

        return fail(event, 404, { message: 'Not Found' });
    } catch (error) {
        console.error('Operations service error:', error);
        return fail(event, 500, { message: 'Internal Server Error', error: error.message });
    }
};

// ===== BOOKINGS HANDLERS =====

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
                   'dietaryNotes', p."dietaryNotes"
               ) as pet,
               json_build_object(
                   'recordId', o."recordId",
                   'firstName', o."firstName",
                   'lastName', o."lastName",
                   'email', o."email",
                   'phone', o."phone"
               ) as owner
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

    query += ` GROUP BY b."recordId", p."recordId", o."recordId"`;
    query += ` ORDER BY b."checkIn" DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);

    return ok(event, 200, rows);
}

async function createBooking(event, tenantId, userInfo) {
    const body = JSON.parse(event.body || '{}');
    const {
        petId,
        ownerId,
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
        return fail(event, 400, { message: 'Missing required fields: petId, ownerId, checkIn, checkOut' });
    }

    // Create booking
    const bookingResult = await pool.query(
        `INSERT INTO "Booking" (
            "recordId", "tenantId", "petId", "ownerId", "status",
            "checkIn", "checkOut",
            "totalPriceInCents", "depositInCents", "balanceDueInCents",
            "notes", "specialRequirements", "createdAt", "updatedAt"
         ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
         ) RETURNING *`,
        [
            tenantId, petId, ownerId, 'PENDING', checkIn, checkOut,
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

    return ok(event, 201, booking);
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
                ) as owner
         FROM "Booking" b
         LEFT JOIN "Pet" p ON b."petId" = p."recordId"
         LEFT JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."recordId" = $1 AND b."tenantId" = $2`,
        [id, tenantId]
    );

    if (rows.length === 0) {
        return fail(event, 404, { message: 'Booking not found' });
    }

    const booking = rows[0];

    return ok(event, 200, booking);
}

async function updateBooking(event, tenantId) {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body || '{}');
    const {
        checkIn,
        checkOut,
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
        return fail(event, 400, { message: 'No fields to update' });
    }

    fields.push(`"updatedAt" = NOW()`);

    const query = `UPDATE "Booking" SET ${fields.join(', ')} WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING *`;
    const queryParams = [id, tenantId, ...values];

    const { rows } = await pool.query(query, queryParams);

    if (rows.length === 0) {
        return fail(event, 404, { message: 'Booking not found' });
    }

    return ok(event, 200, rows[0]);
}

async function updateBookingStatus(event, tenantId) {
    const { id } = event.pathParameters;
    const { status } = JSON.parse(event.body || '{}');

    if (!status) {
        return fail(event, 400, { message: 'Status required' });
    }

    const pool = getPool();

    const { rows } = await pool.query(
        `UPDATE "Booking" SET "status" = $1, "updatedAt" = NOW()
         WHERE "recordId" = $2 AND "tenantId" = $3
         RETURNING *`,
        [status, id, tenantId]
    );

    if (rows.length === 0) {
        return fail(event, 404, { message: 'Booking not found' });
    }

    return ok(event, 200, rows[0]);
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

    return ok(event, 200, rows[0]);
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

    return ok(event, 200, rows[0]);
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
        return fail(event, 404, { message: 'Booking not found' });
    }

    const status = checkResult.rows[0].status;
    if (status === 'CHECKED_IN' || status === 'COMPLETED') {
        return fail(event, 400, { message: 'Cannot delete booking that has been checked in' });
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
        return fail(event, 404, { message: 'Booking not found' });
    }

    return ok(event, 204);
}

// ===== RUNS HANDLERS =====

async function listRunTemplates(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(
        `SELECT * FROM "RunTemplate" WHERE "tenantId" = $1 AND "isActive" = true ORDER BY "name"`,
        [tenantId]
    );
    return ok(event, 200, rows);
}

async function createRunTemplate(event, tenantId) {
    const { name, timePeriodMinutes, capacityType, maxCapacity } = JSON.parse(event.body);
    const pool = getPool();
    const { rows } = await pool.query(
        `INSERT INTO "RunTemplate" ("recordId", "tenantId", "name", "timePeriodMinutes", "capacityType", "maxCapacity", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [tenantId, name, timePeriodMinutes || 30, capacityType || 'total', maxCapacity || 10]
    );
    return ok(event, 201, rows[0]);
}

async function updateRunTemplate(event, tenantId) {
    const { name, timePeriodMinutes, capacityType, maxCapacity } = JSON.parse(event.body);
    const pool = getPool();
    const { rows } = await pool.query(
        `UPDATE "RunTemplate"
         SET "name" = COALESCE($1, "name"),
             "timePeriodMinutes" = COALESCE($2, "timePeriodMinutes"),
             "capacityType" = COALESCE($3, "capacityType"),
             "maxCapacity" = COALESCE($4, "maxCapacity"),
             "updatedAt" = NOW()
         WHERE "recordId" = $5 AND "tenantId" = $6
         RETURNING *`,
        [name, timePeriodMinutes, capacityType, maxCapacity, event.pathParameters.id, tenantId]
    );
    if (rows.length === 0) {
        return fail(event, 404, { message: 'Template not found' });
    }
    return ok(event, 200, rows[0]);
}

async function deleteRunTemplate(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(
        `UPDATE "RunTemplate" SET "isActive" = false, "updatedAt" = NOW()
         WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING *`,
        [event.pathParameters.id, tenantId]
    );
    if (rows.length === 0) {
        return fail(event, 404, { message: 'Template not found' });
    }
    return ok(event, 200, { message: 'Template deleted' });
}

async function getAvailableSlots(event, tenantId) {
    const { date } = event.queryStringParameters || {};
    const dateStr = date || new Date().toISOString().split('T')[0];
    const pool = getPool();

    // Get the run to find its template
    const { rows: runRows } = await pool.query(
        `SELECT r.*, rt."timePeriodMinutes", rt."capacityType", rt."maxCapacity"
         FROM "Run" r
         LEFT JOIN "RunTemplate" rt ON r."templateId" = rt."recordId"
         WHERE r."recordId" = $1 AND r."tenantId" = $2`,
        [event.pathParameters.runId, tenantId]
    );

    if (runRows.length === 0) {
        return fail(event, 404, { message: 'Run not found' });
    }

    const run = runRows[0];
    const timePeriod = run.timePeriodMinutes || 30;
    const capacityType = run.capacityType || 'total';
    const maxCapacity = run.maxCapacity || run.capacity || 10;
    const assignments = run.assignedPets || [];

    // Generate all possible slots from 07:00 to 20:00
    const slots = [];
    for (let hour = 7; hour < 20; hour++) {
        for (let minute = 0; minute < 60; minute += timePeriod) {
            const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const endMinute = minute + timePeriod;
            const endHour = hour + Math.floor(endMinute / 60);
            const endMin = endMinute % 60;
            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

            if (endHour >= 20) break;

            // Count pets in this slot if capacityType is concurrent
            let occupied = 0;
            if (capacityType === 'concurrent') {
                occupied = assignments.filter(a => {
                    return a.startTime < endTime && a.endTime > startTime;
                }).length;
            } else {
                occupied = assignments.length;
            }

            slots.push({
                startTime,
                endTime,
                available: occupied < maxCapacity,
                occupied
            });
        }
    }

    return ok(event, 200, slots);
}

async function getRunAssignments(event, tenantId) {
    const { date } = event.queryStringParameters || {};
    const dateStr = date || new Date().toISOString().split('T')[0];
    const pool = getPool();

    // First, check if runs exist for this date, if not, create from templates
    const { rows: existingRuns } = await pool.query(
        `SELECT COUNT(*) as count FROM "Run" WHERE "tenantId" = $1 AND DATE("date") = $2`,
        [tenantId, dateStr]
    );

    if (parseInt(existingRuns[0].count) === 0) {
        // No runs exist for this date, create from active templates
        const { rows: templates } = await pool.query(
            `SELECT * FROM "RunTemplate" WHERE "tenantId" = $1 AND "isActive" = true ORDER BY "name"`,
            [tenantId]
        );

        if (templates.length > 0) {
            // Insert runs based on templates
            const insertPromises = templates.map(template =>
                pool.query(
                    `INSERT INTO "Run" ("recordId", "tenantId", "templateId", "name", "date", "capacity", "assignedPets", "updatedAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, '[]'::jsonb, NOW())`,
                    [tenantId, template.recordId, template.name, dateStr, template.maxCapacity]
                )
            );
            await Promise.all(insertPromises);
        }
    }

    // Get all runs for the date with template info
    const { rows: runs } = await pool.query(
        `SELECT
            r."recordId",
            r."name",
            r."capacity",
            r."scheduleTime",
            r."assignedPets",
            r."date",
            r."templateId",
            rt."timePeriodMinutes",
            rt."capacityType",
            rt."maxCapacity"
        FROM "Run" r
        LEFT JOIN "RunTemplate" rt ON r."templateId" = rt."recordId"
        WHERE r."tenantId" = $1 AND DATE(r."date") = $2
        ORDER BY r."name"`,
        [tenantId, dateStr]
    );

    // For each run, fetch the pet details for assigned pets
    const runsWithAssignments = await Promise.all(
        runs.map(async (run) => {
            const assignments = run.assignedPets || [];

            if (assignments.length === 0) {
                return { ...run, assignments: [] };
            }

            // Extract pet IDs from assignments (which now have petId, startTime, endTime)
            const petIds = assignments.map(a => typeof a === 'string' ? a : a.petId);

            // Fetch pet details including behavioral flags and notes
            const { rows: pets } = await pool.query(
                `SELECT
                    p."recordId",
                    p."name",
                    p."species",
                    p."breed",
                    p."behaviorFlags",
                    p."medicalNotes",
                    p."dietaryNotes",
                    json_agg(
                        json_build_object(
                            'owner', json_build_object(
                                'recordId', o."recordId",
                                'firstName', o."firstName",
                                'lastName', o."lastName"
                            )
                        )
                    ) FILTER (WHERE o."recordId" IS NOT NULL) as owners
                FROM "Pet" p
                LEFT JOIN "PetOwner" po ON po."petId" = p."recordId"
                LEFT JOIN "Owner" o ON o."recordId" = po."ownerId" AND o."tenantId" = $1
                WHERE p."recordId" = ANY($2) AND p."tenantId" = $1
                GROUP BY p."recordId", p."name", p."species", p."breed", p."behaviorFlags", p."medicalNotes", p."dietaryNotes"`,
                [tenantId, petIds]
            );

            // Create a map of pet details
            const petMap = {};
            pets.forEach(pet => {
                petMap[pet.recordId] = pet;
            });

            // Map assignments to include pet details and time info
            const detailedAssignments = assignments.map(a => {
                const petId = typeof a === 'string' ? a : a.petId;
                return {
                    pet: petMap[petId],
                    startTime: typeof a === 'object' ? a.startTime : undefined,
                    endTime: typeof a === 'object' ? a.endTime : undefined
                };
            });

            return {
                ...run,
                assignments: detailedAssignments
            };
        })
    );

    return ok(event, 200, runsWithAssignments);
}

async function listRuns(event, tenantId) {
    const { date } = event.queryStringParameters || {};
    const pool = getPool();
    const { rows } = await pool.query(
        `SELECT * FROM "Run" WHERE "tenantId" = $1 AND DATE("date") = $2 ORDER BY "name"`,
        [tenantId, date || new Date().toISOString().split('T')[0]]
    );
    return ok(event, 200, rows);
}

async function createRun(event, tenantId) {
    const { name, date, capacity, assignedPets } = JSON.parse(event.body);
    const pool = getPool();
    const { rows } = await pool.query(
        `INSERT INTO "Run" ("recordId", "tenantId", "name", "date", "capacity", "assignedPets", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [tenantId, name, date, capacity || 10, JSON.stringify(assignedPets || [])]
    );
    return ok(event, 201, rows[0]);
}

async function updateRun(event, tenantId) {
    const { assignedPets } = JSON.parse(event.body);
    const pool = getPool();

    // Get the run with template info for capacity validation
    const { rows: runRows } = await pool.query(
        `SELECT r.*, rt."timePeriodMinutes", rt."capacityType", rt."maxCapacity"
         FROM "Run" r
         LEFT JOIN "RunTemplate" rt ON r."templateId" = rt."recordId"
         WHERE r."recordId" = $1 AND r."tenantId" = $2`,
        [event.pathParameters.runId, tenantId]
    );

    if (runRows.length === 0) {
        return fail(event, 404, { message: 'Run not found' });
    }

    const run = runRows[0];
    const capacityType = run.capacityType || 'total';
    const maxCapacity = run.maxCapacity || run.capacity || 10;

    // Validate capacity based on capacityType
    if (capacityType === 'total' && assignedPets.length > maxCapacity) {
        return fail(event, 400, { message: `Total capacity exceeded. Max: ${maxCapacity}` });
    }

    if (capacityType === 'concurrent') {
        // Check for concurrent overlaps
        const timeSlots = {};
        assignedPets.forEach(a => {
            if (a.startTime && a.endTime) {
                const key = `${a.startTime}-${a.endTime}`;
                timeSlots[key] = (timeSlots[key] || 0) + 1;
                if (timeSlots[key] > maxCapacity) {
                    return fail(event, 400, { message: `Concurrent capacity exceeded for slot ${a.startTime}-${a.endTime}. Max: ${maxCapacity}` });
                }
            }
        });
    }

    // Update the run
    const { rows } = await pool.query(
        `UPDATE "Run" SET "assignedPets" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3 RETURNING *`,
        [JSON.stringify(assignedPets), event.pathParameters.runId, tenantId]
    );
    return ok(event, 200, rows[0]);
}

// ===== CHECK-IN HANDLERS =====

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
        return fail(event, 400, { message: 'bookingId is required' });
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

        return ok(event, 201, checkIn);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Check-in error:', error);

        if (error.message === 'Booking not found') {
            return fail(event, 404, { message: error.message });
        }

        if (error.message.includes('Cannot check in')) {
            return fail(event, 400, { message: error.message });
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

    return ok(event, 200, checkIns);
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
        return fail(event, 404, { message: 'Check-in not found' });
    }

    const checkIn = result.rows[0];
    checkIn.ownerName = `${checkIn.firstName} ${checkIn.lastName}`.trim();
    checkIn.belongings = typeof checkIn.belongings === 'string' ? JSON.parse(checkIn.belongings) : checkIn.belongings;
    checkIn.photoUrls = typeof checkIn.photoUrls === 'string' ? JSON.parse(checkIn.photoUrls) : checkIn.photoUrls;

    return ok(event, 200, checkIn);
}

// ===== CHECK-OUT HANDLERS =====

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
        return fail(event, 400, { message: 'bookingId is required' });
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

        return ok(event, 201, checkOut);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Check-out error:', error);

        if (error.message === 'Booking not found') {
            return fail(event, 404, { message: error.message });
        }

        if (error.message.includes('Cannot check out')) {
            return fail(event, 400, { message: error.message });
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

    return ok(event, 200, checkOuts);
}

async function getCheckOutDetail(event, tenantId) {
    const pool = getPool();
    const { id } = event.pathParameters;

    const result = await pool.query(
        `SELECT co.*,
                b."checkIn", b."checkOut", b."status" as "bookingStatus",
                b."totalPriceInCents", b."depositInCents", b."balanceDueInCents",
                p."name" as "petName", p."recordId" as "petId",
                o."firstName", o."lastName", o."recordId" as "ownerId", o."email", o."phone",
                u."name" as "checkedOutByName"
         FROM "CheckOut" co
         JOIN "Booking" b ON co."bookingId" = b."recordId"
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         LEFT JOIN "User" u ON co."checkedOutBy" = u."recordId"
         WHERE co."recordId" = $1 AND b."tenantId" = $2`,
        [id, tenantId]
    );

    if (result.rows.length === 0) {
        return fail(event, 404, { message: 'Check-out not found' });
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

    return ok(event, 200, checkOut);
}

// ===== KENNELS HANDLERS =====

async function getKennelOccupancy(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(
        `SELECT
            k.*,
            COALESCE(COUNT(DISTINCT bs."bookingId"), 0)::int as occupied
        FROM "Kennel" k
        LEFT JOIN "BookingSegment" bs ON k."recordId" = bs."kennelId"
            AND bs."startDate" <= CURRENT_DATE
            AND bs."endDate" >= CURRENT_DATE
            AND bs."status" NOT IN ('CANCELLED')
        WHERE k."tenantId" = $1
        GROUP BY k."recordId"
        ORDER BY k."name"`,
        [tenantId]
    );
    return ok(event, 200, rows);
}

async function listKennels(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM "Kennel" WHERE "tenantId" = $1 ORDER BY "name"`, [tenantId]);
    return ok(event, 200, rows);
}

async function createKennel(event, tenantId) {
    const { name, type, capacity, amenities, notes } = JSON.parse(event.body);
    const pool = getPool();
    const { rows } = await pool.query(
        `INSERT INTO "Kennel" ("recordId", "tenantId", "name", "type", "capacity", "amenities", "notes", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [tenantId, name, type || 'KENNEL', capacity || 1, JSON.stringify(amenities || {}), notes]
    );
    return ok(event, 201, rows[0]);
}

async function getKennel(event, tenantId) {
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM "Kennel" WHERE "recordId" = $1 AND "tenantId" = $2`, [event.pathParameters.kennelId, tenantId]);
    if (rows.length === 0) return fail(event, 404, { message: 'Not found' });
    return ok(event, 200, rows[0]);
}

async function updateKennel(event, tenantId) {
    const body = JSON.parse(event.body);
    const pool = getPool();
    const { rows } = await pool.query(
        `UPDATE "Kennel" SET "name" = COALESCE($1, "name"), "type" = COALESCE($2, "type"), "capacity" = COALESCE($3, "capacity"), "updatedAt" = NOW()
         WHERE "recordId" = $4 AND "tenantId" = $5 RETURNING *`,
        [body.name, body.type, body.capacity, event.pathParameters.kennelId, tenantId]
    );
    if (rows.length === 0) return fail(event, 404, { message: 'Not found' });
    return ok(event, 200, rows[0]);
}

async function deleteKennel(event, tenantId) {
    const pool = getPool();
    const { rowCount } = await pool.query(`DELETE FROM "Kennel" WHERE "recordId" = $1 AND "tenantId" = $2`, [event.pathParameters.kennelId, tenantId]);
    if (rowCount === 0) return fail(event, 404, { message: 'Not found' });
    return ok(event, 204);
}
