/**
 * =============================================================================
 * BarkBase Workflow DLQ Processor Lambda
 * =============================================================================
 *
 * Processes messages from the workflow Dead Letter Queues (DLQ).
 * When a workflow step or trigger fails after max retries (3), it lands here.
 *
 * This Lambda:
 * 1. Logs failed message details for debugging
 * 2. Updates WorkflowExecution status to 'failed' with error details
 * 3. Increments workflow.failed_count counter
 * 4. Sends notification to tenant (if configured)
 * 5. Emits CloudWatch metrics for monitoring
 *
 * =============================================================================
 */

const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Import from layers (mounted at /opt/nodejs in Lambda)
let dbLayer;

try {
  dbLayer = require('/opt/nodejs/db');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
}

const { getPoolAsync, query } = dbLayer;

// AWS Region
const AWS_REGION = process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2';

// Initialize clients
const cloudwatch = new CloudWatchClient({ region: AWS_REGION });
const ses = new SESClient({ region: AWS_REGION });

// From email address (should be verified in SES)
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@barkbase.io';

/**
 * Main handler - processes DLQ messages
 */
exports.handler = async (event) => {
  console.log('[DLQ PROCESSOR] ========================================');
  console.log('[DLQ PROCESSOR] Processing DLQ messages');
  console.log('[DLQ PROCESSOR] Records count:', event.Records?.length || 0);
  console.log('[DLQ PROCESSOR] ========================================');

  await getPoolAsync();

  const results = {
    processed: 0,
    executionsMarkedFailed: 0,
    notificationsSent: 0,
    errors: [],
  };

  for (const record of event.Records || []) {
    try {
      await processDlqMessage(record, results);
      results.processed++;
    } catch (error) {
      console.error('[DLQ PROCESSOR] Error processing DLQ message:', error);
      results.errors.push({
        messageId: record.messageId,
        error: error.message,
      });
    }
  }

  // Emit CloudWatch metrics
  await emitMetrics(results);

  console.log('[DLQ PROCESSOR] ========================================');
  console.log('[DLQ PROCESSOR] RESULTS:', JSON.stringify(results, null, 2));
  console.log('[DLQ PROCESSOR] ========================================');

  // Don't return batchItemFailures - we've handled these permanently
  return { statusCode: 200, body: JSON.stringify(results) };
};

/**
 * Process a single DLQ message
 */
async function processDlqMessage(record, results) {
  console.log('[DLQ PROCESSOR] Processing message:', record.messageId);

  // Parse the original message
  let message;
  try {
    message = JSON.parse(record.body);
  } catch (parseError) {
    console.error('[DLQ PROCESSOR] Failed to parse message body:', record.body);
    throw new Error(`Invalid message format: ${parseError.message}`);
  }

  console.log('[DLQ PROCESSOR] Original message:', JSON.stringify(message, null, 2));

  // Extract key identifiers
  const {
    executionId,
    workflowId,
    tenantId,
    stepId,
    action,
    retryContext,
  } = message;

  // Determine message source from queue ARN
  const sourceQueueArn = record.eventSourceARN || '';
  const isStepQueue = sourceQueueArn.includes('workflow-steps');
  const isTriggerQueue = sourceQueueArn.includes('workflow-triggers');

  console.log('[DLQ PROCESSOR] Source queue:', isStepQueue ? 'steps' : isTriggerQueue ? 'triggers' : 'unknown');

  // Build error details from retry context and SQS attributes
  const errorDetails = {
    messageId: record.messageId,
    sourceQueue: isStepQueue ? 'workflow-steps' : isTriggerQueue ? 'workflow-triggers' : 'unknown',
    approximateReceiveCount: record.attributes?.ApproximateReceiveCount,
    sentTimestamp: record.attributes?.SentTimestamp,
    firstReceiveTimestamp: record.attributes?.ApproximateFirstReceiveTimestamp,
    lastError: retryContext?.lastError || 'Unknown error after max retries',
    retryAttempts: retryContext?.attemptNumber || parseInt(record.attributes?.ApproximateReceiveCount || '0', 10),
    stepId,
    action,
    failedAt: new Date().toISOString(),
  };

  // If we have an executionId, update the execution status
  if (executionId && tenantId) {
    await updateExecutionAsFailed(executionId, tenantId, workflowId, errorDetails, results);
  } else if (isTriggerQueue && message.eventType) {
    // This was a trigger message that failed - log but can't update execution (doesn't exist yet)
    console.log('[DLQ PROCESSOR] Trigger message failed before creating execution:', {
      eventType: message.eventType,
      recordId: message.recordId,
      tenantId: message.tenantId,
    });

    // Still increment workflow failed_count if we have workflowId
    if (workflowId && tenantId) {
      await incrementWorkflowFailedCount(workflowId, tenantId);
    }
  }

  // Send notification if tenant has configured it
  if (tenantId) {
    await sendFailureNotification(tenantId, executionId, workflowId, errorDetails, results);
  }
}

/**
 * Update WorkflowExecution status to 'failed'
 */
async function updateExecutionAsFailed(executionId, tenantId, workflowId, errorDetails, results) {
  console.log('[DLQ PROCESSOR] Marking execution as failed:', executionId);

  try {
    // Update the execution status
    const updateResult = await query(
      `UPDATE "WorkflowExecution"
       SET status = 'failed',
           completed_at = NOW(),
           error_details = $3
       WHERE id = $1 AND tenant_id = $2 AND status != 'failed'
       RETURNING id, workflow_id`,
      [executionId, tenantId, JSON.stringify(errorDetails)]
    );

    if (updateResult.rowCount > 0) {
      console.log('[DLQ PROCESSOR] Execution marked as failed:', executionId);
      results.executionsMarkedFailed++;

      // Use workflow_id from result if not provided
      const wfId = workflowId || updateResult.rows[0]?.workflow_id;

      if (wfId) {
        await incrementWorkflowFailedCount(wfId, tenantId);
      }
    } else {
      console.log('[DLQ PROCESSOR] Execution not found or already failed:', executionId);
    }
  } catch (error) {
    console.error('[DLQ PROCESSOR] Error updating execution:', error);
    throw error;
  }
}

/**
 * Increment workflow.failed_count
 */
async function incrementWorkflowFailedCount(workflowId, tenantId) {
  console.log('[DLQ PROCESSOR] Incrementing failed_count for workflow:', workflowId);

  try {
    await query(
      `UPDATE "Workflow"
       SET failed_count = COALESCE(failed_count, 0) + 1,
           active_count = GREATEST(COALESCE(active_count, 0) - 1, 0)
       WHERE id = $1 AND tenant_id = $2`,
      [workflowId, tenantId]
    );
    console.log('[DLQ PROCESSOR] Workflow failed_count incremented');
  } catch (error) {
    console.error('[DLQ PROCESSOR] Error incrementing failed_count:', error);
    // Don't throw - this is a secondary operation
  }
}

/**
 * Send failure notification to tenant if configured
 */
async function sendFailureNotification(tenantId, executionId, workflowId, errorDetails, results) {
  try {
    // Check if tenant has workflow failure notifications enabled
    const tenantResult = await query(
      `SELECT t.name, ts.workflow_failure_notifications, ts.workflow_failure_notification_emails
       FROM "Tenant" t
       LEFT JOIN "TenantSettings" ts ON t.id = ts.tenant_id
       WHERE t.id = $1`,
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      console.log('[DLQ PROCESSOR] Tenant not found:', tenantId);
      return;
    }

    const tenant = tenantResult.rows[0];

    // Check if notifications are enabled
    if (!tenant.workflow_failure_notifications) {
      console.log('[DLQ PROCESSOR] Workflow failure notifications not enabled for tenant');
      return;
    }

    // Get notification recipients (admin emails)
    const notifyEmails = tenant.workflow_failure_notification_emails || [];

    if (notifyEmails.length === 0) {
      // Fall back to tenant admin users
      const adminResult = await query(
        `SELECT email FROM "User"
         WHERE tenant_id = $1
         AND role IN ('owner', 'admin')
         AND deleted_at IS NULL
         LIMIT 5`,
        [tenantId]
      );
      notifyEmails.push(...adminResult.rows.map(r => r.email));
    }

    if (notifyEmails.length === 0) {
      console.log('[DLQ PROCESSOR] No notification recipients found');
      return;
    }

    // Get workflow name
    let workflowName = 'Unknown Workflow';
    if (workflowId) {
      const wfResult = await query(
        `SELECT name FROM "Workflow" WHERE id = $1`,
        [workflowId]
      );
      if (wfResult.rows.length > 0) {
        workflowName = wfResult.rows[0].name;
      }
    }

    // Send notification email
    const subject = `[BarkBase] Workflow Execution Failed: ${workflowName}`;
    const htmlBody = `
      <h2>Workflow Execution Failed</h2>
      <p>A workflow execution has failed after multiple retry attempts.</p>

      <h3>Details</h3>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Tenant</td>
          <td style="padding: 8px;">${tenant.name}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Workflow</td>
          <td style="padding: 8px;">${workflowName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Execution ID</td>
          <td style="padding: 8px;">${executionId || 'N/A'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Failed At</td>
          <td style="padding: 8px;">${errorDetails.failedAt}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Retry Attempts</td>
          <td style="padding: 8px;">${errorDetails.retryAttempts}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Last Error</td>
          <td style="padding: 8px; color: #d32f2f;">${errorDetails.lastError}</td>
        </tr>
      </table>

      <p style="margin-top: 20px;">
        <a href="${process.env.APP_URL || 'https://app.barkbase.io'}/workflows/${workflowId}/executions?status=failed"
           style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          View Failed Executions
        </a>
      </p>

      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        This notification was sent because workflow failure notifications are enabled for your tenant.
        You can disable these in Settings > Workflows > Notifications.
      </p>
    `;

    const textBody = `
Workflow Execution Failed

A workflow execution has failed after multiple retry attempts.

Tenant: ${tenant.name}
Workflow: ${workflowName}
Execution ID: ${executionId || 'N/A'}
Failed At: ${errorDetails.failedAt}
Retry Attempts: ${errorDetails.retryAttempts}
Last Error: ${errorDetails.lastError}

View failed executions at: ${process.env.APP_URL || 'https://app.barkbase.io'}/workflows/${workflowId}/executions?status=failed
    `;

    await ses.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: notifyEmails,
      },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: htmlBody },
          Text: { Data: textBody },
        },
      },
    }));

    console.log('[DLQ PROCESSOR] Notification sent to:', notifyEmails.join(', '));
    results.notificationsSent++;

  } catch (error) {
    console.error('[DLQ PROCESSOR] Error sending notification:', error);
    // Don't throw - notifications are best-effort
  }
}

/**
 * Emit CloudWatch metrics for monitoring
 */
async function emitMetrics(results) {
  try {
    const metrics = [
      {
        MetricName: 'DLQMessagesProcessed',
        Value: results.processed,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Service', Value: 'WorkflowDLQProcessor' },
        ],
      },
      {
        MetricName: 'ExecutionsMarkedFailed',
        Value: results.executionsMarkedFailed,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Service', Value: 'WorkflowDLQProcessor' },
        ],
      },
      {
        MetricName: 'FailureNotificationsSent',
        Value: results.notificationsSent,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Service', Value: 'WorkflowDLQProcessor' },
        ],
      },
      {
        MetricName: 'DLQProcessorErrors',
        Value: results.errors.length,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Service', Value: 'WorkflowDLQProcessor' },
        ],
      },
    ];

    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'BarkBase/Workflows',
      MetricData: metrics,
    }));

    console.log('[DLQ PROCESSOR] Emitted CloudWatch metrics');
  } catch (error) {
    console.error('[DLQ PROCESSOR] Error emitting metrics:', error);
  }
}
