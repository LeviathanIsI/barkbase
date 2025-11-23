const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const listMedicalAlerts = async (event, tenantId) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `
        SELECT
            p."recordId" AS "petId",
            p."name" AS "petName",
            p."species" AS "petSpecies",
            p."breed" AS "petBreed",
            p."medicalNotes",
            o."recordId" AS "ownerId",
            o."firstName" AS "ownerFirstName",
            o."lastName" AS "ownerLastName",
            o."email" AS "ownerEmail",
            o."phone" AS "ownerPhone",
            'critical' AS "severity",
            p."medicalNotes" AS "message"
        FROM "Pet" p
        LEFT JOIN "PetOwner" po ON po."petId" = p."recordId" AND po."tenantId" = p."tenantId" AND po."isPrimary" = true
        LEFT JOIN "Owner" o ON o."recordId" = po."ownerId" AND o."tenantId" = p."tenantId"
        WHERE p."tenantId" = $1
          AND p."medicalNotes" IS NOT NULL
          AND p."medicalNotes" != ''
          AND p."status" = 'active'
          AND LOWER(p."medicalNotes") NOT LIKE '%no known%'
          AND LOWER(p."medicalNotes") NOT LIKE '%no medical%'
          AND LOWER(p."medicalNotes") NOT LIKE '%none%'
          AND LOWER(p."medicalNotes") NOT LIKE '%n/a%'
        ORDER BY p."name" ASC
        `,
    [tenantId],
  );

  const alerts = rows.map((row) => ({
    id: `medical-${row.petId}`,
    petId: row.petId,
    petName: row.petName,
    petSpecies: row.petSpecies,
    petBreed: row.petBreed,
    ownerId: row.ownerId,
    ownerName: `${row.ownerFirstName || ''} ${row.ownerLastName || ''}`.trim(),
    ownerEmail: row.ownerEmail,
    ownerPhone: row.ownerPhone,
    severity: row.severity,
    message: row.message,
  }));

  return ok(event, 200, alerts);
};

const getPetById = async (event, tenantId) => {
  const petId = event.pathParameters.id;

  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM "Pet" WHERE "recordId" = $1 AND "tenantId" = $2',
    [petId, tenantId],
  );

  if (rows.length === 0) {
    return fail(event, 404, { message: 'Pet not found' });
  }

  const pet = rows[0];

  let owners = [];
  try {
    const result = await pool.query(
      `SELECT
                o."recordId" AS "recordId",
                o."firstName" AS "firstName",
                o."lastName" AS "lastName",
                o."email" AS "email",
                o."phone" AS "phone",
                po."isPrimary" AS "isPrimary"
             FROM "PetOwner" po
             JOIN "Owner" o ON o."recordId" = po."ownerId" AND o."tenantId" = po."tenantId"
             WHERE po."tenantId" = $1 AND po."petId" = $2
             ORDER BY po."isPrimary" DESC, o."lastName" ASC, o."firstName" ASC`,
      [tenantId, petId],
    );
    owners = result.rows.map((o) => ({
      ...o,
      name: [o.firstName, o.lastName].filter(Boolean).join(' ').trim() || o.email || 'Owner',
    }));

    const primary = owners.find((o) => o.isPrimary);
    if (primary && pet.primaryOwnerId !== primary.recordId) {
      await pool.query(
        'UPDATE "Pet" SET "primaryOwnerId" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3',
        [primary.recordId, petId, tenantId],
      );
      pet.primaryOwnerId = primary.recordId;
    }
  } catch (e) {
    console.error('[pets-api] owners join failed', e?.message || e);
    owners = [];
  }

  return ok(event, 200, { ...pet, owners });
};

const listPets = async (event, tenantId) => {
  const limit = parseInt(event.queryStringParameters?.limit, 10) || 20;
  const offset = parseInt(event.queryStringParameters?.offset, 10) || 0;

  console.log('[ENTITY SERVICE - PETS DEBUG] listPets called with:', {
    tenantId,
    limit,
    offset,
    queryParams: event.queryStringParameters,
  });

  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM "Pet" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
    [tenantId, limit, offset],
  );

  const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1', [tenantId]);
  const totalCount = parseInt(countRows[0].count, 10);

  console.log('[ENTITY SERVICE - PETS DEBUG] Query results:', {
    tenantId,
    totalCount,
    rowsReturned: rows.length,
    firstRow: rows.length > 0 ? { id: rows[0].recordId, name: rows[0].name } : null,
  });

  return ok(event, 200, rows, { 'X-Total-Count': totalCount });
};

const createPet = async (event, tenantId) => {
  const body = JSON.parse(event.body);
  const {
    name,
    species,
    breed,
    birthdate,
    photoUrl,
    medicalNotes,
    dietaryNotes,
    behaviorFlags,
    status,
    weight,
    allergies,
    lastVetVisit,
    nextAppointment,
  } = body;

  if (!name) {
    return fail(event, 400, { message: 'Pet name is required' });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO "Pet" (
            "recordId", "tenantId", "name", "species", "breed", "birthdate",
            "photoUrl", "medicalNotes", "dietaryNotes", "behaviorFlags", "status",
            "weight", "allergies", "lastVetVisit", "nextAppointment", "updatedAt"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
        ) RETURNING *`,
    [
      tenantId,
      name,
      species,
      breed,
      birthdate,
      photoUrl,
      medicalNotes,
      dietaryNotes,
      JSON.stringify(behaviorFlags || {}),
      status || 'active',
      weight,
      allergies,
      lastVetVisit,
      nextAppointment,
    ],
  );

  return ok(event, 201, rows[0]);
};

const updatePet = async (event, tenantId) => {
  const petId = event.pathParameters.id;
  const body = JSON.parse(event.body);

  const fields = [];
  const values = [];
  let paramCount = 1;

  const updatableFields = [
    'name',
    'species',
    'breed',
    'birthdate',
    'photoUrl',
    'medicalNotes',
    'dietaryNotes',
    'behaviorFlags',
    'status',
    'weight',
    'allergies',
    'lastVetVisit',
    'nextAppointment',
  ];

  for (const field of updatableFields) {
    if (body[field] !== undefined) {
      const value = field === 'behaviorFlags' ? JSON.stringify(body[field]) : body[field];
      fields.push(`"${field}" = $${paramCount++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return fail(event, 400, { message: 'No valid fields provided for update' });
  }

  const setClause = fields.join(', ');
  const query = `UPDATE "Pet" SET ${setClause} WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
  values.push(petId, tenantId);

  const pool = getPool();
  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    return fail(event, 404, { message: 'Pet not found or you do not have permission to update it' });
  }

  return ok(event, 200, rows[0]);
};

const deletePet = async (event, tenantId) => {
  const petId = event.pathParameters.id;

  const pool = getPool();
  const { rowCount } = await pool.query('DELETE FROM "Pet" WHERE "recordId" = $1 AND "tenantId" = $2', [petId, tenantId]);

  if (rowCount === 0) {
    return fail(event, 404, { message: 'Pet not found or you do not have permission to delete it' });
  }

  return ok(event, 204);
};

const upsertPetOwner = async (event, tenantId) => {
  const body = JSON.parse(event.body || '{}');
  const { petId, ownerId, isPrimary = false } = body;
  if (!petId || !ownerId) {
    return fail(event, 400, { message: 'petId and ownerId are required' });
    }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (isPrimary) {
      await client.query(
        'UPDATE "PetOwner" SET "isPrimary" = false WHERE "tenantId" = $1 AND "petId" = $2',
        [tenantId, petId],
      );
    }

    await client.query(
      `INSERT INTO "PetOwner" ("recordId", "tenantId", "petId", "ownerId", "isPrimary")
             VALUES (gen_random_uuid(), $1, $2, $3, $4)
             ON CONFLICT ("tenantId", "petId", "ownerId")
             DO UPDATE SET "isPrimary" = EXCLUDED."isPrimary"`,
      [tenantId, petId, ownerId, !!isPrimary],
    );

    if (isPrimary) {
      await client.query(
        'UPDATE "Pet" SET "primaryOwnerId" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3',
        [ownerId, petId, tenantId],
      );
    } else {
      const { rows } = await client.query(
        'SELECT 1 FROM "PetOwner" WHERE "tenantId" = $1 AND "petId" = $2 AND "isPrimary" = true LIMIT 1',
        [tenantId, petId],
      );
      if (rows.length === 0) {
        await client.query(
          'UPDATE "Pet" SET "primaryOwnerId" = NULL, "updatedAt" = NOW() WHERE "recordId" = $1 AND "tenantId" = $2',
          [petId, tenantId],
        );
      }
    }

    await client.query('COMMIT');
    return ok(event, 200, { ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[pets-api] upsertPetOwner failed', e?.message || e);
    return fail(event, 500, { message: 'Failed to upsert pet owner' });
  } finally {
    client.release();
  }
};

module.exports = {
  listMedicalAlerts,
  getPetById,
  listPets,
  createPet,
  updatePet,
  deletePet,
  upsertPetOwner,
};

