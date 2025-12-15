/**
 * =============================================================================
 * BarkBase Workflow Step Executor Lambda
 * =============================================================================
 *
 * Executes individual workflow steps. Called via SQS event source mapping
 * from the workflow step queue.
 *
 * Step Types:
 * - action: Execute an action (send_sms, send_email, create_task, etc.)
 * - wait: Schedule delayed resumption via EventBridge Scheduler
 * - determinator: Evaluate condition and route to yes/no branch
 * - gate: Block/allow execution based on condition
 * - terminus: End the workflow execution
 *
 * =============================================================================
 */

// Import from layers (mounted at /opt/nodejs in Lambda)
let dbLayer, sharedLayer;

try {
  dbLayer = require('/opt/nodejs/db');
  sharedLayer = require('/opt/nodejs/index');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
  sharedLayer = require('../../layers/shared-layer/nodejs/index');
}

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand } = require('@aws-sdk/client-scheduler');

const { getPoolAsync, query } = dbLayer;
const {
  sendSMS,
  sendEmail,
  sendTemplatedEmail,
  createResponse,
} = sharedLayer;

// Initialize clients
const sqs = new SQSClient({
  region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
});

const scheduler = new SchedulerClient({
  region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
});

// Queue URLs from environment
const STEP_QUEUE_URL = process.env.WORKFLOW_STEP_QUEUE_URL;
const STEP_EXECUTOR_ARN = process.env.WORKFLOW_STEP_EXECUTOR_ARN;
const SCHEDULER_ROLE_ARN = process.env.WORKFLOW_SCHEDULER_ROLE_ARN;

/**
 * Main handler for SQS step execution events
 */
exports.handler = async (event) => {
  console.log('[StepExecutor] Processing', event.Records?.length || 0, 'messages');

  // Ensure database pool is initialized
  await getPoolAsync();

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  // Process each SQS record
  for (const record of event.Records || []) {
    try {
      const message = JSON.parse(record.body);
      await processStepExecution(message);
      results.processed++;
      results.succeeded++;
    } catch (error) {
      console.error('[StepExecutor] Error processing message:', error);
      results.failed++;
      results.errors.push({
        messageId: record.messageId,
        error: error.message,
      });
    }
  }

  console.log('[StepExecutor] Results:', results);

  return {
    batchItemFailures: results.errors.map(e => ({
      itemIdentifier: e.messageId,
    })),
  };
};

/**
 * Process a step execution message
 */
async function processStepExecution(message) {
  const { executionId, workflowId, tenantId, action } = message;

  console.log('[StepExecutor] Processing:', { executionId, action });

  // Get execution details
  const executionResult = await query(
    `SELECT we.*, w.name as workflow_name, w.object_type
     FROM "WorkflowExecution" we
     JOIN "Workflow" w ON we.workflow_id = w.id
     WHERE we.id = $1 AND we.tenant_id = $2`,
    [executionId, tenantId]
  );

  if (executionResult.rows.length === 0) {
    console.warn('[StepExecutor] Execution not found:', executionId);
    return;
  }

  const execution = executionResult.rows[0];

  // Check if execution is still running
  if (execution.status !== 'running' && execution.status !== 'paused') {
    console.log('[StepExecutor] Execution not active:', execution.status);
    return;
  }

  // Get current step details
  const stepResult = await query(
    `SELECT * FROM "WorkflowStep" WHERE id = $1`,
    [execution.current_step_id]
  );

  if (stepResult.rows.length === 0) {
    console.warn('[StepExecutor] Step not found:', execution.current_step_id);
    await failExecution(executionId, 'Step not found');
    return;
  }

  const step = stepResult.rows[0];

  // Get record data for template interpolation
  const recordData = await getRecordData(execution.record_id, execution.object_type, tenantId);

  // Execute step based on type
  let stepResult2;
  try {
    switch (step.step_type) {
      case 'action':
        stepResult2 = await executeAction(step, execution, recordData, tenantId);
        break;
      case 'wait':
        stepResult2 = await executeWait(step, execution, recordData, tenantId);
        break;
      case 'determinator':
        stepResult2 = await executeDeterminator(step, execution, recordData, tenantId);
        break;
      case 'gate':
        stepResult2 = await executeGate(step, execution, recordData, tenantId);
        break;
      case 'terminus':
        stepResult2 = await executeTerminus(step, execution, tenantId);
        break;
      default:
        console.warn('[StepExecutor] Unknown step type:', step.step_type);
        stepResult2 = { success: false, error: 'Unknown step type' };
    }
  } catch (error) {
    console.error('[StepExecutor] Step execution error:', error);
    stepResult2 = { success: false, error: error.message };
  }

  // Log step execution
  await logStepExecution(executionId, step.id, stepResult2);

  // Handle result and queue next step if needed
  if (stepResult2.success) {
    if (stepResult2.nextStepId) {
      // Update current step and queue next
      await updateCurrentStep(executionId, stepResult2.nextStepId);
      await queueNextStep(executionId, workflowId, tenantId);
    } else if (stepResult2.waitUntil) {
      // Schedule delayed execution
      await scheduleDelayedExecution(executionId, workflowId, tenantId, stepResult2.waitUntil);
    } else if (stepResult2.completed) {
      // Workflow completed
      await completeExecution(executionId, workflowId);
    }
  } else {
    // Step failed
    await failExecution(executionId, stepResult2.error);
  }
}

/**
 * Execute an action step
 */
async function executeAction(step, execution, recordData, tenantId) {
  const config = step.config || {};
  const actionType = step.action_type;

  console.log('[StepExecutor] Executing action:', actionType);

  let result;

  switch (actionType) {
    case 'send_sms':
      result = await executeSendSMS(config, recordData, tenantId);
      break;
    case 'send_email':
      result = await executeSendEmail(config, recordData, tenantId);
      break;
    case 'create_task':
      result = await executeCreateTask(config, recordData, tenantId);
      break;
    case 'update_field':
      result = await executeUpdateField(config, execution, recordData, tenantId);
      break;
    case 'internal_note':
      result = await executeInternalNote(config, execution, recordData, tenantId);
      break;
    case 'enroll_in_workflow':
      result = await executeEnrollInWorkflow(config, execution, recordData, tenantId);
      break;
    default:
      result = { success: false, error: `Unknown action type: ${actionType}` };
  }

  // Find next step
  if (result.success) {
    const nextStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_path);
    return { ...result, nextStepId };
  }

  return result;
}

/**
 * Execute send_sms action
 */
async function executeSendSMS(config, recordData, tenantId) {
  try {
    const message = interpolateTemplate(config.message || '', recordData);
    const recipient = getRecipientPhone(config.recipient, recordData);

    if (!recipient) {
      return { success: false, error: 'No recipient phone number' };
    }

    // Get tenant info for sender name
    const tenantResult = await query(
      `SELECT name, phone FROM "Tenant" WHERE id = $1`,
      [tenantId]
    );
    const tenant = tenantResult.rows[0] || {};

    // Send SMS via shared layer
    const smsResult = await sendSMS(recipient, message);

    return {
      success: true,
      result: {
        messageSid: smsResult.sid,
        recipient,
        message,
      },
    };
  } catch (error) {
    console.error('[StepExecutor] SMS error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute send_email action
 */
async function executeSendEmail(config, recordData, tenantId) {
  try {
    const subject = interpolateTemplate(config.subject || '', recordData);
    const recipient = getRecipientEmail(config.recipient, recordData);

    if (!recipient) {
      return { success: false, error: 'No recipient email address' };
    }

    // If template ID provided, use templated email
    if (config.template_id) {
      await sendTemplatedEmail({
        to: recipient,
        templateId: config.template_id,
        templateData: recordData,
      });
    } else {
      // Send plain email
      const body = interpolateTemplate(config.body || '', recordData);
      await sendEmail({
        to: recipient,
        subject,
        html: body,
      });
    }

    return {
      success: true,
      result: {
        recipient,
        subject,
      },
    };
  } catch (error) {
    console.error('[StepExecutor] Email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute create_task action
 */
async function executeCreateTask(config, recordData, tenantId) {
  try {
    const title = interpolateTemplate(config.title || '', recordData);
    const description = interpolateTemplate(config.description || '', recordData);
    const priority = config.priority || 'medium';
    const dueInHours = config.due_in_hours || 24;

    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + dueInHours);

    const taskResult = await query(
      `INSERT INTO "Task"
         (tenant_id, title, description, priority, status, due_at, metadata)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       RETURNING id`,
      [
        tenantId,
        title,
        description,
        priority,
        dueAt.toISOString(),
        JSON.stringify({
          automated: true,
          source: 'workflow',
          recordId: recordData.record?.id,
          recordType: recordData.recordType,
        }),
      ]
    );

    return {
      success: true,
      result: {
        taskId: taskResult.rows[0].id,
        title,
      },
    };
  } catch (error) {
    console.error('[StepExecutor] Create task error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute update_field action
 */
async function executeUpdateField(config, execution, recordData, tenantId) {
  try {
    const { field, value } = config;
    if (!field) {
      return { success: false, error: 'No field specified' };
    }

    const interpolatedValue = interpolateTemplate(value || '', recordData);
    const tableName = getTableName(execution.object_type);

    if (!tableName) {
      return { success: false, error: 'Invalid object type' };
    }

    // Only allow specific fields to be updated for security
    const allowedFields = getAllowedUpdateFields(execution.object_type);
    if (!allowedFields.includes(field)) {
      return { success: false, error: `Field ${field} not allowed for update` };
    }

    await query(
      `UPDATE "${tableName}" SET "${field}" = $1 WHERE id = $2 AND tenant_id = $3`,
      [interpolatedValue, execution.record_id, tenantId]
    );

    return {
      success: true,
      result: {
        field,
        value: interpolatedValue,
      },
    };
  } catch (error) {
    console.error('[StepExecutor] Update field error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute internal_note action
 */
async function executeInternalNote(config, execution, recordData, tenantId) {
  try {
    const content = interpolateTemplate(config.content || '', recordData);

    await query(
      `INSERT INTO "Note"
         (tenant_id, entity_type, entity_id, content, note_type, created_by)
       VALUES ($1, $2, $3, $4, 'internal', NULL)`,
      [tenantId, execution.object_type, execution.record_id, content]
    );

    return {
      success: true,
      result: { content },
    };
  } catch (error) {
    console.error('[StepExecutor] Internal note error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute enroll_in_workflow action
 */
async function executeEnrollInWorkflow(config, execution, recordData, tenantId) {
  try {
    const targetWorkflowId = config.workflow_id;
    if (!targetWorkflowId) {
      return { success: false, error: 'No target workflow specified' };
    }

    // Queue enrollment event
    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.WORKFLOW_TRIGGER_QUEUE_URL,
      MessageBody: JSON.stringify({
        eventType: 'workflow.enroll_action',
        recordId: execution.record_id,
        recordType: execution.object_type,
        tenantId,
        eventData: {
          targetWorkflowId,
          sourceExecutionId: execution.id,
        },
      }),
    }));

    return {
      success: true,
      result: { targetWorkflowId },
    };
  } catch (error) {
    console.error('[StepExecutor] Enroll in workflow error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute a wait step
 */
async function executeWait(step, execution, recordData, tenantId) {
  const config = step.config || {};
  const waitType = config.waitType || 'duration';

  console.log('[StepExecutor] Executing wait:', waitType);

  let waitUntil;

  switch (waitType) {
    case 'duration':
      waitUntil = calculateDurationWait(config);
      break;
    case 'until_time':
      waitUntil = calculateTimeOfDayWait(config);
      break;
    case 'until_date':
      waitUntil = calculateDateFieldWait(config, recordData);
      break;
    default:
      return { success: false, error: `Unknown wait type: ${waitType}` };
  }

  if (!waitUntil || isNaN(waitUntil.getTime())) {
    return { success: false, error: 'Could not calculate wait time' };
  }

  // If wait time is in the past, proceed immediately
  if (waitUntil <= new Date()) {
    const nextStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_path);
    return { success: true, nextStepId };
  }

  // Update execution with resume time
  await query(
    `UPDATE "WorkflowExecution"
     SET status = 'paused', resume_at = $1
     WHERE id = $2`,
    [waitUntil.toISOString(), execution.id]
  );

  return {
    success: true,
    waitUntil,
    result: { waitUntil: waitUntil.toISOString() },
  };
}

/**
 * Calculate wait time for duration-based wait
 */
function calculateDurationWait(config) {
  const duration = parseInt(config.duration) || 1;
  const unit = config.durationUnit || config.unit || 'days';

  const now = new Date();

  switch (unit) {
    case 'minutes':
      now.setMinutes(now.getMinutes() + duration);
      break;
    case 'hours':
      now.setHours(now.getHours() + duration);
      break;
    case 'days':
      now.setDate(now.getDate() + duration);
      break;
    case 'weeks':
      now.setDate(now.getDate() + (duration * 7));
      break;
    default:
      now.setDate(now.getDate() + duration);
  }

  return now;
}

/**
 * Calculate wait time for time-of-day wait
 */
function calculateTimeOfDayWait(config) {
  const timeOfDay = config.timeOfDay || '09:00';
  const [hours, minutes] = timeOfDay.split(':').map(Number);

  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

/**
 * Calculate wait time based on date field
 */
function calculateDateFieldWait(config, recordData) {
  const dateField = config.dateField || '';
  const value = getNestedValue(recordData, dateField);

  if (!value) {
    return null;
  }

  return new Date(value);
}

/**
 * Execute a determinator (if/then) step
 */
async function executeDeterminator(step, execution, recordData, tenantId) {
  const config = step.config || {};
  const conditions = config.conditions || [];
  const conditionLogic = config.conditionLogic || 'and';

  console.log('[StepExecutor] Executing determinator with', conditions.length, 'conditions');

  // Evaluate conditions
  const conditionsMet = evaluateConditions(conditions, conditionLogic, recordData);

  console.log('[StepExecutor] Conditions met:', conditionsMet);

  // Find the first step in the appropriate branch
  const branchPath = conditionsMet ? 'yes' : 'no';
  const nextStepResult = await query(
    `SELECT id FROM "WorkflowStep"
     WHERE workflow_id = $1
       AND parent_step_id = $2
       AND branch_path = $3
     ORDER BY position ASC
     LIMIT 1`,
    [step.workflow_id, step.id, branchPath]
  );

  if (nextStepResult.rows.length === 0) {
    // No steps in branch, find next sibling/parent step
    const nextStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_path);
    return {
      success: true,
      nextStepId,
      result: { conditionsMet, branchPath },
    };
  }

  return {
    success: true,
    nextStepId: nextStepResult.rows[0].id,
    result: { conditionsMet, branchPath },
  };
}

/**
 * Execute a gate (blocking condition) step
 */
async function executeGate(step, execution, recordData, tenantId) {
  const config = step.config || {};
  const conditions = config.conditions || [];
  const conditionLogic = config.conditionLogic || 'and';

  console.log('[StepExecutor] Executing gate');

  // Evaluate conditions - gate blocks if conditions NOT met
  const conditionsMet = evaluateConditions(conditions, conditionLogic, recordData);

  if (!conditionsMet) {
    // Gate blocked - end execution (or could cancel)
    return {
      success: true,
      completed: true,
      result: { blocked: true, reason: 'Gate condition not met' },
    };
  }

  // Gate passed - continue to next step
  const nextStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_path);
  return {
    success: true,
    nextStepId,
    result: { blocked: false },
  };
}

/**
 * Execute a terminus (end) step
 */
async function executeTerminus(step, execution, tenantId) {
  console.log('[StepExecutor] Executing terminus');

  return {
    success: true,
    completed: true,
    result: { reason: 'Workflow completed' },
  };
}

/**
 * Evaluate a set of conditions against record data
 */
function evaluateConditions(conditions, logic, recordData) {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  const results = conditions.map(condition => evaluateCondition(condition, recordData));

  if (logic === 'or') {
    return results.some(r => r);
  }

  return results.every(r => r);
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition, recordData) {
  const { field, operator, value } = condition;
  const actualValue = getNestedValue(recordData, field);

  switch (operator) {
    case 'equals':
      return String(actualValue) === String(value);
    case 'not_equals':
      return String(actualValue) !== String(value);
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains':
      return !String(actualValue).toLowerCase().includes(String(value).toLowerCase());
    case 'starts_with':
      return String(actualValue).toLowerCase().startsWith(String(value).toLowerCase());
    case 'ends_with':
      return String(actualValue).toLowerCase().endsWith(String(value).toLowerCase());
    case 'is_empty':
      return !actualValue || actualValue === '';
    case 'is_not_empty':
      return !!actualValue && actualValue !== '';
    case 'greater_than':
      return Number(actualValue) > Number(value);
    case 'less_than':
      return Number(actualValue) < Number(value);
    case 'is_true':
      return actualValue === true || actualValue === 'true';
    case 'is_false':
      return actualValue === false || actualValue === 'false';
    default:
      console.warn('[StepExecutor] Unknown operator:', operator);
      return false;
  }
}

/**
 * Find the next step after the current one
 */
async function findNextStep(workflowId, currentStepId, parentStepId, branchPath) {
  // Get current step position
  const currentResult = await query(
    `SELECT position FROM "WorkflowStep" WHERE id = $1`,
    [currentStepId]
  );

  if (currentResult.rows.length === 0) {
    return null;
  }

  const currentPosition = currentResult.rows[0].position;

  // Find next sibling at same level
  const nextSiblingResult = await query(
    `SELECT id FROM "WorkflowStep"
     WHERE workflow_id = $1
       AND parent_step_id ${parentStepId ? '= $2' : 'IS NULL'}
       AND branch_path ${branchPath ? '= $3' : 'IS NULL'}
       AND position > $4
     ORDER BY position ASC
     LIMIT 1`,
    parentStepId && branchPath
      ? [workflowId, parentStepId, branchPath, currentPosition]
      : parentStepId
        ? [workflowId, parentStepId, currentPosition]
        : branchPath
          ? [workflowId, branchPath, currentPosition]
          : [workflowId, currentPosition]
  );

  if (nextSiblingResult.rows.length > 0) {
    return nextSiblingResult.rows[0].id;
  }

  // No more siblings - if we're in a branch, go to parent's next sibling
  if (parentStepId) {
    const parentResult = await query(
      `SELECT parent_step_id, branch_path FROM "WorkflowStep" WHERE id = $1`,
      [parentStepId]
    );

    if (parentResult.rows.length > 0) {
      return findNextStep(
        workflowId,
        parentStepId,
        parentResult.rows[0].parent_step_id,
        parentResult.rows[0].branch_path
      );
    }
  }

  // No more steps
  return null;
}

/**
 * Get record data for template interpolation
 */
async function getRecordData(recordId, recordType, tenantId) {
  const data = { recordType };

  try {
    // Get main record
    const tableName = getTableName(recordType);
    if (tableName) {
      const recordResult = await query(
        `SELECT * FROM "${tableName}" WHERE id = $1 AND tenant_id = $2`,
        [recordId, tenantId]
      );
      if (recordResult.rows.length > 0) {
        data.record = recordResult.rows[0];
        data[recordType] = recordResult.rows[0];
      }
    }

    // Get related owner
    if (data.record?.owner_id) {
      const ownerResult = await query(
        `SELECT * FROM "Owner" WHERE id = $1`,
        [data.record.owner_id]
      );
      if (ownerResult.rows.length > 0) {
        data.owner = ownerResult.rows[0];
        data.owner.full_name = `${data.owner.first_name} ${data.owner.last_name}`.trim();
      }
    }

    // Get related pet
    if (data.record?.pet_id) {
      const petResult = await query(
        `SELECT * FROM "Pet" WHERE id = $1`,
        [data.record.pet_id]
      );
      if (petResult.rows.length > 0) {
        data.pet = petResult.rows[0];
      }
    }

    // For pet records, get owner
    if (recordType === 'pet' && data.pet?.owner_id) {
      const ownerResult = await query(
        `SELECT * FROM "Owner" WHERE id = $1`,
        [data.pet.owner_id]
      );
      if (ownerResult.rows.length > 0) {
        data.owner = ownerResult.rows[0];
        data.owner.full_name = `${data.owner.first_name} ${data.owner.last_name}`.trim();
      }
    }

    // Get tenant info
    const tenantResult = await query(
      `SELECT * FROM "Tenant" WHERE id = $1`,
      [tenantId]
    );
    if (tenantResult.rows.length > 0) {
      data.tenant = tenantResult.rows[0];
    }

  } catch (error) {
    console.error('[StepExecutor] Error getting record data:', error);
  }

  return data;
}

/**
 * Interpolate template variables
 */
function interpolateTemplate(template, data) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path.trim());
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Get recipient phone number
 */
function getRecipientPhone(recipient, data) {
  if (recipient === 'owner' && data.owner?.phone) {
    return data.owner.phone;
  }
  // Could add more recipient types (staff, etc.)
  return null;
}

/**
 * Get recipient email address
 */
function getRecipientEmail(recipient, data) {
  if (recipient === 'owner' && data.owner?.email) {
    return data.owner.email;
  }
  return null;
}

/**
 * Get table name for object type
 */
function getTableName(objectType) {
  const tables = {
    pet: 'Pet',
    booking: 'Booking',
    owner: 'Owner',
    payment: 'Payment',
    invoice: 'Invoice',
    task: 'Task',
  };
  return tables[objectType] || null;
}

/**
 * Get allowed fields for update action
 */
function getAllowedUpdateFields(objectType) {
  const allowed = {
    pet: ['notes', 'internal_notes', 'vaccination_status'],
    booking: ['notes', 'internal_notes', 'status'],
    owner: ['notes', 'internal_notes', 'tags'],
    payment: ['notes'],
    invoice: ['notes', 'status'],
    task: ['notes', 'status', 'priority'],
  };
  return allowed[objectType] || [];
}

/**
 * Log step execution to database
 */
async function logStepExecution(executionId, stepId, result) {
  try {
    await query(
      `INSERT INTO "WorkflowExecutionLog"
         (execution_id, step_id, status, completed_at, result)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [
        executionId,
        stepId,
        result.success ? 'success' : 'failed',
        JSON.stringify(result.result || { error: result.error }),
      ]
    );
  } catch (error) {
    console.error('[StepExecutor] Error logging step execution:', error);
  }
}

/**
 * Update current step in execution
 */
async function updateCurrentStep(executionId, nextStepId) {
  await query(
    `UPDATE "WorkflowExecution"
     SET current_step_id = $1, updated_at = NOW()
     WHERE id = $2`,
    [nextStepId, executionId]
  );
}

/**
 * Queue next step for execution
 */
async function queueNextStep(executionId, workflowId, tenantId) {
  if (!STEP_QUEUE_URL) {
    console.warn('[StepExecutor] WORKFLOW_STEP_QUEUE_URL not set');
    return;
  }

  await sqs.send(new SendMessageCommand({
    QueueUrl: STEP_QUEUE_URL,
    MessageBody: JSON.stringify({
      executionId,
      workflowId,
      tenantId,
      action: 'execute_next',
      timestamp: new Date().toISOString(),
    }),
  }));
}

/**
 * Schedule delayed step execution using EventBridge Scheduler
 */
async function scheduleDelayedExecution(executionId, workflowId, tenantId, waitUntil) {
  if (!STEP_EXECUTOR_ARN || !SCHEDULER_ROLE_ARN) {
    console.warn('[StepExecutor] Scheduler ARNs not configured');
    return;
  }

  const scheduleName = `workflow-resume-${executionId}`;

  try {
    await scheduler.send(new CreateScheduleCommand({
      Name: scheduleName,
      GroupName: 'workflow-schedules',
      ScheduleExpression: `at(${waitUntil.toISOString().split('.')[0]})`,
      ScheduleExpressionTimezone: 'UTC',
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: {
        Arn: STEP_QUEUE_URL,
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({
          executionId,
          workflowId,
          tenantId,
          action: 'resume',
          timestamp: new Date().toISOString(),
        }),
      },
      ActionAfterCompletion: 'DELETE',
    }));

    console.log('[StepExecutor] Scheduled delayed execution:', scheduleName, 'at', waitUntil);
  } catch (error) {
    console.error('[StepExecutor] Error scheduling delayed execution:', error);
    throw error;
  }
}

/**
 * Mark execution as completed
 */
async function completeExecution(executionId, workflowId) {
  await query(
    `UPDATE "WorkflowExecution"
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1`,
    [executionId]
  );

  // Increment workflow completed count
  await query(
    `UPDATE "Workflow"
     SET completed_count = completed_count + 1
     WHERE id = $1`,
    [workflowId]
  );

  console.log('[StepExecutor] Execution completed:', executionId);
}

/**
 * Mark execution as failed
 */
async function failExecution(executionId, errorMessage) {
  await query(
    `UPDATE "WorkflowExecution"
     SET status = 'failed', error_message = $1, completed_at = NOW()
     WHERE id = $2`,
    [errorMessage, executionId]
  );

  console.log('[StepExecutor] Execution failed:', executionId, errorMessage);
}
