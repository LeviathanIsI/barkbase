/**
 * Create Task Action Executor
 *
 * Creates tasks in the system, linked to the record.
 */

const { replaceTemplateVariables } = require('./utils/template-variables');

/**
 * Execute the create_task action
 * @param {Object} config - Action configuration
 * @param {string} config.title - Task title
 * @param {string} config.description - Task description
 * @param {string} config.priority - Task priority (low, normal, high, urgent)
 * @param {string} config.taskType - Task type
 * @param {number} config.dueDays - Days from now for due date
 * @param {string} config.assigneeId - User ID to assign to, or null for record owner
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
async function execute(config, context) {
  const { record, tenantId, prisma, workflowId, executionId, stepId } = context;
  const {
    title,
    description,
    priority = 'normal',
    taskType = 'workflow',
    dueDays = 7,
    assigneeId,
  } = config;

  if (!title) {
    throw new Error('Task title is required');
  }

  // Replace template variables
  const processedTitle = replaceTemplateVariables(title, record);
  const processedDescription = replaceTemplateVariables(description || '', record);

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (dueDays || 7));

  // Determine assignee
  let assignee = assigneeId;
  if (!assignee) {
    assignee = record.owner_id || record.assigned_to;
  }

  // Create the task
  const task = await prisma.task.create({
    data: {
      tenant_id: tenantId,
      title: processedTitle,
      description: processedDescription,
      priority,
      task_type: taskType,
      status: 'pending',
      due_date: dueDate,
      assigned_to: assignee,
      // Link to the source record
      related_type: record._type || 'unknown',
      related_id: record.id,
      // Workflow metadata
      metadata: {
        workflow_id: workflowId,
        execution_id: executionId,
        step_id: stepId,
        auto_created: true,
      },
    },
  });

  // Send notification to assignee if configured
  if (assignee) {
    try {
      await prisma.notification.create({
        data: {
          tenant_id: tenantId,
          user_id: assignee,
          title: 'New Task Assigned',
          message: `You have been assigned a new task: ${processedTitle}`,
          type: 'info',
          is_read: false,
          metadata: {
            task_id: task.id,
            source: 'workflow',
          },
        },
      });
    } catch (e) {
      console.log('[CreateTask] Failed to create notification:', e.message);
    }
  }

  return {
    taskId: task.id,
    title: processedTitle,
    dueDate: dueDate.toISOString(),
    assignee,
  };
}

/**
 * Validate the action configuration
 */
function validate(config) {
  const errors = [];

  if (!config.title || config.title.trim() === '') {
    errors.push('Task title is required');
  }

  if (config.priority && !['low', 'normal', 'high', 'urgent'].includes(config.priority)) {
    errors.push('Invalid priority');
  }

  if (config.dueDays && (isNaN(config.dueDays) || config.dueDays < 0)) {
    errors.push('Due days must be a positive number');
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
