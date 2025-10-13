const actions = require('../flows/actions');
const logger = require('../utils/logger');
const { checkIdempotency, recordExecution } = require('./context');

async function runAction({
  tenantId,
  runId,
  node,
  config,
  context,
  enforceIdempotency,
  log = () => {},
  signal,
  correlationId,
}) {
  const actionType = config.actionType;

  if (!actionType) {
    throw new Error(`Action node ${node.id} missing actionType`);
  }

  let result;

  if (enforceIdempotency) {
    const idempotencyCheck = await checkIdempotency({
      tenantId,
      runId,
      nodeId: node.id,
      config,
    });

    if (idempotencyCheck.executed) {
      log('info', `Action ${actionType} skipped (already executed)`, {
        idempotent: true,
        correlationId,
      });

      const updatedContext = {
        ...context,
        actions: [
          ...(context.actions || []),
          { nodeId: node.id, actionType, result: idempotencyCheck.result, idempotent: true },
        ],
      };

      return { result: idempotencyCheck.result, context: updatedContext };
    }
  }

  const handler = actions[actionType];

  if (!handler) {
    throw new Error(`Unknown action type: ${actionType}`);
  }

  let contextUpdates = {};

  result = await handler({
    tenantId,
    context,
    config,
    signal,
    log: (message, details) => {
      try {
        log('info', message, { correlationId, ...(details || {}) });
      } catch (error) {
        logger.warn({ error: error.message }, 'Failed to log action message');
      }
    },
    setContext: (updates) => {
      contextUpdates = { ...contextUpdates, ...updates };
    },
    correlationId,
  });

  if (enforceIdempotency) {
    await recordExecution({
      tenantId,
      runId,
      nodeId: node.id,
      config,
      result,
    });
  }

  const updatedContext = {
    ...context,
    ...contextUpdates,
    actions: [...(context.actions || []), { nodeId: node.id, actionType, result }],
  };

  return { result, context: updatedContext };
}

module.exports = {
  runAction,
};
