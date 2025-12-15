/**
 * =============================================================================
 * BarkBase Workflow Trigger Processor Lambda
 * =============================================================================
 *
 * Processes domain events from the workflow trigger queue and enrolls matching
 * records into active workflows. Called via SQS event source mapping.
 *
 * Event Flow:
 * 1. Service publishes event (booking.created, pet.vaccination_expiring, etc.)
 * 2. Event arrives in workflow trigger queue
 * 3. This Lambda finds matching active workflows
 * 4. Creates WorkflowExecution records for matching workflows
 * 5. Queues first step for execution via workflow step queue
 *
 * =============================================================================
 */

// Import from layers (mounted at /opt/nodejs in Lambda)
let dbLayer, sharedLayer;

try {
  dbLayer = require('/opt/nodejs/db');
  sharedLayer = require('/opt/nodejs/index');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
  sharedLayer = require('../../layers/shared-layer/nodejs/index');
}

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const { getPoolAsync, query } = dbLayer;
const { createResponse } = sharedLayer;

// Initialize SQS client
const sqs = new SQSClient({
  region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
});

// Queue URLs from environment
const STEP_QUEUE_URL = process.env.WORKFLOW_STEP_QUEUE_URL;

/**
 * Main handler for SQS trigger events
 */
exports.handler = async (event) => {
  console.log('[WorkflowTrigger] Processing', event.Records?.length || 0, 'messages');

  // Ensure database pool is initialized
  await getPoolAsync();

  const results = {
    processed: 0,
    enrolled: 0,
    skipped: 0,
    errors: [],
  };

  // Process each SQS record
  for (const record of event.Records || []) {
    try {
      const message = JSON.parse(record.body);
      const result = await processEvent(message);

      results.processed++;
      results.enrolled += result.enrolled || 0;
      results.skipped += result.skipped || 0;
    } catch (error) {
      console.error('[WorkflowTrigger] Error processing message:', error);
      results.errors.push({
        messageId: record.messageId,
        error: error.message,
      });
    }
  }

  console.log('[WorkflowTrigger] Results:', results);

  return {
    batchItemFailures: results.errors.map(e => ({
      itemIdentifier: e.messageId,
    })),
  };
};

/**
 * Process a single workflow trigger event
 */
async function processEvent(message) {
  const { eventType, recordId, recordType, tenantId, eventData, timestamp } = message;

  console.log('[WorkflowTrigger] Processing event:', {
    eventType,
    recordId,
    recordType,
    tenantId,
  });

  // Validate required fields
  if (!eventType || !recordId || !recordType || !tenantId) {
    console.warn('[WorkflowTrigger] Missing required fields in message');
    return { enrolled: 0, skipped: 1 };
  }

  // Find active workflows that match this event type and object type
  const matchingWorkflows = await findMatchingWorkflows(tenantId, recordType, eventType);

  if (matchingWorkflows.length === 0) {
    console.log('[WorkflowTrigger] No matching workflows found');
    return { enrolled: 0, skipped: 0 };
  }

  console.log('[WorkflowTrigger] Found', matchingWorkflows.length, 'matching workflows');

  let enrolled = 0;
  let skipped = 0;

  // Try to enroll in each matching workflow
  for (const workflow of matchingWorkflows) {
    try {
      const result = await enrollInWorkflow(workflow, recordId, recordType, tenantId, eventData);

      if (result.enrolled) {
        enrolled++;
        // Queue first step for execution
        await queueFirstStep(result.executionId, workflow.id, tenantId);
      } else {
        skipped++;
      }
    } catch (error) {
      console.error('[WorkflowTrigger] Error enrolling in workflow:', workflow.id, error);
      skipped++;
    }
  }

  return { enrolled, skipped };
}

/**
 * Find active workflows that match the event type and object type
 */
async function findMatchingWorkflows(tenantId, recordType, eventType) {
  const result = await query(
    `SELECT id, name, entry_condition, settings
     FROM "Workflow"
     WHERE tenant_id = $1
       AND object_type = $2
       AND status = 'active'
       AND deleted_at IS NULL
       AND entry_condition->>'trigger_type' = 'event'
       AND entry_condition->>'event_type' = $3`,
    [tenantId, recordType, eventType]
  );

  return result.rows;
}

/**
 * Attempt to enroll a record in a workflow
 */
async function enrollInWorkflow(workflow, recordId, recordType, tenantId, eventData) {
  const settings = workflow.settings || {};
  const allowReenrollment = settings.allow_reenrollment === true;
  const reenrollmentDelayDays = settings.reenrollment_delay_days || 0;

  // Check if already enrolled
  const existingEnrollment = await query(
    `SELECT id, enrolled_at, status
     FROM "WorkflowExecution"
     WHERE workflow_id = $1
       AND record_id = $2
       AND tenant_id = $3
     ORDER BY enrolled_at DESC
     LIMIT 1`,
    [workflow.id, recordId, tenantId]
  );

  if (existingEnrollment.rows.length > 0) {
    const existing = existingEnrollment.rows[0];

    // If already running, skip
    if (existing.status === 'running' || existing.status === 'paused') {
      console.log('[WorkflowTrigger] Record already enrolled in workflow:', workflow.id);
      return { enrolled: false, reason: 'already_enrolled' };
    }

    // If reenrollment not allowed, skip
    if (!allowReenrollment) {
      console.log('[WorkflowTrigger] Reenrollment not allowed for workflow:', workflow.id);
      return { enrolled: false, reason: 'reenrollment_not_allowed' };
    }

    // Check reenrollment delay
    if (reenrollmentDelayDays > 0) {
      const lastEnrolled = new Date(existing.enrolled_at);
      const delayMs = reenrollmentDelayDays * 24 * 60 * 60 * 1000;
      const now = new Date();

      if ((now - lastEnrolled) < delayMs) {
        console.log('[WorkflowTrigger] Reenrollment delay not met for workflow:', workflow.id);
        return { enrolled: false, reason: 'reenrollment_delay' };
      }
    }
  }

  // Get the first step of the workflow (root level, position 0)
  const firstStepResult = await query(
    `SELECT id FROM "WorkflowStep"
     WHERE workflow_id = $1
       AND parent_step_id IS NULL
     ORDER BY position ASC
     LIMIT 1`,
    [workflow.id]
  );

  if (firstStepResult.rows.length === 0) {
    console.warn('[WorkflowTrigger] Workflow has no steps:', workflow.id);
    return { enrolled: false, reason: 'no_steps' };
  }

  const firstStepId = firstStepResult.rows[0].id;

  // Create enrollment
  const enrollmentResult = await query(
    `INSERT INTO "WorkflowExecution"
       (workflow_id, tenant_id, record_id, record_type, status, current_step_id)
     VALUES ($1, $2, $3, $4, 'running', $5)
     RETURNING id`,
    [workflow.id, tenantId, recordId, recordType, firstStepId]
  );

  const executionId = enrollmentResult.rows[0].id;

  // Increment workflow enrolled count
  await query(
    `UPDATE "Workflow"
     SET enrolled_count = enrolled_count + 1,
         last_run_at = NOW()
     WHERE id = $1`,
    [workflow.id]
  );

  console.log('[WorkflowTrigger] Enrolled record in workflow:', {
    executionId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    recordId,
  });

  return { enrolled: true, executionId };
}

/**
 * Queue the first step for execution
 */
async function queueFirstStep(executionId, workflowId, tenantId) {
  if (!STEP_QUEUE_URL) {
    console.warn('[WorkflowTrigger] WORKFLOW_STEP_QUEUE_URL not set');
    return;
  }

  const message = {
    executionId,
    workflowId,
    tenantId,
    action: 'execute_next',
    timestamp: new Date().toISOString(),
  };

  await sqs.send(new SendMessageCommand({
    QueueUrl: STEP_QUEUE_URL,
    MessageBody: JSON.stringify(message),
    MessageAttributes: {
      executionId: {
        DataType: 'String',
        StringValue: executionId,
      },
    },
  }));

  console.log('[WorkflowTrigger] Queued first step for execution:', executionId);
}

/**
 * HTTP handler for manual workflow enrollment (API Gateway)
 */
exports.manualEnrollHandler = async (event) => {
  console.log('[WorkflowTrigger] Manual enrollment request');

  // Ensure database pool is initialized
  await getPoolAsync();

  try {
    const body = JSON.parse(event.body || '{}');
    const { workflowId, recordId, tenantId } = body;

    if (!workflowId || !recordId || !tenantId) {
      return createResponse(400, {
        error: 'Missing required fields: workflowId, recordId, tenantId',
      });
    }

    // Verify workflow exists and is active
    const workflowResult = await query(
      `SELECT id, name, object_type, entry_condition, settings
       FROM "Workflow"
       WHERE id = $1
         AND tenant_id = $2
         AND status = 'active'
         AND deleted_at IS NULL`,
      [workflowId, tenantId]
    );

    if (workflowResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Workflow not found or not active',
      });
    }

    const workflow = workflowResult.rows[0];

    // Check trigger type is manual
    const entryCondition = workflow.entry_condition || {};
    if (entryCondition.trigger_type !== 'manual') {
      return createResponse(400, {
        error: 'Workflow is not configured for manual enrollment',
      });
    }

    // Enroll the record
    const result = await enrollInWorkflow(
      workflow,
      recordId,
      workflow.object_type,
      tenantId,
      {}
    );

    if (!result.enrolled) {
      return createResponse(409, {
        error: `Enrollment failed: ${result.reason}`,
      });
    }

    // Queue first step
    await queueFirstStep(result.executionId, workflowId, tenantId);

    return createResponse(200, {
      success: true,
      executionId: result.executionId,
      message: 'Record enrolled in workflow',
    });
  } catch (error) {
    console.error('[WorkflowTrigger] Manual enrollment error:', error);
    return createResponse(500, {
      error: 'Internal server error',
    });
  }
};

/**
 * Handler for filter-based workflows (scheduled check for matching records)
 * Called by EventBridge rule on a schedule
 */
exports.filterTriggerHandler = async (event) => {
  console.log('[WorkflowTrigger] Filter trigger check');

  // Ensure database pool is initialized
  await getPoolAsync();

  const results = {
    workflowsChecked: 0,
    recordsEnrolled: 0,
    errors: [],
  };

  try {
    // Find all active workflows with filter_criteria trigger
    const workflowsResult = await query(
      `SELECT w.id, w.name, w.tenant_id, w.object_type, w.entry_condition, w.settings
       FROM "Workflow" w
       WHERE w.status = 'active'
         AND w.deleted_at IS NULL
         AND w.entry_condition->>'trigger_type' = 'filter_criteria'`
    );

    console.log('[WorkflowTrigger] Found', workflowsResult.rows.length, 'filter-based workflows');

    for (const workflow of workflowsResult.rows) {
      try {
        const enrolled = await processFilterWorkflow(workflow);
        results.workflowsChecked++;
        results.recordsEnrolled += enrolled;
      } catch (error) {
        console.error('[WorkflowTrigger] Error processing filter workflow:', workflow.id, error);
        results.errors.push({
          workflowId: workflow.id,
          error: error.message,
        });
      }
    }

    console.log('[WorkflowTrigger] Filter trigger results:', results);
    return results;
  } catch (error) {
    console.error('[WorkflowTrigger] Filter trigger error:', error);
    throw error;
  }
};

/**
 * Process a filter-based workflow - find and enroll matching records
 */
async function processFilterWorkflow(workflow) {
  const { id: workflowId, tenant_id: tenantId, object_type: objectType, entry_condition: entryCondition } = workflow;
  const filter = entryCondition?.filter || {};

  // Build dynamic query based on object type and filter
  const baseQuery = getFilterBaseQuery(objectType);
  if (!baseQuery) {
    console.warn('[WorkflowTrigger] Unknown object type for filter:', objectType);
    return 0;
  }

  // For now, simple implementation - find records not already enrolled
  // TODO: Add proper filter condition parsing when filter builder is implemented
  const recordsResult = await query(
    `${baseQuery}
     WHERE r.tenant_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM "WorkflowExecution" we
         WHERE we.workflow_id = $2
           AND we.record_id = r.id
           AND we.status IN ('running', 'paused')
       )
     LIMIT 100`,
    [tenantId, workflowId]
  );

  console.log('[WorkflowTrigger] Found', recordsResult.rows.length, 'records for filter workflow:', workflowId);

  let enrolled = 0;

  for (const record of recordsResult.rows) {
    try {
      const result = await enrollInWorkflow(workflow, record.id, objectType, tenantId, {});

      if (result.enrolled) {
        await queueFirstStep(result.executionId, workflowId, tenantId);
        enrolled++;
      }
    } catch (error) {
      console.error('[WorkflowTrigger] Error enrolling record:', record.id, error);
    }
  }

  return enrolled;
}

/**
 * Get base SELECT query for object type
 */
function getFilterBaseQuery(objectType) {
  const queries = {
    pet: 'SELECT r.id FROM "Pet" r',
    booking: 'SELECT r.id FROM "Booking" r',
    owner: 'SELECT r.id FROM "Owner" r',
    payment: 'SELECT r.id FROM "Payment" r',
    invoice: 'SELECT r.id FROM "Invoice" r',
    task: 'SELECT r.id FROM "Task" r',
  };

  return queries[objectType] || null;
}
