const { Router } = require('express');
const { getPool } = require('../../lib/db');
const { ok: sendOk, fail: sendFail } = require('../../lib/utils/responses');

const router = Router();

const ok = (event, statusCode, data = '', additionalHeaders = {}) => {
  const payload = statusCode === 204 ? null : data === '' ? {} : data;
  return sendOk(event.__res, payload, statusCode, additionalHeaders);
};

const fail = (event, statusCode, errorCodeOrBody, message, additionalHeaders = {}) => {
  if (additionalHeaders && Object.keys(additionalHeaders).length > 0) {
    event.__res.set(additionalHeaders);
  }
  const payload = typeof errorCodeOrBody === 'object' && errorCodeOrBody !== null
    ? errorCodeOrBody
    : { error: errorCodeOrBody, message };
  return sendFail(event.__res, statusCode, payload);
};

const buildEvent = (req, res) => ({
  path: (req.baseUrl || '') + req.path,
  httpMethod: req.method,
  headers: req.headers,
  queryStringParameters: Object.keys(req.query || {}).length ? req.query : undefined,
  pathParameters: req.params || {},
  body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined,
  __res: res,
});

const routeHandler = (handler, { includeUser = false } = {}) => async (req, res) => {
  const event = buildEvent(req, res);
  try {
    const args = [event, req.tenantId];
    if (includeUser) {
      args.push(req.user);
    }
    await handler(...args);
  } catch (error) {
    console.error('[operations] route error:', error);
    sendFail(res, 500, { message: 'Internal Server Error' });
  }
};

router.get('/bookings', routeHandler(listBookings));
router.post('/bookings', routeHandler(createBooking, { includeUser: true }));
router.get('/bookings/:id', routeHandler(getBooking));
router.put('/bookings/:id', routeHandler(updateBooking));
router.patch('/bookings/:id/status', routeHandler(updateBookingStatus));
router.post('/bookings/:id/checkin', routeHandler(checkIn, { includeUser: true }));
router.post('/bookings/:id/checkout', routeHandler(checkOut, { includeUser: true }));
router.delete('/bookings/:id', routeHandler(deleteBooking));

router.get('/run-templates', routeHandler(listRunTemplates));
router.post('/run-templates', routeHandler(createRunTemplate));
router.put('/run-templates/:id', routeHandler(updateRunTemplate));
router.delete('/run-templates/:id', routeHandler(deleteRunTemplate));

router.get('/runs/:runId/available-slots', routeHandler(getAvailableSlots));
router.get('/runs/assignments', routeHandler(getRunAssignments));
router.get('/runs', routeHandler(listRuns));
router.post('/runs', routeHandler(createRun));
router.put('/runs/:runId', routeHandler(updateRun));

router.post('/check-ins', routeHandler(createCheckIn, { includeUser: true }));
router.get('/check-ins', routeHandler(listCheckIns));
router.get('/check-ins/:id', routeHandler(getCheckIn));

router.post('/check-outs', routeHandler(createCheckOut, { includeUser: true }));
router.get('/check-outs', routeHandler(listCheckOuts));
router.get('/check-outs/:id', routeHandler(getCheckOutDetail));

router.get('/kennels/occupancy', routeHandler(getKennelOccupancy));
router.get('/kennels', routeHandler(listKennels));
router.post('/kennels', routeHandler(createKennel));
router.get('/kennels/:kennelId', routeHandler(getKennel));
router.put('/kennels/:kennelId', routeHandler(updateKennel));
router.delete('/kennels/:kennelId', routeHandler(deleteKennel));

module.exports = router;

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
    const runId = event.pathParameters.runId;

    // Get the run
    const { rows: runRows } = await pool.query(
        `SELECT id, name, capacity, run_type FROM "Run" WHERE id = $1 AND tenant_id = $2`,
        [runId, tenantId]
    );

    if (runRows.length === 0) {
        return fail(event, 404, { message: 'Run not found' });
    }

    const run = runRows[0];
    const timePeriod = 30; // Default time period
    const maxCapacity = run.capacity || 10;

    // Get assignments for this run on this date from RunAssignment table
    const { rows: assignments } = await pool.query(
        `SELECT start_time, end_time FROM "RunAssignment"
         WHERE run_id = $1 AND tenant_id = $2 AND assigned_date = $3`,
        [runId, tenantId, dateStr]
    );

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

            // Count pets in this slot (concurrent capacity)
            const occupied = assignments.filter(a => {
                const aStart = a.start_time?.toString().slice(0, 5) || '00:00';
                const aEnd = a.end_time?.toString().slice(0, 5) || '23:59';
                return aStart < endTime && aEnd > startTime;
            }).length;

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

    // Get all active runs (Run table has: id, tenant_id, name, capacity, run_type, is_active)
    const { rows: runs } = await pool.query(
        `SELECT id, name, capacity, run_type, is_active
         FROM "Run"
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY name`,
        [tenantId]
    );

    // Get assignments for this date from RunAssignment table with pet/owner details
    // RunAssignment schema: id, tenant_id, run_id, pet_id, booking_id, assigned_date, start_time, end_time, is_individual, notes
    const { rows: assignments } = await pool.query(
        `SELECT
           ra.id,
           ra.run_id,
           ra.pet_id,
           ra.booking_id,
           ra.assigned_date,
           ra.start_time,
           ra.end_time,
           ra.is_individual,
           ra.notes,
           p.name as pet_name,
           p.species as pet_species,
           p.breed as pet_breed,
           p.photo_url as pet_photo_url,
           o.first_name as owner_first_name,
           o.last_name as owner_last_name,
           o.phone as owner_phone
         FROM "RunAssignment" ra
         JOIN "Pet" p ON ra.pet_id = p.id AND p.tenant_id = ra.tenant_id
         LEFT JOIN "Owner" o ON p.owner_id = o.id AND o.tenant_id = ra.tenant_id
         WHERE ra.tenant_id = $1 AND ra.assigned_date = $2
         ORDER BY ra.start_time`,
        [tenantId, dateStr]
    );

    // Group assignments by run
    const assignmentsByRun = {};
    assignments.forEach(a => {
        if (!assignmentsByRun[a.run_id]) {
            assignmentsByRun[a.run_id] = [];
        }
        assignmentsByRun[a.run_id].push({
            id: a.id,
            petId: a.pet_id,
            petName: a.pet_name,
            petSpecies: a.pet_species,
            petBreed: a.pet_breed,
            petPhotoUrl: a.pet_photo_url,
            ownerName: a.owner_first_name && a.owner_last_name
                ? `${a.owner_first_name} ${a.owner_last_name}`
                : a.owner_first_name || a.owner_last_name || null,
            ownerPhone: a.owner_phone,
            bookingId: a.booking_id,
            assignedDate: a.assigned_date,
            startTime: a.start_time,
            endTime: a.end_time,
            isIndividual: a.is_individual,
            notes: a.notes
        });
    });

    // Merge runs with their assignments
    const result = runs.map(run => ({
        recordId: run.id,
        id: run.id,
        name: run.name,
        capacity: run.capacity,
        runType: run.run_type,
        isActive: run.is_active,
        assignments: assignmentsByRun[run.id] || []
    }));

    // Transform flat assignments to camelCase (same format as nested runs[].assignments)
    const transformedAssignments = assignments.map(a => ({
        id: a.id,
        runId: a.run_id,
        runName: runs.find(r => r.id === a.run_id)?.name,
        petId: a.pet_id,
        petName: a.pet_name,
        petSpecies: a.pet_species,
        petBreed: a.pet_breed,
        petPhotoUrl: a.pet_photo_url,
        ownerName: a.owner_first_name && a.owner_last_name
            ? `${a.owner_first_name} ${a.owner_last_name}`
            : a.owner_first_name || a.owner_last_name || null,
        ownerPhone: a.owner_phone,
        bookingId: a.booking_id,
        assignedDate: a.assigned_date,
        startTime: a.start_time,
        endTime: a.end_time,
        isIndividual: a.is_individual,
        notes: a.notes
    }));

    return ok(event, 200, { runs: result, assignments: transformedAssignments, total: transformedAssignments.length });
}

async function listRuns(event, tenantId) {
    const pool = getPool();
    // Run table schema: id, tenant_id, name, capacity, run_type, is_active
    const { rows } = await pool.query(
        `SELECT id, name, capacity, run_type, is_active
         FROM "Run"
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY name`,
        [tenantId]
    );
    return ok(event, 200, rows.map(r => ({
        recordId: r.id,
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        runType: r.run_type,
        isActive: r.is_active
    })));
}

async function createRun(event, tenantId) {
    const { name, capacity, runType } = JSON.parse(event.body);
    const pool = getPool();
    // Run table schema: id, tenant_id, name, capacity, run_type, is_active
    const { rows } = await pool.query(
        `INSERT INTO "Run" (tenant_id, name, capacity, run_type, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW()) RETURNING *`,
        [tenantId, name, capacity || 10, runType || 'Standard']
    );
    const r = rows[0];
    return ok(event, 201, {
        recordId: r.id,
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        runType: r.run_type,
        isActive: r.is_active
    });
}

async function updateRun(event, tenantId) {
    const { name, capacity, runType, isActive } = JSON.parse(event.body);
    const pool = getPool();
    const runId = event.pathParameters.runId;

    // Get existing run
    const { rows: runRows } = await pool.query(
        `SELECT * FROM "Run" WHERE id = $1 AND tenant_id = $2`,
        [runId, tenantId]
    );

    if (runRows.length === 0) {
        return fail(event, 404, { message: 'Run not found' });
    }

    // Update run metadata (assignments are stored in RunAssignment table, not here)
    const updates = [];
    const values = [runId, tenantId];
    let paramIndex = 3;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (capacity !== undefined) {
        updates.push(`capacity = $${paramIndex++}`);
        values.push(capacity);
    }
    if (runType !== undefined) {
        updates.push(`run_type = $${paramIndex++}`);
        values.push(runType);
    }
    if (isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(isActive);
    }
    updates.push('updated_at = NOW()');

    const { rows } = await pool.query(
        `UPDATE "Run" SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
        values
    );
    const r = rows[0];
    return ok(event, 200, {
        recordId: r.id,
        id: r.id,
        name: r.name,
        capacity: r.capacity,
        runType: r.run_type,
        isActive: r.is_active
    });
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
               us.full_name as "checkedInByName"
        FROM "CheckIn" ci
        JOIN "Booking" b ON ci."bookingId" = b."recordId"
        JOIN "Pet" p ON b."petId" = p."recordId"
        JOIN "Owner" o ON b."ownerId" = o."recordId"
        LEFT JOIN "User" u ON ci."checkedInBy" = u.record_id
        LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
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
                us.full_name as "checkedInByName"
         FROM "CheckIn" ci
         JOIN "Booking" b ON ci."bookingId" = b."recordId"
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         LEFT JOIN "User" u ON ci."checkedInBy" = u.record_id
         LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
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
               us.full_name as "checkedOutByName"
        FROM "CheckOut" co
        JOIN "Booking" b ON co."bookingId" = b."recordId"
        JOIN "Pet" p ON b."petId" = p."recordId"
        JOIN "Owner" o ON b."ownerId" = o."recordId"
        LEFT JOIN "User" u ON co."checkedOutBy" = u.record_id
        LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
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
                us.full_name as "checkedOutByName"
         FROM "CheckOut" co
         JOIN "Booking" b ON co."bookingId" = b."recordId"
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         LEFT JOIN "User" u ON co."checkedOutBy" = u.record_id
         LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
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
