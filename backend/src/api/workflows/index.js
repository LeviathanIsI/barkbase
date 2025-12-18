/**
 * Workflows API - Workflow automation management
 *
 * Endpoints:
 * - GET    /workflows                    - List all workflows
 * - GET    /workflows/:id                - Get workflow with steps
 * - POST   /workflows                    - Create new workflow
 * - PUT    /workflows/:id                - Update workflow
 * - DELETE /workflows/:id                - Delete workflow (soft delete)
 * - POST   /workflows/:id/clone          - Clone a workflow
 * - POST   /workflows/:id/activate       - Activate workflow
 * - POST   /workflows/:id/pause          - Pause workflow
 *
 * Steps:
 * - GET    /workflows/:id/steps          - Get all steps for workflow
 * - PUT    /workflows/:id/steps          - Update workflow steps (full replacement)
 *
 * Executions:
 * - GET    /workflows/:id/executions     - List executions
 * - POST   /workflows/:id/enroll         - Manually enroll a record
 * - DELETE /workflows/:id/enrollments/:enrollmentId - Unenroll
 * - POST   /workflows/:id/executions/:executionId/cancel - Cancel execution
 *
 * Templates:
 * - GET    /workflows/templates          - List templates
 * - GET    /workflows/templates/:id      - Get template
 * - POST   /workflows/templates/:id/use  - Create from template
 *
 * Analytics:
 * - GET    /workflows/:id/analytics      - Performance metrics
 * - GET    /workflows/:id/history        - Execution logs
 * - GET    /workflows/stats              - Overall stats
 *
 * Folders:
 * - GET    /workflows/folders            - List folders
 * - POST   /workflows/folders            - Create folder
 * - PUT    /workflows/folders/:id        - Update folder
 * - DELETE /workflows/folders/:id        - Delete folder
 */

const express = require('express');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const router = express.Router();

// Initialize SQS client for workflow execution
const sqs = new SQSClient({
  region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
});

const WORKFLOW_STEP_QUEUE_URL = process.env.WORKFLOW_STEP_QUEUE_URL;

/**
 * Queue a workflow step for execution
 * @param {string} executionId - The execution ID
 * @param {string} workflowId - The workflow ID
 * @param {string} tenantId - The tenant ID
 * @param {string} [stepId] - Optional specific step ID to process
 */
async function queueStepExecution(executionId, workflowId, tenantId, stepId = null) {
  console.log('[SQS] ========== QUEUE STEP EXECUTION ==========');
  console.log('[SQS] Execution ID:', executionId);
  console.log('[SQS] Workflow ID:', workflowId);
  console.log('[SQS] Tenant ID:', tenantId);
  console.log('[SQS] Step ID:', stepId);
  console.log('[SQS] Queue URL:', WORKFLOW_STEP_QUEUE_URL);

  if (!WORKFLOW_STEP_QUEUE_URL) {
    console.log('[SQS] WARNING: No SQS queue URL configured!');
    console.log('[SQS] WORKFLOW_STEP_QUEUE_URL env var is:', process.env.WORKFLOW_STEP_QUEUE_URL);
    return null;
  }

  const messageBody = {
    executionId,
    workflowId,
    tenantId,
    stepId,
    action: 'execute_next',
    timestamp: new Date().toISOString(),
  };

  console.log('[SQS] Message body:', JSON.stringify(messageBody, null, 2));

  try {
    const result = await sqs.send(new SendMessageCommand({
      QueueUrl: WORKFLOW_STEP_QUEUE_URL,
      MessageBody: JSON.stringify(messageBody),
      MessageAttributes: {
        executionId: {
          DataType: 'String',
          StringValue: executionId,
        },
      },
    }));
    console.log('[SQS] SUCCESS! Message ID:', result.MessageId);
    console.log('[SQS] Full result:', JSON.stringify(result, null, 2));
    console.log('[SQS] ========== QUEUE COMPLETE ==========');
    return result.MessageId;
  } catch (error) {
    console.error('[SQS] FAILED to send message:', error);
    console.error('[SQS] Error name:', error.name);
    console.error('[SQS] Error message:', error.message);
    console.error('[SQS] Error stack:', error.stack);
    console.log('[SQS] ========== QUEUE FAILED ==========');
    return null;
  }
}

// =============================================================================
// WORKFLOW CRUD
// =============================================================================

/**
 * List all workflows
 */
router.get('/workflows', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { status, objectType, folderId, search, limit = 50, offset = 0 } = req.query || {};

    let query = `
      SELECT 
        id, tenant_id, name, description, object_type, status,
        entry_condition, settings, folder_id,
        enrolled_count, completed_count, last_run_at,
        deleted_at, created_by, created_at, updated_at
      FROM "Workflow"
      WHERE tenant_id = $1`;
    const params = [tenantId];
    let paramCount = 2;

    // By default, exclude deleted workflows unless specifically querying deleted tab
    if (!req.query.includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount += 1;
    }

    if (objectType) {
      query += ` AND object_type = $${paramCount}`;
      params.push(objectType);
      paramCount += 1;
    }

    if (folderId) {
      query += ` AND folder_id = $${paramCount}`;
      params.push(folderId);
      paramCount += 1;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount += 1;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const { rows } = await pool.query(query, params);
    return ok(res, { workflows: rows });
  } catch (error) {
    console.error('[workflows] listWorkflows failed', error);
    return fail(res, 500, { message: 'Failed to list workflows' });
  }
});

/**
 * Get workflow by ID with steps
 */
router.get('/workflows/:id', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM "Workflow" WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[workflows] getWorkflow failed', error);
    return fail(res, 500, { message: 'Failed to load workflow' });
  }
});

/**
 * Create new workflow
 */
router.post('/workflows', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const userId = req.userId;
    const {
      name,
      description,
      object_type,
      status = 'draft',
      entry_condition = {},
      settings = {},
      folder_id,
    } = req.body || {};

    if (!name || !object_type) {
      return fail(res, 400, { message: 'Missing required fields: name, object_type' });
    }

    const { rows } = await pool.query(
      `INSERT INTO "Workflow" (
        id, tenant_id, name, description, object_type, status,
        entry_condition, settings, folder_id, created_by, created_at, updated_at
      )
      VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      )
      RETURNING *`,
      [
        tenantId,
        name,
        description || null,
        object_type,
        status,
        JSON.stringify(entry_condition),
        JSON.stringify(settings),
        folder_id || null,
        userId,
      ],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[workflows] createWorkflow failed', error);
    return fail(res, 500, { message: 'Failed to create workflow' });
  }
});

/**
 * Update workflow
 */
router.put('/workflows/:id', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;
    const {
      name,
      description,
      object_type,
      status,
      entry_condition,
      settings,
      folder_id,
      goal_config,
      suppression_segment_ids,
      timing_config,
      start_step_id,
    } = req.body || {};

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount += 1;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(description);
      paramCount += 1;
    }
    if (object_type !== undefined) {
      updates.push(`object_type = $${paramCount}`);
      params.push(object_type);
      paramCount += 1;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount += 1;
    }
    if (entry_condition !== undefined) {
      updates.push(`entry_condition = $${paramCount}`);
      params.push(JSON.stringify(entry_condition));
      paramCount += 1;
    }
    if (settings !== undefined) {
      updates.push(`settings = $${paramCount}`);
      params.push(JSON.stringify(settings));
      paramCount += 1;
    }
    if (folder_id !== undefined) {
      updates.push(`folder_id = $${paramCount}`);
      params.push(folder_id);
      paramCount += 1;
    }
    if (goal_config !== undefined) {
      updates.push(`goal_config = $${paramCount}`);
      params.push(JSON.stringify(goal_config));
      paramCount += 1;
    }
    if (suppression_segment_ids !== undefined) {
      updates.push(`suppression_segment_ids = $${paramCount}`);
      params.push(suppression_segment_ids);
      paramCount += 1;
    }
    if (timing_config !== undefined) {
      updates.push(`timing_config = $${paramCount}`);
      params.push(JSON.stringify(timing_config));
      paramCount += 1;
    }
    if (start_step_id !== undefined) {
      updates.push(`start_step_id = $${paramCount}`);
      params.push(start_step_id);
      paramCount += 1;
    }

    if (updates.length === 0) {
      return fail(res, 400, { message: 'No fields to update' });
    }

    // Always increment revision and update timestamp
    updates.push('revision = revision + 1');
    updates.push('updated_at = NOW()');

    const query = `
      UPDATE "Workflow"
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING *`;
    params.push(id, tenantId);

    const { rows } = await pool.query(query, params);

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[workflows] updateWorkflow failed', error);
    return fail(res, 500, { message: 'Failed to update workflow' });
  }
});

/**
 * Delete workflow (soft delete)
 */
router.delete('/workflows/:id', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;

    const { rows } = await pool.query(
      `UPDATE "Workflow"
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    return ok(res, null, 204);
  } catch (error) {
    console.error('[workflows] deleteWorkflow failed', error);
    return fail(res, 500, { message: 'Failed to delete workflow' });
  }
});

/**
 * Clone workflow
 */
router.post('/workflows/:id/clone', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const userId = req.userId;
    const { id } = req.params;

    // Get original workflow
    const { rows: originalRows } = await pool.query(
      `SELECT * FROM "Workflow" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );

    if (originalRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    const original = originalRows[0];

    // Create cloned workflow
    const { rows: newRows } = await pool.query(
      `INSERT INTO "Workflow" (
        id, tenant_id, name, description, object_type, status,
        entry_condition, settings, folder_id, created_by, created_at, updated_at
      )
      VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, 'draft', $5, $6, $7, $8, NOW(), NOW()
      )
      RETURNING *`,
      [
        tenantId,
        `${original.name} (Copy)`,
        original.description,
        original.object_type,
        JSON.stringify(original.entry_condition),
        JSON.stringify(original.settings),
        original.folder_id,
        userId,
      ],
    );

    const newWorkflow = newRows[0];

    // Clone steps
    const { rows: originalSteps } = await pool.query(
      `SELECT * FROM "WorkflowStep" WHERE workflow_id = $1 ORDER BY position`,
      [id],
    );

    // Create mapping of old IDs to new IDs for step references
    const stepIdMap = {};

    for (const step of originalSteps) {
      const { rows: newStepRows } = await pool.query(
        `INSERT INTO "WorkflowStep" (
          id, workflow_id, parent_step_id, branch_id, position,
          step_type, action_type, config, created_at, updated_at
        )
        VALUES (
          uuid_generate_v4(), $1, NULL, $2, $3, $4, $5, $6, NOW(), NOW()
        )
        RETURNING id`,
        [
          newWorkflow.id,
          step.branch_id,
          step.position,
          step.step_type,
          step.action_type,
          JSON.stringify(step.config),
        ],
      );
      stepIdMap[step.id] = newStepRows[0].id;
    }

    // Update parent_step_id references for cloned steps
    for (const step of originalSteps) {
      if (step.parent_step_id && stepIdMap[step.parent_step_id]) {
        await pool.query(
          `UPDATE "WorkflowStep" SET parent_step_id = $1 WHERE id = $2`,
          [stepIdMap[step.parent_step_id], stepIdMap[step.id]],
        );
      }
    }

    return ok(res, newWorkflow, 201);
  } catch (error) {
    console.error('[workflows] cloneWorkflow failed', error);
    return fail(res, 500, { message: 'Failed to clone workflow' });
  }
});

/**
 * Activate workflow
 */
router.post('/workflows/:id/activate', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;

    console.log('[WORKFLOW API] ========== ACTIVATE WORKFLOW ==========');
    console.log('[WORKFLOW API] Workflow ID:', id);
    console.log('[WORKFLOW API] Tenant ID:', tenantId);

    // Get workflow BEFORE updating to see current state
    const { rows: beforeRows } = await pool.query(
      `SELECT * FROM "Workflow" WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    console.log('[WORKFLOW API] Workflow BEFORE update:', JSON.stringify(beforeRows[0], null, 2));

    const { rows } = await pool.query(
      `UPDATE "Workflow"
       SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      console.log('[WORKFLOW API] Workflow not found!');
      return fail(res, 404, { message: 'Workflow not found' });
    }

    const workflow = rows[0];
    console.log('[WORKFLOW API] Workflow AFTER update:', JSON.stringify(workflow, null, 2));
    console.log('[WORKFLOW API] Entry condition:', JSON.stringify(workflow.entry_condition, null, 2));
    console.log('[WORKFLOW API] Trigger type:', workflow.entry_condition?.trigger_type);
    console.log('[WORKFLOW API] Object type:', workflow.object_type);
    console.log('[WORKFLOW API] Settings:', JSON.stringify(workflow.settings, null, 2));
    console.log('[WORKFLOW API] ========== ACTIVATE COMPLETE ==========');

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[WORKFLOW API] activateWorkflow FAILED:', error);
    return fail(res, 500, { message: 'Failed to activate workflow' });
  }
});

/**
 * Pause workflow
 */
router.post('/workflows/:id/pause', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;

    const { rows } = await pool.query(
      `UPDATE "Workflow"
       SET status = 'paused', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, tenantId],
    );

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[workflows] pauseWorkflow failed', error);
    return fail(res, 500, { message: 'Failed to pause workflow' });
  }
});

/**
 * Get count of records matching workflow trigger criteria
 * Used for "Enroll existing records?" dialog
 */
router.get('/workflows/:id/matching-records-count', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;

    // Get workflow with entry condition
    const { rows: workflowRows } = await pool.query(
      `SELECT id, object_type, entry_condition, settings FROM "Workflow"
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );

    if (workflowRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    const workflow = workflowRows[0];
    const objectType = workflow.object_type;
    const entryCondition = workflow.entry_condition || {};
    const filterConfig = entryCondition.filterConfig || entryCondition.filter || {};

    // Determine which table to query based on object type
    const tableMap = {
      pet: 'Pet',
      booking: 'Booking',
      owner: 'Owner',
      contact: 'Owner', // Contact maps to Owner
      invoice: 'Invoice',
      payment: 'Payment',
      task: 'Task',
    };

    const tableName = tableMap[objectType];
    if (!tableName) {
      return ok(res, { count: 0, error: `Unknown object type: ${objectType}` });
    }

    // Build WHERE clause from filter config
    let whereClause = 'tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    // Parse filter groups if present
    if (filterConfig.groups && filterConfig.groups.length > 0) {
      const groupConditions = [];

      for (const group of filterConfig.groups) {
        if (!group.conditions || group.conditions.length === 0) continue;

        const conditionClauses = [];
        for (const condition of group.conditions) {
          const { field, operator, value } = condition;
          if (!field || !operator) continue;

          // Map field names to database columns
          const fieldMap = {
            name: 'name',
            status: 'status',
            species: 'species',
            breed: 'breed',
            sex: 'sex',
            is_neutered: 'is_neutered',
            weight: 'weight',
            color: 'color',
            email: 'email',
            phone: 'phone',
            city: 'city',
            state: 'state',
          };

          const dbField = fieldMap[field] || field;

          switch (operator) {
            case 'equals':
            case 'is':
              conditionClauses.push(`"${dbField}" = $${paramIndex}`);
              params.push(value);
              paramIndex++;
              break;
            case 'not_equals':
            case 'is_not':
              conditionClauses.push(`"${dbField}" != $${paramIndex}`);
              params.push(value);
              paramIndex++;
              break;
            case 'contains':
              conditionClauses.push(`"${dbField}" ILIKE $${paramIndex}`);
              params.push(`%${value}%`);
              paramIndex++;
              break;
            case 'starts_with':
              conditionClauses.push(`"${dbField}" ILIKE $${paramIndex}`);
              params.push(`${value}%`);
              paramIndex++;
              break;
            case 'ends_with':
              conditionClauses.push(`"${dbField}" ILIKE $${paramIndex}`);
              params.push(`%${value}`);
              paramIndex++;
              break;
            case 'is_empty':
              conditionClauses.push(`("${dbField}" IS NULL OR "${dbField}" = '')`);
              break;
            case 'is_not_empty':
              conditionClauses.push(`("${dbField}" IS NOT NULL AND "${dbField}" != '')`);
              break;
            case 'greater_than':
              conditionClauses.push(`"${dbField}" > $${paramIndex}`);
              params.push(value);
              paramIndex++;
              break;
            case 'less_than':
              conditionClauses.push(`"${dbField}" < $${paramIndex}`);
              params.push(value);
              paramIndex++;
              break;
            case 'in':
            case 'is_any_of':
              if (Array.isArray(value) && value.length > 0) {
                const placeholders = value.map(() => `$${paramIndex++}`);
                conditionClauses.push(`"${dbField}" IN (${placeholders.join(', ')})`);
                params.push(...value);
              }
              break;
            default:
              // Default to equals
              conditionClauses.push(`"${dbField}" = $${paramIndex}`);
              params.push(value);
              paramIndex++;
          }
        }

        if (conditionClauses.length > 0) {
          const groupLogic = group.logic || 'AND';
          groupConditions.push(`(${conditionClauses.join(` ${groupLogic} `)})`);
        }
      }

      if (groupConditions.length > 0) {
        const mainLogic = filterConfig.logic || 'AND';
        whereClause += ` AND (${groupConditions.join(` ${mainLogic} `)})`;
      }
    }

    // Exclude already enrolled records if re-enrollment is disabled
    const settings = workflow.settings || {};
    if (!settings.allowReenrollment) {
      whereClause += ` AND id NOT IN (
        SELECT record_id FROM "WorkflowExecution"
        WHERE workflow_id = $${paramIndex} AND status IN ('running', 'paused', 'completed')
      )`;
      params.push(id);
    }

    // Count matching records
    const countQuery = `SELECT COUNT(*) as count FROM "${tableName}" WHERE ${whereClause}`;
    console.log('[WORKFLOW API] Matching records query:', countQuery);
    console.log('[WORKFLOW API] Params:', params);

    const { rows: countRows } = await pool.query(countQuery, params);
    const count = parseInt(countRows[0].count, 10);

    return ok(res, {
      count,
      objectType,
      triggerType: entryCondition.triggerType || entryCondition.trigger_type,
      filterApplied: !!(filterConfig.groups && filterConfig.groups.length > 0),
    });
  } catch (error) {
    console.error('[workflows] getMatchingRecordsCount failed', error);
    return fail(res, 500, { message: 'Failed to count matching records' });
  }
});

/**
 * Get workflow dependencies (what this workflow uses)
 */
router.get('/workflows/:id/dependencies', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;

    // Get workflow
    const { rows: workflowRows } = await pool.query(
      `SELECT id, name, entry_condition, settings FROM "Workflow"
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );

    if (workflowRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    const workflow = workflowRows[0];

    // Get steps that reference other workflows (enroll_in_workflow action)
    const { rows: enrollSteps } = await pool.query(
      `SELECT ws.id, ws.name, ws.config, w.name as target_workflow_name
       FROM "WorkflowStep" ws
       LEFT JOIN "Workflow" w ON w.id = (ws.config->>'workflowId')::uuid
       WHERE ws.workflow_id = $1 AND ws.action_type = 'enroll_in_workflow'`,
      [id],
    );

    // Get steps that create tasks (references task templates)
    const { rows: taskSteps } = await pool.query(
      `SELECT ws.id, ws.name, ws.config
       FROM "WorkflowStep" ws
       WHERE ws.workflow_id = $1 AND ws.action_type = 'create_task'`,
      [id],
    );

    // Get steps that send emails (references email templates)
    const { rows: emailSteps } = await pool.query(
      `SELECT ws.id, ws.name, ws.config
       FROM "WorkflowStep" ws
       WHERE ws.workflow_id = $1 AND ws.action_type = 'send_email'`,
      [id],
    );

    return ok(res, {
      workflows: enrollSteps.map((s) => ({
        stepId: s.id,
        stepName: s.name,
        targetWorkflowId: s.config?.workflowId,
        targetWorkflowName: s.target_workflow_name,
      })),
      tasks: taskSteps.map((s) => ({
        stepId: s.id,
        stepName: s.name,
        taskConfig: s.config,
      })),
      emails: emailSteps.map((s) => ({
        stepId: s.id,
        stepName: s.name,
        emailConfig: s.config,
      })),
      properties: [], // Could add field update analysis
      segments: [], // Could add segment references
    });
  } catch (error) {
    console.error('[workflows] getDependencies failed', error);
    return fail(res, 500, { message: 'Failed to load dependencies' });
  }
});

/**
 * Get workflows that use this workflow
 */
router.get('/workflows/:id/used-by', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;

    // Find workflows that enroll into this workflow
    const { rows } = await pool.query(
      `SELECT DISTINCT w.id, w.name, w.status, ws.name as step_name
       FROM "Workflow" w
       JOIN "WorkflowStep" ws ON ws.workflow_id = w.id
       WHERE w.tenant_id = $1
         AND w.deleted_at IS NULL
         AND ws.action_type = 'enroll_in_workflow'
         AND ws.config->>'workflowId' = $2`,
      [tenantId, id],
    );

    return ok(res, {
      workflows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        stepName: r.step_name,
      })),
    });
  } catch (error) {
    console.error('[workflows] getUsedBy failed', error);
    return fail(res, 500, { message: 'Failed to load used-by' });
  }
});

/**
 * Activate workflow with optional immediate enrollment
 */
router.post('/workflows/:id/activate-with-enrollment', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { enrollExisting = false } = req.body || {};

    console.log('[WORKFLOW API] ========== ACTIVATE WITH ENROLLMENT ==========');
    console.log('[WORKFLOW API] Workflow ID:', id);
    console.log('[WORKFLOW API] Tenant ID:', tenantId);
    console.log('[WORKFLOW API] Enroll existing:', enrollExisting);

    // Get workflow before activating
    const { rows: beforeRows } = await pool.query(
      `SELECT * FROM "Workflow" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );

    if (beforeRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    const workflow = beforeRows[0];

    // Activate the workflow
    const { rows } = await pool.query(
      `UPDATE "Workflow"
       SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, tenantId],
    );

    const activatedWorkflow = rows[0];

    // If enrollExisting is true and this is a filter_criteria workflow, enroll matching records
    let enrollmentResult = null;
    const entryCondition = workflow.entry_condition || {};
    const triggerType = entryCondition.triggerType || entryCondition.trigger_type;

    if (enrollExisting && triggerType === 'filter_criteria') {
      console.log('[WORKFLOW API] Enrolling existing records...');
      enrollmentResult = await enrollMatchingRecords(pool, id, tenantId, workflow);
      console.log('[WORKFLOW API] Enrollment result:', enrollmentResult);
    }

    console.log('[WORKFLOW API] ========== ACTIVATE WITH ENROLLMENT COMPLETE ==========');

    return ok(res, {
      workflow: activatedWorkflow,
      enrollment: enrollmentResult,
    });
  } catch (error) {
    console.error('[WORKFLOW API] activateWithEnrollment FAILED:', error);
    return fail(res, 500, { message: 'Failed to activate workflow' });
  }
});

/**
 * Helper: Enroll all matching records into a workflow
 */
async function enrollMatchingRecords(pool, workflowId, tenantId, workflow) {
  const objectType = workflow.object_type;
  const entryCondition = workflow.entry_condition || {};
  const filterConfig = entryCondition.filterConfig || entryCondition.filter || {};
  const settings = workflow.settings || {};

  const tableMap = {
    pet: 'Pet',
    booking: 'Booking',
    owner: 'Owner',
    contact: 'Owner',
    invoice: 'Invoice',
    payment: 'Payment',
    task: 'Task',
  };

  const tableName = tableMap[objectType];
  if (!tableName) {
    return { enrolled: 0, error: `Unknown object type: ${objectType}` };
  }

  // Build WHERE clause (same logic as matching-records-count)
  let whereClause = 'tenant_id = $1';
  const params = [tenantId];
  let paramIndex = 2;

  if (filterConfig.groups && filterConfig.groups.length > 0) {
    const groupConditions = [];

    for (const group of filterConfig.groups) {
      if (!group.conditions || group.conditions.length === 0) continue;

      const conditionClauses = [];
      for (const condition of group.conditions) {
        const { field, operator, value } = condition;
        if (!field || !operator) continue;

        const fieldMap = {
          name: 'name',
          status: 'status',
          species: 'species',
          breed: 'breed',
          sex: 'sex',
          is_neutered: 'is_neutered',
          weight: 'weight',
          color: 'color',
          email: 'email',
          phone: 'phone',
        };

        const dbField = fieldMap[field] || field;

        switch (operator) {
          case 'equals':
          case 'is':
            conditionClauses.push(`"${dbField}" = $${paramIndex}`);
            params.push(value);
            paramIndex++;
            break;
          case 'contains':
            conditionClauses.push(`"${dbField}" ILIKE $${paramIndex}`);
            params.push(`%${value}%`);
            paramIndex++;
            break;
          case 'in':
          case 'is_any_of':
            if (Array.isArray(value) && value.length > 0) {
              const placeholders = value.map(() => `$${paramIndex++}`);
              conditionClauses.push(`"${dbField}" IN (${placeholders.join(', ')})`);
              params.push(...value);
            }
            break;
          default:
            conditionClauses.push(`"${dbField}" = $${paramIndex}`);
            params.push(value);
            paramIndex++;
        }
      }

      if (conditionClauses.length > 0) {
        const groupLogic = group.logic || 'AND';
        groupConditions.push(`(${conditionClauses.join(` ${groupLogic} `)})`);
      }
    }

    if (groupConditions.length > 0) {
      const mainLogic = filterConfig.logic || 'AND';
      whereClause += ` AND (${groupConditions.join(` ${mainLogic} `)})`;
    }
  }

  // Exclude already enrolled
  if (!settings.allowReenrollment) {
    whereClause += ` AND id NOT IN (
      SELECT record_id FROM "WorkflowExecution"
      WHERE workflow_id = $${paramIndex}
    )`;
    params.push(workflowId);
  }

  // Get matching records
  const selectQuery = `SELECT id FROM "${tableName}" WHERE ${whereClause} LIMIT 1000`;
  console.log('[WORKFLOW API] Enrollment query:', selectQuery);

  const { rows: records } = await pool.query(selectQuery, params);
  console.log('[WORKFLOW API] Found', records.length, 'records to enroll');

  if (records.length === 0) {
    return { enrolled: 0, records: [] };
  }

  // Get first step
  const { rows: stepRows } = await pool.query(
    `SELECT id FROM "WorkflowStep" WHERE workflow_id = $1 ORDER BY position LIMIT 1`,
    [workflowId],
  );

  const firstStepId = stepRows.length > 0 ? stepRows[0].id : null;

  // Enroll each record
  let enrolled = 0;
  const enrolledIds = [];

  for (const record of records) {
    try {
      const { rows: execRows } = await pool.query(
        `INSERT INTO "WorkflowExecution" (
          id, workflow_id, tenant_id, record_id, record_type,
          status, current_step_id, enrolled_at, created_at, updated_at
        )
        VALUES (
          uuid_generate_v4(), $1, $2, $3, $4, 'running', $5, NOW(), NOW(), NOW()
        )
        RETURNING id`,
        [workflowId, tenantId, record.id, objectType, firstStepId],
      );

      if (execRows.length > 0 && firstStepId) {
        // Queue first step
        await queueStepExecution(execRows[0].id, workflowId, tenantId);
        enrolled++;
        enrolledIds.push(record.id);
      }
    } catch (err) {
      console.error('[WORKFLOW API] Error enrolling record:', record.id, err.message);
    }
  }

  // Update workflow counts
  await pool.query(
    `UPDATE "Workflow" SET
      enrolled_count = enrolled_count + $1,
      active_count = active_count + $1,
      last_run_at = NOW()
     WHERE id = $2`,
    [enrolled, workflowId],
  );

  return { enrolled, total: records.length, enrolledIds };
}

// =============================================================================
// WORKFLOW STEPS
// =============================================================================

/**
 * Get workflow steps
 */
router.get('/workflows/:id/steps', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;

    // Verify workflow belongs to tenant
    const { rows: workflowRows } = await pool.query(
      `SELECT id FROM "Workflow" WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (workflowRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM "WorkflowStep" WHERE workflow_id = $1 ORDER BY position`,
      [id],
    );

    return ok(res, { steps: rows });
  } catch (error) {
    console.error('[workflows] getWorkflowSteps failed', error);
    return fail(res, 500, { message: 'Failed to load workflow steps' });
  }
});

/**
 * Update workflow steps (full replacement)
 * Supports HubSpot-style step flow connections
 */
router.put('/workflows/:id/steps', async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { steps = [] } = req.body || {};

    await client.query('BEGIN');

    // Verify workflow belongs to tenant
    const { rows: workflowRows } = await client.query(
      `SELECT id, revision FROM "Workflow" WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (workflowRows.length === 0) {
      await client.query('ROLLBACK');
      return fail(res, 404, { message: 'Workflow not found' });
    }

    // Delete existing steps
    await client.query(`DELETE FROM "WorkflowStep" WHERE workflow_id = $1`, [id]);

    // First pass: Insert all steps with temporary IDs to get real UUIDs
    const insertedSteps = [];
    const tempIdToRealId = {}; // Map client temp IDs to database UUIDs

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const { rows: newStepRows } = await client.query(
        `INSERT INTO "WorkflowStep" (
          id, workflow_id, parent_step_id, branch_id, position,
          step_type, action_type, name, config, created_at, updated_at
        )
        VALUES (
          uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
        )
        RETURNING *`,
        [
          id,
          null, // Will update parent_step_id in second pass
          step.branch_id || null,
          i,
          step.step_type,
          step.action_type || null,
          step.name || null,
          JSON.stringify(step.config || {}),
        ],
      );
      const newStep = newStepRows[0];
      insertedSteps.push(newStep);

      // Track temp ID mapping if provided
      if (step.id || step.temp_id) {
        tempIdToRealId[step.id || step.temp_id] = newStep.id;
      }
      // Also map by index as fallback
      tempIdToRealId[`idx_${i}`] = newStep.id;
    }

    // Second pass: Update flow connections and parent references
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const realStepId = insertedSteps[i].id;
      const updates = [];
      const params = [];
      let paramCount = 1;

      // Resolve parent_step_id
      if (step.parent_step_id) {
        const resolvedParentId = tempIdToRealId[step.parent_step_id] || step.parent_step_id;
        updates.push(`parent_step_id = $${paramCount}`);
        params.push(resolvedParentId);
        paramCount += 1;
      }

      // Resolve next_step_id
      if (step.next_step_id) {
        const resolvedNextId = tempIdToRealId[step.next_step_id] || step.next_step_id;
        updates.push(`next_step_id = $${paramCount}`);
        params.push(resolvedNextId);
        paramCount += 1;
      }

      // Resolve yes_step_id (for determinators)
      if (step.yes_step_id) {
        const resolvedYesId = tempIdToRealId[step.yes_step_id] || step.yes_step_id;
        updates.push(`yes_step_id = $${paramCount}`);
        params.push(resolvedYesId);
        paramCount += 1;
      }

      // Resolve no_step_id (for determinators)
      if (step.no_step_id) {
        const resolvedNoId = tempIdToRealId[step.no_step_id] || step.no_step_id;
        updates.push(`no_step_id = $${paramCount}`);
        params.push(resolvedNoId);
        paramCount += 1;
      }

      // Only update if there are changes
      if (updates.length > 0) {
        params.push(realStepId);
        await client.query(
          `UPDATE "WorkflowStep" SET ${updates.join(', ')} WHERE id = $${paramCount}`,
          params,
        );
      }
    }

    // Update workflow: increment revision, set start_step_id, update timestamp
    const startStepId = insertedSteps.length > 0 ? insertedSteps[0].id : null;
    await client.query(
      `UPDATE "Workflow" SET
        revision = revision + 1,
        start_step_id = $1,
        updated_at = NOW()
      WHERE id = $2`,
      [startStepId, id],
    );

    // Fetch final steps with resolved IDs
    const { rows: finalSteps } = await client.query(
      `SELECT * FROM "WorkflowStep" WHERE workflow_id = $1 ORDER BY position`,
      [id],
    );

    await client.query('COMMIT');

    return ok(res, { steps: finalSteps });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[workflows] updateWorkflowSteps failed', error);
    return fail(res, 500, { message: 'Failed to update workflow steps' });
  } finally {
    client.release();
  }
});

// =============================================================================
// EXECUTIONS / ENROLLMENTS
// =============================================================================

/**
 * Get workflow executions
 */
router.get('/workflows/:id/executions', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { status, limit = 50, offset = 0 } = req.query || {};

    // Verify workflow belongs to tenant
    const { rows: workflowRows } = await pool.query(
      `SELECT id FROM "Workflow" WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (workflowRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    let query = `
      SELECT * FROM "WorkflowExecution"
      WHERE workflow_id = $1 AND tenant_id = $2`;
    const params = [id, tenantId];
    let paramCount = 3;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount += 1;
    }

    query += ` ORDER BY enrolled_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const { rows } = await pool.query(query, params);

    return ok(res, { executions: rows });
  } catch (error) {
    console.error('[workflows] getWorkflowExecutions failed', error);
    return fail(res, 500, { message: 'Failed to load workflow executions' });
  }
});

/**
 * Manually enroll a record
 */
router.post('/workflows/:id/enroll', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { record_id, record_type } = req.body || {};

    console.log('[WORKFLOW API] ========== MANUAL ENROLL ==========');
    console.log('[WORKFLOW API] Workflow ID:', id);
    console.log('[WORKFLOW API] Tenant ID:', tenantId);
    console.log('[WORKFLOW API] Record ID:', record_id);
    console.log('[WORKFLOW API] Record Type:', record_type);

    if (!record_id || !record_type) {
      console.log('[WORKFLOW API] Missing required fields!');
      return fail(res, 400, { message: 'Missing required fields: record_id, record_type' });
    }

    // Verify workflow belongs to tenant and get current revision
    const { rows: workflowRows } = await pool.query(
      `SELECT id, object_type, status, revision, start_step_id FROM "Workflow"
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );

    if (workflowRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    const workflow = workflowRows[0];
    console.log('[WORKFLOW API] Workflow found:', JSON.stringify(workflow, null, 2));

    if (workflow.object_type !== record_type) {
      console.log('[WORKFLOW API] Object type mismatch! Expected:', workflow.object_type, 'Got:', record_type);
      return fail(res, 400, { message: `Workflow expects ${workflow.object_type} records, got ${record_type}` });
    }

    // Check if already enrolled
    console.log('[WORKFLOW API] Checking if already enrolled...');
    const { rows: existingRows } = await pool.query(
      `SELECT id, enrollment_count FROM "WorkflowExecution"
       WHERE workflow_id = $1 AND record_id = $2 AND status IN ('running', 'paused')`,
      [id, record_id],
    );
    console.log('[WORKFLOW API] Existing enrollments:', existingRows.length);

    if (existingRows.length > 0) {
      console.log('[WORKFLOW API] Already enrolled! Execution ID:', existingRows[0].id);
      return fail(res, 409, { message: 'Record is already enrolled in this workflow' });
    }

    // Get first step (use start_step_id or fallback to first by position)
    console.log('[WORKFLOW API] Getting first step. start_step_id:', workflow.start_step_id);
    let currentStepId = workflow.start_step_id;
    if (!currentStepId) {
      const { rows: stepRows } = await pool.query(
        `SELECT id FROM "WorkflowStep" WHERE workflow_id = $1 ORDER BY position LIMIT 1`,
        [id],
      );
      currentStepId = stepRows.length > 0 ? stepRows[0].id : null;
      console.log('[WORKFLOW API] First step by position:', currentStepId);
    }
    console.log('[WORKFLOW API] Current step ID:', currentStepId);

    // Check for re-enrollment count
    const { rows: previousEnrollments } = await pool.query(
      `SELECT MAX(enrollment_count) as max_count FROM "WorkflowExecution"
       WHERE workflow_id = $1 AND record_id = $2`,
      [id, record_id],
    );
    const enrollmentCount = (previousEnrollments[0]?.max_count || 0) + 1;
    console.log('[WORKFLOW API] Enrollment count:', enrollmentCount);

    // Create enrollment with workflow revision tracking
    console.log('[WORKFLOW API] Creating enrollment...');
    const { rows } = await pool.query(
      `INSERT INTO "WorkflowExecution" (
        id, workflow_id, tenant_id, record_id, record_type,
        status, current_step_id, workflow_revision, enrollment_count,
        enrolled_at, created_at, updated_at
      )
      VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, 'running', $5, $6, $7, NOW(), NOW(), NOW()
      )
      RETURNING *`,
      [id, tenantId, record_id, record_type, currentStepId, workflow.revision, enrollmentCount],
    );
    console.log('[WORKFLOW API] Enrollment created:', JSON.stringify(rows[0], null, 2));

    // Update workflow counts
    await pool.query(
      `UPDATE "Workflow" SET
        enrolled_count = enrolled_count + 1,
        active_count = active_count + 1,
        last_run_at = NOW()
       WHERE id = $1`,
      [id],
    );
    console.log('[WORKFLOW API] Workflow counts updated');

    // Queue first step for execution
    if (currentStepId) {
      console.log('[WORKFLOW API] Queuing first step for execution...');
      console.log('[WORKFLOW API] Execution ID:', rows[0].id);
      console.log('[WORKFLOW API] Workflow ID:', id);
      console.log('[WORKFLOW API] Tenant ID:', tenantId);
      await queueStepExecution(rows[0].id, id, tenantId);
      console.log('[WORKFLOW API] Step queued successfully');
    } else {
      console.log('[WORKFLOW API] WARNING: No current step ID, not queuing execution!');
    }

    console.log('[WORKFLOW API] ========== ENROLL COMPLETE ==========');
    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[workflows] enrollRecord failed', error);
    return fail(res, 500, { message: 'Failed to enroll record' });
  }
});

/**
 * Unenroll a record
 */
router.delete('/workflows/:id/enrollments/:enrollmentId', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id, enrollmentId } = req.params;
    const { reason = 'manual' } = req.query || {};

    const { rows } = await pool.query(
      `UPDATE "WorkflowExecution"
       SET status = 'cancelled',
           unenrolled_at = NOW(),
           unenrollment_reason = $4,
           updated_at = NOW()
       WHERE id = $1 AND workflow_id = $2 AND tenant_id = $3 AND status IN ('running', 'paused')
       RETURNING id`,
      [enrollmentId, id, tenantId, reason],
    );

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Enrollment not found or already completed' });
    }

    // Decrement active count
    await pool.query(
      `UPDATE "Workflow" SET active_count = GREATEST(active_count - 1, 0) WHERE id = $1`,
      [id],
    );

    return ok(res, null, 204);
  } catch (error) {
    console.error('[workflows] unenrollRecord failed', error);
    return fail(res, 500, { message: 'Failed to unenroll record' });
  }
});

/**
 * Cancel execution
 */
router.post('/workflows/:id/executions/:executionId/cancel', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id, executionId } = req.params;

    const { rows } = await pool.query(
      `UPDATE "WorkflowExecution"
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND workflow_id = $2 AND tenant_id = $3 AND status IN ('running', 'paused')
       RETURNING *`,
      [executionId, id, tenantId],
    );

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Execution not found or already completed' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[workflows] cancelExecution failed', error);
    return fail(res, 500, { message: 'Failed to cancel execution' });
  }
});

/**
 * Get execution details with logs
 */
router.get('/workflows/:id/executions/:executionId', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id, executionId } = req.params;

    // Get execution
    const { rows: executionRows } = await pool.query(
      `SELECT * FROM "WorkflowExecution"
       WHERE id = $1 AND workflow_id = $2 AND tenant_id = $3`,
      [executionId, id, tenantId],
    );

    if (executionRows.length === 0) {
      return fail(res, 404, { message: 'Execution not found' });
    }

    // Get logs
    const { rows: logRows } = await pool.query(
      `SELECT * FROM "WorkflowExecutionLog"
       WHERE execution_id = $1
       ORDER BY started_at`,
      [executionId],
    );

    return ok(res, {
      execution: executionRows[0],
      logs: logRows,
    });
  } catch (error) {
    console.error('[workflows] getExecutionDetails failed', error);
    return fail(res, 500, { message: 'Failed to load execution details' });
  }
});

// =============================================================================
// TEMPLATES
// =============================================================================

/**
 * List templates
 */
router.get('/workflows/templates', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { category, objectType } = req.query || {};

    let query = `
      SELECT * FROM "WorkflowTemplate"
      WHERE (is_system = true OR tenant_id = $1)`;
    const params = [tenantId];
    let paramCount = 2;

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount += 1;
    }

    if (objectType) {
      query += ` AND object_type = $${paramCount}`;
      params.push(objectType);
      paramCount += 1;
    }

    query += ` ORDER BY is_system DESC, usage_count DESC, name`;

    const { rows } = await pool.query(query, params);

    return ok(res, { templates: rows });
  } catch (error) {
    console.error('[workflows] listTemplates failed', error);
    return fail(res, 500, { message: 'Failed to list templates' });
  }
});

/**
 * Get template by ID
 */
router.get('/workflows/templates/:templateId', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { templateId } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM "WorkflowTemplate"
       WHERE id = $1 AND (is_system = true OR tenant_id = $2)`,
      [templateId, tenantId],
    );

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Template not found' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[workflows] getTemplate failed', error);
    return fail(res, 500, { message: 'Failed to load template' });
  }
});

/**
 * Create workflow from template
 */
router.post('/workflows/templates/:templateId/use', async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const { templateId } = req.params;
    const { name } = req.body || {};

    await client.query('BEGIN');

    // Get template
    const { rows: templateRows } = await client.query(
      `SELECT * FROM "WorkflowTemplate"
       WHERE id = $1 AND (is_system = true OR tenant_id = $2)`,
      [templateId, tenantId],
    );

    if (templateRows.length === 0) {
      await client.query('ROLLBACK');
      return fail(res, 404, { message: 'Template not found' });
    }

    const template = templateRows[0];
    const templateConfig = template.template_config || {};

    // Create workflow
    const workflowName = name || template.name;
    const { rows: workflowRows } = await client.query(
      `INSERT INTO "Workflow" (
        id, tenant_id, name, description, object_type, status,
        entry_condition, settings, created_by, created_at, updated_at
      )
      VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, 'draft', $5, $6, $7, NOW(), NOW()
      )
      RETURNING *`,
      [
        tenantId,
        workflowName,
        template.description,
        template.object_type,
        JSON.stringify(templateConfig.entry_condition || {}),
        JSON.stringify(templateConfig.settings || {}),
        userId,
      ],
    );

    const newWorkflow = workflowRows[0];

    // Create steps from template
    const templateSteps = templateConfig.steps || [];
    for (let i = 0; i < templateSteps.length; i += 1) {
      const step = templateSteps[i];
      await client.query(
        `INSERT INTO "WorkflowStep" (
          id, workflow_id, position, step_type, action_type, config, created_at, updated_at
        )
        VALUES (
          uuid_generate_v4(), $1, $2, $3, $4, $5, NOW(), NOW()
        )`,
        [
          newWorkflow.id,
          i,
          step.step_type,
          step.action_type || null,
          JSON.stringify(step.config || {}),
        ],
      );
    }

    // Increment template usage count
    await client.query(
      `UPDATE "WorkflowTemplate" SET usage_count = usage_count + 1 WHERE id = $1`,
      [templateId],
    );

    await client.query('COMMIT');

    return ok(res, newWorkflow, 201);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[workflows] createFromTemplate failed', error);
    return fail(res, 500, { message: 'Failed to create workflow from template' });
  } finally {
    client.release();
  }
});

// =============================================================================
// ANALYTICS & HISTORY
// =============================================================================

/**
 * Get workflow analytics
 */
router.get('/workflows/:id/analytics', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { period = '30d' } = req.query || {};

    // Verify workflow belongs to tenant
    const { rows: workflowRows } = await pool.query(
      `SELECT * FROM "Workflow" WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (workflowRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    // Calculate date range
    const days = parseInt(period.replace('d', ''), 10) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get execution stats
    const { rows: statsRows } = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM "WorkflowExecution"
       WHERE workflow_id = $1 AND enrolled_at >= $2`,
      [id, startDate.toISOString()],
    );

    // Get daily enrollments
    const { rows: dailyRows } = await pool.query(
      `SELECT
        DATE(enrolled_at) as date,
        COUNT(*) as enrollments,
        COUNT(*) FILTER (WHERE status = 'completed') as completions
       FROM "WorkflowExecution"
       WHERE workflow_id = $1 AND enrolled_at >= $2
       GROUP BY DATE(enrolled_at)
       ORDER BY date`,
      [id, startDate.toISOString()],
    );

    // Get step performance
    const { rows: stepRows } = await pool.query(
      `SELECT
        s.id,
        s.step_type,
        s.action_type,
        s.position,
        COUNT(l.id) as total_executions,
        COUNT(*) FILTER (WHERE l.status = 'success') as successful,
        COUNT(*) FILTER (WHERE l.status = 'failed') as failed,
        COUNT(*) FILTER (WHERE l.status = 'skipped') as skipped
       FROM "WorkflowStep" s
       LEFT JOIN "WorkflowExecutionLog" l ON l.step_id = s.id
       WHERE s.workflow_id = $1
       GROUP BY s.id, s.step_type, s.action_type, s.position
       ORDER BY s.position`,
      [id],
    );

    return ok(res, {
      summary: statsRows[0],
      daily: dailyRows,
      steps: stepRows,
      period,
    });
  } catch (error) {
    console.error('[workflows] getWorkflowAnalytics failed', error);
    return fail(res, 500, { message: 'Failed to load workflow analytics' });
  }
});

/**
 * Get workflow history/logs
 */
router.get('/workflows/:id/history', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { eventType, stepId, limit = 50, offset = 0 } = req.query || {};

    // Verify workflow belongs to tenant
    const { rows: workflowRows } = await pool.query(
      `SELECT id FROM "Workflow" WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (workflowRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    let query = `
      SELECT l.*, e.record_id, e.record_type
      FROM "WorkflowExecutionLog" l
      JOIN "WorkflowExecution" e ON e.id = l.execution_id
      WHERE e.workflow_id = $1`;
    const params = [id];
    let paramCount = 2;

    if (stepId) {
      query += ` AND l.step_id = $${paramCount}`;
      params.push(stepId);
      paramCount += 1;
    }

    if (eventType) {
      query += ` AND l.status = $${paramCount}`;
      params.push(eventType);
      paramCount += 1;
    }

    query += ` ORDER BY l.started_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const { rows } = await pool.query(query, params);

    return ok(res, { logs: rows });
  } catch (error) {
    console.error('[workflows] getWorkflowHistory failed', error);
    return fail(res, 500, { message: 'Failed to load workflow history' });
  }
});

/**
 * Get overall workflow stats
 */
router.get('/workflows/stats', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;

    const { rows } = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'paused') as paused,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COALESCE(SUM(enrolled_count), 0) as total_enrolled,
        COALESCE(SUM(completed_count), 0) as total_completed,
        COALESCE(SUM(active_count), 0) as total_active,
        COALESCE(SUM(failed_count), 0) as total_failed
       FROM "Workflow"
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[workflows] getWorkflowStats failed', error);
    return fail(res, 500, { message: 'Failed to load workflow stats' });
  }
});

/**
 * Test workflow with specific record (dry run)
 */
router.post('/workflows/:id/test', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { record_id, record_type } = req.body || {};

    if (!record_id || !record_type) {
      return fail(res, 400, { message: 'Missing required fields: record_id, record_type' });
    }

    // Verify workflow exists
    const { rows: workflowRows } = await pool.query(
      `SELECT * FROM "Workflow" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );

    if (workflowRows.length === 0) {
      return fail(res, 404, { message: 'Workflow not found' });
    }

    const workflow = workflowRows[0];

    // Get steps
    const { rows: steps } = await pool.query(
      `SELECT * FROM "WorkflowStep" WHERE workflow_id = $1 ORDER BY position`,
      [id],
    );

    // Return test results (simulated)
    return ok(res, {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        object_type: workflow.object_type,
      },
      record: {
        id: record_id,
        type: record_type,
      },
      steps: steps.map((step) => ({
        id: step.id,
        step_type: step.step_type,
        action_type: step.action_type,
        would_execute: true,
        simulated_result: 'success',
      })),
      message: 'Dry run completed. No actions were actually performed.',
    });
  } catch (error) {
    console.error('[workflows] testWorkflow failed', error);
    return fail(res, 500, { message: 'Failed to test workflow' });
  }
});

// =============================================================================
// FOLDERS
// =============================================================================

/**
 * List folders
 */
router.get('/workflows/folders', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;

    const { rows } = await pool.query(
      `SELECT * FROM "WorkflowFolder" WHERE tenant_id = $1 ORDER BY name`,
      [tenantId],
    );

    return ok(res, { folders: rows });
  } catch (error) {
    console.error('[workflows] listFolders failed', error);
    return fail(res, 500, { message: 'Failed to list folders' });
  }
});

/**
 * Create folder
 */
router.post('/workflows/folders', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { name, parent_id } = req.body || {};

    if (!name) {
      return fail(res, 400, { message: 'Missing required field: name' });
    }

    const { rows } = await pool.query(
      `INSERT INTO "WorkflowFolder" (id, tenant_id, name, parent_id, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [tenantId, name, parent_id || null],
    );

    return ok(res, rows[0], 201);
  } catch (error) {
    console.error('[workflows] createFolder failed', error);
    return fail(res, 500, { message: 'Failed to create folder' });
  }
});

/**
 * Update folder
 */
router.put('/workflows/folders/:folderId', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { folderId } = req.params;
    const { name, parent_id } = req.body || {};

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount += 1;
    }
    if (parent_id !== undefined) {
      updates.push(`parent_id = $${paramCount}`);
      params.push(parent_id);
      paramCount += 1;
    }

    if (updates.length === 0) {
      return fail(res, 400, { message: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');

    const query = `
      UPDATE "WorkflowFolder"
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING *`;
    params.push(folderId, tenantId);

    const { rows } = await pool.query(query, params);

    if (rows.length === 0) {
      return fail(res, 404, { message: 'Folder not found' });
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('[workflows] updateFolder failed', error);
    return fail(res, 500, { message: 'Failed to update folder' });
  }
});

/**
 * Delete folder
 */
router.delete('/workflows/folders/:folderId', async (req, res) => {
  try {
    const pool = getPool();
    const tenantId = req.tenantId;
    const { folderId } = req.params;

    // Move workflows out of folder first
    await pool.query(
      `UPDATE "Workflow" SET folder_id = NULL WHERE folder_id = $1 AND tenant_id = $2`,
      [folderId, tenantId],
    );

    const { rowCount } = await pool.query(
      `DELETE FROM "WorkflowFolder" WHERE id = $1 AND tenant_id = $2`,
      [folderId, tenantId],
    );

    if (rowCount === 0) {
      return fail(res, 404, { message: 'Folder not found' });
    }

    return ok(res, null, 204);
  } catch (error) {
    console.error('[workflows] deleteFolder failed', error);
    return fail(res, 500, { message: 'Failed to delete folder' });
  }
});

// Export router and helper functions
module.exports = router;
module.exports.queueStepExecution = queueStepExecution;

