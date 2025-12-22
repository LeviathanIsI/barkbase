/**
 * =============================================================================
 * BarkBase Workflow Scheduled Processor Lambda
 * =============================================================================
 *
 * Handles scheduled workflow operations:
 * 1. Schedule-triggered workflows (cron-based)
 * 2. Resuming paused executions (wait steps that have reached their resume time)
 * 3. Filter-criteria workflows (periodic check for matching records)
 *
 * Called by EventBridge rules on a schedule (e.g., every 5 minutes)
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

// Initialize SQS client
const sqs = new SQSClient({
  region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
});

// Queue URLs from environment
const STEP_QUEUE_URL = process.env.WORKFLOW_STEP_QUEUE_URL;
const TRIGGER_QUEUE_URL = process.env.WORKFLOW_TRIGGER_QUEUE_URL;

/**
 * Main handler for scheduled invocation
 */
exports.handler = async (event) => {
  console.log('[SCHEDULED PROCESSOR] ========================================');
  console.log('[SCHEDULED PROCESSOR] LAMBDA INVOKED');
  console.log('[SCHEDULED PROCESSOR] ========================================');
  console.log('[SCHEDULED PROCESSOR] Event:', JSON.stringify(event, null, 2));
  console.log('[SCHEDULED PROCESSOR] STEP_QUEUE_URL:', STEP_QUEUE_URL);
  console.log('[SCHEDULED PROCESSOR] TRIGGER_QUEUE_URL:', TRIGGER_QUEUE_URL);

  // Ensure database pool is initialized
  console.log('[SCHEDULED PROCESSOR] Initializing database pool...');
  await getPoolAsync();
  console.log('[SCHEDULED PROCESSOR] Database pool ready');

  const results = {
    resumedExecutions: 0,
    scheduleWorkflowsTriggered: 0,
    filterWorkflowsProcessed: 0,
    errors: [],
  };

  try {
    // 1. Resume paused executions whose wait time has passed
    console.log('[SCHEDULED PROCESSOR] Step 1: Resume paused executions...');
    const resumed = await resumePausedExecutions();
    results.resumedExecutions = resumed;
    console.log('[SCHEDULED PROCESSOR] Resumed:', resumed);

    // 2. Process schedule-triggered workflows
    console.log('[SCHEDULED PROCESSOR] Step 2: Process schedule-triggered workflows...');
    const scheduled = await processScheduleWorkflows();
    results.scheduleWorkflowsTriggered = scheduled;
    console.log('[SCHEDULED PROCESSOR] Scheduled triggered:', scheduled);

    // 3. Process filter-criteria workflows (check for matching records)
    console.log('[SCHEDULED PROCESSOR] Step 3: Process filter-criteria workflows...');
    const filtered = await processFilterWorkflows();
    results.filterWorkflowsProcessed = filtered;
    console.log('[SCHEDULED PROCESSOR] Filter processed:', filtered);

  } catch (error) {
    console.error('[SCHEDULED PROCESSOR] Error:', error);
    console.error('[SCHEDULED PROCESSOR] Error stack:', error.stack);
    results.errors.push(error.message);
  }

  console.log('[SCHEDULED PROCESSOR] ========================================');
  console.log('[SCHEDULED PROCESSOR] FINAL RESULTS:', JSON.stringify(results, null, 2));
  console.log('[SCHEDULED PROCESSOR] ========================================');
  return results;
};

/**
 * Resume paused executions whose wait time has passed
 */
async function resumePausedExecutions() {
  console.log('[SCHEDULED PROCESSOR] resumePausedExecutions called');

  const pausedQuery = `SELECT we.id as execution_id, we.workflow_id, we.tenant_id, we.current_step_id,
            w.name as workflow_name, we.resume_at, we.pause_reason,
            w.settings->'timingConfig' as timing_config
     FROM "WorkflowExecution" we
     JOIN "Workflow" w ON w.tenant_id = we.tenant_id AND w.record_id = we.workflow_id
     WHERE we.status = 'paused'
       AND we.resume_at IS NOT NULL
       AND we.resume_at <= NOW()
     ORDER BY we.resume_at ASC
     LIMIT 100`;

  console.log('[SCHEDULED PROCESSOR] Query:', pausedQuery);

  // Find all paused executions where resume_at has passed
  const pausedResult = await query(pausedQuery);

  console.log('[SCHEDULED PROCESSOR] Found', pausedResult.rows.length, 'executions to resume');
  console.log('[SCHEDULED PROCESSOR] Paused executions:', JSON.stringify(pausedResult.rows, null, 2));

  let resumed = 0;

  for (const execution of pausedResult.rows) {
    try {
      // Re-check timing restrictions before resuming
      if (execution.timing_config?.enabled) {
        console.log('[SCHEDULED PROCESSOR] Re-checking timing restrictions for execution:', execution.execution_id);
        const timingCheck = checkTimingRestrictions(execution.timing_config);

        if (!timingCheck.allowed) {
          console.log('[SCHEDULED PROCESSOR] Still outside timing window. Rescheduling to:', timingCheck.nextAllowedTime);

          // Update resume_at to next allowed time
          await query(
            `UPDATE "WorkflowExecution"
             SET resume_at = $1, updated_at = NOW()
             WHERE record_id = $2`,
            [timingCheck.nextAllowedTime.toISOString(), execution.execution_id]
          );

          // Log the reschedule
          await query(
            `INSERT INTO "WorkflowExecutionLog"
               (execution_id, step_id, status, completed_at, result)
             VALUES ($1, $2, 'pending', NOW(), $3)`,
            [
              execution.execution_id,
              execution.current_step_id,
              JSON.stringify({
                event: 'timing_reschedule',
                previousResumeAt: execution.resume_at,
                newResumeAt: timingCheck.nextAllowedTime.toISOString(),
                reason: timingCheck.reason,
              }),
            ]
          );

          continue; // Skip this execution, will be picked up later
        }
        console.log('[SCHEDULED PROCESSOR] Timing check passed, resuming execution');
      }

      // Update execution status back to running
      await query(
        `UPDATE "WorkflowExecution"
         SET status = 'running', resume_at = NULL, pause_reason = NULL, updated_at = NOW()
         WHERE record_id = $1`,
        [execution.execution_id]
      );

      // Get next step after the wait
      const currentStepResult = await query(
        `SELECT ws.workflow_id, ws.id, ws.parent_step_id, ws.branch_path, ws.position
         FROM "WorkflowStep" ws
         WHERE ws.record_id = $1`,
        [execution.current_step_id]
      );

      if (currentStepResult.rows.length > 0) {
        const currentStep = currentStepResult.rows[0];

        // Find next step after the wait
        const nextStepId = await findNextStep(
          currentStep.workflow_id,
          currentStep.id,
          currentStep.parent_step_id,
          currentStep.branch_path,
          currentStep.position
        );

        if (nextStepId) {
          // Update current step and queue for execution
          await query(
            `UPDATE "WorkflowExecution"
             SET current_step_id = $1
             WHERE record_id = $2`,
            [nextStepId, execution.execution_id]
          );

          await queueStepExecution(execution.execution_id, execution.workflow_id, execution.tenant_id);
          resumed++;

          console.log('[ScheduledProcessor] Resumed execution:', execution.execution_id);
        } else {
          // No more steps - complete the workflow
          await query(
            `UPDATE "WorkflowExecution"
             SET status = 'completed', completed_at = NOW()
             WHERE record_id = $1`,
            [execution.execution_id]
          );

          await query(
            `UPDATE "Workflow"
             SET completed_count = completed_count + 1
             WHERE id = $1`,
            [execution.workflow_id]
          );

          console.log('[ScheduledProcessor] Completed execution (no more steps):', execution.execution_id);
          resumed++;
        }
      }
    } catch (error) {
      console.error('[ScheduledProcessor] Error resuming execution:', execution.execution_id, error);
    }
  }

  return resumed;
}

/**
 * Process schedule-triggered workflows
 */
async function processScheduleWorkflows() {
  console.log('[ScheduledProcessor] Checking for schedule-triggered workflows...');

  // Get current time info for cron matching
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentDay = now.getUTCDay(); // 0 = Sunday
  const currentDate = now.getUTCDate();

  // Find active workflows with schedule trigger
  const workflowsResult = await query(
    `SELECT w.record_id, w.name, w.tenant_id, w.object_type, w.entry_condition, w.settings, w.last_run_at, w.suppression_segment_ids
     FROM "Workflow" w
     WHERE w.status = 'active'
       AND w.deleted_at IS NULL
       AND w.entry_condition->>'trigger_type' = 'schedule'`
  );

  console.log('[ScheduledProcessor] Found', workflowsResult.rows.length, 'schedule workflows');

  let triggered = 0;

  for (const workflow of workflowsResult.rows) {
    try {
      const entryCondition = workflow.entry_condition || {};
      const schedule = entryCondition.schedule || {};

      // Check if this workflow should run now based on schedule
      if (shouldRunNow(schedule, workflow.last_run_at, currentHour, currentMinute, currentDay, currentDate)) {
        console.log('[ScheduledProcessor] Triggering schedule workflow:', workflow.name);

        // Get records to enroll based on object type
        const records = await getRecordsForScheduleWorkflow(workflow);

        for (const record of records) {
          // Queue trigger event for each record
          await queueTriggerEvent(
            'schedule.triggered',
            record.id,
            workflow.object_type,
            workflow.tenant_id,
            { workflowId: workflow.id, scheduled: true }
          );
        }

        // Update last run time
        await query(
          `UPDATE "Workflow" SET last_run_at = NOW() WHERE id = $1`,
          [workflow.id]
        );

        triggered++;
      }
    } catch (error) {
      console.error('[ScheduledProcessor] Error processing schedule workflow:', workflow.id, error);
    }
  }

  return triggered;
}

/**
 * Check if a schedule workflow should run now
 */
function shouldRunNow(schedule, lastRunAt, hour, minute, day, date) {
  // Schedule types: daily, weekly, monthly, custom
  const scheduleType = schedule.type || 'daily';
  const scheduleTime = schedule.time || '09:00';
  const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);

  // Check if we're within the right minute window (allow 5 minute window for Lambda timing)
  const minuteMatch = Math.abs(minute - scheduleMinute) <= 2 ||
                      Math.abs(minute - scheduleMinute) >= 58;
  const hourMatch = hour === scheduleHour ||
                    (minute > 57 && hour === (scheduleHour + 1) % 24);

  if (!hourMatch || !minuteMatch) {
    return false;
  }

  // Check if already ran today
  if (lastRunAt) {
    const lastRun = new Date(lastRunAt);
    const now = new Date();
    const sameDay = lastRun.toDateString() === now.toDateString();
    if (sameDay) {
      return false;
    }
  }

  switch (scheduleType) {
    case 'daily':
      return true;

    case 'weekly':
      const scheduleDays = schedule.days || [1, 2, 3, 4, 5]; // Default Mon-Fri
      return scheduleDays.includes(day);

    case 'monthly':
      const scheduleDates = schedule.dates || [1]; // Default 1st of month
      return scheduleDates.includes(date);

    case 'custom':
      // Custom cron expression - simplified parsing
      // Format: "minute hour dayOfMonth month dayOfWeek"
      const cron = schedule.cron || '0 9 * * *';
      return matchesCron(cron, minute, hour, date, now.getUTCMonth() + 1, day);

    default:
      return true;
  }
}

/**
 * Simple cron expression matcher
 */
function matchesCron(cron, minute, hour, dayOfMonth, month, dayOfWeek) {
  const parts = cron.split(' ');
  if (parts.length !== 5) return false;

  const [cronMin, cronHour, cronDom, cronMonth, cronDow] = parts;

  return matchesCronPart(cronMin, minute) &&
         matchesCronPart(cronHour, hour) &&
         matchesCronPart(cronDom, dayOfMonth) &&
         matchesCronPart(cronMonth, month) &&
         matchesCronPart(cronDow, dayOfWeek);
}

/**
 * Match a single cron part
 */
function matchesCronPart(cronPart, value) {
  if (cronPart === '*') return true;

  // Handle lists (1,2,3)
  if (cronPart.includes(',')) {
    return cronPart.split(',').map(Number).includes(value);
  }

  // Handle ranges (1-5)
  if (cronPart.includes('-')) {
    const [start, end] = cronPart.split('-').map(Number);
    return value >= start && value <= end;
  }

  // Handle step values (*/5)
  if (cronPart.includes('/')) {
    const step = parseInt(cronPart.split('/')[1]);
    return value % step === 0;
  }

  // Direct match
  return parseInt(cronPart) === value;
}

/**
 * Get records for a schedule workflow (typically all or filtered)
 */
async function getRecordsForScheduleWorkflow(workflow) {
  const { object_type: objectType, tenant_id: tenantId, entry_condition: entryCondition } = workflow;

  const tableName = getTableName(objectType);
  if (!tableName) {
    return [];
  }

  // Get filter criteria if specified
  const filter = entryCondition?.filter || {};

  // For now, just get records not already in a running execution of this workflow
  // TODO: Add proper filter condition parsing
  const result = await query(
    `SELECT r.record_id FROM "${tableName}" r
     WHERE r.tenant_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM "WorkflowExecution" we
         WHERE we.workflow_id = $2
           AND we.enrolled_record_id = r.record_id
           AND we.status IN ('running', 'paused')
       )
     LIMIT 100`,
    [tenantId, workflow.id]
  );

  return result.rows;
}

/**
 * Process filter-criteria workflows
 */
async function processFilterWorkflows() {
  console.log('[ScheduledProcessor] Checking for filter-criteria workflows...');

  // Find active workflows with filter_criteria or filter trigger
  // Frontend uses 'filter', backend historically used 'filter_criteria' - accept both for compatibility
  // Also check both triggerType (camelCase) and trigger_type (snake_case)
  const workflowsResult = await query(
    `SELECT w.record_id, w.name, w.tenant_id, w.object_type, w.entry_condition, w.settings
     FROM "Workflow" w
     WHERE w.status = 'active'
       AND w.deleted_at IS NULL
       AND (
         w.entry_condition->>'trigger_type' IN ('filter_criteria', 'filter')
         OR w.entry_condition->>'triggerType' IN ('filter_criteria', 'filter')
       )`
  );

  console.log('[ScheduledProcessor] Found', workflowsResult.rows.length, 'filter workflows');

  let processed = 0;

  for (const workflow of workflowsResult.rows) {
    try {
      const enrolled = await processFilterWorkflow(workflow);
      if (enrolled > 0) {
        processed++;
        console.log('[ScheduledProcessor] Enrolled', enrolled, 'records in filter workflow:', workflow.name);
      }
    } catch (error) {
      console.error('[ScheduledProcessor] Error processing filter workflow:', workflow.id, error);
    }
  }

  return processed;
}

/**
 * Process a single filter-criteria workflow
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
 */
async function processFilterWorkflow(workflow) {
  const { id: workflowId, tenant_id: tenantId, object_type: objectType, entry_condition: entryCondition, settings } = workflow;
  // Filter config can be in 'filterConfig' (new) or 'filter' (legacy)
  const filterConfig = entryCondition?.filterConfig || entryCondition?.filter || {};

  console.log('[ScheduledProcessor] Processing filter workflow:', workflow.name, 'id:', workflowId);

  const tableName = getTableName(objectType);
  if (!tableName) {
    return 0;
  }

  // Build WHERE clause from filter criteria
  let whereClause = `r.tenant_id = $1`;
  const params = [tenantId];
  let paramIndex = 2;

  // Detect format and build WHERE clause accordingly
  if (filterConfig.filterBranchType || filterConfig.filterBranches) {
    // HubSpot-style format
    const hubspotResult = buildHubSpotFilterClause(filterConfig, params, paramIndex);
    if (hubspotResult.sql) {
      whereClause += ` AND (${hubspotResult.sql})`;
      paramIndex = hubspotResult.nextParamIndex;
    }
  } else if (filterConfig.groups && filterConfig.groups.length > 0) {
    // Legacy BarkBase format with groups
    const groupsResult = buildLegacyGroupsClause(filterConfig, params, paramIndex);
    if (groupsResult.sql) {
      whereClause += ` AND (${groupsResult.sql})`;
      paramIndex = groupsResult.nextParamIndex;
    }
  } else if (filterConfig.conditions && filterConfig.conditions.length > 0) {
    // Flat conditions format
    const flatResult = buildFlatConditionsClause(filterConfig, params, paramIndex);
    if (flatResult.sql) {
      whereClause += ` AND (${flatResult.sql})`;
      paramIndex = flatResult.nextParamIndex;
    }
  }

  console.log('[ScheduledProcessor] Filter WHERE clause:', whereClause);
  console.log('[ScheduledProcessor] Filter params:', params);

  // Exclude records already enrolled in running executions
  whereClause += ` AND NOT EXISTS (
    SELECT 1 FROM "WorkflowExecution" we
    WHERE we.workflow_id = $${paramIndex}
      AND we.enrolled_record_id = r.record_id
      AND we.status IN ('running', 'paused')
  )`;
  params.push(workflowId);

  // Get matching records
  const recordsResult = await query(
    `SELECT r.record_id FROM "${tableName}" r WHERE ${whereClause} LIMIT 100`,
    params
  );

  // Get first step for this workflow
  const firstStepResult = await query(
    `SELECT record_id FROM "WorkflowStep"
     WHERE workflow_id = $1 AND parent_step_id IS NULL
     ORDER BY position ASC LIMIT 1`,
    [workflowId]
  );

  if (firstStepResult.rows.length === 0) {
    console.log('[ScheduledProcessor] Workflow has no steps:', workflowId);
    return 0;
  }

  const firstStepId = firstStepResult.rows[0].id;
  let enrolled = 0;

  for (const record of recordsResult.rows) {
    try {
      // Create execution directly (bypass trigger queue)
      const executionResult = await query(
        `INSERT INTO "WorkflowExecution"
         (workflow_id, tenant_id, enrolled_record_id, record_type, status, current_step_id, enrolled_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'running', $5, NOW(), NOW(), NOW())
         RETURNING record_id`,
        [workflowId, tenantId, record.id, objectType, firstStepId]
      );

      if (executionResult.rows.length > 0) {
        const executionId = executionResult.rows[0].id;

        // Queue to STEP queue directly
        await queueStepExecution(executionId, workflowId, tenantId);
        enrolled++;

        console.log('[ScheduledProcessor] Enrolled record:', record.id, 'execution:', executionId);
      }
    } catch (error) {
      console.error('[ScheduledProcessor] Error enrolling record:', record.id, error.message);
    }
  }

  return enrolled;
}

/**
 * Build SQL WHERE clause from HubSpot-style filter format
 * Root level is OR, sub-branches are AND containing filters
 */
function buildHubSpotFilterClause(filterConfig, params, paramIndex) {
  const rootType = (filterConfig.filterBranchType || 'OR').toUpperCase();
  const branches = filterConfig.filterBranches || [];

  if (branches.length === 0) {
    // If no branches but has filters at root level, evaluate directly
    if (filterConfig.filters && filterConfig.filters.length > 0) {
      return buildHubSpotFiltersClause(filterConfig.filters, params, paramIndex);
    }
    return { sql: null, nextParamIndex: paramIndex };
  }

  const branchClauses = [];

  for (const branch of branches) {
    const branchType = (branch.filterBranchType || 'AND').toUpperCase();
    const filters = branch.filters || [];
    const nestedBranches = branch.filterBranches || [];

    const clauseParts = [];

    // Build clause for filters in this branch
    if (filters.length > 0) {
      const filtersResult = buildHubSpotFiltersClause(filters, params, paramIndex);
      if (filtersResult.sql) {
        clauseParts.push(filtersResult.sql);
        paramIndex = filtersResult.nextParamIndex;
      }
    }

    // Recursively build clause for nested branches
    if (nestedBranches.length > 0) {
      const nestedResult = buildHubSpotFilterClause({ filterBranchType: branchType, filterBranches: nestedBranches }, params, paramIndex);
      if (nestedResult.sql) {
        clauseParts.push(nestedResult.sql);
        paramIndex = nestedResult.nextParamIndex;
      }
    }

    if (clauseParts.length > 0) {
      const joinedParts = clauseParts.join(` ${branchType} `);
      branchClauses.push(`(${joinedParts})`);
    }
  }

  if (branchClauses.length === 0) {
    return { sql: null, nextParamIndex: paramIndex };
  }

  const sql = branchClauses.join(` ${rootType} `);
  return { sql, nextParamIndex: paramIndex };
}

/**
 * Build SQL clause for a group of HubSpot-style filters (ANDed together)
 */
function buildHubSpotFiltersClause(filters, params, paramIndex) {
  if (!filters || filters.length === 0) {
    return { sql: null, nextParamIndex: paramIndex };
  }

  const clauses = [];

  for (const filter of filters) {
    // HubSpot uses 'property' instead of 'field'
    const columnName = sanitizeColumnName(filter.property || filter.field);
    if (!columnName) continue;

    const clause = buildConditionClause(
      columnName,
      filter.operator,
      filter.value,
      params,
      paramIndex,
      filter.highValue,
      filter.values
    );

    if (clause) {
      clauses.push(clause.sql);
      paramIndex = clause.nextParamIndex;
    }
  }

  if (clauses.length === 0) {
    return { sql: null, nextParamIndex: paramIndex };
  }

  // HubSpot filters within a branch are ANDed
  return { sql: clauses.join(' AND '), nextParamIndex: paramIndex };
}

/**
 * Build SQL clause from legacy BarkBase groups format
 */
function buildLegacyGroupsClause(filterConfig, params, paramIndex) {
  const groups = filterConfig.groups || [];
  const groupLogic = (filterConfig.groupLogic || 'OR').toUpperCase();

  if (groups.length === 0) {
    return { sql: null, nextParamIndex: paramIndex };
  }

  const groupClauses = [];

  for (const group of groups) {
    const conditions = group.conditions || [];
    const groupInternalLogic = (group.logic || 'AND').toUpperCase();

    if (conditions.length === 0) continue;

    const conditionClauses = [];

    for (const condition of conditions) {
      const columnName = sanitizeColumnName(condition.field);
      if (!columnName) continue;

      const clause = buildConditionClause(
        columnName,
        condition.operator,
        condition.value,
        params,
        paramIndex,
        condition.highValue,
        condition.values
      );

      if (clause) {
        conditionClauses.push(clause.sql);
        paramIndex = clause.nextParamIndex;
      }
    }

    if (conditionClauses.length > 0) {
      const joinedConditions = conditionClauses.join(` ${groupInternalLogic} `);
      groupClauses.push(`(${joinedConditions})`);
    }
  }

  if (groupClauses.length === 0) {
    return { sql: null, nextParamIndex: paramIndex };
  }

  return { sql: groupClauses.join(` ${groupLogic} `), nextParamIndex: paramIndex };
}

/**
 * Build SQL clause from flat conditions format
 */
function buildFlatConditionsClause(filterConfig, params, paramIndex) {
  const conditions = filterConfig.conditions || [];
  const logic = (filterConfig.logic || 'AND').toUpperCase();

  if (conditions.length === 0) {
    return { sql: null, nextParamIndex: paramIndex };
  }

  const clauses = [];

  for (const condition of conditions) {
    const columnName = sanitizeColumnName(condition.field);
    if (!columnName) continue;

    const clause = buildConditionClause(
      columnName,
      condition.operator,
      condition.value,
      params,
      paramIndex,
      condition.highValue,
      condition.values
    );

    if (clause) {
      clauses.push(clause.sql);
      paramIndex = clause.nextParamIndex;
    }
  }

  if (clauses.length === 0) {
    return { sql: null, nextParamIndex: paramIndex };
  }

  return { sql: clauses.join(` ${logic} `), nextParamIndex: paramIndex };
}

function sanitizeColumnName(name) {
  if (!name || typeof name !== 'string') return null;
  // Only allow alphanumeric and underscore
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Build SQL condition clause for a filter condition
 * Supports both HubSpot-style operators (IS_EQUAL_TO) and legacy (equals)
 * @param {string} columnName - Sanitized column name
 * @param {string} operator - Filter operator
 * @param {*} value - Filter value
 * @param {array} params - SQL params array to push values to
 * @param {number} paramIndex - Current parameter index
 * @param {*} highValue - High value for IS_BETWEEN operator
 * @param {array} values - Array of values for IS_ANY_OF, IS_NONE_OF operators
 * @returns {{ sql: string, nextParamIndex: number } | null}
 */
function buildConditionClause(columnName, operator, value, params, paramIndex, highValue = null, values = null) {
  // Normalize operator to uppercase for comparison
  const op = (operator || '').toUpperCase().replace(/-/g, '_');

  switch (op) {
    // Equality operators
    case 'EQUALS':
    case 'IS':
    case 'IS_EQUAL_TO':
    case 'EQ':
      params.push(value);
      return { sql: `r."${columnName}" = $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    case 'NOT_EQUALS':
    case 'IS_NOT':
    case 'IS_NOT_EQUAL_TO':
    case 'NEQ':
      params.push(value);
      return { sql: `r."${columnName}" != $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    // Multi-value operators
    case 'EQUALS_ANY':
    case 'IS_ANY_OF':
    case 'IS_EQUAL_TO_ANY':
    case 'IN':
      const anyOfVals = values || (Array.isArray(value) ? value : [value]);
      if (anyOfVals.length > 0) {
        const placeholders = anyOfVals.map((_, i) => `$${paramIndex + i}`).join(', ');
        params.push(...anyOfVals);
        return { sql: `r."${columnName}" IN (${placeholders})`, nextParamIndex: paramIndex + anyOfVals.length };
      }
      return null;

    case 'NOT_ANY_OF':
    case 'IS_NONE_OF':
    case 'NOT_IN':
      const noneOfVals = values || (Array.isArray(value) ? value : [value]);
      if (noneOfVals.length > 0) {
        const placeholders = noneOfVals.map((_, i) => `$${paramIndex + i}`).join(', ');
        params.push(...noneOfVals);
        return { sql: `r."${columnName}" NOT IN (${placeholders})`, nextParamIndex: paramIndex + noneOfVals.length };
      }
      return null;

    // String operators
    case 'CONTAINS':
      params.push(`%${value}%`);
      return { sql: `r."${columnName}" ILIKE $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    case 'NOT_CONTAINS':
    case 'DOES_NOT_CONTAIN':
      params.push(`%${value}%`);
      return { sql: `r."${columnName}" NOT ILIKE $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    case 'STARTS_WITH':
      params.push(`${value}%`);
      return { sql: `r."${columnName}" ILIKE $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    case 'ENDS_WITH':
      params.push(`%${value}`);
      return { sql: `r."${columnName}" ILIKE $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    // Empty/Known operators
    case 'IS_EMPTY':
    case 'IS_UNKNOWN':
      return { sql: `(r."${columnName}" IS NULL OR r."${columnName}" = '')`, nextParamIndex: paramIndex };

    case 'IS_NOT_EMPTY':
    case 'IS_KNOWN':
    case 'HAS_EVER_BEEN_ANY':
      return { sql: `(r."${columnName}" IS NOT NULL AND r."${columnName}" != '')`, nextParamIndex: paramIndex };

    // Numeric comparison operators
    case 'GREATER_THAN':
    case 'IS_GREATER_THAN':
    case 'GT':
      params.push(value);
      return { sql: `r."${columnName}" > $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    case 'LESS_THAN':
    case 'IS_LESS_THAN':
    case 'LT':
      params.push(value);
      return { sql: `r."${columnName}" < $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    case 'GREATER_THAN_OR_EQUAL':
    case 'GREATER_OR_EQUAL':
    case 'IS_GREATER_THAN_OR_EQUAL':
    case 'GTE':
      params.push(value);
      return { sql: `r."${columnName}" >= $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    case 'LESS_THAN_OR_EQUAL':
    case 'LESS_OR_EQUAL':
    case 'IS_LESS_THAN_OR_EQUAL':
    case 'LTE':
      params.push(value);
      return { sql: `r."${columnName}" <= $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    // Range operator
    case 'IS_BETWEEN':
    case 'BETWEEN':
      params.push(value);
      params.push(highValue);
      return {
        sql: `r."${columnName}" BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
        nextParamIndex: paramIndex + 2
      };

    // Date operators
    case 'IS_BEFORE':
    case 'BEFORE':
      params.push(value);
      return { sql: `r."${columnName}" < $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    case 'IS_AFTER':
    case 'AFTER':
      params.push(value);
      return { sql: `r."${columnName}" > $${paramIndex}`, nextParamIndex: paramIndex + 1 };

    case 'IS_BEFORE_DATE':
      params.push(value);
      return { sql: `r."${columnName}"::date < $${paramIndex}::date`, nextParamIndex: paramIndex + 1 };

    case 'IS_AFTER_DATE':
      params.push(value);
      return { sql: `r."${columnName}"::date > $${paramIndex}::date`, nextParamIndex: paramIndex + 1 };

    case 'IS_WITHIN_LAST':
      // value should be { value: number, unit: 'days'|'weeks'|'months' } or just number of days
      const daysAgo = typeof value === 'object' ? convertToDays(value) : Number(value);
      return {
        sql: `r."${columnName}" >= NOW() - INTERVAL '${daysAgo} days'`,
        nextParamIndex: paramIndex
      };

    case 'IS_WITHIN_NEXT':
      const daysAhead = typeof value === 'object' ? convertToDays(value) : Number(value);
      return {
        sql: `r."${columnName}" <= NOW() + INTERVAL '${daysAhead} days' AND r."${columnName}" >= NOW()`,
        nextParamIndex: paramIndex
      };

    case 'IS_MORE_THAN_DAYS_AGO':
      const moreThanDays = Number(value);
      return {
        sql: `r."${columnName}" < NOW() - INTERVAL '${moreThanDays} days'`,
        nextParamIndex: paramIndex
      };

    case 'IS_LESS_THAN_DAYS_AGO':
      const lessThanDays = Number(value);
      return {
        sql: `r."${columnName}" >= NOW() - INTERVAL '${lessThanDays} days'`,
        nextParamIndex: paramIndex
      };

    // Boolean operators
    case 'IS_TRUE':
      return { sql: `r."${columnName}" = true`, nextParamIndex: paramIndex };

    case 'IS_FALSE':
      return { sql: `r."${columnName}" = false`, nextParamIndex: paramIndex };

    default:
      console.warn('[ScheduledProcessor] Unknown operator:', operator);
      return null;
  }
}

/**
 * Convert period object to days
 */
function convertToDays(period) {
  const value = period.value || 0;
  const unit = (period.unit || 'days').toLowerCase();
  switch (unit) {
    case 'hours': return value / 24;
    case 'weeks': return value * 7;
    case 'months': return value * 30;
    case 'years': return value * 365;
    default: return value;
  }
}

/**
 * Find the next step after a given step
 */
async function findNextStep(workflowId, currentStepId, parentStepId, branchPath, currentPosition) {
  // Find next sibling at same level
  const nextSiblingResult = await query(
    `SELECT record_id FROM "WorkflowStep"
     WHERE workflow_id = $1
       AND COALESCE(parent_step_id::text, '') = $2
       AND COALESCE(branch_path, '') = $3
       AND position > $4
     ORDER BY position ASC
     LIMIT 1`,
    [
      workflowId,
      parentStepId || '',
      branchPath || '',
      currentPosition
    ]
  );

  if (nextSiblingResult.rows.length > 0) {
    return nextSiblingResult.rows[0].id;
  }

  // No more siblings - if we're in a branch, go to parent's next sibling
  if (parentStepId) {
    const parentResult = await query(
      `SELECT parent_step_id, branch_path, position FROM "WorkflowStep" WHERE id = $1`,
      [parentStepId]
    );

    if (parentResult.rows.length > 0) {
      const parent = parentResult.rows[0];
      return findNextStep(
        workflowId,
        parentStepId,
        parent.parent_step_id,
        parent.branch_path,
        parent.position
      );
    }
  }

  // No more steps
  return null;
}

/**
 * Get table name for object type
 */
function getTableName(objectType) {
  const tables = {
    pet: 'Pet',
    booking: 'Booking',
    owner: 'Owner',
    payment: 'Payment',
    invoice: 'Invoice',
    task: 'Task',
  };
  return tables[objectType] || null;
}

/**
 * Queue a step for execution
 */
async function queueStepExecution(executionId, workflowId, tenantId) {
  if (!STEP_QUEUE_URL) {
    console.warn('[ScheduledProcessor] WORKFLOW_STEP_QUEUE_URL not set');
    return;
  }

  await sqs.send(new SendMessageCommand({
    QueueUrl: STEP_QUEUE_URL,
    MessageBody: JSON.stringify({
      executionId,
      workflowId,
      tenantId,
      action: 'execute_next',
      timestamp: new Date().toISOString(),
    }),
  }));
}

/**
 * Queue a trigger event
 */
async function queueTriggerEvent(eventType, recordId, recordType, tenantId, eventData = {}) {
  if (!TRIGGER_QUEUE_URL) {
    console.warn('[ScheduledProcessor] WORKFLOW_TRIGGER_QUEUE_URL not set');
    return;
  }

  await sqs.send(new SendMessageCommand({
    QueueUrl: TRIGGER_QUEUE_URL,
    MessageBody: JSON.stringify({
      eventType,
      recordId,
      recordType,
      tenantId,
      eventData,
      timestamp: new Date().toISOString(),
    }),
  }));
}

// =============================================================================
// TIMING RESTRICTION HELPERS
// =============================================================================

/**
 * Check if current time is within allowed timing window
 * @param {object} timingConfig - Timing configuration
 * @returns {{ allowed: boolean, nextAllowedTime?: Date, reason?: string }}
 */
function checkTimingRestrictions(timingConfig) {
  if (!timingConfig || !timingConfig.enabled) {
    return { allowed: true };
  }

  const {
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime = '09:00',
    endTime = '17:00',
    timezone = 'America/New_York',
  } = timingConfig;

  // Get current time in the specified timezone
  const now = new Date();
  const currentTimeInTz = getTimeInTimezone(now, timezone);

  // Check if current day is allowed
  const currentDay = getDayName(currentTimeInTz);
  const isDayAllowed = days.map(d => d.toLowerCase()).includes(currentDay.toLowerCase());

  // Parse start and end times
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const currentHour = currentTimeInTz.getHours();
  const currentMin = currentTimeInTz.getMinutes();

  // Convert to minutes for easier comparison
  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const isTimeAllowed = currentMinutes >= startMinutes && currentMinutes < endMinutes;

  if (isDayAllowed && isTimeAllowed) {
    return { allowed: true };
  }

  // Calculate next allowed time
  const nextAllowedTime = getNextAllowedTime(timingConfig, now);

  let reason;
  if (!isDayAllowed) {
    reason = `Current day (${currentDay}) is not in allowed days: ${days.join(', ')}`;
  } else {
    reason = `Current time (${formatTime(currentHour, currentMin)}) is outside allowed hours: ${startTime} - ${endTime} (${timezone})`;
  }

  return {
    allowed: false,
    nextAllowedTime,
    reason,
  };
}

/**
 * Calculate the next datetime when execution is allowed
 */
function getNextAllowedTime(timingConfig, fromDate = new Date()) {
  const {
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime = '09:00',
    endTime = '17:00',
    timezone = 'America/New_York',
  } = timingConfig;

  const [startHour, startMin] = startTime.split(':').map(Number);

  // Normalize days to lowercase
  const allowedDays = days.map(d => d.toLowerCase());

  // Get current time in timezone
  const currentTimeInTz = getTimeInTimezone(fromDate, timezone);
  const currentDay = getDayName(currentTimeInTz);
  const currentHour = currentTimeInTz.getHours();
  const currentMin = currentTimeInTz.getMinutes();

  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;

  // Check if today is allowed and if we're before the end time
  if (allowedDays.includes(currentDay.toLowerCase())) {
    if (currentMinutes < startMinutes) {
      return createDateTimeInTimezone(currentTimeInTz, startHour, startMin, timezone);
    }
  }

  // Need to find next allowed day
  const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayIndex = dayOrder.indexOf(currentDay.toLowerCase());

  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const targetDayIndex = (currentDayIndex + daysAhead) % 7;
    const targetDay = dayOrder[targetDayIndex];

    if (allowedDays.includes(targetDay)) {
      const targetDate = new Date(currentTimeInTz);
      targetDate.setDate(targetDate.getDate() + daysAhead);
      return createDateTimeInTimezone(targetDate, startHour, startMin, timezone);
    }
  }

  // Fallback
  const tomorrow = new Date(currentTimeInTz);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return createDateTimeInTimezone(tomorrow, startHour, startMin, timezone);
}

/**
 * Get current time in a specific timezone
 */
function getTimeInTimezone(date, timezone) {
  try {
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    const getPart = (type) => parts.find(p => p.type === type)?.value;

    const year = parseInt(getPart('year'));
    const month = parseInt(getPart('month')) - 1;
    const day = parseInt(getPart('day'));
    const hour = parseInt(getPart('hour'));
    const minute = parseInt(getPart('minute'));
    const second = parseInt(getPart('second'));

    return new Date(year, month, day, hour, minute, second);
  } catch (e) {
    console.error('[ScheduledProcessor] Timezone error:', e);
    return date;
  }
}

/**
 * Create a datetime in a specific timezone and convert to UTC
 */
function createDateTimeInTimezone(baseDate, hour, minute, timezone) {
  try {
    const year = baseDate.getFullYear();
    const month = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');
    const hourStr = String(hour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');

    const dateStr = `${year}-${month}-${day}T${hourStr}:${minStr}:00`;

    const targetDate = new Date(dateStr);
    const utcDate = new Date(targetDate.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }));
    const offset = utcDate - tzDate;

    return new Date(targetDate.getTime() + offset);
  } catch (e) {
    console.error('[ScheduledProcessor] Timezone creation error:', e);
    const result = new Date(baseDate);
    result.setHours(hour, minute, 0, 0);
    return result;
  }
}

/**
 * Get day name from date
 */
function getDayName(date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Format time as HH:MM
 */
function formatTime(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
