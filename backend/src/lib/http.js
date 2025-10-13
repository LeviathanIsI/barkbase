const fetch = require('node-fetch');
const { logger } = require('./logger');

const DEFAULT_TIMEOUT = Number(process.env.HTTP_DEFAULT_TIMEOUT_MS || 10_000);
const DEFAULT_MAX_RETRIES = Number(process.env.HTTP_MAX_RETRIES || 2);

function buildAbortController(timeoutMs, externalSignal) {
  const controller = new AbortController();

  let timeoutId;
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(new Error('Request timed out'));
    }, timeoutMs);
  }

  const handleExternalAbort = () => {
    controller.abort(externalSignal.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', handleExternalAbort, { once: true });
    }
  }

  const cleanup = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', handleExternalAbort);
    }
  };

  return { signal: controller.signal, cleanup };
}

function shouldRetry(error, response) {
  if (error) {
    return true;
  }

  if (!response) {
    return false;
  }

  return response.status >= 500 && response.status < 600;
}

async function request({
  method = 'GET',
  url,
  data,
  headers = {},
  correlationId,
  signal,
  timeout = DEFAULT_TIMEOUT,
  maxRetries = DEFAULT_MAX_RETRIES,
}) {
  if (!url) {
    throw new Error('HTTP request requires a url');
  }

  const log = logger.child({ url, method, correlationId });
  const attempts = maxRetries + 1;

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { signal: abortSignal, cleanup } = buildAbortController(timeout, signal);

    try {
      const requestInit = {
        method,
        headers: {
          'Content-Type': data !== undefined && method !== 'GET' ? 'application/json' : undefined,
          'x-correlation-id': correlationId,
          ...headers,
        },
        signal: abortSignal,
      };

      if (requestInit.headers['Content-Type'] === undefined) {
        delete requestInit.headers['Content-Type'];
      }

      if (data !== undefined && method !== 'GET') {
        requestInit.body = typeof data === 'string' ? data : JSON.stringify(data);
      }

      const response = await fetch(url, requestInit);
      const responseBody = await response.text();

      if (response.ok) {
        log.info({ status: response.status, attempt }, 'http success');
        cleanup();
        return {
          status: response.status,
          headers: response.headers,
          attempt,
          data: (() => {
            try {
              return JSON.parse(responseBody);
            } catch {
              return responseBody;
            }
          })(),
        };
      }

      const error = new Error(`HTTP ${response.status}`);

      if (attempt >= attempts || !shouldRetry(null, response)) {
        log.warn({ status: response.status, attempt }, 'http error');
        cleanup();
        throw error;
      }

      log.warn({ status: response.status, attempt }, 'http retrying');
    } catch (error) {
      lastError = error;
      log.warn({ error: error.message, attempt }, 'http error');

      if (attempt >= attempts || !shouldRetry(error)) {
        cleanup();
        throw error;
      }
    }

    cleanup();

    const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 30_000);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  throw lastError;
}

module.exports = {
  request,
};
