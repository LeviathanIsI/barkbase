const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

module.exports = {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
};
