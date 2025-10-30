/**
 * Cascade Operations Handler
 * Handles cascade operations (archive, restore, substitute, force delete) for Properties API v2
 */

const { getPool } = require('/opt/nodejs');
const { getTenantIdFromEvent } = require('/opt/nodejs');

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
 * Substitute property with another (cascade strategy)
 */
async function substitute(tenantId, userId, propertyId, replacementPropertyId) {
  if (!replacementPropertyId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
      body: JSON.stringify({ error: 'replacementPropertyId is required' }),
    };
  }

  // TODO: Implement full substitute logic
  // For now, just archive the original property
  return await archive(tenantId, userId, propertyId, {
    reason: `Substituted with property ${replacementPropertyId}`,
    confirmed: true,
  });
}

/**
 * Force delete property (with broken dependencies)
 */
async function forceDelete(tenantId, userId, propertyId, reason) {
  // TODO: Implement full force delete logic
  // For now, just soft delete
  return await archive(tenantId, userId, propertyId, {
    reason: reason || 'Force deletion requested',
    confirmed: true,
  });
}

module.exports = {
  archive,
  restore,
  substitute,
  forceDelete,
};

