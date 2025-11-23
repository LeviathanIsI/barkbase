const express = require('express');
const { getPool } = require('../../../lib/db');
const { ok, fail } = require('../../../lib/utils/responses');

const router = express.Router();

router.get('/invites', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;

    const { rows } = await pool.query(
      `SELECT *
         FROM "Invite"
        WHERE "tenantId" = $1
        ORDER BY "createdAt" DESC`,
      [tenantId],
    );

    return ok(res, rows);
  } catch (error) {
    console.error('[invites] listInvites failed', error);
    return fail(res, 500, { message: 'Failed to list invites' });
  }
});

router.post('/invites', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { email, role } = req.body || {};

    const { rows } = await pool.query(
      `INSERT INTO "Invite" (
        "recordId",
        "tenantId",
        "email",
        "role",
        "token",
        "expiresAt",
        "updatedAt"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), NOW() + INTERVAL '7 days', NOW())
      RETURNING *`,
      [tenantId, email, role || 'STAFF'],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[invites] createInvite failed', error);
    return fail(res, 500, { message: 'Failed to create invite' });
  }
});

module.exports = router;

