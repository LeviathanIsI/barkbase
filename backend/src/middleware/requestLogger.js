const { randomUUID } = require('crypto');
const pinoHttp = require('pino-http');
const logger = require('../utils/logger');

const describeUserAgent = (userAgent) => {
  if (!userAgent) return null;
  if (userAgent.includes('Chrome')) return 'Chrome browser';
  if (userAgent.includes('Firefox')) return 'Firefox browser';
  if (userAgent.includes('Safari')) return 'Safari browser';
  if (userAgent.includes('Edge')) return 'Edge browser';
  return 'browser client';
};

const buildRequestSummary = (req, res, responseTime) => {
  const method = req.method || 'UNKNOWN';
  const url = req.originalUrl || req.url || '';
  const base = `Request ${method} ${url}`.trim();
  return `${base} finished with status ${res.statusCode} in ${responseTime}ms.`;
};

const buildContextSummary = (req) => {
  const contextBits = [];

  if (req.id) {
    contextBits.push(`request id ${req.id}`);
  }

  const ip = req.ip || req.socket?.remoteAddress;
  if (ip) {
    contextBits.push(`from ${ip}`);
  }

  const uaDescription = describeUserAgent(req.headers?.['user-agent']);
  if (uaDescription) {
    contextBits.push(`via ${uaDescription}`);
  }

  if (req.tenantSlug) {
    contextBits.push(`tenant ${req.tenantSlug}`);
  }

  if (req.user?.id) {
    contextBits.push(`user ${req.user.id}`);
  }

  if (contextBits.length === 0) {
    return '';
  }

  return `Context: ${contextBits.join(', ')}.`;
};

const ensureSentence = (value) => {
  if (!value) return '';
  return value.endsWith('.') ? value : `${value}.`;
};

const formatSuccessMessage = (req, res, responseTime) => {
  const summary = buildRequestSummary(req, res, responseTime);
  const context = buildContextSummary(req);
  const outcome = 'Outcome: success.';

  return [summary, ensureSentence(context), outcome].filter(Boolean).join(' ');
};

const describeStatus = (statusCode) => {
  if (statusCode >= 500) {
    return 'the server reported an internal error';
  }

  if (statusCode >= 400) {
    return 'the request was rejected';
  }

  return `the server returned status ${statusCode}`;
};

const formatErrorMessage = (req, res, _err, responseTime) => {
  const summary = buildRequestSummary(req, res, responseTime);
  const context = buildContextSummary(req);
  const reason = res.locals?.errorSummary || describeStatus(res.statusCode);
  const outcome = ensureSentence(`Outcome: failed because ${reason}`);

  return [summary, ensureSentence(context), outcome].filter(Boolean).join(' ');
};

const attachRequestId = (req) => {
  const existingId = req.headers['x-request-id'];
  const requestId = existingId || randomUUID();
  req.id = requestId;
  return requestId;
};

module.exports = pinoHttp({
  logger,
  quietReqLogger: true,
  quietResLogger: true,
  redact: ['req.headers.authorization'],
  customSuccessObject: () => undefined,
  customErrorObject: () => undefined,
  customSuccessMessage: (req, res, responseTime) =>
    formatSuccessMessage(req, res, responseTime),
  customErrorMessage: (req, res, err, responseTime) =>
    formatErrorMessage(req, res, err, responseTime),
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  genReqId: (req) => attachRequestId(req),
});
