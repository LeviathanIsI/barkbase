const { Router } = require('express');
const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const router = Router();

router.get('/expiring', async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.daysAhead || '90', 10);
    const pool = getPool();
    const { rows } = await pool.query(
      `
        SELECT
            v."recordId",
            v."type",
            v."administeredAt",
            v."expiresAt",
            v."petId",
            p."name"       AS "petName",
            p."species"    AS "petSpecies",
            p."breed"      AS "petBreed",
            o."recordId"   AS "ownerId",
            o."firstName"  AS "ownerFirstName",
            o."lastName"   AS "ownerLastName",
            o."email"      AS "ownerEmail",
            o."phone"      AS "ownerPhone"
        FROM "Vaccination" v
        JOIN "Pet" p ON p."recordId" = v."petId" AND p."tenantId" = v."tenantId"
        LEFT JOIN "PetOwner" po ON po."petId" = p."recordId" AND po."tenantId" = v."tenantId" AND po."isPrimary" = true
        LEFT JOIN "Owner" o ON o."recordId" = po."ownerId" AND o."tenantId" = v."tenantId"
        WHERE v."tenantId" = $1
          AND v."expiresAt" <= NOW() + ($2 || ' days')::interval
        ORDER BY v."expiresAt" ASC
        `,
      [req.tenantId, daysAhead],
    );

    return ok(res, rows);
  } catch (error) {
    console.error('[vaccinations] listExpiringVaccinations failed', error);
    return fail(res, 500, { message: 'Failed to load expiring vaccinations' });
  }
});

router.get('/:petId', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT v."recordId", v."type", v."administeredAt", v."expiresAt", v."documentUrl", v."notes"
         FROM "Vaccination" v
         WHERE v."tenantId" = $1 AND v."petId" = $2
         ORDER BY v."administeredAt" DESC`,
      [req.tenantId, req.params.petId],
    );

    return ok(res, rows);
  } catch (error) {
    console.error('[vaccinations] listPetVaccinations failed', error);
    return fail(res, 500, { message: 'Failed to load pet vaccinations' });
  }
});

router.post('/:petId', async (req, res) => {
  try {
    const {
      type, administeredAt, expiresAt, documentUrl, notes,
    } = req.body;

    if (!type || !administeredAt || !expiresAt) {
      return fail(res, 400, { message: 'Type, administeredAt, and expiresAt are required' });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO "Vaccination" (
            "recordId", "tenantId", "petId", "type", "administeredAt", "expiresAt", "documentUrl", "notes", "updatedAt"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
        ) RETURNING *`,
      [req.tenantId, req.params.petId, type, administeredAt, expiresAt, documentUrl, notes],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[vaccinations] createPetVaccination failed', error);
    return fail(res, 500, { message: 'Failed to create vaccination' });
  }
});

router.put('/:petId/:vaccinationId', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const updatableFields = ['type', 'administeredAt', 'expiresAt', 'documentUrl', 'notes'];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        fields.push(`"${field}" = $${paramCount++}`);
        values.push(req.body[field]);
      }
    });

    if (fields.length === 0) {
      return fail(res, 400, { message: 'No valid fields provided for update' });
    }

    const setClause = fields.join(', ');
    const query = `UPDATE "Vaccination" SET ${setClause}, "updatedAt" = NOW() WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
    values.push(req.params.vaccinationId, req.tenantId);

    const pool = getPool();
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Vaccination not found or you do not have permission to update it' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[vaccinations] updatePetVaccination failed', error);
    return fail(res, 500, { message: 'Failed to update vaccination' });
  }
});

router.delete('/:petId/:vaccinationId', async (req, res) => {
  try {
    const pool = getPool();
    const { rowCount } = await pool.query(
      'DELETE FROM "Vaccination" WHERE "recordId" = $1 AND "tenantId" = $2',
      [req.params.vaccinationId, req.tenantId],
    );

    if (rowCount === 0) {
      return fail(res, 404, { message: 'Vaccination not found or you do not have permission to delete it' });
    }

    return ok(res, null, 204);
  } catch (error) {
    console.error('[vaccinations] deletePetVaccination failed', error);
    return fail(res, 500, { message: 'Failed to delete vaccination' });
  }
});

module.exports = router;

