/**
 * Type Conversion Validator
 * Validates and controls property type conversions
 * Implements strict no-conversion policy for populated properties
 */

const { getPool } = require('/opt/nodejs');

// Type conversion compatibility matrix
const CONVERSION_MATRIX = {
  // Safe conversions (low risk)
  safe: [
    { from: 'text', to: 'multiline_text' },
    { from: 'number', to: 'currency' },
    { from: 'currency', to: 'number' },
    { from: 'date', to: 'datetime' },
    { from: 'single_select', to: 'radio' },
    { from: 'radio', to: 'single_select' },
  ],
  
  // Caution conversions (medium risk, require confirmation)
  caution: [
    { from: 'multiline_text', to: 'text', warning: 'May truncate if max_length is set. Line breaks will be preserved.' },
    { from: 'checkbox', to: 'multi_select', warning: 'Data structure will change. Single true/false → array of selected values.' },
  ],
  
  // Blocked conversions (always forbidden)
  blocked: [
    { from: 'datetime', to: 'date', reason: 'Data loss: time component would be lost' },
    { from: 'multi_select', to: 'single_select', reason: 'Data loss: multiple values would be lost' },
    { from: 'multi_select', to: 'boolean', reason: 'Incompatible data structures' },
    { from: 'boolean', to: 'multi_select', reason: 'Incompatible data structures' },
    { from: 'formula', to: '*', reason: 'Formula logic would be lost' },
    { from: 'calculated', to: '*', reason: 'Calculated field logic would be lost' },
    { from: 'lookup', to: '*', reason: 'Relationship integrity would be broken' },
    { from: 'relationship', to: '*', reason: 'Relationship integrity would be broken' },
    { from: 'rollup', to: '*', reason: 'Rollup logic would be lost' },
    { from: '*', to: 'formula', reason: 'Cannot convert existing data to calculated field' },
    { from: '*', to: 'calculated', reason: 'Cannot convert existing data to calculated field' },
    { from: '*', to: 'lookup', reason: 'Lookup relationship must be configured, not converted' },
    { from: '*', to: 'relationship', reason: 'Relationship must be configured, not converted' },
  ],
};

/**
 * Validate if type conversion is allowed
 * @param {string} propertyId - Property ID
 * @param {number} tenantId - Tenant ID
 * @param {string} newDataType - Target data type
 * @returns {object} - Validation result
 */
async function validate(propertyId, tenantId, newDataType) {
  const pool = getPool();

  const result = {
    canConvert: false,
    riskLevel: null,
    reason: null,
    warnings: [],
    requiresConfirmation: false,
    suggestedApproach: null,
    metadata: {},
  };

  // Get property details
  const propertyResult = await pool.query(
    `SELECT * FROM "PropertyMetadata" 
     WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    result.reason = 'Property not found';
    return result;
  }

  const property = propertyResult.rows[0];
  const currentDataType = property.data_type;

  result.metadata.property = {
    id: property.property_id,
    name: property.property_name,
    currentType: currentDataType,
    targetType: newDataType,
  };

  // Check if types are the same
  if (currentDataType === newDataType) {
    result.reason = 'Target type is same as current type';
    return result;
  }

  // Check if conversion is blocked
  const blockedConversion = isConversionBlocked(currentDataType, newDataType);
  if (blockedConversion) {
    result.reason = blockedConversion.reason;
    result.riskLevel = 'blocked';
    result.metadata.alternativeApproach = 'Create a new property with the desired type and migrate data manually';
    return result;
  }

  // Check if property has data
  const recordCount = await getRecordCount(pool, property);
  result.metadata.recordCount = recordCount;

  if (recordCount > 0) {
    result.reason = `Property has ${recordCount.toLocaleString()} records with values`;
    result.riskLevel = 'high';
    result.suggestedApproach = 'export-clear-change-import';
    result.metadata.exportEndpoint = `/api/v2/properties/${propertyId}/export-data`;
    result.warnings.push('Type conversion requires clearing all existing data first');
    result.warnings.push('Follow Export-Clear-Change-Import pattern to preserve data');
    return result;
  }

  // Property is empty, check conversion compatibility
  const safeConversion = isSafeConversion(currentDataType, newDataType);
  if (safeConversion) {
    result.canConvert = true;
    result.riskLevel = 'safe';
    result.requiresConfirmation = false;
    result.metadata.conversionPath = `${currentDataType} → ${newDataType}`;
    return result;
  }

  const cautionConversion = isCautionConversion(currentDataType, newDataType);
  if (cautionConversion) {
    result.canConvert = true;
    result.riskLevel = 'caution';
    result.requiresConfirmation = true;
    result.warnings.push(cautionConversion.warning);
    result.metadata.conversionPath = `${currentDataType} → ${newDataType}`;
    return result;
  }

  // Unknown conversion (treat as blocked for safety)
  result.reason = 'Conversion type not explicitly defined in compatibility matrix';
  result.riskLevel = 'blocked';
  result.metadata.alternativeApproach = 'Create a new property with the desired type';
  return result;
}

/**
 * Check if conversion is blocked
 */
function isConversionBlocked(fromType, toType) {
  for (const blocked of CONVERSION_MATRIX.blocked) {
    if (blocked.from === fromType && (blocked.to === toType || blocked.to === '*')) {
      return blocked;
    }
    if (blocked.from === '*' && blocked.to === toType) {
      return blocked;
    }
  }
  return null;
}

/**
 * Check if conversion is safe
 */
function isSafeConversion(fromType, toType) {
  return CONVERSION_MATRIX.safe.some(
    conv => conv.from === fromType && conv.to === toType
  );
}

/**
 * Check if conversion requires caution
 */
function isCautionConversion(fromType, toType) {
  return CONVERSION_MATRIX.caution.find(
    conv => conv.from === fromType && conv.to === toType
  );
}

/**
 * Get count of records with values for this property
 */
async function getRecordCount(pool, property) {
  const tableMap = {
    pets: 'Pet',
    owners: 'Owner',
    bookings: 'Booking',
    payments: 'Payment',
    invoices: 'Invoice',
    staff: 'Staff',
    facilities: 'Facility',
    kennels: 'Kennel',
    runs: 'Run',
    services: 'Service',
    packages: 'Package',
    memberships: 'Membership',
    vaccinations: 'Vaccination',
    incidents: 'Incident',
    notes: 'Note',
    messages: 'Message',
    tasks: 'Task',
    users: 'User',
  };

  const tableName = tableMap[property.object_type];
  if (!tableName) {
    return 0;
  }

  try {
    // For custom properties, check JSONB column
    if (property.property_type === 'custom') {
      const result = await pool.query(
        `SELECT COUNT(*) AS count 
         FROM "${tableName}" 
         WHERE "customFields"->>'${property.property_name}' IS NOT NULL
           AND ("tenantId" = $1 OR $1 IS NULL)`,
        [property.tenant_id]
      );
      return parseInt(result.rows[0].count, 10);
    }

    // For system/standard properties, check actual column
    const columnCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = $2`,
      [tableName, property.property_name]
    );

    if (columnCheck.rows.length === 0) {
      return 0;
    }

    const result = await pool.query(
      `SELECT COUNT(*) AS count 
       FROM "${tableName}" 
       WHERE "${property.property_name}" IS NOT NULL
         AND ("tenantId" = $1 OR $1 IS NULL)`,
      [property.tenant_id]
    );
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error counting records:', error);
    return 0;
  }
}

/**
 * Get conversion warnings based on type change
 */
function getConversionWarnings(fromType, toType, property) {
  const warnings = [];

  // Warn about formulas that reference this property
  if (property.used_in && property.used_in.validations && property.used_in.validations.length > 0) {
    warnings.push(`${property.used_in.validations.length} validation rules reference this property and may need updates`);
  }

  // Warn about enum options changes
  if ((fromType === 'single_select' || fromType === 'multi_select') && 
      (toType !== 'single_select' && toType !== 'multi_select')) {
    warnings.push('Enum options will be lost after conversion');
  }

  // Warn about max_length changes
  if (fromType === 'multiline_text' && toType === 'text' && property.max_length) {
    warnings.push(`Text will be truncated to ${property.max_length} characters`);
  }

  return warnings;
}

module.exports = {
  validate,
  CONVERSION_MATRIX,
};

