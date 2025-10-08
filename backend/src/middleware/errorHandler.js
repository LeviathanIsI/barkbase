const logger = require('../utils/logger');

const describeRequest = (req) => {
  const method = req.method || 'UNKNOWN';
  const path = req.originalUrl || req.url || req.path || 'unknown path';
  return `${method} ${path}`;
};

const describePrismaError = (error) => {
  if (!error) return null;

  if (error.code === 'P2022' && error.meta?.column) {
    return `Database column ${error.meta.column} is missing.`;
  }

  if (error.meta?.cause) {
    return error.meta.cause;
  }

  return null;
};

const describeError = (error) => {
  if (!error) {
    return 'The server hit an unknown error.';
  }

  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaSummary = describePrismaError(error);
    if (prismaSummary) {
      return prismaSummary;
    }
    return `Database error (${error.code || 'unknown code'}).`;
  }

  const message = typeof error.message === 'string' ? error.message.trim() : '';
  if (message) {
    return message.replace(/\s+/g, ' ');
  }

  return 'The server hit an unexpected error.';
};

module.exports = (err, req, res, next) => {
  const requestSummary = describeRequest(req);
  const reason = describeError(err);

  if (!res.locals) {
    res.locals = {};
  }
  res.locals.errorSummary = reason;

  logger.error(`Request ${requestSummary} failed. Reason: ${reason}`);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || err.status || 500;
  const message = status >= 500 ? 'Internal server error' : err.message;

  return res.status(status).json({
    message,
    ...(err.code ? { code: err.code } : {}),
  });
};
