/**
 * Restore Handler
 * Restores soft-deleted or archived properties
 * Instant restoration for soft delete, 24-hour SLA for archived
 */

const { getPool } = require('/opt/nodejs');

/**
 * Restore a soft-deleted property (instant)
 * @param {string} propertyId - Property ID
 * @param {number} tenantId - Tenant ID
 * @param {string} userId - User ID performing the restoration
 * @returns {object} - Operation result
 */
async function restoreSoftDeleted(propertyId, tenantId, userId) {
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
          hint: 'Property may already be restored or permanently deleted',
        }),
      };
    }

    const property = propertyResult.rows[0];

    // Check if deletion period has exceeded 90 days (should have been archived)
    const daysSinceDeletion = (Date.now() - new Date(property.deleted_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDeletion > 90) {
      await client.query('ROLLBACK');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Property is past 90-day soft delete window',
          message: 'This property should have been archived. Contact support for restoration from archive.',
        }),
      };
    }

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
       SET "is_active" = true,
           "dependency_context" = "dependency_context" - 'soft_deleted'
       WHERE ("source_property_id" = $1 OR "dependent_property_id" = $1)
         AND "is_active" = false
       RETURNING "dependency_id"`,
      [propertyId]
    );

    const restoredDependencies = depsResult.rowCount;

    // Create audit trail entry
    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "changed_date",
        "change_reason",
        "affected_records_count",
        "risk_level"
      ) VALUES ($1, 'RESTORE', $2, NOW(), 'Restored from soft delete', $3, 'low')`,
      [propertyId, userId, restoredDependencies]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Property restored successfully',
        propertyId,
        propertyName: property.property_name,
        displayLabel: property.display_label,
        restoredDependencies,
        deletedDaysAgo: Math.floor(daysSinceDeletion),
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in restore:', error);
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
 * Request restoration from archive (24-hour SLA)
 * @param {string} propertyId - Property ID
 * @param {number} tenantId - Tenant ID
 * @param {string} userId - User ID requesting restoration
 * @param {string} reason - Reason for restoration
 * @returns {object} - Operation result
 */
async function requestArchiveRestoration(propertyId, tenantId, userId, reason) {
  const pool = getPool();

  try {
    // Check if property exists in archive
    const propertyResult = await pool.query(
      `SELECT * FROM deleted_properties."PropertyMetadata" 
       WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
      [propertyId, tenantId]
    );

    if (propertyResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Property not found in archive',
        }),
      };
    }

    const property = propertyResult.rows[0];

    // Check if retention period has expired
    if (property.retention_until && new Date(property.retention_until) < new Date()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Property retention period has expired',
          message: 'This property has exceeded the 7-year retention period and may have been permanently deleted.',
        }),
      };
    }

    // Check if restoration already requested
    if (property.restoration_requested_at && !property.restoration_approved) {
      const hoursSinceRequest = (Date.now() - new Date(property.restoration_requested_at).getTime()) / (1000 * 60 * 60);
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Restoration already requested',
          requestedAt: property.restoration_requested_at,
          requestedBy: property.restoration_requested_by,
          hoursPending: Math.floor(hoursSinceRequest),
          sla: '24 hours',
        }),
      };
    }

    // Record restoration request
    await pool.query(
      `UPDATE deleted_properties."PropertyMetadata"
       SET "restoration_requested_at" = NOW(),
           "restoration_requested_by" = $1,
           "restoration_notes" = $2,
           "restoration_approved" = false
       WHERE "property_id" = $3`,
      [userId, reason, propertyId]
    );

    // Create audit trail entry
    await pool.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "changed_date",
        "change_reason",
        "requires_approval",
        "approval_status"
      ) VALUES ($1, 'APPROVAL_REQUEST', $2, NOW(), $3, true, 'pending')`,
      [propertyId, userId, `Archive restoration request: ${reason}`]
    );

    // TODO: Send notification to admin for approval

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Restoration request submitted successfully',
        propertyId,
        propertyName: property.property_name,
        displayLabel: property.display_label,
        sla: '24 hours',
        status: 'pending_approval',
      }),
    };
  } catch (error) {
    console.error('Error in archive restoration request:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
}

/**
 * Approve and execute archive restoration (admin only)
 * @param {string} propertyId - Property ID
 * @param {string} approverId - Admin user ID approving the restoration
 * @returns {object} - Operation result
 */
async function approveArchiveRestoration(propertyId, approverId) {
  const pool = getPool();

  try {
    // Execute the restore function
    const result = await pool.query(
      'SELECT restore_property_from_archive($1, $2)',
      [propertyId, approverId]
    );

    if (result.rows[0].restore_property_from_archive) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Property restored from archive successfully',
          propertyId,
        }),
      };
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Failed to restore property from archive',
        }),
      };
    }
  } catch (error) {
    console.error('Error approving archive restoration:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
}

module.exports = {
  restoreSoftDeleted,
  requestArchiveRestoration,
  approveArchiveRestoration,
};

