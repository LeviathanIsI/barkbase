const { Router } = require('express');
const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT s.*, m."role", u."name", u."email"
         FROM "Staff" s
         LEFT JOIN "Membership" m ON s."membershipId" = m."recordId"
         LEFT JOIN "User" u ON m."userId" = u."recordId"
         WHERE s."tenantId" = $1`,
      [req.tenantId],
    );
    return ok(res, rows);
  } catch (error) {
    console.error('[staff] listStaff failed', error);
    return fail(res, 500, { message: 'Failed to list staff' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      membershipId,
      position,
      phone,
      emergencyContact,
    } = req.body || {};

    if (!membershipId || !position) {
      return fail(res, 400, { message: 'membershipId and position are required' });
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO "Staff" ("recordId", "tenantId", "membershipId", "position", "phone", "emergencyContact", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [req.tenantId, membershipId, position, phone, emergencyContact],
    );
    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[staff] createStaff failed', error);
    return fail(res, 500, { message: 'Failed to create staff member' });
  }
});

router.get('/:staffId', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT s.*, m."role", u."name" as "userName", u."email" as "userEmail"
         FROM "Staff" s
         LEFT JOIN "Membership" m ON s."membershipId" = m."recordId"
         LEFT JOIN "User" u ON m."userId" = u."recordId"
         WHERE s."recordId" = $1 AND s."tenantId" = $2`,
      [req.params.staffId, req.tenantId],
    );
    if (rows.length === 0) {
      return fail(res, 404, { message: 'Staff member not found' });
    }
    return ok(res, rows[0]);
  } catch (error) {
    console.error('[staff] getStaffById failed', error);
    return fail(res, 500, { message: 'Failed to load staff member' });
  }
});

router.put('/:staffId', async (req, res) => {
  try {
    const pool = getPool();

    const fields = [];
    const values = [];
    let paramCount = 1;

    const updatableFields = ['membershipId', 'position', 'phone', 'emergencyContact', 'notes', 'hourlyRate', 'status'];

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
    const query = `UPDATE "Staff" SET ${setClause}, "updatedAt" = NOW() WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
    values.push(req.params.staffId, req.tenantId);

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Staff member not found or you do not have permission to update it' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[staff] updateStaff failed', error);
    return fail(res, 500, { message: 'Failed to update staff member' });
  }
});

router.delete('/:staffId', async (req, res) => {
  try {
    const pool = getPool();

    const checkResult = await pool.query(
      `SELECT COUNT(*) FROM "Schedule"
         WHERE "staffId" = $1 AND "tenantId" = $2
         AND "date" >= CURRENT_DATE`,
      [req.params.staffId, req.tenantId],
    );

    if (parseInt(checkResult.rows[0].count, 10) > 0) {
      return fail(res, 400, {
        message: 'Cannot delete staff member with active schedules. Please reassign or remove schedules first.',
      });
    }

    const { rowCount } = await pool.query(
      'DELETE FROM "Staff" WHERE "recordId" = $1 AND "tenantId" = $2',
      [req.params.staffId, req.tenantId],
    );

    if (rowCount === 0) {
      return fail(res, 404, { message: 'Staff member not found or you do not have permission to delete it' });
    }

    return ok(res, null, 204);
  } catch (error) {
    console.error('[staff] deleteStaff failed', error);
    return fail(res, 500, { message: 'Failed to delete staff member' });
  }
});

module.exports = router;

