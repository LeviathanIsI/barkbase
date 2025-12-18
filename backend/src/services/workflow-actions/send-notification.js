/**
 * Send Notification Action Executor
 *
 * Sends in-app notifications to users.
 */

const { replaceTemplateVariables } = require('./utils/template-variables');

/**
 * Execute the send_notification action
 * @param {Object} config - Action configuration
 * @param {string} config.title - Notification title
 * @param {string} config.message - Notification message
 * @param {string} config.type - Notification type (info, success, warning, error)
 * @param {string} config.targetUserId - Specific user ID, or null for record owner
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
async function execute(config, context) {
  const { record, tenantId, prisma, workflowId, executionId, stepId } = context;
  const { title, message, type = 'info', targetUserId } = config;

  if (!message) {
    throw new Error('Notification message is required');
  }

  // Determine target user
  let userId = targetUserId;

  if (!userId) {
    // Try to get owner from record
    userId = record.owner_id || record.assigned_to || record.user_id;
  }

  if (!userId) {
    throw new Error('No target user for notification');
  }

  // Replace template variables
  const processedTitle = replaceTemplateVariables(title || 'Workflow Notification', record);
  const processedMessage = replaceTemplateVariables(message, record);

  // Create notification in database
  const notification = await prisma.notification.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      title: processedTitle,
      message: processedMessage,
      type: type,
      is_read: false,
      metadata: {
        source: 'workflow',
        workflow_id: workflowId,
        execution_id: executionId,
        step_id: stepId,
        record_type: record._type || 'unknown',
        record_id: record.id,
      },
    },
  });

  // Emit real-time notification via WebSocket/SSE if available
  try {
    const { emitNotification } = require('../../lib/realtime');
    await emitNotification(tenantId, userId, {
      id: notification.id,
      title: processedTitle,
      message: processedMessage,
      type,
      created_at: notification.created_at,
    });
  } catch (e) {
    // Real-time not configured, that's fine
    console.log('[Notification] Real-time emit not available');
  }

  return {
    notificationId: notification.id,
    userId,
    title: processedTitle,
  };
}

/**
 * Validate the action configuration
 */
function validate(config) {
  const errors = [];

  if (!config.message || config.message.trim() === '') {
    errors.push('Notification message is required');
  }

  if (config.type && !['info', 'success', 'warning', 'error'].includes(config.type)) {
    errors.push('Invalid notification type');
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
