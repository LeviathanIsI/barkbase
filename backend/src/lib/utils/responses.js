const { getSecureHeaders, errorResponse, successResponse } = require('./security');

const ok = (event, statusCode, data = '', additionalHeaders = {}) => {
  if (statusCode === 204) {
    const origin = event?.headers?.origin || event?.headers?.Origin;
    const stage = process.env.STAGE || 'development';
    return {
      statusCode,
      headers: {
        ...getSecureHeaders(origin, stage),
        ...additionalHeaders,
      },
      body: '',
    };
  }

  return successResponse(statusCode, data, event, additionalHeaders);
};

const fail = (event, statusCode, errorCodeOrBody, message, additionalHeaders = {}) => {
  if (typeof errorCodeOrBody === 'object' && errorCodeOrBody !== null) {
    const origin = event?.headers?.origin || event?.headers?.Origin;
    const stage = process.env.STAGE || 'development';
    return {
      statusCode,
      headers: {
        ...getSecureHeaders(origin, stage),
        ...additionalHeaders,
      },
      body: JSON.stringify(errorCodeOrBody),
    };
  }

  const response = errorResponse(statusCode, errorCodeOrBody, message, event);
  return {
    ...response,
    headers: {
      ...response.headers,
      ...additionalHeaders,
    },
  };
};

module.exports = {
  ok,
  fail,
};

