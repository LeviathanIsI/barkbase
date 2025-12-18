/**
 * Workflow Event Emitter
 *
 * Emits record change events to trigger workflow evaluations.
 * Works with SQS, EventBridge, or local in-memory queue for development.
 */

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// Environment configuration
const WORKFLOW_TRIGGER_QUEUE_URL = process.env.WORKFLOW_TRIGGER_QUEUE_URL;
const USE_EVENTBRIDGE = process.env.USE_EVENTBRIDGE === 'true';

// In-memory queue for local development
const localQueue = [];
let isProcessingLocalQueue = false;

/**
 * Emit a record change event for workflow trigger evaluation
 * @param {Object} event
 * @param {string} event.tenantId - The tenant ID
 * @param {string} event.recordType - Type of record
 * @param {string} event.recordId - The record ID
 * @param {string} event.eventType - Event type (created, updated, deleted)
 * @param {Object} event.record - Current record data
 * @param {Object} event.previousRecord - Previous record data (for updates)
 * @param {string[]} event.changedFields - List of changed fields
 */
async function emitRecordChange(event) {
  const payload = {
    tenantId: event.tenantId,
    recordType: event.recordType,
    recordId: event.recordId,
    eventType: event.eventType,
    record: event.record,
    previousRecord: event.previousRecord,
    changedFields: event.changedFields || [],
    timestamp: new Date().toISOString(),
  };

  console.log(`[WorkflowEvents] Emitting ${event.eventType} event for ${event.recordType}/${event.recordId}`);

  // Try SQS first
  if (WORKFLOW_TRIGGER_QUEUE_URL) {
    return await emitToSqs(payload);
  }

  // Try EventBridge
  if (USE_EVENTBRIDGE) {
    return await emitToEventBridge(payload);
  }

  // Local development - process immediately
  return await emitLocal(payload);
}

/**
 * Emit to SQS
 */
async function emitToSqs(payload) {
  const client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

  const command = new SendMessageCommand({
    QueueUrl: WORKFLOW_TRIGGER_QUEUE_URL,
    MessageBody: JSON.stringify(payload),
    MessageGroupId: payload.tenantId, // Group by tenant for FIFO
    MessageDeduplicationId: `${payload.recordType}-${payload.recordId}-${payload.timestamp}`,
  });

  await client.send(command);

  return { queued: true, method: 'sqs' };
}

/**
 * Emit to EventBridge
 */
async function emitToEventBridge(payload) {
  const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

  const client = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });

  const command = new PutEventsCommand({
    Entries: [
      {
        Source: 'barkbase.records',
        DetailType: `record.${payload.eventType}`,
        Detail: JSON.stringify(payload),
        EventBusName: process.env.EVENT_BUS_NAME || 'default',
      },
    ],
  });

  await client.send(command);

  return { queued: true, method: 'eventbridge' };
}

/**
 * Process locally for development
 */
async function emitLocal(payload) {
  // Add to local queue
  localQueue.push(payload);

  // Start processing if not already
  if (!isProcessingLocalQueue) {
    processLocalQueue();
  }

  return { queued: true, method: 'local' };
}

/**
 * Process local queue
 */
async function processLocalQueue() {
  if (isProcessingLocalQueue) return;

  isProcessingLocalQueue = true;

  try {
    while (localQueue.length > 0) {
      const payload = localQueue.shift();

      try {
        const { evaluateTriggers } = require('../services/workflow-trigger-evaluator');
        await evaluateTriggers(payload);
      } catch (error) {
        console.error('[WorkflowEvents] Error processing local event:', error);
      }
    }
  } finally {
    isProcessingLocalQueue = false;
  }
}

/**
 * Prisma middleware to automatically emit record change events
 * @param {Object} prisma - Prisma client
 */
function setupWorkflowEventMiddleware(prisma) {
  // Models that can trigger workflows
  const workflowEnabledModels = ['Pet', 'Contact', 'Booking', 'Invoice', 'Payment', 'Task'];

  prisma.$use(async (params, next) => {
    // Only process relevant models
    if (!workflowEnabledModels.includes(params.model)) {
      return next(params);
    }

    const modelType = params.model.toLowerCase();

    // Handle creates
    if (params.action === 'create') {
      const result = await next(params);

      if (result && result.tenant_id) {
        await emitRecordChange({
          tenantId: result.tenant_id,
          recordType: modelType,
          recordId: result.id,
          eventType: 'created',
          record: result,
        });
      }

      return result;
    }

    // Handle updates
    if (params.action === 'update') {
      // Fetch previous record first
      let previousRecord;
      try {
        previousRecord = await prisma[modelType].findUnique({
          where: params.args.where,
        });
      } catch (e) {
        // Ignore if we can't fetch previous
      }

      const result = await next(params);

      if (result && result.tenant_id) {
        // Determine changed fields
        const changedFields = [];
        if (previousRecord) {
          for (const key of Object.keys(params.args.data || {})) {
            if (previousRecord[key] !== result[key]) {
              changedFields.push(key);
            }
          }
        }

        await emitRecordChange({
          tenantId: result.tenant_id,
          recordType: modelType,
          recordId: result.id,
          eventType: 'updated',
          record: result,
          previousRecord,
          changedFields,
        });
      }

      return result;
    }

    // Handle deletes
    if (params.action === 'delete') {
      // Fetch record before delete
      let deletedRecord;
      try {
        deletedRecord = await prisma[modelType].findUnique({
          where: params.args.where,
        });
      } catch (e) {
        // Ignore
      }

      const result = await next(params);

      if (deletedRecord && deletedRecord.tenant_id) {
        await emitRecordChange({
          tenantId: deletedRecord.tenant_id,
          recordType: modelType,
          recordId: deletedRecord.id,
          eventType: 'deleted',
          record: deletedRecord,
        });
      }

      return result;
    }

    return next(params);
  });
}

/**
 * Compare two objects and return changed fields
 */
function getChangedFields(previous, current) {
  const changed = [];

  if (!previous || !current) return changed;

  for (const key of Object.keys(current)) {
    if (key.startsWith('_')) continue; // Skip internal fields

    const prevValue = previous[key];
    const currValue = current[key];

    // Handle dates
    if (prevValue instanceof Date || currValue instanceof Date) {
      if (new Date(prevValue).getTime() !== new Date(currValue).getTime()) {
        changed.push(key);
      }
      continue;
    }

    // Handle objects/arrays
    if (typeof prevValue === 'object' || typeof currValue === 'object') {
      if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        changed.push(key);
      }
      continue;
    }

    // Simple comparison
    if (prevValue !== currValue) {
      changed.push(key);
    }
  }

  return changed;
}

module.exports = {
  emitRecordChange,
  setupWorkflowEventMiddleware,
  getChangedFields,
  // For testing
  localQueue,
  processLocalQueue,
};
