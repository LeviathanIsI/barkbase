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
  console.log('[WORKFLOW TRIGGER] ========================================');
  console.log('[WORKFLOW TRIGGER] LAMBDA INVOKED');
  console.log('[WORKFLOW TRIGGER] ========================================');
  console.log('[WORKFLOW TRIGGER] Event:', JSON.stringify(event, null, 2));
  console.log('[WORKFLOW TRIGGER] Records count:', event.Records?.length || 0);
  console.log('[WORKFLOW TRIGGER] STEP_QUEUE_URL:', STEP_QUEUE_URL);

  // Ensure database pool is initialized
  console.log('[WORKFLOW TRIGGER] Initializing database pool...');
  await getPoolAsync();
  console.log('[WORKFLOW TRIGGER] Database pool ready');

  const results = {
    processed: 0,
    enrolled: 0,
    skipped: 0,
    errors: [],
  };

  // Process each SQS record
  for (const record of event.Records || []) {
    console.log('[WORKFLOW TRIGGER] Processing record:', record.messageId);
    console.log('[WORKFLOW TRIGGER] Record body:', record.body);
    try {
      const message = JSON.parse(record.body);
      console.log('[WORKFLOW TRIGGER] Parsed message:', JSON.stringify(message, null, 2));
      const result = await processEvent(message);

      results.processed++;
      results.enrolled += result.enrolled || 0;
      results.skipped += result.skipped || 0;
      console.log('[WORKFLOW TRIGGER] Record result:', result);
    } catch (error) {
      console.error('[WORKFLOW TRIGGER] Error processing message:', error);
      console.error('[WORKFLOW TRIGGER] Error stack:', error.stack);
      results.errors.push({
        messageId: record.messageId,
        error: error.message,
      });
    }
  }

  console.log('[WORKFLOW TRIGGER] ========================================');
  console.log('[WORKFLOW TRIGGER] FINAL RESULTS:', JSON.stringify(results, null, 2));
  console.log('[WORKFLOW TRIGGER] ========================================');

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

  console.log('[WORKFLOW TRIGGER] ---------- PROCESS EVENT ----------');
  console.log('[WORKFLOW TRIGGER] Event type:', eventType);
  console.log('[WORKFLOW TRIGGER] Record ID:', recordId);
  console.log('[WORKFLOW TRIGGER] Record type:', recordType);
  console.log('[WORKFLOW TRIGGER] Tenant ID:', tenantId);
  console.log('[WORKFLOW TRIGGER] Event data:', JSON.stringify(eventData, null, 2));
  console.log('[WORKFLOW TRIGGER] Timestamp:', timestamp);

  // Validate required fields
  if (!eventType || !recordId || !recordType || !tenantId) {
    console.warn('[WORKFLOW TRIGGER] MISSING required fields in message!');
    console.warn('[WORKFLOW TRIGGER] eventType:', eventType, '| recordId:', recordId, '| recordType:', recordType, '| tenantId:', tenantId);
    return { enrolled: 0, skipped: 1 };
  }

  // Find active workflows that match this event type and object type
  console.log('[WORKFLOW TRIGGER] Finding matching workflows...');
  const matchingWorkflows = await findMatchingWorkflows(tenantId, recordType, eventType);

  if (matchingWorkflows.length === 0) {
    console.log('[WORKFLOW TRIGGER] No matching workflows found!');
    return { enrolled: 0, skipped: 0 };
  }

  console.log('[WORKFLOW TRIGGER] Found', matchingWorkflows.length, 'matching workflows');
  console.log('[WORKFLOW TRIGGER] Matching workflows:', JSON.stringify(matchingWorkflows, null, 2));

  let enrolled = 0;
  let skipped = 0;

  // Try to enroll in each matching workflow
  for (const workflow of matchingWorkflows) {
    console.log('[WORKFLOW TRIGGER] Processing workflow:', workflow.id, workflow.name);

    // INFINITE LOOP PREVENTION: Skip if this record was enrolled by the same workflow
    // This matches HubSpot's behavior where records created/modified by a workflow
    // cannot trigger enrollment in that same workflow
    if (eventData?.sourceWorkflowId && eventData.sourceWorkflowId === workflow.id) {
      console.log('[WORKFLOW TRIGGER] INFINITE LOOP PREVENTED: Record from workflow', workflow.id, 'cannot re-enroll in same workflow');
      skipped++;
      continue;
    }

    try {
      const result = await enrollInWorkflow(workflow, recordId, recordType, tenantId, eventData);
      console.log('[WORKFLOW TRIGGER] Enrollment result:', JSON.stringify(result, null, 2));

      if (result.enrolled) {
        enrolled++;
        // Queue first step for execution
        console.log('[WORKFLOW TRIGGER] Queuing first step...');
        await queueFirstStep(result.executionId, workflow.id, tenantId);
        console.log('[WORKFLOW TRIGGER] First step queued successfully');
      } else {
        console.log('[WORKFLOW TRIGGER] Skipped enrollment. Reason:', result.reason);
        skipped++;
      }
    } catch (error) {
      console.error('[WORKFLOW TRIGGER] Error enrolling in workflow:', workflow.id, error);
      console.error('[WORKFLOW TRIGGER] Error stack:', error.stack);
      skipped++;
    }
  }

  console.log('[WORKFLOW TRIGGER] ---------- PROCESS EVENT COMPLETE ----------');
  console.log('[WORKFLOW TRIGGER] Enrolled:', enrolled, '| Skipped:', skipped);
  return { enrolled, skipped };
}

/**
 * Find active workflows that match the event type and object type
 */
async function findMatchingWorkflows(tenantId, recordType, eventType) {
  console.log('[WORKFLOW TRIGGER] findMatchingWorkflows called');
  console.log('[WORKFLOW TRIGGER] Query params - tenantId:', tenantId, '| recordType:', recordType, '| eventType:', eventType);

  const sqlQuery = `SELECT id, name, entry_condition, settings, suppression_segment_ids
     FROM "Workflow"
     WHERE tenant_id = $1
       AND object_type = $2
       AND status = 'active'
       AND deleted_at IS NULL
       AND entry_condition->>'trigger_type' = 'event'
       AND entry_condition->>'event_type' = $3`;

  console.log('[WORKFLOW TRIGGER] SQL:', sqlQuery);
  console.log('[WORKFLOW TRIGGER] Params:', [tenantId, recordType, eventType]);

  const result = await query(sqlQuery, [tenantId, recordType, eventType]);

  console.log('[WORKFLOW TRIGGER] Query returned', result.rows.length, 'rows');
  console.log('[WORKFLOW TRIGGER] Rows:', JSON.stringify(result.rows, null, 2));

  return result.rows;
}

/**
 * Check if a record is in any suppression segment
 * @param {string} recordId - The record ID to check
 * @param {string} recordType - The type of record (pet, owner, booking, etc.)
 * @param {string[]} segmentIds - Array of segment IDs to check
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<{suppressed: boolean, segmentId?: string, segmentName?: string}>}
 */
async function isRecordSuppressed(recordId, recordType, segmentIds, tenantId) {
  if (!segmentIds || segmentIds.length === 0) {
    return { suppressed: false };
  }

  console.log('[WorkflowTrigger] Checking suppression for record:', recordId, 'in segments:', segmentIds);

  try {
    // Get segment details
    const segmentsResult = await query(
      `SELECT id, name, segment_type, object_type, filters
       FROM "Segment"
       WHERE id = ANY($1) AND tenant_id = $2`,
      [segmentIds, tenantId]
    );

    if (segmentsResult.rows.length === 0) {
      console.log('[WorkflowTrigger] No valid suppression segments found');
      return { suppressed: false };
    }

    for (const segment of segmentsResult.rows) {
      // Skip if segment object type doesn't match record type
      if (segment.object_type !== recordType && segment.object_type !== 'owners') {
        console.log('[WorkflowTrigger] Skipping segment', segment.id, '- object type mismatch');
        continue;
      }

      // Check membership based on segment type
      if (segment.segment_type === 'static') {
        // For static segments, check SegmentMember table
        const memberResult = await query(
          `SELECT 1 FROM "SegmentMember"
           WHERE segment_id = $1 AND owner_id = $2
           LIMIT 1`,
          [segment.id, recordId]
        );

        if (memberResult.rows.length > 0) {
          console.log('[WorkflowTrigger] Record suppressed by static segment:', segment.name);
          return {
            suppressed: true,
            segmentId: segment.id,
            segmentName: segment.name,
          };
        }
      } else {
        // For active/dynamic segments, evaluate filters against the record
        const isMember = await evaluateSegmentFilters(recordId, recordType, segment.filters, tenantId);

        if (isMember) {
          console.log('[WorkflowTrigger] Record suppressed by dynamic segment:', segment.name);
          return {
            suppressed: true,
            segmentId: segment.id,
            segmentName: segment.name,
          };
        }
      }
    }

    console.log('[WorkflowTrigger] Record not in any suppression segment');
    return { suppressed: false };

  } catch (error) {
    console.error('[WorkflowTrigger] Error checking suppression:', error.message);
    // On error, don't suppress - allow enrollment to proceed
    return { suppressed: false };
  }
}

/**
 * Evaluate segment filters against a record
 * @param {string} recordId - The record ID
 * @param {string} recordType - The type of record
 * @param {object} filters - The segment filter configuration
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<boolean>} - True if record matches filters
 */
async function evaluateSegmentFilters(recordId, recordType, filters, tenantId) {
  if (!filters || !filters.groups || filters.groups.length === 0) {
    return false;
  }

  try {
    // Get the record data
    const tableName = getTableName(recordType);
    if (!tableName) {
      return false;
    }

    const recordResult = await query(
      `SELECT * FROM "${tableName}" WHERE id = $1 AND tenant_id = $2`,
      [recordId, tenantId]
    );

    if (recordResult.rows.length === 0) {
      return false;
    }

    const record = recordResult.rows[0];
    const groupLogic = filters.groupLogic || 'OR';

    // Evaluate each group
    const groupResults = filters.groups.map(group => {
      const conditionLogic = group.logic || 'AND';
      const conditions = group.conditions || [];

      if (conditions.length === 0) {
        return false;
      }

      const conditionResults = conditions.map(condition => {
        return evaluateFilterCondition(condition, record);
      });

      if (conditionLogic === 'OR') {
        return conditionResults.some(r => r);
      }
      return conditionResults.every(r => r);
    });

    // Combine group results based on group logic
    if (groupLogic === 'AND') {
      return groupResults.every(r => r);
    }
    return groupResults.some(r => r);

  } catch (error) {
    console.error('[WorkflowTrigger] Error evaluating segment filters:', error.message);
    return false;
  }
}

/**
 * Evaluate a single filter condition against a record
 */
function evaluateFilterCondition(condition, record) {
  const { field, operator, value } = condition;
  const actualValue = record[field];

  switch (operator) {
    case 'equals':
    case 'is':
      return String(actualValue).toLowerCase() === String(value).toLowerCase();
    case 'not_equals':
    case 'is_not':
      return String(actualValue).toLowerCase() !== String(value).toLowerCase();
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains':
      return !String(actualValue).toLowerCase().includes(String(value).toLowerCase());
    case 'starts_with':
      return String(actualValue).toLowerCase().startsWith(String(value).toLowerCase());
    case 'ends_with':
      return String(actualValue).toLowerCase().endsWith(String(value).toLowerCase());
    case 'is_empty':
      return !actualValue || actualValue === '' || actualValue === null;
    case 'is_not_empty':
      return !!actualValue && actualValue !== '' && actualValue !== null;
    case 'greater_than':
      return Number(actualValue) > Number(value);
    case 'less_than':
      return Number(actualValue) < Number(value);
    case 'greater_or_equal':
      return Number(actualValue) >= Number(value);
    case 'less_or_equal':
      return Number(actualValue) <= Number(value);
    case 'is_true':
      return actualValue === true || actualValue === 'true';
    case 'is_false':
      return actualValue === false || actualValue === 'false';
    default:
      console.warn('[WorkflowTrigger] Unknown filter operator:', operator);
      return false;
  }
}

/**
 * Get table name for record type
 */
function getTableName(recordType) {
  const tables = {
    pet: 'Pet',
    owner: 'Owner',
    booking: 'Booking',
    payment: 'Payment',
    invoice: 'Invoice',
    task: 'Task',
  };
  return tables[recordType] || null;
}

/**
 * Attempt to enroll a record in a workflow
 */
async function enrollInWorkflow(workflow, recordId, recordType, tenantId, eventData) {
  const settings = workflow.settings || {};
  const allowReenrollment = settings.allow_reenrollment === true;
  const reenrollmentDelayDays = settings.reenrollment_delay_days || 0;

  // Check suppression lists first
  if (workflow.suppression_segment_ids && workflow.suppression_segment_ids.length > 0) {
    const suppressionResult = await isRecordSuppressed(
      recordId,
      recordType,
      workflow.suppression_segment_ids,
      tenantId
    );

    if (suppressionResult.suppressed) {
      console.log('[WorkflowTrigger] Record suppressed from workflow:', {
        workflowId: workflow.id,
        workflowName: workflow.name,
        recordId,
        segmentId: suppressionResult.segmentId,
        segmentName: suppressionResult.segmentName,
      });
      return {
        enrolled: false,
        reason: 'suppressed',
        suppressionSegmentId: suppressionResult.segmentId,
        suppressionSegmentName: suppressionResult.segmentName,
      };
    }
  }

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
  console.log('[WORKFLOW TRIGGER] queueFirstStep called');
  console.log('[WORKFLOW TRIGGER] Execution ID:', executionId);
  console.log('[WORKFLOW TRIGGER] Workflow ID:', workflowId);
  console.log('[WORKFLOW TRIGGER] Tenant ID:', tenantId);
  console.log('[WORKFLOW TRIGGER] STEP_QUEUE_URL:', STEP_QUEUE_URL);

  if (!STEP_QUEUE_URL) {
    console.error('[WORKFLOW TRIGGER] ERROR: WORKFLOW_STEP_QUEUE_URL not set!');
    console.error('[WORKFLOW TRIGGER] process.env.WORKFLOW_STEP_QUEUE_URL:', process.env.WORKFLOW_STEP_QUEUE_URL);
    return;
  }

  const message = {
    executionId,
    workflowId,
    tenantId,
    action: 'execute_next',
    timestamp: new Date().toISOString(),
  };

  console.log('[WORKFLOW TRIGGER] SQS message body:', JSON.stringify(message, null, 2));

  try {
    const result = await sqs.send(new SendMessageCommand({
      QueueUrl: STEP_QUEUE_URL,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        executionId: {
          DataType: 'String',
          StringValue: executionId,
        },
      },
    }));

    console.log('[WORKFLOW TRIGGER] SQS send SUCCESS! Message ID:', result.MessageId);
    console.log('[WORKFLOW TRIGGER] SQS result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('[WORKFLOW TRIGGER] SQS send FAILED:', error);
    console.error('[WORKFLOW TRIGGER] SQS error stack:', error.stack);
    throw error;
  }
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
      `SELECT id, name, object_type, entry_condition, settings, suppression_segment_ids
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
  console.log('[FILTER TRIGGER] ========================================');
  console.log('[FILTER TRIGGER] LAMBDA INVOKED');
  console.log('[FILTER TRIGGER] ========================================');
  console.log('[FILTER TRIGGER] Event:', JSON.stringify(event, null, 2));

  // Ensure database pool is initialized
  console.log('[FILTER TRIGGER] Initializing database pool...');
  await getPoolAsync();
  console.log('[FILTER TRIGGER] Database pool ready');

  const results = {
    workflowsChecked: 0,
    recordsEnrolled: 0,
    errors: [],
  };

  try {
    // Find all active workflows with filter_criteria or filter trigger
    // Frontend uses 'filter', backend historically used 'filter_criteria' - accept both for compatibility
    // Also check both triggerType (camelCase) and trigger_type (snake_case)
    const filterQuery = `SELECT w.id, w.name, w.tenant_id, w.object_type, w.entry_condition, w.settings, w.suppression_segment_ids
       FROM "Workflow" w
       WHERE w.status = 'active'
         AND w.deleted_at IS NULL
         AND (
           w.entry_condition->>'trigger_type' IN ('filter_criteria', 'filter')
           OR w.entry_condition->>'triggerType' IN ('filter_criteria', 'filter')
         )`;

    console.log('[FILTER TRIGGER] SQL:', filterQuery);

    const workflowsResult = await query(filterQuery);

    console.log('[FILTER TRIGGER] Found', workflowsResult.rows.length, 'filter-based workflows');
    console.log('[FILTER TRIGGER] Workflows:', JSON.stringify(workflowsResult.rows, null, 2));

    for (const workflow of workflowsResult.rows) {
      console.log('[FILTER TRIGGER] Processing workflow:', workflow.id, workflow.name);
      console.log('[FILTER TRIGGER] Workflow entry_condition:', JSON.stringify(workflow.entry_condition, null, 2));
      try {
        const enrolled = await processFilterWorkflow(workflow);
        results.workflowsChecked++;
        results.recordsEnrolled += enrolled;
        console.log('[FILTER TRIGGER] Workflow processed. Enrolled:', enrolled);
      } catch (error) {
        console.error('[FILTER TRIGGER] Error processing filter workflow:', workflow.id, error);
        console.error('[FILTER TRIGGER] Error stack:', error.stack);
        results.errors.push({
          workflowId: workflow.id,
          error: error.message,
        });
      }
    }

    console.log('[FILTER TRIGGER] ========================================');
    console.log('[FILTER TRIGGER] FINAL RESULTS:', JSON.stringify(results, null, 2));
    console.log('[FILTER TRIGGER] ========================================');
    return results;
  } catch (error) {
    console.error('[FILTER TRIGGER] Filter trigger error:', error);
    console.error('[FILTER TRIGGER] Error stack:', error.stack);
    throw error;
  }
};

/**
 * Process a filter-based workflow - find and enroll matching records
 */
async function processFilterWorkflow(workflow) {
  const { id: workflowId, tenant_id: tenantId, object_type: objectType, entry_condition: entryCondition } = workflow;
  const filter = entryCondition?.filter || {};

  console.log('[FILTER TRIGGER] processFilterWorkflow called');
  console.log('[FILTER TRIGGER] Workflow ID:', workflowId);
  console.log('[FILTER TRIGGER] Tenant ID:', tenantId);
  console.log('[FILTER TRIGGER] Object type:', objectType);
  console.log('[FILTER TRIGGER] Entry condition:', JSON.stringify(entryCondition, null, 2));
  console.log('[FILTER TRIGGER] Filter:', JSON.stringify(filter, null, 2));

  // Build dynamic query based on object type and filter
  const baseQuery = getFilterBaseQuery(objectType);
  console.log('[FILTER TRIGGER] Base query:', baseQuery);

  if (!baseQuery) {
    console.error('[FILTER TRIGGER] Unknown object type for filter:', objectType);
    return 0;
  }

  // For now, simple implementation - find records not already enrolled
  // TODO: Add proper filter condition parsing when filter builder is implemented
  const recordsQuery = `${baseQuery}
     WHERE r.tenant_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM "WorkflowExecution" we
         WHERE we.workflow_id = $2
           AND we.record_id = r.id
           AND we.status IN ('running', 'paused')
       )
     LIMIT 100`;

  console.log('[FILTER TRIGGER] Records query:', recordsQuery);
  console.log('[FILTER TRIGGER] Query params:', [tenantId, workflowId]);

  const recordsResult = await query(recordsQuery, [tenantId, workflowId]);

  console.log('[FILTER TRIGGER] Found', recordsResult.rows.length, 'records');
  console.log('[FILTER TRIGGER] Record IDs:', recordsResult.rows.map(r => r.id));

  let enrolled = 0;

  for (const record of recordsResult.rows) {
    console.log('[FILTER TRIGGER] Processing record:', record.id);
    try {
      const result = await enrollInWorkflow(workflow, record.id, objectType, tenantId, {});
      console.log('[FILTER TRIGGER] Enrollment result:', JSON.stringify(result, null, 2));

      if (result.enrolled) {
        console.log('[FILTER TRIGGER] Queuing first step for execution:', result.executionId);
        await queueFirstStep(result.executionId, workflowId, tenantId);
        enrolled++;
        console.log('[FILTER TRIGGER] Record enrolled successfully');
      } else {
        console.log('[FILTER TRIGGER] Record not enrolled. Reason:', result.reason);
      }
    } catch (error) {
      console.error('[FILTER TRIGGER] Error enrolling record:', record.id, error);
      console.error('[FILTER TRIGGER] Error stack:', error.stack);
    }
  }

  console.log('[FILTER TRIGGER] processFilterWorkflow complete. Enrolled:', enrolled);
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
