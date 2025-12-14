/**
 * Request Context Module
 * Provides structured logging and request tracking for Lambda functions.
 */

const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

// Store request context in async local storage
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return `req_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * Initialize request context from Lambda event
 */
function initRequestContext(event) {
  const requestId =
    event.headers?.['x-request-id'] ||
    event.headers?.['X-Request-Id'] ||
    generateRequestId();
  const tenantId =
    event.headers?.['x-tenant-id'] || event.headers?.['X-Tenant-Id'];
  const userId = event.requestContext?.authorizer?.claims?.sub;

  return {
    requestId,
    tenantId,
    userId,
    startTime: Date.now(),
    path: event.path || event.requestContext?.http?.path,
    method: event.httpMethod || event.requestContext?.http?.method,
  };
}

/**
 * Get current request context
 */
function getRequestContext() {
  return asyncLocalStorage.getStore() || {};
}

/**
 * Run function with request context
 */
function runWithContext(context, fn) {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Structured logger with request context
 */
function createLogger() {
  const log = (level, message, data = {}) => {
    const context = getRequestContext();
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: context.requestId,
      tenantId: context.tenantId,
      userId: context.userId,
      path: context.path,
      method: context.method,
      message,
      ...data,
      // Add duration if available
      ...(context.startTime && { durationMs: Date.now() - context.startTime }),
    };

    // Output as JSON for CloudWatch Logs Insights
    console.log(JSON.stringify(logEntry));
  };

  return {
    info: (message, data) => log('INFO', message, data),
    warn: (message, data) => log('WARN', message, data),
    error: (message, data) => log('ERROR', message, data),
    debug: (message, data) => {
      if (process.env.LOG_LEVEL === 'DEBUG') {
        log('DEBUG', message, data);
      }
    },
  };
}

const logger = createLogger();

/**
 * Middleware wrapper for Lambda handlers
 */
function withRequestContext(handler) {
  return async (event, lambdaContext) => {
    const context = initRequestContext(event);

    return runWithContext(context, async () => {
      logger.info('Request started');

      try {
        const result = await handler(event, lambdaContext);

        logger.info('Request completed', {
          statusCode: result.statusCode,
        });

        // Add request ID to response headers
        return {
          ...result,
          headers: {
            ...result.headers,
            'X-Request-ID': context.requestId,
          },
        };
      } catch (error) {
        logger.error('Request failed', {
          error: error.message,
          stack: error.stack,
        });

        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': context.requestId,
          },
          body: JSON.stringify({
            error: 'Internal server error',
            requestId: context.requestId,
          }),
        };
      }
    });
  };
}

module.exports = {
  generateRequestId,
  initRequestContext,
  getRequestContext,
  runWithContext,
  logger,
  withRequestContext,
};
