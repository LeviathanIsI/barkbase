const crypto = require('crypto');
const logger = require('../utils/logger');
const { forTenant } = require('../lib/tenantPrisma');

function buildExecutionContext(run) {
  return run.context || {};
}

function generateIdempotencyKey(runId, nodeId, config) {
  const configHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(config || {}))
    .digest('hex')
    .substring(0, 16);

  return `${runId}:${nodeId}:${configHash}`;
}

async function checkIdempotency({ tenantId, runId, nodeId, config }) {
  const db = forTenant(tenantId);
  const key = generateIdempotencyKey(runId, nodeId, config);

  try {
    const existing = await db.$queryRaw`
      SELECT * FROM "HandlerOutbox"
      WHERE "idempotencyKey" = ${key}
      LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return {
        executed: true,
        result: existing[0].result,
      };
    }
  } catch (error) {
    logger.warn({ error: error.message }, 'HandlerOutbox table not found, skipping idempotency check');
  }

  return { executed: false };
}

async function recordExecution({ tenantId, runId, nodeId, config, result }) {
  const db = forTenant(tenantId);
  const key = generateIdempotencyKey(runId, nodeId, config);

  try {
    await db.$executeRaw`
      INSERT INTO "HandlerOutbox" ("idempotencyKey", "runId", "nodeId", "result", "executedAt")
      VALUES (${key}, ${runId}, ${nodeId}, ${JSON.stringify(result)}::jsonb, NOW())
      ON CONFLICT ("idempotencyKey") DO NOTHING
    `;
  } catch (error) {
    logger.warn({ error: error.message }, 'Failed to record execution in HandlerOutbox');
  }
}

module.exports = {
  buildExecutionContext,
  generateIdempotencyKey,
  checkIdempotency,
  recordExecution,
};
