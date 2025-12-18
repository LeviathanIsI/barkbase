/**
 * Unenroll from Workflow Action Executor
 *
 * Unenrolls the current record from another workflow (or all workflows).
 */

/**
 * Execute the unenroll_from_workflow action
 * @param {Object} config - Action configuration
 * @param {string} config.targetWorkflowId - Specific workflow to unenroll from, or 'all'
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
async function execute(config, context) {
  const { record, tenantId, prisma, workflowId: sourceWorkflowId, executionId, stepId } = context;
  const { targetWorkflowId } = config;

  if (!targetWorkflowId) {
    throw new Error('Target workflow ID is required (use "all" to unenroll from all workflows)');
  }

  // Find active executions to unenroll
  const whereClause = {
    tenant_id: tenantId,
    record_id: record.id,
    record_type: record._type,
    status: { in: ['running', 'waiting'] },
    // Don't unenroll from the source workflow
    workflow_id: { not: sourceWorkflowId },
  };

  // If specific workflow specified
  if (targetWorkflowId !== 'all') {
    whereClause.workflow_id = targetWorkflowId;
  }

  const activeExecutions = await prisma.workflowExecution.findMany({
    where: whereClause,
    include: {
      workflow: { select: { id: true, name: true } },
    },
  });

  if (activeExecutions.length === 0) {
    return {
      skipped: true,
      reason: targetWorkflowId === 'all'
        ? 'Record not enrolled in any other workflows'
        : 'Record not enrolled in target workflow',
      targetWorkflowId,
    };
  }

  // Unenroll from each execution
  const unenrolled = [];

  for (const execution of activeExecutions) {
    // Update execution status
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'cancelled',
        ended_at: new Date(),
        metadata: {
          ...execution.metadata,
          unenrolled_by: 'workflow_action',
          unenrolled_from_workflow: sourceWorkflowId,
          unenrolled_from_execution: executionId,
          unenrolled_from_step: stepId,
          unenrolled_at: new Date().toISOString(),
        },
      },
    });

    // Log the unenrollment
    await prisma.workflowExecutionLog.create({
      data: {
        execution_id: execution.id,
        step_id: execution.current_step_id,
        event_type: 'unenrolled',
        action_type: null,
        status: 'success',
        message: `Unenrolled by workflow action from ${sourceWorkflowId}`,
        metadata: {
          source_workflow_id: sourceWorkflowId,
          source_execution_id: executionId,
          source_step_id: stepId,
        },
      },
    });

    unenrolled.push({
      executionId: execution.id,
      workflowId: execution.workflow.id,
      workflowName: execution.workflow.name,
    });
  }

  return {
    unenrolledCount: unenrolled.length,
    unenrolled,
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
    errors.push('Target workflow ID is required (use "all" to unenroll from all workflows)');
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
