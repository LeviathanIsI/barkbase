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
 * Evaluate if a record matches segment filters
 * Supports both HubSpot-style and legacy BarkBase filter formats
 *
 * HubSpot format:
 * {
 *   filterBranchType: "OR",
 *   filterBranches: [
 *     { filterBranchType: "AND", filters: [{ property, operator, value }] }
 *   ]
 * }
 *
 * Legacy BarkBase format:
 * {
 *   groups: [{ conditions: [...], logic: 'AND' }],
 *   groupLogic: 'OR'
 * }
 *
 * @param {string} recordId - The record ID
 * @param {string} recordType - The type of record
 * @param {object} filters - The segment filter configuration
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<boolean>} - True if record matches filters
 */
async function evaluateSegmentFilters(recordId, recordType, filters, tenantId) {
  if (!filters) {
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

    // Detect format and evaluate accordingly
    if (filters.filterBranchType || filters.filterBranches) {
      // HubSpot-style format
      return evaluateHubSpotFilters(filters, record);
    } else if (filters.groups && filters.groups.length > 0) {
      // Legacy BarkBase format
      return evaluateLegacyFilters(filters, record);
    } else if (filters.conditions && filters.conditions.length > 0) {
      // Flat conditions format
      const logic = filters.logic || 'AND';
      return evaluateConditionGroup(filters.conditions, logic, record);
    }

    return false;

  } catch (error) {
    console.error('[WorkflowTrigger] Error evaluating segment filters:', error.message);
    return false;
  }
}

/**
 * Evaluate HubSpot-style filter branches
 * Root level is OR, sub-branches are AND containing filters
 */
function evaluateHubSpotFilters(filterConfig, record) {
  const rootType = (filterConfig.filterBranchType || 'OR').toUpperCase();
  const branches = filterConfig.filterBranches || [];

  if (branches.length === 0) {
    // If no branches but has filters at root level, evaluate directly
    if (filterConfig.filters && filterConfig.filters.length > 0) {
      return evaluateHubSpotConditionGroup(filterConfig.filters, record);
    }
    return false;
  }

  const branchResults = branches.map(branch => {
    const branchType = (branch.filterBranchType || 'AND').toUpperCase();
    const filters = branch.filters || [];
    const nestedBranches = branch.filterBranches || [];

    // Evaluate filters in this branch
    let filtersResult = true;
    if (filters.length > 0) {
      filtersResult = evaluateHubSpotConditionGroup(filters, record);
    }

    // Recursively evaluate nested branches
    let nestedResult = true;
    if (nestedBranches.length > 0) {
      nestedResult = evaluateHubSpotFilters({ filterBranchType: branchType, filterBranches: nestedBranches }, record);
    }

    // Combine based on branch type
    if (branchType === 'OR') {
      return filtersResult || nestedResult;
    }
    return filtersResult && nestedResult;
  });

  // Combine branch results based on root type
  if (rootType === 'AND') {
    return branchResults.every(r => r);
  }
  return branchResults.some(r => r);
}

/**
 * Evaluate a group of HubSpot-style filters (ANDed together)
 */
function evaluateHubSpotConditionGroup(filters, record) {
  if (!filters || filters.length === 0) {
    return true;
  }

  return filters.every(filter => {
    // HubSpot uses 'property' instead of 'field'
    const condition = {
      field: filter.property || filter.field,
      operator: filter.operator,
      value: filter.value,
      highValue: filter.highValue, // For IS_BETWEEN
      values: filter.values, // For IS_ANY_OF, IS_NONE_OF
    };
    return evaluateFilterCondition(condition, record);
  });
}

/**
 * Evaluate legacy BarkBase filter format
 */
function evaluateLegacyFilters(filters, record) {
  const groupLogic = (filters.groupLogic || 'OR').toUpperCase();

  const groupResults = filters.groups.map(group => {
    const conditionLogic = (group.logic || 'AND').toUpperCase();
    const conditions = group.conditions || [];

    if (conditions.length === 0) {
      return false;
    }

    return evaluateConditionGroup(conditions, conditionLogic, record);
  });

  if (groupLogic === 'AND') {
    return groupResults.every(r => r);
  }
  return groupResults.some(r => r);
}

/**
 * Evaluate a group of conditions with specified logic
 */
function evaluateConditionGroup(conditions, logic, record) {
  const results = conditions.map(condition => evaluateFilterCondition(condition, record));

  if (logic === 'OR') {
    return results.some(r => r);
  }
  return results.every(r => r);
}

/**
 * Evaluate a single filter condition against a record
 * Supports both HubSpot-style operators (IS_EQUAL_TO) and legacy (equals)
 */
function evaluateFilterCondition(condition, record) {
  const { field, operator, value, highValue, values } = condition;
  const actualValue = record[field];

  // Normalize operator to uppercase for comparison
  const op = (operator || '').toUpperCase().replace(/-/g, '_');

  switch (op) {
    // Equality operators
    case 'EQUALS':
    case 'IS':
    case 'IS_EQUAL_TO':
    case 'EQ':
      return compareValues(actualValue, value);

    case 'NOT_EQUALS':
    case 'IS_NOT':
    case 'IS_NOT_EQUAL_TO':
    case 'NEQ':
      return !compareValues(actualValue, value);

    // String operators
    case 'CONTAINS':
      return String(actualValue || '').toLowerCase().includes(String(value || '').toLowerCase());

    case 'NOT_CONTAINS':
    case 'DOES_NOT_CONTAIN':
      return !String(actualValue || '').toLowerCase().includes(String(value || '').toLowerCase());

    case 'STARTS_WITH':
      return String(actualValue || '').toLowerCase().startsWith(String(value || '').toLowerCase());

    case 'ENDS_WITH':
      return String(actualValue || '').toLowerCase().endsWith(String(value || '').toLowerCase());

    // Empty/Known operators
    case 'IS_EMPTY':
    case 'IS_UNKNOWN':
      return actualValue === null || actualValue === undefined || actualValue === '';

    case 'IS_NOT_EMPTY':
    case 'IS_KNOWN':
    case 'HAS_EVER_BEEN_ANY':
      return actualValue !== null && actualValue !== undefined && actualValue !== '';

    // Numeric comparison operators
    case 'GREATER_THAN':
    case 'IS_GREATER_THAN':
    case 'GT':
      return Number(actualValue) > Number(value);

    case 'LESS_THAN':
    case 'IS_LESS_THAN':
    case 'LT':
      return Number(actualValue) < Number(value);

    case 'GREATER_OR_EQUAL':
    case 'GREATER_THAN_OR_EQUAL':
    case 'IS_GREATER_THAN_OR_EQUAL':
    case 'GTE':
      return Number(actualValue) >= Number(value);

    case 'LESS_OR_EQUAL':
    case 'LESS_THAN_OR_EQUAL':
    case 'IS_LESS_THAN_OR_EQUAL':
    case 'LTE':
      return Number(actualValue) <= Number(value);

    // Range operator
    case 'IS_BETWEEN':
    case 'BETWEEN':
      const lowVal = Number(value);
      const highVal = Number(highValue);
      const numActual = Number(actualValue);
      return numActual >= lowVal && numActual <= highVal;

    // Multi-value operators
    case 'IS_ANY_OF':
    case 'EQUALS_ANY':
    case 'IN':
      const anyOfValues = values || (Array.isArray(value) ? value : [value]);
      return anyOfValues.some(v => compareValues(actualValue, v));

    case 'IS_NONE_OF':
    case 'NOT_ANY_OF':
    case 'NOT_IN':
      const noneOfValues = values || (Array.isArray(value) ? value : [value]);
      return !noneOfValues.some(v => compareValues(actualValue, v));

    // Date operators
    case 'IS_BEFORE':
    case 'BEFORE':
      return compareDates(actualValue, value) < 0;

    case 'IS_AFTER':
    case 'AFTER':
      return compareDates(actualValue, value) > 0;

    case 'IS_BEFORE_DATE':
      return compareDates(actualValue, value, true) < 0;

    case 'IS_AFTER_DATE':
      return compareDates(actualValue, value, true) > 0;

    case 'IS_WITHIN_LAST':
      return isWithinPeriod(actualValue, value, 'past');

    case 'IS_WITHIN_NEXT':
      return isWithinPeriod(actualValue, value, 'future');

    case 'IS_MORE_THAN_DAYS_AGO':
      return isMoreThanDaysAgo(actualValue, value);

    case 'IS_LESS_THAN_DAYS_AGO':
      return isLessThanDaysAgo(actualValue, value);

    // Boolean operators
    case 'IS_TRUE':
      return actualValue === true || actualValue === 'true' || actualValue === 1;

    case 'IS_FALSE':
      return actualValue === false || actualValue === 'false' || actualValue === 0;

    default:
      console.warn('[WorkflowTrigger] Unknown filter operator:', operator);
      return false;
  }
}

/**
 * Compare two values with type coercion
 */
function compareValues(actual, expected) {
  if (actual === null || actual === undefined) {
    return expected === null || expected === undefined || expected === '';
  }

  // Try numeric comparison first
  const numActual = Number(actual);
  const numExpected = Number(expected);
  if (!isNaN(numActual) && !isNaN(numExpected)) {
    return numActual === numExpected;
  }

  // Fall back to case-insensitive string comparison
  return String(actual).toLowerCase() === String(expected).toLowerCase();
}

/**
 * Compare two dates
 * @param {*} actual - Actual date value
 * @param {*} expected - Expected date value
 * @param {boolean} dateOnly - If true, compare only date portion (ignore time)
 * @returns {number} - Negative if actual < expected, 0 if equal, positive if actual > expected
 */
function compareDates(actual, expected, dateOnly = false) {
  const actualDate = new Date(actual);
  const expectedDate = new Date(expected);

  if (isNaN(actualDate.getTime()) || isNaN(expectedDate.getTime())) {
    return 0; // Invalid dates
  }

  if (dateOnly) {
    // Compare only date portion
    const actualDateOnly = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
    const expectedDateOnly = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate());
    return actualDateOnly.getTime() - expectedDateOnly.getTime();
  }

  return actualDate.getTime() - expectedDate.getTime();
}

/**
 * Check if date is within a specified period
 * @param {*} dateValue - The date to check
 * @param {object} period - Period specification { value, unit } or number of days
 * @param {string} direction - 'past' or 'future'
 */
function isWithinPeriod(dateValue, period, direction) {
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  let days;

  if (typeof period === 'object') {
    const value = period.value || 0;
    const unit = (period.unit || 'days').toLowerCase();
    switch (unit) {
      case 'hours': days = value / 24; break;
      case 'weeks': days = value * 7; break;
      case 'months': days = value * 30; break;
      case 'years': days = value * 365; break;
      default: days = value;
    }
  } else {
    days = Number(period);
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const threshold = days * msPerDay;

  if (direction === 'past') {
    const pastLimit = new Date(now.getTime() - threshold);
    return date >= pastLimit && date <= now;
  } else {
    const futureLimit = new Date(now.getTime() + threshold);
    return date >= now && date <= futureLimit;
  }
}

/**
 * Check if date is more than N days ago
 */
function isMoreThanDaysAgo(dateValue, days) {
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const threshold = new Date(now.getTime() - (Number(days) * 24 * 60 * 60 * 1000));
  return date < threshold;
}

/**
 * Check if date is less than N days ago
 */
function isLessThanDaysAgo(dateValue, days) {
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const threshold = new Date(now.getTime() - (Number(days) * 24 * 60 * 60 * 1000));
  return date >= threshold && date <= now;
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
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj, path) {
  if (!path) return undefined;
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Fetch record data for goal evaluation
 */
async function getRecordDataForGoal(recordId, recordType, tenantId) {
  const data = { recordType };

  try {
    const tableName = getTableName(recordType);
    if (tableName) {
      const recordResult = await query(
        `SELECT * FROM "${tableName}" WHERE id = $1 AND tenant_id = $2`,
        [recordId, tenantId]
      );
      if (recordResult.rows.length > 0) {
        data.record = recordResult.rows[0];
        data[recordType] = recordResult.rows[0];
      }
    }

    // Get related owner for non-owner records
    if (data.record?.owner_id) {
      const ownerResult = await query(
        `SELECT * FROM "Owner" WHERE id = $1`,
        [data.record.owner_id]
      );
      if (ownerResult.rows.length > 0) {
        data.owner = ownerResult.rows[0];
        data.owner.full_name = `${data.owner.first_name} ${data.owner.last_name}`.trim();
      }
    }

    // Get related pet
    if (data.record?.pet_id) {
      const petResult = await query(
        `SELECT * FROM "Pet" WHERE id = $1`,
        [data.record.pet_id]
      );
      if (petResult.rows.length > 0) {
        data.pet = petResult.rows[0];
      }
    }

    // For pet records, get owner
    if (recordType === 'pet' && data.pet?.owner_id) {
      const ownerResult = await query(
        `SELECT * FROM "Owner" WHERE id = $1`,
        [data.pet.owner_id]
      );
      if (ownerResult.rows.length > 0) {
        data.owner = ownerResult.rows[0];
        data.owner.full_name = `${data.owner.first_name} ${data.owner.last_name}`.trim();
      }
    }
  } catch (error) {
    console.error('[WorkflowTrigger] Error fetching record data for goal check:', error);
  }

  return data;
}

/**
 * Evaluate a single goal condition against record data
 */
function evaluateGoalCondition(condition, recordData) {
  const { field, operator, value } = condition;
  const actualValue = getNestedValue(recordData, field);

  switch (operator) {
    case 'equals':
    case 'IS_EQUAL_TO':
      return String(actualValue) === String(value);
    case 'not_equals':
    case 'IS_NOT_EQUAL_TO':
      return String(actualValue) !== String(value);
    case 'contains':
    case 'CONTAINS':
      return String(actualValue || '').toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains':
    case 'DOES_NOT_CONTAIN':
      return !String(actualValue || '').toLowerCase().includes(String(value).toLowerCase());
    case 'starts_with':
    case 'STARTS_WITH':
      return String(actualValue || '').toLowerCase().startsWith(String(value).toLowerCase());
    case 'ends_with':
    case 'ENDS_WITH':
      return String(actualValue || '').toLowerCase().endsWith(String(value).toLowerCase());
    case 'is_empty':
    case 'IS_EMPTY':
    case 'IS_UNKNOWN':
      return !actualValue || actualValue === '';
    case 'is_not_empty':
    case 'IS_NOT_EMPTY':
    case 'IS_KNOWN':
      return !!actualValue && actualValue !== '';
    case 'greater_than':
    case 'GREATER_THAN':
      return Number(actualValue) > Number(value);
    case 'less_than':
    case 'LESS_THAN':
      return Number(actualValue) < Number(value);
    case 'is_true':
    case 'IS_TRUE':
      return actualValue === true || actualValue === 'true';
    case 'is_false':
    case 'IS_FALSE':
      return actualValue === false || actualValue === 'false';
    default:
      console.warn('[WorkflowTrigger] Unknown goal condition operator:', operator);
      return false;
  }
}

/**
 * Evaluate workflow goal conditions against record data
 * Returns { met: boolean, reason: string, conditionResults?: array }
 */
function evaluateGoalConditions(goalConfig, recordData) {
  if (!goalConfig) {
    return { met: false, reason: 'No goal configured' };
  }

  const conditions = goalConfig.conditions || [];
  const conditionLogic = goalConfig.conditionLogic || goalConfig.logic || 'and';

  if (conditions.length === 0) {
    return { met: false, reason: 'No goal conditions defined' };
  }

  // Evaluate each condition and track results
  const conditionResults = conditions.map(condition => {
    const result = evaluateGoalCondition(condition, recordData);
    return {
      field: condition.field,
      operator: condition.operator,
      expectedValue: condition.value,
      actualValue: getNestedValue(recordData, condition.field),
      met: result,
    };
  });

  // Determine if goal is met based on logic
  let goalMet;
  if (conditionLogic === 'or') {
    goalMet = conditionResults.some(r => r.met);
  } else {
    goalMet = conditionResults.every(r => r.met);
  }

  return {
    met: goalMet,
    conditionLogic,
    conditionResults,
    reason: goalMet
      ? (conditionLogic === 'or' ? 'At least one goal condition satisfied' : 'All goal conditions satisfied')
      : (conditionLogic === 'or' ? 'No goal conditions satisfied' : 'Not all goal conditions satisfied'),
  };
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

  // Check if record already meets goal conditions (HubSpot behavior)
  // Records that already satisfy the goal should not be enrolled
  if (workflow.goal_config) {
    console.log('[WorkflowTrigger] Checking if record already meets goal conditions...');
    const recordData = await getRecordDataForGoal(recordId, recordType, tenantId);
    const goalResult = evaluateGoalConditions(workflow.goal_config, recordData);

    if (goalResult.met) {
      console.log('[WorkflowTrigger] Record already meets goal conditions:', {
        workflowId: workflow.id,
        workflowName: workflow.name,
        recordId,
        goalResult,
      });
      return {
        enrolled: false,
        reason: 'already_meets_goal',
        goalResult,
      };
    }
    console.log('[WorkflowTrigger] Record does not meet goal conditions, proceeding with enrollment');
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
