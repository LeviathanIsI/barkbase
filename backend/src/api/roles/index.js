const { Router } = require('express');
const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const router = Router();

/**
 * GET /api/v1/roles
 * List all roles for the current tenant
 */
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT record_id, name, description, is_system, created_at, updated_at
       FROM "Role"
       WHERE tenant_id = $1
       ORDER BY is_system DESC, name ASC`,
      [req.tenantId],
    );
    return ok(res, rows);
  } catch (error) {
    console.error('[roles] listRoles failed', error);
    return fail(res, 500, { message: 'Failed to list roles' });
  }
});

/**
 * POST /api/v1/roles
 * Create a new role
 */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body || {};

    if (!name || !name.trim()) {
      return fail(res, 400, { message: 'Role name is required' });
    }

    const pool = getPool();

    // Check if role with same name already exists
    const existing = await pool.query(
      `SELECT record_id FROM "Role" WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)`,
      [req.tenantId, name.trim()],
    );

    if (existing.rows.length > 0) {
      return fail(res, 409, { message: `Role "${name}" already exists` });
    }

    const { rows } = await pool.query(
      `INSERT INTO "Role" (tenant_id, name, description, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, false, NOW(), NOW())
       RETURNING record_id, name, description, is_system, created_at, updated_at`,
      [req.tenantId, name.trim(), description || null],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[roles] createRole failed', error);
    return fail(res, 500, { message: 'Failed to create role' });
  }
});

/**
 * PUT /api/v1/roles/:roleId
 * Update a role
 */
router.put('/:roleId', async (req, res) => {
  try {
    const { name, description } = req.body || {};
    const { roleId } = req.params;

    if (!name || !name.trim()) {
      return fail(res, 400, { message: 'Role name is required' });
    }

    const pool = getPool();

    // Check if role exists and is not a system role
    const roleCheck = await pool.query(
      `SELECT is_system FROM "Role" WHERE record_id = $1 AND tenant_id = $2`,
      [roleId, req.tenantId],
    );

    if (roleCheck.rows.length === 0) {
      return fail(res, 404, { message: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system) {
      return fail(res, 403, { message: 'Cannot modify system roles' });
    }

    // Check for duplicate name (excluding current role)
    const duplicate = await pool.query(
      `SELECT record_id FROM "Role" WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) AND record_id != $3`,
      [req.tenantId, name.trim(), roleId],
    );

    if (duplicate.rows.length > 0) {
      return fail(res, 409, { message: `Role "${name}" already exists` });
    }

    const { rows } = await pool.query(
      `UPDATE "Role" SET name = $1, description = $2, updated_at = NOW()
       WHERE record_id = $3 AND tenant_id = $4
       RETURNING record_id, name, description, is_system, created_at, updated_at`,
      [name.trim(), description || null, roleId, req.tenantId],
    );

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[roles] updateRole failed', error);
    return fail(res, 500, { message: 'Failed to update role' });
  }
});

/**
 * DELETE /api/v1/roles/:roleId
 * Delete a role
 */
router.delete('/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;
    const pool = getPool();

    // Check if role exists and is not a system role
    const roleCheck = await pool.query(
      `SELECT is_system FROM "Role" WHERE record_id = $1 AND tenant_id = $2`,
      [roleId, req.tenantId],
    );

    if (roleCheck.rows.length === 0) {
      return fail(res, 404, { message: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system) {
      return fail(res, 403, { message: 'Cannot delete system roles' });
    }

    // Check if role is in use
    const inUse = await pool.query(
      `SELECT COUNT(*) FROM "UserRole" WHERE role_id = $1 AND tenant_id = $2`,
      [roleId, req.tenantId],
    );

    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return fail(res, 400, { message: 'Cannot delete role that is assigned to users' });
    }

    await pool.query(
      `DELETE FROM "Role" WHERE record_id = $1 AND tenant_id = $2`,
      [roleId, req.tenantId],
    );

    return ok(res, null, 204);
  } catch (error) {
    console.error('[roles] deleteRole failed', error);
    return fail(res, 500, { message: 'Failed to delete role' });
  }
});

module.exports = router;
