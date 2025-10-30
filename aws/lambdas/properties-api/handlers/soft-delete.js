/**
 * Soft Delete Handler
 * Implements Stage 1 deletion (0-90 days) with instant restoration capability
 */

const { getPool } = require('/opt/nodejs');
const preDeleteValidator = require('../validators/pre-delete-validator');

/**
 * Soft delete a property (mark as deleted, preserve data)
 * @param {string} propertyId - Property ID
 * @param {number} tenantId - Tenant ID
 * @param {string} userId - User ID performing the deletion
 * @param {object} options - Deletion options
 * @returns {object} - Operation result
 */
async function softDelete(propertyId, tenantId, userId, options = {}) {
  const pool = getPool();

  // Validate deletion
  const validation = await preDeleteValidator.validate(propertyId, tenantId, 'archive');

  if (!validation.canProceed) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Cannot delete property',
        blockers: validation.blockers,
        warnings: validation.warnings,
      }),
    };
  }

  // If confirmation required but not provided
  if (validation.requiresConfirmation && !options.confirmed) {
    return {
      statusCode: 409,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requiresConfirmation: true,
        confirmationSteps: validation.confirmationSteps,
        warnings: validation.warnings,
        metadata: validation.metadata,
      }),
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get property details for audit trail
    const propertyResult = await client.query(
      `SELECT * FROM "PropertyMetadata" WHERE "property_id" = $1`,
      [propertyId]
    );

    if (propertyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Property not found' }),
      };
    }

    const property = propertyResult.rows[0];

    // Store before-state for audit
    const beforeState = { ...property };

    // Soft delete the property
    await client.query(
      `UPDATE "PropertyMetadata"
       SET "is_deleted" = true,
           "deleted_at" = NOW(),
           "deleted_by" = $1,
           "deletion_reason" = $2,
           "deletion_stage" = 'soft_delete'
       WHERE "property_id" = $3`,
      [userId, options.reason || 'User-initiated soft delete', propertyId]
    );

    // Get after-state for audit
    const afterResult = await client.query(
      `SELECT * FROM "PropertyMetadata" WHERE "property_id" = $1`,
      [propertyId]
    );
    const afterState = afterResult.rows[0];

    // Mark dependencies as inactive (but don't delete them)
    await client.query(
      `UPDATE "PropertyDependencies"
       SET "is_active" = false,
           "dependency_context" = jsonb_set(
             "dependency_context",
             '{soft_deleted}',
             jsonb_build_object(
               'deletedAt', NOW(),
               'deletedBy', $1,
               'recoverable', true
             )
           )
       WHERE ("source_property_id" = $2 OR "dependent_property_id" = $2)
         AND "is_active" = true`,
      [userId, propertyId]
    );

    // Create audit trail entry
    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "before_value",
        "after_value",
        "changed_by",
        "changed_date",
        "change_reason",
        "affected_records_count",
        "risk_level",
        "is_rollback_available",
        "rollback_script"
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10)`,
      [
        propertyId,
        'ARCHIVE',
        JSON.stringify(beforeState),
        JSON.stringify(afterState),
        userId,
        options.reason || 'User-initiated soft delete',
        validation.metadata.recordsWithValues || 0,
        determineRiskLevel(validation),
        true,  // Rollback available (instant restoration)
        generateRestoreScript(property),
      ]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Property soft deleted successfully',
        propertyId,
        propertyName: property.property_name,
        deletionStage: 'soft_delete',
        restorable: true,
        restorationWindow: '90 days',
        autoArchivalDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in soft delete:', error);
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
 * Determine risk level based on validation result
 */
function determineRiskLevel(validation) {
  if (validation.blockers.length > 0) {
    return 'critical';
  }
  if (validation.metadata.dependencies && validation.metadata.dependencies.criticalDependencies > 0) {
    return 'high';
  }
  if (validation.warnings.length > 3) {
    return 'medium';
  }
  return 'low';
}

/**
 * Generate SQL script to restore property
 */
function generateRestoreScript(property) {
  return `UPDATE "PropertyMetadata" 
SET "is_deleted" = false,
    "deleted_at" = NULL,
    "deleted_by" = NULL,
    "deletion_reason" = NULL,
    "deletion_stage" = NULL
WHERE "property_id" = '${property.property_id}';

UPDATE "PropertyDependencies"
SET "is_active" = true
WHERE ("source_property_id" = '${property.property_id}' 
   OR "dependent_property_id" = '${property.property_id}')
  AND "is_active" = false;`;
}

module.exports = {
  softDelete,
};

