/**
 * =============================================================================
 * BarkBase Workflow Cleanup Service Lambda
 * =============================================================================
 *
 * Scheduled Lambda for cleaning up old workflow data:
 * - WorkflowExecutionLog: 90 days retention (action logs)
 * - WorkflowExecution: 180 days retention (enrollment history)
 *
 * Retention periods can be customized per-tenant via settings.
 *
 * Triggered by EventBridge rule (daily at 2am UTC - off-peak hours)
 *
 * =============================================================================
 */

const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

// Import from layers (mounted at /opt/nodejs in Lambda)
let dbLayer;

try {
  dbLayer = require('/opt/nodejs/db');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
}

const { getPoolAsync, query } = dbLayer;

// CloudWatch client for metrics
const cloudwatch = new CloudWatchClient({
  region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
});

// Default retention periods (HubSpot-aligned)
const DEFAULT_LOG_RETENTION_DAYS = 90;      // Action logs
const DEFAULT_EXECUTION_RETENTION_DAYS = 180; // Enrollment history (6 months)

/**
 * Main handler
 */
exports.handler = async (event) => {
  console.log('[CLEANUP] Starting workflow data cleanup...');
  console.log('[CLEANUP] Event:', JSON.stringify(event, null, 2));

  const startTime = Date.now();
  const results = {
    tenants: [],
    totalLogsDeleted: 0,
    totalExecutionsDeleted: 0,
    errors: [],
  };

  try {
    // Initialize database connection
    await getPoolAsync();

    // Get all tenants with their retention settings from TenantSettings table
    const tenantsResult = await query(
      `SELECT t.record_id, t.name, ts.workflow_log_retention_days, ts.workflow_execution_retention_days
       FROM "Tenant" t
       LEFT JOIN "TenantSettings" ts ON t.id = ts.tenant_id
       WHERE t.deleted_at IS NULL`
    );

    console.log('[CLEANUP] Found', tenantsResult.rows.length, 'tenants');

    // Process each tenant
    for (const tenant of tenantsResult.rows) {
      try {
        const tenantResult = await cleanupTenantData(tenant);
        results.tenants.push(tenantResult);
        results.totalLogsDeleted += tenantResult.logsDeleted;
        results.totalExecutionsDeleted += tenantResult.executionsDeleted;
      } catch (error) {
        console.error('[CLEANUP] Error processing tenant:', tenant.id, error);
        results.errors.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          error: error.message,
        });
      }
    }

    // Emit CloudWatch metrics
    await emitCleanupMetrics(results);

    const duration = Date.now() - startTime;
    console.log('[CLEANUP] Completed in', duration, 'ms');
    console.log('[CLEANUP] Total logs deleted:', results.totalLogsDeleted);
    console.log('[CLEANUP] Total executions deleted:', results.totalExecutionsDeleted);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        duration,
        ...results,
      }),
    };
  } catch (error) {
    console.error('[CLEANUP] Fatal error:', error);

    // Emit error metric
    await emitErrorMetric(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        results,
      }),
    };
  }
};

/**
 * Clean up workflow data for a single tenant
 */
async function cleanupTenantData(tenant) {
  // Get tenant-specific retention periods or use defaults
  const logRetentionDays = tenant.workflow_log_retention_days || DEFAULT_LOG_RETENTION_DAYS;
  const executionRetentionDays = tenant.workflow_execution_retention_days || DEFAULT_EXECUTION_RETENTION_DAYS;

  console.log('[CLEANUP] Processing tenant:', tenant.name);
  console.log('[CLEANUP] Log retention:', logRetentionDays, 'days');
  console.log('[CLEANUP] Execution retention:', executionRetentionDays, 'days');

  // Delete old execution logs for this tenant
  // Join with WorkflowExecution to filter by tenant_id
  const logsResult = await query(
    `DELETE FROM "WorkflowExecutionLog" wel
     USING "WorkflowExecution" we
     WHERE wel.execution_id = we.id
       AND we.tenant_id = $1
       AND wel.started_at < NOW() - ($2 || ' days')::INTERVAL
     RETURNING wel.record_id`,
    [tenant.id, logRetentionDays]
  );

  const logsDeleted = logsResult.rowCount || 0;

  // Delete old completed/failed/cancelled executions for this tenant
  const executionsResult = await query(
    `DELETE FROM "WorkflowExecution"
     WHERE tenant_id = $1
       AND status IN ('completed', 'failed', 'cancelled')
       AND completed_at < NOW() - ($2 || ' days')::INTERVAL
     RETURNING id`,
    [tenant.id, executionRetentionDays]
  );

  const executionsDeleted = executionsResult.rowCount || 0;

  if (logsDeleted > 0 || executionsDeleted > 0) {
    console.log('[CLEANUP] Tenant', tenant.name, '- Logs deleted:', logsDeleted, ', Executions deleted:', executionsDeleted);
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    logRetentionDays,
    executionRetentionDays,
    logsDeleted,
    executionsDeleted,
  };
}

/**
 * Emit cleanup metrics to CloudWatch
 */
async function emitCleanupMetrics(results) {
  try {
    const metrics = [
      {
        MetricName: 'WorkflowLogsDeleted',
        Value: results.totalLogsDeleted,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Service', Value: 'WorkflowCleanup' },
        ],
      },
      {
        MetricName: 'WorkflowExecutionsDeleted',
        Value: results.totalExecutionsDeleted,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Service', Value: 'WorkflowCleanup' },
        ],
      },
      {
        MetricName: 'TenantsProcessed',
        Value: results.tenants.length,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Service', Value: 'WorkflowCleanup' },
        ],
      },
      {
        MetricName: 'CleanupErrors',
        Value: results.errors.length,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Service', Value: 'WorkflowCleanup' },
        ],
      },
    ];

    // Also emit per-tenant metrics for tenants with deletions
    for (const tenant of results.tenants) {
      if (tenant.logsDeleted > 0 || tenant.executionsDeleted > 0) {
        metrics.push({
          MetricName: 'TenantLogsDeleted',
          Value: tenant.logsDeleted,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Service', Value: 'WorkflowCleanup' },
            { Name: 'TenantId', Value: tenant.tenantId },
          ],
        });
        metrics.push({
          MetricName: 'TenantExecutionsDeleted',
          Value: tenant.executionsDeleted,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Service', Value: 'WorkflowCleanup' },
            { Name: 'TenantId', Value: tenant.tenantId },
          ],
        });
      }
    }

    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'BarkBase/Workflows',
      MetricData: metrics,
    }));

    console.log('[CLEANUP] Emitted', metrics.length, 'CloudWatch metrics');
  } catch (error) {
    console.error('[CLEANUP] Failed to emit CloudWatch metrics:', error);
  }
}

/**
 * Emit error metric to CloudWatch
 */
async function emitErrorMetric(error) {
  try {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'BarkBase/Workflows',
      MetricData: [
        {
          MetricName: 'CleanupFatalError',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Service', Value: 'WorkflowCleanup' },
            { Name: 'ErrorType', Value: error.name || 'Unknown' },
          ],
        },
      ],
    }));
  } catch (metricsError) {
    console.error('[CLEANUP] Failed to emit error metric:', metricsError);
  }
}

/**
 * Manual cleanup function (can be called directly for testing)
 */
exports.manualCleanup = async (tenantId, logRetentionDays, executionRetentionDays) => {
  await getPoolAsync();

  if (tenantId) {
    // Clean specific tenant
    const tenantResult = await query(
      `SELECT t.record_id, t.name, ts.workflow_log_retention_days, ts.workflow_execution_retention_days
       FROM "Tenant" t
       LEFT JOIN "TenantSettings" ts ON t.id = ts.tenant_id
       WHERE t.id = $1`,
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const tenant = tenantResult.rows[0];
    // Override with manual values if provided
    if (logRetentionDays) tenant.workflow_log_retention_days = logRetentionDays;
    if (executionRetentionDays) tenant.workflow_execution_retention_days = executionRetentionDays;

    return cleanupTenantData(tenant);
  }

  // Use database function for global cleanup
  const result = await query(
    `SELECT * FROM cleanup_workflow_data($1, $2)`,
    [logRetentionDays || DEFAULT_LOG_RETENTION_DAYS, executionRetentionDays || DEFAULT_EXECUTION_RETENTION_DAYS]
  );

  return result.rows[0];
};
