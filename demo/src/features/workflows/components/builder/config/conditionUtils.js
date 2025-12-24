/**
 * Condition utilities for workflow builder
 * Shared between ConditionBuilder and TriggerCard
 */

/**
 * Normalize condition config to new groups format
 * Handles backwards compatibility with old flat structure
 */
export function normalizeConditionConfig(config) {
  // Already new format with groups
  if (config?.groups && Array.isArray(config.groups)) {
    return config;
  }

  // Old flat format with conditions array - migrate
  if (config?.conditions && Array.isArray(config.conditions)) {
    return {
      groups: [{
        id: 'group-1',
        logic: config.logic || 'and',
        conditions: config.conditions,
      }],
      groupLogic: 'or',
    };
  }

  // Empty or invalid - initialize with empty group
  return {
    groups: [{
      id: 'group-1',
      logic: 'and',
      conditions: [],
    }],
    groupLogic: 'or',
  };
}
