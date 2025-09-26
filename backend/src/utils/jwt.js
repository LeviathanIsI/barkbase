const jwt = require('jsonwebtoken');
const env = require('../config/env');

const issueAccessToken = (payload) =>
  jwt.sign(payload, env.tokens.accessSecret, { expiresIn: `${env.tokens.accessTtlMinutes}m` });

const issueRefreshToken = (payload) =>
  jwt.sign(payload, env.tokens.refreshSecret, { expiresIn: `${env.tokens.refreshTtlDays}d` });

const verifyAccessToken = (token) => jwt.verify(token, env.tokens.accessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.tokens.refreshSecret);

module.exports = {
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
