const { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } = require('../utils/csrf');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const defaultOptions = {
  ignore: [
    { method: 'POST', path: '/api/v1/auth/login' },
    { method: 'POST', path: '/api/v1/auth/refresh' },
    { method: 'POST', path: '/api/v1/auth/signup' },
    { method: 'POST', path: '/api/v1/auth/verify-email' },
  ],
};

const matches = (req, rule) => {
  if (rule.method && rule.method !== req.method) {
    return false;
  }
  if (rule.path) {
    if (typeof rule.path === 'string') {
      return req.path === rule.path;
    }
    if (rule.path instanceof RegExp) {
      return rule.path.test(req.path);
    }
  }
  return true;
};

module.exports = function csrfProtection(options = {}) {
  const { ignore = defaultOptions.ignore } = options;

  return function verifyCsrf(req, res, next) {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    if (ignore.some((rule) => matches(req, rule))) {
      return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers?.[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ message: 'CSRF validation failed' });
    }

    return next();
  };
};
