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
const emailUtils = require('./email-utils');
const permissions = require('./permissions');

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

  // Email utils exports
  sendEmail: emailUtils.sendEmail,
  sendTemplatedEmail: emailUtils.sendTemplatedEmail,
  sendBookingConfirmation: emailUtils.sendBookingConfirmation,
  sendBookingReminder: emailUtils.sendBookingReminder,
  sendVaccinationReminder: emailUtils.sendVaccinationReminder,
  sendCheckInConfirmation: emailUtils.sendCheckInConfirmation,
  sendCheckOutConfirmation: emailUtils.sendCheckOutConfirmation,
  sendBookingCancellation: emailUtils.sendBookingCancellation,
  sendBookingUpdated: emailUtils.sendBookingUpdated,
  emailTemplates: emailUtils.emailTemplates,
  formatDate: emailUtils.formatDate,
  formatDateTime: emailUtils.formatDateTime,

  // Permission exports
  PERMISSIONS: permissions.PERMISSIONS,
  ROLES: permissions.ROLES,
  roleHasPermission: permissions.roleHasPermission,
  userHasPermission: permissions.userHasPermission,
  getUserPermissions: permissions.getUserPermissions,
  requirePermission: permissions.requirePermission,
  checkPermission: permissions.checkPermission,
};
