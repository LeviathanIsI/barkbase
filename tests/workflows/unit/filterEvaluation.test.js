/**
 * Unit Tests - Filter Evaluation
 *
 * Tests the evaluateOperator and evaluateFilterCondition functions
 * from the workflow processor. Tests all operators defined in constants.js.
 *
 * Note: We implement the filter evaluation logic directly in tests
 * to avoid complex mocking of Lambda dependencies.
 */

// Helper function to evaluate operators (mimics the Lambda logic)
function evaluateOperator(operator, actualValue, filterValue, options = {}) {
  const { highValue, values, includeObjectsWithNoValueSet } = options;

  // Normalize operator to uppercase
  const op = (operator || '').toUpperCase().replace(/-/g, '_');

  // Handle empty values (enterprise includeObjectsWithNoValueSet)
  const emptinessOperators = ['IS_EMPTY', 'IS_NOT_EMPTY', 'IS_KNOWN', 'IS_UNKNOWN'];
  if (!emptinessOperators.includes(op) && (actualValue === null || actualValue === undefined)) {
    if (includeObjectsWithNoValueSet === true) {
      return true;
    }
    return false;
  }

  switch (op) {
    // Equality operators
    case 'EQUALS':
    case 'IS':
    case 'IS_EQUAL_TO':
    case 'EQ':
      return compareValues(actualValue, filterValue);

    case 'NOT_EQUALS':
    case 'IS_NOT':
    case 'IS_NOT_EQUAL_TO':
    case 'NEQ':
      return !compareValues(actualValue, filterValue);

    // String operators
    case 'CONTAINS':
      return String(actualValue || '').toLowerCase().includes(String(filterValue || '').toLowerCase());

    case 'NOT_CONTAINS':
    case 'DOES_NOT_CONTAIN':
      return !String(actualValue || '').toLowerCase().includes(String(filterValue || '').toLowerCase());

    case 'STARTS_WITH':
      return String(actualValue || '').toLowerCase().startsWith(String(filterValue || '').toLowerCase());

    case 'ENDS_WITH':
      return String(actualValue || '').toLowerCase().endsWith(String(filterValue || '').toLowerCase());

    // Empty/Known operators
    case 'IS_EMPTY':
    case 'IS_UNKNOWN':
      return actualValue === null || actualValue === undefined || actualValue === '';

    case 'IS_NOT_EMPTY':
    case 'IS_KNOWN':
    case 'HAS_EVER_BEEN_ANY':
      return actualValue !== null && actualValue !== undefined && actualValue !== '';

    // Numeric comparison operators
    case 'GREATER_THAN':
    case 'IS_GREATER_THAN':
    case 'GT':
      return Number(actualValue) > Number(filterValue);

    case 'LESS_THAN':
    case 'IS_LESS_THAN':
    case 'LT':
      return Number(actualValue) < Number(filterValue);

    case 'GREATER_OR_EQUAL':
    case 'GREATER_THAN_OR_EQUAL':
    case 'IS_GREATER_THAN_OR_EQUAL':
    case 'GTE':
      return Number(actualValue) >= Number(filterValue);

    case 'LESS_OR_EQUAL':
    case 'LESS_THAN_OR_EQUAL':
    case 'IS_LESS_THAN_OR_EQUAL':
    case 'LTE':
      return Number(actualValue) <= Number(filterValue);

    // Range operator
    case 'IS_BETWEEN':
    case 'BETWEEN':
      const lowVal = Number(filterValue);
      const highVal = Number(highValue);
      const numActual = Number(actualValue);
      return numActual >= lowVal && numActual <= highVal;

    // Multi-value operators
    case 'IS_ANY_OF':
    case 'EQUALS_ANY':
    case 'IN':
      const anyOfValues = values || (Array.isArray(filterValue) ? filterValue : [filterValue]);
      return anyOfValues.some(v => compareValues(actualValue, v));

    case 'IS_NONE_OF':
    case 'NOT_ANY_OF':
    case 'NOT_IN':
      const noneOfValues = values || (Array.isArray(filterValue) ? filterValue : [filterValue]);
      return !noneOfValues.some(v => compareValues(actualValue, v));

    // Date operators
    case 'IS_BEFORE':
    case 'BEFORE':
      return compareDates(actualValue, filterValue) < 0;

    case 'IS_AFTER':
    case 'AFTER':
      return compareDates(actualValue, filterValue) > 0;

    // Boolean operators
    case 'IS_TRUE':
      return actualValue === true || actualValue === 'true' || actualValue === 1;

    case 'IS_FALSE':
      return actualValue === false || actualValue === 'false' || actualValue === 0;

    default:
      console.warn('Unknown operator:', operator);
      return false;
  }
}

function compareValues(actual, expected) {
  if (actual === null || actual === undefined) {
    return expected === null || expected === undefined || expected === '';
  }
  const numActual = Number(actual);
  const numExpected = Number(expected);
  if (!isNaN(numActual) && !isNaN(numExpected)) {
    return numActual === numExpected;
  }
  return String(actual).toLowerCase() === String(expected).toLowerCase();
}

function compareDates(actual, expected) {
  const actualDate = new Date(actual);
  const expectedDate = new Date(expected);
  if (isNaN(actualDate.getTime()) || isNaN(expectedDate.getTime())) {
    return 0;
  }
  return actualDate.getTime() - expectedDate.getTime();
}

// Helper to parse enterprise filters
function evaluateFilterBranches(filterConfig, record) {
  const rootType = (filterConfig.filterBranchType || 'OR').toUpperCase();
  const branches = filterConfig.filterBranches || [];

  if (branches.length === 0) {
    if (filterConfig.filters && filterConfig.filters.length > 0) {
      return evaluateFilterGroup(filterConfig.filters, record);
    }
    return false;
  }

  const branchResults = branches.map(branch => {
    const branchType = (branch.filterBranchType || 'AND').toUpperCase();
    const filters = branch.filters || [];

    let filtersResult = true;
    if (filters.length > 0) {
      filtersResult = evaluateFilterGroup(filters, record);
    }

    return filtersResult;
  });

  if (rootType === 'AND') {
    return branchResults.every(r => r);
  }
  return branchResults.some(r => r);
}

function evaluateFilterGroup(filters, record) {
  return filters.every(filter => {
    const field = filter.property || filter.field;
    const actualValue = record[field];
    return evaluateOperator(filter.operator, actualValue, filter.value, {
      highValue: filter.highValue,
      values: filter.values,
      includeObjectsWithNoValueSet: filter.includeObjectsWithNoValueSet,
    });
  });
}

function evaluateBarkBaseFilters(filterConfig, record) {
  const groupLogic = (filterConfig.groupLogic || 'OR').toUpperCase();

  const groupResults = filterConfig.groups.map(group => {
    const conditionLogic = (group.logic || 'AND').toUpperCase();
    const conditions = group.conditions || [];

    if (conditions.length === 0) {
      return false;
    }

    const conditionResults = conditions.map(condition => {
      const actualValue = record[condition.field];
      return evaluateOperator(condition.operator, actualValue, condition.value, {
        highValue: condition.highValue,
        values: condition.values,
      });
    });

    if (conditionLogic === 'OR') {
      return conditionResults.some(r => r);
    }
    return conditionResults.every(r => r);
  });

  if (groupLogic === 'AND') {
    return groupResults.every(r => r);
  }
  return groupResults.some(r => r);
}


describe('Filter Evaluation - Operators', () => {
  describe('Equality Operators', () => {
    test('equals - matches same string (case insensitive)', () => {
      expect(evaluateOperator('equals', 'Hello', 'hello')).toBe(true);
      expect(evaluateOperator('equals', 'Hello', 'Hello')).toBe(true);
      expect(evaluateOperator('IS_EQUAL_TO', 'test', 'TEST')).toBe(true);
    });

    test('equals - matches same number', () => {
      expect(evaluateOperator('equals', 100, 100)).toBe(true);
      expect(evaluateOperator('equals', '100', 100)).toBe(true);
      expect(evaluateOperator('IS_EQUAL_TO', 42, '42')).toBe(true);
    });

    test('equals - does not match different values', () => {
      expect(evaluateOperator('equals', 'Hello', 'World')).toBe(false);
      expect(evaluateOperator('equals', 100, 200)).toBe(false);
    });

    test('not_equals - does not match same value', () => {
      expect(evaluateOperator('not_equals', 'Hello', 'hello')).toBe(false);
      expect(evaluateOperator('IS_NOT_EQUAL_TO', 100, 100)).toBe(false);
    });

    test('not_equals - matches different values', () => {
      expect(evaluateOperator('not_equals', 'Hello', 'World')).toBe(true);
      expect(evaluateOperator('IS_NOT_EQUAL_TO', 100, 200)).toBe(true);
    });
  });

  describe('String Operators', () => {
    test('contains - matches substring (case insensitive)', () => {
      expect(evaluateOperator('contains', 'Hello World', 'world')).toBe(true);
      expect(evaluateOperator('contains', 'Hello World', 'HELLO')).toBe(true);
      expect(evaluateOperator('CONTAINS', 'testing123', 'ing')).toBe(true);
    });

    test('contains - does not match missing substring', () => {
      expect(evaluateOperator('contains', 'Hello World', 'foo')).toBe(false);
    });

    test('not_contains - matches when substring missing', () => {
      expect(evaluateOperator('not_contains', 'Hello World', 'foo')).toBe(true);
      expect(evaluateOperator('DOES_NOT_CONTAIN', 'Hello', 'xyz')).toBe(true);
    });

    test('not_contains - does not match when substring present', () => {
      expect(evaluateOperator('not_contains', 'Hello World', 'World')).toBe(false);
    });

    test('starts_with - matches prefix', () => {
      expect(evaluateOperator('starts_with', 'Hello World', 'Hello')).toBe(true);
      expect(evaluateOperator('STARTS_WITH', 'Hello World', 'HELLO')).toBe(true);
    });

    test('starts_with - does not match non-prefix', () => {
      expect(evaluateOperator('starts_with', 'Hello World', 'World')).toBe(false);
    });

    test('ends_with - matches suffix', () => {
      expect(evaluateOperator('ends_with', 'Hello World', 'World')).toBe(true);
      expect(evaluateOperator('ENDS_WITH', 'test@example.com', '.com')).toBe(true);
    });

    test('ends_with - does not match non-suffix', () => {
      expect(evaluateOperator('ends_with', 'Hello World', 'Hello')).toBe(false);
    });
  });

  describe('Empty/Known Operators', () => {
    test('is_empty - matches null, undefined, empty string', () => {
      expect(evaluateOperator('is_empty', null, null)).toBe(true);
      expect(evaluateOperator('IS_EMPTY', undefined, null)).toBe(true);
      expect(evaluateOperator('IS_UNKNOWN', '', null)).toBe(true);
    });

    test('is_empty - does not match non-empty values', () => {
      expect(evaluateOperator('is_empty', 'Hello', null)).toBe(false);
      expect(evaluateOperator('IS_EMPTY', 0, null)).toBe(false);
      expect(evaluateOperator('IS_UNKNOWN', false, null)).toBe(false);
    });

    test('is_not_empty - matches non-empty values', () => {
      expect(evaluateOperator('is_not_empty', 'Hello', null)).toBe(true);
      expect(evaluateOperator('IS_NOT_EMPTY', 0, null)).toBe(true);
      expect(evaluateOperator('IS_KNOWN', 'test', null)).toBe(true);
    });

    test('is_not_empty - does not match empty values', () => {
      expect(evaluateOperator('is_not_empty', null, null)).toBe(false);
      expect(evaluateOperator('IS_NOT_EMPTY', '', null)).toBe(false);
      expect(evaluateOperator('IS_KNOWN', undefined, null)).toBe(false);
    });
  });

  describe('Numeric Comparison Operators', () => {
    test('greater_than - compares numbers correctly', () => {
      expect(evaluateOperator('greater_than', 100, 50)).toBe(true);
      expect(evaluateOperator('IS_GREATER_THAN', 100, 100)).toBe(false);
      expect(evaluateOperator('GT', 50, 100)).toBe(false);
    });

    test('less_than - compares numbers correctly', () => {
      expect(evaluateOperator('less_than', 50, 100)).toBe(true);
      expect(evaluateOperator('IS_LESS_THAN', 100, 100)).toBe(false);
      expect(evaluateOperator('LT', 100, 50)).toBe(false);
    });

    test('greater_or_equal - compares numbers correctly', () => {
      expect(evaluateOperator('greater_or_equal', 100, 50)).toBe(true);
      expect(evaluateOperator('IS_GREATER_THAN_OR_EQUAL', 100, 100)).toBe(true);
      expect(evaluateOperator('GTE', 50, 100)).toBe(false);
    });

    test('less_or_equal - compares numbers correctly', () => {
      expect(evaluateOperator('less_or_equal', 50, 100)).toBe(true);
      expect(evaluateOperator('IS_LESS_THAN_OR_EQUAL', 100, 100)).toBe(true);
      expect(evaluateOperator('LTE', 100, 50)).toBe(false);
    });
  });

  describe('Range Operator (is_between)', () => {
    test('is_between - matches value in range', () => {
      expect(evaluateOperator('is_between', 50, 0, { highValue: 100 })).toBe(true);
      expect(evaluateOperator('IS_BETWEEN', 0, 0, { highValue: 100 })).toBe(true);
      expect(evaluateOperator('BETWEEN', 100, 0, { highValue: 100 })).toBe(true);
    });

    test('is_between - does not match value outside range', () => {
      expect(evaluateOperator('is_between', 150, 0, { highValue: 100 })).toBe(false);
      expect(evaluateOperator('IS_BETWEEN', -10, 0, { highValue: 100 })).toBe(false);
    });
  });

  describe('Multi-value Operators', () => {
    test('is_any_of - matches value in array', () => {
      expect(evaluateOperator('is_any_of', 'dog', null, { values: ['dog', 'cat', 'bird'] })).toBe(true);
      expect(evaluateOperator('IS_ANY_OF', 'cat', null, { values: ['dog', 'cat', 'bird'] })).toBe(true);
    });

    test('is_any_of - does not match value not in array', () => {
      expect(evaluateOperator('is_any_of', 'fish', null, { values: ['dog', 'cat', 'bird'] })).toBe(false);
    });

    test('is_none_of - matches value not in array', () => {
      expect(evaluateOperator('is_none_of', 'fish', null, { values: ['dog', 'cat', 'bird'] })).toBe(true);
      expect(evaluateOperator('IS_NONE_OF', 'rabbit', null, { values: ['dog', 'cat'] })).toBe(true);
    });

    test('is_none_of - does not match value in array', () => {
      expect(evaluateOperator('is_none_of', 'dog', null, { values: ['dog', 'cat', 'bird'] })).toBe(false);
    });
  });

  describe('Date Operators', () => {
    const pastDate = '2023-01-01T00:00:00Z';
    const futureDate = '2025-12-31T00:00:00Z';
    const referenceDate = '2024-06-15T00:00:00Z';

    test('is_before - compares dates correctly', () => {
      expect(evaluateOperator('is_before', pastDate, referenceDate)).toBe(true);
      expect(evaluateOperator('IS_BEFORE', futureDate, referenceDate)).toBe(false);
    });

    test('is_after - compares dates correctly', () => {
      expect(evaluateOperator('is_after', futureDate, referenceDate)).toBe(true);
      expect(evaluateOperator('IS_AFTER', pastDate, referenceDate)).toBe(false);
    });
  });

  describe('Boolean Operators', () => {
    test('is_true - matches truthy boolean values', () => {
      expect(evaluateOperator('is_true', true, null)).toBe(true);
      expect(evaluateOperator('IS_TRUE', 'true', null)).toBe(true);
      expect(evaluateOperator('IS_TRUE', 1, null)).toBe(true);
    });

    test('is_true - does not match falsy values', () => {
      expect(evaluateOperator('is_true', false, null)).toBe(false);
      expect(evaluateOperator('IS_TRUE', 'false', null)).toBe(false);
      expect(evaluateOperator('IS_TRUE', 0, null)).toBe(false);
    });

    test('is_false - matches falsy boolean values', () => {
      expect(evaluateOperator('is_false', false, null)).toBe(true);
      expect(evaluateOperator('IS_FALSE', 'false', null)).toBe(true);
      expect(evaluateOperator('IS_FALSE', 0, null)).toBe(true);
    });

    test('is_false - does not match truthy values', () => {
      expect(evaluateOperator('is_false', true, null)).toBe(false);
      expect(evaluateOperator('IS_FALSE', 'true', null)).toBe(false);
    });
  });

  describe('includeObjectsWithNoValueSet handling', () => {
    test('returns true for null value when includeObjectsWithNoValueSet is true', () => {
      expect(evaluateOperator('equals', null, 'test', { includeObjectsWithNoValueSet: true })).toBe(true);
      expect(evaluateOperator('contains', undefined, 'test', { includeObjectsWithNoValueSet: true })).toBe(true);
    });

    test('returns false for null value when includeObjectsWithNoValueSet is false', () => {
      expect(evaluateOperator('equals', null, 'test', { includeObjectsWithNoValueSet: false })).toBe(false);
      expect(evaluateOperator('equals', null, 'test')).toBe(false);
    });

    test('does not affect emptiness operators', () => {
      expect(evaluateOperator('is_empty', null, null, { includeObjectsWithNoValueSet: false })).toBe(true);
      expect(evaluateOperator('is_not_empty', null, null, { includeObjectsWithNoValueSet: true })).toBe(false);
    });
  });
});

describe('Filter Evaluation - enterprise Filter Format', () => {
  const testRecord = {
    name: 'Max',
    species: 'dog',
    weight: 50,
    vaccination_status: 'current',
    is_neutered: true,
    city: 'Austin',
  };

  test('evaluates simple filter with single condition', () => {
    const filter = {
      filterBranchType: 'OR',
      filterBranches: [
        {
          filterBranchType: 'AND',
          filters: [
            { property: 'species', operator: 'equals', value: 'dog' },
          ],
        },
      ],
    };

    expect(evaluateFilterBranches(filter, testRecord)).toBe(true);
  });

  test('evaluates AND branch - all conditions must match', () => {
    const filter = {
      filterBranchType: 'OR',
      filterBranches: [
        {
          filterBranchType: 'AND',
          filters: [
            { property: 'species', operator: 'equals', value: 'dog' },
            { property: 'weight', operator: 'greater_than', value: 30 },
          ],
        },
      ],
    };

    expect(evaluateFilterBranches(filter, testRecord)).toBe(true);

    // Change one condition to fail
    const failingFilter = {
      filterBranchType: 'OR',
      filterBranches: [
        {
          filterBranchType: 'AND',
          filters: [
            { property: 'species', operator: 'equals', value: 'dog' },
            { property: 'weight', operator: 'greater_than', value: 100 },
          ],
        },
      ],
    };

    expect(evaluateFilterBranches(failingFilter, testRecord)).toBe(false);
  });

  test('evaluates OR branches - any branch can match', () => {
    const filter = {
      filterBranchType: 'OR',
      filterBranches: [
        {
          filterBranchType: 'AND',
          filters: [
            { property: 'species', operator: 'equals', value: 'cat' },
          ],
        },
        {
          filterBranchType: 'AND',
          filters: [
            { property: 'species', operator: 'equals', value: 'dog' },
          ],
        },
      ],
    };

    expect(evaluateFilterBranches(filter, testRecord)).toBe(true);
  });

  test('handles empty filter branches', () => {
    const filter = {
      filterBranchType: 'OR',
      filterBranches: [],
    };

    expect(evaluateFilterBranches(filter, testRecord)).toBe(false);
  });

  test('handles root level filters without branches', () => {
    const filter = {
      filters: [
        { property: 'species', operator: 'equals', value: 'dog' },
      ],
    };

    expect(evaluateFilterBranches(filter, testRecord)).toBe(true);
  });
});

describe('Filter Evaluation - BarkBase Filter Format', () => {
  const testRecord = {
    name: 'Max',
    species: 'dog',
    weight: 50,
    vaccination_status: 'current',
    is_neutered: true,
    city: 'Austin',
  };

  test('evaluates simple group with AND logic', () => {
    const filter = {
      groups: [
        {
          logic: 'AND',
          conditions: [
            { field: 'species', operator: 'equals', value: 'dog' },
            { field: 'weight', operator: 'greater_than', value: 30 },
          ],
        },
      ],
      groupLogic: 'OR',
    };

    expect(evaluateBarkBaseFilters(filter, testRecord)).toBe(true);
  });

  test('evaluates group with OR logic', () => {
    const filter = {
      groups: [
        {
          logic: 'OR',
          conditions: [
            { field: 'species', operator: 'equals', value: 'cat' },
            { field: 'species', operator: 'equals', value: 'dog' },
          ],
        },
      ],
      groupLogic: 'OR',
    };

    expect(evaluateBarkBaseFilters(filter, testRecord)).toBe(true);
  });

  test('evaluates multiple groups with OR groupLogic', () => {
    const filter = {
      groups: [
        {
          logic: 'AND',
          conditions: [
            { field: 'species', operator: 'equals', value: 'cat' },
          ],
        },
        {
          logic: 'AND',
          conditions: [
            { field: 'species', operator: 'equals', value: 'dog' },
          ],
        },
      ],
      groupLogic: 'OR',
    };

    expect(evaluateBarkBaseFilters(filter, testRecord)).toBe(true);
  });

  test('evaluates multiple groups with AND groupLogic', () => {
    const filter = {
      groups: [
        {
          logic: 'AND',
          conditions: [
            { field: 'species', operator: 'equals', value: 'dog' },
          ],
        },
        {
          logic: 'AND',
          conditions: [
            { field: 'weight', operator: 'greater_than', value: 30 },
          ],
        },
      ],
      groupLogic: 'AND',
    };

    expect(evaluateBarkBaseFilters(filter, testRecord)).toBe(true);

    // Change one group to fail
    const failingFilter = {
      groups: [
        {
          logic: 'AND',
          conditions: [
            { field: 'species', operator: 'equals', value: 'dog' },
          ],
        },
        {
          logic: 'AND',
          conditions: [
            { field: 'weight', operator: 'greater_than', value: 100 },
          ],
        },
      ],
      groupLogic: 'AND',
    };

    expect(evaluateBarkBaseFilters(failingFilter, testRecord)).toBe(false);
  });

  test('handles empty group', () => {
    const filter = {
      groups: [
        {
          logic: 'AND',
          conditions: [],
        },
      ],
      groupLogic: 'OR',
    };

    expect(evaluateBarkBaseFilters(filter, testRecord)).toBe(false);
  });
});

describe('Filter Evaluation - Flat Conditions Format', () => {
  const testRecord = {
    name: 'Max',
    species: 'dog',
    weight: 50,
  };

  function evaluateFlatConditions(filters, record) {
    const logic = (filters.logic || 'AND').toUpperCase();
    const conditions = filters.conditions || [];

    if (conditions.length === 0) return false;

    const results = conditions.map(condition => {
      const actualValue = record[condition.field];
      return evaluateOperator(condition.operator, actualValue, condition.value, {
        highValue: condition.highValue,
        values: condition.values,
      });
    });

    if (logic === 'OR') {
      return results.some(r => r);
    }
    return results.every(r => r);
  }

  test('evaluates flat conditions with AND logic', () => {
    const filter = {
      conditions: [
        { field: 'species', operator: 'equals', value: 'dog' },
        { field: 'weight', operator: 'greater_than', value: 30 },
      ],
      logic: 'AND',
    };

    expect(evaluateFlatConditions(filter, testRecord)).toBe(true);
  });

  test('evaluates flat conditions with OR logic', () => {
    const filter = {
      conditions: [
        { field: 'species', operator: 'equals', value: 'cat' },
        { field: 'weight', operator: 'greater_than', value: 30 },
      ],
      logic: 'OR',
    };

    expect(evaluateFlatConditions(filter, testRecord)).toBe(true);
  });
});
