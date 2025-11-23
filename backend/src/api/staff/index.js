const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const listStaff = async (event, tenantId) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT s.*, m."role", u."name", u."email"
         FROM "Staff" s
         LEFT JOIN "Membership" m ON s."membershipId" = m."recordId"
         LEFT JOIN "User" u ON m."userId" = u."recordId"
         WHERE s."tenantId" = $1`,
    [tenantId],
  );
  return ok(event, 200, rows);
};

const createStaff = async (event, tenantId) => {
  const {
    membershipId,
    position,
    phone,
    emergencyContact,
  } = JSON.parse(event.body);
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO "Staff" ("recordId", "tenantId", "membershipId", "position", "phone", "emergencyContact", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
    [tenantId, membershipId, position, phone, emergencyContact],
  );
  return ok(event, 201, rows[0]);
};

const getStaffById = async (event, tenantId) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT s.*, m."role", u."name" as "userName", u."email" as "userEmail"
         FROM "Staff" s
         LEFT JOIN "Membership" m ON s."membershipId" = m."recordId"
         LEFT JOIN "User" u ON m."userId" = u."recordId"
         WHERE s."recordId" = $1 AND s."tenantId" = $2`,
    [event.pathParameters.staffId, tenantId],
  );
  if (rows.length === 0) {
    return fail(event, 404, { message: 'Staff member not found' });
  }
  return ok(event, 200, rows[0]);
};

const updateStaff = async (event, tenantId) => {
  const staffId = event.pathParameters.staffId;
  const body = JSON.parse(event.body || '{}');
  const pool = getPool();

  const fields = [];
  const values = [];
  let paramCount = 1;

  const updatableFields = ['membershipId', 'position', 'phone', 'emergencyContact', 'notes', 'hourlyRate', 'status'];

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
  const query = `UPDATE "Staff" SET ${setClause}, "updatedAt" = NOW() WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
  values.push(staffId, tenantId);

  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    return fail(event, 404, { message: 'Staff member not found or you do not have permission to update it' });
  }

  return ok(event, 200, rows[0]);
};

const deleteStaff = async (event, tenantId) => {
  const staffId = event.pathParameters.staffId;
  const pool = getPool();

  const checkResult = await pool.query(
    `SELECT COUNT(*) FROM "Schedule"
         WHERE "staffId" = $1 AND "tenantId" = $2
         AND "date" >= CURRENT_DATE`,
    [staffId, tenantId],
  );

  if (parseInt(checkResult.rows[0].count, 10) > 0) {
    return fail(event, 400, {
      message: 'Cannot delete staff member with active schedules. Please reassign or remove schedules first.',
    });
  }

  const { rowCount } = await pool.query(
    'DELETE FROM "Staff" WHERE "recordId" = $1 AND "tenantId" = $2',
    [staffId, tenantId],
  );

  if (rowCount === 0) {
    return fail(event, 404, { message: 'Staff member not found or you do not have permission to delete it' });
  }

  return ok(event, 204);
};

module.exports = {
  listStaff,
  createStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
};

