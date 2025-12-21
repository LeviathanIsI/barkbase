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
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const { getPoolAsync, query } = dbLayer;
const {
  sendSMS,
  sendEmail,
  sendTemplatedEmail,
  createResponse,
} = sharedLayer;

// AWS Region
const AWS_REGION = process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2';

// Initialize clients
const sqs = new SQSClient({ region: AWS_REGION });
const scheduler = new SchedulerClient({ region: AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const cloudwatch = new CloudWatchClient({ region: AWS_REGION });

// Rate limiting configuration
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE || 'BarkBaseRateLimits';
const DEFAULT_ACTION_LIMIT_PER_HOUR = parseInt(process.env.DEFAULT_ACTION_LIMIT || '50000', 10);

// Queue URLs from environment
const STEP_QUEUE_URL = process.env.WORKFLOW_STEP_QUEUE_URL;
const STEP_EXECUTOR_ARN = process.env.WORKFLOW_STEP_EXECUTOR_ARN;
const SCHEDULER_ROLE_ARN = process.env.WORKFLOW_SCHEDULER_ROLE_ARN;

// =============================================================================
// RETRY CONFIGURATION (HubSpot-aligned)
// =============================================================================
const RETRY_CONFIG = {
  MAX_RETRY_WINDOW_MS: 3 * 24 * 60 * 60 * 1000, // 3 days in milliseconds
  INITIAL_DELAY_MS: 60 * 1000, // 1 minute
  MAX_DELAY_MS: 8 * 60 * 60 * 1000, // 8 hours
  BACKOFF_MULTIPLIER: 2,
  SQS_MAX_DELAY_SECONDS: 900, // 15 minutes (SQS maximum)
};

// =============================================================================
// RETRY HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate retry delay using exponential backoff
 * @param {number} attemptNumber - Current attempt number (1-based)
 * @param {number} retryAfterMs - Optional Retry-After header value in milliseconds (for 429s)
 * @returns {number} - Delay in milliseconds
 */
function calculateRetryDelay(attemptNumber, retryAfterMs = null) {
  // If Retry-After header is provided (429 response), respect it
  if (retryAfterMs && retryAfterMs > 0) {
    // Cap the Retry-After value at MAX_DELAY_MS
    return Math.min(retryAfterMs, RETRY_CONFIG.MAX_DELAY_MS);
  }

  // Exponential backoff: initial * (multiplier ^ (attempt - 1))
  const delay = RETRY_CONFIG.INITIAL_DELAY_MS *
    Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attemptNumber - 1);

  // Cap at maximum delay
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
}

/**
 * Determine if an error is retryable based on HTTP status code
 * @param {number} httpStatus - HTTP status code
 * @returns {boolean} - Whether the error is retryable
 */
function isRetryableError(httpStatus) {
  // 5XX errors are retryable
  if (httpStatus >= 500 && httpStatus < 600) {
    return true;
  }

  // 429 Too Many Requests is retryable
  if (httpStatus === 429) {
    return true;
  }

  // 4XX errors (except 429) are permanent failures
  if (httpStatus >= 400 && httpStatus < 500) {
    return false;
  }

  // Network errors or unknown errors are retryable
  // (httpStatus will be 0 or undefined for network failures)
  if (!httpStatus || httpStatus === 0) {
    return true;
  }

  return false;
}

/**
 * Check if retry is still within the allowed 3-day window
 * @param {string} firstAttemptTime - ISO timestamp of first attempt
 * @returns {boolean} - Whether we're still within retry window
 */
function isWithinRetryWindow(firstAttemptTime) {
  if (!firstAttemptTime) {
    return true; // First attempt, always allowed
  }

  const firstAttempt = new Date(firstAttemptTime);
  const now = new Date();
  const elapsed = now.getTime() - firstAttempt.getTime();

  return elapsed < RETRY_CONFIG.MAX_RETRY_WINDOW_MS;
}

/**
 * Create initial retry context for first execution attempt
 * @returns {object} - Initial retry context
 */
function createInitialRetryContext() {
  return {
    firstAttemptTime: new Date().toISOString(),
    attemptNumber: 1,
    lastError: null,
  };
}

/**
 * Update retry context for next attempt
 * @param {object} retryContext - Current retry context
 * @param {string} errorMessage - Error message from failed attempt
 * @returns {object} - Updated retry context
 */
function updateRetryContext(retryContext, errorMessage) {
  return {
    firstAttemptTime: retryContext.firstAttemptTime,
    attemptNumber: retryContext.attemptNumber + 1,
    lastError: errorMessage,
  };
}

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
  const { executionId, workflowId, tenantId, action, retryContext, stepId: messageStepId } = message;

  console.log('[STEP EXECUTOR] ---------- PROCESS STEP EXECUTION ----------');
  console.log('[STEP EXECUTOR] Execution ID:', executionId);
  console.log('[STEP EXECUTOR] Workflow ID:', workflowId);
  console.log('[STEP EXECUTOR] Tenant ID:', tenantId);
  console.log('[STEP EXECUTOR] Action:', action);
  if (retryContext) {
    console.log('[STEP EXECUTOR] Retry Context:', JSON.stringify(retryContext, null, 2));
  }

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

  // Check if execution is still running (allow 'retrying' status for retry attempts)
  if (execution.status !== 'running' && execution.status !== 'paused' && execution.status !== 'retrying') {
    console.log('[STEP EXECUTOR] Execution not active. Status:', execution.status);
    return;
  }

  // For retry_step actions, use the step ID from message; otherwise use execution's current step
  const targetStepId = (action === 'retry_step' && messageStepId) ? messageStepId : execution.current_step_id;

  // Get step details
  console.log('[STEP EXECUTOR] Fetching step details. Step ID:', targetStepId);
  const stepResult = await query(
    `SELECT * FROM "WorkflowStep" WHERE id = $1`,
    [targetStepId]
  );

  if (stepResult.rows.length === 0) {
    console.error('[STEP EXECUTOR] Step NOT FOUND:', targetStepId);
    await failExecution(executionId, 'Step not found');
    return;
  }

  const step = stepResult.rows[0];
  console.log('[STEP EXECUTOR] Step found:', JSON.stringify(step, null, 2));
  console.log('[STEP EXECUTOR] Step type:', step.step_type);
  console.log('[STEP EXECUTOR] Action type:', step.action_type);
  console.log('[STEP EXECUTOR] Step config (live):', JSON.stringify(step.config, null, 2));

  // If execution has workflow_revision, use snapshotted step config
  // This ensures in-progress executions use the version they enrolled under
  if (execution.workflow_revision) {
    console.log('[STEP EXECUTOR] Execution has workflow_revision:', execution.workflow_revision);
    const snapshotConfig = await getStepConfigFromRevision(
      execution.workflow_id,
      targetStepId,
      execution.workflow_revision
    );
    if (snapshotConfig) {
      step.config = snapshotConfig;
      console.log('[STEP EXECUTOR] Step config (from revision snapshot):', JSON.stringify(step.config, null, 2));
    } else {
      console.log('[STEP EXECUTOR] No snapshot config found, using live config');
    }
  }

  // Get record data for template interpolation
  console.log('[STEP EXECUTOR] Fetching record data. Record ID:', execution.record_id, '| Type:', execution.object_type);
  const recordData = await getRecordData(execution.record_id, execution.object_type, tenantId);
  console.log('[STEP EXECUTOR] Record data:', JSON.stringify(recordData, null, 2));

  // Execute step based on type
  let stepResult2;
  const stepStartedAt = new Date();
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

        stepResult2 = await executeAction(step, execution, recordData, tenantId, retryContext);
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

  // Log step execution with full details
  console.log('[STEP EXECUTOR] Logging step execution...');
  await logStepExecution(executionId, step, stepResult2, stepStartedAt);

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
      // No more steps - workflow is complete
      console.log('[STEP EXECUTOR] No next step - completing workflow');
      await completeExecution(executionId, workflowId, 'completed', null);
    }
  } else {
    // Step failed - check if retry was scheduled or if it's a permanent failure
    console.error('[STEP EXECUTOR] Step FAILED:', stepResult2.error);

    if (stepResult2.retryScheduled) {
      // Retry has been scheduled - update execution status to 'retrying'
      console.log('[STEP EXECUTOR] Retry scheduled. Attempt:', stepResult2.nextRetryContext?.attemptNumber);
      console.log('[STEP EXECUTOR] Next retry in:', stepResult2.retryDelayMs, 'ms');

      await query(
        `UPDATE "WorkflowExecution"
         SET status = 'retrying',
             retry_context = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(stepResult2.nextRetryContext), executionId]
      );

      // Log the retry event
      await query(
        `INSERT INTO "WorkflowExecutionLog" (
          id, execution_id, step_id, status, event_type, started_at, completed_at, result
        ) VALUES (
          gen_random_uuid(), $1, $2, 'pending', 'retry_scheduled', NOW(), NOW(), $3
        )`,
        [
          executionId,
          step.id,
          JSON.stringify({
            error: stepResult2.error,
            httpStatus: stepResult2.httpStatus,
            attemptNumber: stepResult2.nextRetryContext?.attemptNumber,
            retryDelayMs: stepResult2.retryDelayMs,
            nextRetryAt: new Date(Date.now() + stepResult2.retryDelayMs).toISOString(),
          }),
        ]
      );

      console.log('[STEP EXECUTOR] Execution status updated to retrying');
    } else {
      // Permanent failure - no retry possible
      console.log('[STEP EXECUTOR] Permanent failure - no retry possible');
      if (stepResult2.retryWindowExceeded) {
        console.log('[STEP EXECUTOR] Reason: Retry window (3 days) exceeded');
      }
      await failExecution(executionId, stepResult2.error);
    }
  }

  console.log('[STEP EXECUTOR] ---------- PROCESS STEP EXECUTION COMPLETE ----------');
}

/**
 * Execute an action step with retry handling
 * @param {object} step - Step configuration
 * @param {object} execution - Execution details
 * @param {object} recordData - Record data for template interpolation
 * @param {string} tenantId - Tenant ID
 * @param {object} retryContext - Retry context (firstAttemptTime, attemptNumber, lastError)
 * @returns {object} - Result with success, nextStepId, or retry/failure info
 */
async function executeAction(step, execution, recordData, tenantId, retryContext = null) {
  const config = step.config || {};
  const actionType = step.action_type;

  // Initialize retry context if not provided (first attempt)
  const currentRetryContext = retryContext || createInitialRetryContext();

  console.log('[STEP EXECUTOR] ===== EXECUTE ACTION =====');
  console.log('[STEP EXECUTOR] Action type:', actionType);
  console.log('[STEP EXECUTOR] Config:', JSON.stringify(config, null, 2));
  console.log('[STEP EXECUTOR] Record data:', JSON.stringify(recordData, null, 2));
  console.log('[STEP EXECUTOR] Retry context:', JSON.stringify(currentRetryContext, null, 2));

  // Check tenant action rate limit before executing
  const rateLimitCheck = await checkActionRateLimit(tenantId);
  if (!rateLimitCheck.allowed) {
    console.warn('[STEP EXECUTOR] RATE LIMITED: Tenant exceeded action limit:', {
      tenantId,
      actionType,
      stepId: step.id,
      executionId: execution.id,
      currentCount: rateLimitCheck.currentCount,
      limit: rateLimitCheck.limit,
    });

    // Emit CloudWatch metric for throttled action
    await emitThrottledActionMetric(tenantId);

    // Return rate limited result - this is NOT retryable
    return {
      success: false,
      error: 'Rate limit exceeded',
      rateLimited: true,
      currentCount: rateLimitCheck.currentCount,
      limit: rateLimitCheck.limit,
      retryable: false,
    };
  }

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
    case 'send_notification':
      result = await executeSendNotification(config, execution, recordData, tenantId);
      break;
    case 'enroll_in_workflow':
      result = await executeEnrollInWorkflow(config, execution, recordData, tenantId);
      break;
    case 'webhook':
      result = await executeWebhook(config, execution, recordData, tenantId);
      break;
    case 'add_to_segment':
      result = await executeAddToSegment(config, execution, recordData, tenantId);
      break;
    case 'remove_from_segment':
      result = await executeRemoveFromSegment(config, execution, recordData, tenantId);
      break;
    default:
      result = { success: false, error: `Unknown action type: ${actionType}`, retryable: false, httpStatus: 400 };
  }

  // Find next step on success
  if (result.success) {
    // Increment action count for rate limiting
    await incrementActionCount(tenantId);

    const nextStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_id);
    return { ...result, nextStepId };
  }

  // Handle failure with retry logic
  console.log('[STEP EXECUTOR] Action failed. Retryable:', result.retryable, 'HTTP Status:', result.httpStatus);

  // Check if error is retryable
  if (!result.retryable) {
    console.log('[STEP EXECUTOR] Non-retryable error (4XX or config issue). Failing permanently.');
    return {
      success: false,
      error: result.error,
      permanentFailure: true,
      httpStatus: result.httpStatus,
    };
  }

  // Check if we're within the 3-day retry window
  if (!isWithinRetryWindow(currentRetryContext.firstAttemptTime)) {
    console.log('[STEP EXECUTOR] Retry window (3 days) exceeded. Failing permanently.');
    return {
      success: false,
      error: `${result.error} (retry window exceeded after ${currentRetryContext.attemptNumber} attempts)`,
      permanentFailure: true,
      httpStatus: result.httpStatus,
      retryWindowExceeded: true,
    };
  }

  // Calculate retry delay with exponential backoff
  const retryDelayMs = calculateRetryDelay(
    currentRetryContext.attemptNumber,
    result.retryAfterMs // For 429 responses with Retry-After header
  );

  // Update retry context for next attempt
  const nextRetryContext = updateRetryContext(currentRetryContext, result.error);

  console.log('[STEP EXECUTOR] Scheduling retry. Attempt:', nextRetryContext.attemptNumber, 'Delay:', retryDelayMs, 'ms');

  // Schedule the retry
  try {
    await scheduleRetryExecution(
      execution.id,
      step.workflow_id,
      tenantId,
      step.id,
      retryDelayMs,
      nextRetryContext
    );

    return {
      success: false,
      error: result.error,
      retryScheduled: true,
      nextRetryContext,
      retryDelayMs,
      httpStatus: result.httpStatus,
    };
  } catch (scheduleError) {
    console.error('[STEP EXECUTOR] Failed to schedule retry:', scheduleError);
    return {
      success: false,
      error: `${result.error} (failed to schedule retry: ${scheduleError.message})`,
      permanentFailure: true,
      httpStatus: result.httpStatus,
    };
  }
}

/**
 * Execute send_sms action
 */
async function executeSendSMS(config, recordData, tenantId) {
  try {
    const message = interpolateTemplate(config.message || '', recordData);
    const recipient = getRecipientPhone(config.recipient, recordData);

    if (!recipient) {
      // Missing recipient is a permanent failure (4XX equivalent)
      return { success: false, error: 'No recipient phone number', retryable: false, httpStatus: 400 };
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
    // Extract HTTP status from Twilio errors if available
    const httpStatus = error.status || error.code || 0;
    const retryAfterMs = error.retryAfter ? error.retryAfter * 1000 : null;
    const retryable = isRetryableError(httpStatus);
    return {
      success: false,
      error: error.message,
      retryable,
      httpStatus,
      retryAfterMs,
    };
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
      // Missing recipient is a permanent failure (4XX equivalent)
      return { success: false, error: 'No recipient email address', retryable: false, httpStatus: 400 };
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
    // Extract HTTP status from SES errors if available
    const httpStatus = error.$metadata?.httpStatusCode || error.statusCode || 0;
    const retryable = isRetryableError(httpStatus);
    return {
      success: false,
      error: error.message,
      retryable,
      httpStatus,
    };
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
    // Database errors are generally retryable (connection issues, deadlocks)
    // but constraint violations are not
    const isConstraintViolation = error.code === '23505' || error.code === '23503';
    return {
      success: false,
      error: error.message,
      retryable: !isConstraintViolation,
      httpStatus: isConstraintViolation ? 400 : 500,
    };
  }
}

/**
 * Execute update_field action
 */
async function executeUpdateField(config, execution, recordData, tenantId) {
  try {
    const { field, value } = config;
    if (!field) {
      // Missing field is a permanent failure (config issue)
      return { success: false, error: 'No field specified', retryable: false, httpStatus: 400 };
    }

    const interpolatedValue = interpolateTemplate(value || '', recordData);
    const tableName = getTableName(execution.object_type);

    if (!tableName) {
      return { success: false, error: 'Invalid object type', retryable: false, httpStatus: 400 };
    }

    // Only allow specific fields to be updated for security
    const allowedFields = getAllowedUpdateFields(execution.object_type);
    if (!allowedFields.includes(field)) {
      return { success: false, error: `Field ${field} not allowed for update`, retryable: false, httpStatus: 400 };
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
    // Database errors are generally retryable (connection issues, deadlocks)
    const isConstraintViolation = error.code === '23505' || error.code === '23503';
    return {
      success: false,
      error: error.message,
      retryable: !isConstraintViolation,
      httpStatus: isConstraintViolation ? 400 : 500,
    };
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
    // Database errors are generally retryable
    const isConstraintViolation = error.code === '23505' || error.code === '23503';
    return {
      success: false,
      error: error.message,
      retryable: !isConstraintViolation,
      httpStatus: isConstraintViolation ? 400 : 500,
    };
  }
}

/**
 * Execute send_notification action
 * Creates in-app notification for staff or owners
 *
 * Config:
 * - title: Notification title (supports template interpolation)
 * - message: Notification body (supports template interpolation)
 * - recipientType: 'staff' or 'owner'
 * - recipientId: Optional specific recipient ID (null for broadcast)
 * - priority: 'low', 'normal', 'high', or 'urgent'
 */
async function executeSendNotification(config, execution, recordData, tenantId) {
  try {
    // Validate required fields
    if (!config.title) {
      return { success: false, error: 'Notification title is required', retryable: false, httpStatus: 400 };
    }

    const recipientType = config.recipientType || 'staff';
    if (!['staff', 'owner'].includes(recipientType)) {
      return { success: false, error: `Invalid recipient type: ${recipientType}`, retryable: false, httpStatus: 400 };
    }

    // Interpolate title and message with record data
    const title = interpolateTemplate(config.title, recordData);
    const message = config.message ? interpolateTemplate(config.message, recordData) : null;

    // Normalize priority
    const priority = ['low', 'normal', 'high', 'urgent'].includes(config.priority)
      ? config.priority
      : 'normal';

    // Determine recipient ID
    let recipientId = config.recipientId || null;

    // If no specific recipient and recipientType is 'owner', use the record's owner
    if (!recipientId && recipientType === 'owner') {
      if (recordData.owner?.id) {
        recipientId = recordData.owner.id;
      } else if (recordData.record?.owner_id) {
        recipientId = recordData.record.owner_id;
      }
    }

    // Build metadata
    const metadata = {
      workflowId: execution.workflow_id,
      executionId: execution.id,
      stepId: config.stepId,
    };

    // Insert notification
    const result = await query(
      `INSERT INTO "Notification"
         (tenant_id, title, message, type, priority, entity_type, entity_id, recipient_type, recipient_id, metadata)
       VALUES ($1, $2, $3, 'workflow', $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        tenantId,
        title,
        message,
        priority,
        execution.object_type,
        execution.record_id,
        recipientType,
        recipientId,
        JSON.stringify(metadata),
      ]
    );

    const notificationId = result.rows[0]?.id;

    console.log('[StepExecutor] Notification created:', {
      notificationId,
      title,
      recipientType,
      recipientId,
      priority,
    });

    return {
      success: true,
      result: {
        notificationId,
        title,
        recipientType,
        recipientId,
        priority,
      },
    };
  } catch (error) {
    console.error('[StepExecutor] Send notification error:', error);
    // Database errors are generally retryable, except constraint violations
    const isConstraintViolation = error.code === '23505' || error.code === '23503';
    return {
      success: false,
      error: error.message,
      retryable: !isConstraintViolation,
      httpStatus: isConstraintViolation ? 400 : 500,
    };
  }
}

/**
 * Execute enroll_in_workflow action
 */
async function executeEnrollInWorkflow(config, execution, recordData, tenantId) {
  try {
    const targetWorkflowId = config.workflow_id;
    if (!targetWorkflowId) {
      // Missing workflow ID is a config issue - permanent failure
      return { success: false, error: 'No target workflow specified', retryable: false, httpStatus: 400 };
    }

    // Queue enrollment event
    // Include sourceWorkflowId to prevent infinite loops (record enrolling back into same workflow)
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
          sourceWorkflowId: execution.workflow_id, // Used for infinite loop prevention
        },
      }),
    }));

    return {
      success: true,
      result: { targetWorkflowId },
    };
  } catch (error) {
    console.error('[StepExecutor] Enroll in workflow error:', error);
    // SQS errors are generally retryable (throttling, service issues)
    const httpStatus = error.$metadata?.httpStatusCode || 500;
    return {
      success: false,
      error: error.message,
      retryable: isRetryableError(httpStatus),
      httpStatus,
    };
  }
}

/**
 * Execute webhook action
 * HubSpot-aligned: 30-second timeout, proper error handling, retry headers
 */
async function executeWebhook(config, execution, recordData, tenantId) {
  const WEBHOOK_TIMEOUT_MS = 30000; // 30 seconds (HubSpot spec)

  try {
    const url = config.url;
    if (!url) {
      return { success: false, error: 'No webhook URL configured', retryable: false, httpStatus: 400 };
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { success: false, error: `Invalid webhook URL: ${url}`, retryable: false, httpStatus: 400 };
    }

    const method = (config.method || 'POST').toUpperCase();
    const onFailure = config.onFailure || 'fail'; // 'fail', 'continue', 'retry'

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'BarkBase-Workflow/1.0',
      'X-BarkBase-Workflow-Id': execution.workflow_id,
      'X-BarkBase-Execution-Id': execution.id,
      'X-BarkBase-Tenant-Id': tenantId,
    };

    // Add authentication headers
    if (config.authType === 'api_key' && config.apiKeyValue) {
      const headerName = config.apiKeyHeader || 'X-API-Key';
      headers[headerName] = config.apiKeyValue;
    } else if (config.authType === 'bearer' && config.bearerToken) {
      headers['Authorization'] = `Bearer ${config.bearerToken}`;
    } else if (config.authType === 'basic' && config.basicUsername) {
      const credentials = Buffer.from(`${config.basicUsername}:${config.basicPassword || ''}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Add custom headers from config (JSON string)
    if (config.headers) {
      try {
        const customHeaders = typeof config.headers === 'string' ? JSON.parse(config.headers) : config.headers;
        Object.assign(headers, customHeaders);
      } catch (e) {
        console.warn('[StepExecutor] Invalid custom headers JSON:', e.message);
      }
    }

    // Build request body
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      if (config.payload) {
        // Use custom payload if provided
        try {
          const customPayload = typeof config.payload === 'string' ? JSON.parse(config.payload) : config.payload;
          // Interpolate template variables in payload
          body = JSON.stringify(interpolatePayload(customPayload, recordData, execution));
        } catch (e) {
          console.warn('[StepExecutor] Invalid custom payload JSON, using default:', e.message);
          body = JSON.stringify(buildDefaultPayload(recordData, execution, tenantId));
        }
      } else {
        body = JSON.stringify(buildDefaultPayload(recordData, execution, tenantId));
      }
    }

    console.log('[StepExecutor] Webhook request:', {
      url,
      method,
      headersCount: Object.keys(headers).length,
      bodyLength: body?.length || 0,
    });

    // Make HTTP request with timeout
    const response = await makeHttpRequest({
      url: parsedUrl,
      method,
      headers,
      body,
      timeoutMs: WEBHOOK_TIMEOUT_MS,
    });

    console.log('[StepExecutor] Webhook response:', {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      bodyLength: response.body?.length || 0,
    });

    // Handle response based on status code
    if (response.statusCode >= 200 && response.statusCode < 300) {
      // SUCCESS: Continue workflow
      return {
        success: true,
        result: {
          statusCode: response.statusCode,
          body: response.body?.substring(0, 1000), // Truncate for logging
        },
      };
    }

    // Handle 429 Too Many Requests
    if (response.statusCode === 429) {
      const retryAfterMs = parseRetryAfterHeader(response.headers);
      console.log('[StepExecutor] Webhook rate limited (429). Retry-After:', retryAfterMs, 'ms');
      return {
        success: false,
        error: `Webhook rate limited (429): ${response.body?.substring(0, 200) || 'Too Many Requests'}`,
        retryable: true,
        httpStatus: 429,
        retryAfterMs,
      };
    }

    // Handle 5XX server errors - retryable
    if (response.statusCode >= 500) {
      return {
        success: false,
        error: `Webhook server error (${response.statusCode}): ${response.body?.substring(0, 200) || response.statusMessage}`,
        retryable: true,
        httpStatus: response.statusCode,
      };
    }

    // Handle 4XX client errors - NOT retryable (except 429 handled above)
    if (response.statusCode >= 400) {
      // Check onFailure config
      if (onFailure === 'continue') {
        console.log('[StepExecutor] Webhook failed with 4XX but onFailure=continue, proceeding');
        return {
          success: true, // Treat as success to continue workflow
          result: {
            statusCode: response.statusCode,
            body: response.body?.substring(0, 1000),
            failedButContinued: true,
          },
        };
      }

      return {
        success: false,
        error: `Webhook client error (${response.statusCode}): ${response.body?.substring(0, 200) || response.statusMessage}`,
        retryable: false,
        httpStatus: response.statusCode,
      };
    }

    // Unexpected status code
    return {
      success: false,
      error: `Unexpected webhook response (${response.statusCode}): ${response.statusMessage}`,
      retryable: false,
      httpStatus: response.statusCode,
    };

  } catch (error) {
    console.error('[StepExecutor] Webhook error:', error);

    // Timeout errors are retryable
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT' || error.message?.includes('timeout')) {
      return {
        success: false,
        error: `Webhook timeout after 30 seconds: ${error.message}`,
        retryable: true,
        httpStatus: 504,
      };
    }

    // Network errors are generally retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: `Webhook network error: ${error.message}`,
        retryable: true,
        httpStatus: 503,
      };
    }

    // DNS resolution errors - may be permanent
    if (error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: `Webhook DNS error: ${error.message}`,
        retryable: false,
        httpStatus: 400,
      };
    }

    // Other errors - assume retryable
    return {
      success: false,
      error: error.message,
      retryable: true,
      httpStatus: 500,
    };
  }
}

/**
 * Make HTTP/HTTPS request with timeout
 */
function makeHttpRequest({ url, method, headers, body, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const protocol = url.protocol === 'https:' ? require('https') : require('http');

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
      timeout: timeoutMs,
    };

    const req = protocol.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: responseBody,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * Parse Retry-After header (can be seconds or HTTP date)
 */
function parseRetryAfterHeader(headers) {
  const retryAfter = headers['retry-after'];
  if (!retryAfter) {
    return null;
  }

  // Try parsing as number of seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  try {
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
}

/**
 * Build default webhook payload with record and execution data
 */
function buildDefaultPayload(recordData, execution, tenantId) {
  return {
    event: 'workflow.webhook',
    timestamp: new Date().toISOString(),
    workflow: {
      id: execution.workflow_id,
      name: execution.workflow_name,
      executionId: execution.id,
    },
    tenant: {
      id: tenantId,
    },
    record: recordData.record || {},
    recordType: recordData.recordType,
    relatedData: {
      owner: recordData.owner || null,
      pet: recordData.pet || null,
    },
  };
}

/**
 * Interpolate template variables in webhook payload
 * Supports {{record.field}}, {{owner.field}}, {{pet.field}} patterns
 */
function interpolatePayload(payload, recordData, execution) {
  const jsonStr = JSON.stringify(payload);

  const interpolated = jsonStr.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValueForWebhook(recordData, path.trim());
    if (value === undefined || value === null) {
      return '';
    }
    // Escape for JSON string context
    return String(value).replace(/"/g, '\\"');
  });

  try {
    return JSON.parse(interpolated);
  } catch {
    // If parsing fails, return original payload
    return payload;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValueForWebhook(obj, path) {
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
 * Execute add_to_segment action
 * Adds an owner to a static segment
 */
async function executeAddToSegment(config, execution, recordData, tenantId) {
  try {
    const segmentId = config.segmentId;
    if (!segmentId) {
      return { success: false, error: 'No segment specified', retryable: false, httpStatus: 400 };
    }

    // Verify segment exists and is static type
    const segmentResult = await query(
      `SELECT id, name, type FROM "Segment" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [segmentId, tenantId]
    );

    if (segmentResult.rows.length === 0) {
      return { success: false, error: `Segment not found: ${segmentId}`, retryable: false, httpStatus: 404 };
    }

    const segment = segmentResult.rows[0];

    // Can only add to static segments (not dynamic/smart segments)
    if (segment.type !== 'static') {
      return {
        success: false,
        error: `Cannot add to ${segment.type} segment "${segment.name}". Only static segments support manual membership.`,
        retryable: false,
        httpStatus: 400,
      };
    }

    // Determine member ID (owner_id)
    // If workflow object_type is 'owner', use the record_id directly
    // Otherwise, get the owner_id from the related owner data
    let memberId;
    if (execution.object_type === 'owner') {
      memberId = execution.record_id;
    } else if (recordData.owner?.id) {
      memberId = recordData.owner.id;
    } else if (recordData.record?.owner_id) {
      memberId = recordData.record.owner_id;
    }

    if (!memberId) {
      return {
        success: false,
        error: 'Cannot determine owner ID for segment membership. Record has no associated owner.',
        retryable: false,
        httpStatus: 400,
      };
    }

    // Add to segment (ON CONFLICT DO NOTHING handles duplicates)
    await query(
      `INSERT INTO "SegmentMember" (segment_id, owner_id, added_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (segment_id, owner_id) DO NOTHING`,
      [segmentId, memberId]
    );

    console.log('[StepExecutor] Added to segment:', { segmentId, segmentName: segment.name, memberId });

    return {
      success: true,
      result: {
        segmentId,
        segmentName: segment.name,
        memberId,
      },
    };
  } catch (error) {
    console.error('[StepExecutor] Add to segment error:', error);
    const httpStatus = error.code === '23503' ? 400 : 500; // Foreign key violation = bad request
    return {
      success: false,
      error: error.message,
      retryable: httpStatus >= 500,
      httpStatus,
    };
  }
}

/**
 * Execute remove_from_segment action
 * Removes an owner from a segment
 */
async function executeRemoveFromSegment(config, execution, recordData, tenantId) {
  try {
    const segmentId = config.segmentId;
    if (!segmentId) {
      return { success: false, error: 'No segment specified', retryable: false, httpStatus: 400 };
    }

    // Determine member ID (owner_id)
    let memberId;
    if (execution.object_type === 'owner') {
      memberId = execution.record_id;
    } else if (recordData.owner?.id) {
      memberId = recordData.owner.id;
    } else if (recordData.record?.owner_id) {
      memberId = recordData.record.owner_id;
    }

    if (!memberId) {
      return {
        success: false,
        error: 'Cannot determine owner ID for segment membership. Record has no associated owner.',
        retryable: false,
        httpStatus: 400,
      };
    }

    // Remove from segment
    const deleteResult = await query(
      `DELETE FROM "SegmentMember"
       WHERE segment_id = $1 AND owner_id = $2`,
      [segmentId, memberId]
    );

    const removed = deleteResult.rowCount > 0;

    console.log('[StepExecutor] Removed from segment:', { segmentId, memberId, removed });

    return {
      success: true,
      result: {
        segmentId,
        memberId,
        removed,
      },
    };
  } catch (error) {
    console.error('[StepExecutor] Remove from segment error:', error);
    return {
      success: false,
      error: error.message,
      retryable: true,
      httpStatus: 500,
    };
  }
}

/**
 * Execute a wait step
 */
async function executeWait(step, execution, recordData, tenantId) {
  const config = step.config || {};
  const waitType = config.waitType || 'duration';

  console.log('[StepExecutor] Executing wait:', waitType);

  // Handle event-based wait separately (different flow)
  if (waitType === 'event') {
    return executeEventWait(step, execution, config, tenantId);
  }

  let waitUntil;

  switch (waitType) {
    case 'duration':
      waitUntil = calculateDurationWait(config);
      break;
    case 'until_time':
      waitUntil = calculateTimeOfDayWait(config);
      break;
    case 'until_date':
    case 'date_property':
      waitUntil = calculateDateFieldWait(config, recordData);
      break;
    case 'calendar_date':
      waitUntil = calculateCalendarDateWait(config);
      break;
    case 'day_of_week':
      waitUntil = calculateDayOfWeekWait(config);
      break;
    default:
      return { success: false, error: `Unknown wait type: ${waitType}` };
  }

  if (!waitUntil || isNaN(waitUntil.getTime())) {
    return { success: false, error: 'Could not calculate wait time' };
  }

  // If wait time is in the past, proceed immediately
  if (waitUntil <= new Date()) {
    const nextStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_id);
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
    result: { waitType, waitUntil: waitUntil.toISOString() },
  };
}

/**
 * Execute event-based wait
 * Waits until a specific event occurs OR max timeout is reached
 * Config: { eventType: 'booking.confirmed', maxWaitDays: 7 }
 */
async function executeEventWait(step, execution, config, tenantId) {
  const eventType = config.eventType;
  const maxWaitDays = parseInt(config.maxWaitDays) || 7;

  if (!eventType) {
    return { success: false, error: 'Event wait requires eventType' };
  }

  console.log('[StepExecutor] Setting up event wait:', eventType, 'max days:', maxWaitDays);

  // Calculate max wait timeout
  const maxWaitUntil = new Date();
  maxWaitUntil.setDate(maxWaitUntil.getDate() + maxWaitDays);

  // Store event wait metadata in execution
  const eventWaitMetadata = {
    eventType,
    stepId: step.id,
    startedAt: new Date().toISOString(),
    maxWaitUntil: maxWaitUntil.toISOString(),
  };

  // Update execution to waiting_for_event status with metadata
  await query(
    `UPDATE "WorkflowExecution"
     SET status = 'waiting_for_event',
         resume_at = $1,
         metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
     WHERE id = $3`,
    [
      maxWaitUntil.toISOString(),
      JSON.stringify({ eventWait: eventWaitMetadata }),
      execution.id,
    ]
  );

  console.log('[StepExecutor] Execution set to waiting_for_event:', {
    executionId: execution.id,
    eventType,
    maxWaitUntil: maxWaitUntil.toISOString(),
  });

  return {
    success: true,
    waitingForEvent: true,
    result: {
      waitType: 'event',
      eventType,
      maxWaitUntil: maxWaitUntil.toISOString(),
    },
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
 * Calculate wait time for specific calendar date
 * Config: { date: '2025-03-15T09:00:00Z' }
 */
function calculateCalendarDateWait(config) {
  const dateString = config.date;

  if (!dateString) {
    console.warn('[StepExecutor] Calendar date wait missing date');
    return null;
  }

  const targetDate = new Date(dateString);

  if (isNaN(targetDate.getTime())) {
    console.warn('[StepExecutor] Invalid calendar date:', dateString);
    return null;
  }

  return targetDate;
}

/**
 * Calculate wait time for next occurrence of specific day of week
 * Config: { dayOfWeek: 'monday', time: '09:00' }
 */
function calculateDayOfWeekWait(config) {
  const dayOfWeek = (config.dayOfWeek || 'monday').toLowerCase();
  const timeOfDay = config.time || '09:00';

  // Map day names to JS day numbers (0 = Sunday, 1 = Monday, etc.)
  const dayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDayNum = dayMap[dayOfWeek];
  if (targetDayNum === undefined) {
    console.warn('[StepExecutor] Invalid day of week:', dayOfWeek);
    return null;
  }

  // Parse time
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.warn('[StepExecutor] Invalid time format:', timeOfDay);
    return null;
  }

  const now = new Date();
  const currentDayNum = now.getDay();

  // Calculate days until next occurrence
  let daysUntil = targetDayNum - currentDayNum;

  // If target day is today, check if time has passed
  if (daysUntil === 0) {
    const todayTarget = new Date();
    todayTarget.setHours(hours, minutes, 0, 0);
    if (todayTarget <= now) {
      // Time has passed today, wait until next week
      daysUntil = 7;
    }
  } else if (daysUntil < 0) {
    // Target day already passed this week, go to next week
    daysUntil += 7;
  }

  // Calculate target date
  const target = new Date();
  target.setDate(target.getDate() + daysUntil);
  target.setHours(hours, minutes, 0, 0);

  console.log('[StepExecutor] Day of week wait:', {
    dayOfWeek,
    time: timeOfDay,
    daysUntil,
    target: target.toISOString(),
  });

  return target;
}

/**
 * Check and resume executions waiting for a specific event
 * Called by event processor when events fire
 */
async function checkEventWaiters(eventType, recordId, tenantId) {
  console.log('[StepExecutor] Checking event waiters:', { eventType, recordId, tenantId });

  // Find executions waiting for this event type and record
  const waitersResult = await query(
    `SELECT we.id, we.workflow_id, we.current_step_id, we.metadata
     FROM "WorkflowExecution" we
     WHERE we.tenant_id = $1
       AND we.record_id = $2
       AND we.status = 'waiting_for_event'
       AND we.metadata->'eventWait'->>'eventType' = $3`,
    [tenantId, recordId, eventType]
  );

  if (waitersResult.rows.length === 0) {
    console.log('[StepExecutor] No executions waiting for event:', eventType);
    return { resumed: 0 };
  }

  console.log('[StepExecutor] Found', waitersResult.rows.length, 'executions waiting for event');

  let resumed = 0;

  for (const execution of waitersResult.rows) {
    try {
      // Resume the execution - find next step after the wait step
      const stepId = execution.metadata?.eventWait?.stepId;
      if (!stepId) {
        console.warn('[StepExecutor] Event wait missing stepId in metadata:', execution.id);
        continue;
      }

      // Get step info to find next step
      const stepResult = await query(
        `SELECT workflow_id, parent_step_id, branch_id FROM "WorkflowStep" WHERE id = $1`,
        [stepId]
      );

      if (stepResult.rows.length === 0) {
        console.warn('[StepExecutor] Event wait step not found:', stepId);
        continue;
      }

      const step = stepResult.rows[0];
      const nextStepId = await findNextStep(step.workflow_id, stepId, step.parent_step_id, step.branch_id);

      // Update execution to running and set next step
      await query(
        `UPDATE "WorkflowExecution"
         SET status = 'running',
             current_step_id = $1,
             resume_at = NULL,
             metadata = metadata - 'eventWait'
         WHERE id = $2`,
        [nextStepId, execution.id]
      );

      // Queue next step for execution
      await queueNextStep(execution.id, execution.workflow_id, tenantId);

      resumed++;
      console.log('[StepExecutor] Resumed execution after event:', execution.id);
    } catch (error) {
      console.error('[StepExecutor] Error resuming execution:', execution.id, error);
    }
  }

  return { resumed, total: waitersResult.rows.length };
}

/**
 * Execute a determinator (if/then) step
 */
async function executeDeterminator(step, execution, recordData, tenantId) {
  const config = step.config || {};
  const branchType = config.branchType || 'list'; // 'list' (if/then) or 'static' (value-equals)

  console.log('[StepExecutor] Executing determinator. Branch type:', branchType);

  // Handle static branches (value-equals routing)
  // HubSpot supports up to 250 branches for static branching
  if (branchType === 'static') {
    return executeStaticBranching(step, config, recordData);
  }

  // Handle list branches (if/then conditional routing)
  // HubSpot supports up to 20 branches for list branching
  return executeListBranching(step, config, recordData);
}

/**
 * Execute static branching (value-equals routing)
 * Routes based on exact match of a single property value
 * Config: { branchType: 'static', property: 'status', branches: [...], defaultNextStepId }
 */
async function executeStaticBranching(step, config, recordData) {
  const property = config.property;
  const branches = config.branches || [];
  const defaultNextStepId = config.defaultNextStepId;

  if (!property) {
    console.warn('[StepExecutor] Static branch missing property field');
    return {
      success: false,
      error: 'Static branch requires a property field',
    };
  }

  // Get the property value from record data
  const actualValue = getNestedValue(recordData, property);
  const normalizedValue = actualValue !== null && actualValue !== undefined
    ? String(actualValue).toLowerCase().trim()
    : null;

  console.log('[StepExecutor] Static branch - Property:', property, 'Value:', actualValue);

  // Find matching branch by exact value match
  let matchedBranch = null;
  for (const branch of branches) {
    const branchValue = branch.value !== null && branch.value !== undefined
      ? String(branch.value).toLowerCase().trim()
      : null;

    if (normalizedValue === branchValue) {
      matchedBranch = branch;
      break;
    }
  }

  let nextStepId;
  let matchedValue;

  if (matchedBranch) {
    // Use the matched branch's next step
    // Branch can specify nextStepId directly or use branchId to find child steps
    if (matchedBranch.nextStepId) {
      nextStepId = matchedBranch.nextStepId;
    } else if (matchedBranch.branchId || matchedBranch.id) {
      // Find first step in the branch by branch_id
      const branchId = matchedBranch.branchId || matchedBranch.id;
      nextStepId = await findFirstStepInBranch(step.workflow_id, step.id, branchId);
    }
    matchedValue = matchedBranch.value;
    console.log('[StepExecutor] Static branch matched:', matchedValue, '-> nextStepId:', nextStepId);
  }

  // If no match found, use default
  if (!nextStepId) {
    if (defaultNextStepId) {
      nextStepId = defaultNextStepId;
      console.log('[StepExecutor] Static branch using default:', nextStepId);
    } else {
      // No default specified, find next sibling/parent step
      nextStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_id);
      console.log('[StepExecutor] Static branch no match, continuing to:', nextStepId);
    }
  }

  return {
    success: true,
    nextStepId,
    result: {
      branchType: 'static',
      property,
      actualValue,
      matchedValue: matchedValue || null,
      matched: !!matchedBranch,
    },
  };
}

/**
 * Execute list branching (if/then conditional routing)
 * HubSpot-aligned: Supports up to 20 branches with conditions
 * First matching branch wins, then falls back to default 'none-matched' branch
 *
 * Config formats:
 * - Multi-branch: { branches: [{ id, name, conditions: { logic, conditions }, order, isDefault }, ...] }
 * - Legacy binary: { conditions: [...], conditionLogic: 'and'|'or' }
 */
async function executeListBranching(step, config, recordData) {
  const branches = config.branches || [];

  // Check if using new multi-branch format
  if (branches.length > 0) {
    return executeMultiBranching(step, branches, recordData);
  }

  // Legacy binary yes/no format - convert to multi-branch internally
  const conditions = config.conditions || [];
  const conditionLogic = config.conditionLogic || 'and';

  console.log('[StepExecutor] Legacy binary branch with', conditions.length, 'conditions');

  // Evaluate conditions
  const conditionsMet = evaluateConditions(conditions, conditionLogic, recordData);

  console.log('[StepExecutor] Conditions met:', conditionsMet);

  const branchId = conditionsMet ? 'yes' : 'no';

  // First, check for explicit branch step connections
  if (conditionsMet && step.yes_step_id) {
    console.log('[StepExecutor] Using explicit yes_step_id:', step.yes_step_id);
    return {
      success: true,
      nextStepId: step.yes_step_id,
      result: { branchType: 'list', branchId, branchName: 'Yes', conditionsMet, connectionType: 'explicit' },
    };
  }

  if (!conditionsMet && step.no_step_id) {
    console.log('[StepExecutor] Using explicit no_step_id:', step.no_step_id);
    return {
      success: true,
      nextStepId: step.no_step_id,
      result: { branchType: 'list', branchId, branchName: 'No', conditionsMet, connectionType: 'explicit' },
    };
  }

  // Fallback: Find first step in branch by branch_id
  const nextStepId = await findFirstStepInBranch(step.workflow_id, step.id, branchId);

  if (!nextStepId) {
    // No steps in branch, continue to next sibling/parent
    const fallbackStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_id);
    return {
      success: true,
      nextStepId: fallbackStepId,
      result: { branchType: 'list', branchId, branchName: conditionsMet ? 'Yes' : 'No', conditionsMet, connectionType: 'fallback' },
    };
  }

  return {
    success: true,
    nextStepId,
    result: { branchType: 'list', branchId, branchName: conditionsMet ? 'Yes' : 'No', conditionsMet, connectionType: 'branch_id' },
  };
}

/**
 * Execute multi-branch routing (HubSpot if/then with up to 20 branches)
 * Evaluates each branch's conditions in order - first match wins
 * Falls back to 'none-matched' / default branch if no conditions match
 *
 * @param {Object} step - The determinator step
 * @param {Array} branches - Array of { id, name, conditions, order, isDefault, nextStepId }
 * @param {Object} recordData - Record data for condition evaluation
 */
async function executeMultiBranching(step, branches, recordData) {
  console.log('[StepExecutor] Multi-branch determinator with', branches.length, 'branches');

  // Sort branches by order (non-default first, then default last)
  const sortedBranches = [...branches].sort((a, b) => {
    // Default branches always go last
    if (a.isDefault && !b.isDefault) return 1;
    if (!a.isDefault && b.isDefault) return -1;
    // Otherwise sort by order
    return (a.order || 0) - (b.order || 0);
  });

  let matchedBranch = null;

  // Evaluate each non-default branch's conditions (first match wins - HubSpot behavior)
  for (const branch of sortedBranches) {
    // Skip default branch during condition evaluation
    if (branch.isDefault) continue;

    const branchConditions = branch.conditions;

    // If branch has no conditions object, skip it
    if (!branchConditions) continue;

    // Extract conditions array and logic from nested structure
    const conditionsArray = branchConditions.conditions || [];
    const conditionLogic = branchConditions.logic || 'and';

    // Empty conditions array means "always match" (like a catch-all)
    if (conditionsArray.length === 0) {
      console.log('[StepExecutor] Branch', branch.name, 'has empty conditions - treating as match');
      matchedBranch = branch;
      break;
    }

    // Evaluate this branch's conditions
    const conditionsMet = evaluateConditions(conditionsArray, conditionLogic, recordData);

    console.log('[StepExecutor] Branch', branch.name, '- conditions met:', conditionsMet);

    if (conditionsMet) {
      matchedBranch = branch;
      break;
    }
  }

  // If no branch matched, use the default branch
  if (!matchedBranch) {
    matchedBranch = sortedBranches.find(b => b.isDefault);
    console.log('[StepExecutor] No branch matched, using default:', matchedBranch?.name || 'none');
  }

  // Determine next step ID
  let nextStepId = null;

  if (matchedBranch) {
    // Option 1: Branch has explicit nextStepId
    if (matchedBranch.nextStepId) {
      nextStepId = matchedBranch.nextStepId;
      console.log('[StepExecutor] Using branch nextStepId:', nextStepId);
    } else {
      // Option 2: Find first step in this branch by branch_id
      nextStepId = await findFirstStepInBranch(step.workflow_id, step.id, matchedBranch.id);
      console.log('[StepExecutor] Found first step in branch:', nextStepId);
    }
  }

  // If still no next step, fall back to step after determinator
  if (!nextStepId) {
    nextStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_id);
    console.log('[StepExecutor] No steps in branch, continuing to:', nextStepId);
  }

  return {
    success: true,
    nextStepId,
    result: {
      branchType: 'multi',
      branchId: matchedBranch?.id || null,
      branchName: matchedBranch?.name || null,
      isDefaultBranch: matchedBranch?.isDefault || false,
      branchesEvaluated: sortedBranches.filter(b => !b.isDefault).length,
    },
  };
}

/**
 * Find the first step in a branch of a determinator
 * @param {string} workflowId - Workflow ID
 * @param {string} parentStepId - Determinator step ID
 * @param {string} branchId - Branch ID to find steps in
 * @returns {string|null} First step ID or null if branch is empty
 */
async function findFirstStepInBranch(workflowId, parentStepId, branchId) {
  const result = await query(
    `SELECT id FROM "WorkflowStep"
     WHERE workflow_id = $1
       AND parent_step_id = $2
       AND branch_id = $3
     ORDER BY position ASC
     LIMIT 1`,
    [workflowId, parentStepId, branchId]
  );

  return result.rows[0]?.id || null;
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
  const nextStepId = await findNextStep(step.workflow_id, step.id, step.parent_step_id, step.branch_id);
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
 * HubSpot-aligned: Uses explicit step connections (next_step_id) first,
 * falls back to position-based lookup for backwards compatibility
 */
async function findNextStep(workflowId, currentStepId, parentStepId, branchPath) {
  // First, check for explicit next_step_id connection (HubSpot approach)
  const stepResult = await query(
    `SELECT position, next_step_id FROM "WorkflowStep" WHERE id = $1`,
    [currentStepId]
  );

  if (stepResult.rows.length === 0) {
    return null;
  }

  const currentStep = stepResult.rows[0];

  // If explicit next_step_id is set, use it (enables GO-TO connections)
  if (currentStep.next_step_id) {
    console.log('[findNextStep] Using explicit next_step_id:', currentStep.next_step_id);
    return currentStep.next_step_id;
  }

  // Fallback to position-based lookup for backwards compatibility
  console.log('[findNextStep] No explicit connection, falling back to position-based lookup');

  const currentPosition = currentStep.position;

  // Build query dynamically based on which parameters are provided
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
       AND branch_id ${branchCondition}
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
      `SELECT parent_step_id, branch_id FROM "WorkflowStep" WHERE id = $1`,
      [parentStepId]
    );

    if (parentResult.rows.length > 0) {
      return findNextStep(
        workflowId,
        parentStepId,
        parentResult.rows[0].parent_step_id,
        parentResult.rows[0].branch_id
      );
    }
  }

  // No more steps
  return null;
}

/**
 * Get step config from workflow revision snapshot
 * When an execution has workflow_revision set, we use the snapshotted step config
 * to ensure in-progress executions use the version they enrolled under
 */
async function getStepConfigFromRevision(workflowId, stepId, revisionNumber) {
  try {
    const revisionResult = await query(
      `SELECT workflow_snapshot FROM "WorkflowRevision"
       WHERE workflow_id = $1 AND revision_number = $2`,
      [workflowId, revisionNumber]
    );

    if (revisionResult.rows.length === 0) {
      console.log('[STEP EXECUTOR] No revision found for workflow:', workflowId, 'revision:', revisionNumber);
      return null;
    }

    const snapshot = revisionResult.rows[0].workflow_snapshot;
    if (!snapshot || !snapshot.steps) {
      console.log('[STEP EXECUTOR] Revision has no steps snapshot');
      return null;
    }

    // Find the step in the snapshot by ID
    const snapshotStep = snapshot.steps.find(s => s.id === stepId);
    if (!snapshotStep) {
      console.log('[STEP EXECUTOR] Step not found in revision snapshot:', stepId);
      return null;
    }

    console.log('[STEP EXECUTOR] Using snapshotted step config from revision', revisionNumber);
    return snapshotStep.config;
  } catch (error) {
    console.error('[STEP EXECUTOR] Error loading revision snapshot:', error);
    return null;
  }
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

    // Fetch related entities based on record type
    switch (recordType) {
      case 'booking':
        await fetchBookingRelatedData(data, tenantId);
        break;
      case 'pet':
        await fetchPetRelatedData(data, tenantId);
        break;
      case 'owner':
        await fetchOwnerRelatedData(data, tenantId);
        break;
      case 'payment':
        await fetchPaymentRelatedData(data, tenantId);
        break;
      case 'invoice':
        await fetchInvoiceRelatedData(data, tenantId);
        break;
      case 'task':
        await fetchTaskRelatedData(data, tenantId);
        break;
      default:
        // For other types, try generic owner/pet lookup
        await fetchGenericRelatedData(data);
    }

    // Get tenant info for {{tenant.name}}, {{tenant.phone}}, etc.
    const tenantResult = await query(
      `SELECT id, name, phone, email, address, website,
              business_hours, timezone, settings
       FROM "Tenant" WHERE id = $1`,
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
 * Fetch related data for booking records
 * Bookings have: owner, multiple pets (via BookingPet junction), kennel
 */
async function fetchBookingRelatedData(data, tenantId) {
  if (!data.booking) return;

  // Get owner
  if (data.booking.owner_id) {
    const ownerResult = await query(
      `SELECT * FROM "Owner" WHERE id = $1`,
      [data.booking.owner_id]
    );
    if (ownerResult.rows.length > 0) {
      data.owner = ownerResult.rows[0];
      data.owner.full_name = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
    }
  }

  // Get all pets for this booking (via BookingPet junction table)
  const petsResult = await query(
    `SELECT p.* FROM "Pet" p
     JOIN "BookingPet" bp ON bp.pet_id = p.id
     WHERE bp.booking_id = $1
     ORDER BY p.name`,
    [data.booking.id]
  );
  if (petsResult.rows.length > 0) {
    data.pets = petsResult.rows;
    // Set first pet as data.pet for {{pet.name}} convenience
    data.pet = petsResult.rows[0];
    // Create comma-separated pet names for {{pets_names}}
    data.pets_names = petsResult.rows.map(p => p.name).join(', ');
  }

  // Get kennel info if assigned
  if (data.booking.kennel_id) {
    const kennelResult = await query(
      `SELECT * FROM "Kennel" WHERE id = $1`,
      [data.booking.kennel_id]
    );
    if (kennelResult.rows.length > 0) {
      data.kennel = kennelResult.rows[0];
    }
  }

  // Format booking dates for easy interpolation
  if (data.booking.start_date) {
    data.booking.start_date_formatted = formatDate(data.booking.start_date);
  }
  if (data.booking.end_date) {
    data.booking.end_date_formatted = formatDate(data.booking.end_date);
  }
}

/**
 * Fetch related data for pet records
 * Pets have: owner (via PetOwner junction), vaccinations
 */
async function fetchPetRelatedData(data, tenantId) {
  if (!data.pet) return;

  // Get primary owner via PetOwner junction table
  const ownerResult = await query(
    `SELECT o.* FROM "Owner" o
     JOIN "PetOwner" po ON po.owner_id = o.id
     WHERE po.pet_id = $1 AND po.is_primary = true
     LIMIT 1`,
    [data.pet.id]
  );
  if (ownerResult.rows.length > 0) {
    data.owner = ownerResult.rows[0];
    data.owner.full_name = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
  } else if (data.pet.owner_id) {
    // Fallback to direct owner_id if exists
    const directOwnerResult = await query(
      `SELECT * FROM "Owner" WHERE id = $1`,
      [data.pet.owner_id]
    );
    if (directOwnerResult.rows.length > 0) {
      data.owner = directOwnerResult.rows[0];
      data.owner.full_name = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
    }
  }

  // Get vaccination status
  const vaccResult = await query(
    `SELECT type, expires_at,
            CASE WHEN expires_at < NOW() THEN 'expired'
                 WHEN expires_at < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
                 ELSE 'current' END as status
     FROM "Vaccination"
     WHERE pet_id = $1
     ORDER BY expires_at DESC`,
    [data.pet.id]
  );
  if (vaccResult.rows.length > 0) {
    data.vaccinations = vaccResult.rows;
    data.pet.vaccination_count = vaccResult.rows.length;
    data.pet.vaccinations_expiring = vaccResult.rows.filter(v => v.status === 'expiring_soon').length;
  }
}

/**
 * Fetch related data for owner records
 * Owners have: pets, bookings
 */
async function fetchOwnerRelatedData(data, tenantId) {
  if (!data.owner) return;

  // Get all pets for this owner
  const petsResult = await query(
    `SELECT p.* FROM "Pet" p
     JOIN "PetOwner" po ON po.pet_id = p.id
     WHERE po.owner_id = $1
     ORDER BY p.name`,
    [data.owner.id]
  );
  if (petsResult.rows.length > 0) {
    data.pets = petsResult.rows;
    data.pet = petsResult.rows[0]; // First pet for convenience
    data.pets_names = petsResult.rows.map(p => p.name).join(', ');
    data.owner.pet_count = petsResult.rows.length;
  }

  // Add full_name helper
  data.owner.full_name = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
}

/**
 * Fetch related data for payment records
 * Payments have: owner, invoice, possibly booking
 */
async function fetchPaymentRelatedData(data, tenantId) {
  if (!data.payment) return;

  // Get owner
  if (data.payment.owner_id) {
    const ownerResult = await query(
      `SELECT * FROM "Owner" WHERE id = $1`,
      [data.payment.owner_id]
    );
    if (ownerResult.rows.length > 0) {
      data.owner = ownerResult.rows[0];
      data.owner.full_name = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
    }
  }

  // Get invoice if payment is linked to one
  if (data.payment.invoice_id) {
    const invoiceResult = await query(
      `SELECT * FROM "Invoice" WHERE id = $1`,
      [data.payment.invoice_id]
    );
    if (invoiceResult.rows.length > 0) {
      data.invoice = invoiceResult.rows[0];
      // Format amounts
      data.invoice.total_formatted = formatCurrency(data.invoice.total_cents);
      data.invoice.balance_formatted = formatCurrency(data.invoice.balance_cents);
    }
  }

  // Get booking if payment is linked to one
  if (data.payment.booking_id) {
    const bookingResult = await query(
      `SELECT * FROM "Booking" WHERE id = $1`,
      [data.payment.booking_id]
    );
    if (bookingResult.rows.length > 0) {
      data.booking = bookingResult.rows[0];
    }
  }

  // Format payment amount
  if (data.payment.amount_cents) {
    data.payment.amount_formatted = formatCurrency(data.payment.amount_cents);
  }
}

/**
 * Fetch related data for invoice records
 * Invoices have: owner, line items, payments, possibly booking
 */
async function fetchInvoiceRelatedData(data, tenantId) {
  if (!data.invoice) return;

  // Get owner
  if (data.invoice.owner_id) {
    const ownerResult = await query(
      `SELECT * FROM "Owner" WHERE id = $1`,
      [data.invoice.owner_id]
    );
    if (ownerResult.rows.length > 0) {
      data.owner = ownerResult.rows[0];
      data.owner.full_name = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
    }
  }

  // Get line items
  const lineItemsResult = await query(
    `SELECT * FROM "InvoiceLineItem" WHERE invoice_id = $1 ORDER BY created_at`,
    [data.invoice.id]
  );
  if (lineItemsResult.rows.length > 0) {
    data.line_items = lineItemsResult.rows;
    data.invoice.item_count = lineItemsResult.rows.length;
  }

  // Get booking if invoice is linked to one
  if (data.invoice.booking_id) {
    const bookingResult = await query(
      `SELECT * FROM "Booking" WHERE id = $1`,
      [data.invoice.booking_id]
    );
    if (bookingResult.rows.length > 0) {
      data.booking = bookingResult.rows[0];
    }
  }

  // Format amounts
  if (data.invoice.total_cents !== undefined) {
    data.invoice.total_formatted = formatCurrency(data.invoice.total_cents);
  }
  if (data.invoice.balance_cents !== undefined) {
    data.invoice.balance_formatted = formatCurrency(data.invoice.balance_cents);
  }
  if (data.invoice.due_date) {
    data.invoice.due_date_formatted = formatDate(data.invoice.due_date);
  }
}

/**
 * Fetch related data for task records
 * Tasks may have: pet, owner, assigned user
 */
async function fetchTaskRelatedData(data, tenantId) {
  if (!data.task) return;

  // Get pet if task has one
  if (data.task.pet_id) {
    const petResult = await query(
      `SELECT * FROM "Pet" WHERE id = $1`,
      [data.task.pet_id]
    );
    if (petResult.rows.length > 0) {
      data.pet = petResult.rows[0];
    }
  }

  // Get owner if task has one, or get pet's owner
  if (data.task.owner_id) {
    const ownerResult = await query(
      `SELECT * FROM "Owner" WHERE id = $1`,
      [data.task.owner_id]
    );
    if (ownerResult.rows.length > 0) {
      data.owner = ownerResult.rows[0];
      data.owner.full_name = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
    }
  } else if (data.pet) {
    // Try to get owner from pet
    const ownerResult = await query(
      `SELECT o.* FROM "Owner" o
       JOIN "PetOwner" po ON po.owner_id = o.id
       WHERE po.pet_id = $1 AND po.is_primary = true
       LIMIT 1`,
      [data.pet.id]
    );
    if (ownerResult.rows.length > 0) {
      data.owner = ownerResult.rows[0];
      data.owner.full_name = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
    }
  }

  // Get assigned user if task has one
  if (data.task.assigned_to) {
    const userResult = await query(
      `SELECT id, email, first_name, last_name, role FROM "User" WHERE id = $1`,
      [data.task.assigned_to]
    );
    if (userResult.rows.length > 0) {
      data.assigned_user = userResult.rows[0];
      data.assigned_user.full_name = `${data.assigned_user.first_name || ''} ${data.assigned_user.last_name || ''}`.trim();
    }
  }

  // Format due date
  if (data.task.due_date) {
    data.task.due_date_formatted = formatDate(data.task.due_date);
  }
}

/**
 * Fallback for generic record types - fetch owner and pet if IDs exist
 */
async function fetchGenericRelatedData(data) {
  // Get related owner
  if (data.record?.owner_id && !data.owner) {
    const ownerResult = await query(
      `SELECT * FROM "Owner" WHERE id = $1`,
      [data.record.owner_id]
    );
    if (ownerResult.rows.length > 0) {
      data.owner = ownerResult.rows[0];
      data.owner.full_name = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
    }
  }

  // Get related pet
  if (data.record?.pet_id && !data.pet) {
    const petResult = await query(
      `SELECT * FROM "Pet" WHERE id = $1`,
      [data.record.pet_id]
    );
    if (petResult.rows.length > 0) {
      data.pet = petResult.rows[0];
    }
  }
}

/**
 * Format cents to currency string
 */
function formatCurrency(cents) {
  if (cents === null || cents === undefined) return '';
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format date to readable string
 */
function formatDate(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
 * Log step execution to database with full details
 * @param {string} executionId - Execution ID
 * @param {object} step - Full step object from WorkflowStep table
 * @param {object} result - Step execution result
 * @param {Date} startedAt - When the step started
 */
async function logStepExecution(executionId, step, result, startedAt) {
  try {
    const completedAt = new Date();
    const durationMs = startedAt ? completedAt.getTime() - startedAt.getTime() : null;
    const status = result.success ? 'success' : 'failed';
    const eventType = result.success ? 'step_completed' : 'step_failed';

    await query(
      `INSERT INTO "WorkflowExecutionLog" (
        id,
        execution_id,
        step_id,
        status,
        event_type,
        step_type,
        action_type,
        started_at,
        completed_at,
        duration_ms,
        input_data,
        output_data,
        error_details,
        result
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )`,
      [
        executionId,
        step.id,
        status,
        eventType,
        step.step_type,
        step.action_type,
        startedAt?.toISOString() || completedAt.toISOString(),
        completedAt.toISOString(),
        durationMs,
        JSON.stringify(step.config || {}),
        result.success ? JSON.stringify(result.result || {}) : null,
        result.success ? null : result.error,
        JSON.stringify(result.result || { error: result.error }),
      ]
    );
    console.log('[StepExecutor] Logged step execution:', step.id, 'status:', status, 'duration:', durationMs, 'ms');
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
 * Schedule a retry execution with appropriate mechanism based on delay
 * Uses SQS DelaySeconds for delays <= 15 minutes, EventBridge Scheduler for longer
 * @param {string} executionId - Execution ID
 * @param {string} workflowId - Workflow ID
 * @param {string} tenantId - Tenant ID
 * @param {string} stepId - Current step ID
 * @param {number} delayMs - Delay in milliseconds
 * @param {object} retryContext - Retry context to pass through
 */
async function scheduleRetryExecution(executionId, workflowId, tenantId, stepId, delayMs, retryContext) {
  if (!STEP_QUEUE_URL) {
    console.warn('[StepExecutor] WORKFLOW_STEP_QUEUE_URL not set, cannot schedule retry');
    return;
  }

  const delaySeconds = Math.ceil(delayMs / 1000);
  const retryPayload = {
    executionId,
    workflowId,
    tenantId,
    stepId,
    action: 'retry_step',
    retryContext,
    timestamp: new Date().toISOString(),
  };

  console.log('[StepExecutor] Scheduling retry. Delay:', delaySeconds, 'seconds. Attempt:', retryContext.attemptNumber);

  // If delay is within SQS limits, use SQS delay
  if (delaySeconds <= RETRY_CONFIG.SQS_MAX_DELAY_SECONDS) {
    console.log('[StepExecutor] Using SQS DelaySeconds for retry');
    await sqs.send(new SendMessageCommand({
      QueueUrl: STEP_QUEUE_URL,
      MessageBody: JSON.stringify(retryPayload),
      DelaySeconds: delaySeconds,
    }));
    console.log('[StepExecutor] Retry queued via SQS with delay:', delaySeconds, 'seconds');
  } else {
    // For longer delays, use EventBridge Scheduler
    console.log('[StepExecutor] Using EventBridge Scheduler for retry (delay exceeds 15 min)');

    if (!SCHEDULER_ROLE_ARN) {
      console.warn('[StepExecutor] SCHEDULER_ROLE_ARN not configured for long delay retry');
      return;
    }

    const retryAt = new Date(Date.now() + delayMs);
    const scheduleName = `workflow-retry-${executionId}-${retryContext.attemptNumber}`;

    try {
      await scheduler.send(new CreateScheduleCommand({
        Name: scheduleName,
        GroupName: 'workflow-schedules',
        ScheduleExpression: `at(${retryAt.toISOString().split('.')[0]})`,
        ScheduleExpressionTimezone: 'UTC',
        FlexibleTimeWindow: { Mode: 'OFF' },
        Target: {
          Arn: STEP_QUEUE_URL,
          RoleArn: SCHEDULER_ROLE_ARN,
          Input: JSON.stringify(retryPayload),
        },
        ActionAfterCompletion: 'DELETE',
      }));
      console.log('[StepExecutor] Retry scheduled via EventBridge at:', retryAt.toISOString());
    } catch (error) {
      console.error('[StepExecutor] Error scheduling retry via EventBridge:', error);
      throw error;
    }
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

  // Log the completion event
  await query(
    `INSERT INTO "WorkflowExecutionLog" (
      id,
      execution_id,
      step_id,
      status,
      event_type,
      started_at,
      completed_at,
      output_data,
      result
    ) VALUES (
      gen_random_uuid(),
      $1, NULL, 'success', $2, NOW(), NOW(), $3, $3
    )`,
    [
      executionId,
      completionReason === 'goal_reached' ? 'goal_met' : 'completed',
      JSON.stringify({
        completionReason,
        message: completionReason === 'goal_reached'
          ? 'Workflow completed - goal conditions met'
          : 'Workflow completed successfully',
        goalResult,
      }),
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

// =============================================================================
// ACTION RATE LIMITING FUNCTIONS
// =============================================================================

/**
 * Get current hour key for rate limiting
 * Format: YYYY-MM-DD-HH
 */
function getCurrentHourKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
}

/**
 * Check if tenant has exceeded action rate limit
 * Returns { allowed: boolean, currentCount: number, limit: number }
 */
async function checkActionRateLimit(tenantId) {
  const hourKey = getCurrentHourKey();
  const pk = `tenant:${tenantId}:actions:${hourKey}`;

  try {
    // Get current count
    const result = await dynamoDB.send(new GetCommand({
      TableName: RATE_LIMIT_TABLE,
      Key: { pk },
    }));

    const currentCount = result.Item?.count || 0;

    // Get tenant-specific limit or use default
    const tenantLimit = await getTenantActionLimit(tenantId);

    return {
      allowed: currentCount < tenantLimit,
      currentCount,
      limit: tenantLimit,
    };
  } catch (error) {
    // If DynamoDB fails, allow the request but log warning
    console.error('[RATE LIMIT] Error checking action rate limit:', error);
    return { allowed: true, currentCount: 0, limit: DEFAULT_ACTION_LIMIT_PER_HOUR };
  }
}

/**
 * Increment action count for tenant
 */
async function incrementActionCount(tenantId) {
  const hourKey = getCurrentHourKey();
  const pk = `tenant:${tenantId}:actions:${hourKey}`;

  // TTL: expire 2 hours after the hour ends
  const now = new Date();
  const hourEnd = new Date(now);
  hourEnd.setUTCMinutes(0, 0, 0);
  hourEnd.setUTCHours(hourEnd.getUTCHours() + 1);
  const ttl = Math.floor(hourEnd.getTime() / 1000) + 7200; // +2 hours buffer

  try {
    await dynamoDB.send(new UpdateCommand({
      TableName: RATE_LIMIT_TABLE,
      Key: { pk },
      UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#count': 'count',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1,
        ':ttl': ttl,
      },
    }));
  } catch (error) {
    console.error('[RATE LIMIT] Error incrementing action count:', error);
  }
}

/**
 * Get tenant-specific action limit (could be from DB or config)
 */
async function getTenantActionLimit(tenantId) {
  try {
    // Check if tenant has a custom limit configured
    const result = await query(
      `SELECT value FROM "Setting" WHERE tenant_id = $1 AND key = 'workflow_action_limit_per_hour'`,
      [tenantId]
    );

    if (result.rows.length > 0 && result.rows[0].value) {
      return parseInt(result.rows[0].value, 10);
    }
  } catch (error) {
    console.error('[RATE LIMIT] Error fetching tenant action limit:', error);
  }

  return DEFAULT_ACTION_LIMIT_PER_HOUR;
}

/**
 * Emit CloudWatch metric for throttled actions
 */
async function emitThrottledActionMetric(tenantId, count = 1) {
  try {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'BarkBase/Workflows',
      MetricData: [
        {
          MetricName: 'WorkflowActionsThrottled',
          Dimensions: [
            { Name: 'TenantId', Value: tenantId },
          ],
          Value: count,
          Unit: 'Count',
          Timestamp: new Date(),
        },
      ],
    }));
    console.log('[RATE LIMIT] Emitted throttled action metric for tenant:', tenantId);
  } catch (error) {
    console.error('[RATE LIMIT] Error emitting CloudWatch metric:', error);
  }
}

// Export additional functions for use by other processors
exports.checkEventWaiters = checkEventWaiters;
