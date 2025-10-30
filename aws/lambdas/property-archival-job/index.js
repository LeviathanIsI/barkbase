/**
 * Property Archival Job
 * Scheduled Lambda that runs daily at 2 AM UTC
 * Moves properties deleted >90 days from soft delete to archive schema
 * Stage 1 (Soft Delete) → Stage 2 (Archive)
 */

const { getPool } = require('/opt/nodejs');

exports.handler = async (event) => {
  console.log('Property Archival Job started at:', new Date().toISOString());

  const pool = getPool();
  const results = {
    startTime: new Date().toISOString(),
    propertiesProcessed: 0,
    propertiesArchived: 0,
    propertiesFailed: 0,
    errors: [],
    tenantSummary: {},
  };

  try {
    // Get all properties eligible for archival (soft deleted >90 days ago)
    const eligibleResult = await pool.query(
      `SELECT 
        "property_id",
        "property_name",
        "display_label",
        "object_type",
        "property_type",
        "tenant_id",
        "deleted_at",
        "deleted_by",
        "deletion_reason",
        EXTRACT(EPOCH FROM (NOW() - "deleted_at"))/86400 AS "days_since_deletion"
      FROM "PropertyMetadata"
      WHERE "is_deleted" = true
        AND "deletion_stage" = 'soft_delete'
        AND "deleted_at" < NOW() - INTERVAL '90 days'
      ORDER BY "deleted_at" ASC`
    );

    const eligibleProperties = eligibleResult.rows;
    results.propertiesProcessed = eligibleProperties.length;

    console.log(`Found ${eligibleProperties.length} properties eligible for archival`);

    // Process each property
    for (const property of eligibleProperties) {
      try {
        console.log(`Archiving property: ${property.property_name} (${property.property_id}), deleted ${Math.floor(property.days_since_deletion)} days ago`);

        // Call the archive function
        await pool.query('SELECT move_property_to_archive($1)', [property.property_id]);

        results.propertiesArchived++;

        // Track by tenant
        const tenantId = property.tenant_id || 'global';
        if (!results.tenantSummary[tenantId]) {
          results.tenantSummary[tenantId] = { archived: 0, failed: 0 };
        }
        results.tenantSummary[tenantId].archived++;

        // Send notification to tenant admin (if not global)
        if (property.tenant_id) {
          await sendArchivalNotification(pool, property);
        }

      } catch (error) {
        console.error(`Failed to archive property ${property.property_id}:`, error);
        results.propertiesFailed++;
        results.errors.push({
          propertyId: property.property_id,
          propertyName: property.property_name,
          error: error.message,
        });

        const tenantId = property.tenant_id || 'global';
        if (!results.tenantSummary[tenantId]) {
          results.tenantSummary[tenantId] = { archived: 0, failed: 0 };
        }
        results.tenantSummary[tenantId].failed++;
      }
    }

    results.endTime = new Date().toISOString();
    results.durationSeconds = Math.round((new Date(results.endTime) - new Date(results.startTime)) / 1000);

    console.log('Property Archival Job completed:', JSON.stringify(results, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };

  } catch (error) {
    console.error('Fatal error in Property Archival Job:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        results,
      }),
    };
  }
};

/**
 * Send notification to tenant admin about archived property
 */
async function sendArchivalNotification(pool, property) {
  try {
    // Get tenant admin email
    const tenantResult = await pool.query(
      `SELECT t."name" AS tenant_name, u."email" AS admin_email
       FROM "Tenant" t
       INNER JOIN "Membership" m ON t."recordId" = m."tenantId"
       INNER JOIN "User" u ON m."userId" = u."recordId"
       WHERE t."recordId" = $1
         AND m."role" = 'OWNER'
       LIMIT 1`,
      [property.tenant_id]
    );

    if (tenantResult.rows.length === 0) {
      console.log(`No admin found for tenant ${property.tenant_id}`);
      return;
    }

    const { tenant_name, admin_email } = tenantResult.rows[0];

    // In a real implementation, this would send an email via SES or SNS
    // For now, we'll just log it
    console.log(`[NOTIFICATION] To: ${admin_email}`);
    console.log(`Subject: Property Archived - ${property.display_label}`);
    console.log(`Body: Property "${property.display_label}" (${property.property_name}) has been automatically archived after 90 days in soft delete state.`);
    console.log(`Restoration window: 7 years. To restore, go to Settings > Properties > Archived tab.`);

    // TODO: Integrate with actual notification system
    // await sendEmail({
    //   to: admin_email,
    //   subject: `Property Archived - ${property.display_label}`,
    //   body: `Property "${property.display_label}" has been archived...`,
    // });

  } catch (error) {
    console.error('Error sending archival notification:', error);
    // Don't fail the archival if notification fails
  }
}

/**
 * Get summary statistics for monitoring
 */
async function getArchivalStats(pool) {
  const stats = {};

  // Count soft deleted properties
  const softDeleteResult = await pool.query(
    `SELECT COUNT(*) AS count,
            MIN("deleted_at") AS oldest_deletion,
            MAX("deleted_at") AS newest_deletion
     FROM "PropertyMetadata"
     WHERE "is_deleted" = true AND "deletion_stage" = 'soft_delete'`
  );
  stats.softDelete = softDeleteResult.rows[0];

  // Count archived properties
  const archivedResult = await pool.query(
    `SELECT COUNT(*) AS count,
            MIN("archived_at") AS oldest_archive,
            MAX("archived_at") AS newest_archive
     FROM deleted_properties."PropertyMetadata"`
  );
  stats.archived = archivedResult.rows[0];

  // Count properties pending archival (>90 days deleted but not yet archived)
  const pendingResult = await pool.query(
    `SELECT COUNT(*) AS count
     FROM "PropertyMetadata"
     WHERE "is_deleted" = true
       AND "deletion_stage" = 'soft_delete'
       AND "deleted_at" < NOW() - INTERVAL '90 days'`
  );
  stats.pendingArchival = pendingResult.rows[0];

  return stats;
}

