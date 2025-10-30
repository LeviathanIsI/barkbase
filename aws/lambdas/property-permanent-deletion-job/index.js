/**
 * Property Permanent Deletion Job
 * Scheduled Lambda that runs weekly on Sundays at 3 AM UTC
 * Permanently deletes properties archived >7 years ago
 * Stage 2 (Archive) → Stage 3 (Permanent Deletion)
 */

const { getPool } = require('/opt/nodejs');

exports.handler = async (event) => {
  console.log('Property Permanent Deletion Job started at:', new Date().toISOString());

  const pool = getPool();
  const results = {
    startTime: new Date().toISOString(),
    propertiesProcessed: 0,
    propertiesDeleted: 0,
    propertiesFailed: 0,
    errors: [],
    tenantSummary: {},
  };

  try {
    // Get all properties eligible for permanent deletion (archived >7 years ago)
    const eligibleResult = await pool.query(
      `SELECT 
        "property_id",
        "property_name",
        "display_label",
        "object_type",
        "property_type",
        "tenant_id",
        "archived_at",
        "retention_until",
        EXTRACT(EPOCH FROM (NOW() - "archived_at"))/86400 AS "days_since_archive"
      FROM deleted_properties."PropertyMetadata"
      WHERE "retention_until" < NOW()
      ORDER BY "archived_at" ASC`
    );

    const eligibleProperties = eligibleResult.rows;
    results.propertiesProcessed = eligibleProperties.length;

    console.log(`Found ${eligibleProperties.length} properties eligible for permanent deletion`);

    // Safety check: Don't delete more than 100 properties in one run
    if (eligibleProperties.length > 100) {
      console.warn(`WARNING: ${eligibleProperties.length} properties eligible for deletion. Limiting to 100 per run for safety.`);
      eligibleProperties.splice(100);
    }

    // Process each property
    for (const property of eligibleProperties) {
      try {
        console.log(`Permanently deleting property: ${property.property_name} (${property.property_id}), archived ${Math.floor(property.days_since_archive)} days ago`);

        // Call the permanent deletion function
        await pool.query('SELECT permanently_delete_archived_property($1)', [property.property_id]);

        results.propertiesDeleted++;

        // Track by tenant
        const tenantId = property.tenant_id || 'global';
        if (!results.tenantSummary[tenantId]) {
          results.tenantSummary[tenantId] = { deleted: 0, failed: 0 };
        }
        results.tenantSummary[tenantId].deleted++;

        // Log to CloudWatch for compliance
        console.log(`[COMPLIANCE] Property ${property.property_id} (${property.property_name}) permanently deleted after 7-year retention`);

      } catch (error) {
        console.error(`Failed to permanently delete property ${property.property_id}:`, error);
        results.propertiesFailed++;
        results.errors.push({
          propertyId: property.property_id,
          propertyName: property.property_name,
          error: error.message,
        });

        const tenantId = property.tenant_id || 'global';
        if (!results.tenantSummary[tenantId]) {
          results.tenantSummary[tenantId] = { deleted: 0, failed: 0 };
        }
        results.tenantSummary[tenantId].failed++;
      }
    }

    // Get retention statistics for monitoring
    const retentionStats = await getRetentionStats(pool);
    results.retentionStats = retentionStats;

    results.endTime = new Date().toISOString();
    results.durationSeconds = Math.round((new Date(results.endTime) - new Date(results.startTime)) / 1000);

    console.log('Property Permanent Deletion Job completed:', JSON.stringify(results, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };

  } catch (error) {
    console.error('Fatal error in Property Permanent Deletion Job:', error);
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
 * Get retention statistics for monitoring and compliance
 */
async function getRetentionStats(pool) {
  const stats = {};

  // Count archived properties by time to retention expiry
  const retentionBucketsResult = await pool.query(
    `SELECT 
      CASE
        WHEN "retention_until" < NOW() THEN 'expired'
        WHEN "retention_until" < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
        WHEN "retention_until" < NOW() + INTERVAL '1 year' THEN 'expiring_this_year'
        ELSE 'long_term'
      END AS retention_bucket,
      COUNT(*) AS count
    FROM deleted_properties."PropertyMetadata"
    GROUP BY retention_bucket
    ORDER BY 
      CASE retention_bucket
        WHEN 'expired' THEN 1
        WHEN 'expiring_soon' THEN 2
        WHEN 'expiring_this_year' THEN 3
        WHEN 'long_term' THEN 4
      END`
  );
  stats.retentionBuckets = retentionBucketsResult.rows;

  // Total archived properties
  const totalResult = await pool.query(
    `SELECT COUNT(*) AS total_archived
     FROM deleted_properties."PropertyMetadata"`
  );
  stats.totalArchived = parseInt(totalResult.rows[0].total_archived, 10);

  // Oldest archived property
  const oldestResult = await pool.query(
    `SELECT 
      "property_id",
      "property_name",
      "archived_at",
      "retention_until",
      EXTRACT(EPOCH FROM (NOW() - "archived_at"))/86400 AS "days_archived"
    FROM deleted_properties."PropertyMetadata"
    ORDER BY "archived_at" ASC
    LIMIT 1`
  );
  stats.oldestArchivedProperty = oldestResult.rows[0] || null;

  // Properties with pending restoration requests
  const pendingRestorationsResult = await pool.query(
    `SELECT COUNT(*) AS count
     FROM deleted_properties."PropertyMetadata"
     WHERE "restoration_requested_at" IS NOT NULL
       AND "restoration_approved" = false`
  );
  stats.pendingRestorations = parseInt(pendingRestorationsResult.rows[0].count, 10);

  // Disk space estimate (rough calculation)
  const sizeResult = await pool.query(
    `SELECT 
      pg_size_pretty(pg_total_relation_size('deleted_properties."PropertyMetadata"')) AS table_size,
      pg_size_pretty(pg_total_relation_size('deleted_properties."PropertyDependencies"')) AS dependencies_size
    `
  );
  stats.diskUsage = sizeResult.rows[0];

  return stats;
}

/**
 * Generate compliance report
 */
async function generateComplianceReport(pool) {
  const report = {
    reportDate: new Date().toISOString(),
    retentionPolicy: '7 years from archival date',
    propertyLifecycle: {
      stage1: 'Soft Delete (0-90 days) - Instant restoration',
      stage2: 'Archive (90 days - 7 years) - 24-hour restoration SLA',
      stage3: 'Permanent Deletion (>7 years) - Irreversible',
    },
  };

  // Count properties in each stage
  const lifecycleResult = await pool.query(
    `SELECT 
      'soft_delete' AS stage,
      COUNT(*) AS count,
      MIN("deleted_at") AS oldest,
      MAX("deleted_at") AS newest
    FROM "PropertyMetadata"
    WHERE "is_deleted" = true AND "deletion_stage" = 'soft_delete'
    
    UNION ALL
    
    SELECT 
      'archived' AS stage,
      COUNT(*) AS count,
      MIN("archived_at") AS oldest,
      MAX("archived_at") AS newest
    FROM deleted_properties."PropertyMetadata"`
  );

  report.lifecycleCounts = lifecycleResult.rows;

  // Deletion history (last 90 days)
  const deletionHistoryResult = await pool.query(
    `SELECT 
      DATE("changed_date") AS deletion_date,
      COUNT(*) AS properties_deleted
    FROM "PropertyChangeAudit"
    WHERE "change_type" = 'DELETE'
      AND "changed_date" > NOW() - INTERVAL '90 days'
    GROUP BY DATE("changed_date")
    ORDER BY deletion_date DESC
    LIMIT 90`
  );

  report.recentDeletions = deletionHistoryResult.rows;

  return report;
}

