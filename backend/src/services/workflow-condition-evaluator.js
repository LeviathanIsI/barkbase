/**
 * Workflow Condition Evaluator Service
 *
 * Evaluates condition groups against records for:
 * - Enrollment triggers
 * - Determinators (branching)
 * - Gates (continue/stop)
 * - Goals (unenrollment)
 *
 * Condition Format:
 * {
 *   groups: [
 *     {
 *       logic: 'and' | 'or',  // within group
 *       conditions: [
 *         { field: 'fieldName', operator: 'is_equal_to_any', value: 'single', values: ['array'] }
 *       ]
 *     }
 *   ],
 *   groupLogic: 'and' | 'or'  // between groups
 * }
 */

/**
 * Evaluate all condition groups against a record
 * @param {Object} conditionConfig - The condition configuration
 * @param {Object} record - The record data to evaluate against
 * @returns {boolean} - Whether the record matches the conditions
 */
function evaluateConditions(conditionConfig, record) {
  if (!conditionConfig || !conditionConfig.groups || conditionConfig.groups.length === 0) {
    // No conditions = always matches (for triggers with no filters)
    return true;
  }

  const { groups, groupLogic = 'or' } = conditionConfig;
  const groupResults = groups.map(group => evaluateGroup(group, record));

  if (groupLogic === 'and') {
    return groupResults.every(result => result === true);
  } else {
    // Default to OR logic between groups
    return groupResults.some(result => result === true);
  }
}

/**
 * Evaluate a single condition group
 * @param {Object} group - { logic: 'and'|'or', conditions: [...] }
 * @param {Object} record - The record data
 * @returns {boolean}
 */
function evaluateGroup(group, record) {
  if (!group || !group.conditions || group.conditions.length === 0) {
    return true; // Empty group = passes
  }

  const { logic = 'and', conditions } = group;
  const conditionResults = conditions.map(cond => evaluateCondition(cond, record));

  if (logic === 'or') {
    return conditionResults.some(result => result === true);
  } else {
    // Default to AND logic within group
    return conditionResults.every(result => result === true);
  }
}

/**
 * Evaluate a single condition against a record
 * @param {Object} condition - { field, operator, value, values }
 * @param {Object} record - The record data
 * @returns {boolean}
 */
function evaluateCondition(condition, record) {
  const { field, operator, value, values } = condition;

  if (!field || !operator) {
    console.warn('[ConditionEvaluator] Invalid condition - missing field or operator:', condition);
    return false;
  }

  // Get the record value for this field (supports nested fields like "owner.name")
  const recordValue = getNestedValue(record, field);

  // Route to appropriate operator handler
  switch (operator) {
    // === TEXT OPERATORS ===
    case 'is_equal_to_any':
      return evaluateIsEqualToAny(recordValue, values || [value]);

    case 'is_not_equal_to_any':
      return !evaluateIsEqualToAny(recordValue, values || [value]);

    case 'contains_exactly':
      return evaluateContainsExactly(recordValue, value);

    case 'does_not_contain_exactly':
      return !evaluateContainsExactly(recordValue, value);

    case 'contains_any':
      return evaluateContainsAny(recordValue, values || [value]);

    case 'does_not_contain_any':
      return !evaluateContainsAny(recordValue, values || [value]);

    case 'starts_with':
      return evaluateStartsWith(recordValue, value);

    case 'ends_with':
      return evaluateEndsWith(recordValue, value);

    // === KNOWN/UNKNOWN OPERATORS ===
    case 'is_known':
      return isKnown(recordValue);

    case 'is_unknown':
      return !isKnown(recordValue);

    // === NUMBER OPERATORS ===
    case 'is_equal_to':
      return evaluateNumberEquals(recordValue, value);

    case 'is_not_equal_to':
      return !evaluateNumberEquals(recordValue, value);

    case 'is_greater_than':
      return evaluateGreaterThan(recordValue, value);

    case 'is_greater_than_or_equal':
      return evaluateGreaterThanOrEqual(recordValue, value);

    case 'is_less_than':
      return evaluateLessThan(recordValue, value);

    case 'is_less_than_or_equal':
      return evaluateLessThanOrEqual(recordValue, value);

    case 'is_between':
      return evaluateIsBetween(recordValue, values);

    // === DATE OPERATORS ===
    case 'is_before':
      return evaluateDateBefore(recordValue, value);

    case 'is_after':
      return evaluateDateAfter(recordValue, value);

    case 'is_on':
      return evaluateDateOn(recordValue, value);

    case 'is_within_last':
      return evaluateWithinLast(recordValue, value, condition.unit || 'days');

    case 'is_within_next':
      return evaluateWithinNext(recordValue, value, condition.unit || 'days');

    case 'is_more_than_ago':
      return evaluateMoreThanAgo(recordValue, value, condition.unit || 'days');

    case 'is_less_than_ago':
      return evaluateLessThanAgo(recordValue, value, condition.unit || 'days');

    // === BOOLEAN OPERATORS ===
    case 'is_true':
      return recordValue === true || recordValue === 'true' || recordValue === 1;

    case 'is_false':
      return recordValue === false || recordValue === 'false' || recordValue === 0;

    // === ENUM/SELECT OPERATORS ===
    case 'is_any_of':
      return evaluateIsAnyOf(recordValue, values || [value]);

    case 'is_none_of':
      return !evaluateIsAnyOf(recordValue, values || [value]);

    // === ARRAY/LIST OPERATORS ===
    case 'has_any':
      return evaluateHasAny(recordValue, values || [value]);

    case 'has_all':
      return evaluateHasAll(recordValue, values || [value]);

    case 'has_none':
      return !evaluateHasAny(recordValue, values || [value]);

    default:
      console.warn('[ConditionEvaluator] Unknown operator:', operator);
      return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a nested value from an object using dot notation
 * @param {Object} obj - The object to get the value from
 * @param {string} path - The path like "owner.name" or "pet.breed"
 * @returns {*} The value at the path, or undefined
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;

  // Handle snake_case to camelCase conversion for common fields
  const normalizedPath = path.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

  // Try both the original path and the normalized path
  const paths = [path, normalizedPath];

  for (const p of paths) {
    const parts = p.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        break;
      }
      current = current[part];
    }

    if (current !== undefined) {
      return current;
    }
  }

  return undefined;
}

/**
 * Check if a value is "known" (not null, undefined, or empty string)
 */
function isKnown(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Normalize a string for comparison
 */
function normalizeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim();
}

// ============================================================================
// TEXT OPERATOR IMPLEMENTATIONS
// ============================================================================

function evaluateIsEqualToAny(recordValue, targetValues) {
  if (!isKnown(recordValue) || !Array.isArray(targetValues)) return false;
  const normalized = normalizeString(recordValue);
  return targetValues.some(v => normalizeString(v) === normalized);
}

function evaluateContainsExactly(recordValue, targetValue) {
  if (!isKnown(recordValue) || !isKnown(targetValue)) return false;
  return normalizeString(recordValue).includes(normalizeString(targetValue));
}

function evaluateContainsAny(recordValue, targetValues) {
  if (!isKnown(recordValue) || !Array.isArray(targetValues)) return false;
  const normalized = normalizeString(recordValue);
  return targetValues.some(v => normalized.includes(normalizeString(v)));
}

function evaluateStartsWith(recordValue, targetValue) {
  if (!isKnown(recordValue) || !isKnown(targetValue)) return false;
  return normalizeString(recordValue).startsWith(normalizeString(targetValue));
}

function evaluateEndsWith(recordValue, targetValue) {
  if (!isKnown(recordValue) || !isKnown(targetValue)) return false;
  return normalizeString(recordValue).endsWith(normalizeString(targetValue));
}

// ============================================================================
// NUMBER OPERATOR IMPLEMENTATIONS
// ============================================================================

function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function evaluateNumberEquals(recordValue, targetValue) {
  const a = parseNumber(recordValue);
  const b = parseNumber(targetValue);
  if (a === null || b === null) return false;
  return a === b;
}

function evaluateGreaterThan(recordValue, targetValue) {
  const a = parseNumber(recordValue);
  const b = parseNumber(targetValue);
  if (a === null || b === null) return false;
  return a > b;
}

function evaluateGreaterThanOrEqual(recordValue, targetValue) {
  const a = parseNumber(recordValue);
  const b = parseNumber(targetValue);
  if (a === null || b === null) return false;
  return a >= b;
}

function evaluateLessThan(recordValue, targetValue) {
  const a = parseNumber(recordValue);
  const b = parseNumber(targetValue);
  if (a === null || b === null) return false;
  return a < b;
}

function evaluateLessThanOrEqual(recordValue, targetValue) {
  const a = parseNumber(recordValue);
  const b = parseNumber(targetValue);
  if (a === null || b === null) return false;
  return a <= b;
}

function evaluateIsBetween(recordValue, values) {
  if (!Array.isArray(values) || values.length < 2) return false;
  const val = parseNumber(recordValue);
  const min = parseNumber(values[0]);
  const max = parseNumber(values[1]);
  if (val === null || min === null || max === null) return false;
  return val >= min && val <= max;
}

// ============================================================================
// DATE OPERATOR IMPLEMENTATIONS
// ============================================================================

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function evaluateDateBefore(recordValue, targetValue) {
  const a = parseDate(recordValue);
  const b = parseDate(targetValue);
  if (!a || !b) return false;
  return a < b;
}

function evaluateDateAfter(recordValue, targetValue) {
  const a = parseDate(recordValue);
  const b = parseDate(targetValue);
  if (!a || !b) return false;
  return a > b;
}

function evaluateDateOn(recordValue, targetValue) {
  const a = parseDate(recordValue);
  const b = parseDate(targetValue);
  if (!a || !b) return false;
  // Compare just the date portion (ignore time)
  return a.toDateString() === b.toDateString();
}

function evaluateWithinLast(recordValue, amount, unit) {
  const date = parseDate(recordValue);
  if (!date) return false;

  const now = new Date();
  const threshold = subtractFromDate(now, amount, unit);

  return date >= threshold && date <= now;
}

function evaluateWithinNext(recordValue, amount, unit) {
  const date = parseDate(recordValue);
  if (!date) return false;

  const now = new Date();
  const threshold = addToDate(now, amount, unit);

  return date >= now && date <= threshold;
}

function evaluateMoreThanAgo(recordValue, amount, unit) {
  const date = parseDate(recordValue);
  if (!date) return false;

  const now = new Date();
  const threshold = subtractFromDate(now, amount, unit);

  return date < threshold;
}

function evaluateLessThanAgo(recordValue, amount, unit) {
  const date = parseDate(recordValue);
  if (!date) return false;

  const now = new Date();
  const threshold = subtractFromDate(now, amount, unit);

  return date > threshold && date < now;
}

function addToDate(date, amount, unit) {
  const result = new Date(date);
  const numAmount = parseInt(amount) || 0;

  switch (unit) {
    case 'minutes':
      result.setMinutes(result.getMinutes() + numAmount);
      break;
    case 'hours':
      result.setHours(result.getHours() + numAmount);
      break;
    case 'days':
      result.setDate(result.getDate() + numAmount);
      break;
    case 'weeks':
      result.setDate(result.getDate() + (numAmount * 7));
      break;
    case 'months':
      result.setMonth(result.getMonth() + numAmount);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + numAmount);
      break;
  }

  return result;
}

function subtractFromDate(date, amount, unit) {
  return addToDate(date, -amount, unit);
}

// ============================================================================
// ENUM/ARRAY OPERATOR IMPLEMENTATIONS
// ============================================================================

function evaluateIsAnyOf(recordValue, targetValues) {
  if (!isKnown(recordValue) || !Array.isArray(targetValues)) return false;
  const normalized = normalizeString(recordValue);
  return targetValues.some(v => normalizeString(v) === normalized);
}

function evaluateHasAny(recordValue, targetValues) {
  if (!Array.isArray(recordValue) || !Array.isArray(targetValues)) return false;
  const normalizedRecord = recordValue.map(v => normalizeString(v));
  return targetValues.some(v => normalizedRecord.includes(normalizeString(v)));
}

function evaluateHasAll(recordValue, targetValues) {
  if (!Array.isArray(recordValue) || !Array.isArray(targetValues)) return false;
  const normalizedRecord = recordValue.map(v => normalizeString(v));
  return targetValues.every(v => normalizedRecord.includes(normalizeString(v)));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  evaluateConditions,
  evaluateGroup,
  evaluateCondition,
  // Export helpers for testing
  getNestedValue,
  isKnown,
  parseNumber,
  parseDate,
};
