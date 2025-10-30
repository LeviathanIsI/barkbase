/**
 * Validation Scanner
 * Extracts property dependencies from validation rules
 */

/**
 * Extract property dependencies from validation rules
 * @param {Array} validationRules - Array of validation rule objects
 * @returns {Array} - Array of { propertyName, rule } objects
 */
function extractDependencies(validationRules) {
  if (!Array.isArray(validationRules)) {
    return [];
  }

  const dependencies = [];

  for (const rule of validationRules) {
    if (!rule || typeof rule !== 'object') continue;

    // Type 1: Cross-field validation (e.g., endDate must be after startDate)
    if (rule.type === 'cross-field' && rule.compareField) {
      dependencies.push({
        propertyName: rule.compareField,
        rule: rule,
      });
    }

    // Type 2: Conditional validation (e.g., if status = 'confirmed', deposit is required)
    if (rule.type === 'conditional' && rule.condition) {
      const conditionDeps = extractFromCondition(rule.condition);
      for (const depName of conditionDeps) {
        dependencies.push({
          propertyName: depName,
          rule: rule,
        });
      }
    }

    // Type 3: Formula-based validation
    if (rule.type === 'formula' && rule.formula) {
      const formulaParser = require('./formula-parser');
      const formulaDeps = formulaParser.extractDependencies(rule.formula);
      for (const depName of formulaDeps) {
        dependencies.push({
          propertyName: depName,
          rule: rule,
        });
      }
    }

    // Type 4: Lookup validation (e.g., ownerId must exist in Owner table)
    if (rule.type === 'lookup' && rule.lookupField) {
      dependencies.push({
        propertyName: rule.lookupField,
        rule: rule,
      });
    }

    // Type 5: Custom validation with expression
    if (rule.expression) {
      const expressionDeps = extractFromExpression(rule.expression);
      for (const depName of expressionDeps) {
        dependencies.push({
          propertyName: depName,
          rule: rule,
        });
      }
    }
  }

  return dependencies;
}

/**
 * Extract property names from a condition object
 * @param {object} condition - Condition object
 * @returns {string[]} - Array of property names
 */
function extractFromCondition(condition) {
  if (!condition || typeof condition !== 'object') {
    return [];
  }

  const dependencies = new Set();

  // Handle field property
  if (condition.field) {
    dependencies.add(condition.field);
  }

  // Handle nested AND/OR conditions
  if (condition.and && Array.isArray(condition.and)) {
    for (const subCondition of condition.and) {
      const subDeps = extractFromCondition(subCondition);
      subDeps.forEach(dep => dependencies.add(dep));
    }
  }

  if (condition.or && Array.isArray(condition.or)) {
    for (const subCondition of condition.or) {
      const subDeps = extractFromCondition(subCondition);
      subDeps.forEach(dep => dependencies.add(dep));
    }
  }

  return Array.from(dependencies);
}

/**
 * Extract property names from an expression string
 * @param {string} expression - Expression string
 * @returns {string[]} - Array of property names
 */
function extractFromExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return [];
  }

  const formulaParser = require('./formula-parser');
  return formulaParser.extractDependencies(expression);
}

/**
 * Validate validation rules structure
 * @param {Array} validationRules - Array of validation rule objects
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateRules(validationRules) {
  const errors = [];

  if (!Array.isArray(validationRules)) {
    errors.push('Validation rules must be an array');
    return { valid: false, errors };
  }

  for (let i = 0; i < validationRules.length; i++) {
    const rule = validationRules[i];

    if (!rule.type) {
      errors.push(`Rule at index ${i} missing type`);
    }

    if (rule.type === 'cross-field' && !rule.compareField) {
      errors.push(`Cross-field rule at index ${i} missing compareField`);
    }

    if (rule.type === 'conditional' && !rule.condition) {
      errors.push(`Conditional rule at index ${i} missing condition`);
    }

    if (rule.type === 'formula' && !rule.formula) {
      errors.push(`Formula rule at index ${i} missing formula`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get validation rule complexity score
 * @param {Array} validationRules - Array of validation rule objects
 * @returns {number} - Complexity score (0-100)
 */
function getComplexityScore(validationRules) {
  if (!Array.isArray(validationRules) || validationRules.length === 0) {
    return 0;
  }

  let score = 0;

  // Base score for number of rules
  score += validationRules.length * 5;

  for (const rule of validationRules) {
    // Score for rule type
    if (rule.type === 'formula' || rule.type === 'conditional') {
      score += 10;
    } else if (rule.type === 'cross-field') {
      score += 5;
    } else {
      score += 2;
    }

    // Score for nested conditions
    if (rule.condition) {
      score += countNestedConditions(rule.condition) * 3;
    }

    // Score for formula complexity
    if (rule.formula) {
      const formulaParser = require('./formula-parser');
      score += formulaParser.getComplexityScore(rule.formula) / 10;
    }
  }

  return Math.min(score, 100);
}

/**
 * Count nested conditions in a condition object
 * @param {object} condition - Condition object
 * @returns {number} - Count of nested conditions
 */
function countNestedConditions(condition) {
  if (!condition || typeof condition !== 'object') {
    return 0;
  }

  let count = 1;

  if (condition.and && Array.isArray(condition.and)) {
    for (const subCondition of condition.and) {
      count += countNestedConditions(subCondition);
    }
  }

  if (condition.or && Array.isArray(condition.or)) {
    for (const subCondition of condition.or) {
      count += countNestedConditions(subCondition);
    }
  }

  return count;
}

module.exports = {
  extractDependencies,
  extractFromCondition,
  extractFromExpression,
  validateRules,
  getComplexityScore,
};

