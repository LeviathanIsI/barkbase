/**
 * Test Helpers
 *
 * Utility functions for workflow testing including waiting for executions,
 * fetching execution data, and cleanup.
 */

const { query } = require('./testDatabase');

/**
 * Wait for a workflow execution to reach a specific status
 * @param {string} workflowId - Workflow ID
 * @param {string} recordId - Record ID
 * @param {object} options - Wait options
 * @param {string[]} options.targetStatuses - Statuses to wait for (default: ['completed', 'failed', 'cancelled'])
 * @param {number} options.timeoutMs - Maximum wait time (default: 30000)
 * @param {number} options.pollIntervalMs - Poll interval (default: 500)
 * @returns {Promise<object|null>} - Execution record or null if timeout
 */
async function waitForExecution(workflowId, recordId, options = {}) {
  const {
    targetStatuses = ['completed', 'failed', 'cancelled'],
    timeoutMs = 30000,
    pollIntervalMs = 500,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await query(
      `SELECT * FROM "WorkflowExecution"
       WHERE workflow_id = $1 AND record_id = $2
       ORDER BY enrolled_at DESC
       LIMIT 1`,
      [workflowId, recordId]
    );

    if (result.rows.length > 0) {
      const execution = result.rows[0];
      if (targetStatuses.includes(execution.status)) {
        return execution;
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  // Return last known state on timeout
  const finalResult = await query(
    `SELECT * FROM "WorkflowExecution"
     WHERE workflow_id = $1 AND record_id = $2
     ORDER BY enrolled_at DESC
     LIMIT 1`,
    [workflowId, recordId]
  );

  return finalResult.rows[0] || null;
}

/**
 * Wait for an execution to be created
 * @param {string} workflowId - Workflow ID
 * @param {string} recordId - Record ID
 * @param {object} options - Wait options
 * @returns {Promise<object|null>} - Execution record or null if timeout
 */
async function waitForExecutionCreated(workflowId, recordId, options = {}) {
  const {
    timeoutMs = 10000,
    pollIntervalMs = 250,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await query(
      `SELECT * FROM "WorkflowExecution"
       WHERE workflow_id = $1 AND record_id = $2
       ORDER BY enrolled_at DESC
       LIMIT 1`,
      [workflowId, recordId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return null;
}

/**
 * Get a workflow execution
 * @param {string} workflowId - Workflow ID
 * @param {string} recordId - Record ID
 * @returns {Promise<object|null>} - Execution record or null
 */
async function getExecution(workflowId, recordId) {
  const result = await query(
    `SELECT * FROM "WorkflowExecution"
     WHERE workflow_id = $1 AND record_id = $2
     ORDER BY enrolled_at DESC
     LIMIT 1`,
    [workflowId, recordId]
  );

  return result.rows[0] || null;
}

/**
 * Get execution by ID
 * @param {string} executionId - Execution ID
 * @returns {Promise<object|null>} - Execution record or null
 */
async function getExecutionById(executionId) {
  const result = await query(
    `SELECT * FROM "WorkflowExecution" WHERE id = $1`,
    [executionId]
  );

  return result.rows[0] || null;
}

/**
 * Get all execution logs for an execution
 * @param {string} executionId - Execution ID
 * @returns {Promise<object[]>} - Array of log records
 */
async function getExecutionLogs(executionId) {
  const result = await query(
    `SELECT * FROM "WorkflowExecutionLog"
     WHERE execution_id = $1
     ORDER BY started_at ASC`,
    [executionId]
  );

  return result.rows;
}

/**
 * Get execution logs for a specific step
 * @param {string} executionId - Execution ID
 * @param {string} stepId - Step ID
 * @returns {Promise<object[]>} - Array of log records
 */
async function getStepLogs(executionId, stepId) {
  const result = await query(
    `SELECT * FROM "WorkflowExecutionLog"
     WHERE execution_id = $1 AND step_id = $2
     ORDER BY started_at ASC`,
    [executionId, stepId]
  );

  return result.rows;
}

/**
 * Get all executions for a workflow
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<object[]>} - Array of execution records
 */
async function getWorkflowExecutions(workflowId) {
  const result = await query(
    `SELECT * FROM "WorkflowExecution"
     WHERE workflow_id = $1
     ORDER BY enrolled_at DESC`,
    [workflowId]
  );

  return result.rows;
}

/**
 * Clean up all test data for a tenant
 * @param {string} tenantId - Tenant ID
 */
async function cleanupTestData(tenantId) {
  // Delete in order to respect foreign key constraints
  const deleteQueries = [
    // Workflow execution data
    `DELETE FROM "WorkflowExecutionLog" WHERE execution_id IN (
      SELECT id FROM "WorkflowExecution" WHERE tenant_id = $1
    )`,
    `DELETE FROM "WorkflowExecution" WHERE tenant_id = $1`,
    `DELETE FROM "WorkflowStep" WHERE workflow_id IN (
      SELECT id FROM "Workflow" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Workflow" WHERE tenant_id = $1`,

    // Segment data
    `DELETE FROM "SegmentMember" WHERE segment_id IN (
      SELECT id FROM "Segment" WHERE tenant_id = $1
    )`,
    `DELETE FROM "Segment" WHERE tenant_id = $1`,

    // Task data
    `DELETE FROM "Task" WHERE tenant_id = $1`,

    // Note data
    `DELETE FROM "Note" WHERE tenant_id = $1`,

    // Notification data
    `DELETE FROM "Notification" WHERE tenant_id = $1`,

    // Invoice and payment data
    `DELETE FROM "Payment" WHERE tenant_id = $1`,
    `DELETE FROM "Invoice" WHERE tenant_id = $1`,

    // Booking data
    `DELETE FROM "Booking" WHERE tenant_id = $1`,

    // Pet data
    `DELETE FROM "Pet" WHERE tenant_id = $1`,

    // Owner data
    `DELETE FROM "Owner" WHERE tenant_id = $1`,

    // Property history
    `DELETE FROM "PropertyHistory" WHERE tenant_id = $1`,

    // Finally delete tenant
    `DELETE FROM "Tenant" WHERE id = $1`,
  ];

  for (const sql of deleteQueries) {
    try {
      await query(sql, [tenantId]);
    } catch (error) {
      // Ignore errors for tables that might not exist or have no data
      console.log(`[Cleanup] Warning: ${error.message}`);
    }
  }
}

/**
 * Assert that an execution completed successfully
 * @param {object} execution - Execution record
 * @param {string[]} expectedStepTypes - Expected step types in order
 */
async function assertExecutionCompleted(execution, expectedStepTypes = []) {
  if (execution.status !== 'completed') {
    throw new Error(`Expected execution to be completed but was: ${execution.status}`);
  }

  if (expectedStepTypes.length > 0) {
    const logs = await getExecutionLogs(execution.id);
    const logStepTypes = [];

    for (const log of logs) {
      const stepResult = await query(
        `SELECT step_type FROM "WorkflowStep" WHERE id = $1`,
        [log.step_id]
      );
      if (stepResult.rows[0]) {
        logStepTypes.push(stepResult.rows[0].step_type);
      }
    }

    // Check that all expected step types were executed
    for (const expectedType of expectedStepTypes) {
      if (!logStepTypes.includes(expectedType)) {
        throw new Error(`Expected step type ${expectedType} was not executed`);
      }
    }
  }

  return true;
}

/**
 * Get tasks created by a workflow execution
 * @param {string} tenantId - Tenant ID
 * @param {object} options - Filter options
 * @returns {Promise<object[]>} - Array of task records
 */
async function getCreatedTasks(tenantId, options = {}) {
  let sql = `SELECT * FROM "Task" WHERE tenant_id = $1`;
  const params = [tenantId];

  if (options.title) {
    sql += ` AND title LIKE $${params.length + 1}`;
    params.push(`%${options.title}%`);
  }

  if (options.petId) {
    sql += ` AND pet_id = $${params.length + 1}`;
    params.push(options.petId);
  }

  sql += ` ORDER BY created_at DESC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get notes created by a workflow execution
 * @param {string} tenantId - Tenant ID
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @returns {Promise<object[]>} - Array of note records
 */
async function getCreatedNotes(tenantId, entityType, entityId) {
  const result = await query(
    `SELECT * FROM "Note"
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY created_at DESC`,
    [tenantId, entityType, entityId]
  );

  return result.rows;
}

/**
 * Get notifications created by a workflow execution
 * @param {string} tenantId - Tenant ID
 * @param {object} options - Filter options
 * @returns {Promise<object[]>} - Array of notification records
 */
async function getCreatedNotifications(tenantId, options = {}) {
  let sql = `SELECT * FROM "Notification" WHERE tenant_id = $1`;
  const params = [tenantId];

  if (options.entityType) {
    sql += ` AND entity_type = $${params.length + 1}`;
    params.push(options.entityType);
  }

  if (options.entityId) {
    sql += ` AND entity_id = $${params.length + 1}`;
    params.push(options.entityId);
  }

  sql += ` ORDER BY created_at DESC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Check if a record is in a segment
 * @param {string} segmentId - Segment ID
 * @param {string} ownerId - Owner ID
 * @returns {Promise<boolean>}
 */
async function isInSegment(segmentId, ownerId) {
  const result = await query(
    `SELECT 1 FROM "SegmentMember"
     WHERE segment_id = $1 AND owner_id = $2
     LIMIT 1`,
    [segmentId, ownerId]
  );

  return result.rows.length > 0;
}

/**
 * Update a record field
 * @param {string} tableName - Table name
 * @param {string} recordId - Record ID
 * @param {string} field - Field name
 * @param {any} value - New value
 */
async function updateRecordField(tableName, recordId, field, value) {
  await query(
    `UPDATE "${tableName}" SET "${field}" = $1, updated_at = NOW() WHERE id = $2`,
    [value, recordId]
  );
}

/**
 * Get a record by ID
 * @param {string} tableName - Table name
 * @param {string} recordId - Record ID
 * @returns {Promise<object|null>}
 */
async function getRecord(tableName, recordId) {
  const result = await query(
    `SELECT * FROM "${tableName}" WHERE id = $1`,
    [recordId]
  );

  return result.rows[0] || null;
}

/**
 * Get a test user ID from the User table
 * Since users are created via Cognito, we need an existing user for FK constraints
 * @returns {Promise<string>} - User ID
 */
async function getTestUserId() {
  const result = await query(
    `SELECT id FROM "User" LIMIT 1`
  );
  if (result.rows.length === 0) {
    throw new Error('No users found in database. Cannot create records with FK to User table.');
  }
  return result.rows[0].id;
}

module.exports = {
  waitForExecution,
  waitForExecutionCreated,
  getExecution,
  getExecutionById,
  getExecutionLogs,
  getStepLogs,
  getWorkflowExecutions,
  cleanupTestData,
  assertExecutionCompleted,
  getCreatedTasks,
  getCreatedNotes,
  getCreatedNotifications,
  isInSegment,
  updateRecordField,
  getRecord,
  getTestUserId,
};
