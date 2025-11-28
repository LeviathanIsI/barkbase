/**
 * =============================================================================
 * BarkBase Security Utilities
 * =============================================================================
 * 
 * Security utilities for password hashing, token generation, and validation.
 * 
 * =============================================================================
 */

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  if (!password || !hash) {
    return false;
  }

  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} Hex-encoded token
 */
function generateToken(length = 32) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure session ID
 * @returns {string} UUID v4 session ID
 */
function generateSessionId() {
  const crypto = require('crypto');
  return crypto.randomUUID();
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Mask sensitive data for logging
 * @param {string} value - Sensitive value
 * @param {number} visibleChars - Number of chars to show at start/end
 * @returns {string} Masked value
 */
function maskSensitive(value, visibleChars = 4) {
  if (!value || typeof value !== 'string' || value.length <= visibleChars * 2) {
    return '***';
  }

  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  return `${start}...${end}`;
}

/**
 * Extract user info from Cognito JWT payload
 * @param {object} payload - JWT payload
 * @returns {object} User info
 */
function extractUserFromToken(payload) {
  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email || payload['cognito:username'],
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    name: payload.name || payload['cognito:username'],
    tenantId: payload['custom:tenantId'],
    role: payload['custom:role'],
    tokenType: payload.token_use,
    issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
    expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  generateSessionId,
  sanitizeInput,
  isValidEmail,
  maskSensitive,
  extractUserFromToken,
};

