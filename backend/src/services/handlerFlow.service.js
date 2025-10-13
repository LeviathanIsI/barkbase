const crypto = require('crypto');
const { forTenant } = require('../lib/tenantPrisma');
const prisma = require('../config/prisma');

// Flow statuses
const STATUS = {
  DRAFT: 'draft',
  ON: 'on',
  OFF: 'off',
};

// Run statuses
const RUN_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  PAUSED: 'paused',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled',
};

// Trigger types
const TRIGGER_TYPES = {
  MANUAL: 'manual',
  CRITERIA: 'criteria',
  SCHEDULE: 'schedule',
};

/**
 * Validate flow definition structure
 */
const validateFlowDefinition = (definition) => {
  if (!definition) {
    throw Object.assign(new Error('Flow definition is required'), { statusCode: 400 });
  }

  if (!definition.meta || !definition.meta.name) {
    throw Object.assign(new Error('Flow definition.meta.name is required'), { statusCode: 400 });
  }

  if (!definition.trigger) {
    throw Object.assign(new Error('Flow definition.trigger is required'), { statusCode: 400 });
  }

  if (!Array.isArray(definition.nodes) || definition.nodes.length === 0) {
    throw Object.assign(new Error('Flow definition must have at least one node'), { statusCode: 400 });
  }

  if (!Array.isArray(definition.edges)) {
    throw Object.assign(new Error('Flow definition.edges must be an array'), { statusCode: 400 });
  }

  // Ensure there's a trigger node
  const triggerNode = definition.nodes.find(n => n.type === 'trigger');
  if (!triggerNode) {
    throw Object.assign(new Error('Flow must have a trigger node'), { statusCode: 400 });
  }

  return true;
};

/**
 * Create a new draft flow
 */
const createFlow = async ({ tenantId, name, description, definition }) => {
  validateFlowDefinition(definition);

  const db = forTenant(tenantId);

  const flow = await db.handlerFlow.create({
    data: {
      name: name || definition.meta.name,
      description: description || definition.meta.description || null,
      status: STATUS.DRAFT,
      definition,
      version: 1,
    },
  });

  return flow;
};

/**
 * Update an existing flow
 */
const updateFlow = async ({ tenantId, flowId, name, description, status, definition }) => {
  const db = forTenant(tenantId);

  // If updating definition, validate it
  if (definition) {
    validateFlowDefinition(definition);
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (definition !== undefined) updateData.definition = definition;

  const flow = await db.handlerFlow.update({
    where: { id: flowId },
    data: updateData,
  });

  return flow;
};

/**
 * Publish a flow (turn it on)
 */
const publishFlow = async ({ tenantId, flowId }) => {
  const db = forTenant(tenantId);

  const flow = await db.handlerFlow.findUnique({
    where: { id: flowId },
  });

  if (!flow) {
    throw Object.assign(new Error('Flow not found'), { statusCode: 404 });
  }

  // Validate definition before publishing
  validateFlowDefinition(flow.definition);

  const updated = await db.handlerFlow.update({
    where: { id: flowId },
    data: {
      status: STATUS.ON,
      lastPublishedAt: new Date(),
    },
  });

  return updated;
};

/**
 * List flows for a tenant
 */
const listFlows = async ({ tenantId, status }) => {
  const db = forTenant(tenantId);

  const where = {};
  if (status) {
    where.status = status;
  }

  const flows = await db.handlerFlow.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      version: true,
      lastPublishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return flows;
};

/**
 * Get a flow by ID with full definition
 */
const getFlowById = async ({ tenantId, flowId }) => {
  const db = forTenant(tenantId);

  const flow = await db.handlerFlow.findUnique({
    where: { id: flowId },
  });

  if (!flow) {
    throw Object.assign(new Error('Flow not found'), { statusCode: 404 });
  }

  return flow;
};

/**
 * Get published flows that match an event type
 */
const getPublishedFlowsByEvent = async ({ tenantId, eventType }) => {
  const db = forTenant(tenantId);

  const flows = await db.handlerFlow.findMany({
    where: {
      status: STATUS.ON,
    },
  });

  // Filter flows that have criteria matching this event
  const matchingFlows = flows.filter(flow => {
    const trigger = flow.definition?.trigger;
    if (!trigger) return false;

    // Check if any criteria group references this event
    if (trigger.criteriaGroups && trigger.criteriaGroups.length > 0) {
      return trigger.criteriaGroups.some(group =>
        group.criteria && group.criteria.some(c =>
          c.type === 'event-condition' && c.eventName === eventType
        )
      );
    }

    return false;
  });

  return matchingFlows;
};

/**
 * Delete a flow
 */
const deleteFlow = async ({ tenantId, flowId }) => {
  const db = forTenant(tenantId);

  // Check if flow exists
  const flow = await db.handlerFlow.findUnique({
    where: { id: flowId },
  });

  if (!flow) {
    throw Object.assign(new Error('Flow not found'), { statusCode: 404 });
  }

  // Delete the flow (cascade will handle runs, logs, jobs)
  await db.handlerFlow.delete({
    where: { id: flowId },
  });

  return { success: true };
};

/**
 * Create a run for a flow
 */
const createRun = async ({
  tenantId,
  flowId,
  payload,
  idempotencyKey,
  triggerType = TRIGGER_TYPES.MANUAL,
}) => {
  const db = forTenant(tenantId);

  // Get the flow
  const flow = await db.handlerFlow.findUnique({
    where: { id: flowId },
  });

  if (!flow) {
    throw Object.assign(new Error('Flow not found'), { statusCode: 404 });
  }

  if (flow.status !== STATUS.ON && triggerType !== TRIGGER_TYPES.MANUAL) {
    throw Object.assign(new Error('Flow must be published to run'), { statusCode: 400 });
  }

  // Generate idempotency key if not provided
  const runKey = idempotencyKey ||
    `${flowId}:${flow.version}:${crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex')}`;

  // Check for existing run with same idempotency key
  if (runKey) {
    const existing = await db.handlerRun.findFirst({
      where: {
        idempotencyKey: runKey,
      },
    });

    if (existing) {
      return { created: false, runId: existing.id, run: existing };
    }
  }

  // Find the first non-trigger node to start execution
  const nodes = flow.definition.nodes || [];
  const sortedNodes = nodes
    .filter(n => n.type !== 'trigger')
    .sort((a, b) => (a.data?.stepIndex || 0) - (b.data?.stepIndex || 0));

  const startNodeId = sortedNodes[0]?.id || null;

  // Build initial context
  const context = {
    triggerType,
    payload: payload || {},
    now: new Date().toISOString(),
    actions: [],
  };

  // Create the run
  const run = await db.handlerRun.create({
    data: {
      flowId,
      status: RUN_STATUS.QUEUED,
      currentNodeId: startNodeId,
      context,
      idempotencyKey: runKey,
      triggerType,
      reEnrollCount: 0,
      retryCount: 0,
    },
  });

  // Create initial job
  if (startNodeId) {
    await db.handlerJob.create({
      data: {
        runId: run.id,
        nodeId: startNodeId,
        dueAt: new Date(),
        attempts: 0,
        maxAttempts: 3,
        payload: {},
      },
    });
  }

  return { created: true, runId: run.id, run };
};

/**
 * Manual run trigger
 */
const manualRun = async ({ tenantId, flowId, payload, idempotencyKey }) => {
  return createRun({
    tenantId,
    flowId,
    payload,
    idempotencyKey,
    triggerType: TRIGGER_TYPES.MANUAL,
  });
};

const hashEventPayload = (eventType, payload = {}) =>
  crypto
    .createHash('sha256')
    .update(`${eventType}:${JSON.stringify(payload)}`)
    .digest('hex')
    .substring(0, 24);

const handleEvent = async ({ tenantId, eventType, payload, idempotencyKey }) => {
  if (!eventType) {
    throw Object.assign(new Error('eventType is required'), { statusCode: 400 });
  }

  const db = forTenant(tenantId);
  const eventKey = idempotencyKey || hashEventPayload(eventType, payload);

  let eventRecord;
  try {
    eventRecord = await db.handlerEvent.create({
      data: {
        tenantId,
        eventType,
        idempotencyKey: eventKey,
        payload: payload || {},
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await db.handlerEvent.findFirst({
        where: { tenantId, idempotencyKey: eventKey },
      });

      return {
        eventId: existing?.id,
        runs: (existing?.runs || []),
        deduplicated: true,
      };
    }

    throw error;
  }

  const flows = await getPublishedFlowsByEvent({ tenantId, eventType });
  const runSummaries = [];

  for (const flow of flows) {
    try {
      const runResult = await createRun({
        tenantId,
        flowId: flow.id,
        payload: payload || {},
        idempotencyKey: `${eventKey}:${flow.id}`,
        triggerType: TRIGGER_TYPES.CRITERIA,
      });

      runSummaries.push({
        flowId: flow.id,
        runId: runResult.runId,
        created: runResult.created,
      });
    } catch (error) {
      runSummaries.push({
        flowId: flow.id,
        error: error.message,
      });
    }
  }

  await db.handlerEvent.update({
    where: { id: eventRecord.id },
    data: {
      runs: runSummaries,
    },
  });

  return {
    eventId: eventRecord.id,
    runs: runSummaries,
    deduplicated: false,
  };
};

/**
 * Get run logs
 */
const getRunLogs = async ({ tenantId, runId }) => {
  const db = forTenant(tenantId);

  // Verify run exists
  const run = await db.handlerRun.findUnique({
    where: { id: runId },
  });

  if (!run) {
    throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  }

  const logs = await db.handlerRunLog.findMany({
    where: { runId },
    orderBy: { ts: 'asc' },
  });

  return logs;
};

/**
 * Get run with flow details
 */
const getRunWithFlow = async ({ tenantId, runId }) => {
  const db = forTenant(tenantId);

  const run = await db.handlerRun.findUnique({
    where: { id: runId },
    include: {
      flow: true,
    },
  });

  if (!run) {
    throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  }

  return run;
};

/**
 * Get run by ID
 */
const getRunById = async ({ tenantId, runId }) => {
  const db = forTenant(tenantId);

  const run = await db.handlerRun.findUnique({
    where: { id: runId },
  });

  if (!run) {
    throw Object.assign(new Error('Run not found'), { statusCode: 404 });
  }

  return run;
};

/**
 * Append a log entry to a run
 */
const appendRunLog = async ({ tenantId, runId, nodeId, level, message, details }) => {
  const db = forTenant(tenantId);

  const log = await db.handlerRunLog.create({
    data: {
      runId,
      nodeId: nodeId || null,
      level,
      message,
      details: details || null,
    },
  });

  return log;
};

/**
 * Update a run
 */
const updateRun = async ({ tenantId, runId, patch }) => {
  const db = forTenant(tenantId);

  const run = await db.handlerRun.update({
    where: { id: runId },
    data: patch,
  });

  return run;
};

/**
 * Claim next job for processing (with locking)
 */
const claimNextJob = async ({ workerId }) => {
  // Use base prisma for job claiming (no tenant context needed here)
  // Use transaction for atomic claim

  const now = new Date();

  // Find next available job
  const job = await prisma.handlerJob.findFirst({
    where: {
      dueAt: { lte: now },
      OR: [
        { lockedBy: null },
        {
          lockedAt: {
            lt: new Date(Date.now() - 5 * 60 * 1000), // 5 minute stale lock timeout
          },
        },
      ],
      attempts: {
        lt: prisma.handlerJob.fields.maxAttempts,
      },
    },
    orderBy: [
      { dueAt: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  if (!job) {
    return null;
  }

  // Try to claim it
  try {
    const claimed = await prisma.handlerJob.update({
      where: { id: job.id },
      data: {
        lockedBy: workerId,
        lockedAt: now,
        attempts: job.attempts + 1,
      },
    });

    return claimed;
  } catch (error) {
    // Race condition - another worker claimed it
    return null;
  }
};

/**
 * Delete a job
 */
const deleteJob = async (jobId) => {
  await prisma.handlerJob.delete({
    where: { id: jobId },
  });
};

/**
 * Create a new job
 */
const createJob = async ({ tenantId, runId, nodeId, dueAt, payload, maxAttempts = 3 }) => {
  const db = forTenant(tenantId);

  const job = await db.handlerJob.create({
    data: {
      runId,
      nodeId: nodeId || null,
      dueAt: dueAt || new Date(),
      attempts: 0,
      maxAttempts,
      payload: payload || null,
    },
  });

  return job;
};

/**
 * Reschedule a job (for retries or delays)
 */
const rescheduleJob = async ({ jobId, delayMs, maxAttempts }) => {
  const dueAt = new Date(Date.now() + delayMs);

  const updateData = {
    dueAt,
    lockedBy: null,
    lockedAt: null,
  };

  if (maxAttempts !== undefined) {
    updateData.maxAttempts = maxAttempts;
  }

  await prisma.handlerJob.update({
    where: { id: jobId },
    data: updateData,
  });
};

module.exports = {
  // Flow management
  createFlow,
  updateFlow,
  publishFlow,
  listFlows,
  getFlowById,
  deleteFlow,
  getPublishedFlowsByEvent,

  // Run management
  createRun,
  manualRun,
  getRunLogs,
  getRunWithFlow,
  getRunById,
  appendRunLog,
  updateRun,
  handleEvent,

  // Job management
  claimNextJob,
  deleteJob,
  createJob,
  rescheduleJob,

  // Constants
  STATUS,
  RUN_STATUS,
  TRIGGER_TYPES,
};
