/**
 * Workflow Analyzer
 * Extracts property dependencies from workflow configurations
 * Analyzes workflow conditions, actions, and triggers
 */

/**
 * Extract property dependencies from workflow configuration
 * @param {object} workflowConfig - Workflow configuration object
 * @returns {Array} - Array of { propertyName, context } objects
 */
function extractDependencies(workflowConfig) {
  if (!workflowConfig || typeof workflowConfig !== 'object') {
    return [];
  }

  const dependencies = [];

  // Extract from trigger conditions
  if (workflowConfig.trigger) {
    const triggerDeps = extractFromTrigger(workflowConfig.trigger);
    dependencies.push(...triggerDeps);
  }

  // Extract from workflow conditions
  if (workflowConfig.conditions) {
    const conditionDeps = extractFromConditions(workflowConfig.conditions);
    dependencies.push(...conditionDeps);
  }

  // Extract from workflow actions
  if (workflowConfig.actions) {
    const actionDeps = extractFromActions(workflowConfig.actions);
    dependencies.push(...actionDeps);
  }

  return dependencies;
}

/**
 * Extract dependencies from trigger configuration
 * @param {object} trigger - Trigger configuration
 * @returns {Array} - Array of dependency objects
 */
function extractFromTrigger(trigger) {
  const dependencies = [];

  if (!trigger || typeof trigger !== 'object') {
    return dependencies;
  }

  // Field update trigger
  if (trigger.type === 'field_update' && trigger.field) {
    dependencies.push({
      propertyName: trigger.field,
      context: 'trigger',
    });
  }

  // Field change trigger
  if (trigger.type === 'field_change' && trigger.fields) {
    if (Array.isArray(trigger.fields)) {
      for (const field of trigger.fields) {
        dependencies.push({
          propertyName: field,
          context: 'trigger',
        });
      }
    }
  }

  // Value comparison trigger
  if (trigger.field && trigger.operator && trigger.value !== undefined) {
    dependencies.push({
      propertyName: trigger.field,
      context: 'trigger',
    });
  }

  return dependencies;
}

/**
 * Extract dependencies from workflow conditions
 * @param {Array|object} conditions - Conditions configuration
 * @returns {Array} - Array of dependency objects
 */
function extractFromConditions(conditions) {
  const dependencies = [];

  if (!conditions) {
    return dependencies;
  }

  // Handle array of conditions
  if (Array.isArray(conditions)) {
    for (const condition of conditions) {
      dependencies.push(...extractFromConditions(condition));
    }
    return dependencies;
  }

  // Handle single condition object
  if (typeof conditions === 'object') {
    // Simple field condition
    if (conditions.field) {
      dependencies.push({
        propertyName: conditions.field,
        context: 'condition',
      });
    }

    // Formula condition
    if (conditions.formula) {
      const formulaParser = require('./formula-parser');
      const formulaDeps = formulaParser.extractDependencies(conditions.formula);
      for (const depName of formulaDeps) {
        dependencies.push({
          propertyName: depName,
          context: 'condition_formula',
        });
      }
    }

    // Nested AND/OR conditions
    if (conditions.and) {
      dependencies.push(...extractFromConditions(conditions.and));
    }
    if (conditions.or) {
      dependencies.push(...extractFromConditions(conditions.or));
    }
  }

  return dependencies;
}

/**
 * Extract dependencies from workflow actions
 * @param {Array} actions - Array of action configurations
 * @returns {Array} - Array of dependency objects
 */
function extractFromActions(actions) {
  const dependencies = [];

  if (!Array.isArray(actions)) {
    return dependencies;
  }

  for (const action of actions) {
    if (!action || typeof action !== 'object') continue;

    // Update field action
    if (action.type === 'update_field') {
      if (action.field) {
        dependencies.push({
          propertyName: action.field,
          context: 'action_update',
        });
      }

      // Check if value is a formula or references another field
      if (action.value && typeof action.value === 'string') {
        if (action.value.startsWith('=') || action.value.includes('{')) {
          const formulaParser = require('./formula-parser');
          const formulaDeps = formulaParser.extractDependencies(action.value);
          for (const depName of formulaDeps) {
            dependencies.push({
              propertyName: depName,
              context: 'action_formula',
            });
          }
        }
      }
    }

    // Copy field action
    if (action.type === 'copy_field' && action.sourceField && action.targetField) {
      dependencies.push({
        propertyName: action.sourceField,
        context: 'action_copy_source',
      });
      dependencies.push({
        propertyName: action.targetField,
        context: 'action_copy_target',
      });
    }

    // Send email action (may reference fields in template)
    if (action.type === 'send_email' && action.template) {
      const templateDeps = extractFromTemplate(action.template);
      dependencies.push(...templateDeps);
    }

    // Create record action (may set fields)
    if (action.type === 'create_record' && action.fields) {
      for (const fieldName in action.fields) {
        dependencies.push({
          propertyName: fieldName,
          context: 'action_create',
        });

        // Check if field value is a formula
        const fieldValue = action.fields[fieldName];
        if (fieldValue && typeof fieldValue === 'string' && (fieldValue.startsWith('=') || fieldValue.includes('{'))) {
          const formulaParser = require('./formula-parser');
          const formulaDeps = formulaParser.extractDependencies(fieldValue);
          for (const depName of formulaDeps) {
            dependencies.push({
              propertyName: depName,
              context: 'action_create_formula',
            });
          }
        }
      }
    }
  }

  return dependencies;
}

/**
 * Extract dependencies from email template
 * @param {string} template - Email template string
 * @returns {Array} - Array of dependency objects
 */
function extractFromTemplate(template) {
  const dependencies = [];

  if (!template || typeof template !== 'string') {
    return dependencies;
  }

  // Extract merge fields like {{fieldName}} or {fieldName}
  const mergeFieldPattern = /\{\{?([a-zA-Z_][a-zA-Z0-9_\.]*)\}?\}/g;
  let match;

  while ((match = mergeFieldPattern.exec(template)) !== null) {
    dependencies.push({
      propertyName: match[1],
      context: 'email_template',
    });
  }

  return dependencies;
}

/**
 * Analyze workflow impact score
 * @param {object} workflowConfig - Workflow configuration
 * @returns {number} - Impact score (0-100)
 */
function getImpactScore(workflowConfig) {
  if (!workflowConfig || typeof workflowConfig !== 'object') {
    return 0;
  }

  let score = 0;

  // Score for trigger complexity
  if (workflowConfig.trigger) {
    score += 10;
  }

  // Score for number of conditions
  if (workflowConfig.conditions) {
    const conditionCount = Array.isArray(workflowConfig.conditions) 
      ? workflowConfig.conditions.length 
      : 1;
    score += conditionCount * 5;
  }

  // Score for number and type of actions
  if (Array.isArray(workflowConfig.actions)) {
    for (const action of workflowConfig.actions) {
      if (action.type === 'update_field') score += 5;
      else if (action.type === 'send_email') score += 10;
      else if (action.type === 'create_record') score += 15;
      else if (action.type === 'delete_record') score += 20;
      else score += 3;
    }
  }

  // Score for dependencies
  const deps = extractDependencies(workflowConfig);
  score += deps.length * 2;

  return Math.min(score, 100);
}

module.exports = {
  extractDependencies,
  extractFromTrigger,
  extractFromConditions,
  extractFromActions,
  extractFromTemplate,
  getImpactScore,
};

