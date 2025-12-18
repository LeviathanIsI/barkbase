/**
 * Enroll in Workflow Action Executor
 *
 * Enrolls the current record into another workflow.
 */

/**
 * Execute the enroll_in_workflow action
 * @param {Object} config - Action configuration
 * @param {string} config.targetWorkflowId - The workflow to enroll in
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
async function execute(config, context) {
  const { record, tenantId, prisma, workflowId: sourceWorkflowId, executionId, stepId } = context;
  const { targetWorkflowId } = config;

  if (!targetWorkflowId) {
    throw new Error('Target workflow ID is required');
  }

  // Prevent circular enrollment
  if (targetWorkflowId === sourceWorkflowId) {
    throw new Error('Cannot enroll in the same workflow (circular reference)');
  }

  // Verify target workflow exists and is active
  const targetWorkflow = await prisma.workflow.findUnique({
    where: {
      id: targetWorkflowId,
      tenant_id: tenantId,
    },
  });

  if (!targetWorkflow) {
    throw new Error(`Target workflow not found: ${targetWorkflowId}`);
  }

  if (targetWorkflow.status !== 'active') {
    return {
      skipped: true,
      reason: `Target workflow is not active (status: ${targetWorkflow.status})`,
      targetWorkflowId,
      targetWorkflowName: targetWorkflow.name,
    };
  }

  // Check if record type matches target workflow
  if (targetWorkflow.object_type !== record._type) {
    throw new Error(
      `Record type mismatch. Workflow expects ${targetWorkflow.object_type}, got ${record._type}`
    );
  }

  // Check if record is already enrolled in target workflow
  const existingExecution = await prisma.workflowExecution.findFirst({
    where: {
      workflow_id: targetWorkflowId,
      record_id: record.id,
      record_type: record._type,
      status: { in: ['running', 'waiting'] },
    },
  });

  if (existingExecution) {
    return {
      skipped: true,
      reason: 'Record already enrolled in target workflow',
      targetWorkflowId,
      targetWorkflowName: targetWorkflow.name,
      existingExecutionId: existingExecution.id,
    };
  }

  // Check re-enrollment settings
  if (!targetWorkflow.settings?.allowReenrollment) {
    const previousExecution = await prisma.workflowExecution.findFirst({
      where: {
        workflow_id: targetWorkflowId,
        record_id: record.id,
        record_type: record._type,
      },
      orderBy: { created_at: 'desc' },
    });

    if (previousExecution) {
      // Check re-enrollment delay
      const delayDays = targetWorkflow.settings?.reenrollmentDelayDays || 0;
      if (delayDays > 0) {
        const lastEnrollment = new Date(previousExecution.created_at);
        const minNextEnrollment = new Date(lastEnrollment);
        minNextEnrollment.setDate(minNextEnrollment.getDate() + delayDays);

        if (new Date() < minNextEnrollment) {
          return {
            skipped: true,
            reason: `Re-enrollment delay not met (${delayDays} days required)`,
            targetWorkflowId,
            targetWorkflowName: targetWorkflow.name,
            nextEligibleDate: minNextEnrollment.toISOString(),
          };
        }
      }
    }
  }

  // Get first step of target workflow
  const firstStep = await prisma.workflowStep.findFirst({
    where: {
      workflow_id: targetWorkflowId,
      is_entry_point: true,
    },
  });

  // Create new execution
  const newExecution = await prisma.workflowExecution.create({
    data: {
      tenant_id: tenantId,
      workflow_id: targetWorkflowId,
      record_type: record._type,
      record_id: record.id,
      status: 'running',
      current_step_id: firstStep?.id,
      started_at: new Date(),
      metadata: {
        enrolled_by: 'workflow',
        source_workflow_id: sourceWorkflowId,
        source_execution_id: executionId,
        source_step_id: stepId,
      },
    },
  });

  // Queue the first step for processing
  const { queueStepExecution } = require('../../api/workflows');
  await queueStepExecution(newExecution.id, targetWorkflowId, tenantId);

  // Log the enrollment
  await prisma.workflowExecutionLog.create({
    data: {
      execution_id: newExecution.id,
      step_id: firstStep?.id,
      event_type: 'enrolled',
      action_type: null,
      status: 'success',
      message: `Enrolled by workflow action from ${sourceWorkflowId}`,
      metadata: {
        source_workflow_id: sourceWorkflowId,
        source_execution_id: executionId,
      },
    },
  });

  return {
    targetWorkflowId,
    targetWorkflowName: targetWorkflow.name,
    newExecutionId: newExecution.id,
    recordId: record.id,
    recordType: record._type,
  };
}

/**
 * Validate the action configuration
 */
function validate(config) {
  const errors = [];

  if (!config.targetWorkflowId) {
    errors.push('Target workflow ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  execute,
  validate,
};
