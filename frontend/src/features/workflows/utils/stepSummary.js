/**
 * Step Summary Utilities
 * Formatting functions for displaying step configuration summaries on canvas cards
 */

import {
  ACTION_TYPES,
  STEP_TYPES,
  OBJECT_PROPERTIES,
  DAYS_OF_WEEK_FULL,
  WAIT_EVENTS_BY_OBJECT_TYPE,
} from '../constants';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format time to 12h format
 */
function formatTime(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format date for display
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {Function} tzFormatDate - Optional timezone formatter from useTimezoneUtils
 */
function formatDate(dateStr, tzFormatDate = null) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (tzFormatDate) {
    return tzFormatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  // Fallback if no timezone formatter provided
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get day name from value
 */
function getDayName(dayValue) {
  const day = DAYS_OF_WEEK_FULL.find((d) => d.value === dayValue);
  return day?.label || dayValue;
}

/**
 * Get property label by name
 */
function getPropertyLabel(objectType, propertyName) {
  const properties = OBJECT_PROPERTIES[objectType] || [];
  const prop = properties.find((p) => p.name === propertyName);
  return prop?.label || propertyName;
}

/**
 * Get event label by type
 */
function getEventLabel(objectType, eventType) {
  const events = WAIT_EVENTS_BY_OBJECT_TYPE[objectType] || [];
  const event = events.find((e) => e.value === eventType);
  return event?.label || eventType;
}

/**
 * Truncate text to specified length
 */
function truncate(text, maxLength = 40) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// =============================================================================
// ACTION SUMMARIES
// =============================================================================

/**
 * Format SMS action summary
 */
function formatSmsSummary(config) {
  if (!config?.message) {
    return { summary: 'Configure SMS message', incomplete: true };
  }
  return {
    summary: `Send: "${truncate(config.message, 30)}"`,
    incomplete: false,
  };
}

/**
 * Format email action summary
 */
function formatEmailSummary(config) {
  if (!config?.subject) {
    return { summary: 'Configure email', incomplete: true };
  }
  return {
    summary: `Subject: "${truncate(config.subject, 30)}"`,
    incomplete: false,
  };
}

/**
 * Format notification action summary
 */
function formatNotificationSummary(config) {
  if (!config?.message) {
    return { summary: 'Configure notification', incomplete: true };
  }
  return {
    summary: `Notify: "${truncate(config.message, 30)}"`,
    incomplete: false,
  };
}

/**
 * Format create task action summary
 */
function formatCreateTaskSummary(config) {
  if (!config?.title) {
    return { summary: 'Configure task', incomplete: true };
  }
  const priority = config.priority ? ` [${config.priority}]` : '';
  return {
    summary: `Create: "${truncate(config.title, 25)}"${priority}`,
    incomplete: false,
  };
}

/**
 * Format update field action summary
 */
function formatUpdateFieldSummary(config, objectType) {
  if (!config?.field || config.value === undefined) {
    return { summary: 'Configure field update', incomplete: true };
  }
  const fieldLabel = getPropertyLabel(objectType, config.field);
  const valueStr = typeof config.value === 'boolean'
    ? (config.value ? 'Yes' : 'No')
    : String(config.value);
  return {
    summary: `Set ${fieldLabel} = ${truncate(valueStr, 20)}`,
    incomplete: false,
  };
}

/**
 * Format add to segment action summary
 */
function formatAddToSegmentSummary(config, segmentName) {
  if (!config?.segmentId) {
    return { summary: 'Select segment', incomplete: true };
  }
  const name = segmentName || config.segmentId;
  return {
    summary: `Add to "${truncate(name, 30)}"`,
    incomplete: false,
  };
}

/**
 * Format remove from segment action summary
 */
function formatRemoveFromSegmentSummary(config, segmentName) {
  if (!config?.segmentId) {
    return { summary: 'Select segment', incomplete: true };
  }
  const name = segmentName || config.segmentId;
  return {
    summary: `Remove from "${truncate(name, 30)}"`,
    incomplete: false,
  };
}

/**
 * Format enroll in workflow action summary
 */
function formatEnrollInWorkflowSummary(config, workflowName) {
  if (!config?.workflowId) {
    return { summary: 'Select workflow', incomplete: true };
  }
  const name = workflowName || config.workflowId;
  return {
    summary: `Enroll in "${truncate(name, 30)}"`,
    incomplete: false,
  };
}

/**
 * Format unenroll from workflow action summary
 */
function formatUnenrollFromWorkflowSummary(config, workflowNames) {
  const ids = config?.workflowIds || [];
  if (ids.length === 0) {
    return { summary: 'Select workflows', incomplete: true };
  }
  if (ids.length === 1) {
    const name = workflowNames?.[0] || ids[0];
    return {
      summary: `Unenroll from "${truncate(name, 25)}"`,
      incomplete: false,
    };
  }
  return {
    summary: `Unenroll from ${ids.length} workflows`,
    incomplete: false,
  };
}

/**
 * Format webhook action summary
 */
function formatWebhookSummary(config) {
  if (!config?.url) {
    return { summary: 'Configure webhook URL', incomplete: true };
  }
  try {
    const url = new URL(config.url);
    const method = config.method?.toUpperCase() || 'POST';
    return {
      summary: `${method} ${url.hostname}`,
      incomplete: false,
    };
  } catch {
    return {
      summary: `Webhook: ${truncate(config.url, 30)}`,
      incomplete: false,
    };
  }
}

/**
 * Format action summary based on action type
 */
export function formatActionSummary(actionType, config, objectType, lookups = {}) {
  const { segmentName, workflowName, workflowNames } = lookups;

  switch (actionType) {
    case 'send_sms':
      return formatSmsSummary(config);
    case 'send_email':
      return formatEmailSummary(config);
    case 'send_notification':
      return formatNotificationSummary(config);
    case 'create_task':
      return formatCreateTaskSummary(config);
    case 'update_field':
      return formatUpdateFieldSummary(config, objectType);
    case 'add_to_segment':
      return formatAddToSegmentSummary(config, segmentName);
    case 'remove_from_segment':
      return formatRemoveFromSegmentSummary(config, segmentName);
    case 'enroll_in_workflow':
      return formatEnrollInWorkflowSummary(config, workflowName);
    case 'unenroll_from_workflow':
      return formatUnenrollFromWorkflowSummary(config, workflowNames);
    case 'webhook':
      return formatWebhookSummary(config);
    default:
      return {
        summary: ACTION_TYPES[actionType]?.label || 'Configure action',
        incomplete: true,
      };
  }
}

// =============================================================================
// WAIT SUMMARIES
// =============================================================================

/**
 * Format wait step summary
 */
export function formatWaitSummary(config, objectType) {
  const { waitType } = config || {};

  switch (waitType) {
    case 'duration': {
      const { duration, durationUnit } = config;
      if (duration && durationUnit) {
        return {
          summary: `Wait ${duration} ${durationUnit}`,
          incomplete: false,
        };
      }
      return { summary: 'Configure duration', incomplete: true };
    }

    case 'calendar_date': {
      const { date, time } = config;
      if (date) {
        const timeStr = time ? ` at ${formatTime(time)}` : '';
        return {
          summary: `Wait until ${formatDate(date)}${timeStr}`,
          incomplete: false,
        };
      }
      return { summary: 'Configure date', incomplete: true };
    }

    case 'date_property': {
      const { property, timing, offsetAmount, offsetUnit } = config;
      if (property) {
        const propLabel = getPropertyLabel(objectType, property);
        if (timing === 'before') {
          return {
            summary: `Wait until ${offsetAmount || 1} ${offsetUnit || 'days'} before ${propLabel}`,
            incomplete: false,
          };
        } else if (timing === 'after') {
          return {
            summary: `Wait until ${offsetAmount || 1} ${offsetUnit || 'days'} after ${propLabel}`,
            incomplete: false,
          };
        }
        return { summary: `Wait until ${propLabel}`, incomplete: false };
      }
      return { summary: 'Configure date property', incomplete: true };
    }

    case 'day_of_week': {
      const { day, time } = config;
      if (day) {
        const timeStr = time ? ` at ${formatTime(time)}` : '';
        return {
          summary: `Wait until ${getDayName(day)}${timeStr}`,
          incomplete: false,
        };
      }
      return { summary: 'Configure day', incomplete: true };
    }

    case 'event': {
      const { eventType, maxWaitAmount, maxWaitUnit } = config;
      if (eventType) {
        const eventLabel = getEventLabel(objectType, eventType);
        const maxStr = maxWaitAmount ? ` (max ${maxWaitAmount} ${maxWaitUnit || 'days'})` : '';
        return {
          summary: `Wait until ${eventLabel}${maxStr}`,
          incomplete: false,
        };
      }
      return { summary: 'Configure event', incomplete: true };
    }

    default:
      return { summary: 'Configure wait', incomplete: true };
  }
}

// =============================================================================
// DETERMINATOR SUMMARIES
// =============================================================================

/**
 * Format determinator step summary
 * Handles multi-branch structure with branches array
 */
export function formatDeterminatorSummary(config) {
  const branches = config?.branches || [];

  // Handle new multi-branch structure
  if (branches.length > 0) {
    // Filter out the default "None matched" branch
    const conditionalBranches = branches.filter(b => !b.isDefault);
    const branchCount = branches.length; // Including "None matched"

    // Count total conditions across all branches
    const totalConditions = conditionalBranches.reduce((sum, branch) => {
      const branchConditions = branch.conditions?.conditions || [];
      return sum + branchConditions.length;
    }, 0);

    // Check if any conditional branch has no conditions
    const hasIncomplete = conditionalBranches.some(branch => {
      const branchConditions = branch.conditions?.conditions || [];
      return branchConditions.length === 0;
    });

    if (conditionalBranches.length === 0) {
      return { summary: 'Configure branches', incomplete: true };
    }

    if (totalConditions === 0) {
      return {
        summary: `${branchCount} branches (no conditions)`,
        incomplete: true,
      };
    }

    return {
      summary: `${branchCount} branches, ${totalConditions} condition${totalConditions > 1 ? 's' : ''}`,
      incomplete: hasIncomplete,
    };
  }

  // Legacy structure support (groups or flat conditions)
  const groups = config?.groups || [];
  const conditions = config?.conditions || [];

  // Handle grouped condition structures
  if (groups.length > 0) {
    const totalConditions = groups.reduce(
      (sum, g) => sum + (g.conditions?.length || 0),
      0
    );
    if (totalConditions === 0) {
      return { summary: 'Configure conditions', incomplete: true };
    }
    if (groups.length === 1) {
      return {
        summary: `${totalConditions} condition${totalConditions > 1 ? 's' : ''}`,
        incomplete: false,
      };
    }
    return {
      summary: `${groups.length} groups, ${totalConditions} conditions`,
      incomplete: false,
    };
  }

  // Legacy flat conditions
  if (conditions.length > 0) {
    return {
      summary: `${conditions.length} condition${conditions.length > 1 ? 's' : ''}`,
      incomplete: false,
    };
  }

  return { summary: 'Configure branches', incomplete: true };
}

// =============================================================================
// GATE SUMMARIES
// =============================================================================

/**
 * Format gate step summary
 */
export function formatGateSummary(config) {
  const groups = config?.groups || [];
  const conditions = config?.conditions || [];

  // Handle both grouped and flat condition structures
  if (groups.length > 0) {
    const totalConditions = groups.reduce(
      (sum, g) => sum + (g.conditions?.length || 0),
      0
    );
    if (totalConditions === 0) {
      return { summary: 'Configure gate condition', incomplete: true };
    }
    return {
      summary: `Gate: ${totalConditions} condition${totalConditions > 1 ? 's' : ''}`,
      incomplete: false,
    };
  }

  // Legacy flat conditions
  if (conditions.length > 0) {
    return {
      summary: `Gate: ${conditions.length} condition${conditions.length > 1 ? 's' : ''}`,
      incomplete: false,
    };
  }

  return { summary: 'Configure gate condition', incomplete: true };
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Format step summary based on step type
 * @param {Object} step - The step object
 * @param {string} objectType - The workflow object type
 * @param {Object} lookups - Optional lookup data for names (segmentName, workflowName, etc.)
 * @returns {{ summary: string, incomplete: boolean }}
 */
export function formatStepSummary(step, objectType, lookups = {}) {
  if (!step) {
    return { summary: 'No step', incomplete: true };
  }

  switch (step.stepType) {
    case STEP_TYPES.ACTION:
      return formatActionSummary(step.actionType, step.config, objectType, lookups);

    case STEP_TYPES.WAIT:
      return formatWaitSummary(step.config, objectType);

    case STEP_TYPES.DETERMINATOR:
      return formatDeterminatorSummary(step.config);

    case STEP_TYPES.GATE:
      return formatGateSummary(step.config);

    case STEP_TYPES.TERMINUS:
      return { summary: 'End of workflow', incomplete: false };

    default:
      return { summary: 'Unknown step type', incomplete: true };
  }
}

/**
 * Check if a step is incomplete (needs configuration)
 * @param {Object} step - The step object
 * @param {string} objectType - The workflow object type
 * @returns {boolean}
 */
export function isStepIncomplete(step, objectType) {
  const { incomplete } = formatStepSummary(step, objectType);
  return incomplete;
}

/**
 * Get all incomplete steps in a workflow
 * @param {Array} steps - Array of step objects
 * @param {string} objectType - The workflow object type
 * @returns {Array} Array of incomplete step IDs
 */
export function getIncompleteSteps(steps, objectType) {
  return (steps || [])
    .filter((step) => isStepIncomplete(step, objectType))
    .map((step) => step.id);
}
