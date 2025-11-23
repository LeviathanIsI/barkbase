const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const listExpiringVaccinations = async (event, tenantId) => {
  const daysAhead = parseInt(event.queryStringParameters?.daysAhead || '90', 10);

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
    [tenantId, daysAhead],
  );

  return ok(event, 200, rows);
};

const listPetVaccinations = async (event, tenantId) => {
  const petId = event.pathParameters.id;
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT v."recordId", v."type", v."administeredAt", v."expiresAt", v."documentUrl", v."notes"
         FROM "Vaccination" v
         WHERE v."tenantId" = $1 AND v."petId" = $2
         ORDER BY v."administeredAt" DESC`,
    [tenantId, petId],
  );

  return ok(event, 200, rows);
};

const createPetVaccination = async (event, tenantId) => {
  const petId = event.pathParameters.id;
  const body = JSON.parse(event.body);
  const {
    type, administeredAt, expiresAt, documentUrl, notes,
  } = body;

  if (!type || !administeredAt || !expiresAt) {
    return fail(event, 400, { message: 'Type, administeredAt, and expiresAt are required' });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO "Vaccination" (
            "recordId", "tenantId", "petId", "type", "administeredAt", "expiresAt", "documentUrl", "notes", "updatedAt"
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
        ) RETURNING *`,
    [tenantId, petId, type, administeredAt, expiresAt, documentUrl, notes],
  );

  return ok(event, 201, rows[0]);
};

const updatePetVaccination = async (event, tenantId) => {
  const vaccinationId = event.pathParameters.vaccinationId;
  const body = JSON.parse(event.body);

  const fields = [];
  const values = [];
  let paramCount = 1;

  const updatableFields = ['type', 'administeredAt', 'expiresAt', 'documentUrl', 'notes'];

  for (const field of updatableFields) {
    if (body[field] !== undefined) {
      fields.push(`"${field}" = $${paramCount++}`);
      values.push(body[field]);
    }
  }

  if (fields.length === 0) {
    return fail(event, 400, { message: 'No valid fields provided for update' });
  }

  const setClause = fields.join(', ');
  const query = `UPDATE "Vaccination" SET ${setClause}, "updatedAt" = NOW() WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
  values.push(vaccinationId, tenantId);

  const pool = getPool();
  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    return fail(event, 404, { message: 'Vaccination not found or you do not have permission to update it' });
  }

  return ok(event, 200, rows[0]);
};

const deletePetVaccination = async (event, tenantId) => {
  const vaccinationId = event.pathParameters.vaccinationId;

  const pool = getPool();
  const { rowCount } = await pool.query(
    'DELETE FROM "Vaccination" WHERE "recordId" = $1 AND "tenantId" = $2',
    [vaccinationId, tenantId],
  );

  if (rowCount === 0) {
    return fail(event, 404, { message: 'Vaccination not found or you do not have permission to delete it' });
  }

  return ok(event, 204);
};

module.exports = {
  listExpiringVaccinations,
  listPetVaccinations,
  createPetVaccination,
  updatePetVaccination,
  deletePetVaccination,
};

