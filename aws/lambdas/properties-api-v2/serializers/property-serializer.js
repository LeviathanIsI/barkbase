/**
 * Property Serializer
 * Transforms PropertyMetadata database records into rich API response objects
 * Includes usage statistics, dependencies, permissions, and metadata
 */

const { getPool } = require('/opt/nodejs');

/**
 * Serialize a property with rich metadata
 * @param {object} property - Raw property record from database
 * @param {object} options - Serialization options
 * @returns {object} - Serialized property object
 */
async function serialize(property, options = {}) {
  const {
    includeUsage = false,
    includeDependencies = false,
    includeAuditTrail = false,
  } = options;

  const serialized = {
    // Core identification
    propertyId: property.property_id,
    propertyName: property.property_name,
    displayLabel: property.display_label,
    description: property.description,
    
    // Classification
    objectType: property.object_type,
    propertyType: property.property_type,
    propertyGroup: property.property_group,
    
    // Flags
    isSystem: property.is_system,
    isRequired: property.is_required,
    isProtected: property.is_protected,
    isDeleted: property.is_deleted,
    isDeprecated: property.is_deprecated,
    
    // Data type configuration
    dataType: property.data_type,
    fieldType: property.field_type,
    maxLength: property.max_length,
    decimalPlaces: property.decimal_places,
    defaultValue: property.default_value,
    
    // Schema versioning
    schemaVersion: property.schema_version,
    deprecatedInVersion: property.deprecated_in_version,
    migrationPath: property.migration_path,
    
    // Modification metadata (HubSpot pattern)
    modificationMetadata: property.modification_metadata,
    
    // Query capabilities
    queryCapabilities: {
      isSearchable: property.is_searchable,
      isFilterable: property.is_filterable,
      isSortable: property.is_sortable,
      massUpdateEnabled: property.mass_update_enabled,
    },
    
    // Enumeration options (for select fields)
    enumOptions: property.enum_options,
    optionsAreMutable: property.options_are_mutable,
    
    // Validation
    validationRules: property.validation_rules,
    uniqueConstraint: property.unique_constraint,
    
    // Permission profiles (FLS)
    permissionProfiles: property.permission_profiles,
    
    // Calculated field configuration
    isCalculated: property.is_calculated,
    calculationFormula: property.calculation_formula,
    formulaDependencies: property.formula_dependencies,
    
    // Rollup configuration
    isRollup: property.is_rollup,
    rollupConfig: property.rollup_config,
    
    // Display
    displayOrder: property.display_order,
    helpText: property.help_text,
    placeholderText: property.placeholder_text,
    
    // Multi-tenancy
    tenantId: property.tenant_id,
    isGlobal: property.is_global,
    
    // Timestamps
    createdDate: property.created_date,
    createdBy: property.created_by,
    modifiedDate: property.modified_date,
    modifiedBy: property.modified_by,
    
    // Deletion info (if deleted)
    deletedAt: property.deleted_at,
    deletedBy: property.deleted_by,
    deletionReason: property.deletion_reason,
    deletionStage: property.deletion_stage,
  };

  // Add usage statistics if requested
  if (includeUsage) {
    serialized.usage = await getUsageStatistics(property);
  }

  // Add dependencies if requested
  if (includeDependencies) {
    serialized.dependencies = await getDependencies(property);
  }

  // Add audit trail if requested
  if (includeAuditTrail) {
    serialized.auditTrail = await getAuditTrail(property);
  }

  return serialized;
}

/**
 * Get usage statistics for a property
 */
async function getUsageStatistics(property) {
  const pool = getPool();

  // Get record count with values
  const recordCount = await getRecordCount(pool, property);

  // Get fill rate
  const totalRecords = await getTotalRecordCount(pool, property);
  const fillRate = totalRecords > 0 ? ((recordCount / totalRecords) * 100).toFixed(1) : 0;

  // Parse used_in from property
  const usedIn = property.used_in || {};

  return {
    recordsWithValues: recordCount,
    totalRecords,
    fillRate: parseFloat(fillRate),
    usedInWorkflows: Array.isArray(usedIn.workflows) ? usedIn.workflows.length : 0,
    usedInValidations: Array.isArray(usedIn.validations) ? usedIn.validations.length : 0,
    usedInForms: Array.isArray(usedIn.forms) ? usedIn.forms.length : 0,
    usedInReports: Array.isArray(usedIn.reports) ? usedIn.reports.length : 0,
    usedInApiIntegrations: Array.isArray(usedIn.api_integrations) ? usedIn.api_integrations.length : 0,
  };
}

/**
 * Get dependencies for a property
 */
async function getDependencies(property) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT 
      pd.*,
      pm_source."property_name" AS source_property_name,
      pm_source."display_label" AS source_display_label,
      pm_dependent."property_name" AS dependent_property_name,
      pm_dependent."display_label" AS dependent_display_label
    FROM "PropertyDependencies" pd
    LEFT JOIN "PropertyMetadata" pm_source ON pd."source_property_id" = pm_source."property_id"
    LEFT JOIN "PropertyMetadata" pm_dependent ON pd."dependent_property_id" = pm_dependent."property_id"
    WHERE (pd."source_property_id" = $1 OR pd."dependent_property_id" = $1)
      AND pd."is_active" = true`,
    [property.property_id]
  );

  const upstream = [];
  const downstream = [];

  for (const dep of result.rows) {
    if (dep.dependent_property_id === property.property_id) {
      // This property depends on source
      upstream.push({
        propertyId: dep.source_property_id,
        propertyName: dep.source_property_name,
        displayLabel: dep.source_display_label,
        dependencyType: dep.dependency_type,
        isCritical: dep.is_critical,
      });
    } else {
      // Source depends on this property
      downstream.push({
        propertyId: dep.dependent_property_id,
        propertyName: dep.dependent_property_name,
        displayLabel: dep.dependent_display_label,
        dependencyType: dep.dependency_type,
        isCritical: dep.is_critical,
      });
    }
  }

  return {
    upstream,
    downstream,
    totalCount: upstream.length + downstream.length,
    criticalCount: result.rows.filter(r => r.is_critical).length,
  };
}

/**
 * Get audit trail for a property
 */
async function getAuditTrail(property) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT 
      "audit_id",
      "change_type",
      "changed_by",
      "changed_date",
      "change_reason",
      "affected_records_count",
      "risk_level"
    FROM "PropertyChangeAudit"
    WHERE "property_id" = $1
    ORDER BY "changed_date" DESC
    LIMIT 20`,
    [property.property_id]
  );

  return result.rows;
}

/**
 * Get record count with non-null values
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
  if (!tableName) return 0;

  try {
    if (property.property_type === 'custom') {
      const result = await pool.query(
        `SELECT COUNT(*) AS count 
         FROM "${tableName}" 
         WHERE "customFields"->>'${property.property_name}' IS NOT NULL
           AND ("tenantId" = $1 OR $1 IS NULL)`,
        [property.tenant_id]
      );
      return parseInt(result.rows[0].count, 10);
    } else {
      const result = await pool.query(
        `SELECT COUNT(*) AS count 
         FROM "${tableName}" 
         WHERE "${property.property_name}" IS NOT NULL
           AND ("tenantId" = $1 OR $1 IS NULL)`,
        [property.tenant_id]
      );
      return parseInt(result.rows[0].count, 10);
    }
  } catch (error) {
    console.error('Error counting records:', error);
    return 0;
  }
}

/**
 * Get total record count
 */
async function getTotalRecordCount(pool, property) {
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
  if (!tableName) return 0;

  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS count 
       FROM "${tableName}" 
       WHERE ("tenantId" = $1 OR $1 IS NULL)`,
      [property.tenant_id]
    );
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error counting total records:', error);
    return 0;
  }
}

module.exports = {
  serialize,
};

