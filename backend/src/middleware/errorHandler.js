const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Unhandled error');

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
