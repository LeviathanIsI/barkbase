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
  console.log('[STEP EXECUTOR] ========================================');
  console.log('[STEP EXECUTOR] LAMBDA INVOKED');
  console.log('[STEP EXECUTOR] ========================================');
  console.log('[STEP EXECUTOR] Event:', JSON.stringify(event, null, 2));
  console.log('[STEP EXECUTOR] Records count:', event.Records?.length || 0);
  console.log('[STEP EXECUTOR] STEP_QUEUE_URL:', STEP_QUEUE_URL);
  console.log('[STEP EXECUTOR] SCHEDULER_ROLE_ARN:', SCHEDULER_ROLE_ARN);

  // Ensure database pool is initialized
  console.log('[STEP EXECUTOR] Initializing database pool...');
  await getPoolAsync();
  console.log('[STEP EXECUTOR] Database pool ready');

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  // Process each SQS record
  for (const record of event.Records || []) {
    console.log('[STEP EXECUTOR] Processing record:', record.messageId);
    console.log('[STEP EXECUTOR] Record body:', record.body);
    try {
      const message = JSON.parse(record.body);
      console.log('[STEP EXECUTOR] Parsed message:', JSON.stringify(message, null, 2));
      await processStepExecution(message);
      results.processed++;
      results.succeeded++;
      console.log('[STEP EXECUTOR] Record processed successfully');
    } catch (error) {
      console.error('[STEP EXECUTOR] Error processing message:', error);
      console.error('[STEP EXECUTOR] Error stack:', error.stack);
      results.failed++;
      results.errors.push({
        messageId: record.messageId,
        error: error.message,
      });
    }
  }

  console.log('[STEP EXECUTOR] ========================================');
  console.log('[STEP EXECUTOR] FINAL RESULTS:', JSON.stringify(results, null, 2));
  console.log('[STEP EXECUTOR] ========================================');

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

  console.log('[STEP EXECUTOR] ---------- PROCESS STEP EXECUTION ----------');
  console.log('[STEP EXECUTOR] Execution ID:', executionId);
  console.log('[STEP EXECUTOR] Workflow ID:', workflowId);
  console.log('[STEP EXECUTOR] Tenant ID:', tenantId);
  console.log('[STEP EXECUTOR] Action:', action);

  // Get execution details including workflow goal_config and timing_config
  console.log('[STEP EXECUTOR] Fetching execution details...');
  const executionResult = await query(
    `SELECT we.*, w.name as workflow_name, w.object_type, w.goal_config,
            w.settings->'timingConfig' as timing_config
     FROM "WorkflowExecution" we
     JOIN "Workflow" w ON we.workflow_id = w.id
     WHERE we.id = $1 AND we.tenant_id = $2`,
    [executionId, tenantId]
  );

  if (executionResult.rows.length === 0) {
    console.error('[STEP EXECUTOR] Execution NOT FOUND:', executionId);
    return;
  }

  const execution = executionResult.rows[0];
  console.log('[STEP EXECUTOR] Execution found:', JSON.stringify(execution, null, 2));

  // Check if execution is still running
  if (execution.status !== 'running' && execution.status !== 'paused') {
    console.log('[STEP EXECUTOR] Execution not active. Status:', execution.status);
    return;
  }

  // Get current step details
  console.log('[STEP EXECUTOR] Fetching step details. Step ID:', execution.current_step_id);
  const stepResult = await query(
    `SELECT * FROM "WorkflowStep" WHERE id = $1`,
    [execution.current_step_id]
  );

  if (stepResult.rows.length === 0) {
    console.error('[STEP EXECUTOR] Step NOT FOUND:', execution.current_step_id);
    await failExecution(executionId, 'Step not found');
    return;
  }

  const step = stepResult.rows[0];
  console.log('[STEP EXECUTOR] Step found:', JSON.stringify(step, null, 2));
  console.log('[STEP EXECUTOR] Step type:', step.step_type);
  console.log('[STEP EXECUTOR] Action type:', step.action_type);
  console.log('[STEP EXECUTOR] Step config:', JSON.stringify(step.config, null, 2));

  // Get record data for template interpolation
  console.log('[STEP EXECUTOR] Fetching record data. Record ID:', execution.record_id, '| Type:', execution.object_type);
  const recordData = await getRecordData(execution.record_id, execution.object_type, tenantId);
  console.log('[STEP EXECUTOR] Record data:', JSON.stringify(recordData, null, 2));

  // Execute step based on type
  let stepResult2;
  console.log('[STEP EXECUTOR] Executing step type:', step.step_type);
  try {
    switch (step.step_type) {
      case 'action':
        console.log('[STEP EXECUTOR] Executing ACTION step');

        // Check timing restrictions before executing action
        if (execution.timing_config?.enabled) {
          console.log('[STEP EXECUTOR] Checking timing restrictions...');
          const timingCheck = checkTimingRestrictions(execution.timing_config);

          if (!timingCheck.allowed) {
            console.log('[STEP EXECUTOR] Action blocked by timing restrictions. Next allowed:', timingCheck.nextAllowedTime);

            // Pause execution until next allowed time
            await pauseForTiming(execution.id, workflowId, tenantId, timingCheck.nextAllowedTime, step.id);

            stepResult2 = {
              success: true,
              paused: true,
              pausedReason: 'timing_restriction',
              result: {
                pausedAt: new Date().toISOString(),
                resumeAt: timingCheck.nextAllowedTime.toISOString(),
                reason: timingCheck.reason,
              },
            };
            break;
          }
          console.log('[STEP EXECUTOR] Timing check passed');
        }

        stepResult2 = await executeAction(step, execution, recordData, tenantId);
        break;
      case 'wait':
        console.log('[STEP EXECUTOR] Executing WAIT step');
        stepResult2 = await executeWait(step, execution, recordData, tenantId);
        break;
      case 'determinator':
        console.log('[STEP EXECUTOR] Executing DETERMINATOR step');
        stepResult2 = await executeDeterminator(step, execution, recordData, tenantId);
        break;
      case 'gate':
        console.log('[STEP EXECUTOR] Executing GATE step');
        stepResult2 = await executeGate(step, execution, recordData, tenantId);
        break;
      case 'terminus':
        console.log('[STEP EXECUTOR] Executing TERMINUS step');
        stepResult2 = await executeTerminus(step, execution, tenantId);
        break;
      default:
        console.error('[STEP EXECUTOR] Unknown step type:', step.step_type);
        stepResult2 = { success: false, error: 'Unknown step type' };
    }
  } catch (error) {
    console.error('[STEP EXECUTOR] Step execution error:', error);
    console.error('[STEP EXECUTOR] Error stack:', error.stack);
    stepResult2 = { success: false, error: error.message };
  }

  console.log('[STEP EXECUTOR] Step result:', JSON.stringify(stepResult2, null, 2));

  // Log step execution
  console.log('[STEP EXECUTOR] Logging step execution...');
  await logStepExecution(executionId, step.id, stepResult2);

  // Handle result and queue next step if needed
  if (stepResult2.success) {
    console.log('[STEP EXECUTOR] Step succeeded');

    // If paused for timing, don't proceed to next step
    if (stepResult2.paused) {
      console.log('[STEP EXECUTOR] Execution paused for timing restrictions');
      console.log('[STEP EXECUTOR] ---------- PROCESS STEP EXECUTION COMPLETE (PAUSED) ----------');
      return;
    }

    // Check if workflow has goal conditions and if they're met
    if (execution.goal_config) {
      console.log('[STEP EXECUTOR] Checking goal conditions...');
      // Refresh record data to get latest state
      const freshRecordData = await getRecordData(execution.record_id, execution.object_type, tenantId);
      const goalResult = evaluateGoalConditions(execution.goal_config, freshRecordData);

      if (goalResult.met) {
        console.log('[STEP EXECUTOR] GOAL REACHED! Completing execution early.');
        await logGoalCompletion(executionId, step.id, goalResult);
        await completeExecution(executionId, workflowId, 'goal_reached', goalResult);
        console.log('[STEP EXECUTOR] ---------- PROCESS STEP EXECUTION COMPLETE (GOAL) ----------');
        return; // Exit early - goal reached
      }
      console.log('[STEP EXECUTOR] Goal not yet met, continuing workflow');
    }

    if (stepResult2.nextStepId) {
      // Update current step and queue next
      console.log('[STEP EXECUTOR] Has next step:', stepResult2.nextStepId);
      await updateCurrentStep(executionId, stepResult2.nextStepId);
      await queueNextStep(executionId, workflowId, tenantId);
      console.log('[STEP EXECUTOR] Next step queued');
    } else if (stepResult2.waitUntil) {
      // Schedule delayed execution
      console.log('[STEP EXECUTOR] Scheduling delayed execution until:', stepResult2.waitUntil);
      await scheduleDelayedExecution(executionId, workflowId, tenantId, stepResult2.waitUntil);
      console.log('[STEP EXECUTOR] Delayed execution scheduled');
    } else if (stepResult2.completed) {
      // Workflow completed normally
      console.log('[STEP EXECUTOR] Workflow COMPLETED');
      await completeExecution(executionId, workflowId, 'completed', null);
    } else {
      console.log('[STEP EXECUTOR] No next step, no wait, no completed flag - workflow may be stuck!');
    }
  } else {
    // Step failed
    console.error('[STEP EXECUTOR] Step FAILED:', stepResult2.error);
    await failExecution(executionId, stepResult2.error);
  }

  console.log('[STEP EXECUTOR] ---------- PROCESS STEP EXECUTION COMPLETE ----------');
}

/**
 * Execute an action step
 */
async function executeAction(step, execution, recordData, tenantId) {
  const config = step.config || {};
  const actionType = step.action_type;

  console.log('[STEP EXECUTOR] ===== EXECUTE ACTION =====');
  console.log('[STEP EXECUTOR] Action type:', actionType);
  console.log('[STEP EXECUTOR] Config:', JSON.stringify(config, null, 2));
  console.log('[STEP EXECUTOR] Record data:', JSON.stringify(recordData, null, 2));

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
 * Task table uses snake_case columns: id, tenant_id, title, description, task_type, priority, status, due_at, pet_id, etc.
 */
async function executeCreateTask(config, recordData, tenantId) {
  try {
    const title = interpolateTemplate(config.title || 'Workflow Task', recordData);
    const description = interpolateTemplate(config.description || '', recordData);
    const dueInHours = config.due_in_hours || 24;

    // Map config priority to integer (1=low, 2=medium, 3=high, 4=urgent)
    const priorityMap = {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4,
    };
    const priority = priorityMap[(config.priority || 'medium').toLowerCase()] || 2;

    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + dueInHours);

    // Get pet_id from record data
    const petId = recordData.record?.id;

    const taskResult = await query(
      `INSERT INTO "Task" (
         id, tenant_id, title, description, task_type, priority, status, due_at, pet_id, created_at, updated_at
       )
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id`,
      [
        tenantId,
        title,
        description || null,
        'OTHER',  // task_type for workflow-generated tasks
        priority,
        'PENDING',  // status
        dueAt.toISOString(),
        petId,
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
 * Evaluate workflow goal conditions against record data
 * Returns { met: boolean, matchedConditions: array } for detailed tracking
 */
function evaluateGoalConditions(goalConfig, recordData) {
  if (!goalConfig) {
    return { met: false, reason: 'No goal configured' };
  }

  const conditions = goalConfig.conditions || [];
  const conditionLogic = goalConfig.conditionLogic || goalConfig.logic || 'and';

  if (conditions.length === 0) {
    return { met: false, reason: 'No goal conditions defined' };
  }

  console.log('[StepExecutor] Evaluating goal conditions:', conditions.length, 'conditions with', conditionLogic, 'logic');

  // Evaluate each condition and track results
  const conditionResults = conditions.map(condition => {
    const result = evaluateCondition(condition, recordData);
    return {
      field: condition.field,
      operator: condition.operator,
      expectedValue: condition.value,
      actualValue: getNestedValue(recordData, condition.field),
      met: result,
    };
  });

  // Determine if goal is met based on logic
  let goalMet;
  if (conditionLogic === 'or') {
    goalMet = conditionResults.some(r => r.met);
  } else {
    goalMet = conditionResults.every(r => r.met);
  }

  console.log('[StepExecutor] Goal evaluation result:', goalMet);
  console.log('[StepExecutor] Condition results:', JSON.stringify(conditionResults, null, 2));

  return {
    met: goalMet,
    conditionLogic,
    conditionResults,
    reason: goalMet ? 'All goal conditions satisfied' : 'Goal conditions not yet met',
  };
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

  // Build query dynamically based on which parameters are provided
  // to ensure placeholder numbers match the parameter array
  const params = [workflowId];
  let paramIndex = 2;

  let parentCondition;
  if (parentStepId) {
    parentCondition = `= $${paramIndex}`;
    params.push(parentStepId);
    paramIndex++;
  } else {
    parentCondition = 'IS NULL';
  }

  let branchCondition;
  if (branchPath) {
    branchCondition = `= $${paramIndex}`;
    params.push(branchPath);
    paramIndex++;
  } else {
    branchCondition = 'IS NULL';
  }

  params.push(currentPosition);
  const positionPlaceholder = `$${paramIndex}`;

  // Find next sibling at same level
  const nextSiblingResult = await query(
    `SELECT id FROM "WorkflowStep"
     WHERE workflow_id = $1
       AND parent_step_id ${parentCondition}
       AND branch_path ${branchCondition}
       AND position > ${positionPlaceholder}
     ORDER BY position ASC
     LIMIT 1`,
    params
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
 * Log goal completion to execution log
 */
async function logGoalCompletion(executionId, stepId, goalResult) {
  try {
    await query(
      `INSERT INTO "WorkflowExecutionLog"
         (execution_id, step_id, status, completed_at, result)
       VALUES ($1, $2, 'goal_reached', NOW(), $3)`,
      [
        executionId,
        stepId,
        JSON.stringify({
          event: 'goal_reached',
          conditionLogic: goalResult.conditionLogic,
          conditionResults: goalResult.conditionResults,
          reason: goalResult.reason,
        }),
      ]
    );
    console.log('[StepExecutor] Logged goal completion for execution:', executionId);
  } catch (error) {
    console.error('[StepExecutor] Error logging goal completion:', error);
  }
}

/**
 * Mark execution as completed
 * @param {string} executionId - The execution ID
 * @param {string} workflowId - The workflow ID
 * @param {string} completionReason - Reason for completion: 'completed', 'goal_reached', 'gate_blocked'
 * @param {object} goalResult - Goal evaluation result (if goal_reached)
 */
async function completeExecution(executionId, workflowId, completionReason = 'completed', goalResult = null) {
  // Update execution with completion status and reason
  await query(
    `UPDATE "WorkflowExecution"
     SET status = 'completed',
         completed_at = NOW(),
         completion_reason = $1,
         goal_result = $2
     WHERE id = $3`,
    [
      completionReason,
      goalResult ? JSON.stringify(goalResult) : null,
      executionId,
    ]
  );

  // Increment appropriate workflow counter based on completion reason
  if (completionReason === 'goal_reached') {
    await query(
      `UPDATE "Workflow"
       SET completed_count = COALESCE(completed_count, 0) + 1,
           goal_reached_count = COALESCE(goal_reached_count, 0) + 1
       WHERE id = $1`,
      [workflowId]
    );
    console.log('[StepExecutor] Execution completed (GOAL REACHED):', executionId);
  } else {
    await query(
      `UPDATE "Workflow"
       SET completed_count = COALESCE(completed_count, 0) + 1
       WHERE id = $1`,
      [workflowId]
    );
    console.log('[StepExecutor] Execution completed:', executionId);
  }
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

// =============================================================================
// TIMING RESTRICTION HELPERS
// =============================================================================

/**
 * Check if current time is within allowed timing window
 * @param {object} timingConfig - Timing configuration
 * @returns {{ allowed: boolean, nextAllowedTime?: Date, reason?: string }}
 */
function checkTimingRestrictions(timingConfig) {
  if (!timingConfig || !timingConfig.enabled) {
    return { allowed: true };
  }

  const {
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime = '09:00',
    endTime = '17:00',
    timezone = 'America/New_York',
  } = timingConfig;

  // Get current time in the specified timezone
  const now = new Date();
  const currentTimeInTz = getTimeInTimezone(now, timezone);

  // Check if current day is allowed
  const currentDay = getDayName(currentTimeInTz);
  const isDayAllowed = days.map(d => d.toLowerCase()).includes(currentDay.toLowerCase());

  // Parse start and end times
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const currentHour = currentTimeInTz.getHours();
  const currentMin = currentTimeInTz.getMinutes();

  // Convert to minutes for easier comparison
  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const isTimeAllowed = currentMinutes >= startMinutes && currentMinutes < endMinutes;

  if (isDayAllowed && isTimeAllowed) {
    return { allowed: true };
  }

  // Calculate next allowed time
  const nextAllowedTime = getNextAllowedTime(timingConfig, now);

  let reason;
  if (!isDayAllowed) {
    reason = `Current day (${currentDay}) is not in allowed days: ${days.join(', ')}`;
  } else {
    reason = `Current time (${formatTime(currentHour, currentMin)}) is outside allowed hours: ${startTime} - ${endTime} (${timezone})`;
  }

  return {
    allowed: false,
    nextAllowedTime,
    reason,
  };
}

/**
 * Calculate the next datetime when execution is allowed
 * @param {object} timingConfig - Timing configuration
 * @param {Date} fromDate - Starting date to calculate from (defaults to now)
 * @returns {Date} - Next allowed datetime
 */
function getNextAllowedTime(timingConfig, fromDate = new Date()) {
  const {
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime = '09:00',
    endTime = '17:00',
    timezone = 'America/New_York',
  } = timingConfig;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // Normalize days to lowercase
  const allowedDays = days.map(d => d.toLowerCase());

  // Get current time in timezone
  const currentTimeInTz = getTimeInTimezone(fromDate, timezone);
  const currentDay = getDayName(currentTimeInTz);
  const currentHour = currentTimeInTz.getHours();
  const currentMin = currentTimeInTz.getMinutes();

  // Convert to minutes for comparison
  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Check if today is allowed and if we're before the end time
  if (allowedDays.includes(currentDay.toLowerCase())) {
    // If we're before start time today, return start time today
    if (currentMinutes < startMinutes) {
      return createDateTimeInTimezone(currentTimeInTz, startHour, startMin, timezone);
    }
    // If we're within the window, return now (shouldn't happen if called correctly)
    if (currentMinutes < endMinutes) {
      return fromDate;
    }
  }

  // Need to find next allowed day
  const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayIndex = dayOrder.indexOf(currentDay.toLowerCase());

  // Search up to 7 days ahead
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const targetDayIndex = (currentDayIndex + daysAhead) % 7;
    const targetDay = dayOrder[targetDayIndex];

    if (allowedDays.includes(targetDay)) {
      // Found next allowed day - set to start time on that day
      const targetDate = new Date(currentTimeInTz);
      targetDate.setDate(targetDate.getDate() + daysAhead);
      return createDateTimeInTimezone(targetDate, startHour, startMin, timezone);
    }
  }

  // Fallback: return tomorrow at start time (shouldn't reach here if days array is valid)
  const tomorrow = new Date(currentTimeInTz);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return createDateTimeInTimezone(tomorrow, startHour, startMin, timezone);
}

/**
 * Get current time in a specific timezone
 * @param {Date} date - Date to convert
 * @param {string} timezone - IANA timezone string
 * @returns {Date} - Date object adjusted for timezone display
 */
function getTimeInTimezone(date, timezone) {
  try {
    // Get the date string in the target timezone
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    const getPart = (type) => parts.find(p => p.type === type)?.value;

    const year = parseInt(getPart('year'));
    const month = parseInt(getPart('month')) - 1;
    const day = parseInt(getPart('day'));
    const hour = parseInt(getPart('hour'));
    const minute = parseInt(getPart('minute'));
    const second = parseInt(getPart('second'));

    // Create a new date object representing the time in that timezone
    // This is a "fake" date that just has the right hour/minute values for comparison
    return new Date(year, month, day, hour, minute, second);
  } catch (e) {
    console.error('[StepExecutor] Timezone error:', e);
    return date;
  }
}

/**
 * Create a datetime in a specific timezone and convert to UTC
 * @param {Date} baseDate - Date to use for year/month/day
 * @param {number} hour - Hour in timezone
 * @param {number} minute - Minute in timezone
 * @param {string} timezone - IANA timezone string
 * @returns {Date} - Date object in UTC
 */
function createDateTimeInTimezone(baseDate, hour, minute, timezone) {
  try {
    // Format the date string in the target timezone format
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');
    const hourStr = String(hour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');

    // Create a date string and parse it as if it were in the target timezone
    const dateStr = `${year}-${month}-${day}T${hourStr}:${minStr}:00`;

    // Use Intl to get the UTC offset for this date/time in the target timezone
    const targetDate = new Date(dateStr);
    const utcDate = new Date(targetDate.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }));
    const offset = utcDate - tzDate;

    // Adjust for the timezone offset
    return new Date(targetDate.getTime() + offset);
  } catch (e) {
    console.error('[StepExecutor] Timezone creation error:', e);
    // Fallback to simple approach
    const result = new Date(baseDate);
    result.setHours(hour, minute, 0, 0);
    return result;
  }
}

/**
 * Get day name from date
 * @param {Date} date
 * @returns {string} - Lowercase day name
 */
function getDayName(date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Format time as HH:MM
 * @param {number} hour
 * @param {number} minute
 * @returns {string}
 */
function formatTime(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Pause execution for timing restrictions and schedule resumption
 * @param {string} executionId - Execution ID
 * @param {string} workflowId - Workflow ID
 * @param {string} tenantId - Tenant ID
 * @param {Date} resumeAt - When to resume
 * @param {string} stepId - Current step ID
 */
async function pauseForTiming(executionId, workflowId, tenantId, resumeAt, stepId) {
  console.log('[StepExecutor] Pausing execution for timing. Resume at:', resumeAt);

  // Update execution status
  await query(
    `UPDATE "WorkflowExecution"
     SET status = 'paused',
         resume_at = $1,
         pause_reason = 'timing_restriction',
         updated_at = NOW()
     WHERE id = $2`,
    [resumeAt.toISOString(), executionId]
  );

  // Log the timing pause
  await query(
    `INSERT INTO "WorkflowExecutionLog"
       (execution_id, step_id, status, completed_at, result)
     VALUES ($1, $2, 'pending', NOW(), $3)`,
    [
      executionId,
      stepId,
      JSON.stringify({
        event: 'timing_pause',
        pausedAt: new Date().toISOString(),
        resumeAt: resumeAt.toISOString(),
      }),
    ]
  );

  // Schedule resumption via EventBridge Scheduler
  await scheduleDelayedExecution(executionId, workflowId, tenantId, resumeAt);

  console.log('[StepExecutor] Execution paused and resumption scheduled');
}
