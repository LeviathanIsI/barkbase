/**
 * Formula Parser
 * Extracts property dependencies from formula expressions
 * Supports Salesforce-style formula syntax
 */

/**
 * Extract property names referenced in a formula
 * @param {string} formula - Formula expression
 * @returns {string[]} - Array of property names
 */
function extractDependencies(formula) {
  if (!formula || typeof formula !== 'string') {
    return [];
  }

  const dependencies = new Set();

  // Pattern 1: {PropertyName} syntax
  const bracePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let match;
  while ((match = bracePattern.exec(formula)) !== null) {
    dependencies.add(match[1]);
  }

  // Pattern 2: $PropertyName syntax
  const dollarPattern = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
  while ((match = dollarPattern.exec(formula)) !== null) {
    dependencies.add(match[1]);
  }

  // Pattern 3: PropertyName without delimiters (in function calls)
  // Match patterns like: SUM(fieldName), AVERAGE(fieldName), etc.
  const functionPattern = /\b(SUM|AVG|AVERAGE|MIN|MAX|COUNT|IF|CASE|VLOOKUP|CONCATENATE|TEXT|DATE|NOW|TODAY)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  while ((match = functionPattern.exec(formula)) !== null) {
    const propertyName = match[2];
    // Exclude function names themselves
    if (!['SUM', 'AVG', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'IF', 'CASE', 'VLOOKUP', 'CONCATENATE', 'TEXT', 'DATE', 'NOW', 'TODAY'].includes(propertyName.toUpperCase())) {
      dependencies.add(propertyName);
    }
  }

  // Pattern 4: Dot notation for related objects (e.g., Owner.firstName)
  const dotPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  while ((match = dotPattern.exec(formula)) !== null) {
    dependencies.add(match[1]); // Related object name
    dependencies.add(`${match[1]}.${match[2]}`); // Full path
  }

  return Array.from(dependencies);
}

/**
 * Validate formula syntax (basic validation)
 * @param {string} formula - Formula expression
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateFormula(formula) {
  const errors = [];

  if (!formula) {
    return { valid: true, errors: [] };
  }

  // Check balanced parentheses
  let depth = 0;
  for (const char of formula) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth < 0) {
      errors.push('Unbalanced parentheses: closing parenthesis without opening');
      break;
    }
  }
  if (depth > 0) {
    errors.push('Unbalanced parentheses: unclosed opening parenthesis');
  }

  // Check balanced braces
  depth = 0;
  for (const char of formula) {
    if (char === '{') depth++;
    if (char === '}') depth--;
    if (depth < 0) {
      errors.push('Unbalanced braces: closing brace without opening');
      break;
    }
  }
  if (depth > 0) {
    errors.push('Unbalanced braces: unclosed opening brace');
  }

  // Check for invalid characters
  const invalidChars = /[^\w\s\+\-\*\/\(\)\{\}\$\.,<>=!&|'"]/g;
  const invalidMatches = formula.match(invalidChars);
  if (invalidMatches) {
    errors.push(`Invalid characters found: ${[...new Set(invalidMatches)].join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Detect circular references in formulas
 * @param {string} propertyName - Name of the property being checked
 * @param {string} formula - Formula expression
 * @returns {boolean} - True if circular reference detected
 */
function detectCircularReference(propertyName, formula) {
  const dependencies = extractDependencies(formula);
  return dependencies.includes(propertyName);
}

/**
 * Get formula complexity score (0-100)
 * @param {string} formula - Formula expression
 * @returns {number} - Complexity score
 */
function getComplexityScore(formula) {
  if (!formula) return 0;

  let score = 0;

  // Base score for formula length
  score += Math.min(formula.length / 10, 20);

  // Score for nested parentheses
  let maxDepth = 0;
  let currentDepth = 0;
  for (const char of formula) {
    if (char === '(') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
    if (char === ')') currentDepth--;
  }
  score += maxDepth * 5;

  // Score for function calls
  const functionCount = (formula.match(/\b(SUM|AVG|AVERAGE|MIN|MAX|COUNT|IF|CASE|VLOOKUP|CONCATENATE|TEXT|DATE|NOW|TODAY)\s*\(/gi) || []).length;
  score += functionCount * 10;

  // Score for number of dependencies
  const dependencies = extractDependencies(formula);
  score += dependencies.length * 5;

  // Score for logical operators
  const logicalOperators = (formula.match(/&&|\|\||==|!=|>=|<=|>|</g) || []).length;
  score += logicalOperators * 3;

  return Math.min(score, 100);
}

module.exports = {
  extractDependencies,
  validateFormula,
  detectCircularReference,
  getComplexityScore,
};

