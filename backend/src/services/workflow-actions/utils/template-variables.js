/**
 * Template Variable Utilities
 *
 * Handles replacement of {{variable}} placeholders in action content
 * with actual values from records.
 */

/**
 * Replace template variables in a string with values from a record
 * @param {string} template - The template string containing {{variables}}
 * @param {Object} record - The record containing values
 * @returns {string} - The processed string with variables replaced
 */
function replaceTemplateVariables(template, record) {
  if (!template || typeof template !== 'string') {
    return template;
  }

  // Match {{variable}} or {{object.property}} patterns
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = getNestedValue(record, trimmedPath);

    // Handle null/undefined - return empty string
    if (value === null || value === undefined) {
      return '';
    }

    // Handle dates
    if (value instanceof Date) {
      return formatDate(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Handle objects
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

/**
 * Get a nested value from an object using dot notation
 * @param {Object} obj - The object
 * @param {string} path - Dot-notation path like "owner.name"
 * @returns {*} The value at the path
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;

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

/**
 * Format a date for display
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Extract all variable names from a template
 * @param {string} template - The template string
 * @returns {string[]} - Array of variable names found
 */
function extractVariables(template) {
  if (!template || typeof template !== 'string') {
    return [];
  }

  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
  return matches.map(match => match.slice(2, -2).trim());
}

/**
 * Validate that all required variables exist in a record
 * @param {string} template - The template string
 * @param {Object} record - The record to check
 * @returns {Object} - { valid: boolean, missing: string[] }
 */
function validateVariables(template, record) {
  const variables = extractVariables(template);
  const missing = [];

  for (const variable of variables) {
    const value = getNestedValue(record, variable);
    if (value === null || value === undefined) {
      missing.push(variable);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

module.exports = {
  replaceTemplateVariables,
  getNestedValue,
  extractVariables,
  validateVariables,
  formatDate,
};
