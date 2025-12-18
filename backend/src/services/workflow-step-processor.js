/**
 * Workflow Step Processor
 *
 * Core engine that processes workflow steps from the SQS queue.
 * Handles all step types: action, wait, determinator, gate, terminus.
 *
 * This can be run as:
 * - AWS Lambda (triggered by SQS)
 * - Local worker (polling SQS)
 * - Direct invocation for testing
 */

const { PrismaClient } = require('@prisma/client');
const { evaluateConditions } = require('./workflow-condition-evaluator');
const { executeAction } = require('./workflow-actions');

// Initialize Prisma client (reuse across invocations in Lambda)
let prisma;
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * Process an SQS message containing a workflow step to execute
 * @param {Object} message - SQS message
 * @param {string} message.executionId - The workflow execution ID
 * @param {string} message.workflowId - The workflow ID
 * @param {string} message.tenantId - The tenant ID
 * @param {string} message.stepId - Optional specific step ID to process
 * @returns {Promise<Object>} - Processing result
 */
async function processStepMessage(message) {
  const { executionId, workflowId, tenantId, stepId } = message;

  console.log(`[StepProcessor] Processing execution ${executionId}, step ${stepId || 'next'}`);

  const db = getPrisma();

  try {
    // Get execution with current step
    const execution = await db.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
      },
    });

    if (!execution) {
      console.error(`[StepProcessor] Execution not found: ${executionId}`);
      return { success: false, error: 'Execution not found' };
    }

    // Check if execution is still active
    if (!['running', 'waiting'].includes(execution.status)) {
      console.log(`[StepProcessor] Execution ${executionId} is ${execution.status}, skipping`);
      return { success: true, skipped: true, reason: `Execution is ${execution.status}` };
    }

    // Get the step to process
    const targetStepId = stepId || execution.current_step_id;

    if (!targetStepId) {
      // No more steps - complete the execution
      return await completeExecution(db, execution);
    }

    const step = await db.workflowStep.findUnique({
      where: { id: targetStepId },
    });

    if (!step) {
      console.error(`[StepProcessor] Step not found: ${targetStepId}`);
      return await failExecution(db, execution, 'Step not found');
    }

    // Get the record being processed
    const record = await fetchRecord(db, execution.record_type, execution.record_id, tenantId);

    if (!record) {
      console.error(`[StepProcessor] Record not found: ${execution.record_type}/${execution.record_id}`);
      return await failExecution(db, execution, 'Record not found');
    }

    // Add record type for context
    record._type = execution.record_type;

    // Build execution context
    const context = {
      record,
      tenantId,
      workflowId,
      executionId,
      stepId: step.id,
      prisma: db,
      execution,
      workflow: execution.workflow,
    };

    // Check goal conditions before processing
    if (execution.workflow.settings?.goalConfig?.enabled) {
      const goalMet = evaluateConditions(
        execution.workflow.settings.goalConfig.conditions,
        record
      );

      if (goalMet) {
        console.log(`[StepProcessor] Goal met for execution ${executionId}`);
        return await goalReachedExecution(db, execution, step);
      }
    }

    // Process based on step type
    const result = await processStep(step, context);

    return result;
  } catch (error) {
    console.error(`[StepProcessor] Error processing step:`, error);

    // Log the error
    try {
      await db.workflowExecutionLog.create({
        data: {
          execution_id: executionId,
          step_id: stepId,
          event_type: 'error',
          action_type: null,
          status: 'error',
          error_message: error.message,
          error_details: { stack: error.stack },
        },
      });
    } catch (logError) {
      console.error('[StepProcessor] Failed to log error:', logError);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Process a step based on its type
 */
async function processStep(step, context) {
  const { prisma: db, executionId } = context;

  console.log(`[StepProcessor] Processing ${step.step_type} step: ${step.name || step.id}`);

  // Update execution to show we're processing this step
  await db.workflowExecution.update({
    where: { id: executionId },
    data: {
      current_step_id: step.id,
      status: 'running',
    },
  });

  switch (step.step_type) {
    case 'action':
      return await processActionStep(step, context);

    case 'wait':
      return await processWaitStep(step, context);

    case 'determinator':
      return await processDeterminatorStep(step, context);

    case 'gate':
      return await processGateStep(step, context);

    case 'terminus':
      return await processTerminusStep(step, context);

    default:
      throw new Error(`Unknown step type: ${step.step_type}`);
  }
}

/**
 * Process an action step
 */
async function processActionStep(step, context) {
  const { prisma: db, executionId, record, tenantId, workflowId } = context;
  const config = step.config || {};

  // Log start
  const logEntry = await db.workflowExecutionLog.create({
    data: {
      execution_id: executionId,
      step_id: step.id,
      event_type: 'action_started',
      action_type: config.actionType,
      status: 'running',
      message: `Executing action: ${config.actionType}`,
    },
  });

  try {
    // Execute the action
    const result = await executeAction(config.actionType, config, context);

    // Update log with result
    await db.workflowExecutionLog.update({
      where: { id: logEntry.id },
      data: {
        event_type: result.success ? 'action_completed' : 'action_failed',
        status: result.success ? 'success' : 'error',
        result: result.result || null,
        error_message: result.error || null,
        completed_at: new Date(),
      },
    });

    if (!result.success) {
      // Action failed - check retry policy
      const retryCount = step.config?.retryCount || 0;
      const currentRetries = context.execution.metadata?.retries?.[step.id] || 0;

      if (currentRetries < retryCount) {
        // Schedule retry
        return await scheduleRetry(db, context, step, currentRetries + 1);
      }

      // No more retries - fail or continue based on config
      if (step.config?.continueOnError) {
        console.log(`[StepProcessor] Action failed but continuing: ${result.error}`);
      } else {
        return await failExecution(db, context.execution, result.error);
      }
    }

    // Move to next step
    return await advanceToNextStep(db, context, step);
  } catch (error) {
    // Update log with error
    await db.workflowExecutionLog.update({
      where: { id: logEntry.id },
      data: {
        event_type: 'action_failed',
        status: 'error',
        error_message: error.message,
        error_details: { stack: error.stack },
        completed_at: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Process a wait step
 */
async function processWaitStep(step, context) {
  const { prisma: db, executionId } = context;
  const config = step.config || {};

  // Calculate when to resume
  let resumeAt;

  switch (config.waitType) {
    case 'delay':
      resumeAt = calculateDelayResume(config.delay);
      break;

    case 'until_date':
      resumeAt = new Date(config.untilDate);
      break;

    case 'until_event':
      // Event-based waits are handled differently
      resumeAt = null;
      break;

    default:
      // Default to 1 day delay
      resumeAt = new Date();
      resumeAt.setDate(resumeAt.getDate() + 1);
  }

  // Log the wait
  await db.workflowExecutionLog.create({
    data: {
      execution_id: executionId,
      step_id: step.id,
      event_type: 'wait_started',
      action_type: null,
      status: 'waiting',
      message: resumeAt
        ? `Waiting until ${resumeAt.toISOString()}`
        : `Waiting for event: ${config.eventType}`,
      metadata: { resume_at: resumeAt?.toISOString(), wait_type: config.waitType },
    },
  });

  // Update execution to waiting status
  await db.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'waiting',
      scheduled_at: resumeAt,
      metadata: {
        ...context.execution.metadata,
        waiting_for: config.waitType === 'until_event' ? config.eventType : null,
      },
    },
  });

  // If time-based wait, schedule the resume
  if (resumeAt) {
    await scheduleResume(context, step, resumeAt);
  }

  return {
    success: true,
    waiting: true,
    resumeAt: resumeAt?.toISOString(),
  };
}

/**
 * Calculate resume time for a delay
 */
function calculateDelayResume(delay) {
  const now = new Date();

  switch (delay.unit) {
    case 'minutes':
      now.setMinutes(now.getMinutes() + delay.value);
      break;
    case 'hours':
      now.setHours(now.getHours() + delay.value);
      break;
    case 'days':
      now.setDate(now.getDate() + delay.value);
      break;
    case 'weeks':
      now.setDate(now.getDate() + (delay.value * 7));
      break;
    case 'months':
      now.setMonth(now.getMonth() + delay.value);
      break;
    default:
      now.setDate(now.getDate() + 1); // Default to 1 day
  }

  return now;
}

/**
 * Process a determinator (if/then branching) step
 */
async function processDeterminatorStep(step, context) {
  const { prisma: db, executionId, record } = context;
  const config = step.config || {};
  const branches = config.branches || [];

  // Log start
  await db.workflowExecutionLog.create({
    data: {
      execution_id: executionId,
      step_id: step.id,
      event_type: 'branch_evaluation',
      action_type: null,
      status: 'running',
      message: `Evaluating ${branches.length} branches`,
    },
  });

  // Evaluate each branch in order
  let matchedBranch = null;
  let matchedBranchIndex = -1;

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];

    // Skip else branch for now (fallback)
    if (branch.isElse) continue;

    const matches = evaluateConditions(branch.conditions, record);

    if (matches) {
      matchedBranch = branch;
      matchedBranchIndex = i;
      break;
    }
  }

  // If no branch matched, use else branch if exists
  if (!matchedBranch) {
    matchedBranch = branches.find(b => b.isElse);
    matchedBranchIndex = branches.findIndex(b => b.isElse);
  }

  // Log result
  await db.workflowExecutionLog.create({
    data: {
      execution_id: executionId,
      step_id: step.id,
      event_type: 'branch_selected',
      action_type: null,
      status: 'success',
      message: matchedBranch
        ? `Branch ${matchedBranchIndex + 1}: ${matchedBranch.name || 'Matched'}`
        : 'No branch matched',
      metadata: {
        matched_branch: matchedBranchIndex,
        branch_name: matchedBranch?.name,
      },
    },
  });

  if (!matchedBranch || !matchedBranch.nextStepId) {
    // No branch matched or no next step - complete
    return await completeExecution(db, context.execution);
  }

  // Get the next step from the matched branch
  const nextStep = await db.workflowStep.findUnique({
    where: { id: matchedBranch.nextStepId },
  });

  if (!nextStep) {
    return await completeExecution(db, context.execution);
  }

  // Queue the next step
  await queueNextStep(context, nextStep);

  return {
    success: true,
    branchTaken: matchedBranchIndex,
    branchName: matchedBranch.name,
    nextStepId: matchedBranch.nextStepId,
  };
}

/**
 * Process a gate (continue/stop) step
 */
async function processGateStep(step, context) {
  const { prisma: db, executionId, record } = context;
  const config = step.config || {};

  // Evaluate gate conditions
  const shouldContinue = evaluateConditions(config.conditions, record);

  // Log result
  await db.workflowExecutionLog.create({
    data: {
      execution_id: executionId,
      step_id: step.id,
      event_type: 'gate_evaluation',
      action_type: null,
      status: 'success',
      message: shouldContinue ? 'Gate: Continuing' : 'Gate: Stopping',
      metadata: { passed: shouldContinue },
    },
  });

  if (!shouldContinue) {
    // Gate blocked - complete execution
    return await completeExecution(db, context.execution, 'gate_blocked');
  }

  // Gate passed - advance to next step
  return await advanceToNextStep(db, context, step);
}

/**
 * Process a terminus (end) step
 */
async function processTerminusStep(step, context) {
  const { prisma: db, executionId } = context;

  // Log terminus reached
  await db.workflowExecutionLog.create({
    data: {
      execution_id: executionId,
      step_id: step.id,
      event_type: 'terminus_reached',
      action_type: null,
      status: 'success',
      message: 'Workflow path ended',
    },
  });

  // Complete the execution
  return await completeExecution(db, context.execution);
}

/**
 * Advance to the next step after current step
 */
async function advanceToNextStep(db, context, currentStep) {
  const { executionId, workflowId } = context;

  // Get next step ID from current step's config
  const nextStepId = currentStep.next_step_id || currentStep.config?.nextStepId;

  if (!nextStepId) {
    // No next step - complete
    return await completeExecution(db, context.execution);
  }

  // Get the next step
  const nextStep = await db.workflowStep.findUnique({
    where: { id: nextStepId },
  });

  if (!nextStep) {
    return await completeExecution(db, context.execution);
  }

  // Queue the next step for processing
  await queueNextStep(context, nextStep);

  return {
    success: true,
    nextStepId: nextStep.id,
    nextStepType: nextStep.step_type,
  };
}

/**
 * Queue the next step for processing
 */
async function queueNextStep(context, nextStep) {
  const { prisma: db, tenantId, workflowId, executionId } = context;

  // Update execution's current step
  await db.workflowExecution.update({
    where: { id: executionId },
    data: { current_step_id: nextStep.id },
  });

  // Queue to SQS
  const { queueStepExecution } = require('../api/workflows');
  await queueStepExecution(executionId, workflowId, tenantId, nextStep.id);
}

/**
 * Schedule a step to resume at a future time
 */
async function scheduleResume(context, step, resumeAt) {
  // Use EventBridge Scheduler or similar for delayed execution
  const { scheduleStepResume } = require('../lib/scheduler');

  await scheduleStepResume({
    executionId: context.executionId,
    workflowId: context.workflowId,
    tenantId: context.tenantId,
    stepId: step.id,
    resumeAt,
  });
}

/**
 * Schedule a retry for a failed step
 */
async function scheduleRetry(db, context, step, retryNumber) {
  const { executionId, tenantId, workflowId } = context;

  // Calculate retry delay (exponential backoff)
  const delaySeconds = Math.pow(2, retryNumber) * 60; // 2, 4, 8, 16... minutes
  const retryAt = new Date();
  retryAt.setSeconds(retryAt.getSeconds() + delaySeconds);

  // Update execution metadata
  await db.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: 'waiting',
      scheduled_at: retryAt,
      metadata: {
        ...context.execution.metadata,
        retries: {
          ...(context.execution.metadata?.retries || {}),
          [step.id]: retryNumber,
        },
      },
    },
  });

  // Log retry
  await db.workflowExecutionLog.create({
    data: {
      execution_id: executionId,
      step_id: step.id,
      event_type: 'retry_scheduled',
      action_type: null,
      status: 'waiting',
      message: `Retry ${retryNumber} scheduled for ${retryAt.toISOString()}`,
      metadata: { retry_number: retryNumber, retry_at: retryAt.toISOString() },
    },
  });

  // Schedule the retry
  await scheduleResume(context, step, retryAt);

  return {
    success: true,
    retrying: true,
    retryNumber,
    retryAt: retryAt.toISOString(),
  };
}

/**
 * Complete an execution successfully
 */
async function completeExecution(db, execution, reason = 'completed') {
  await db.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: 'completed',
      ended_at: new Date(),
      metadata: {
        ...execution.metadata,
        completion_reason: reason,
      },
    },
  });

  await db.workflowExecutionLog.create({
    data: {
      execution_id: execution.id,
      step_id: null,
      event_type: 'execution_completed',
      action_type: null,
      status: 'success',
      message: `Workflow completed: ${reason}`,
    },
  });

  console.log(`[StepProcessor] Execution ${execution.id} completed: ${reason}`);

  return { success: true, completed: true, reason };
}

/**
 * Fail an execution
 */
async function failExecution(db, execution, error) {
  await db.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: 'failed',
      ended_at: new Date(),
      metadata: {
        ...execution.metadata,
        error: error,
      },
    },
  });

  await db.workflowExecutionLog.create({
    data: {
      execution_id: execution.id,
      step_id: execution.current_step_id,
      event_type: 'execution_failed',
      action_type: null,
      status: 'error',
      error_message: error,
    },
  });

  console.error(`[StepProcessor] Execution ${execution.id} failed: ${error}`);

  return { success: false, failed: true, error };
}

/**
 * Complete execution due to goal being reached
 */
async function goalReachedExecution(db, execution, step) {
  await db.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: 'completed',
      ended_at: new Date(),
      metadata: {
        ...execution.metadata,
        completion_reason: 'goal_reached',
      },
    },
  });

  await db.workflowExecutionLog.create({
    data: {
      execution_id: execution.id,
      step_id: step.id,
      event_type: 'goal_reached',
      action_type: null,
      status: 'success',
      message: 'Workflow goal reached - unenrolling',
    },
  });

  console.log(`[StepProcessor] Execution ${execution.id} completed: goal reached`);

  return { success: true, completed: true, reason: 'goal_reached' };
}

/**
 * Fetch a record from the database
 */
async function fetchRecord(db, recordType, recordId, tenantId) {
  const modelMap = {
    pet: 'pet',
    contact: 'contact',
    booking: 'booking',
    invoice: 'invoice',
    payment: 'payment',
    task: 'task',
  };

  const modelName = modelMap[recordType];
  if (!modelName || !db[modelName]) {
    console.error(`[StepProcessor] Unknown record type: ${recordType}`);
    return null;
  }

  return await db[modelName].findUnique({
    where: {
      id: recordId,
      tenant_id: tenantId,
    },
  });
}

/**
 * Lambda handler for SQS events
 */
async function handler(event) {
  const results = [];

  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    const result = await processStepMessage(message);
    results.push(result);
  }

  // Return failed message IDs for retry
  const failures = results
    .map((r, i) => (!r.success ? event.Records[i].messageId : null))
    .filter(Boolean);

  if (failures.length > 0) {
    return {
      batchItemFailures: failures.map(id => ({ itemIdentifier: id })),
    };
  }

  return { statusCode: 200 };
}

module.exports = {
  handler,
  processStepMessage,
  processStep,
  // Export for testing
  processActionStep,
  processWaitStep,
  processDeterminatorStep,
  processGateStep,
  processTerminusStep,
};
