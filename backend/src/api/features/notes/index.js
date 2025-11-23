const express = require('express');
const { getPool } = require('../../../lib/db');
const { ok, fail } = require('../../../lib/utils/responses');

const router = express.Router();

router.get('/notes', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { entityId } = req.query || {};

    let query = `SELECT * FROM "Note" WHERE "tenantId" = $1`;
    const params = [tenantId];

    if (entityId) {
      query += ` AND "entityId" = $2`;
      params.push(entityId);
    }

    query += ` ORDER BY "createdAt" DESC`;

    const { rows } = await pool.query(query, params);
    return ok(res, rows);
  } catch (error) {
    console.error('[notes] listNotes failed', error);
    return fail(res, 500, { message: 'Failed to list notes' });
  }
});

router.post('/notes', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const {
      entityId,
      entityType,
      content,
      visibility,
    } = req.body || {};

    const { rows } = await pool.query(
      `INSERT INTO "Note" (
        "recordId",
        "tenantId",
        "entityId",
        "entityType",
        "content",
        "visibility",
        "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [tenantId, entityId, entityType, content, visibility || 'ALL'],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[notes] createNote failed', error);
    return fail(res, 500, { message: 'Failed to create note' });
  }
});

module.exports = router;

