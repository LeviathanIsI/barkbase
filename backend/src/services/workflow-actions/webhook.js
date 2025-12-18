/**
 * Webhook Action Executor
 *
 * Sends HTTP requests to external URLs.
 */

const { replaceTemplateVariables } = require('./utils/template-variables');

/**
 * Execute the webhook action
 * @param {Object} config - Action configuration
 * @param {string} config.url - The URL to call
 * @param {string} config.method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {Object} config.headers - Custom headers
 * @param {Object|string} config.body - Request body (for POST/PUT/PATCH)
 * @param {number} config.timeout - Request timeout in ms (default: 30000)
 * @param {boolean} config.includeRecord - Include full record in body
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
async function execute(config, context) {
  const { record, tenantId, prisma, workflowId, executionId, stepId } = context;
  const {
    url,
    method = 'POST',
    headers = {},
    body,
    timeout = 30000,
    includeRecord = true,
  } = config;

  if (!url) {
    throw new Error('Webhook URL is required');
  }

  // Replace template variables in URL
  const processedUrl = replaceTemplateVariables(url, record);

  // Build request body
  let requestBody;

  if (method !== 'GET' && method !== 'DELETE') {
    if (body) {
      // If body is a string, replace template variables
      if (typeof body === 'string') {
        requestBody = replaceTemplateVariables(body, record);
      } else {
        // If body is an object, replace variables in string values
        requestBody = JSON.stringify(processTemplateObject(body, record));
      }
    } else if (includeRecord) {
      // Default: send record data
      requestBody = JSON.stringify({
        event: 'workflow_action',
        workflow_id: workflowId,
        execution_id: executionId,
        step_id: stepId,
        record_type: record._type,
        record: sanitizeRecord(record),
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Process headers - replace template variables
  const processedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    processedHeaders[key] = replaceTemplateVariables(String(value), record);
  }

  // Add default headers
  if (!processedHeaders['Content-Type'] && requestBody) {
    processedHeaders['Content-Type'] = 'application/json';
  }
  processedHeaders['User-Agent'] = 'BarkBase-Workflow/1.0';
  processedHeaders['X-Workflow-Id'] = workflowId;
  processedHeaders['X-Execution-Id'] = executionId;

  // Make the request
  const startTime = Date.now();
  let response;
  let responseBody;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    response = await fetch(processedUrl, {
      method: method.toUpperCase(),
      headers: processedHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Try to parse response body
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Webhook request timed out after ${timeout}ms`);
    }
    throw error;
  }

  const duration = Date.now() - startTime;

  // Log the webhook call
  await prisma.webhookLog.create({
    data: {
      tenant_id: tenantId,
      url: processedUrl,
      method: method.toUpperCase(),
      request_headers: processedHeaders,
      request_body: requestBody ? JSON.parse(requestBody) : null,
      response_status: response.status,
      response_body: typeof responseBody === 'object' ? responseBody : { text: responseBody },
      duration_ms: duration,
      success: response.ok,
      source: 'workflow',
      metadata: {
        workflow_id: workflowId,
        execution_id: executionId,
        step_id: stepId,
      },
    },
  });

  // Check response status
  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
  }

  return {
    url: processedUrl,
    method: method.toUpperCase(),
    status: response.status,
    statusText: response.statusText,
    duration: duration,
    response: responseBody,
  };
}

/**
 * Process template variables in an object recursively
 */
function processTemplateObject(obj, record) {
  if (typeof obj === 'string') {
    return replaceTemplateVariables(obj, record);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processTemplateObject(item, record));
  }

  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processTemplateObject(value, record);
    }
    return result;
  }

  return obj;
}

/**
 * Remove sensitive fields from record before sending
 */
function sanitizeRecord(record) {
  const sanitized = { ...record };

  // Remove internal fields
  delete sanitized._type;

  // Remove potentially sensitive fields
  const sensitiveFields = [
    'password',
    'password_hash',
    'api_key',
    'secret',
    'token',
    'ssn',
    'credit_card',
  ];

  for (const field of sensitiveFields) {
    delete sanitized[field];
  }

  return sanitized;
}

/**
 * Validate the action configuration
 */
function validate(config) {
  const errors = [];

  if (!config.url || config.url.trim() === '') {
    errors.push('Webhook URL is required');
  }

  if (config.url && !isValidUrl(config.url)) {
    errors.push('Invalid webhook URL');
  }

  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (config.method && !validMethods.includes(config.method.toUpperCase())) {
    errors.push(`Invalid HTTP method. Must be one of: ${validMethods.join(', ')}`);
  }

  if (config.timeout && (isNaN(config.timeout) || config.timeout < 1000 || config.timeout > 60000)) {
    errors.push('Timeout must be between 1000ms and 60000ms');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if URL is valid
 */
function isValidUrl(string) {
  try {
    // Allow template variables in URL
    const testUrl = string.replace(/\{\{[^}]+\}\}/g, 'placeholder');
    new URL(testUrl);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  execute,
  validate,
};
