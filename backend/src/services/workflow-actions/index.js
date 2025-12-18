/**
 * Workflow Action Executors
 *
 * Central registry for all action executors.
 * Each action type has its own executor module.
 */

const sendSmsExecutor = require('./send-sms');
const sendEmailExecutor = require('./send-email');
const sendNotificationExecutor = require('./send-notification');
const createTaskExecutor = require('./create-task');
const updateFieldExecutor = require('./update-field');
const addToSegmentExecutor = require('./add-to-segment');
const removeFromSegmentExecutor = require('./remove-from-segment');
const enrollInWorkflowExecutor = require('./enroll-in-workflow');
const unenrollFromWorkflowExecutor = require('./unenroll-from-workflow');
const webhookExecutor = require('./webhook');

/**
 * Action executor registry
 * Maps action types to their executor functions
 */
const executors = {
  send_sms: sendSmsExecutor,
  send_email: sendEmailExecutor,
  send_notification: sendNotificationExecutor,
  create_task: createTaskExecutor,
  update_field: updateFieldExecutor,
  add_to_segment: addToSegmentExecutor,
  remove_from_segment: removeFromSegmentExecutor,
  enroll_in_workflow: enrollInWorkflowExecutor,
  unenroll_from_workflow: unenrollFromWorkflowExecutor,
  webhook: webhookExecutor,
};

/**
 * Execute an action
 * @param {string} actionType - The action type (e.g., 'send_sms')
 * @param {Object} config - The action configuration from the step
 * @param {Object} context - Execution context
 * @param {Object} context.record - The record being processed
 * @param {string} context.tenantId - The tenant ID
 * @param {string} context.workflowId - The workflow ID
 * @param {string} context.executionId - The execution ID
 * @param {string} context.stepId - The step ID
 * @param {Object} context.prisma - Prisma client instance
 * @returns {Promise<Object>} - { success: boolean, result?: any, error?: string }
 */
async function executeAction(actionType, config, context) {
  const executor = executors[actionType];

  if (!executor) {
    return {
      success: false,
      error: `Unknown action type: ${actionType}`,
    };
  }

  try {
    const result = await executor.execute(config, context);
    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error(`[ActionExecutor] Error executing ${actionType}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Validate action configuration
 * @param {string} actionType - The action type
 * @param {Object} config - The action configuration
 * @returns {Object} - { valid: boolean, errors?: string[] }
 */
function validateAction(actionType, config) {
  const executor = executors[actionType];

  if (!executor) {
    return {
      valid: false,
      errors: [`Unknown action type: ${actionType}`],
    };
  }

  if (executor.validate) {
    return executor.validate(config);
  }

  return { valid: true };
}

/**
 * Get supported action types
 * @returns {string[]}
 */
function getSupportedActionTypes() {
  return Object.keys(executors);
}

module.exports = {
  executeAction,
  validateAction,
  getSupportedActionTypes,
  executors,
};
