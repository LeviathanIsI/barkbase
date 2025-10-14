const logger = require('../utils/logger');
const {
  claimNext,
  loadRun,
  logRunEvent,
  updateRunState,
  removeJob,
  createFollowUpJob,
  scheduleRetry,
  RUN_STATUS,
} = require('./queue');
const { runAction } = require('./executor');
const { buildExecutionContext } = require('./context');
const { wait, getDelay } = require('./retry');
const { evaluateCriteriaGroup } = require('../services/criteriaEvaluator');

const WORKER_ID = process.env.HANDLER_WORKER_ID || `handler-${process.pid}`;
const POLL_INTERVAL_MS = Number(process.env.HANDLER_WORKER_INTERVAL_MS ?? 2000);
const MAX_ITERATIONS = 200;

let shuttingDown = false;
let activeController = null;

function initiateShutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ workerId: WORKER_ID, signal }, 'Handler worker shutdown initiated');

  if (activeController) {
    activeController.abort(new Error('Worker shutting down'));
  }
}

process.once('SIGINT', initiateShutdown);
process.once('SIGTERM', initiateShutdown);

function parseDuration(iso) {
  if (!iso || typeof iso !== 'string') {
    throw new Error('Duration is required');
  }

  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!match) {
    throw new Error(`Unsupported duration format: ${iso}`);
  }

  const [, days, hours, minutes, seconds] = match.map((v) => Number(v || 0));
  const totalMs =
    days * 86_400_000 + hours * 3_600_000 + minutes * 60_000 + seconds * 1_000;

  if (totalMs <= 0) {
    throw new Error(`Duration must be greater than zero: ${iso}`);
  }

  return totalMs;
}

function parseDurationFromConfig(config) {
  const { mode, amount, unit, iso } = config;

  if (mode === 'for-duration') {
    const unitMs = {
      minutes: 60_000,
      hours: 3_600_000,
      days: 86_400_000,
    };

    return (amount || 1) * (unitMs[unit] || 60_000);
  }

  if (mode === 'until-datetime') {
    const targetDate = new Date(iso);
    const now = new Date();
    const delayMs = targetDate - now;
    return Math.max(0, delayMs);
  }

  if (mode === 'until-property') {
    return 3_600_000;
  }

  return 60_000;
}

function findNextNode(currentNodeId, edges, conditionResult, branchIndex) {
  const outgoingEdges = edges.filter((edge) => edge.source === currentNodeId);

  if (outgoingEdges.length === 0) {
    return null;
  }

  if (conditionResult !== undefined) {
    const labeledEdge = outgoingEdges.find(
      (edge) => edge.label?.toLowerCase() === (conditionResult ? 'true' : 'false'),
    );

    if (labeledEdge) {
      return labeledEdge.target;
    }

    const edgeIndex = conditionResult ? 0 : 1;
    return outgoingEdges[edgeIndex]?.target || null;
  }

  if (branchIndex !== undefined) {
    const branchEdge = outgoingEdges.find(
      (edge) => edge.sourceHandle === `branch-${branchIndex}`,
    );

    if (branchEdge) {
      return branchEdge.target;
    }
  }

  return outgoingEdges[0]?.target || null;
}

async function executeNode({
  node,
  run,
  tenantId,
  context,
  enforceActionIdempotency,
  signal,
  jobId,
}) {
  const nodeType = node.type;
  const nodeData = node.data || {};
  const runId = run.recordId;
  const correlationId = `${runId}:${node.recordId}:${jobId ?? 'job'}`;

  const safeLog = (level, message, details) =>
    logRunEvent({
      tenantId,
      runId,
      nodeId: node.recordId,
      level,
      message,
      details,
    }).catch((error) => logger.error({ err: error }, 'Failed to append log entry'));

  switch (nodeType) {
    case 'trigger':
      return { context };

    case 'action': {
      const actionConfig = nodeData;

      const execution = await runAction({
        tenantId,
        runId,
        node,
        config: actionConfig,
        context,
        enforceIdempotency: enforceActionIdempotency,
        log: safeLog,
        signal,
        correlationId,
      });

      return {
        result: execution.result,
        context: execution.context,
        nextNodeId: null,
      };
    }

    case 'delay': {
      const delayConfig = nodeData;
      const delayMs = parseDurationFromConfig(delayConfig);
      return { delay: delayMs, context, nextNodeId: null };
    }

    case 'condition': {
      const criteriaGroup = nodeData.criteriaGroup;

      if (!criteriaGroup) {
        throw new Error(`Condition node ${node.recordId} missing criteriaGroup`);
      }

      const result = evaluateCriteriaGroup(criteriaGroup, context);
      return { conditionResult: result, context, nextNodeId: null };
    }

    case 'branch': {
      const { branchCriteria, evaluation } = nodeData;
      const mode = evaluation || 'first-match-wins';

      if (mode === 'first-match-wins' && Array.isArray(branchCriteria)) {
        for (let index = 0; index < branchCriteria.length; index += 1) {
          const group = branchCriteria[index];
          if (group && evaluateCriteriaGroup(group, context)) {
            return { branchIndex: index, context, nextNodeId: null };
          }
        }

        return { branchIndex: 0, context, nextNodeId: null };
      }

      return { branchIndex: 0, context, nextNodeId: null };
    }

    case 'custom-code': {
      const { js, timeoutMs } = nodeData;

      if (!js) {
        throw new Error(`Custom code node ${node.recordId} missing js`);
      }

      const execution = await runAction({
        tenantId,
        runId,
        node,
        config: { actionType: 'custom', js, timeoutMs },
        context,
        enforceIdempotency: false,
        log: safeLog,
        signal,
        correlationId,
      });

      return {
        result: execution.result,
        context: execution.context,
        nextNodeId: null,
      };
    }

    default:
      throw new Error(`Unsupported node type: ${nodeType}`);
  }
}

async function executeFlowChain({ job, run, flow, signal }) {
  const tenantId = job.tenantId;
  const runId = run.recordId;
  const definition = flow.definition || {};

  const nodes = definition.nodes || [];
  const edges = definition.edges || [];
  const nodeMap = new Map(nodes.map((node) => [node.recordId, node]));

  let currentNodeId = job.nodeId || run.currentNodeId;
  let currentContext = buildExecutionContext(run);
  let iterations = 0;

  const enforceActionIdempotency =
    definition.trigger?.settings?.enforceActionIdempotency ?? false;

  await updateRunState({
    tenantId,
    runId,
    patch: {
      status: RUN_STATUS.RUNNING,
      startedAt: run.startedAt || new Date(),
      currentNodeId,
    },
  });

  await logRunEvent({
    tenantId,
    runId,
    nodeId: null,
    level: 'info',
    message: 'Flow execution started',
    details: { startNodeId: currentNodeId },
  });

  while (currentNodeId) {
    if (signal?.aborted) {
      throw new Error('Job aborted');
    }

    iterations += 1;

    if (iterations > MAX_ITERATIONS) {
      throw new Error('Flow execution exceeded maximum iterations');
    }

    const node = nodeMap.get(currentNodeId);

    if (!node) {
      throw new Error(`Node ${currentNodeId} not found in flow definition`);
    }

    await logRunEvent({
      tenantId,
      runId,
      nodeId: node.recordId,
      level: 'debug',
      message: `Executing node: ${node.type}`,
      details: { nodeType: node.type, nodeLabel: node.data?.label },
    });

    const executionResult = await executeNode({
      node,
      run,
      tenantId,
      context: currentContext,
      enforceActionIdempotency,
      signal,
      jobId: job.recordId,
    });

    if (executionResult.delay) {
      const dueAt = new Date(Date.now() + executionResult.delay);
      const nextNodeId = findNextNode(currentNodeId, edges);

      await logRunEvent({
        tenantId,
        runId,
        nodeId: node.recordId,
        level: 'info',
        message: `Delaying execution for ${Math.round(executionResult.delay / 1000)}s`,
        details: { dueAt, nextNodeId },
      });

      if (nextNodeId) {
        await createFollowUpJob({
          tenantId,
          runId,
          nodeId: nextNodeId,
          dueAt,
          payload: {},
        });
      }

      await updateRunState({
        tenantId,
        runId,
        patch: {
          status: RUN_STATUS.QUEUED,
          currentNodeId: nextNodeId,
          context: executionResult.context,
        },
      });

      await removeJob(job.recordId);
      return;
    }

    if (executionResult.context) {
      currentContext = executionResult.context;
    }

    let nextNodeId;

    if (executionResult.conditionResult !== undefined) {
      nextNodeId = findNextNode(
        currentNodeId,
        edges,
        executionResult.conditionResult,
      );

      await logRunEvent({
        tenantId,
        runId,
        nodeId: node.recordId,
        level: 'info',
        message: `Condition evaluated to ${executionResult.conditionResult}`,
        details: { result: executionResult.conditionResult, nextNodeId },
      });
    } else if (executionResult.branchIndex !== undefined) {
      nextNodeId = findNextNode(
        currentNodeId,
        edges,
        undefined,
        executionResult.branchIndex,
      );

      await logRunEvent({
        tenantId,
        runId,
        nodeId: node.recordId,
        level: 'info',
        message: `Branch selected: ${executionResult.branchIndex}`,
        details: { branchIndex: executionResult.branchIndex, nextNodeId },
      });
    } else {
      nextNodeId = findNextNode(currentNodeId, edges);

      if (executionResult.result) {
        await logRunEvent({
          tenantId,
          runId,
          nodeId: node.recordId,
          level: 'info',
          message: 'Node executed successfully',
          details: { result: executionResult.result, nextNodeId },
        });
      }
    }

    await updateRunState({
      tenantId,
      runId,
      patch: {
        currentNodeId: nextNodeId,
        context: currentContext,
      },
    });

    currentNodeId = nextNodeId;
  }

  await logRunEvent({
    tenantId,
    runId,
    nodeId: null,
    level: 'info',
    message: 'Flow execution completed successfully',
    details: { iterations },
  });

  await updateRunState({
    tenantId,
    runId,
    patch: {
      status: RUN_STATUS.SUCCEEDED,
      finishedAt: new Date(),
    },
  });

  await removeJob(job.recordId);
}

async function processJob() {
  if (shuttingDown) {
    return false;
  }

  const controller = new AbortController();
  const job = await claimNext(WORKER_ID);

  if (!job) {
    return false;
  }

  logger.info({ jobId: job.recordId, runId: job.runId }, 'Processing job');

  activeController = controller;

  try {
    const run = await loadRun({ tenantId: job.tenantId, runId: job.runId });

    if (!run.flow) {
      throw new Error('Flow not found for run');
    }

    await executeFlowChain({ job, run, flow: run.flow, signal: controller.signal });
    return true;
  } catch (error) {
    logger.error({ err: error, jobId: job.recordId, runId: job.runId }, 'Job execution failed');

    await logRunEvent({
      tenantId: job.tenantId,
      runId: job.runId,
      nodeId: job.nodeId,
      level: 'error',
      message: error.message || 'Job execution failed',
      details: {
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
      },
    });

    if (job.attempts >= job.maxAttempts) {
      await updateRunState({
        tenantId: job.tenantId,
        runId: job.runId,
        patch: {
          status: RUN_STATUS.FAILED,
          finishedAt: new Date(),
          errorMessage: error.message,
          retryCount: job.attempts,
        },
      });

      await removeJob(job.recordId);
    } else {
      const delayMs = getDelay(job.attempts);

      await logRunEvent({
        tenantId: job.tenantId,
        runId: job.runId,
        nodeId: job.nodeId,
        level: 'warn',
        message: `Retrying in ${Math.round(delayMs / 1000)}s (attempt ${job.attempts}/${job.maxAttempts})`,
      });

      await scheduleRetry({ jobId: job.recordId, delayMs });
    }

    return false;
  } finally {
    activeController = null;
  }
}

async function runLoop() {
  logger.info({ workerId: WORKER_ID }, 'Handler worker started');

  while (!shuttingDown) {
    try {
      const processed = await processJob();

      if (!processed && !shuttingDown) {
        await wait(POLL_INTERVAL_MS);
      }
    } catch (error) {
      logger.error({ err: error }, 'Worker loop error');
      if (!shuttingDown) {
        await wait(POLL_INTERVAL_MS);
      }
    }
  }

  logger.info({ workerId: WORKER_ID }, 'Handler worker stopped');
}

if (require.main === module) {
  runLoop();
}

module.exports = {
  runLoop,
  processJob,
  parseDuration,
  executeNode,
  findNextNode,
};
