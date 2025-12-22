/**
 * Unit Tests - Goal Evaluation
 *
 * Tests the evaluateGoalConditions function from the workflow processor.
 * Verifies goal condition evaluation for auto-unenrollment.
 */

// Goal condition evaluation function (mimics Lambda logic)
function getNestedValue(obj, path) {
  if (!path) return undefined;
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function evaluateGoalCondition(condition, recordData) {
  const { field, operator, value } = condition;
  const actualValue = getNestedValue(recordData, field);

  switch (operator) {
    case 'equals':
    case 'IS_EQUAL_TO':
      return String(actualValue) === String(value);
    case 'not_equals':
    case 'IS_NOT_EQUAL_TO':
      return String(actualValue) !== String(value);
    case 'contains':
    case 'CONTAINS':
      return String(actualValue || '').toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains':
    case 'DOES_NOT_CONTAIN':
      return !String(actualValue || '').toLowerCase().includes(String(value).toLowerCase());
    case 'starts_with':
    case 'STARTS_WITH':
      return String(actualValue || '').toLowerCase().startsWith(String(value).toLowerCase());
    case 'ends_with':
    case 'ENDS_WITH':
      return String(actualValue || '').toLowerCase().endsWith(String(value).toLowerCase());
    case 'is_empty':
    case 'IS_EMPTY':
    case 'IS_UNKNOWN':
      return !actualValue || actualValue === '';
    case 'is_not_empty':
    case 'IS_NOT_EMPTY':
    case 'IS_KNOWN':
      return !!actualValue && actualValue !== '';
    case 'greater_than':
    case 'GREATER_THAN':
      return Number(actualValue) > Number(value);
    case 'less_than':
    case 'LESS_THAN':
      return Number(actualValue) < Number(value);
    case 'is_true':
    case 'IS_TRUE':
      return actualValue === true || actualValue === 'true';
    case 'is_false':
    case 'IS_FALSE':
      return actualValue === false || actualValue === 'false';
    default:
      console.warn('Unknown goal condition operator:', operator);
      return false;
  }
}

function evaluateGoalConditions(goalConfig, recordData) {
  if (!goalConfig) {
    return { met: false, reason: 'No goal configured' };
  }

  const conditions = goalConfig.conditions || [];
  const conditionLogic = goalConfig.conditionLogic || goalConfig.logic || 'and';

  if (conditions.length === 0) {
    return { met: false, reason: 'No goal conditions defined' };
  }

  // Evaluate each condition and track results
  const conditionResults = conditions.map(condition => {
    const result = evaluateGoalCondition(condition, recordData);
    return {
      field: condition.field,
      operator: condition.operator,
      expectedValue: condition.value,
      actualValue: getNestedValue(recordData, condition.field),
      met: result,
    };
  });

  // Determine if goal is met based on logic
  let goalMet;
  if (conditionLogic === 'or') {
    goalMet = conditionResults.some(r => r.met);
  } else {
    goalMet = conditionResults.every(r => r.met);
  }

  return {
    met: goalMet,
    conditionLogic,
    conditionResults,
    reason: goalMet
      ? (conditionLogic === 'or' ? 'At least one goal condition satisfied' : 'All goal conditions satisfied')
      : (conditionLogic === 'or' ? 'No goal conditions satisfied' : 'Not all goal conditions satisfied'),
  };
}

describe('Goal Evaluation', () => {
  describe('Single Condition', () => {
    test('evaluates single condition that is met', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'CONFIRMED' },
        ],
        conditionLogic: 'and',
      };

      const recordData = {
        status: 'CONFIRMED',
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(true);
      expect(result.conditionResults).toHaveLength(1);
      expect(result.conditionResults[0].met).toBe(true);
    });

    test('evaluates single condition that is not met', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'CONFIRMED' },
        ],
        conditionLogic: 'and',
      };

      const recordData = {
        status: 'PENDING',
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(false);
      expect(result.conditionResults[0].met).toBe(false);
      expect(result.conditionResults[0].actualValue).toBe('PENDING');
      expect(result.conditionResults[0].expectedValue).toBe('CONFIRMED');
    });
  });

  describe('Multiple Conditions with AND Logic', () => {
    test('all conditions met - goal is met', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'CONFIRMED' },
          { field: 'is_paid', operator: 'is_true' },
        ],
        conditionLogic: 'and',
      };

      const recordData = {
        status: 'CONFIRMED',
        is_paid: true,
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(true);
      expect(result.conditionResults.every(r => r.met)).toBe(true);
    });

    test('one condition not met - goal is not met', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'CONFIRMED' },
          { field: 'is_paid', operator: 'is_true' },
        ],
        conditionLogic: 'and',
      };

      const recordData = {
        status: 'CONFIRMED',
        is_paid: false,
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(false);
      expect(result.reason).toBe('Not all goal conditions satisfied');
    });

    test('no conditions met - goal is not met', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'CONFIRMED' },
          { field: 'is_paid', operator: 'is_true' },
        ],
        conditionLogic: 'and',
      };

      const recordData = {
        status: 'PENDING',
        is_paid: false,
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(false);
      expect(result.conditionResults.every(r => !r.met)).toBe(true);
    });
  });

  describe('Multiple Conditions with OR Logic', () => {
    test('at least one condition met - goal is met', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'COMPLETED' },
          { field: 'status', operator: 'equals', value: 'CANCELLED' },
        ],
        conditionLogic: 'or',
      };

      const recordData = {
        status: 'COMPLETED',
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(true);
      expect(result.reason).toBe('At least one goal condition satisfied');
    });

    test('no conditions met - goal is not met', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'COMPLETED' },
          { field: 'status', operator: 'equals', value: 'CANCELLED' },
        ],
        conditionLogic: 'or',
      };

      const recordData = {
        status: 'PENDING',
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(false);
      expect(result.reason).toBe('No goal conditions satisfied');
    });
  });

  describe('Empty Conditions', () => {
    test('returns not met for null goal config', () => {
      const result = evaluateGoalConditions(null, { status: 'CONFIRMED' });

      expect(result.met).toBe(false);
      expect(result.reason).toBe('No goal configured');
    });

    test('returns not met for empty conditions array', () => {
      const goalConfig = {
        conditions: [],
        conditionLogic: 'and',
      };

      const result = evaluateGoalConditions(goalConfig, { status: 'CONFIRMED' });

      expect(result.met).toBe(false);
      expect(result.reason).toBe('No goal conditions defined');
    });

    test('returns not met for undefined conditions', () => {
      const goalConfig = {
        conditionLogic: 'and',
      };

      const result = evaluateGoalConditions(goalConfig, { status: 'CONFIRMED' });

      expect(result.met).toBe(false);
    });
  });

  describe('Nested Field Paths', () => {
    test('evaluates nested field path', () => {
      const goalConfig = {
        conditions: [
          { field: 'owner.email_verified', operator: 'is_true' },
        ],
        conditionLogic: 'and',
      };

      const recordData = {
        owner: {
          email_verified: true,
        },
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(true);
    });

    test('handles missing nested path gracefully', () => {
      const goalConfig = {
        conditions: [
          { field: 'owner.email_verified', operator: 'is_true' },
        ],
        conditionLogic: 'and',
      };

      const recordData = {};

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(false);
    });
  });

  describe('All Operators', () => {
    const recordData = {
      status: 'CONFIRMED',
      name: 'Max the Dog',
      count: 5,
      email: '',
      is_active: true,
      is_deleted: false,
    };

    test('equals operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'status', operator: 'equals', value: 'CONFIRMED' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('not_equals operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'status', operator: 'not_equals', value: 'PENDING' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('contains operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'name', operator: 'contains', value: 'Dog' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('not_contains operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'name', operator: 'not_contains', value: 'Cat' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('starts_with operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'name', operator: 'starts_with', value: 'Max' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('ends_with operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'name', operator: 'ends_with', value: 'Dog' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('is_empty operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'email', operator: 'is_empty' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('is_not_empty operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'name', operator: 'is_not_empty' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('greater_than operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'count', operator: 'greater_than', value: 3 }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('less_than operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'count', operator: 'less_than', value: 10 }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('is_true operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'is_active', operator: 'is_true' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('is_false operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'is_deleted', operator: 'is_false' }],
      }, recordData);
      expect(result.met).toBe(true);
    });
  });

  describe('HubSpot-style Operator Names', () => {
    const recordData = {
      status: 'CONFIRMED',
      name: 'Max',
    };

    test('IS_EQUAL_TO operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'status', operator: 'IS_EQUAL_TO', value: 'CONFIRMED' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('IS_NOT_EQUAL_TO operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'status', operator: 'IS_NOT_EQUAL_TO', value: 'PENDING' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('CONTAINS operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'name', operator: 'CONTAINS', value: 'ax' }],
      }, recordData);
      expect(result.met).toBe(true);
    });

    test('IS_KNOWN operator', () => {
      const result = evaluateGoalConditions({
        conditions: [{ field: 'name', operator: 'IS_KNOWN' }],
      }, recordData);
      expect(result.met).toBe(true);
    });
  });

  describe('Condition Results Details', () => {
    test('returns detailed condition results', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'CONFIRMED' },
          { field: 'count', operator: 'greater_than', value: 3 },
        ],
        conditionLogic: 'and',
      };

      const recordData = {
        status: 'CONFIRMED',
        count: 5,
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.conditionResults).toHaveLength(2);

      expect(result.conditionResults[0]).toEqual({
        field: 'status',
        operator: 'equals',
        expectedValue: 'CONFIRMED',
        actualValue: 'CONFIRMED',
        met: true,
      });

      expect(result.conditionResults[1]).toEqual({
        field: 'count',
        operator: 'greater_than',
        expectedValue: 3,
        actualValue: 5,
        met: true,
      });
    });
  });

  describe('Default Logic', () => {
    test('defaults to AND logic when not specified', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'CONFIRMED' },
          { field: 'is_paid', operator: 'is_true' },
        ],
        // No conditionLogic specified
      };

      const recordData = {
        status: 'CONFIRMED',
        is_paid: false, // One condition fails
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      // With AND logic (default), should be false since one condition fails
      expect(result.met).toBe(false);
    });

    test('respects legacy logic field', () => {
      const goalConfig = {
        conditions: [
          { field: 'status', operator: 'equals', value: 'COMPLETED' },
          { field: 'status', operator: 'equals', value: 'CANCELLED' },
        ],
        logic: 'or', // Legacy field name
      };

      const recordData = {
        status: 'COMPLETED',
      };

      const result = evaluateGoalConditions(goalConfig, recordData);

      expect(result.met).toBe(true);
    });
  });
});
