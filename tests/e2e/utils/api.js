/**
 * E2E API Client
 *
 * Makes authenticated HTTP requests to Lambda endpoints.
 * Supports local invocation (direct Lambda calls) or HTTP requests.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../frontend/.env.development') });

// API Gateway URL from frontend environment
// Pattern: https://{api-id}.execute-api.{region}.amazonaws.com
const API_BASE_URL = process.env.VITE_API_URL || 'https://gvrsq1bmy6.execute-api.us-east-2.amazonaws.com';

/**
 * Create headers for an authenticated request
 */
function createHeaders(token, tenantId, additionalHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...additionalHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }

  return headers;
}

/**
 * Parse response based on content type
 */
async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  return await response.text();
}

/**
 * Make an HTTP request
 */
async function request(method, endpoint, options = {}) {
  const { token, tenantId, body, headers: additionalHeaders, accountCode } = options;

  // Normalize endpoint - ensure it starts with /api/v1 for standard routes
  let normalizedEndpoint = endpoint;
  if (!endpoint.startsWith('/api/') && !endpoint.startsWith('/a/')) {
    normalizedEndpoint = `/api/v1${endpoint}`;
  }

  // Build URL - support both new ID system (/a/:accountCode) and legacy (/api/v1)
  let url;
  if (accountCode) {
    // New ID system: /a/:accountCode/:resource
    url = `${API_BASE_URL}/a/${accountCode}${endpoint}`;
  } else {
    url = `${API_BASE_URL}${normalizedEndpoint}`;
  }

  const headers = createHeaders(token, tenantId, additionalHeaders);

  const fetchOptions = {
    method,
    headers,
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await parseResponse(response);

    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    console.error(`[API] Request failed: ${method} ${url}`, error.message);
    throw error;
  }
}

/**
 * API client with convenience methods
 */
const api = {
  /**
   * GET request
   */
  get: (endpoint, token, options = {}) =>
    request('GET', endpoint, { token, ...options }),

  /**
   * POST request
   */
  post: (endpoint, body, token, options = {}) =>
    request('POST', endpoint, { token, body, ...options }),

  /**
   * PUT request
   */
  put: (endpoint, body, token, options = {}) =>
    request('PUT', endpoint, { token, body, ...options }),

  /**
   * PATCH request
   */
  patch: (endpoint, body, token, options = {}) =>
    request('PATCH', endpoint, { token, body, ...options }),

  /**
   * DELETE request
   */
  delete: (endpoint, token, options = {}) =>
    request('DELETE', endpoint, { token, ...options }),
};

/**
 * Create a tenant-scoped API client
 */
function createApiClient(token, tenantId, accountCode) {
  return {
    get: (endpoint, options = {}) =>
      api.get(endpoint, token, { tenantId, accountCode, ...options }),

    post: (endpoint, body, options = {}) =>
      api.post(endpoint, body, token, { tenantId, accountCode, ...options }),

    put: (endpoint, body, options = {}) =>
      api.put(endpoint, body, token, { tenantId, accountCode, ...options }),

    patch: (endpoint, body, options = {}) =>
      api.patch(endpoint, body, token, { tenantId, accountCode, ...options }),

    delete: (endpoint, options = {}) =>
      api.delete(endpoint, token, { tenantId, accountCode, ...options }),
  };
}

/**
 * Lambda event builder for direct invocation testing
 */
function buildLambdaEvent(method, path, options = {}) {
  const { token, tenantId, body, queryParams, pathParams } = options;

  const headers = {};
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }
  headers['content-type'] = 'application/json';

  const event = {
    httpMethod: method,
    path,
    headers,
    requestContext: {
      http: {
        method,
        path,
      },
      authorizer: token ? {
        jwt: {
          claims: {
            'custom:tenant_id': tenantId,
          },
        },
      } : undefined,
    },
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: queryParams || null,
    pathParameters: pathParams || null,
  };

  return event;
}

/**
 * Invoke a Lambda handler directly (for unit/integration testing)
 */
async function invokeLambda(handler, method, path, options = {}) {
  const event = buildLambdaEvent(method, path, options);
  const context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:test',
    memoryLimitInMB: '128',
    awsRequestId: `test-${Date.now()}`,
    logGroupName: '/aws/lambda/test',
    logStreamName: 'test-stream',
  };

  const response = await handler(event, context);

  return {
    status: response.statusCode,
    ok: response.statusCode >= 200 && response.statusCode < 300,
    data: response.body ? JSON.parse(response.body) : null,
    headers: response.headers || {},
  };
}

module.exports = {
  api,
  request,
  createApiClient,
  createHeaders,
  buildLambdaEvent,
  invokeLambda,
  API_BASE_URL,
};
