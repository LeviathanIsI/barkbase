const { Router } = require('express');
const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const router = Router();

router.get('/medical-alerts', async (req, res) => {
  try {
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
      [req.tenantId],
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

    return ok(res, alerts);
  } catch (error) {
    console.error('[pets] listMedicalAlerts failed', error);
    return fail(res, 500, { message: 'Failed to load medical alerts' });
  }
});

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const pool = getPool();

    const { rows } = await pool.query(
      'SELECT * FROM "Pet" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3',
      [req.tenantId, limit, offset],
    );

    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1',
      [req.tenantId],
    );

    const totalCount = parseInt(countRows[0].count, 10);

    return ok(res, rows, 200, { 'X-Total-Count': totalCount });
  } catch (error) {
    console.error('[pets] listPets failed', error);
    return fail(res, 500, { message: 'Failed to list pets' });
  }
});

router.post('/', async (req, res) => {
  try {
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
    } = req.body;

    if (!name) {
      return fail(res, 400, { message: 'Pet name is required' });
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
        req.tenantId,
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

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[pets] createPet failed', error);
    return fail(res, 500, { message: 'Failed to create pet' });
  }
});

router.get('/:petId', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM "Pet" WHERE "recordId" = $1 AND "tenantId" = $2',
      [req.params.petId, req.tenantId],
    );

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Pet not found' });
    }

    const pet = rows[0];

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
        [req.tenantId, req.params.petId],
      );
      const owners = result.rows.map((o) => ({
        ...o,
        name: [o.firstName, o.lastName].filter(Boolean).join(' ').trim() || o.email || 'Owner',
      }));

      const primary = owners.find((o) => o.isPrimary);
      if (primary && pet.primaryOwnerId !== primary.recordId) {
        await pool.query(
          'UPDATE "Pet" SET "primaryOwnerId" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3',
          [primary.recordId, req.params.petId, req.tenantId],
        );
        pet.primaryOwnerId = primary.recordId;
      }

      return ok(res, { ...pet, owners });
    } catch (ownersError) {
      console.error('[pets] owners join failed', ownersError);
      return ok(res, { ...pet, owners: [] });
    }
  } catch (error) {
    console.error('[pets] getPetById failed', error);
    return fail(res, 500, { message: 'Failed to load pet' });
  }
});

router.put('/:petId', async (req, res) => {
  try {
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

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        const value = field === 'behaviorFlags' ? JSON.stringify(req.body[field]) : req.body[field];
        fields.push(`"${field}" = $${paramCount++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return fail(res, 400, { message: 'No valid fields provided for update' });
    }

    const setClause = fields.join(', ');
    const query = `UPDATE "Pet" SET ${setClause} WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
    values.push(req.params.petId, req.tenantId);

    const pool = getPool();
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Pet not found or you do not have permission to update it' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[pets] updatePet failed', error);
    return fail(res, 500, { message: 'Failed to update pet' });
  }
});

router.delete('/:petId', async (req, res) => {
  try {
    const pool = getPool();
    const { rowCount } = await pool.query(
      'DELETE FROM "Pet" WHERE "recordId" = $1 AND "tenantId" = $2',
      [req.params.petId, req.tenantId],
    );

    if (rowCount === 0) {
      return fail(res, 404, { message: 'Pet not found or you do not have permission to delete it' });
    }

    return ok(res, null, 204);
  } catch (error) {
    console.error('[pets] deletePet failed', error);
    return fail(res, 500, { message: 'Failed to delete pet' });
  }
});

router.post('/owners', async (req, res) => {
  const { petId, ownerId, isPrimary = false } = req.body || {};

  if (!petId || !ownerId) {
    return fail(res, 400, { message: 'petId and ownerId are required' });
  }

  const pool = getPool();
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (isPrimary) {
        await client.query(
          'UPDATE "PetOwner" SET "isPrimary" = false WHERE "tenantId" = $1 AND "petId" = $2',
          [req.tenantId, petId],
        );
      }

      await client.query(
        `INSERT INTO "PetOwner" ("recordId", "tenantId", "petId", "ownerId", "isPrimary")
             VALUES (gen_random_uuid(), $1, $2, $3, $4)
             ON CONFLICT ("tenantId", "petId", "ownerId")
             DO UPDATE SET "isPrimary" = EXCLUDED."isPrimary"`,
        [req.tenantId, petId, ownerId, !!isPrimary],
      );

      if (isPrimary) {
        await client.query(
          'UPDATE "Pet" SET "primaryOwnerId" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3',
          [ownerId, petId, req.tenantId],
        );
      } else {
        const { rows } = await client.query(
          'SELECT 1 FROM "PetOwner" WHERE "tenantId" = $1 AND "petId" = $2 AND "isPrimary" = true LIMIT 1',
          [req.tenantId, petId],
        );
        if (rows.length === 0) {
          await client.query(
            'UPDATE "Pet" SET "primaryOwnerId" = NULL, "updatedAt" = NOW() WHERE "recordId" = $1 AND "tenantId" = $2',
            [petId, req.tenantId],
          );
        }
      }

      await client.query('COMMIT');
      return ok(res, { ok: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[pets] upsertPetOwner failed', error);
    return fail(res, 500, { message: 'Failed to upsert pet owner' });
  }
});

module.exports = router;

