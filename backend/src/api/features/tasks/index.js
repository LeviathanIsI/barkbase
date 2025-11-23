const express = require('express');
const { getPool } = require('../../../lib/db');
const { ok, fail } = require('../../../lib/utils/responses');

const router = express.Router();

router.get('/tasks', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { type, date, status } = req.query || {};

    let query = `
        SELECT * FROM "Task"
        WHERE "tenantId" = $1`;
    const params = [tenantId];
    let paramCount = 2;

    if (type) {
      query += ` AND "type" = $${paramCount}`;
      params.push(type);
      paramCount += 1;
    }

    if (status) {
      query += ` AND "completedAt" ${status === 'completed' ? 'IS NOT NULL' : 'IS NULL'}`;
    }

    if (date) {
      query += ` AND DATE("scheduledFor") = $${paramCount}`;
      params.push(date);
      paramCount += 1;
    }

    query += ` ORDER BY "scheduledFor" ASC`;

    const { rows } = await pool.query(query, params);
    return ok(res, rows);
  } catch (error) {
    console.error('[tasks] listTasks failed', error);
    return fail(res, 500, { message: 'Failed to list tasks' });
  }
});

router.get('/tasks/:taskId', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { taskId } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM "Task" WHERE "recordId" = $1 AND "tenantId" = $2`,
      [taskId, tenantId],
    );

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Task not found' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[tasks] getTask failed', error);
    return fail(res, 500, { message: 'Failed to load task' });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const {
      type,
      relatedType,
      relatedId,
      assignedTo,
      scheduledFor,
      notes,
      priority,
    } = req.body || {};

    if (!type || !relatedType || !relatedId || !scheduledFor) {
      return fail(res, 400, { message: 'Missing required fields: type, relatedType, relatedId, scheduledFor' });
    }

    const { rows } = await pool.query(
      `INSERT INTO "Task" (
            "recordId", "tenantId", "type", "relatedType", "relatedId",
            "assignedTo", "scheduledFor", "notes", "priority", "createdAt", "updatedAt"
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`,
      [
        tenantId,
        type,
        relatedType,
        relatedId,
        assignedTo,
        scheduledFor,
        notes,
        priority || 'NORMAL',
      ],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[tasks] createTask failed', error);
    return fail(res, 500, { message: 'Failed to create task' });
  }
});

router.post('/tasks/:taskId/complete', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { taskId } = req.params;
    const body = req.body || {};
    const { notes, completedBy } = body;

    const { rows } = await pool.query(
      `UPDATE "Task"
         SET "completedAt" = NOW(),
             "completedBy" = $1,
             "notes" = COALESCE($2, "notes"),
             "updatedAt" = NOW()
       WHERE "recordId" = $3 AND "tenantId" = $4
       RETURNING *`,
      [completedBy, notes, taskId, tenantId],
    );

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Task not found' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[tasks] completeTask failed', error);
    return fail(res, 500, { message: 'Failed to complete task' });
  }
});

router.put('/tasks/:taskId', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { taskId } = req.params;
    const {
      type,
      relatedType,
      relatedId,
      assignedTo,
      scheduledFor,
      notes,
      priority,
    } = req.body || {};

    let updateQuery = `UPDATE "Task" SET "updatedAt" = NOW()`;
    const params = [];
    let paramCount = 1;

    if (type) { updateQuery += `, "type" = $${paramCount}`; params.push(type); paramCount += 1; }
    if (relatedType) { updateQuery += `, "relatedType" = $${paramCount}`; params.push(relatedType); paramCount += 1; }
    if (relatedId) { updateQuery += `, "relatedId" = $${paramCount}`; params.push(relatedId); paramCount += 1; }
    if (assignedTo !== undefined) { updateQuery += `, "assignedTo" = $${paramCount}`; params.push(assignedTo); paramCount += 1; }
    if (scheduledFor) { updateQuery += `, "scheduledFor" = $${paramCount}`; params.push(scheduledFor); paramCount += 1; }
    if (notes !== undefined) { updateQuery += `, "notes" = $${paramCount}`; params.push(notes); paramCount += 1; }
    if (priority) { updateQuery += `, "priority" = $${paramCount}`; params.push(priority); paramCount += 1; }

    updateQuery += ` WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
    params.push(taskId, tenantId);

    const { rows } = await pool.query(updateQuery, params);

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Task not found' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[tasks] updateTask failed', error);
    return fail(res, 500, { message: 'Failed to update task' });
  }
});

router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { taskId } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM "Task" WHERE "recordId" = $1 AND "tenantId" = $2`,
      [taskId, tenantId],
    );

    if (rowCount === 0) {
      return fail(res, 404, { message: 'Task not found' });
    }

    return ok(res, null, 204);
  } catch (error) {
    console.error('[tasks] deleteTask failed', error);
    return fail(res, 500, { message: 'Failed to delete task' });
  }
});

module.exports = router;

