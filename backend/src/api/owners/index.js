const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const listOwners = async (event, tenantId) => {
  const pool = getPool();
  const { search, limit = '50', offset = '0' } = event.queryStringParameters || {};

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

  const result = await pool.query(query, params);

  const owners = result.rows.map((row) => ({
    ...row,
    name: `${row.firstName} ${row.lastName}`.trim(),
    pets: row.pets || [],
  }));

  return ok(event, 200, owners);
};

const createOwner = async (event, tenantId) => {
  const pool = getPool();
  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    emergencyContact,
    emergencyPhone,
    notes,
  } = JSON.parse(event.body || '{}');

  if (!firstName || !lastName) {
    return fail(event, 400, { message: 'First name and last name are required' });
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
      tenantId,
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

  return ok(event, 201, owner);
};

const getOwnerById = async (event, tenantId) => {
  const pool = getPool();
  const { id } = event.pathParameters;

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
    [tenantId, id],
  );

  if (ownerResult.rows.length === 0) {
    return fail(event, 404, { message: 'Owner not found' });
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
    [id, tenantId],
  );

  owner.recentBookings = bookingsResult.rows;

  return ok(event, 200, owner);
};

const updateOwner = async (event, tenantId) => {
  const pool = getPool();
  const { id } = event.pathParameters;
  const updates = JSON.parse(event.body || '{}');

  const checkResult = await pool.query(
    'SELECT "recordId" FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2',
    [id, tenantId],
  );

  if (checkResult.rows.length === 0) {
    return fail(event, 404, { message: 'Owner not found' });
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

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key) && updates[key] !== undefined) {
      updateFields.push(`"${key}" = $${++paramCount}`);
      values.push(updates[key]);
    }
  });

  if (updateFields.length === 0) {
    return fail(event, 400, { message: 'No valid fields to update' });
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

  return ok(event, 200, owner);
};

const deleteOwner = async (event, tenantId) => {
  const pool = getPool();
  const { id } = event.pathParameters;

  const bookingCheck = await pool.query(
    `SELECT COUNT(*) FROM "Booking"
         WHERE "ownerId" = $1 AND "tenantId" = $2
         AND "status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')`,
    [id, tenantId],
  );

  if (parseInt(bookingCheck.rows[0].count, 10) > 0) {
    return fail(event, 400, {
      message: 'Cannot delete owner with active bookings',
    });
  }

  const result = await pool.query(
    'DELETE FROM "Owner" WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING "recordId"',
    [id, tenantId],
  );

  if (result.rows.length === 0) {
    return fail(event, 404, { message: 'Owner not found' });
  }

  return ok(event, 200, { message: 'Owner deleted successfully' });
};

module.exports = {
  listOwners,
  createOwner,
  getOwnerById,
  updateOwner,
  deleteOwner,
};

