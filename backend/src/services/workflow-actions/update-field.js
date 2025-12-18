/**
 * Update Field Action Executor
 *
 * Updates a field value on the enrolled record.
 */

const { replaceTemplateVariables } = require('./utils/template-variables');

/**
 * Execute the update_field action
 * @param {Object} config - Action configuration
 * @param {string} config.field - Field name to update
 * @param {string} config.operation - Operation type (set, clear, increment, decrement, append, toggle)
 * @param {*} config.value - Value for the operation
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
async function execute(config, context) {
  const { record, tenantId, prisma, workflowId, executionId, stepId } = context;
  const { field, operation = 'set', value } = config;

  if (!field) {
    throw new Error('Field name is required');
  }

  // Determine the table to update based on record type
  const recordType = record._type;
  if (!recordType) {
    throw new Error('Record type not specified');
  }

  // Calculate new value based on operation
  const currentValue = record[field];
  let newValue;

  switch (operation) {
    case 'set':
      // Replace template variables if value is a string
      newValue = typeof value === 'string' ? replaceTemplateVariables(value, record) : value;
      break;

    case 'clear':
      newValue = null;
      break;

    case 'increment':
      newValue = (parseFloat(currentValue) || 0) + (parseFloat(value) || 1);
      break;

    case 'decrement':
      newValue = (parseFloat(currentValue) || 0) - (parseFloat(value) || 1);
      break;

    case 'append':
      if (Array.isArray(currentValue)) {
        newValue = [...currentValue, value];
      } else if (typeof currentValue === 'string') {
        newValue = currentValue + (typeof value === 'string' ? replaceTemplateVariables(value, record) : value);
      } else {
        newValue = value;
      }
      break;

    case 'toggle':
      newValue = !currentValue;
      break;

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  // Build update query
  const updateData = {
    [field]: newValue,
    updated_at: new Date(),
  };

  // Update the record based on its type
  const modelMap = {
    pet: 'pet',
    contact: 'contact',
    booking: 'booking',
    invoice: 'invoice',
    payment: 'payment',
    task: 'task',
  };

  const modelName = modelMap[recordType];
  if (!modelName || !prisma[modelName]) {
    throw new Error(`Unknown record type: ${recordType}`);
  }

  await prisma[modelName].update({
    where: {
      id: record.id,
      tenant_id: tenantId,
    },
    data: updateData,
  });

  // Log the field update
  await prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      action: 'workflow_update_field',
      entity_type: recordType,
      entity_id: record.id,
      changes: {
        field,
        operation,
        old_value: currentValue,
        new_value: newValue,
      },
      metadata: {
        workflow_id: workflowId,
        execution_id: executionId,
        step_id: stepId,
      },
    },
  });

  return {
    field,
    operation,
    oldValue: currentValue,
    newValue,
    recordId: record.id,
    recordType,
  };
}

/**
 * Validate the action configuration
 */
function validate(config) {
  const errors = [];

  if (!config.field || config.field.trim() === '') {
    errors.push('Field name is required');
  }

  const validOperations = ['set', 'clear', 'increment', 'decrement', 'append', 'toggle'];
  if (config.operation && !validOperations.includes(config.operation)) {
    errors.push(`Invalid operation. Must be one of: ${validOperations.join(', ')}`);
  }

  if (config.operation === 'set' && config.value === undefined) {
    errors.push('Value is required for set operation');
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
