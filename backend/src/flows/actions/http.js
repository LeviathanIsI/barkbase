const crypto = require('crypto');
const http = require('../../lib/http');

function buildDefaultBody({ tenantId, context }) {
  return {
    tenantId,
    context: {
      owner: context.owner,
      pet: context.pet,
      booking: context.booking || context.reservation,
    },
    timestamp: new Date().toISOString(),
  };
}

async function sendWebhook({ tenantId, context, config, log, signal, correlationId }) {
  const { method = 'POST', url, headers = {}, body, retryPolicy } = config;

  if (!url) {
    throw new Error('Webhook URL is required');
  }

  const requestBody = body || buildDefaultBody({ tenantId, context });
  const correlation = correlationId || headers['x-correlation-id'] || crypto.randomUUID();

  log(`Sending ${method} request to ${url}`);

  const { status, data, attempt } = await http.request({
    method,
    url,
    data: requestBody,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'BarkBase-Workflows/1.0',
      ...headers,
    },
    correlationId: correlation,
    signal,
    maxRetries:
      retryPolicy && retryPolicy.maxAttempts
        ? Math.max(0, Number(retryPolicy.maxAttempts) - 1)
        : undefined,
    timeout: retryPolicy?.timeoutMs,
  });

  return {
    result: {
      url,
      method,
      status,
      response: typeof data === 'string' ? data.substring(0, 1000) : data,
      attempts: attempt,
    },
  };
}

module.exports = {
  sendWebhook,
};
