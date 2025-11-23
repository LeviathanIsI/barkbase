const express = require('express');
const { getPool } = require('../../../lib/db');
const { ok, fail } = require('../../../lib/utils/responses');

const router = express.Router();

router.get('/messages', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { since } = req.query || {};

    let query = `SELECT * FROM "Message" WHERE "tenantId" = $1`;
    const params = [tenantId];

    if (since) {
      query += ` AND "createdAt" > $2`;
      params.push(since);
    }

    query += ` ORDER BY "createdAt" DESC LIMIT 100`;

    const { rows } = await pool.query(query, params);
    return ok(res, rows);
  } catch (error) {
    console.error('[messages] listMessages failed', error);
    return fail(res, 500, { message: 'Failed to list messages' });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const {
      content,
      senderId,
      recipientId,
    } = req.body || {};

    const { rows } = await pool.query(
      `INSERT INTO "Message" (
        "recordId",
        "tenantId",
        "content",
        "senderId",
        "recipientId",
        "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      RETURNING *`,
      [tenantId, content, senderId, recipientId],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[messages] createMessage failed', error);
    return fail(res, 500, { message: 'Failed to create message' });
  }
});

module.exports = router;

