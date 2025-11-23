const express = require('express');
const { getPool } = require('../../../lib/db');
const { ok, fail } = require('../../../lib/utils/responses');

const router = express.Router();

router.get('/incidents', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;

    const { rows } = await pool.query(
      `SELECT *
         FROM "IncidentReport"
        WHERE "tenantId" = $1
        ORDER BY "timestamp" DESC`,
      [tenantId],
    );

    return ok(res, rows);
  } catch (error) {
    console.error('[incidents] listReports failed', error);
    return fail(res, 500, { message: 'Failed to list incidents' });
  }
});

router.post('/incidents', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const {
      petId,
      description,
      severity,
      reportedBy,
    } = req.body || {};

    const { rows } = await pool.query(
      `INSERT INTO "IncidentReport" (
        "recordId",
        "tenantId",
        "petId",
        "description",
        "severity",
        "reportedBy",
        "timestamp",
        "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *`,
      [tenantId, petId, description, severity || 'MINOR', reportedBy],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[incidents] createReport failed', error);
    return fail(res, 500, { message: 'Failed to create incident' });
  }
});

module.exports = router;

