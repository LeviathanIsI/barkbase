/**
 * Naming Convention Validator
 * Enforces property naming standards for system, standard, protected, and custom properties
 * Based on HubSpot/Salesforce naming patterns
 */

// Naming Convention Rules
const NAMING_RULES = {
  system: {
    prefix: 'sys_',
    pattern: /^sys_[a-z][a-z0-9_]*$/,
    example: 'sys_record_id, sys_created_at',
    description: 'System properties must start with sys_ and use lowercase_underscore',
  },
  standard: {
    pattern: /^[A-Z][a-zA-Z0-9]*$/,
    example: 'FirstName, DateOfBirth, StatusCode',
    description: 'Standard properties must use UpperCamelCase',
    semanticPrefixes: ['Date', 'DateTime', 'Status', 'Is', 'Has', 'Total', 'Count'],
  },
  protected: {
    pattern: /^[A-Z][a-zA-Z0-9]*$/,
    example: 'BalanceDueCents, DepositCents, TotalCents',
    description: 'Protected properties follow UpperCamelCase like standard properties',
  },
  custom: {
    prefix: 'custom_',
    suffixes: {
      date: '_d',
      datetime: '_dt',
      text: '_t',
      number: '_n',
      currency: '_c',
      boolean: '_b',
      single_select: '_ss',
      multi_select: '_ms',
      formula: '_f',
      rollup: '_ru',
    },
    pattern: /^custom_[a-z][a-z0-9_]*(_d|_dt|_t|_n|_c|_b|_ss|_ms|_f|_ru)$/,
    example: 'custom_favorite_color_ss, custom_birthday_d, custom_loyalty_points_n',
    description: 'Custom properties must start with custom_ and end with type suffix',
  },
};

// Reserved keywords that cannot be used
const RESERVED_KEYWORDS = [
  // SQL keywords
  'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter', 'table',
  'where', 'from', 'join', 'group', 'order', 'having', 'limit', 'offset',
  
  // JavaScript keywords
  'class', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'break', 'continue', 'try', 'catch', 'throw', 'new', 'this',
  
  // BarkBase system terms
  'tenant', 'user', 'admin', 'system', 'metadata', 'schema', 'migration',
];

/**
 * Validate property name based on property type
 * @param {string} propertyName - Property name to validate
 * @param {string} propertyType - Property type (system/standard/protected/custom)
 * @param {string} dataType - Data type (for custom properties suffix validation)
 * @returns {object} - Validation result
 */
function validate(propertyName, propertyType, dataType = null) {
  const result = {
    valid: false,
    errors: [],
    warnings: [],
    suggestions: [],
    metadata: {
      propertyName,
      propertyType,
      dataType,
    },
  };

  // Check if name is empty
  if (!propertyName || propertyName.trim().length === 0) {
    result.errors.push('Property name cannot be empty');
    return result;
  }

  // Check length
  if (propertyName.length < 2) {
    result.errors.push('Property name must be at least 2 characters');
  }

  if (propertyName.length > 100) {
    result.errors.push('Property name cannot exceed 100 characters');
  }

  // Check for reserved keywords
  const lowerName = propertyName.toLowerCase();
  if (RESERVED_KEYWORDS.includes(lowerName)) {
    result.errors.push(`"${propertyName}" is a reserved keyword and cannot be used`);
  }

  // Check for special characters (only alphanumeric and underscore allowed)
  if (!/^[a-zA-Z0-9_]+$/.test(propertyName)) {
    result.errors.push('Property name can only contain letters, numbers, and underscores');
  }

  // Type-specific validation
  const rules = NAMING_RULES[propertyType];
  if (!rules) {
    result.errors.push(`Unknown property type: ${propertyType}`);
    return result;
  }

  // Validate against pattern
  if (!rules.pattern.test(propertyName)) {
    result.errors.push(`Property name does not match ${propertyType} naming convention`);
    result.errors.push(`Expected pattern: ${rules.description}`);
    result.errors.push(`Example: ${rules.example}`);

    // Generate suggestions
    result.suggestions = generateSuggestions(propertyName, propertyType, dataType);
  }

  // Additional validation for custom properties
  if (propertyType === 'custom') {
    validateCustomPropertySuffix(propertyName, dataType, result);
  }

  // Additional validation for standard properties
  if (propertyType === 'standard') {
    validateStandardPropertySemantics(propertyName, result);
  }

  // If no errors, mark as valid
  result.valid = result.errors.length === 0;

  return result;
}

/**
 * Validate custom property suffix matches data type
 */
function validateCustomPropertySuffix(propertyName, dataType, result) {
  if (!dataType) {
    result.warnings.push('Data type not provided, cannot validate suffix');
    return;
  }

  const rules = NAMING_RULES.custom;
  const expectedSuffix = rules.suffixes[dataType];

  if (!expectedSuffix) {
    result.warnings.push(`No standard suffix defined for data type: ${dataType}`);
    return;
  }

  if (!propertyName.endsWith(expectedSuffix)) {
    result.errors.push(`Custom property with data type "${dataType}" should end with "${expectedSuffix}"`);
    result.suggestions.push(`${propertyName}${expectedSuffix}`);
  }
}

/**
 * Validate standard property semantic prefixes
 */
function validateStandardPropertySemantics(propertyName, result) {
  const rules = NAMING_RULES.standard;

  // Check if name starts with semantic prefix
  const hasSemanticPrefix = rules.semanticPrefixes.some(prefix =>
    propertyName.startsWith(prefix)
  );

  // Warn if boolean property doesn't start with Is/Has
  if (propertyName.match(/^(Active|Enabled|Verified|Approved|Completed)$/i)) {
    result.warnings.push(`Boolean properties should start with "Is" or "Has" (e.g., Is${propertyName})`);
    result.suggestions.push(`Is${propertyName}`);
  }

  // Warn if date property doesn't start with Date
  if (propertyName.match(/(Date|Day|Month|Year)$/i) && !propertyName.startsWith('Date')) {
    result.warnings.push(`Date properties should start with "Date" prefix`);
    result.suggestions.push(`Date${propertyName}`);
  }
}

/**
 * Generate name suggestions based on input and rules
 */
function generateSuggestions(propertyName, propertyType, dataType) {
  const suggestions = [];

  switch (propertyType) {
    case 'system':
      // Convert to sys_lowercase_underscore
      const sysName = 'sys_' + propertyName
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/_{2,}/g, '_')
        .replace(/^_/, '');
      suggestions.push(sysName);
      break;

    case 'standard':
    case 'protected':
      // Convert to UpperCamelCase
      const camelName = propertyName
        .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
        .replace(/^(.)/, (_, c) => c.toUpperCase());
      suggestions.push(camelName);
      break;

    case 'custom':
      // Convert to custom_lowercase_underscore with suffix
      const customBase = propertyName
        .replace(/^custom_/, '')
        .replace(/(_d|_dt|_t|_n|_c|_b|_ss|_ms|_f|_ru)$/, '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/_{2,}/g, '_')
        .replace(/^_/, '');

      const suffix = NAMING_RULES.custom.suffixes[dataType] || '';
      suggestions.push(`custom_${customBase}${suffix}`);
      break;
  }

  return suggestions;
}

/**
 * Check for naming collisions with existing properties
 * @param {string} propertyName - Property name to check
 * @param {string} objectType - Object type
 * @param {number} tenantId - Tenant ID
 * @param {object} pool - Database pool
 * @returns {object} - Collision check result
 */
async function checkCollision(propertyName, objectType, tenantId, pool) {
  const result = await pool.query(
    `SELECT "property_id", "property_name", "property_type", "is_deleted"
     FROM "PropertyMetadata"
     WHERE "property_name" = $1
       AND "object_type" = $2
       AND ("tenant_id" = $3 OR "is_global" = true)`,
    [propertyName, objectType, tenantId]
  );

  if (result.rows.length > 0) {
    const existing = result.rows[0];
    return {
      collision: true,
      existingProperty: existing,
      message: existing.is_deleted
        ? `Property name "${propertyName}" was previously used and is archived`
        : `Property name "${propertyName}" already exists`,
    };
  }

  return {
    collision: false,
    message: 'No naming collision',
  };
}

/**
 * Suggest property names based on description
 * @param {string} description - Property description
 * @param {string} propertyType - Property type
 * @param {string} dataType - Data type
 * @returns {string[]} - Array of suggested names
 */
function suggestNamesFromDescription(description, propertyType, dataType) {
  if (!description) return [];

  // Extract key words from description
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);

  // Remove common words
  const commonWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'are', 'was'];
  const keyWords = words.filter(word => !commonWords.includes(word));

  // Take top 3 words
  const topWords = keyWords.slice(0, 3);

  // Generate names
  const suggestions = [];

  if (topWords.length > 0) {
    const baseName = topWords.join('_');
    const nameVariants = generateSuggestions(baseName, propertyType, dataType);
    suggestions.push(...nameVariants);
  }

  return suggestions;
}

module.exports = {
  validate,
  checkCollision,
  generateSuggestions,
  suggestNamesFromDescription,
  NAMING_RULES,
  RESERVED_KEYWORDS,
};

