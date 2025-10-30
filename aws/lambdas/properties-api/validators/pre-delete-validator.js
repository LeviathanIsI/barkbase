/**
 * Pre-Delete Validator
 * Comprehensive validation before property deletion/archival
 * Implements multi-step confirmation for high-risk operations
 */

const { getPool } = require('/opt/nodejs');

/**
 * Validate if property can be deleted/archived
 * @param {string} propertyId - Property ID
 * @param {number} tenantId - Tenant ID
 * @param {string} operation - 'archive' or 'delete'
 * @returns {object} - Validation result
 */
async function validate(propertyId, tenantId, operation = 'archive') {
  const pool = getPool();
  const validationResult = {
    canProceed: true,
    blockers: [],
    warnings: [],
    requiresConfirmation: false,
    confirmationSteps: [],
    metadata: {},
  };

  // Get property details
  const propertyResult = await pool.query(
    `SELECT * FROM "PropertyMetadata" 
     WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    validationResult.canProceed = false;
    validationResult.blockers.push('Property not found');
    return validationResult;
  }

  const property = propertyResult.rows[0];
  validationResult.metadata.property = {
    id: property.property_id,
    name: property.property_name,
    label: property.display_label,
    type: property.property_type,
    objectType: property.object_type,
  };

  // Validation 1: Check property type
  const propertyTypeCheck = await validatePropertyType(property, operation);
  if (!propertyTypeCheck.passed) {
    validationResult.canProceed = false;
    validationResult.blockers.push(...propertyTypeCheck.blockers);
  }

  // Validation 2: Check modification metadata
  const modificationCheck = await validateModificationMetadata(property, operation);
  if (!modificationCheck.passed) {
    validationResult.canProceed = false;
    validationResult.blockers.push(...modificationCheck.blockers);
  }

  // Validation 3: Check active dependencies
  const dependencyCheck = await validateDependencies(pool, propertyId);
  validationResult.metadata.dependencies = dependencyCheck.metadata;
  if (dependencyCheck.hasCritical) {
    validationResult.warnings.push(`${dependencyCheck.criticalCount} critical dependencies will break if deleted`);
    validationResult.requiresConfirmation = true;
    validationResult.confirmationSteps.push({
      step: 1,
      title: 'Resolve Critical Dependencies',
      description: `This property has ${dependencyCheck.criticalCount} critical dependencies that will break.`,
      action: 'Review dependency graph and select cascade strategy',
      required: true,
    });
  }
  if (dependencyCheck.totalCount > 0) {
    validationResult.warnings.push(`${dependencyCheck.totalCount} total dependencies exist`);
  }

  // Validation 4: Check record count with values
  const dataCheck = await validateDataPopulation(pool, property);
  validationResult.metadata.recordsWithValues = dataCheck.count;
  if (dataCheck.count > 0) {
    validationResult.warnings.push(`${dataCheck.count.toLocaleString()} records have values for this property`);
    validationResult.requiresConfirmation = true;
    validationResult.confirmationSteps.push({
      step: 2,
      title: 'Data Loss Warning',
      description: `${dataCheck.count.toLocaleString()} records will lose this data.`,
      action: 'Export data before proceeding',
      required: false,
    });
  }

  // Validation 5: Check last modification date (prevent accidental deletion of recently modified)
  const recentModificationCheck = await validateRecentModification(property);
  if (recentModificationCheck.isRecent) {
    validationResult.warnings.push('Property was modified within the last 7 days');
    validationResult.requiresConfirmation = true;
    validationResult.confirmationSteps.push({
      step: 3,
      title: 'Recent Modification Warning',
      description: `Property was last modified ${recentModificationCheck.daysAgo} days ago.`,
      action: 'Confirm this deletion is intentional',
      required: true,
    });
  }

  // Validation 6: Check asset usage (workflows, forms, reports, APIs)
  const usageCheck = await validateAssetUsage(pool, property);
  validationResult.metadata.assetUsage = usageCheck.usage;
  if (usageCheck.totalUsage > 0) {
    validationResult.warnings.push(`Used in ${usageCheck.totalUsage} assets (workflows/forms/reports/APIs)`);
    validationResult.requiresConfirmation = true;
    validationResult.confirmationSteps.push({
      step: 4,
      title: 'Asset Usage Warning',
      description: `Property is used in ${usageCheck.totalUsage} assets.`,
      action: 'Review and update affected assets',
      required: true,
    });
  }

  // Validation 7: Check if property is required
  if (property.is_required) {
    validationResult.warnings.push('This is a required property');
    validationResult.requiresConfirmation = true;
  }

  // Validation 8: Check if property is used in unique constraints
  if (property.unique_constraint) {
    validationResult.warnings.push('This property has a unique constraint');
    validationResult.requiresConfirmation = true;
  }

  // Final confirmation step
  if (validationResult.requiresConfirmation) {
    validationResult.confirmationSteps.push({
      step: validationResult.confirmationSteps.length + 1,
      title: 'Final Confirmation',
      description: `Type "${property.property_name}" to confirm ${operation}`,
      action: `Enter property name to proceed`,
      required: true,
    });
  }

  return validationResult;
}

/**
 * Validate property type allows deletion
 */
async function validatePropertyType(property, operation) {
  const result = { passed: true, blockers: [] };

  // System properties cannot be deleted or archived
  if (property.property_type === 'system') {
    result.passed = false;
    result.blockers.push('System properties cannot be deleted or archived');
    return result;
  }

  // Protected properties require special approval for deletion (not just archival)
  if (property.property_type === 'protected' && operation === 'delete') {
    result.passed = false;
    result.blockers.push('Protected properties cannot be permanently deleted. Archive instead.');
    return result;
  }

  return result;
}

/**
 * Validate modification metadata allows operation
 */
async function validateModificationMetadata(property, operation) {
  const result = { passed: true, blockers: [] };

  const modMeta = property.modification_metadata || {};

  // Check if archivable
  if (modMeta.archivable === false) {
    result.passed = false;
    result.blockers.push('Property modification metadata does not allow archival');
    return result;
  }

  // Check if definition is read-only (shouldn't be able to delete structure)
  if (modMeta.readOnlyDefinition === true && operation === 'delete') {
    result.passed = false;
    result.blockers.push('Property definition is read-only and cannot be deleted');
    return result;
  }

  return result;
}

/**
 * Validate dependencies
 */
async function validateDependencies(pool, propertyId) {
  const result = await pool.query(
    `SELECT 
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE "is_critical" = true) AS critical_count
    FROM "PropertyDependencies"
    WHERE "source_property_id" = $1
      AND "is_active" = true`,
    [propertyId]
  );

  const row = result.rows[0];
  return {
    totalCount: parseInt(row.total_count, 10),
    criticalCount: parseInt(row.critical_count, 10),
    hasCritical: parseInt(row.critical_count, 10) > 0,
    metadata: {
      totalDependencies: parseInt(row.total_count, 10),
      criticalDependencies: parseInt(row.critical_count, 10),
    },
  };
}

/**
 * Validate data population
 */
async function validateDataPopulation(pool, property) {
  // Map object types to table names
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
    return { count: 0 };
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
      return { count: parseInt(result.rows[0].count, 10) };
    }

    // For system/standard properties, check actual column
    const columnCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = $2`,
      [tableName, property.property_name]
    );

    if (columnCheck.rows.length === 0) {
      return { count: 0 };
    }

    const result = await pool.query(
      `SELECT COUNT(*) AS count 
       FROM "${tableName}" 
       WHERE "${property.property_name}" IS NOT NULL
         AND ("tenantId" = $1 OR $1 IS NULL)`,
      [property.tenant_id]
    );
    return { count: parseInt(result.rows[0].count, 10) };
  } catch (error) {
    console.error('Error checking data population:', error);
    return { count: 0 };
  }
}

/**
 * Validate recent modification
 */
async function validateRecentModification(property) {
  const modifiedDate = property.modified_date || property.created_date;
  if (!modifiedDate) {
    return { isRecent: false };
  }

  const daysSinceModification = (Date.now() - new Date(modifiedDate).getTime()) / (1000 * 60 * 60 * 24);

  return {
    isRecent: daysSinceModification < 7,
    daysAgo: Math.floor(daysSinceModification),
  };
}

/**
 * Validate asset usage
 */
async function validateAssetUsage(pool, property) {
  // Get usage from PropertyMetadata.used_in
  const usedIn = property.used_in || {};

  const usage = {
    workflows: Array.isArray(usedIn.workflows) ? usedIn.workflows.length : 0,
    validations: Array.isArray(usedIn.validations) ? usedIn.validations.length : 0,
    forms: Array.isArray(usedIn.forms) ? usedIn.forms.length : 0,
    reports: Array.isArray(usedIn.reports) ? usedIn.reports.length : 0,
    apiIntegrations: Array.isArray(usedIn.api_integrations) ? usedIn.api_integrations.length : 0,
  };

  const totalUsage = Object.values(usage).reduce((sum, count) => sum + count, 0);

  return {
    usage,
    totalUsage,
  };
}

module.exports = {
  validate,
};

