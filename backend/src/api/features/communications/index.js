const express = require('express');
const { getPool } = require('../../../lib/db');
const { ok, fail } = require('../../../lib/utils/responses');

const router = express.Router();

router.get('/communications', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;

    const { rows } = await pool.query(
      `SELECT *
         FROM "Communication"
        WHERE "tenantId" = $1
        ORDER BY "timestamp" DESC
        LIMIT 100`,
      [tenantId],
    );

    return ok(res, rows);
  } catch (error) {
    console.error('[communications] listComms failed', error);
    return fail(res, 500, { message: 'Failed to list communications' });
  }
});

router.post('/communications', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const {
      ownerId,
      type,
      direction,
      content,
      metadata,
    } = req.body || {};

    const { rows } = await pool.query(
      `INSERT INTO "Communication" (
        "recordId",
        "tenantId",
        "ownerId",
        "type",
        "direction",
        "content",
        "metadata",
        "timestamp",
        "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [tenantId, ownerId, type || 'NOTE', direction || 'OUTBOUND', content, JSON.stringify(metadata || {})],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[communications] createComm failed', error);
    return fail(res, 500, { message: 'Failed to create communication' });
  }
});

module.exports = router;

