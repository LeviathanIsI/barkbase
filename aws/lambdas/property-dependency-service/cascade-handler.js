/**
 * Cascade Strategy Handler
 * Executes cascade operations for property modifications
 * Implements four cascade strategies: Cancel, Cascade Archive, Substitute Property, Force Archive
 */

const { getPool } = require('/opt/nodejs');
const impactAnalyzer = require('./impact-analyzer');

/**
 * Execute cascade operation
 * @param {number} tenantId - Tenant ID
 * @param {string} userId - User ID performing the operation
 * @param {string} propertyId - Property ID
 * @param {string} operation - 'archive' or 'delete'
 * @param {string} strategy - 'cancel', 'cascade', 'substitute', 'force'
 * @param {object} options - Additional options (e.g., replacementPropertyId for substitute)
 * @returns {object} - Operation result
 */
async function execute(tenantId, userId, propertyId, operation, strategy, options = {}) {
  const pool = getPool();

  // Validate strategy
  const validStrategies = ['cancel', 'cascade', 'substitute', 'force'];
  if (!validStrategies.includes(strategy)) {
    throw new Error(`Invalid cascade strategy: ${strategy}`);
  }

  // Get impact analysis
  const impact = await impactAnalyzer.analyze(tenantId, propertyId, operation);

  // Execute based on strategy
  switch (strategy) {
    case 'cancel':
      return await handleCancel(impact);

    case 'cascade':
      return await handleCascade(pool, tenantId, userId, propertyId, operation, impact);

    case 'substitute':
      if (!options.replacementPropertyId) {
        throw new Error('Replacement property ID required for substitute strategy');
      }
      return await handleSubstitute(pool, tenantId, userId, propertyId, options.replacementPropertyId, operation, impact);

    case 'force':
      return await handleForce(pool, tenantId, userId, propertyId, operation, impact);

    default:
      throw new Error(`Unhandled cascade strategy: ${strategy}`);
  }
}

/**
 * Cancel strategy: Show dependencies and require manual fixing
 */
async function handleCancel(impact) {
  return {
    strategy: 'cancel',
    status: 'cancelled',
    message: 'Operation cancelled. Please resolve dependencies manually before proceeding.',
    impact,
  };
}

/**
 * Cascade strategy: Recursively archive/delete all dependent properties
 */
async function handleCascade(pool, tenantId, userId, propertyId, operation, impact) {
  const client = await pool.connect();
  const archivedProperties = [];
  const errors = [];

  try {
    await client.query('BEGIN');

    // Get all dependent properties in order (leaf nodes first)
    const dependentProperties = impact.affectedProperties
      .sort((a, b) => b.depth - a.depth); // Sort by depth descending

    // Archive/delete each dependent property
    for (const prop of dependentProperties) {
      try {
        if (operation === 'archive') {
          await archiveProperty(client, prop.propertyId, userId, 'Cascaded from parent property');
        } else if (operation === 'delete') {
          await deleteProperty(client, prop.propertyId, userId, 'Cascaded from parent property');
        }
        archivedProperties.push(prop);
      } catch (error) {
        errors.push({
          propertyId: prop.propertyId,
          propertyName: prop.propertyName,
          error: error.message,
        });
      }
    }

    // Finally, archive/delete the root property
    if (operation === 'archive') {
      await archiveProperty(client, propertyId, userId, 'User-initiated with cascade');
    } else if (operation === 'delete') {
      await deleteProperty(client, propertyId, userId, 'User-initiated with cascade');
    }

    await client.query('COMMIT');

    return {
      strategy: 'cascade',
      status: 'success',
      message: `Successfully ${operation}d property and ${archivedProperties.length} dependent properties`,
      archivedProperties,
      errors,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Substitute strategy: Replace with compatible property
 */
async function handleSubstitute(pool, tenantId, userId, propertyId, replacementPropertyId, operation, impact) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verify replacement property exists and is compatible
    const replacementResult = await client.query(
      `SELECT * FROM "PropertyMetadata" 
       WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
      [replacementPropertyId, tenantId]
    );

    if (replacementResult.rows.length === 0) {
      throw new Error('Replacement property not found');
    }

    const replacementProperty = replacementResult.rows[0];
    const originalProperty = await client.query(
      `SELECT * FROM "PropertyMetadata" WHERE "property_id" = $1`,
      [propertyId]
    );

    // Check type compatibility
    if (replacementProperty.data_type !== originalProperty.rows[0].data_type) {
      throw new Error(`Type mismatch: replacement property is ${replacementProperty.data_type}, original is ${originalProperty.rows[0].data_type}`);
    }

    // Update all dependencies to point to replacement property
    await client.query(
      `UPDATE "PropertyDependencies" 
       SET "source_property_id" = $1,
           "dependency_context" = jsonb_set(
             "dependency_context",
             '{substitution}',
             jsonb_build_object(
               'originalPropertyId', $2,
               'substitutedAt', NOW(),
               'substitutedBy', $3
             )
           )
       WHERE "source_property_id" = $2`,
      [replacementPropertyId, propertyId, userId]
    );

    // Update dependent properties to reference replacement
    await client.query(
      `UPDATE "PropertyDependencies" 
       SET "dependent_property_id" = $1,
           "dependency_context" = jsonb_set(
             "dependency_context",
             '{substitution}',
             jsonb_build_object(
               'originalPropertyId', $2,
               'substitutedAt', NOW(),
               'substitutedBy', $3
             )
           )
       WHERE "dependent_property_id" = $2`,
      [replacementPropertyId, propertyId, userId]
    );

    // Archive/delete the original property
    if (operation === 'archive') {
      await archiveProperty(client, propertyId, userId, `Substituted with ${replacementProperty.property_name}`);
    } else if (operation === 'delete') {
      await deleteProperty(client, propertyId, userId, `Substituted with ${replacementProperty.property_name}`);
    }

    await client.query('COMMIT');

    return {
      strategy: 'substitute',
      status: 'success',
      message: `Successfully substituted property with ${replacementProperty.display_label}`,
      originalPropertyId: propertyId,
      replacementPropertyId,
      replacementPropertyName: replacementProperty.property_name,
      affectedDependencies: impact.affectedProperties.length,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Force strategy: Archive with broken dependencies
 */
async function handleForce(pool, tenantId, userId, propertyId, operation, impact) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Mark all dependent properties as having broken dependencies
    for (const prop of impact.affectedProperties) {
      await client.query(
        `UPDATE "PropertyMetadata" 
         SET "modification_metadata" = jsonb_set(
           "modification_metadata",
           '{brokenDependencies}',
           to_jsonb(ARRAY[$1::text])
         )
         WHERE "property_id" = $2`,
        [propertyId, prop.propertyId]
      );

      // Mark dependencies as inactive
      await client.query(
        `UPDATE "PropertyDependencies" 
         SET "is_active" = false,
             "dependency_context" = jsonb_set(
               "dependency_context",
               '{broken}',
               jsonb_build_object(
                 'brokenAt', NOW(),
                 'brokenBy', $1,
                 'reason', 'Source property forcibly archived/deleted'
               )
             )
         WHERE ("source_property_id" = $2 OR "dependent_property_id" = $2)
           AND "is_active" = true`,
        [userId, propertyId]
      );
    }

    // Archive/delete the property
    if (operation === 'archive') {
      await archiveProperty(client, propertyId, userId, 'Force archived with broken dependencies');
    } else if (operation === 'delete') {
      await deleteProperty(client, propertyId, userId, 'Force deleted with broken dependencies');
    }

    await client.query('COMMIT');

    return {
      strategy: 'force',
      status: 'success',
      message: `Property ${operation}d. ${impact.affectedProperties.length} dependent properties marked with broken dependencies.`,
      brokenDependencies: impact.affectedProperties.length,
      warning: 'Dependent properties may not function correctly until dependencies are resolved.',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Archive a property (soft delete)
 */
async function archiveProperty(client, propertyId, userId, reason) {
  await client.query(
    `UPDATE "PropertyMetadata" 
     SET "is_deleted" = true,
         "deleted_at" = NOW(),
         "deleted_by" = $1,
         "deletion_reason" = $2,
         "deletion_stage" = 'soft_delete'
     WHERE "property_id" = $3`,
    [userId, reason, propertyId]
  );

  // Log to audit trail
  await client.query(
    `INSERT INTO "PropertyChangeAudit" 
     ("property_id", "change_type", "changed_by", "change_reason", "risk_level")
     VALUES ($1, 'ARCHIVE', $2, $3, 'medium')`,
    [propertyId, userId, reason]
  );
}

/**
 * Delete a property (hard delete - should only be used after archive period)
 */
async function deleteProperty(client, propertyId, userId, reason) {
  // Log to audit trail first (before deletion)
  await client.query(
    `INSERT INTO "PropertyChangeAudit" 
     ("property_id", "change_type", "changed_by", "change_reason", "risk_level")
     VALUES ($1, 'DELETE', $2, $3, 'high')`,
    [propertyId, userId, reason]
  );

  // Delete dependencies
  await client.query(
    `DELETE FROM "PropertyDependencies" 
     WHERE "source_property_id" = $1 OR "dependent_property_id" = $1`,
    [propertyId]
  );

  // Delete property
  await client.query(
    `DELETE FROM "PropertyMetadata" WHERE "property_id" = $1`,
    [propertyId]
  );
}

module.exports = {
  execute,
  handleCancel,
  handleCascade,
  handleSubstitute,
  handleForce,
};

