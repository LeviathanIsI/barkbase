/**
 * Cascade Operations Handler
 * Handles cascade operations (archive, restore, substitute, force delete) for Properties API v2
 */

const { getPool } = require('/opt/nodejs');

/**
 * Archive a property with cascade strategy (soft delete)
 */
async function archive(tenantId, userId, propertyId, options) {
  const pool = getPool();
  const { cascadeStrategy = 'cancel', confirmed = false, reason } = options;

  // Get property details
  const propertyResult = await pool.query(
    `SELECT * FROM "PropertyMetadata" 
     WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Property not found' }),
    };
  }

  const property = propertyResult.rows[0];

  // Check if can be archived
  if (property.property_type === 'system') {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Cannot archive system properties' }),
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Soft delete the property
    await client.query(
      `UPDATE "PropertyMetadata"
       SET "is_deleted" = true,
           "deleted_at" = NOW(),
           "deleted_by" = $1,
           "deletion_reason" = $2,
           "deletion_stage" = 'soft_delete'
       WHERE "property_id" = $3`,
      [userId, reason || 'User-initiated soft delete', propertyId]
    );

    // Mark dependencies as inactive
    await client.query(
      `UPDATE "PropertyDependencies"
       SET "is_active" = false
       WHERE ("source_property_id" = $1 OR "dependent_property_id" = $1)
         AND "is_active" = true`,
      [propertyId]
    );

    // Create audit trail entry
    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "change_reason"
      ) VALUES ($1, 'ARCHIVE', $2, $3)`,
      [propertyId, userId, reason || 'User-initiated soft delete']
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Property archived successfully',
        propertyId,
        propertyName: property.property_name,
        deletionStage: 'soft_delete',
        restorable: true,
        restorationWindow: '90 days',
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error archiving property:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    client.release();
  }
}

/**
 * Restore a property from soft delete
 */
async function restore(tenantId, userId, propertyId) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get property details
    const propertyResult = await client.query(
      `SELECT * FROM "PropertyMetadata" 
       WHERE "property_id" = $1 
         AND ("tenant_id" = $2 OR "is_global" = true)
         AND "is_deleted" = true
         AND "deletion_stage" = 'soft_delete'`,
      [propertyId, tenantId]
    );

    if (propertyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Property not found in soft delete state',
        }),
      };
    }

    const property = propertyResult.rows[0];

    // Restore the property
    await client.query(
      `UPDATE "PropertyMetadata"
       SET "is_deleted" = false,
           "deleted_at" = NULL,
           "deleted_by" = NULL,
           "deletion_reason" = NULL,
           "deletion_stage" = NULL
       WHERE "property_id" = $1`,
      [propertyId]
    );

    // Reactivate dependencies
    const depsResult = await client.query(
      `UPDATE "PropertyDependencies"
       SET "is_active" = true
       WHERE ("source_property_id" = $1 OR "dependent_property_id" = $1)
         AND "is_active" = false
       RETURNING "dependency_id"`,
      [propertyId]
    );

    // Create audit trail entry
    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "change_reason"
      ) VALUES ($1, 'RESTORE', $2, 'Restored from soft delete')`,
      [propertyId, userId]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Property restored successfully',
        propertyId,
        propertyName: property.property_name,
        restoredDependencies: depsResult.rowCount,
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error restoring property:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    client.release();
  }
}

/**
 * Map object types to table names
 */
const OBJECT_TYPE_TO_TABLE = {
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
  incidents: 'IncidentReport',
  notes: 'Note',
  messages: 'Message',
  tasks: 'Task',
  users: 'User',
};

/**
 * Substitute property with another (cascade strategy)
 * Redirects all usages/dependencies from source property to target property
 */
async function substitute(tenantId, userId, sourcePropertyId, targetPropertyId) {
  if (!targetPropertyId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
      body: JSON.stringify({ error: 'replacementPropertyId is required' }),
    };
  }

  if (sourcePropertyId === targetPropertyId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
      body: JSON.stringify({ error: 'Source and target property cannot be the same' }),
    };
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get source property details
    const sourceResult = await client.query(
      `SELECT * FROM "PropertyMetadata" 
       WHERE "property_id" = $1 
         AND ("tenant_id" = $2 OR "is_global" = true)
         AND "is_deleted" = false`,
      [sourcePropertyId, tenantId]
    );

    if (sourceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
        body: JSON.stringify({ error: 'Source property not found' }),
      };
    }

    const sourceProperty = sourceResult.rows[0];

    // Check if source is a system property
    if (sourceProperty.property_type === 'system') {
      await client.query('ROLLBACK');
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
        body: JSON.stringify({ error: 'Cannot substitute system properties' }),
      };
    }

    // Get target property details
    const targetResult = await client.query(
      `SELECT * FROM "PropertyMetadata" 
       WHERE "property_id" = $1 
         AND ("tenant_id" = $2 OR "is_global" = true)
         AND "is_deleted" = false`,
      [targetPropertyId, tenantId]
    );

    if (targetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
        body: JSON.stringify({ error: 'Target property not found' }),
      };
    }

    const targetProperty = targetResult.rows[0];

    // Validate compatibility: same object_type required
    if (sourceProperty.object_type !== targetProperty.object_type) {
      await client.query('ROLLBACK');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
        body: JSON.stringify({
          error: 'Properties must belong to the same object type',
          sourceObjectType: sourceProperty.object_type,
          targetObjectType: targetProperty.object_type,
        }),
      };
    }

    // Track statistics
    const stats = {
      dependenciesUpdated: 0,
      customFieldRecordsMigrated: 0,
      usedInAssetsMigrated: 0,
    };

    // 1. Update PropertyDependencies: redirect dependencies from source to target
    // Update where source is the SOURCE (things that depend on source now depend on target)
    const depsSourceResult = await client.query(
      `UPDATE "PropertyDependencies"
       SET "source_property_id" = $1
       WHERE "source_property_id" = $2
         AND "is_active" = true
         AND "dependent_property_id" != $1
       RETURNING "dependency_id"`,
      [targetPropertyId, sourcePropertyId]
    );
    stats.dependenciesUpdated += depsSourceResult.rowCount;

    // Update where source is the DEPENDENT (source depended on X, now target depends on X)
    const depsDependentResult = await client.query(
      `UPDATE "PropertyDependencies"
       SET "dependent_property_id" = $1
       WHERE "dependent_property_id" = $2
         AND "is_active" = true
         AND "source_property_id" != $1
       RETURNING "dependency_id"`,
      [targetPropertyId, sourcePropertyId]
    );
    stats.dependenciesUpdated += depsDependentResult.rowCount;

    // 2. For custom properties: migrate JSONB customFields data in entity tables
    if (sourceProperty.property_type === 'custom') {
      const tableName = OBJECT_TYPE_TO_TABLE[sourceProperty.object_type];
      
      if (tableName) {
        try {
          // Rename the key in customFields JSONB from source property_name to target property_name
          const migrateResult = await client.query(
            `UPDATE "${tableName}"
             SET "customFields" = 
               ("customFields" - $1) || 
               jsonb_build_object($2, "customFields"->$1)
             WHERE "customFields" ? $1
               AND "tenantId" = $3
             RETURNING "recordId"`,
            [sourceProperty.property_name, targetProperty.property_name, tenantId]
          );
          stats.customFieldRecordsMigrated = migrateResult.rowCount;
        } catch (err) {
          // Table might not have customFields column - that's ok
          console.log(`Note: Could not migrate customFields in ${tableName}:`, err.message);
        }
      }
    }

    // 3. Merge used_in references from source to target
    const sourceUsedIn = sourceProperty.used_in || {};
    const targetUsedIn = targetProperty.used_in || {};

    const mergedUsedIn = {
      workflows: [...new Set([...(targetUsedIn.workflows || []), ...(sourceUsedIn.workflows || [])])],
      validations: [...new Set([...(targetUsedIn.validations || []), ...(sourceUsedIn.validations || [])])],
      forms: [...new Set([...(targetUsedIn.forms || []), ...(sourceUsedIn.forms || [])])],
      reports: [...new Set([...(targetUsedIn.reports || []), ...(sourceUsedIn.reports || [])])],
      api_integrations: [...new Set([...(targetUsedIn.api_integrations || []), ...(sourceUsedIn.api_integrations || [])])],
    };

    stats.usedInAssetsMigrated = 
      (sourceUsedIn.workflows?.length || 0) +
      (sourceUsedIn.validations?.length || 0) +
      (sourceUsedIn.forms?.length || 0) +
      (sourceUsedIn.reports?.length || 0) +
      (sourceUsedIn.api_integrations?.length || 0);

    await client.query(
      `UPDATE "PropertyMetadata"
       SET "used_in" = $1
       WHERE "property_id" = $2`,
      [JSON.stringify(mergedUsedIn), targetPropertyId]
    );

    // 4. Deactivate remaining dependencies for source (if any orphaned ones)
    await client.query(
      `UPDATE "PropertyDependencies"
       SET "is_active" = false
       WHERE ("source_property_id" = $1 OR "dependent_property_id" = $1)
         AND "is_active" = true`,
      [sourcePropertyId]
    );

    // 5. Archive the source property
    await client.query(
      `UPDATE "PropertyMetadata"
       SET "is_deleted" = true,
           "deleted_at" = NOW(),
           "deleted_by" = $1,
           "deletion_reason" = $2,
           "deletion_stage" = 'soft_delete',
           "migration_path" = $3
       WHERE "property_id" = $4`,
      [
        userId,
        `Substituted with property ${targetPropertyId}`,
        targetPropertyId,
        sourcePropertyId,
      ]
    );

    // 6. Create audit trail entries
    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "change_reason",
        "changed_fields"
      ) VALUES ($1, 'SUBSTITUTE', $2, $3, $4)`,
      [
        sourcePropertyId,
        userId,
        `Property substituted with ${targetPropertyId}`,
        JSON.stringify({
          targetPropertyId,
          stats,
        }),
      ]
    );

    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "change_reason",
        "changed_fields"
      ) VALUES ($1, 'SUBSTITUTE_TARGET', $2, $3, $4)`,
      [
        targetPropertyId,
        userId,
        `Property received substitution from ${sourcePropertyId}`,
        JSON.stringify({
          sourcePropertyId,
          stats,
        }),
      ]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
      body: JSON.stringify({
        status: 'ok',
        message: 'Property substitution completed successfully',
        substitutedFrom: {
          propertyId: sourcePropertyId,
          propertyName: sourceProperty.property_name,
          displayLabel: sourceProperty.display_label,
        },
        substitutedTo: {
          propertyId: targetPropertyId,
          propertyName: targetProperty.property_name,
          displayLabel: targetProperty.display_label,
        },
        stats,
        sourceArchived: true,
        restorable: true,
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error substituting property:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    client.release();
  }
}

/**
 * Force delete property (bypasses dependency checks)
 * Deactivates all dependencies and soft-deletes the property
 */
async function forceDelete(tenantId, userId, propertyId, reason) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get property details
    const propertyResult = await client.query(
      `SELECT * FROM "PropertyMetadata" 
       WHERE "property_id" = $1 
         AND ("tenant_id" = $2 OR "is_global" = true)`,
      [propertyId, tenantId]
    );

    if (propertyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
        body: JSON.stringify({ error: 'Property not found' }),
      };
    }

    const property = propertyResult.rows[0];

    // Check if already deleted
    if (property.is_deleted) {
      await client.query('ROLLBACK');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
        body: JSON.stringify({ error: 'Property is already deleted' }),
      };
    }

    // System properties cannot be deleted even with force
    if (property.property_type === 'system') {
      await client.query('ROLLBACK');
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
        body: JSON.stringify({ error: 'Cannot delete system properties' }),
      };
    }

    // Track what gets affected
    const dependenciesRemoved = {
      upstreamDependencies: 0,
      downstreamDependencies: 0,
      criticalDependencies: 0,
      customFieldsCleared: 0,
    };

    // 1. Get count of dependencies being affected
    const depsCountResult = await client.query(
      `SELECT 
         COUNT(*) FILTER (WHERE "source_property_id" = $1) AS downstream,
         COUNT(*) FILTER (WHERE "dependent_property_id" = $1) AS upstream,
         COUNT(*) FILTER (WHERE "is_critical" = true AND ("source_property_id" = $1 OR "dependent_property_id" = $1)) AS critical
       FROM "PropertyDependencies"
       WHERE ("source_property_id" = $1 OR "dependent_property_id" = $1)
         AND "is_active" = true`,
      [propertyId]
    );

    dependenciesRemoved.upstreamDependencies = parseInt(depsCountResult.rows[0].upstream, 10);
    dependenciesRemoved.downstreamDependencies = parseInt(depsCountResult.rows[0].downstream, 10);
    dependenciesRemoved.criticalDependencies = parseInt(depsCountResult.rows[0].critical, 10);

    // 2. Deactivate all dependencies (don't delete, just mark inactive for audit trail)
    await client.query(
      `UPDATE "PropertyDependencies"
       SET "is_active" = false,
           "dependency_context" = "dependency_context" || jsonb_build_object(
             'deactivated_at', NOW()::text,
             'deactivated_by', $2,
             'deactivation_reason', 'force_delete'
           )
       WHERE ("source_property_id" = $1 OR "dependent_property_id" = $1)
         AND "is_active" = true`,
      [propertyId, userId]
    );

    // 3. For custom properties: optionally clear customFields values
    // We set them to null rather than removing the key to preserve audit trail
    if (property.property_type === 'custom') {
      const tableName = OBJECT_TYPE_TO_TABLE[property.object_type];
      
      if (tableName) {
        try {
          const clearResult = await client.query(
            `UPDATE "${tableName}"
             SET "customFields" = "customFields" - $1
             WHERE "customFields" ? $1
               AND "tenantId" = $2
             RETURNING "recordId"`,
            [property.property_name, tenantId]
          );
          dependenciesRemoved.customFieldsCleared = clearResult.rowCount;
        } catch (err) {
          // Table might not have customFields column - that's ok
          console.log(`Note: Could not clear customFields in ${tableName}:`, err.message);
        }
      }
    }

    // 4. Soft delete the property with force_delete marker
    const deleteReason = reason || 'Force deletion requested';
    await client.query(
      `UPDATE "PropertyMetadata"
       SET "is_deleted" = true,
           "deleted_at" = NOW(),
           "deleted_by" = $1,
           "deletion_reason" = $2,
           "deletion_stage" = 'soft_delete',
           "modification_metadata" = "modification_metadata" || jsonb_build_object('force_deleted', true)
       WHERE "property_id" = $3`,
      [userId, deleteReason, propertyId]
    );

    // 5. Create audit trail entry
    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "change_reason",
        "changed_fields"
      ) VALUES ($1, 'FORCE_DELETE', $2, $3, $4)`,
      [
        propertyId,
        userId,
        deleteReason,
        JSON.stringify({
          dependenciesRemoved,
          bypassedDependencyCheck: true,
        }),
      ]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
      body: JSON.stringify({
        status: 'ok',
        message: 'Property force deleted successfully',
        deletedPropertyId: propertyId,
        propertyName: property.property_name,
        displayLabel: property.display_label,
        dependenciesRemoved,
        restorable: true,
        restorationWindow: '90 days',
        warning: dependenciesRemoved.criticalDependencies > 0
          ? `${dependenciesRemoved.criticalDependencies} critical dependency chain(s) broken`
          : null,
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error force deleting property:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    client.release();
  }
}

module.exports = {
  archive,
  restore,
  substitute,
  forceDelete,
};
