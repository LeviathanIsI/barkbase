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
const smsUtils = require('./sms-utils');
const squareUtils = require('./square-utils');
const quickbooksUtils = require('./quickbooks-utils');
const webhookUtils = require('./webhook-utils');
const usdaForms = require('./usda-forms');
const vaccinationRules = require('./vaccination-rules');
const auditUtils = require('./audit-utils');

module.exports = {
  // Auth handler exports
  authenticateRequest: authHandler.authenticateRequest,
  validateSessionAge: authHandler.validateSessionAge,
  requireAuth: authHandler.requireAuth,
  createResponse: authHandler.createResponse,
  parseBody: authHandler.parseBody,
  getPathParams: authHandler.getPathParams,
  getQueryParams: authHandler.getQueryParams,
  getAuthConfig: authHandler.getAuthConfig,

  // Standardized error response helpers
  ERROR_CODES: authHandler.ERROR_CODES,
  createErrorResponse: authHandler.createErrorResponse,
  badRequest: authHandler.badRequest,
  unauthorized: authHandler.unauthorized,
  forbidden: authHandler.forbidden,
  notFound: authHandler.notFound,
  conflict: authHandler.conflict,
  serverError: authHandler.serverError,

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

  // SMS utils exports (Twilio)
  sendSMS: smsUtils.sendSMS,
  sendTemplatedSMS: smsUtils.sendTemplatedSMS,
  sendBookingConfirmationSMS: smsUtils.sendBookingConfirmationSMS,
  sendBookingReminderSMS: smsUtils.sendBookingReminderSMS,
  sendCheckInConfirmationSMS: smsUtils.sendCheckInConfirmationSMS,
  sendCheckOutConfirmationSMS: smsUtils.sendCheckOutConfirmationSMS,
  sendVaccinationReminderSMS: smsUtils.sendVaccinationReminderSMS,
  sendCustomSMS: smsUtils.sendCustomSMS,
  formatPhoneNumber: smsUtils.formatPhoneNumber,
  isSMSConfigured: smsUtils.isSMSConfigured,
  SMS_TEMPLATES: smsUtils.SMS_TEMPLATES,

  // Square POS exports
  squareUtils,
  isSquareConfigured: squareUtils.isSquareConfigured,
  squareCreatePayment: squareUtils.createPayment,
  squareGetPayment: squareUtils.getPayment,
  squareRefundPayment: squareUtils.refundPayment,
  squareCreateCustomer: squareUtils.createCustomer,
  squareSearchCustomer: squareUtils.searchCustomer,
  squareGetOrCreateCustomer: squareUtils.getOrCreateCustomer,
  squareCreateCheckoutLink: squareUtils.createCheckoutLink,
  squareListOrders: squareUtils.listOrders,

  // QuickBooks Online exports
  quickbooksUtils,
  isQuickBooksConfigured: quickbooksUtils.isQuickBooksConfigured,
  qbGetAuthorizationUrl: quickbooksUtils.getAuthorizationUrl,
  qbExchangeCodeForTokens: quickbooksUtils.exchangeCodeForTokens,
  qbRefreshAccessToken: quickbooksUtils.refreshAccessToken,
  qbSyncCustomer: quickbooksUtils.syncCustomer,
  qbCreateInvoice: quickbooksUtils.createInvoice,
  qbRecordPayment: quickbooksUtils.recordPayment,
  qbGetConnectionStatus: quickbooksUtils.getConnectionStatus,

  // Webhook exports
  webhookUtils,
  WEBHOOK_EVENTS: webhookUtils.WEBHOOK_EVENTS,
  generateWebhookSignature: webhookUtils.generateSignature,
  verifyWebhookSignature: webhookUtils.verifySignature,
  sendWebhook: webhookUtils.sendWebhook,
  queueWebhookDeliveries: webhookUtils.queueWebhookDeliveries,
  processPendingDeliveries: webhookUtils.processPendingDeliveries,

  // USDA Form Generation exports
  usdaForms,
  generateForm7001: usdaForms.generateForm7001,
  generateForm7002: usdaForms.generateForm7002,
  generateForm7005: usdaForms.generateForm7005,
  generateVaccinationComplianceReport: usdaForms.generateVaccinationComplianceReport,
  generateInspectionChecklist: usdaForms.generateInspectionChecklist,

  // State Vaccination Rules exports
  vaccinationRules,
  getStateRules: vaccinationRules.getStateRules,
  getSupportedStates: vaccinationRules.getSupportedStates,
  checkVaccinationCompliance: vaccinationRules.checkCompliance,
  getBoardingRequirements: vaccinationRules.getBoardingRequirements,
  calculateNextDueDate: vaccinationRules.calculateNextDueDate,
  STATE_VACCINATION_RULES: vaccinationRules.STATE_VACCINATION_RULES,

  // Audit Trail exports
  auditUtils,
  AUDIT_ACTIONS: auditUtils.AUDIT_ACTIONS,
  ENTITY_TYPES: auditUtils.ENTITY_TYPES,
  DATA_TYPES: auditUtils.DATA_TYPES,
  createAuditLog: auditUtils.createAuditLog,
  createAuthAuditLog: auditUtils.createAuthAuditLog,
  createDataAccessLog: auditUtils.createDataAccessLog,
  createConfigChangeLog: auditUtils.createConfigChangeLog,
  queryAuditLogs: auditUtils.queryAuditLogs,
  getAuditSummary: auditUtils.getAuditSummary,
  extractAuditContext: auditUtils.extractAuditContext,
  maskSensitiveData: auditUtils.maskSensitiveData,
};
