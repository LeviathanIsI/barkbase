const { Router } = require('express');
const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query;

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

    const params = [req.tenantId];

    if (search) {
      query += ` AND (
            o."firstName" ILIKE $${params.length + 1} OR
            o."lastName" ILIKE $${params.length + 1} OR
            o."email" ILIKE $${params.length + 1} OR
            o."phone" ILIKE $${params.length + 1}
        )`;
      params.push(`%${search}%`);
    }

    query += ' GROUP BY o."recordId"';
    query += ' ORDER BY o."lastName", o."firstName"';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const pool = getPool();
    const result = await pool.query(query, params);

    const owners = result.rows.map((row) => ({
      ...row,
      name: `${row.firstName} ${row.lastName}`.trim(),
      pets: row.pets || [],
    }));

    return ok(res, owners);
  } catch (error) {
    console.error('[owners] listOwners failed', error);
    return fail(res, 500, { message: 'Failed to list owners' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      emergencyContact,
      emergencyPhone,
      notes,
    } = req.body || {};

    if (!firstName || !lastName) {
      return fail(res, 400, { message: 'First name and last name are required' });
    }

    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO "Owner" (
            "recordId", "tenantId", "firstName", "lastName",
            "email", "phone", "address", "emergencyContact",
            "emergencyPhone", "notes"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *`,
      [
        req.tenantId,
        firstName,
        lastName,
        email,
        phone,
        address,
        emergencyContact,
        emergencyPhone,
        notes,
      ],
    );

    const owner = result.rows[0];
    owner.name = `${owner.firstName} ${owner.lastName}`.trim();
    owner.pets = [];
    owner.petCount = 0;

    return ok(res, owner, 201);
  } catch (error) {
    console.error('[owners] createOwner failed', error);
    return fail(res, 500, { message: 'Failed to create owner' });
  }
});

router.get('/:ownerId', async (req, res) => {
  try {
    const pool = getPool();
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
      [req.tenantId, req.params.ownerId],
    );

    if (ownerResult.rows.length === 0) {
      return fail(res, 404, { message: 'Owner not found' });
    }

    const owner = ownerResult.rows[0];
    owner.name = `${owner.firstName} ${owner.lastName}`.trim();
    owner.pets = owner.pets || [];
    owner.petCount = owner.pets.length;

    const bookingsResult = await pool.query(
      `SELECT b."recordId", b."status", b."checkIn", b."checkOut",
                p."name" as "petName", s."name" as "serviceName"
         FROM "Booking" b
         LEFT JOIN "Pet" p ON b."petId" = p."recordId"
         LEFT JOIN "Service" s ON b."serviceId" = s."recordId"
         WHERE b."ownerId" = $1 AND b."tenantId" = $2
         ORDER BY b."checkIn" DESC
         LIMIT 5`,
      [req.params.ownerId, req.tenantId],
    );

    owner.recentBookings = bookingsResult.rows;

    return ok(res, owner);
  } catch (error) {
    console.error('[owners] getOwnerById failed', error);
    return fail(res, 500, { message: 'Failed to load owner' });
  }
});

router.put('/:ownerId', async (req, res) => {
  try {
    const pool = getPool();

    const checkResult = await pool.query(
      'SELECT "recordId" FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2',
      [req.params.ownerId, req.tenantId],
    );

    if (checkResult.rows.length === 0) {
      return fail(res, 404, { message: 'Owner not found' });
    }

    const allowedFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'address',
      'emergencyContact',
      'emergencyPhone',
      'notes',
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 2;

    Object.keys(req.body || {}).forEach((key) => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updateFields.push(`"${key}" = $${++paramCount}`);
        values.push(req.body[key]);
      }
    });

    if (updateFields.length === 0) {
      return fail(res, 400, { message: 'No valid fields to update' });
    }

    const updateQuery = `
        UPDATE "Owner"
        SET ${updateFields.join(', ')}
        WHERE "recordId" = $1 AND "tenantId" = $2
        RETURNING *
    `;

    const result = await pool.query(updateQuery, [req.params.ownerId, req.tenantId, ...values]);
    const owner = result.rows[0];
    owner.name = `${owner.firstName} ${owner.lastName}`.trim();

    return ok(res, owner);
  } catch (error) {
    console.error('[owners] updateOwner failed', error);
    return fail(res, 500, { message: 'Failed to update owner' });
  }
});

router.delete('/:ownerId', async (req, res) => {
  try {
    const pool = getPool();
    const bookingCheck = await pool.query(
      `SELECT COUNT(*) FROM "Booking"
         WHERE "ownerId" = $1 AND "tenantId" = $2
         AND "status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')`,
      [req.params.ownerId, req.tenantId],
    );

    if (parseInt(bookingCheck.rows[0].count, 10) > 0) {
      return fail(res, 400, {
        message: 'Cannot delete owner with active bookings',
      });
    }

    const result = await pool.query(
      'DELETE FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING "recordId"',
      [req.params.ownerId, req.tenantId],
    );

    if (result.rows.length === 0) {
      return fail(res, 404, { message: 'Owner not found' });
    }

    return ok(res, { message: 'Owner deleted successfully' });
  } catch (error) {
    console.error('[owners] deleteOwner failed', error);
    return fail(res, 500, { message: 'Failed to delete owner' });
  }
});

module.exports = router;

