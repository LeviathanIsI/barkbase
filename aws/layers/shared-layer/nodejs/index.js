/**
 * =============================================================================
 * BarkBase Shared Layer - Index
 * =============================================================================
 * 
 * Exports all shared layer utilities for easy importing in Lambda functions.
 * 
 * =============================================================================
 */

const authHandler = require('./auth-handler');
const jwtValidator = require('./jwt-validator');
const securityUtils = require('./security-utils');

module.exports = {
  // Auth handler exports
  authenticateRequest: authHandler.authenticateRequest,
  requireAuth: authHandler.requireAuth,
  createResponse: authHandler.createResponse,
  parseBody: authHandler.parseBody,
  getPathParams: authHandler.getPathParams,
  getQueryParams: authHandler.getQueryParams,
  getAuthConfig: authHandler.getAuthConfig,

  // JWT validator exports
  validateToken: jwtValidator.validateToken,
  validateAuthHeader: jwtValidator.validateAuthHeader,

  // Security utils exports
  hashPassword: securityUtils.hashPassword,
  verifyPassword: securityUtils.verifyPassword,
  generateToken: securityUtils.generateToken,
  generateSessionId: securityUtils.generateSessionId,
  sanitizeInput: securityUtils.sanitizeInput,
  isValidEmail: securityUtils.isValidEmail,
  maskSensitive: securityUtils.maskSensitive,
  extractUserFromToken: securityUtils.extractUserFromToken,
};

