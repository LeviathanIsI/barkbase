/**
 * Workflow Trigger Evaluator Service
 *
 * Evaluates active workflow triggers when records are created or updated.
 * Enrolls matching records into appropriate workflows.
 *
 * Trigger Types:
 * - record_created: When a new record is created
 * - record_updated: When a record is updated
 * - field_changed: When a specific field value changes
 * - scheduled: Time-based triggers (handled separately)
 * - manual: Manual enrollment only (no automatic trigger)
 */

const { PrismaClient } = require('@prisma/client');
const { evaluateConditions } = require('./workflow-condition-evaluator');

let prisma;
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * Evaluate triggers for a record event
 * @param {Object} params
 * @param {string} params.tenantId - The tenant ID
 * @param {string} params.recordType - Type of record (pet, contact, booking, etc.)
 * @param {string} params.recordId - The record ID
 * @param {string} params.eventType - Event type (created, updated)
 * @param {Object} params.record - Current record data
 * @param {Object} params.previousRecord - Previous record data (for updates)
 * @param {string[]} params.changedFields - List of changed field names (for updates)
 * @returns {Promise<Object[]>} - Array of enrollment results
 */
async function evaluateTriggers({
  tenantId,
  recordType,
  recordId,
  eventType,
  record,
  previousRecord,
  changedFields = [],
}) {
  const db = getPrisma();

  console.log(`[TriggerEvaluator] Evaluating triggers for ${recordType}/${recordId} (${eventType})`);

  // Find all active workflows for this tenant and record type
  const workflows = await db.workflow.findMany({
    where: {
      tenant_id: tenantId,
      object_type: recordType,
      status: 'active',
      deleted_at: null,
    },
    include: {
      steps: {
        where: { is_entry_point: true },
        take: 1,
      },
    },
  });

  console.log(`[TriggerEvaluator] Found ${workflows.length} active workflows for ${recordType}`);

  const results = [];

  for (const workflow of workflows) {
    const entryCondition = workflow.entry_condition || {};
    const settings = workflow.settings || {};

    // Check if trigger type matches
    const triggerMatch = checkTriggerType(entryCondition, eventType, changedFields);

    if (!triggerMatch) {
      continue;
    }

    // Add record type to record for condition evaluation
    const enrichedRecord = { ...record, _type: recordType };

    // Evaluate entry conditions
    const conditionsMatch = evaluateConditions(entryCondition.filters, enrichedRecord);

    if (!conditionsMatch) {
      console.log(`[TriggerEvaluator] Workflow ${workflow.id} conditions not met`);
      continue;
    }

    // Check if record is already enrolled
    const existingExecution = await db.workflowExecution.findFirst({
      where: {
        workflow_id: workflow.id,
        record_id: recordId,
        record_type: recordType,
        status: { in: ['running', 'waiting'] },
      },
    });

    if (existingExecution) {
      console.log(`[TriggerEvaluator] Record already enrolled in workflow ${workflow.id}`);
      results.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        skipped: true,
        reason: 'Already enrolled',
      });
      continue;
    }

    // Check re-enrollment settings
    if (!settings.allowReenrollment) {
      const previousExecution = await db.workflowExecution.findFirst({
        where: {
          workflow_id: workflow.id,
          record_id: recordId,
          record_type: recordType,
        },
        orderBy: { created_at: 'desc' },
      });

      if (previousExecution) {
        // Check re-enrollment delay
        const delayDays = settings.reenrollmentDelayDays || 0;
        if (delayDays > 0) {
          const lastEnrollment = new Date(previousExecution.created_at);
          const minNextEnrollment = new Date(lastEnrollment);
          minNextEnrollment.setDate(minNextEnrollment.getDate() + delayDays);

          if (new Date() < minNextEnrollment) {
            console.log(`[TriggerEvaluator] Re-enrollment delay not met for workflow ${workflow.id}`);
            results.push({
              workflowId: workflow.id,
              workflowName: workflow.name,
              skipped: true,
              reason: `Re-enrollment delay not met (${delayDays} days)`,
            });
            continue;
          }
        } else if (!settings.allowReenrollment) {
          console.log(`[TriggerEvaluator] Re-enrollment not allowed for workflow ${workflow.id}`);
          results.push({
            workflowId: workflow.id,
            workflowName: workflow.name,
            skipped: true,
            reason: 'Re-enrollment not allowed',
          });
          continue;
        }
      }
    }

    // Check unenroll from other workflows setting
    if (settings.unenrollFromOtherWorkflows) {
      await unenrollFromOtherWorkflows(db, tenantId, recordType, recordId, workflow.id);
    }

    // Enroll the record
    const enrollResult = await enrollRecord(db, {
      tenantId,
      workflowId: workflow.id,
      recordType,
      recordId,
      firstStep: workflow.steps[0],
      triggerType: eventType,
    });

    results.push({
      workflowId: workflow.id,
      workflowName: workflow.name,
      enrolled: true,
      executionId: enrollResult.executionId,
    });
  }

  return results;
}

/**
 * Check if the event type matches the workflow's trigger type
 */
function checkTriggerType(entryCondition, eventType, changedFields) {
  const triggerType = entryCondition.triggerType || 'record_created';

  switch (triggerType) {
    case 'record_created':
      return eventType === 'created';

    case 'record_updated':
      return eventType === 'updated';

    case 'record_created_or_updated':
      return eventType === 'created' || eventType === 'updated';

    case 'field_changed':
      // Check if any of the specified fields changed
      const watchedFields = entryCondition.watchedFields || [];
      if (watchedFields.length === 0) {
        return eventType === 'updated';
      }
      return eventType === 'updated' && watchedFields.some(f => changedFields.includes(f));

    case 'manual':
      // Manual triggers never match automatic events
      return false;

    case 'scheduled':
      // Scheduled triggers are handled separately
      return false;

    default:
      // Default to record_created for backwards compatibility
      return eventType === 'created';
  }
}

/**
 * Enroll a record in a workflow
 */
async function enrollRecord(db, { tenantId, workflowId, recordType, recordId, firstStep, triggerType }) {
  // Create execution
  const execution = await db.workflowExecution.create({
    data: {
      tenant_id: tenantId,
      workflow_id: workflowId,
      record_type: recordType,
      record_id: recordId,
      status: 'running',
      current_step_id: firstStep?.id,
      started_at: new Date(),
      metadata: {
        trigger_type: triggerType,
        enrolled_at: new Date().toISOString(),
      },
    },
  });

  // Log enrollment
  await db.workflowExecutionLog.create({
    data: {
      execution_id: execution.id,
      step_id: firstStep?.id,
      event_type: 'enrolled',
      action_type: null,
      status: 'success',
      message: `Record enrolled via ${triggerType} trigger`,
    },
  });

  // Queue first step for processing
  if (firstStep) {
    const { queueStepExecution } = require('../api/workflows');
    await queueStepExecution(execution.id, workflowId, tenantId, firstStep.id);
  }

  console.log(`[TriggerEvaluator] Enrolled ${recordType}/${recordId} in workflow ${workflowId}`);

  return { executionId: execution.id };
}

/**
 * Unenroll record from all other active workflows
 */
async function unenrollFromOtherWorkflows(db, tenantId, recordType, recordId, exceptWorkflowId) {
  const activeExecutions = await db.workflowExecution.findMany({
    where: {
      tenant_id: tenantId,
      record_type: recordType,
      record_id: recordId,
      status: { in: ['running', 'waiting'] },
      workflow_id: { not: exceptWorkflowId },
    },
  });

  for (const execution of activeExecutions) {
    await db.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'cancelled',
        ended_at: new Date(),
        metadata: {
          ...execution.metadata,
          unenrolled_reason: 'new_workflow_enrollment',
          unenrolled_at: new Date().toISOString(),
        },
      },
    });

    await db.workflowExecutionLog.create({
      data: {
        execution_id: execution.id,
        step_id: execution.current_step_id,
        event_type: 'unenrolled',
        action_type: null,
        status: 'success',
        message: 'Unenrolled due to enrollment in another workflow',
      },
    });
  }

  if (activeExecutions.length > 0) {
    console.log(`[TriggerEvaluator] Unenrolled from ${activeExecutions.length} other workflows`);
  }
}

/**
 * Process scheduled triggers
 * Called by a periodic worker (e.g., every minute)
 */
async function processScheduledTriggers() {
  const db = getPrisma();
  const now = new Date();

  // Find workflows with scheduled triggers that are due
  const workflows = await db.workflow.findMany({
    where: {
      status: 'active',
      deleted_at: null,
      entry_condition: {
        path: ['triggerType'],
        equals: 'scheduled',
      },
    },
    include: {
      steps: {
        where: { is_entry_point: true },
        take: 1,
      },
    },
  });

  console.log(`[TriggerEvaluator] Checking ${workflows.length} scheduled workflows`);

  for (const workflow of workflows) {
    const schedule = workflow.entry_condition?.schedule;
    if (!schedule) continue;

    // Check if schedule is due
    const isDue = checkScheduleIsDue(schedule, now, workflow.last_triggered_at);

    if (!isDue) continue;

    console.log(`[TriggerEvaluator] Scheduled trigger due for workflow ${workflow.id}`);

    // Find all records matching the filter conditions
    const records = await findMatchingRecords(
      db,
      workflow.tenant_id,
      workflow.object_type,
      workflow.entry_condition.filters
    );

    console.log(`[TriggerEvaluator] Found ${records.length} matching records`);

    for (const record of records) {
      // Check if already enrolled
      const existingExecution = await db.workflowExecution.findFirst({
        where: {
          workflow_id: workflow.id,
          record_id: record.id,
          status: { in: ['running', 'waiting'] },
        },
      });

      if (existingExecution) continue;

      // Enroll the record
      await enrollRecord(db, {
        tenantId: workflow.tenant_id,
        workflowId: workflow.id,
        recordType: workflow.object_type,
        recordId: record.id,
        firstStep: workflow.steps[0],
        triggerType: 'scheduled',
      });
    }

    // Update last triggered time
    await db.workflow.update({
      where: { id: workflow.id },
      data: { last_triggered_at: now },
    });
  }
}

/**
 * Check if a schedule is due
 */
function checkScheduleIsDue(schedule, now, lastTriggered) {
  const { frequency, time, dayOfWeek, dayOfMonth } = schedule;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const scheduledHour = parseInt(time?.split(':')[0] || '9');
  const scheduledMinute = parseInt(time?.split(':')[1] || '0');

  // Check if we're within the trigger window (within 1 minute)
  if (currentHour !== scheduledHour || Math.abs(currentMinute - scheduledMinute) > 1) {
    return false;
  }

  // Check if already triggered today
  if (lastTriggered) {
    const lastDate = new Date(lastTriggered);
    if (lastDate.toDateString() === now.toDateString()) {
      return false;
    }
  }

  switch (frequency) {
    case 'daily':
      return true;

    case 'weekly':
      const currentDay = now.getDay();
      const targetDays = Array.isArray(dayOfWeek) ? dayOfWeek : [dayOfWeek];
      return targetDays.includes(currentDay);

    case 'monthly':
      const currentDayOfMonth = now.getDate();
      return currentDayOfMonth === dayOfMonth;

    default:
      return false;
  }
}

/**
 * Find records matching filter conditions
 */
async function findMatchingRecords(db, tenantId, recordType, filters) {
  // Build Prisma where clause from filters
  // This is a simplified version - production would need more sophisticated query building
  const modelMap = {
    pet: 'pet',
    contact: 'contact',
    booking: 'booking',
    invoice: 'invoice',
    payment: 'payment',
    task: 'task',
  };

  const modelName = modelMap[recordType];
  if (!modelName || !db[modelName]) {
    console.error(`[TriggerEvaluator] Unknown record type: ${recordType}`);
    return [];
  }

  // For now, fetch all records and filter in memory
  // In production, this should build proper Prisma queries
  const allRecords = await db[modelName].findMany({
    where: { tenant_id: tenantId },
    take: 1000, // Limit to prevent memory issues
  });

  // Filter using condition evaluator
  return allRecords.filter(record => {
    const enrichedRecord = { ...record, _type: recordType };
    return evaluateConditions(filters, enrichedRecord);
  });
}

/**
 * Lambda handler for EventBridge scheduled events
 */
async function scheduledHandler(event) {
  console.log('[TriggerEvaluator] Processing scheduled triggers');
  await processScheduledTriggers();
  return { statusCode: 200 };
}

/**
 * Lambda handler for record change events (via EventBridge or SNS)
 */
async function recordChangeHandler(event) {
  const results = [];

  for (const record of event.Records || [event]) {
    let payload;

    // Parse payload based on source
    if (record.body) {
      payload = JSON.parse(record.body); // SQS
    } else if (record.Sns) {
      payload = JSON.parse(record.Sns.Message); // SNS
    } else {
      payload = record.detail || record; // EventBridge or direct
    }

    const result = await evaluateTriggers({
      tenantId: payload.tenantId,
      recordType: payload.recordType,
      recordId: payload.recordId,
      eventType: payload.eventType,
      record: payload.record,
      previousRecord: payload.previousRecord,
      changedFields: payload.changedFields,
    });

    results.push(...result);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ enrollments: results }),
  };
}

module.exports = {
  evaluateTriggers,
  processScheduledTriggers,
  scheduledHandler,
  recordChangeHandler,
  // Export for testing
  checkTriggerType,
  enrollRecord,
  unenrollFromOtherWorkflows,
};
