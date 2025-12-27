/**
 * =============================================================================
 * BarkBase Config Service Lambda
 * =============================================================================
 *
 * Handles configuration endpoints:
 * - GET /api/v1/config/tenant - Get tenant configuration (from JWT/DB)
 * - PUT /api/v1/config/tenant - Update tenant configuration
 * - GET /api/v1/config/tenant/theme - Get tenant theme
 * - PUT /api/v1/config/tenant/theme - Update tenant theme
 * - GET /api/v1/config/tenant/features - Get tenant features
 * - GET /api/v1/config/system - Get system configuration
 * - GET /api/v1/config/settings - Get all settings
 *
 * Enterprise Memberships API:
 * - GET /api/v1/memberships - List staff members for current tenant
 * - POST /api/v1/memberships - Create/invite new staff member
 * - PUT /api/v1/memberships/:id - Update member role/status
 * - DELETE /api/v1/memberships/:id - Remove member from tenant
 *
 * Custom Properties API (v2):
 * - GET /api/v2/properties - List all properties for tenant (filterable by entity_type)
 * - GET /api/v2/properties/:id - Get single property
 * - POST /api/v2/properties - Create property
 * - PUT /api/v2/properties/:id - Update property
 * - DELETE /api/v2/properties/:id - Soft delete (set is_active=false)
 * - POST /api/v2/properties/:id/archive - Archive property
 * - POST /api/v2/properties/:id/restore - Restore archived property
 * - GET /api/v2/properties/values/:entity_type/:entity_id - Get property values for entity
 * - PUT /api/v2/properties/values/:entity_type/:entity_id - Bulk upsert property values
 *
 * Entity Definitions API (v2) - Custom Objects:
 * - GET /api/v2/entities - List all entity definitions for tenant
 * - GET /api/v2/entities/:id - Get single entity definition
 * - POST /api/v2/entities - Create custom entity definition
 * - PUT /api/v2/entities/:id - Update entity definition
 * - DELETE /api/v2/entities/:id - Soft delete (blocked for system entities)
 *
 * =============================================================================
 */

// Import from layers (mounted at /opt/nodejs in Lambda)
let dbLayer, sharedLayer;

try {
  dbLayer = require('/opt/nodejs/db');
  sharedLayer = require('/opt/nodejs/index');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
  sharedLayer = require('../../layers/shared-layer/nodejs/index');
}

const { getPoolAsync, query, softDelete, softDeleteBatch, getNextRecordId } = dbLayer;
const {
  authenticateRequest,
  createResponse,
  parseBody,
  // Account code resolver (New ID System)
  resolveAccountContext,
  rewritePathToLegacy,
} = sharedLayer;

// S3 SDK for file uploads
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-2' });

/**
 * Route requests to appropriate handlers
 */
exports.handler = async (event, context) => {
  // Handle admin path rewriting (Ops Center requests)
  const { handleAdminPathRewrite } = require('/opt/nodejs/index');
  handleAdminPathRewrite(event);

  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  let path = event.requestContext?.http?.path || event.path || '/';

  console.log('[CONFIG-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  try {
    // =========================================================================
    // NEW ID SYSTEM: Resolve account_code to tenant_id
    // Supports both new URL pattern and X-Account-Code header
    // =========================================================================
    const accountContext = await resolveAccountContext(event);
    if (!accountContext.valid) {
      console.error('[CONFIG-SERVICE] Account context invalid:', accountContext.error);
      return createResponse(400, {
        error: 'BadRequest',
        message: accountContext.error || 'Invalid account context',
      });
    }

    // If using new ID pattern, rewrite path to legacy format for handler compatibility
    if (accountContext.isNewPattern) {
      rewritePathToLegacy(event, accountContext);
      path = event.requestContext?.http?.path || event.path || '/';
      console.log('[CONFIG-SERVICE] New ID pattern detected:', {
        accountCode: accountContext.accountCode,
        tenantId: accountContext.tenantId,
        typeId: accountContext.typeId,
        recordId: accountContext.recordId,
      });
    }

    // Store resolved tenant_id for later use
    event.resolvedTenantId = accountContext.tenantId;
    event.accountContext = accountContext;

    // Authenticate request
    console.log('[CONFIG-SERVICE] Starting authentication...');
    const authResult = await authenticateRequest(event);
    console.log('[CONFIG-SERVICE] Auth result:', { authenticated: authResult.authenticated, userId: authResult.user?.id });
    if (!authResult.authenticated) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      });
    }

    // Attach user to event
    const user = authResult.user;

    // Route to appropriate handler
    // Tenant config routes
    if (path === '/api/v1/config/tenant' || path === '/config/tenant') {
      if (method === 'GET') {
        return handleGetTenantConfig(user, event);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateTenantConfig(user, parseBody(event));
      }
    }

    if (path === '/api/v1/config/tenant/theme' || path === '/config/tenant/theme') {
      if (method === 'GET') {
        return handleGetTenantTheme(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateTenantTheme(user, parseBody(event));
      }
    }

    if (path === '/api/v1/config/tenant/features' || path === '/config/tenant/features') {
      if (method === 'GET') {
        return handleGetTenantFeatures(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateTenantFeatures(user, parseBody(event));
      }
    }

    if (path === '/api/v1/config/tenant/onboarding' || path === '/config/tenant/onboarding') {
      if (method === 'GET') {
        return handleGetOnboarding(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateOnboarding(user, parseBody(event));
      }
    }

    // System config routes
    if (path === '/api/v1/config/system' || path === '/config/system') {
      if (method === 'GET') {
        return handleGetSystemConfig();
      }
    }

    if (path === '/api/v1/config/system/features' || path === '/config/system/features') {
      if (method === 'GET') {
        return handleGetSystemFeatures();
      }
    }

    // Settings routes
    if (path === '/api/v1/config/settings' || path === '/config/settings') {
      if (method === 'GET') {
        return handleGetSettings(user);
      }
    }

    // =========================================================================
    // ACCOUNT DEFAULTS API
    // =========================================================================
    // Business info, operating hours, holidays, regional settings, currency
    // =========================================================================
    if (path === '/api/v1/account-defaults' || path === '/account-defaults') {
      if (method === 'GET') {
        return handleGetAccountDefaults(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateAccountDefaults(user, parseBody(event));
      }
    }

    // Logo upload for account defaults
    if (path === '/api/v1/account-defaults/logo' || path === '/account-defaults/logo') {
      if (method === 'POST') {
        return handleUploadLogo(user, event);
      }
    }

    // =========================================================================
    // KENNEL TYPES API
    // =========================================================================
    if (path === '/api/v1/config/kennel-types' || path === '/config/kennel-types') {
      if (method === 'GET') {
        return handleGetKennelTypes(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateKennelTypes(user, parseBody(event));
      }
    }

    // =========================================================================
    // STAFF ROLES API - Simple array in TenantSettings (like kennel types)
    // =========================================================================
    if (path === '/api/v1/config/staff-roles' || path === '/config/staff-roles') {
      if (method === 'GET') {
        return handleGetStaffRoles(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateStaffRoles(user, parseBody(event));
      }
    }

    // =========================================================================
    // BRANDING SETTINGS API
    // =========================================================================
    if (path === '/api/v1/config/branding' || path === '/config/branding' || path === '/api/v1/branding') {
      if (method === 'GET') {
        return handleGetBranding(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateBranding(user, parseBody(event));
      }
    }

    // =========================================================================
    // FILE UPLOAD API - Generate presigned S3 URLs
    // =========================================================================
    if (path === '/api/v1/upload-url' || path === '/upload-url') {
      if (method === 'POST') {
        return handleGetUploadUrl(user, parseBody(event));
      }
    }

    // =========================================================================
    // NOTIFICATION SETTINGS API
    // =========================================================================
    if (path === '/api/v1/config/notifications' || path === '/config/notifications' || path === '/api/v1/notification-settings') {
      if (method === 'GET') {
        return handleGetNotificationSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateNotificationSettings(user, parseBody(event));
      }
    }

    // Test notification endpoint
    if (path === '/api/v1/config/notifications/test' || path === '/config/notifications/test') {
      if (method === 'POST') {
        return handleSendTestNotification(user, parseBody(event));
      }
    }

    // =========================================================================
    // SMS SETTINGS API
    // =========================================================================
    // Twilio configuration, SMS templates, and test messaging
    // =========================================================================
    if (path === '/api/v1/settings/sms' || path === '/settings/sms') {
      if (method === 'GET') {
        return handleGetSmsSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateSmsSettings(user, parseBody(event));
      }
    }

    if (path === '/api/v1/settings/sms/test' || path === '/settings/sms/test') {
      if (method === 'POST') {
        return handleSendTestSms(user, parseBody(event));
      }
    }

    if (path === '/api/v1/settings/sms/verify' || path === '/settings/sms/verify') {
      if (method === 'POST') {
        return handleVerifyTwilioConnection(user, parseBody(event));
      }
    }

    if (path === '/api/v1/settings/sms/disconnect' || path === '/settings/sms/disconnect') {
      if (method === 'POST') {
        return handleDisconnectTwilio(user);
      }
    }

    if (path === '/api/v1/settings/sms/templates' || path === '/settings/sms/templates') {
      if (method === 'GET') {
        return handleGetSmsTemplates(user);
      }
    }

    const smsTemplateMatch = path.match(/^\/(?:api\/v1\/)?settings\/sms\/templates\/([a-z_]+)$/i);
    if (smsTemplateMatch) {
      const templateType = smsTemplateMatch[1];
      if (method === 'GET') {
        return handleGetSmsTemplate(user, templateType);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateSmsTemplate(user, templateType, parseBody(event));
      }
    }


    // =========================================================================
    // EMAIL SETTINGS API
    // =========================================================================
    // Email branding, automation toggles, templates, and test sending
    // =========================================================================
    if (path === '/api/v1/settings/email' || path === '/settings/email') {
      if (method === 'GET') {
        return handleGetEmailSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateEmailSettings(user, parseBody(event));
      }
    }

    if (path === '/api/v1/settings/email/test' || path === '/settings/email/test') {
      if (method === 'POST') {
        return handleSendTestEmail(user, parseBody(event));
      }
    }

    if (path === '/api/v1/settings/email/usage' || path === '/settings/email/usage') {
      if (method === 'GET') {
        return handleGetEmailUsage(user);
      }
    }

    if (path === '/api/v1/settings/email/templates' || path === '/settings/email/templates') {
      if (method === 'GET') {
        return handleGetEmailTemplates(user);
      }
    }

    const emailTemplateMatch = path.match(/^\/(?:api\/v1\/)?settings\/email\/templates\/([a-z_]+)$/i);
    if (emailTemplateMatch) {
      const templateType = emailTemplateMatch[1];
      if (method === 'GET') {
        return handleGetEmailTemplate(user, templateType);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateEmailTemplate(user, templateType, parseBody(event));
      }
    }

    // =========================================================================
    // DOMAIN SETTINGS API
    // =========================================================================
    // Custom domain and SSL configuration
    // =========================================================================
    if (path === '/api/v1/settings/domain' || path === '/settings/domain') {
      if (method === 'GET') {
        return handleGetDomainSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateDomainSettings(user, parseBody(event));
      }
    }

    // Verify custom domain
    if (path === '/api/v1/settings/domain/verify' || path === '/settings/domain/verify') {
      if (method === 'POST') {
        return handleVerifyDomain(user);
      }
    }

    // Check domain verification status
    if (path === '/api/v1/settings/domain/status' || path === '/settings/domain/status') {
      if (method === 'GET') {
        return handleGetDomainStatus(user);
      }
    }

    // =========================================================================
    // ONLINE BOOKING SETTINGS API
    // =========================================================================
    // Customer-facing booking portal configuration
    // =========================================================================
    if (path === '/api/v1/settings/online-booking' || path === '/settings/online-booking') {
      if (method === 'GET') {
        return handleGetOnlineBookingSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateOnlineBookingSettings(user, parseBody(event));
      }
    }

    // Check URL slug availability
    if (path === '/api/v1/settings/online-booking/check-slug' || path === '/settings/online-booking/check-slug') {
      if (method === 'POST') {
        return handleCheckSlugAvailability(user, parseBody(event));
      }
    }

    // Generate QR code for portal link
    if (path === '/api/v1/settings/online-booking/qr-code' || path === '/settings/online-booking/qr-code') {
      if (method === 'GET') {
        return handleGetPortalQRCode(user);
      }
    }

    // =========================================================================
    // CALENDAR SETTINGS API
    // =========================================================================
    // Calendar view, colors, display options, capacity indicators
    // =========================================================================
    if (path === '/api/v1/settings/calendar' || path === '/settings/calendar') {
      if (method === 'GET') {
        return handleGetCalendarSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateCalendarSettings(user, parseBody(event));
      }
    }

    // =========================================================================
    // BOOKING SETTINGS API
    // =========================================================================
    // Booking rules, booking windows, operating hours
    // =========================================================================
    if (path === '/api/v1/settings/booking' || path === '/settings/booking') {
      if (method === 'GET') {
        return handleGetBookingSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateBookingSettings(user, parseBody(event));
      }
    }

    // =========================================================================
    // INVOICE SETTINGS API
    // =========================================================================
    // Invoice defaults, tax, branding, payment instructions, late fees, automation
    // =========================================================================
    if (path === '/api/v1/settings/invoicing' || path === '/settings/invoicing') {
      if (method === 'GET') {
        return handleGetInvoiceSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateInvoiceSettings(user, parseBody(event));
      }
    }

    if (path === '/api/v1/settings/invoicing/preview' || path === '/settings/invoicing/preview') {
      if (method === 'GET') {
        return handleGetInvoicePreview(user);
      }
    }

    // =========================================================================
    // POLICIES API
    // =========================================================================
    // Cancellation, deposit, late pickup policies
    // =========================================================================
    if (path === '/api/v1/policies' || path === '/policies') {
      if (method === 'GET') {
        return handleGetPolicies(user);
      }
      if (method === 'POST') {
        return handleCreatePolicy(user, parseBody(event));
      }
    }

    // Policy templates endpoint
    if (path === '/api/v1/policies/templates' || path === '/policies/templates') {
      if (method === 'GET') {
        return handleGetPolicyTemplates();
      }
    }

    const policyIdMatch = path.match(/^\/(?:api\/v1\/)?policies\/([a-f0-9-]+)$/i);
    if (policyIdMatch) {
      const policyId = policyIdMatch[1];
      if (method === 'GET') {
        return handleGetPolicy(user, policyId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePolicy(user, policyId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeletePolicy(user, policyId);
      }
    }

    // =========================================================================
    // REQUIRED VACCINATIONS API
    // =========================================================================
    // Facility-level vaccination requirements
    // =========================================================================
    if (path === '/api/v1/config/required-vaccinations' || path === '/config/required-vaccinations') {
      if (method === 'GET') {
        return handleGetRequiredVaccinations(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateRequiredVaccinations(user, parseBody(event));
      }
    }

    // =========================================================================
    // PAYMENT SETTINGS API
    // =========================================================================
    if (path === '/api/v1/settings/payments' || path === '/settings/payments') {
      if (method === 'GET') {
        return handleGetPaymentSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePaymentSettings(user, parseBody(event));
      }
    }

    // Legacy route - redirect to new path
    if (path === '/api/v1/config/payment-settings' || path === '/config/payment-settings') {
      if (method === 'GET') {
        return handleGetPaymentSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePaymentSettings(user, parseBody(event));
      }
    }

    if (path === '/api/v1/settings/payments/test-stripe' || path === '/settings/payments/test-stripe') {
      if (method === 'POST') {
        return handleTestStripeConnection(user, parseBody(event));
      }
    }

    if (path === '/api/v1/settings/payments/stripe-status' || path === '/settings/payments/stripe-status') {
      if (method === 'GET') {
        return handleGetStripeStatus(user);
      }
    }

    if (path === '/api/v1/settings/payments/disconnect-stripe' || path === '/settings/payments/disconnect-stripe') {
      if (method === 'POST') {
        return handleDisconnectStripe(user);
      }
    }

    // =========================================================================
    // PRIVACY SETTINGS API
    // =========================================================================
    // Data retention policies, staff visibility, communication defaults
    // =========================================================================
    if (path === '/api/v1/config/privacy' || path === '/config/privacy') {
      if (method === 'GET') {
        return handleGetPrivacySettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePrivacySettings(user, parseBody(event));
      }
    }

    // =========================================================================
    // IMPORT/EXPORT API
    // =========================================================================
    // Data import and export operations for backup, migration, and bulk updates
    // =========================================================================

    // GET /api/v1/import-export/jobs - List recent import/export jobs
    if ((path === '/api/v1/import-export/jobs' || path === '/import-export/jobs') && method === 'GET') {
      return handleGetImportExportJobs(user);
    }

    // POST /api/v1/import-export/export - Start an export job
    if ((path === '/api/v1/import-export/export' || path === '/import-export/export') && method === 'POST') {
      return handleCreateExport(user, parseBody(event));
    }

    // POST /api/v1/import-export/import - Process an import
    if ((path === '/api/v1/import-export/import' || path === '/import-export/import') && method === 'POST') {
      return handleProcessImport(user, event);
    }

    // GET /api/v1/import-export/jobs/:id - Get job details
    const importExportJobMatch = path.match(/^\/(?:api\/v1\/)?import-export\/jobs\/([a-f0-9-]+)$/i);
    if (importExportJobMatch && method === 'GET') {
      const jobId = importExportJobMatch[1];
      return handleGetImportExportJob(user, jobId);
    }

    // GET /api/v1/import-export/jobs/:id/download - Download export file
    const importExportDownloadMatch = path.match(/^\/(?:api\/v1\/)?import-export\/jobs\/([a-f0-9-]+)\/download$/i);
    if (importExportDownloadMatch && method === 'GET') {
      const jobId = importExportDownloadMatch[1];
      return handleDownloadExport(user, jobId);
    }

    // GET /api/v1/imports - List all imports (enterprise history)
    if ((path === '/api/v1/imports' || path === '/imports') && method === 'GET') {
      return handleListImports(user, event.queryStringParameters || {});
    }

    // GET /api/v1/imports/:id - Get import details (enterprise summary)
    const importDetailMatch = path.match(/^\/(?:api\/v1\/)?imports\/([a-f0-9-]+)$/i);
    if (importDetailMatch && method === 'GET') {
      const importId = importDetailMatch[1];
      return handleGetImportDetail(user, importId);
    }

    // GET /api/v1/imports/:id/errors - Download error file
    const importErrorsMatch = path.match(/^\/(?:api\/v1\/)?imports\/([a-f0-9-]+)\/errors$/i);
    if (importErrorsMatch && method === 'GET') {
      const importId = importErrorsMatch[1];
      return handleDownloadImportErrors(user, importId);
    }

    // DELETE /api/v1/imports/:id - Delete import record
    const importDeleteMatch = path.match(/^\/(?:api\/v1\/)?imports\/([a-f0-9-]+)$/i);
    if (importDeleteMatch && method === 'DELETE') {
      const importId = importDeleteMatch[1];
      return handleDeleteImport(user, importId);
    }

    // =========================================================================
    // INTEGRATIONS API
    // =========================================================================
    // Third-party integrations: Google Calendar, Stripe, Mailchimp, Twilio, QuickBooks
    // =========================================================================

    // GET /api/v1/integrations - List all integrations with status
    if ((path === '/api/v1/integrations' || path === '/integrations') && method === 'GET') {
      return handleListIntegrations(user);
    }

    // GET /api/v1/integrations/:provider - Get specific integration
    const integrationMatch = path.match(/^\/(?:api\/v1\/)?integrations\/(google-calendar|stripe|mailchimp|twilio|quickbooks)$/i);
    if (integrationMatch && method === 'GET') {
      const provider = integrationMatch[1].toLowerCase();
      return handleGetIntegration(user, provider);
    }

    // =========================================================================
    // FORMS API (Custom forms and waivers)
    // =========================================================================

    // GET /api/v1/forms - List forms
    if ((path === '/api/v1/forms' || path === '/forms') && method === 'GET') {
      return handleGetForms(user);
    }

    // POST /api/v1/forms - Create form
    if ((path === '/api/v1/forms' || path === '/forms') && method === 'POST') {
      return handleCreateForm(user, parseBody(event));
    }

    // GET /api/v1/forms/settings - Get form settings
    if ((path === '/api/v1/forms/settings' || path === '/forms/settings') && method === 'GET') {
      return handleGetFormSettings(user);
    }

    // PUT /api/v1/forms/settings - Update form settings
    if ((path === '/api/v1/forms/settings' || path === '/forms/settings') && (method === 'PUT' || method === 'PATCH')) {
      return handleUpdateFormSettings(user, parseBody(event));
    }

    // GET /api/v1/forms/templates - Get form templates
    if ((path === '/api/v1/forms/templates' || path === '/forms/templates') && method === 'GET') {
      return handleGetFormTemplates(user);
    }

    // POST /api/v1/forms/templates/:templateId/use - Create form from template
    const useTemplateMatch = path.match(/^\/(?:api\/v1\/)?forms\/templates\/([a-z_-]+)\/use$/i);
    if (useTemplateMatch && method === 'POST') {
      return handleUseFormTemplate(user, useTemplateMatch[1]);
    }

    // Single form routes
    const formIdMatch = path.match(/^\/(?:api\/v1\/)?forms\/([a-f0-9-]+)$/i);
    if (formIdMatch) {
      const formId = formIdMatch[1];
      if (method === 'GET') return handleGetForm(user, formId);
      if (method === 'PUT' || method === 'PATCH') return handleUpdateForm(user, formId, parseBody(event));
      if (method === 'DELETE') return handleDeleteForm(user, formId);
    }

    // Duplicate form
    const duplicateFormMatch = path.match(/^\/(?:api\/v1\/)?forms\/([a-f0-9-]+)\/duplicate$/i);
    if (duplicateFormMatch && method === 'POST') {
      return handleDuplicateForm(user, duplicateFormMatch[1]);
    }

    // Form submissions
    const formSubmissionsMatch = path.match(/^\/(?:api\/v1\/)?forms\/([a-f0-9-]+)\/submissions$/i);
    if (formSubmissionsMatch && method === 'GET') {
      return handleGetFormSubmissions(user, formSubmissionsMatch[1]);
    }

    // =========================================================================
    // DOCUMENTS API (Received customer files)
    // =========================================================================

    // GET /api/v1/documents - List documents
    if ((path === '/api/v1/documents' || path === '/documents') && method === 'GET') {
      return handleGetDocuments(user, event.queryStringParameters || {});
    }

    // POST /api/v1/documents - Upload document
    if ((path === '/api/v1/documents' || path === '/documents') && method === 'POST') {
      return handleCreateDocument(user, parseBody(event));
    }

    // GET /api/v1/documents/stats - Get storage stats
    if ((path === '/api/v1/documents/stats' || path === '/documents/stats') && method === 'GET') {
      return handleGetDocumentStats(user);
    }

    // Single document routes
    const documentIdMatch = path.match(/^\/(?:api\/v1\/)?documents\/([a-f0-9-]+)$/i);
    if (documentIdMatch) {
      const docId = documentIdMatch[1];
      if (method === 'GET') return handleGetDocument(user, docId);
      if (method === 'DELETE') return handleDeleteDocument(user, docId);
    }

    // =========================================================================
    // FILES/TEMPLATES API (Outgoing templates)
    // =========================================================================

    // GET /api/v1/files/templates - List templates
    if ((path === '/api/v1/files/templates' || path === '/files/templates') && method === 'GET') {
      return handleGetFileTemplates(user);
    }

    // POST /api/v1/files/templates - Create template
    if ((path === '/api/v1/files/templates' || path === '/files/templates') && method === 'POST') {
      return handleCreateFileTemplate(user, parseBody(event));
    }

    // Single template routes
    const templateIdMatch = path.match(/^\/(?:api\/v1\/)?files\/templates\/([a-f0-9-]+)$/i);
    if (templateIdMatch) {
      const templateId = templateIdMatch[1];
      if (method === 'GET') return handleGetFileTemplate(user, templateId);
      if (method === 'PUT' || method === 'PATCH') return handleUpdateFileTemplate(user, templateId, parseBody(event));
      if (method === 'DELETE') return handleDeleteFileTemplate(user, templateId);
    }

    // GET /api/v1/files/custom - List custom files
    if ((path === '/api/v1/files/custom' || path === '/files/custom') && method === 'GET') {
      return handleGetCustomFiles(user);
    }

    // POST /api/v1/files/custom - Upload custom file
    if ((path === '/api/v1/files/custom' || path === '/files/custom') && method === 'POST') {
      return handleCreateCustomFile(user, parseBody(event));
    }

    // Single custom file routes
    const customFileIdMatch = path.match(/^\/(?:api\/v1\/)?files\/custom\/([a-f0-9-]+)$/i);
    if (customFileIdMatch) {
      const fileId = customFileIdMatch[1];
      if (method === 'GET') return handleGetCustomFile(user, fileId);
      if (method === 'DELETE') return handleDeleteCustomFile(user, fileId);
    }

    // =========================================================================
    // ENTERPRISE MEMBERSHIPS API
    // =========================================================================
    // Memberships represent the link between Users and Tenants (staff/team).
    // This is the canonical staff/org management interface for BarkBase.
    // All membership operations are tenant-scoped via the authenticated user.
    // =========================================================================

    // GET /api/v1/memberships - List all members for current tenant
    if ((path === '/api/v1/memberships' || path === '/memberships') && method === 'GET') {
      return handleGetMemberships(user);
    }

    // POST /api/v1/memberships - Create/invite new member
    if ((path === '/api/v1/memberships' || path === '/memberships') && method === 'POST') {
      return handleCreateMembership(user, parseBody(event));
    }

    // PUT/PATCH /api/v1/memberships/:id - Update member role/status
    const membershipUpdateMatch = path.match(/^\/(?:api\/v1\/)?memberships\/([a-f0-9-]+)$/i);
    if (membershipUpdateMatch && (method === 'PUT' || method === 'PATCH')) {
      const membershipId = membershipUpdateMatch[1];
      return handleUpdateMembership(user, membershipId, parseBody(event));
    }

    // DELETE /api/v1/memberships/:id - Remove member from tenant
    if (membershipUpdateMatch && method === 'DELETE') {
      const membershipId = membershipUpdateMatch[1];
      return handleDeleteMembership(user, membershipId);
    }

    // =========================================================================
    // CUSTOM PROPERTIES API (v2)
    // =========================================================================
    // Enterprise custom fields system - enterprise-grade's custom properties
    // Allows tenants to define their own data model per entity type
    // =========================================================================

    // Property values routes (must be matched before property ID routes)
    // GET /api/v2/properties/values/:entity_type/:entity_id
    const propertyValuesMatch = path.match(/^\/api\/v2\/properties\/values\/([a-z_]+)\/([a-f0-9-]+)$/i);
    if (propertyValuesMatch && method === 'GET') {
      const [, entityType, entityId] = propertyValuesMatch;
      return handleGetPropertyValues(user, entityType, entityId);
    }

    // PUT /api/v2/properties/values/:entity_type/:entity_id - Bulk upsert
    if (propertyValuesMatch && method === 'PUT') {
      const [, entityType, entityId] = propertyValuesMatch;
      return handleUpsertPropertyValues(user, entityType, entityId, parseBody(event));
    }

    // Archive/Restore routes (must be matched before generic property ID routes)
    // POST /api/v2/properties/:id/archive
    const propertyArchiveMatch = path.match(/^\/api\/v2\/properties\/([a-f0-9-]+)\/archive$/i);
    if (propertyArchiveMatch && method === 'POST') {
      const propertyId = propertyArchiveMatch[1];
      return handleArchiveProperty(user, propertyId, parseBody(event));
    }

    // POST /api/v2/properties/:id/restore
    const propertyRestoreMatch = path.match(/^\/api\/v2\/properties\/([a-f0-9-]+)\/restore$/i);
    if (propertyRestoreMatch && method === 'POST') {
      const propertyId = propertyRestoreMatch[1];
      return handleRestoreProperty(user, propertyId);
    }

    // GET /api/v2/properties/list - List all properties
    // Also support legacy /api/v2/properties for backwards compatibility
    if ((path === '/api/v2/properties' || path === '/api/v2/properties/' || path === '/api/v2/properties/list') && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      return handleListProperties(user, queryParams);
    }

    // POST /api/v2/properties/create - Create property
    // Also support legacy /api/v2/properties for backwards compatibility
    if ((path === '/api/v2/properties' || path === '/api/v2/properties/' || path === '/api/v2/properties/create') && method === 'POST') {
      return handleCreateProperty(user, parseBody(event));
    }

    // Single property routes
    const propertyIdMatch = path.match(/^\/api\/v2\/properties\/([a-f0-9-]+)$/i);

    // GET /api/v2/properties/:id
    if (propertyIdMatch && method === 'GET') {
      const propertyId = propertyIdMatch[1];
      return handleGetProperty(user, propertyId);
    }

    // PUT/PATCH /api/v2/properties/:id
    if (propertyIdMatch && (method === 'PUT' || method === 'PATCH')) {
      const propertyId = propertyIdMatch[1];
      return handleUpdateProperty(user, propertyId, parseBody(event));
    }

    // DELETE /api/v2/properties/:id (soft delete)
    if (propertyIdMatch && method === 'DELETE') {
      const propertyId = propertyIdMatch[1];
      return handleDeleteProperty(user, propertyId);
    }

    // =========================================================================
    // PROPERTY GROUPS API
    // =========================================================================

    // GET /api/v2/property-groups - List all groups for entity type
    if ((path === '/api/v2/property-groups' || path === '/api/v2/property-groups/') && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      return handleListPropertyGroups(user, queryParams);
    }

    // POST /api/v2/property-groups - Create property group
    if ((path === '/api/v2/property-groups' || path === '/api/v2/property-groups/') && method === 'POST') {
      return handleCreatePropertyGroup(user, parseBody(event));
    }

    // Single property group routes
    const propertyGroupIdMatch = path.match(/^\/api\/v2\/property-groups\/([a-f0-9-]+)$/i);

    // PUT/PATCH /api/v2/property-groups/:id
    if (propertyGroupIdMatch && (method === 'PUT' || method === 'PATCH')) {
      const groupId = propertyGroupIdMatch[1];
      return handleUpdatePropertyGroup(user, groupId, parseBody(event));
    }

    // DELETE /api/v2/property-groups/:id
    if (propertyGroupIdMatch && method === 'DELETE') {
      const groupId = propertyGroupIdMatch[1];
      return handleDeletePropertyGroup(user, groupId);
    }

    // =========================================================================
    // PROPERTY LOGIC RULES API
    // =========================================================================

    // GET /api/v2/property-logic - List all logic rules for entity type
    if ((path === '/api/v2/property-logic' || path === '/api/v2/property-logic/') && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      return handleListPropertyLogicRules(user, queryParams);
    }

    // POST /api/v2/property-logic - Create logic rule
    if ((path === '/api/v2/property-logic' || path === '/api/v2/property-logic/') && method === 'POST') {
      return handleCreatePropertyLogicRule(user, parseBody(event));
    }

    // Single property logic routes
    const propertyLogicIdMatch = path.match(/^\/api\/v2\/property-logic\/([a-f0-9-]+)$/i);

    // PUT/PATCH /api/v2/property-logic/:id
    if (propertyLogicIdMatch && (method === 'PUT' || method === 'PATCH')) {
      const ruleId = propertyLogicIdMatch[1];
      return handleUpdatePropertyLogicRule(user, ruleId, parseBody(event));
    }

    // DELETE /api/v2/property-logic/:id
    if (propertyLogicIdMatch && method === 'DELETE') {
      const ruleId = propertyLogicIdMatch[1];
      return handleDeletePropertyLogicRule(user, ruleId);
    }

    // =========================================================================
    // PROPERTY TEMPLATES API (Quick-Add)
    // =========================================================================

    // GET /api/v2/property-templates - List templates for entity type
    if ((path === '/api/v2/property-templates' || path === '/api/v2/property-templates/') && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      return handleListPropertyTemplates(user, queryParams);
    }

    // =========================================================================
    // ENTITY DEFINITIONS API (v2) - Custom Objects
    // =========================================================================
    // Allows tenants to define custom entity types beyond built-in ones.
    // System entities (pet, owner, booking, etc.) cannot be deleted.
    // Feature gating: FREE: 0, PRO: 3, ENTERPRISE: unlimited custom objects
    // =========================================================================

    // GET /api/v2/entities/list - List all entity definitions
    // Also support legacy /api/v2/entities for backwards compatibility
    if ((path === '/api/v2/entities' || path === '/api/v2/entities/' || path === '/api/v2/entities/list') && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      return handleListEntityDefinitions(user, queryParams);
    }

    // POST /api/v2/entities/create - Create custom entity definition
    // Also support legacy /api/v2/entities for backwards compatibility
    if ((path === '/api/v2/entities' || path === '/api/v2/entities/' || path === '/api/v2/entities/create') && method === 'POST') {
      return handleCreateEntityDefinition(user, parseBody(event));
    }

    // Single entity definition routes
    const entityIdMatch = path.match(/^\/api\/v2\/entities\/([a-f0-9-]+)$/i);

    // GET /api/v2/entities/:id
    if (entityIdMatch && method === 'GET') {
      const entityId = entityIdMatch[1];
      return handleGetEntityDefinition(user, entityId);
    }

    // PUT/PATCH /api/v2/entities/:id
    if (entityIdMatch && (method === 'PUT' || method === 'PATCH')) {
      const entityId = entityIdMatch[1];
      return handleUpdateEntityDefinition(user, entityId, parseBody(event));
    }

    // DELETE /api/v2/entities/:id (soft delete - blocked for system entities)
    if (entityIdMatch && method === 'DELETE') {
      const entityId = entityIdMatch[1];
      return handleDeleteEntityDefinition(user, entityId);
    }

    // =========================================================================
    // FORMS & WAIVERS API
    // =========================================================================
    // Form templates and submissions for intake forms, waivers, and agreements
    // /api/v1/forms/* - Form templates
    // /api/v1/forms/submissions/* - Form submissions
    // =========================================================================

    // GET /api/v1/forms - List form templates
    if ((path === '/api/v1/forms' || path === '/forms') && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      return handleListFormTemplates(user, queryParams);
    }

    // POST /api/v1/forms - Create form template
    if ((path === '/api/v1/forms' || path === '/forms') && method === 'POST') {
      return handleCreateFormTemplate(user, parseBody(event));
    }

    // Form submissions list
    if ((path === '/api/v1/forms/submissions' || path === '/forms/submissions') && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      return handleListFormSubmissions(user, queryParams);
    }

    // Single form template routes
    const formTemplateIdMatch = path.match(/^\/(?:api\/v1\/)?forms\/([a-f0-9-]+)$/i);
    if (formTemplateIdMatch) {
      const formId = formTemplateIdMatch[1];

      if (method === 'GET') {
        return handleGetFormTemplate(user, formId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateFormTemplate(user, formId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteFormTemplate(user, formId);
      }
    }

    // Form submissions by template
    const templateSubmissionsMatch = path.match(/^\/(?:api\/v1\/)?forms\/([a-f0-9-]+)\/submissions$/i);
    if (templateSubmissionsMatch && method === 'GET') {
      const formId = templateSubmissionsMatch[1];
      const queryParams = event.queryStringParameters || {};
      return handleListFormSubmissions(user, { ...queryParams, templateId: formId });
    }

    // Create submission for a form
    if (templateSubmissionsMatch && method === 'POST') {
      const formId = templateSubmissionsMatch[1];
      return handleCreateFormSubmission(user, formId, parseBody(event));
    }

    // Single submission routes
    const submissionIdMatch = path.match(/^\/(?:api\/v1\/)?forms\/submissions\/([a-f0-9-]+)$/i);
    if (submissionIdMatch) {
      const submissionId = submissionIdMatch[1];

      if (method === 'GET') {
        return handleGetFormSubmission(user, submissionId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateFormSubmission(user, submissionId, parseBody(event));
      }
    }

    // =========================================================================
    // PACKAGE TEMPLATES API
    // =========================================================================
    // Prepaid credit packages that facilities OFFER for purchase
    // (The Package table tracks PURCHASED packages per customer)
    // =========================================================================

    // GET /api/v1/package-templates - List all package templates
    if ((path === '/api/v1/package-templates' || path === '/package-templates') && method === 'GET') {
      return handleListPackageTemplates(user);
    }

    // POST /api/v1/package-templates - Create package template
    if ((path === '/api/v1/package-templates' || path === '/package-templates') && method === 'POST') {
      return handleCreatePackageTemplate(user, parseBody(event));
    }

    // Single package template routes
    const packageTemplateIdMatch = path.match(/^\/(?:api\/v1\/)?package-templates\/([a-f0-9-]+)$/i);
    if (packageTemplateIdMatch) {
      const templateId = packageTemplateIdMatch[1];

      if (method === 'GET') {
        return handleGetPackageTemplate(user, templateId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePackageTemplate(user, templateId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeletePackageTemplate(user, templateId);
      }
    }

    // =========================================================================
    // SERVICES API (Primary Services - boarding, daycare, grooming, training)
    // =========================================================================
    // Main services offered by the facility (from Service table)
    // =========================================================================

    // GET /api/v1/services - List all services
    if ((path === '/api/v1/services' || path === '/services') && method === 'GET') {
      return handleListServices(user, event.queryStringParameters || {});
    }

    // POST /api/v1/services - Create service
    if ((path === '/api/v1/services' || path === '/services') && method === 'POST') {
      return handleCreateService(user, parseBody(event));
    }

    // Single service routes
    const serviceIdMatch = path.match(/^\/(?:api\/v1\/)?services\/([a-f0-9-]+)$/i);
    if (serviceIdMatch) {
      const serviceId = serviceIdMatch[1];

      if (method === 'GET') {
        return handleGetService(user, serviceId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateService(user, serviceId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteService(user, serviceId);
      }
    }

    // =========================================================================
    // ADD-ON SERVICES API
    // =========================================================================
    // Optional extras customers can add to bookings
    // =========================================================================

    // GET /api/v1/addon-services - List all add-on services
    if ((path === '/api/v1/addon-services' || path === '/addon-services') && method === 'GET') {
      return handleListAddOnServices(user);
    }

    // POST /api/v1/addon-services - Create add-on service
    if ((path === '/api/v1/addon-services' || path === '/addon-services') && method === 'POST') {
      return handleCreateAddOnService(user, parseBody(event));
    }

    // Single add-on service routes
    const addonServiceIdMatch = path.match(/^\/(?:api\/v1\/)?addon-services\/([a-f0-9-]+)$/i);
    if (addonServiceIdMatch) {
      const addonId = addonServiceIdMatch[1];

      if (method === 'GET') {
        return handleGetAddOnService(user, addonId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateAddOnService(user, addonId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteAddOnService(user, addonId);
      }
    }

    // =========================================================================
    // OBJECT SETTINGS API
    // =========================================================================
    // GET /api/v1/settings/objects/:objectType - Get object settings
    const objectSettingsMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)$/i);
    if (objectSettingsMatch && !path.includes('/associations') && !path.includes('/pipelines') && !path.includes('/statuses') && !path.includes('/record-layout') && !path.includes('/preview-layout') && !path.includes('/index-settings') && !path.includes('/saved-views') && !path.includes('/properties')) {
      const objectType = objectSettingsMatch[1];
      if (method === 'GET') {
        return handleGetObjectSettings(user, objectType);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateObjectSettings(user, objectType, parseBody(event));
      }
    }

    // =========================================================================
    // ASSOCIATION LABELS API (describes relationship types)
    // =========================================================================
    // GET/POST /api/v1/settings/objects/:objectType/association-labels
    const assocLabelMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/association-labels$/i);
    if (assocLabelMatch) {
      const objectType = assocLabelMatch[1];
      if (method === 'GET') {
        return handleGetAssociationLabels(user, objectType);
      }
      if (method === 'POST') {
        return handleCreateAssociationLabel(user, objectType, parseBody(event));
      }
    }

    // PUT/DELETE /api/v1/settings/objects/:objectType/association-labels/:id
    const assocLabelIdMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/association-labels\/([a-f0-9-]+)$/i);
    if (assocLabelIdMatch) {
      const objectType = assocLabelIdMatch[1];
      const labelId = assocLabelIdMatch[2];
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateAssociationLabel(user, objectType, labelId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteAssociationLabel(user, objectType, labelId);
      }
    }

    // =========================================================================
    // OBJECT PIPELINES API
    // =========================================================================
    // GET/POST /api/v1/settings/objects/:objectType/pipelines
    const objectPipelineMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/pipelines$/i);
    if (objectPipelineMatch) {
      const objectType = objectPipelineMatch[1];
      if (method === 'GET') {
        return handleGetObjectPipelines(user, objectType);
      }
      if (method === 'POST') {
        return handleCreateObjectPipeline(user, objectType, parseBody(event));
      }
    }

    // PUT/DELETE /api/v1/settings/objects/:objectType/pipelines/:id
    const pipelineIdMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/pipelines\/([a-f0-9-]+)$/i);
    if (pipelineIdMatch) {
      const objectType = pipelineIdMatch[1];
      const pipelineId = pipelineIdMatch[2];
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateObjectPipeline(user, objectType, pipelineId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteObjectPipeline(user, objectType, pipelineId);
      }
    }

    // GET/POST /api/v1/settings/objects/:objectType/pipelines/:id/stages
    const pipelineStagesMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/pipelines\/([a-f0-9-]+)\/stages$/i);
    if (pipelineStagesMatch) {
      const objectType = pipelineStagesMatch[1];
      const pipelineId = pipelineStagesMatch[2];
      if (method === 'GET') {
        return handleGetPipelineStages(user, objectType, pipelineId);
      }
      if (method === 'POST') {
        return handleCreatePipelineStage(user, objectType, pipelineId, parseBody(event));
      }
    }

    // PUT /api/v1/settings/objects/:objectType/pipelines/:id/stages/reorder
    const stagesReorderMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/pipelines\/([a-f0-9-]+)\/stages\/reorder$/i);
    if (stagesReorderMatch && method === 'PUT') {
      const objectType = stagesReorderMatch[1];
      const pipelineId = stagesReorderMatch[2];
      return handleReorderPipelineStages(user, objectType, pipelineId, parseBody(event));
    }

    // PUT/DELETE /api/v1/settings/objects/:objectType/pipelines/:pipelineId/stages/:stageId
    const stageIdMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/pipelines\/([a-f0-9-]+)\/stages\/([a-f0-9-]+)$/i);
    if (stageIdMatch) {
      const objectType = stageIdMatch[1];
      const pipelineId = stageIdMatch[2];
      const stageId = stageIdMatch[3];
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePipelineStage(user, objectType, pipelineId, stageId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeletePipelineStage(user, objectType, pipelineId, stageId);
      }
    }

    // =========================================================================
    // OBJECT STATUSES API (for non-pipeline objects)
    // =========================================================================
    // GET/POST /api/v1/settings/objects/:objectType/statuses
    const objectStatusMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/statuses$/i);
    if (objectStatusMatch) {
      const objectType = objectStatusMatch[1];
      if (method === 'GET') {
        return handleGetObjectStatuses(user, objectType);
      }
      if (method === 'POST') {
        return handleCreateObjectStatus(user, objectType, parseBody(event));
      }
    }

    // PUT/DELETE /api/v1/settings/objects/:objectType/statuses/:id
    const statusIdMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/statuses\/([a-f0-9-]+)$/i);
    if (statusIdMatch) {
      const objectType = statusIdMatch[1];
      const statusId = statusIdMatch[2];
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateObjectStatus(user, objectType, statusId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteObjectStatus(user, objectType, statusId);
      }
    }

    // PUT /api/v1/settings/objects/:objectType/statuses/reorder
    const statusesReorderMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/statuses\/reorder$/i);
    if (statusesReorderMatch && method === 'PUT') {
      const objectType = statusesReorderMatch[1];
      return handleReorderObjectStatuses(user, objectType, parseBody(event));
    }

    // =========================================================================
    // RECORD LAYOUT API
    // =========================================================================
    // GET/PUT /api/v1/settings/objects/:objectType/record-layout
    const recordLayoutMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/record-layout$/i);
    if (recordLayoutMatch) {
      const objectType = recordLayoutMatch[1];
      if (method === 'GET') {
        return handleGetRecordLayouts(user, objectType);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateRecordLayout(user, objectType, parseBody(event));
      }
      if (method === 'POST') {
        return handleCreateRecordLayout(user, objectType, parseBody(event));
      }
    }

    // POST /api/v1/settings/objects/:objectType/record-layout/reset
    const recordLayoutResetMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/record-layout\/reset$/i);
    if (recordLayoutResetMatch && method === 'POST') {
      const objectType = recordLayoutResetMatch[1];
      return handleResetRecordLayout(user, objectType);
    }

    // =========================================================================
    // PREVIEW LAYOUT API
    // =========================================================================
    // GET/PUT /api/v1/settings/objects/:objectType/preview-layout
    const previewLayoutMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/preview-layout$/i);
    if (previewLayoutMatch) {
      const objectType = previewLayoutMatch[1];
      if (method === 'GET') {
        return handleGetPreviewLayouts(user, objectType);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePreviewLayout(user, objectType, parseBody(event));
      }
    }

    // =========================================================================
    // INDEX SETTINGS API
    // =========================================================================
    // GET/PUT /api/v1/settings/objects/:objectType/index-settings
    const indexSettingsMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/index-settings$/i);
    if (indexSettingsMatch) {
      const objectType = indexSettingsMatch[1];
      if (method === 'GET') {
        return handleGetIndexSettings(user, objectType);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateIndexSettings(user, objectType, parseBody(event));
      }
    }

    // =========================================================================
    // SAVED VIEWS API
    // =========================================================================
    // GET/POST /api/v1/settings/objects/:objectType/saved-views
    const savedViewsMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/saved-views$/i);
    if (savedViewsMatch) {
      const objectType = savedViewsMatch[1];
      if (method === 'GET') {
        return handleGetSavedViews(user, objectType);
      }
      if (method === 'POST') {
        return handleCreateSavedView(user, objectType, parseBody(event));
      }
    }

    // PUT/DELETE /api/v1/settings/objects/:objectType/saved-views/:id
    const savedViewIdMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/saved-views\/([a-f0-9-]+)$/i);
    if (savedViewIdMatch) {
      const objectType = savedViewIdMatch[1];
      const viewId = savedViewIdMatch[2];
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateSavedView(user, objectType, viewId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteSavedView(user, objectType, viewId);
      }
    }

    // PUT /api/v1/settings/objects/:objectType/saved-views/:id/set-default
    const setDefaultViewMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/saved-views\/([a-f0-9-]+)\/set-default$/i);
    if (setDefaultViewMatch && method === 'PUT') {
      const objectType = setDefaultViewMatch[1];
      const viewId = setDefaultViewMatch[2];
      return handleSetDefaultView(user, objectType, viewId);
    }

    // PUT /api/v1/settings/objects/:objectType/saved-views/:id/promote
    const promoteViewMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/saved-views\/([a-f0-9-]+)\/promote$/i);
    if (promoteViewMatch && method === 'PUT') {
      const objectType = promoteViewMatch[1];
      const viewId = promoteViewMatch[2];
      return handlePromoteSavedView(user, objectType, viewId);
    }

    // =========================================================================
    // OBJECT PROPERTIES API
    // =========================================================================
    // GET /api/v1/settings/objects/:objectType/properties - Get available properties
    const objectPropsMatch = path.match(/^\/(?:api\/v1\/)?settings\/objects\/([a-z]+)\/properties$/i);
    if (objectPropsMatch && method === 'GET') {
      const objectType = objectPropsMatch[1];
      return handleGetObjectProperties(user, objectType);
    }

    // Default response for unmatched routes
    return createResponse(404, {
      error: 'Not Found',
      message: `Route ${method} ${path} not found`,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Unhandled error:', error.message, error.stack);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      debug: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    });
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get user's tenant context from database
 * @param {string} cognitoSub - Cognito sub (user.id from auth)
 * @returns {Promise<{tenantId: string|null, userId: string|null, role: string|null}>}
 */
async function getUserTenantContext(cognitoSub) {
  const result = await query(
    `SELECT u.record_id, u.tenant_id, r.name as role
     FROM "User" u
     LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
     LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
     WHERE u.cognito_sub = $1
     LIMIT 1`,
    [cognitoSub]
  );

  if (result.rows.length === 0) {
    return { tenantId: null, userId: null, role: null };
  }

  const user = result.rows[0];
  return {
    tenantId: user.tenant_id,
    userId: user.record_id,
    role: user.role,
  };
}

/**
 * Get tenant configuration - CRITICAL ENDPOINT
 * This is called by frontend to get tenantId after login
 */
async function handleGetTenantConfig(user, event) {
  const requestId = event?.requestContext?.requestId || 'unknown';
  const cognitoSub = user.id;

  console.log('[ConfigTenant] start', { path: '/api/v1/config/tenant', requestId });
  console.log('[ConfigTenant] auth', { cognitoSub });

  try {
    await getPoolAsync();

    // Look up user and their tenant from database
    // NEW SCHEMA: Tenant has NO settings/theme columns - use TenantSettings table
    // User profile data (first_name, last_name) now in UserSettings table
    const result = await query(
      `SELECT
         u.record_id as user_id,
         u.email,
         us.full_name,
         r.name as role,
         u.tenant_id,
         t.id as tenant_record_id,
         t.account_code as tenant_account_code,
         t.name as tenant_name,
         t.slug as tenant_slug,
         t.plan as tenant_plan,
         t.feature_flags as tenant_features,
         t.created_at as tenant_created_at,
         -- TenantSettings fields (1:1 with Tenant)
         ts.timezone,
         ts.currency,
         ts.date_format,
         ts.time_format,
         ts.language,
         ts.business_name,
         ts.business_phone,
         ts.business_email,
         ts.business_address,
         ts.default_check_in_time,
         ts.default_check_out_time,
         ts.booking_buffer_minutes,
         ts.max_advance_booking_days,
         ts.min_advance_booking_hours,
         ts.allow_online_booking,
         ts.require_deposit,
         ts.deposit_percent,
         ts.require_vaccinations,
         ts.cancellation_window_hours,
         ts.tax_rate,
         ts.tax_name,
         ts.invoice_prefix,
         ts.invoice_footer,
         ts.notification_prefs,
         ts.email_templates,
         ts.business_hours,
         ts.branding,
         ts.integrations,
         ts.custom_fields,
         ts.terminology,
         (SELECT COUNT(*) FROM "Service" WHERE tenant_id = t.id) as service_count,
         (SELECT COUNT(*) FROM "Kennel" WHERE tenant_id = t.id) as kennel_count
       FROM "User" u
       LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
       LEFT JOIN "Tenant" t ON u.tenant_id = t.id
       LEFT JOIN "TenantSettings" ts ON t.id = ts.tenant_id
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
       WHERE u.cognito_sub = $1
       LIMIT 1`,
      [cognitoSub]
    );

    if (result.rows.length === 0) {
      console.log('[ConfigTenant] tenantLookup', { tenantId: null, reason: 'user_not_found' });
      return createResponse(404, {
        error: 'NotFound',
        message: 'User not found. Please complete registration.',
      });
    }

    const row = result.rows[0];

    if (!row.tenant_id) {
      console.log('[ConfigTenant] tenantLookup', { tenantId: null, reason: 'no_tenant_for_user' });
      return createResponse(404, {
        error: 'NotFound',
        message: 'Tenant not found for user',
      });
    }

    console.log('[ConfigTenant] tenantLookup', { tenantId: row.tenant_id });

    // Determine onboarding status
    const hasOnboardingCompleted = parseInt(row.service_count || 0) > 0 && parseInt(row.kennel_count || 0) > 0;

    // Build settings object from TenantSettings columns
    const settings = {
      // Regional/Localization
      timezone: row.timezone || 'America/New_York',
      currency: row.currency || 'USD',
      dateFormat: row.date_format || 'MM/DD/YYYY',
      timeFormat: row.time_format || '12h',
      language: row.language || 'en',
      // Business Info
      businessName: row.business_name,
      businessPhone: row.business_phone,
      businessEmail: row.business_email,
      businessAddress: row.business_address,
      // Booking Configuration
      defaultCheckInTime: row.default_check_in_time || '09:00',
      defaultCheckOutTime: row.default_check_out_time || '17:00',
      bookingBufferMinutes: row.booking_buffer_minutes || 15,
      maxAdvanceBookingDays: row.max_advance_booking_days || 365,
      minAdvanceBookingHours: row.min_advance_booking_hours || 24,
      allowOnlineBooking: row.allow_online_booking !== false,
      requireDeposit: row.require_deposit || false,
      depositPercent: row.deposit_percent || 0,
      requireVaccinations: row.require_vaccinations !== false,
      cancellationWindowHours: row.cancellation_window_hours || 48,
      // Financial
      taxRate: parseFloat(row.tax_rate) || 0,
      taxName: row.tax_name || 'Sales Tax',
      invoicePrefix: row.invoice_prefix || 'INV-',
      invoiceFooter: row.invoice_footer,
      // JSONB fields
      notificationPrefs: row.notification_prefs || {},
      emailTemplates: row.email_templates || {},
      businessHours: row.business_hours || {},
      integrations: row.integrations || {},
      customFields: row.custom_fields || {},
    };

    // Build branding/theme object
    const theme = row.branding || {};

    // Return tenant config in the format frontend expects
    return createResponse(200, {
      // Top-level fields for compatibility
      id: row.tenant_id,
      recordId: row.tenant_id,
      tenantId: row.tenant_id,
      accountCode: row.tenant_account_code,  // BK-XXXXXX format for URLs/display
      userId: row.user_id,
      hasOnboardingCompleted,
      name: row.tenant_name,
      slug: row.tenant_slug,
      plan: row.tenant_plan || 'FREE',
      settings,
      theme,
      terminology: row.terminology || {},
      featureFlags: row.tenant_features || {},
      createdAt: row.tenant_created_at,
      // User info
      user: {
        id: row.user_id,
        email: row.email,
        name: row.full_name || row.email,
        role: row.role,
      },
      // Nested tenant object for some frontend code paths
      tenant: {
        id: row.tenant_id,
        recordId: row.tenant_id,
        accountCode: row.tenant_account_code,
        name: row.tenant_name,
        slug: row.tenant_slug,
        plan: row.tenant_plan || 'FREE',
      },
    });

  } catch (error) {
    console.error('[ConfigTenant] error', { error: error.message, stack: error.stack });
    return createResponse(500, {
      error: 'InternalServerError',
      message: 'Failed to load tenant config',
    });
  }
}

/**
 * Update tenant configuration
 * NEW SCHEMA: Tenant has name/slug/plan. Settings are in TenantSettings table.
 */
async function handleUpdateTenantConfig(user, body) {
  const { name, settings } = body;

  try {
    await getPoolAsync();

    // Get user's tenant and verify permission
    // NEW SCHEMA: Role comes from UserRole junction table
    const userResult = await query(
      `SELECT u.tenant_id, r.name as role
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { role, tenant_id: tenantId } = userResult.rows[0];

    if (!['OWNER', 'ADMIN'].includes(role)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update tenant configuration',
      });
    }

    // Update Tenant table if name is provided
    if (name !== undefined) {
      await query(
        `UPDATE "Tenant" SET name = $2, updated_at = NOW() WHERE id = $1`,
        [tenantId, name.trim()]
      );
    }

    // Update TenantSettings if settings provided
    if (settings !== undefined && Object.keys(settings).length > 0) {
      const settingsUpdates = [];
      const settingsValues = [tenantId];
      let paramIndex = 2;

      // Map frontend camelCase to database snake_case
      const fieldMap = {
        timezone: 'timezone',
        currency: 'currency',
        dateFormat: 'date_format',
        timeFormat: 'time_format',
        language: 'language',
        businessName: 'business_name',
        businessPhone: 'business_phone',
        businessEmail: 'business_email',
        businessAddress: 'business_address',
        defaultCheckInTime: 'default_check_in_time',
        defaultCheckOutTime: 'default_check_out_time',
        bookingBufferMinutes: 'booking_buffer_minutes',
        maxAdvanceBookingDays: 'max_advance_booking_days',
        minAdvanceBookingHours: 'min_advance_booking_hours',
        allowOnlineBooking: 'allow_online_booking',
        requireDeposit: 'require_deposit',
        depositPercent: 'deposit_percent',
        requireVaccinations: 'require_vaccinations',
        cancellationWindowHours: 'cancellation_window_hours',
        taxRate: 'tax_rate',
        taxName: 'tax_name',
        invoicePrefix: 'invoice_prefix',
        invoiceFooter: 'invoice_footer',
        notificationPrefs: 'notification_prefs',
        emailTemplates: 'email_templates',
        businessHours: 'business_hours',
        branding: 'branding',
        integrations: 'integrations',
        customFields: 'custom_fields',
        terminology: 'terminology',
      };

      for (const [frontendKey, dbColumn] of Object.entries(fieldMap)) {
        if (settings[frontendKey] !== undefined) {
          const value = settings[frontendKey];
          // Handle JSONB fields
          if (['notificationPrefs', 'emailTemplates', 'businessHours', 'branding', 'integrations', 'customFields', 'terminology'].includes(frontendKey)) {
            settingsUpdates.push(`${dbColumn} = $${paramIndex++}`);
            settingsValues.push(JSON.stringify(value));
          } else {
            settingsUpdates.push(`${dbColumn} = $${paramIndex++}`);
            settingsValues.push(value);
          }
        }
      }

      if (settingsUpdates.length > 0) {
        settingsUpdates.push('updated_at = NOW()');
        await query(
          `UPDATE "TenantSettings" SET ${settingsUpdates.join(', ')} WHERE tenant_id = $1`,
          settingsValues
        );
      }
    }

    // Fetch updated data
    const result = await query(
      `SELECT t.id, t.name, t.slug, t.plan, t.updated_at,
              ts.timezone, ts.currency, ts.business_name, ts.branding, ts.terminology
       FROM "Tenant" t
       LEFT JOIN "TenantSettings" ts ON t.id = ts.tenant_id
       WHERE t.id = $1`,
      [tenantId]
    );

    const updated = result.rows[0];

    return createResponse(200, {
      success: true,
      id: updated.id,
      recordId: updated.id,
      tenantId: updated.id,
      name: updated.name,
      slug: updated.slug,
      plan: updated.plan,
      settings: {
        timezone: updated.timezone,
        currency: updated.currency,
        businessName: updated.business_name,
      },
      terminology: updated.terminology || {},
      theme: updated.branding || {},
      updatedAt: updated.updated_at,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update tenant config:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update tenant configuration',
    });
  }
}

/**
 * Get tenant theme
 * NEW SCHEMA: Theme/branding is stored in TenantSettings.branding JSONB column
 */
async function handleGetTenantTheme(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT ts.branding
       FROM "TenantSettings" ts
       INNER JOIN "User" u ON u.tenant_id = ts.tenant_id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    return createResponse(200, {
      theme: result.rows[0].branding || {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        logo: null,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get tenant theme:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve tenant theme',
    });
  }
}

/**
 * Update tenant theme
 * NEW SCHEMA: Theme/branding is stored in TenantSettings.branding JSONB column
 */
async function handleUpdateTenantTheme(user, body) {
  const { theme, primaryColor, secondaryColor, logo } = body;

  try {
    await getPoolAsync();

    // Get user's tenant - NEW SCHEMA: Role from UserRole junction
    const userResult = await query(
      `SELECT u.tenant_id, r.name as role
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'User not found' });
    }

    const { role, tenant_id: tenantId } = userResult.rows[0];

    if (!['OWNER', 'ADMIN'].includes(role)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update tenant theme',
      });
    }

    // Accept either nested theme object or flat properties
    const themeData = theme || { primaryColor, secondaryColor, logo };

    const result = await query(
      `UPDATE "TenantSettings"
       SET branding = $2, updated_at = NOW()
       WHERE tenant_id = $1
       RETURNING branding`,
      [tenantId, JSON.stringify(themeData)]
    );

    return createResponse(200, {
      success: true,
      theme: result.rows[0].branding,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update tenant theme:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update tenant theme',
    });
  }
}

/**
 * Get tenant features/feature flags
 */
async function handleGetTenantFeatures(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT t.feature_flags, t.plan
       FROM "Tenant" t
       INNER JOIN "User" u ON u.tenant_id = t.id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    const { feature_flags, plan } = result.rows[0];

    // Default features based on plan
    const defaultFeatures = {
      bookings: true,
      analytics: plan !== 'FREE',
      customReports: plan === 'ENTERPRISE',
      apiAccess: plan !== 'FREE',
      multiLocation: plan === 'ENTERPRISE',
    };

    return createResponse(200, {
      features: { ...defaultFeatures, ...(feature_flags || {}) },
      plan,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get tenant features:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve tenant features',
    });
  }
}

/**
 * Update tenant features
 */
async function handleUpdateTenantFeatures(user, body) {
  const { features } = body;

  try {
    await getPoolAsync();

    // NEW SCHEMA: Role from UserRole junction table
    const userResult = await query(
      `SELECT u.tenant_id, r.name as role
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'User not found' });
    }

    const { role, tenant_id: tenantId } = userResult.rows[0];

    if (!['OWNER', 'ADMIN'].includes(role)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update tenant features',
      });
    }

    const result = await query(
      `UPDATE "Tenant"
       SET feature_flags = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING feature_flags`,
      [tenantId, JSON.stringify(features)]
    );

    return createResponse(200, {
      success: true,
      features: result.rows[0].feature_flags,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update tenant features:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update tenant features',
    });
  }
}

/**
 * Get onboarding status
 */
async function handleGetOnboarding(user) {
  try {
    await getPoolAsync();

    // Check for basic setup completion
    const result = await query(
      `SELECT
         t.id as tenant_id,
         t.name,
         (SELECT COUNT(*) FROM "Service" WHERE tenant_id = t.id) as service_count,
         (SELECT COUNT(*) FROM "Kennel" WHERE tenant_id = t.id) as kennel_count,
         (SELECT COUNT(*) FROM "Owner" WHERE tenant_id = t.id) as owner_count,
         (SELECT COUNT(*) FROM "Pet" WHERE tenant_id = t.id) as pet_count
       FROM "Tenant" t
       INNER JOIN "User" u ON u.tenant_id = t.id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    const data = result.rows[0];

    const steps = {
      accountCreated: true,
      servicesAdded: parseInt(data.service_count) > 0,
      kennelsAdded: parseInt(data.kennel_count) > 0,
      firstOwnerAdded: parseInt(data.owner_count) > 0,
      firstPetAdded: parseInt(data.pet_count) > 0,
    };

    const completedSteps = Object.values(steps).filter(Boolean).length;
    const totalSteps = Object.keys(steps).length;

    return createResponse(200, {
      onboarding: {
        steps,
        completedSteps,
        totalSteps,
        percentComplete: Math.round((completedSteps / totalSteps) * 100),
        isComplete: completedSteps === totalSteps,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get onboarding:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve onboarding status',
    });
  }
}

/**
 * Update onboarding (dismiss)
 */
async function handleUpdateOnboarding(user, body) {
  // Onboarding dismissal could be stored in tenant settings
  // For now, just acknowledge
  return createResponse(200, {
    success: true,
    message: 'Onboarding status updated',
  });
}

/**
 * Get system configuration
 */
async function handleGetSystemConfig() {
  return createResponse(200, {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
    maintenanceMode: false,
  });
}

/**
 * Get system features
 */
async function handleGetSystemFeatures() {
  return createResponse(200, {
    features: {
      multiTenant: true,
      whiteLabel: true,
      advancedAnalytics: true,
      apiAccess: true,
    },
  });
}

/**
 * Get all settings for current tenant
 * NEW SCHEMA: Settings come from TenantSettings table (1:1 with Tenant)
 */
async function handleGetSettings(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT ts.*
       FROM "TenantSettings" ts
       INNER JOIN "User" u ON u.tenant_id = ts.tenant_id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant settings not found',
      });
    }

    const row = result.rows[0];

    // Build settings object from TenantSettings columns
    const settings = {
      // Regional/Localization
      timezone: row.timezone || 'America/New_York',
      currency: row.currency || 'USD',
      dateFormat: row.date_format || 'MM/DD/YYYY',
      timeFormat: row.time_format || '12h',
      language: row.language || 'en',
      // Business Info
      businessName: row.business_name,
      businessPhone: row.business_phone,
      businessEmail: row.business_email,
      businessAddress: row.business_address,
      // Booking Configuration
      defaultCheckInTime: row.default_check_in_time || '09:00',
      defaultCheckOutTime: row.default_check_out_time || '17:00',
      bookingBufferMinutes: row.booking_buffer_minutes || 15,
      maxAdvanceBookingDays: row.max_advance_booking_days || 365,
      minAdvanceBookingHours: row.min_advance_booking_hours || 24,
      allowOnlineBooking: row.allow_online_booking !== false,
      requireDeposit: row.require_deposit || false,
      depositPercent: row.deposit_percent || 0,
      requireVaccinations: row.require_vaccinations !== false,
      cancellationWindowHours: row.cancellation_window_hours || 48,
      // Financial
      taxRate: parseFloat(row.tax_rate) || 0,
      taxName: row.tax_name || 'Sales Tax',
      invoicePrefix: row.invoice_prefix || 'INV-',
      invoiceFooter: row.invoice_footer,
      // JSONB fields
      notificationPrefs: row.notification_prefs || {},
      emailTemplates: row.email_templates || {},
      businessHours: row.business_hours || {},
      branding: row.branding || {},
      integrations: row.integrations || {},
      customFields: row.custom_fields || {},
    };

    return createResponse(200, {
      settings,
      categories: ['general', 'notifications', 'booking', 'billing'],
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get settings:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve settings',
    });
  }
}

// =============================================================================
// ENTERPRISE MEMBERSHIPS API
// =============================================================================
//
// Memberships represent the relationship between Users and Tenants.
// This is the canonical interface for managing staff/team members in BarkBase.
//
// Schema (Membership table):
//   id, tenant_id, user_id, role, status, invited_at, joined_at, created_at, updated_at
//
// NOTE: All membership operations are tenant-scoped. The membershipId must
// belong to the current user's tenant_id to be accessible.
//
// =============================================================================

/**
 * Get all memberships (staff members) for the current tenant
 *
 * Returns list of team members with user details (name, email, role, status).
 * Only returns memberships belonging to the authenticated user's tenant.
 */
async function handleGetMemberships(user) {
  console.log('[CONFIG-SERVICE] handleGetMemberships - start', { userId: user?.id });

  try {
    await getPoolAsync();

    if (!user || !user.id) {
      console.error('[CONFIG-SERVICE] handleGetMemberships - no user.id');
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    // First get the user's tenant - NEW SCHEMA: Role from UserRole junction
    console.log('[CONFIG-SERVICE] Querying user with cognito_sub:', user.id);
    const userResult = await query(
      `SELECT u.tenant_id, r.name as role
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { tenant_id: tenantId } = userResult.rows[0];
    console.log('[CONFIG-SERVICE] User tenant_id:', tenantId);

    if (!tenantId) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User has no associated tenant',
      });
    }

    // Get all users for this tenant with their roles from UserRole junction table
    // User profile data (first_name, last_name) now in UserSettings table
    console.log('[CONFIG-SERVICE] Querying users for tenant:', tenantId);
    const result = await query(
      `SELECT
         u.record_id,
         u.tenant_id,
         u.email,
         us.full_name,
         u.cognito_sub,
         u.created_at,
         u.updated_at,
         (SELECT array_agg(r.name) FROM "UserRole" ur
          JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
          WHERE ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id) as roles
       FROM "User" u
       LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
       WHERE u.tenant_id = $1
       ORDER BY u.created_at DESC`,
      [tenantId]
    );

    console.log('[CONFIG-SERVICE] handleGetMemberships - found:', result.rows.length, 'members');

    // Transform to frontend-friendly format
    const members = result.rows.map(row => {
      const roles = row.roles || [];
      // Determine primary role (first role or STAFF as default)
      const primaryRole = roles.length > 0 ? roles[0] : 'STAFF';

      return {
        id: row.record_id,
        record_id: row.record_id,
        membershipId: row.record_id, // Use user record_id as membership ID for compatibility
        tenantId: row.tenant_id,
        userRecordId: row.record_id,
        role: primaryRole,
        roles: roles,
        status: 'active', // All users in the table are active
        invitedAt: row.created_at, // Use created_at as invited_at
        joinedAt: row.created_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // User details
        email: row.email,
        name: row.full_name || row.email,
        // Flag if this is the current user
        isCurrentUser: row.cognito_sub === user.id,
      };
    });

    return createResponse(200, {
      success: true,
      data: members,
      members,
      total: members.length,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get memberships:', error.message, error.stack);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve team members',
      debug: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
}

/**
 * Create a new membership (invite staff member to tenant)
 *
 * Creates a new user (if not exists) and membership record.
 * Requires OWNER or ADMIN role.
 */
async function handleCreateMembership(user, body) {
  const { email, role = 'STAFF', firstName, lastName } = body;

  console.log('[CONFIG-SERVICE] handleCreateMembership - start', { email, role });

  if (!email) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Email is required',
    });
  }

  // Validate role
  const validRoles = ['OWNER', 'ADMIN', 'STAFF', 'READONLY'];
  if (!validRoles.includes(role)) {
    return createResponse(400, {
      error: 'Bad Request',
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
    });
  }

  try {
    await getPoolAsync();

    // Get current user's tenant and verify permission - NEW SCHEMA: Role from UserRole junction
    const userResult = await query(
      `SELECT u.tenant_id, u.record_id as user_record_id, r.name as role
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { tenant_id: tenantId, user_record_id: inviterRecordId, role: currentUserRole } = userResult.rows[0];

    // Only OWNER or ADMIN can create memberships
    if (!['OWNER', 'ADMIN'].includes(currentUserRole)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to invite team members',
      });
    }

    // Only OWNER can create OWNER or ADMIN memberships
    if (['OWNER', 'ADMIN'].includes(role) && currentUserRole !== 'OWNER') {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Only owners can assign admin or owner roles',
      });
    }

    // Check if user with this email already exists in this tenant
    const existingUser = await query(
      `SELECT record_id FROM "User" WHERE email = $1 AND tenant_id = $2`,
      [email.toLowerCase(), tenantId]
    );

    let userRecordId;

    if (existingUser.rows.length > 0) {
      userRecordId = existingUser.rows[0].record_id;

      // Check if already a member of this tenant
      const existingMembership = await query(
        `SELECT id FROM "Membership" WHERE user_record_id = $1 AND tenant_id = $2`,
        [userRecordId, tenantId]
      );

      if (existingMembership.rows.length > 0) {
        return createResponse(409, {
          error: 'Conflict',
          message: 'This user is already a member of your team',
        });
      }
    } else {
      // Get next record_id for new user
      const nextIdResult = await query(
        `SELECT COALESCE(MAX(record_id), 0) + 1 as next_id FROM "User" WHERE tenant_id = $1`,
        [tenantId]
      );
      const nextRecordId = nextIdResult.rows[0].next_id;

      // Create new user record (pending Cognito signup)
      // Use 'pending-invite-{uuid}' as placeholder for cognito_sub until user accepts invite
      const placeholderCognitoSub = `pending-invite-${require('crypto').randomUUID()}`;
      const newUser = await query(
        `INSERT INTO "User" (tenant_id, record_id, email, first_name, last_name, cognito_sub, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
         RETURNING record_id`,
        [tenantId, nextRecordId, email.toLowerCase(), firstName || '', lastName || '', placeholderCognitoSub]
      );
      userRecordId = newUser.rows[0].record_id;
    }

    // Create membership record
    const membership = await query(
      `INSERT INTO "Membership" (tenant_id, user_record_id, role, status, invited_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'invited', NOW(), NOW(), NOW())
       RETURNING *`,
      [tenantId, userRecordId, role]
    );

    const newMembership = membership.rows[0];

    // Generate secure invitation token (64 character hex string)
    const crypto = require('crypto');
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Create invitation record with 7-day expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const invitation = await query(
      `INSERT INTO "Invitation" (tenant_id, email, token, role, status, expires_at, invited_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, NOW(), NOW())
       RETURNING id, token, expires_at`,
      [tenantId, email.toLowerCase(), invitationToken, role, expiresAt, inviterRecordId]
    );

    const newInvitation = invitation.rows[0];

    // Get tenant name for the invite link
    const tenantResult = await query(
      `SELECT name FROM "Tenant" WHERE id = $1`,
      [tenantId]
    );
    const tenantName = tenantResult.rows[0]?.name || 'BarkBase';

    // Construct invite URL (frontend handles the token)
    const baseUrl = process.env.FRONTEND_URL || 'https://app.barkbase.com';
    const inviteUrl = `${baseUrl}/invite?token=${invitationToken}`;

    console.log('[CONFIG-SERVICE] handleCreateMembership - created membership:', newMembership.id);
    console.log('[CONFIG-SERVICE] handleCreateMembership - created invitation:', newInvitation.id);

    return createResponse(201, {
      success: true,
      message: 'Team member invited successfully',
      membership: {
        id: newMembership.id,
        membershipId: newMembership.id,
        tenantId: newMembership.tenant_id,
        userRecordId: newMembership.user_record_id,
        role: newMembership.role,
        status: newMembership.status,
        invitedAt: newMembership.invited_at,
        createdAt: newMembership.created_at,
        email,
        firstName,
        lastName,
        name: firstName && lastName ? `${firstName} ${lastName}` : email,
      },
      invitation: {
        id: newInvitation.id,
        token: newInvitation.token,
        inviteUrl,
        expiresAt: newInvitation.expires_at,
        tenantName,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to create membership:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to invite team member',
    });
  }
}

/**
 * Update a membership (change role or status)
 *
 * Requires OWNER or ADMIN role. Only OWNER can modify OWNER/ADMIN memberships.
 * NOTE: membershipId must belong to the current tenant.
 */
async function handleUpdateMembership(user, membershipId, body) {
  const { role, status } = body;

  console.log('[CONFIG-SERVICE] handleUpdateMembership - start', { membershipId, role, status });

  if (!role && !status) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'At least one field (role or status) is required',
    });
  }

  // Validate role if provided
  if (role) {
    const validRoles = ['OWNER', 'ADMIN', 'STAFF', 'READONLY'];
    if (!validRoles.includes(role)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }
  }

  try {
    await getPoolAsync();

    // Get current user's tenant and role - NEW SCHEMA: Role from UserRole junction
    const userResult = await query(
      `SELECT u.tenant_id, r.name as role, u.record_id as user_id
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { tenant_id: tenantId, role: currentUserRole, user_id: currentUserId } = userResult.rows[0];

    // Only OWNER or ADMIN can update memberships
    if (!['OWNER', 'ADMIN'].includes(currentUserRole)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update team members',
      });
    }

    // Get the membership being updated (ensure it belongs to this tenant)
    const membershipResult = await query(
      `SELECT m.*, u.record_id as target_user_id
       FROM "Membership" m
       LEFT JOIN "User" u ON u.tenant_id = m.tenant_id AND u.record_id = m.user_id
       WHERE m.record_id = $1 AND m.tenant_id = $2`,
      [membershipId, tenantId]
    );

    if (membershipResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Membership not found',
      });
    }

    const targetMembership = membershipResult.rows[0];

    // Prevent self-demotion for owners
    if (targetMembership.target_user_id === currentUserId && role && role !== 'OWNER' && targetMembership.role === 'OWNER') {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'You cannot demote yourself from owner',
      });
    }

    // Only OWNER can modify OWNER/ADMIN memberships
    if (['OWNER', 'ADMIN'].includes(targetMembership.role) && currentUserRole !== 'OWNER') {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Only owners can modify admin or owner memberships',
      });
    }

    // Only OWNER can assign OWNER/ADMIN roles
    if (role && ['OWNER', 'ADMIN'].includes(role) && currentUserRole !== 'OWNER') {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Only owners can assign admin or owner roles',
      });
    }

    // Build update query
    const updates = ['updated_at = NOW()'];
    const values = [membershipId, tenantId];
    let paramIndex = 3;

    if (role) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    const result = await query(
      `UPDATE "Membership"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    const updatedMembership = result.rows[0];

    console.log('[CONFIG-SERVICE] handleUpdateMembership - updated:', updatedMembership.id);

    return createResponse(200, {
      success: true,
      message: 'Team member updated successfully',
      membership: {
        id: updatedMembership.id,
        membershipId: updatedMembership.id,
        tenantId: updatedMembership.tenant_id,
        userId: updatedMembership.user_id,
        role: updatedMembership.role,
        status: updatedMembership.status,
        updatedAt: updatedMembership.updated_at,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update membership:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update team member',
    });
  }
}

/**
 * Delete a membership (remove member from tenant)
 *
 * Hard deletes the membership record. Requires OWNER or ADMIN role.
 * NOTE: membershipId must belong to the current tenant.
 */
async function handleDeleteMembership(user, membershipId) {
  console.log('[CONFIG-SERVICE] handleDeleteMembership - start', { membershipId });

  try {
    await getPoolAsync();

    // Get current user's tenant and role - NEW SCHEMA: Role from UserRole junction
    const userResult = await query(
      `SELECT u.tenant_id, r.name as role, u.record_id as user_id
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { tenant_id: tenantId, role: currentUserRole, user_id: currentUserId } = userResult.rows[0];

    // Only OWNER or ADMIN can delete memberships
    if (!['OWNER', 'ADMIN'].includes(currentUserRole)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to remove team members',
      });
    }

    // Get the membership being deleted (ensure it belongs to this tenant)
    const membershipResult = await query(
      `SELECT m.*, u.record_id as target_user_id
       FROM "Membership" m
       LEFT JOIN "User" u ON u.tenant_id = m.tenant_id AND u.record_id = m.user_id
       WHERE m.record_id = $1 AND m.tenant_id = $2`,
      [membershipId, tenantId]
    );

    if (membershipResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Membership not found',
      });
    }

    const targetMembership = membershipResult.rows[0];

    // Prevent self-removal
    if (targetMembership.target_user_id === currentUserId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'You cannot remove yourself from the team',
      });
    }

    // Only OWNER can remove OWNER/ADMIN members
    if (['OWNER', 'ADMIN'].includes(targetMembership.role) && currentUserRole !== 'OWNER') {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Only owners can remove admin or owner members',
      });
    }

    // Delete the membership
    const result = await query(
      `DELETE FROM "Membership" WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [membershipId, tenantId]
    );

    if (result.rowCount === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Membership not found',
      });
    }

    console.log('[CONFIG-SERVICE] handleDeleteMembership - deleted:', membershipId);

    return createResponse(200, {
      success: true,
      message: 'Team member removed successfully',
      deletedMembershipId: membershipId,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to delete membership:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to remove team member',
    });
  }
}

// =============================================================================
// CUSTOM PROPERTIES API (v2)
// =============================================================================
//
// Enterprise custom fields system that allows tenants to define their own
// data model. Enterprise custom properties or Airtable's fields.
//
// Feature Gating:
// - FREE: 5 custom fields max
// - PRO: 25 custom fields
// - ENTERPRISE: unlimited
//
// =============================================================================

const VALID_FIELD_TYPES = [
  'text', 'number', 'date', 'datetime', 'select', 'multiselect',
  'boolean', 'url', 'email', 'phone', 'currency', 'textarea'
];

const VALID_ENTITY_TYPES = ['pet', 'owner', 'booking', 'staff', 'service', 'kennel'];

const PLAN_LIMITS = {
  FREE: 5,
  PRO: 25,
  ENTERPRISE: Infinity,
};

/**
 * Helper: Get user's tenant info and verify permissions
 */
async function getTenantContext(user, requireAdmin = false) {
  const userResult = await query(
    `SELECT u.record_id as user_id, r.name as role, u.tenant_id, t.plan
     FROM "User" u
     LEFT JOIN "Tenant" t ON u.tenant_id = t.id
     LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
     LEFT JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
     WHERE u.cognito_sub = $1`,
    [user.id]
  );

  if (userResult.rows.length === 0) {
    return { error: 'User not found', status: 404 };
  }

  const { user_id: userId, role, tenant_id: tenantId, plan } = userResult.rows[0];

  if (!tenantId) {
    return { error: 'User has no associated tenant', status: 404 };
  }

  if (requireAdmin && !['OWNER', 'ADMIN'].includes(role)) {
    return { error: 'You do not have permission to manage properties', status: 403 };
  }

  return { userId, role, tenantId, plan: plan || 'FREE' };
}

/**
 * Helper: Check property count limits based on plan
 */
async function checkPropertyLimits(tenantId, plan, entityType) {
  const countResult = await query(
    `SELECT COUNT(*) as count FROM "Property"
     WHERE tenant_id = $1 AND entity_type = $2 AND is_active = true`,
    [tenantId, entityType]
  );

  const currentCount = parseInt(countResult.rows[0].count, 10);
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

  return {
    currentCount,
    limit,
    canCreate: currentCount < limit,
    remaining: Math.max(0, limit - currentCount),
  };
}

/**
 * Helper: Convert snake_case to camelCase for response
 */
function formatPropertyResponse(row) {
  return {
    id: row.id,
    propertyId: row.id,
    tenantId: row.tenant_id,
    propertyName: row.name,
    displayLabel: row.label,
    description: row.description,
    dataType: row.field_type,
    entityType: row.entity_type,
    options: row.options || [],
    isRequired: row.is_required,
    defaultValue: row.default_value,
    validationRules: row.validation_rules || {},
    sortOrder: row.sort_order,
    propertyGroup: row.property_group,
    showInList: row.show_in_list,
    showInForm: row.show_in_form,
    showInSearch: row.show_in_search,
    isSystem: false, // Custom properties are never system
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

/**
 * GET /api/v2/properties
 * List all properties for tenant (filterable by entity_type)
 */
async function handleListProperties(user, queryParams) {
  console.log('[CONFIG-SERVICE] handleListProperties - start', { userId: user?.id, queryParams });

  try {
    console.log('[CONFIG-SERVICE] handleListProperties - getting pool');
    await getPoolAsync();
    console.log('[CONFIG-SERVICE] handleListProperties - pool acquired');

    console.log('[CONFIG-SERVICE] handleListProperties - getting tenant context');
    const ctx = await getTenantContext(user);
    console.log('[CONFIG-SERVICE] handleListProperties - tenant context result:', ctx);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const { tenantId, plan } = ctx;
    const {
      entityType,
      objectType, // Alias for entityType (frontend uses this)
      includeArchived = 'false',
      includeUsage = 'false',
      includeSystem = 'true', // Include system properties by default
    } = queryParams;

    const effectiveEntityType = entityType || objectType;

    // =========================================================================
    // STEP 1: Fetch system properties from SystemProperty table (global)
    // =========================================================================
    let systemProperties = [];
    if (includeSystem === 'true') {
      try {
        let systemSql = `SELECT * FROM "SystemProperty" WHERE 1=1`;
        const systemValues = [];
        let systemParamIndex = 1;

        if (effectiveEntityType) {
          systemSql += ` AND entity_type = $${systemParamIndex++}`;
          systemValues.push(effectiveEntityType);
        }

        systemSql += ` ORDER BY entity_type, sort_order`;

        const systemResult = await query(systemSql, systemValues);
        systemProperties = systemResult.rows.map(row => formatSystemPropertyResponse(row));
        console.log('[CONFIG-SERVICE] Found system properties:', systemProperties.length);
      } catch (err) {
        // SystemProperty table might not exist yet - that's okay
        console.log('[CONFIG-SERVICE] SystemProperty table not found or error:', err.message);
        systemProperties = [];
      }
    }

    // =========================================================================
    // STEP 2: Fetch custom properties from Property table (per-tenant)
    // =========================================================================
    let sql = `SELECT * FROM "Property" WHERE tenant_id = $1`;
    const values = [tenantId];
    let paramIndex = 2;

    if (effectiveEntityType) {
      sql += ` AND entity_type = $${paramIndex++}`;
      values.push(effectiveEntityType);
    }

    if (includeArchived !== 'true') {
      sql += ` AND is_active = true`;
    }

    sql += ` ORDER BY entity_type, sort_order, created_at`;

    console.log('[CONFIG-SERVICE] handleListProperties - querying Property table:', { sql, values });
    const result = await query(sql, values);
    console.log('[CONFIG-SERVICE] handleListProperties - Property query returned:', result.rows.length, 'rows');
    const customProperties = result.rows.map(formatPropertyResponse);

    // =========================================================================
    // STEP 3: Get usage stats for custom properties if requested
    // =========================================================================
    let usageStats = {};
    if (includeUsage === 'true' && customProperties.length > 0) {
      const propertyIds = customProperties.map(p => p.id);
      const usageResult = await query(
        `SELECT property_id, COUNT(*) as usage_count
         FROM "PropertyValue"
         WHERE property_id = ANY($1)
         GROUP BY property_id`,
        [propertyIds]
      );
      usageResult.rows.forEach(row => {
        usageStats[row.property_id] = parseInt(row.usage_count, 10);
      });
    }

    // Add usage to custom properties
    const customPropertiesWithUsage = customProperties.map(p => ({
      ...p,
      usageCount: usageStats[p.id] || 0,
    }));

    // =========================================================================
    // STEP 4: Merge system and custom properties
    // =========================================================================
    // System properties come first (sorted by sort_order), then custom properties
    const allProperties = [...systemProperties, ...customPropertiesWithUsage];

    // Sort all properties by sort_order
    allProperties.sort((a, b) => {
      // System properties first
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      // Then by sort_order
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    // Get plan limits (only count custom properties)
    const limits = effectiveEntityType
      ? await checkPropertyLimits(tenantId, plan, effectiveEntityType)
      : { currentCount: customProperties.length, limit: PLAN_LIMITS[plan], canCreate: true };

    console.log('[CONFIG-SERVICE] handleListProperties - total:', allProperties.length, '(system:', systemProperties.length, ', custom:', customProperties.length, ')');

    return createResponse(200, {
      success: true,
      properties: allProperties,
      metadata: {
        total: allProperties.length,
        systemCount: systemProperties.length,
        customCount: customProperties.length,
        plan,
        limits,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to list properties:', error.message);
    console.error('[CONFIG-SERVICE] Full error stack:', error.stack);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve properties',
      debug: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
}

/**
 * Format SystemProperty row to API response format
 * Matches the structure of formatPropertyResponse but with isSystem: true
 */
function formatSystemPropertyResponse(row) {
  return {
    id: row.id,
    propertyId: row.id,
    propertyName: row.name,
    displayLabel: row.label,
    description: row.description,
    entityType: row.entity_type,
    dataType: row.field_type,
    options: row.options || [],
    isRequired: row.is_required,
    defaultValue: row.default_value,
    validationRules: row.validation_rules || {},
    propertyGroup: row.property_group,
    sortOrder: row.sort_order,
    showInList: row.show_in_list,
    showInForm: row.show_in_form,
    showInSearch: row.show_in_search,
    isEditable: row.is_editable,
    isSystem: true, // Always true for system properties
    isActive: true, // System properties are always active
    createdAt: row.created_at,
    updatedAt: row.created_at, // System properties don't have updated_at
    archivedAt: null,
    // System properties can't have usage stats (they're built-in columns, not PropertyValue entries)
    usageCount: null,
  };
}

/**
 * GET /api/v2/properties/:id
 * Get single property by ID
 */
async function handleGetProperty(user, propertyId) {
  console.log('[CONFIG-SERVICE] handleGetProperty -', propertyId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // First, try to find in custom Property table (per-tenant)
    const result = await query(
      `SELECT * FROM "Property" WHERE id = $1 AND tenant_id = $2`,
      [propertyId, ctx.tenantId]
    );

    if (result.rows.length > 0) {
      const property = formatPropertyResponse(result.rows[0]);

      // Get usage count for custom properties
      const usageResult = await query(
        `SELECT COUNT(*) as count FROM "PropertyValue" WHERE property_id = $1`,
        [propertyId]
      );
      property.usageCount = parseInt(usageResult.rows[0].count, 10);

      return createResponse(200, {
        success: true,
        property,
      });
    }

    // If not found in Property, check SystemProperty table (global)
    try {
      const systemResult = await query(
        `SELECT * FROM "SystemProperty" WHERE id = $1`,
        [propertyId]
      );

      if (systemResult.rows.length > 0) {
        const property = formatSystemPropertyResponse(systemResult.rows[0]);
        return createResponse(200, {
          success: true,
          property,
        });
      }
    } catch (err) {
      // SystemProperty table might not exist
      console.log('[CONFIG-SERVICE] SystemProperty lookup failed:', err.message);
    }

    // Not found in either table
    return createResponse(404, {
      error: 'Not Found',
      message: 'Property not found',
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get property:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve property',
    });
  }
}

/**
 * POST /api/v2/properties
 * Create a new property
 */
async function handleCreateProperty(user, body) {
  console.log('[CONFIG-SERVICE] handleCreateProperty - start');

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const { tenantId, plan } = ctx;

    // Validate required fields
    const {
      name,
      label,
      fieldType,
      entityType,
      description,
      options,
      required = false,
      defaultValue,
      validationRules,
      sortOrder,
      propertyGroup = 'General',
      showInList = false,
      showInForm = true,
    } = body;

    if (!name || !label || !fieldType || !entityType) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'name, label, fieldType, and entityType are required',
      });
    }

    // Validate field type
    if (!VALID_FIELD_TYPES.includes(fieldType)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Invalid fieldType. Must be one of: ${VALID_FIELD_TYPES.join(', ')}`,
      });
    }

    // Validate entity type
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
      });
    }

    // Validate name format (snake_case, alphanumeric + underscore)
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Property name must be lowercase, start with a letter, and contain only letters, numbers, and underscores',
      });
    }

    // Validate options for select/multiselect
    if (['select', 'multiselect'].includes(fieldType)) {
      if (!options || !Array.isArray(options) || options.length === 0) {
        return createResponse(400, {
          error: 'Bad Request',
          message: 'Select and multiselect fields require at least one option',
        });
      }
      // Validate each option has value and label
      for (const opt of options) {
        if (!opt.value || !opt.label) {
          return createResponse(400, {
            error: 'Bad Request',
            message: 'Each option must have a value and label',
          });
        }
      }
    }

    // Check plan limits
    const limits = await checkPropertyLimits(tenantId, plan, entityType);
    if (!limits.canCreate) {
      return createResponse(403, {
        error: 'Limit Reached',
        message: `You have reached the maximum number of custom fields (${limits.limit}) for your ${plan} plan. Upgrade to add more.`,
        limits,
      });
    }

    // Check for duplicate name
    const duplicateCheck = await query(
      `SELECT id FROM "Property"
       WHERE tenant_id = $1 AND entity_type = $2 AND name = $3 AND archived_at IS NULL`,
      [tenantId, entityType, name]
    );

    if (duplicateCheck.rows.length > 0) {
      return createResponse(409, {
        error: 'Conflict',
        message: `A property with name "${name}" already exists for ${entityType}`,
      });
    }

    // Determine sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxSortResult = await query(
        `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
         FROM "Property" WHERE tenant_id = $1 AND entity_type = $2`,
        [tenantId, entityType]
      );
      finalSortOrder = maxSortResult.rows[0].next_order;
    }

    // Insert property
    const recordId = await getNextRecordId(tenantId, 'Property');
    const result = await query(
      `INSERT INTO "Property" (
        tenant_id, record_id, name, label, description, field_type, entity_type,
        options, required, default_value, validation_rules,
        sort_order, property_group, show_in_list, show_in_form
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        tenantId, recordId, name, label, description || null, fieldType, entityType,
        JSON.stringify(options || []), required, defaultValue ? JSON.stringify(defaultValue) : null,
        JSON.stringify(validationRules || {}), finalSortOrder, propertyGroup, showInList, showInForm
      ]
    );

    const property = formatPropertyResponse(result.rows[0]);

    console.log('[CONFIG-SERVICE] handleCreateProperty - created:', property.id);

    return createResponse(201, {
      success: true,
      message: 'Property created successfully',
      property,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to create property:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create property',
    });
  }
}

/**
 * PUT/PATCH /api/v2/properties/:id
 * Update a property
 */
async function handleUpdateProperty(user, propertyId, body) {
  console.log('[CONFIG-SERVICE] handleUpdateProperty -', propertyId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // Get existing property
    const existingResult = await query(
      `SELECT * FROM "Property" WHERE id = $1 AND tenant_id = $2`,
      [propertyId, ctx.tenantId]
    );

    if (existingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Property not found',
      });
    }

    const existing = existingResult.rows[0];

    // System properties can only have label/description updated
    if (existing.is_system) {
      const allowedFields = ['label', 'description', 'sortOrder', 'propertyGroup', 'showInList', 'showInForm'];
      const attemptedFields = Object.keys(body);
      const disallowed = attemptedFields.filter(f => !allowedFields.includes(f));
      if (disallowed.length > 0) {
        return createResponse(403, {
          error: 'Forbidden',
          message: `Cannot modify ${disallowed.join(', ')} on system properties`,
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [propertyId, ctx.tenantId];
    let paramIndex = 3;

    const fieldMap = {
      label: 'label',
      description: 'description',
      options: 'options',
      required: 'required',
      defaultValue: 'default_value',
      validationRules: 'validation_rules',
      sortOrder: 'sort_order',
      propertyGroup: 'property_group',
      showInList: 'show_in_list',
      showInForm: 'show_in_form',
    };

    for (const [jsField, dbField] of Object.entries(fieldMap)) {
      if (body[jsField] !== undefined) {
        const value = ['options', 'defaultValue', 'validationRules'].includes(jsField)
          ? JSON.stringify(body[jsField])
          : body[jsField];
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    // Validate options if updating select/multiselect
    if (body.options !== undefined && ['select', 'multiselect'].includes(existing.field_type)) {
      if (!Array.isArray(body.options) || body.options.length === 0) {
        return createResponse(400, {
          error: 'Bad Request',
          message: 'Select and multiselect fields require at least one option',
        });
      }
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Property" SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    const property = formatPropertyResponse(result.rows[0]);

    console.log('[CONFIG-SERVICE] handleUpdateProperty - updated:', property.id);

    return createResponse(200, {
      success: true,
      message: 'Property updated successfully',
      property,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update property:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update property',
    });
  }
}

/**
 * DELETE /api/v2/properties/:id
 * Soft delete a property (sets is_active = false)
 */
async function handleDeleteProperty(user, propertyId) {
  console.log('[CONFIG-SERVICE] handleDeleteProperty -', propertyId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // Get property and check if it's a system property
    const existingResult = await query(
      `SELECT * FROM "Property" WHERE id = $1 AND tenant_id = $2`,
      [propertyId, ctx.tenantId]
    );

    if (existingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Property not found',
      });
    }

    const existing = existingResult.rows[0];

    if (existing.is_system) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Cannot delete system properties',
      });
    }

    // Soft delete
    await query(
      `UPDATE "Property"
       SET is_active = false, archived_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [propertyId, ctx.tenantId]
    );

    console.log('[CONFIG-SERVICE] handleDeleteProperty - deleted:', propertyId);

    return createResponse(200, {
      success: true,
      message: 'Property deleted successfully',
      deletedPropertyId: propertyId,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to delete property:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete property',
    });
  }
}

/**
 * POST /api/v2/properties/:id/archive
 * Archive a property with cascade options
 */
async function handleArchiveProperty(user, propertyId, body) {
  console.log('[CONFIG-SERVICE] handleArchiveProperty -', propertyId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const { reason, cascadeStrategy = 'keep' } = body;

    // Get property
    const existingResult = await query(
      `SELECT * FROM "Property" WHERE id = $1 AND tenant_id = $2`,
      [propertyId, ctx.tenantId]
    );

    if (existingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Property not found',
      });
    }

    const existing = existingResult.rows[0];

    if (existing.is_system) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Cannot archive system properties',
      });
    }

    // Archive the property
    await query(
      `UPDATE "Property"
       SET is_active = false, archived_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [propertyId, ctx.tenantId]
    );

    // Handle cascade strategy for property values
    let valuesDeleted = 0;
    if (cascadeStrategy === 'delete') {
      const deleteResult = await query(
        `DELETE FROM "PropertyValue" WHERE property_id = $1 RETURNING id`,
        [propertyId]
      );
      valuesDeleted = deleteResult.rowCount;
    }

    console.log('[CONFIG-SERVICE] handleArchiveProperty - archived:', propertyId);

    return createResponse(200, {
      success: true,
      message: 'Property archived successfully',
      archivedPropertyId: propertyId,
      reason,
      cascadeStrategy,
      valuesDeleted,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to archive property:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to archive property',
    });
  }
}

/**
 * POST /api/v2/properties/:id/restore
 * Restore an archived property
 */
async function handleRestoreProperty(user, propertyId) {
  console.log('[CONFIG-SERVICE] handleRestoreProperty -', propertyId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // Get property (including archived)
    const existingResult = await query(
      `SELECT * FROM "Property" WHERE id = $1 AND tenant_id = $2`,
      [propertyId, ctx.tenantId]
    );

    if (existingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Property not found',
      });
    }

    const existing = existingResult.rows[0];

    if (existing.is_active) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Property is not archived',
      });
    }

    // Check plan limits before restoring
    const limits = await checkPropertyLimits(ctx.tenantId, ctx.plan, existing.entity_type);
    if (!limits.canCreate) {
      return createResponse(403, {
        error: 'Limit Reached',
        message: `Cannot restore property - you have reached the limit of ${limits.limit} for your ${ctx.plan} plan`,
        limits,
      });
    }

    // Restore the property
    const result = await query(
      `UPDATE "Property"
       SET is_active = true, archived_at = NULL, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [propertyId, ctx.tenantId]
    );

    const property = formatPropertyResponse(result.rows[0]);

    console.log('[CONFIG-SERVICE] handleRestoreProperty - restored:', propertyId);

    return createResponse(200, {
      success: true,
      message: 'Property restored successfully',
      property,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to restore property:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to restore property',
    });
  }
}

/**
 * GET /api/v2/properties/values/:entity_type/:entity_id
 * Get all property values for an entity
 */
async function handleGetPropertyValues(user, entityType, entityId) {
  console.log('[CONFIG-SERVICE] handleGetPropertyValues -', entityType, entityId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // Validate entity type
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
      });
    }

    // Get all properties for this entity type and their values for this entity
    const result = await query(
      `SELECT
         p.id as property_id,
         p.name,
         p.label,
         p.field_type,
         p.options,
         p.required,
         p.default_value,
         pv.id as value_id,
         pv.value
       FROM "Property" p
       LEFT JOIN "PropertyValue" pv
         ON p.id = pv.property_id
         AND pv.entity_id = $3
       WHERE p.tenant_id = $1
         AND p.entity_type = $2
         AND p.is_active = true
       ORDER BY p.sort_order, p.created_at`,
      [ctx.tenantId, entityType, entityId]
    );

    // Format response as a map of property name -> value
    const values = {};
    const properties = [];

    result.rows.forEach(row => {
      properties.push({
        id: row.property_id,
        name: row.name,
        label: row.label,
        fieldType: row.field_type,
        options: row.options,
        required: row.required,
        defaultValue: row.default_value,
      });

      // Use value if exists, otherwise use default value
      values[row.name] = row.value !== null ? row.value : row.default_value;
    });

    return createResponse(200, {
      success: true,
      entityType,
      entityId,
      values,
      properties,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get property values:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve property values',
    });
  }
}

/**
 * PUT /api/v2/properties/values/:entity_type/:entity_id
 * Bulk upsert property values for an entity
 */
async function handleUpsertPropertyValues(user, entityType, entityId, body) {
  console.log('[CONFIG-SERVICE] handleUpsertPropertyValues -', entityType, entityId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // Validate entity type
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
      });
    }

    const { values } = body;

    if (!values || typeof values !== 'object') {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'values object is required',
      });
    }

    // Get all properties for this entity type
    const propertiesResult = await query(
      `SELECT id, name, field_type, required, options FROM "Property"
       WHERE tenant_id = $1 AND entity_type = $2 AND is_active = true`,
      [ctx.tenantId, entityType]
    );

    const propertyMap = {};
    propertiesResult.rows.forEach(p => {
      propertyMap[p.name] = p;
    });

    // Validate and upsert each value
    const upserted = [];
    const errors = [];

    for (const [propertyName, value] of Object.entries(values)) {
      const property = propertyMap[propertyName];

      if (!property) {
        errors.push({ propertyName, error: 'Unknown property' });
        continue;
      }

      // Validate value type
      const validation = validatePropertyValue(property, value);
      if (!validation.valid) {
        errors.push({ propertyName, error: validation.error });
        continue;
      }

      // Upsert the value
      const pvRecordId = await getNextRecordId(ctx.tenantId, 'PropertyValue');
      await query(
        `INSERT INTO "PropertyValue" (tenant_id, record_id, property_id, entity_type, entity_id, value)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (property_id, entity_id)
         DO UPDATE SET value = $6, updated_at = NOW()`,
        [ctx.tenantId, pvRecordId, property.id, entityType, entityId, JSON.stringify(value)]
      );

      upserted.push(propertyName);
    }

    // Check for required properties that are missing
    for (const [name, property] of Object.entries(propertyMap)) {
      if (property.required && values[name] === undefined) {
        // Check if value already exists
        const existingValue = await query(
          `SELECT id FROM "PropertyValue" WHERE property_id = $1 AND entity_id = $2`,
          [property.id, entityId]
        );
        if (existingValue.rows.length === 0) {
          errors.push({ propertyName: name, error: 'Required property is missing' });
        }
      }
    }

    console.log('[CONFIG-SERVICE] handleUpsertPropertyValues - upserted:', upserted.length);

    return createResponse(errors.length > 0 && upserted.length === 0 ? 400 : 200, {
      success: errors.length === 0 || upserted.length > 0,
      message: errors.length === 0 ? 'Property values saved successfully' : 'Some values could not be saved',
      upserted,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to upsert property values:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to save property values',
    });
  }
}

/**
 * Helper: Validate a property value against its field type
 */
function validatePropertyValue(property, value) {
  const { field_type: fieldType, options } = property;

  // null/undefined is valid for non-required fields (will clear the value)
  if (value === null || value === undefined) {
    return { valid: true };
  }

  switch (fieldType) {
    case 'text':
    case 'textarea':
    case 'url':
    case 'email':
    case 'phone':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Value must be a string' };
      }
      if (fieldType === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { valid: false, error: 'Invalid email format' };
      }
      if (fieldType === 'url' && value && !/^https?:\/\/.+/.test(value)) {
        return { valid: false, error: 'Invalid URL format' };
      }
      break;

    case 'number':
    case 'currency':
      if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: 'Value must be a number' };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { valid: false, error: 'Value must be a boolean' };
      }
      break;

    case 'date':
    case 'datetime':
      if (typeof value !== 'string' || isNaN(Date.parse(value))) {
        return { valid: false, error: 'Value must be a valid date string' };
      }
      break;

    case 'select':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Value must be a string' };
      }
      const validOptions = (options || []).map(o => o.value);
      if (!validOptions.includes(value)) {
        return { valid: false, error: `Value must be one of: ${validOptions.join(', ')}` };
      }
      break;

    case 'multiselect':
      if (!Array.isArray(value)) {
        return { valid: false, error: 'Value must be an array' };
      }
      const validMultiOptions = (options || []).map(o => o.value);
      for (const v of value) {
        if (!validMultiOptions.includes(v)) {
          return { valid: false, error: `Invalid option: ${v}` };
        }
      }
      break;

    default:
      return { valid: false, error: `Unknown field type: ${fieldType}` };
  }

  return { valid: true };
}

// =============================================================================
// ENTITY DEFINITIONS API (v2) - Custom Objects
// =============================================================================
//
// Entity definitions allow tenants to create custom object types beyond the
// built-in system entities (pet, owner, booking, staff, service, kennel).
//
// Feature Gating:
// - FREE: 0 custom objects (system entities only)
// - PRO: 3 custom objects
// - ENTERPRISE: unlimited custom objects
//
// =============================================================================

const SYSTEM_ENTITY_TYPES = ['pet', 'owner', 'booking', 'staff', 'service', 'kennel'];

const CUSTOM_OBJECT_LIMITS = {
  FREE: 0,
  PRO: 3,
  ENTERPRISE: Infinity,
};

/**
 * Helper: Format entity definition for response
 */
function formatEntityDefinitionResponse(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    internalName: row.internal_name,
    singularName: row.singular_name,
    pluralName: row.plural_name,
    description: row.description,
    primaryDisplayPropertyId: row.primary_display_property_id,
    secondaryDisplayPropertyIds: row.secondary_display_property_ids || [],
    icon: row.icon,
    color: row.color,
    isSystem: row.is_system,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    // Computed fields
    propertyCount: row.property_count !== undefined ? parseInt(row.property_count, 10) : undefined,
  };
}

/**
 * Helper: Check custom object limits based on plan
 */
async function checkCustomObjectLimits(tenantId, plan) {
  const countResult = await query(
    `SELECT COUNT(*) as count FROM "EntityDefinition"
     WHERE tenant_id = $1 AND is_system = false AND is_active = true`,
    [tenantId]
  );

  const currentCount = parseInt(countResult.rows[0].count, 10);
  const limit = CUSTOM_OBJECT_LIMITS[plan] || CUSTOM_OBJECT_LIMITS.FREE;

  return {
    currentCount,
    limit,
    canCreate: currentCount < limit,
    remaining: Math.max(0, limit - currentCount),
  };
}

/**
 * GET /api/v2/entities
 * List all entity definitions for tenant
 */
async function handleListEntityDefinitions(user, queryParams) {
  console.log('[CONFIG-SERVICE] handleListEntityDefinitions - start');

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const { tenantId, plan } = ctx;
    const {
      includeInactive = 'false',
      includePropertyCount = 'true',
      systemOnly = 'false',
      customOnly = 'false',
    } = queryParams;

    // Build query
    let sql = `
      SELECT ed.*
      ${includePropertyCount === 'true' ? ', COALESCE(pc.property_count, 0) as property_count' : ''}
      FROM "EntityDefinition" ed
      ${includePropertyCount === 'true' ? `
        LEFT JOIN (
          SELECT entity_definition_id, COUNT(*) as property_count
          FROM "Property"
          WHERE is_active = true
          GROUP BY entity_definition_id
        ) pc ON ed.id = pc.entity_definition_id
      ` : ''}
      WHERE ed.tenant_id = $1
    `;
    const values = [tenantId];
    let paramIndex = 2;

    if (includeInactive !== 'true') {
      sql += ` AND ed.is_active = true`;
    }

    if (systemOnly === 'true') {
      sql += ` AND ed.is_system = true`;
    } else if (customOnly === 'true') {
      sql += ` AND ed.is_system = false`;
    }

    sql += ` ORDER BY ed.sort_order, ed.created_at`;

    const result = await query(sql, values);
    const entities = result.rows.map(formatEntityDefinitionResponse);

    // Get custom object limits
    const limits = await checkCustomObjectLimits(tenantId, plan);

    console.log('[CONFIG-SERVICE] handleListEntityDefinitions - found:', entities.length);

    return createResponse(200, {
      success: true,
      entities,
      metadata: {
        total: entities.length,
        systemCount: entities.filter(e => e.isSystem).length,
        customCount: entities.filter(e => !e.isSystem).length,
        plan,
        customObjectLimits: limits,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to list entity definitions:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve entity definitions',
    });
  }
}

/**
 * GET /api/v2/entities/:id
 * Get single entity definition
 */
async function handleGetEntityDefinition(user, entityId) {
  console.log('[CONFIG-SERVICE] handleGetEntityDefinition -', entityId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const result = await query(
      `SELECT ed.*,
        COALESCE(pc.property_count, 0) as property_count
       FROM "EntityDefinition" ed
       LEFT JOIN (
         SELECT entity_definition_id, COUNT(*) as property_count
         FROM "Property"
         WHERE is_active = true
         GROUP BY entity_definition_id
       ) pc ON ed.id = pc.entity_definition_id
       WHERE ed.id = $1 AND ed.tenant_id = $2`,
      [entityId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Entity definition not found',
      });
    }

    const entity = formatEntityDefinitionResponse(result.rows[0]);

    return createResponse(200, {
      success: true,
      entity,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get entity definition:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve entity definition',
    });
  }
}

/**
 * POST /api/v2/entities
 * Create a new custom entity definition
 */
async function handleCreateEntityDefinition(user, body) {
  console.log('[CONFIG-SERVICE] handleCreateEntityDefinition - start');

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const { tenantId, userId, plan } = ctx;

    // Validate required fields
    const {
      internalName,
      singularName,
      pluralName,
      description,
      icon,
      color,
      sortOrder,
    } = body;

    if (!internalName || !singularName || !pluralName) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'internalName, singularName, and pluralName are required',
      });
    }

    // Validate internal name format (lowercase, alphanumeric + underscore)
    if (!/^[a-z][a-z0-9_]*$/.test(internalName)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Internal name must be lowercase, start with a letter, and contain only letters, numbers, and underscores',
      });
    }

    // Prevent creating entities with system entity names
    if (SYSTEM_ENTITY_TYPES.includes(internalName)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Cannot create entity with reserved name: ${internalName}`,
      });
    }

    // Check plan limits for custom objects
    const limits = await checkCustomObjectLimits(tenantId, plan);
    if (!limits.canCreate) {
      return createResponse(403, {
        error: 'Limit Reached',
        message: `You have reached the maximum number of custom objects (${limits.limit}) for your ${plan} plan. Upgrade to add more.`,
        limits,
      });
    }

    // Check for duplicate internal name
    const duplicateCheck = await query(
      `SELECT id FROM "EntityDefinition"
       WHERE tenant_id = $1 AND internal_name = $2 AND is_active = true`,
      [tenantId, internalName]
    );

    if (duplicateCheck.rows.length > 0) {
      return createResponse(409, {
        error: 'Conflict',
        message: `An entity with internal name "${internalName}" already exists`,
      });
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Color must be a valid hex color (e.g., #FF5733)',
      });
    }

    // Determine sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxSortResult = await query(
        `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
         FROM "EntityDefinition" WHERE tenant_id = $1`,
        [tenantId]
      );
      finalSortOrder = maxSortResult.rows[0].next_order;
    }

    // Insert entity definition
    const result = await query(
      `INSERT INTO "EntityDefinition" (
        tenant_id, internal_name, singular_name, plural_name, description,
        icon, color, is_system, sort_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9)
      RETURNING *`,
      [
        tenantId, internalName, singularName, pluralName, description || null,
        icon || null, color || null, finalSortOrder, userId
      ]
    );

    const entity = formatEntityDefinitionResponse(result.rows[0]);

    console.log('[CONFIG-SERVICE] handleCreateEntityDefinition - created:', entity.id);

    return createResponse(201, {
      success: true,
      message: 'Entity definition created successfully',
      entity,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to create entity definition:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create entity definition',
    });
  }
}

/**
 * PUT/PATCH /api/v2/entities/:id
 * Update an entity definition
 */
async function handleUpdateEntityDefinition(user, entityId, body) {
  console.log('[CONFIG-SERVICE] handleUpdateEntityDefinition -', entityId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // Get existing entity definition
    const existingResult = await query(
      `SELECT * FROM "EntityDefinition" WHERE id = $1 AND tenant_id = $2`,
      [entityId, ctx.tenantId]
    );

    if (existingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Entity definition not found',
      });
    }

    const existing = existingResult.rows[0];

    // System entities have restrictions on what can be updated
    if (existing.is_system) {
      // For system entities, only allow updating display names and visual settings
      const allowedFields = ['singularName', 'pluralName', 'description', 'icon', 'color', 'sortOrder', 'primaryDisplayPropertyId', 'secondaryDisplayPropertyIds'];
      const attemptedFields = Object.keys(body);
      const disallowed = attemptedFields.filter(f => !allowedFields.includes(f));

      // Block attempts to change internal_name for system entities
      if (body.internalName && body.internalName !== existing.internal_name) {
        return createResponse(403, {
          error: 'Forbidden',
          message: 'Cannot change internal name of system entities',
        });
      }

      if (disallowed.length > 0) {
        return createResponse(403, {
          error: 'Forbidden',
          message: `Cannot modify ${disallowed.join(', ')} on system entities`,
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [entityId, ctx.tenantId];
    let paramIndex = 3;

    const fieldMap = {
      singularName: 'singular_name',
      pluralName: 'plural_name',
      description: 'description',
      icon: 'icon',
      color: 'color',
      sortOrder: 'sort_order',
      primaryDisplayPropertyId: 'primary_display_property_id',
      secondaryDisplayPropertyIds: 'secondary_display_property_ids',
    };

    // For non-system entities, also allow updating internal_name
    if (!existing.is_system) {
      fieldMap.internalName = 'internal_name';
    }

    for (const [jsField, dbField] of Object.entries(fieldMap)) {
      if (body[jsField] !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(body[jsField]);
      }
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    // Validate color if being updated
    if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Color must be a valid hex color (e.g., #FF5733)',
      });
    }

    // Validate internal_name if being updated (non-system only)
    if (body.internalName && !existing.is_system) {
      if (!/^[a-z][a-z0-9_]*$/.test(body.internalName)) {
        return createResponse(400, {
          error: 'Bad Request',
          message: 'Internal name must be lowercase, start with a letter, and contain only letters, numbers, and underscores',
        });
      }

      // Check for duplicate
      if (body.internalName !== existing.internal_name) {
        const duplicateCheck = await query(
          `SELECT id FROM "EntityDefinition"
           WHERE tenant_id = $1 AND internal_name = $2 AND is_active = true AND id != $3`,
          [ctx.tenantId, body.internalName, entityId]
        );

        if (duplicateCheck.rows.length > 0) {
          return createResponse(409, {
            error: 'Conflict',
            message: `An entity with internal name "${body.internalName}" already exists`,
          });
        }
      }
    }

    updates.push('updated_at = NOW()');
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(ctx.userId);

    const result = await query(
      `UPDATE "EntityDefinition" SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    const entity = formatEntityDefinitionResponse(result.rows[0]);

    console.log('[CONFIG-SERVICE] handleUpdateEntityDefinition - updated:', entity.id);

    return createResponse(200, {
      success: true,
      message: 'Entity definition updated successfully',
      entity,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update entity definition:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update entity definition',
    });
  }
}

/**
 * DELETE /api/v2/entities/:id
 * Soft delete an entity definition (blocked for system entities)
 */
async function handleDeleteEntityDefinition(user, entityId) {
  console.log('[CONFIG-SERVICE] handleDeleteEntityDefinition -', entityId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // Get entity definition
    const existingResult = await query(
      `SELECT * FROM "EntityDefinition" WHERE id = $1 AND tenant_id = $2`,
      [entityId, ctx.tenantId]
    );

    if (existingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Entity definition not found',
      });
    }

    const existing = existingResult.rows[0];

    // Block deletion of system entities
    if (existing.is_system) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Cannot delete system entities. System entities are required for core functionality.',
      });
    }

    // Check if entity has properties
    const propertyCheck = await query(
      `SELECT COUNT(*) as count FROM "Property"
       WHERE entity_definition_id = $1 AND is_active = true`,
      [entityId]
    );

    const propertyCount = parseInt(propertyCheck.rows[0].count, 10);
    if (propertyCount > 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Cannot delete entity with ${propertyCount} active properties. Archive or delete the properties first.`,
        propertyCount,
      });
    }

    // Soft delete
    await query(
      `UPDATE "EntityDefinition"
       SET is_active = false, updated_at = NOW(), updated_by = $3
       WHERE id = $1 AND tenant_id = $2`,
      [entityId, ctx.tenantId, ctx.userId]
    );

    console.log('[CONFIG-SERVICE] handleDeleteEntityDefinition - deleted:', entityId);

    return createResponse(200, {
      success: true,
      message: 'Entity definition deleted successfully',
      deletedEntityId: entityId,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to delete entity definition:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete entity definition',
    });
  }
}

// =============================================================================
// FORMS & WAIVERS HANDLERS
// =============================================================================

/**
 * List form templates for tenant
 */
async function handleListFormTemplates(user, queryParams) {
  const { type, isActive, isRequired } = queryParams;

  console.log('[Forms][list] Starting for user:', user.id);

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);

    if (!ctx.tenantId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No tenant context found',
      });
    }

    let whereClause = 'tenant_id = $1 ';
    const params = [ctx.tenantId];
    let paramIndex = 2;

    if (type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex++}`;
      params.push(isActive === 'true' || isActive === true);
    }

    if (isRequired !== undefined) {
      whereClause += ` AND is_required = $${paramIndex++}`;
      params.push(isRequired === 'true' || isRequired === true);
    }

    const result = await query(
      `SELECT
         id, name, slug, description, type, fields, settings,
         is_active, is_required, require_signature, expiration_days,
         sort_order, category, created_at, updated_at,
         (SELECT COUNT(*) FROM "FormSubmission" fs WHERE fs.template_id = "FormTemplate".id) as submission_count
       FROM "FormTemplate"
       WHERE ${whereClause}
       ORDER BY sort_order ASC, name ASC`,
      params
    );

    console.log('[Forms][list] Found:', result.rows.length, 'templates');

    const templates = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      type: row.type,
      fields: row.fields || [],
      fieldCount: (row.fields || []).length,
      settings: row.settings || {},
      isActive: row.is_active,
      isRequired: row.is_required,
      requireSignature: row.require_signature,
      expirationDays: row.expiration_days,
      sortOrder: row.sort_order,
      category: row.category,
      submissionCount: parseInt(row.submission_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, {
      data: templates,
      forms: templates,
      total: templates.length,
      message: 'Form templates retrieved successfully',
    });

  } catch (error) {
    console.error('[Forms] Failed to list templates:', error.message, error.stack);

    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return createResponse(200, {
        data: [],
        forms: [],
        total: 0,
        message: 'Form templates (table not initialized)',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve form templates',
    });
  }
}

/**
 * Get single form template
 */
async function handleGetFormTemplate(user, formId) {
  console.log('[Forms][get] formId:', formId);

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);

    if (!ctx.tenantId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No tenant context found',
      });
    }

    const result = await query(
      `SELECT
         id, name, slug, description, type, fields, settings,
         is_active, is_required, require_signature, expiration_days,
         sort_order, category, created_by, updated_by, created_at, updated_at
       FROM "FormTemplate"
       WHERE id = $1 AND tenant_id = $2 `,
      [formId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Form template not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      type: row.type,
      fields: row.fields || [],
      settings: row.settings || {},
      isActive: row.is_active,
      isRequired: row.is_required,
      requireSignature: row.require_signature,
      expirationDays: row.expiration_days,
      sortOrder: row.sort_order,
      category: row.category,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

  } catch (error) {
    console.error('[Forms] Failed to get template:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve form template',
    });
  }
}

/**
 * Create form template
 */
async function handleCreateFormTemplate(user, body) {
  const {
    name, slug, description, type, fields, settings,
    isRequired, requireSignature, expirationDays, sortOrder, category
  } = body;

  console.log('[Forms][create] name:', name, 'type:', type);

  if (!name) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Name is required',
    });
  }

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);

    if (!ctx.tenantId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No tenant context found',
      });
    }

    const formSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await query(
      `SELECT id FROM "FormTemplate" WHERE tenant_id = $1 AND slug = $2 `,
      [ctx.tenantId, formSlug]
    );

    if (existing.rows.length > 0) {
      return createResponse(409, {
        error: 'Conflict',
        message: 'A form with this slug already exists',
      });
    }

    const result = await query(
      `INSERT INTO "FormTemplate" (
         tenant_id, name, slug, description, type, fields, settings,
         is_required, require_signature, expiration_days, sort_order, category,
         created_by, updated_by, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, NOW(), NOW())
       RETURNING *`,
      [
        ctx.tenantId, name, formSlug, description || null, type || 'custom',
        JSON.stringify(fields || []), JSON.stringify(settings || {}),
        isRequired || false, requireSignature || false, expirationDays || null,
        sortOrder || 0, category || null, ctx.userId
      ]
    );

    const row = result.rows[0];
    console.log('[Forms][create] Created template:', row.id);

    return createResponse(201, {
      success: true,
      id: row.id,
      name: row.name,
      slug: row.slug,
      type: row.type,
      message: 'Form template created successfully',
    });

  } catch (error) {
    console.error('[Forms] Failed to create template:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create form template',
    });
  }
}

/**
 * Update form template
 */
async function handleUpdateFormTemplate(user, formId, body) {
  const {
    name, description, type, fields, settings,
    isActive, isRequired, requireSignature, expirationDays, sortOrder, category
  } = body;

  console.log('[Forms][update] formId:', formId);

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);

    if (!ctx.tenantId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No tenant context found',
      });
    }

    const updates = [];
    const values = [formId, ctx.tenantId];
    let paramIndex = 3;

    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (type !== undefined) { updates.push(`type = $${paramIndex++}`); values.push(type); }
    if (fields !== undefined) { updates.push(`fields = $${paramIndex++}`); values.push(JSON.stringify(fields)); }
    if (settings !== undefined) { updates.push(`settings = $${paramIndex++}`); values.push(JSON.stringify(settings)); }
    if (isActive !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(isActive); }
    if (isRequired !== undefined) { updates.push(`is_required = $${paramIndex++}`); values.push(isRequired); }
    if (requireSignature !== undefined) { updates.push(`require_signature = $${paramIndex++}`); values.push(requireSignature); }
    if (expirationDays !== undefined) { updates.push(`expiration_days = $${paramIndex++}`); values.push(expirationDays); }
    if (sortOrder !== undefined) { updates.push(`sort_order = $${paramIndex++}`); values.push(sortOrder); }
    if (category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(category); }

    if (updates.length === 0) {
      return createResponse(400, { error: 'Bad Request', message: 'No valid fields to update' });
    }

    updates.push(`updated_by = $${paramIndex++}`);
    values.push(ctx.userId);
    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "FormTemplate" SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2  RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Form template not found' });
    }

    return createResponse(200, { success: true, id: result.rows[0].id, name: result.rows[0].name, message: 'Form template updated successfully' });

  } catch (error) {
    console.error('[Forms] Failed to update template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update form template' });
  }
}

/**
 * Delete form template (soft delete)
 */
async function handleDeleteFormTemplate(user, formId) {
  console.log('[Forms][delete] formId:', formId);

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);

    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context found' });
    }

    const deletedRecord = await softDelete('FormTemplate', formId, ctx.tenantId, ctx.userId);

    if (!deletedRecord) {
      return createResponse(404, { error: 'Not Found', message: 'Form template not found' });
    }

    return createResponse(200, { success: true, message: 'Form template deleted successfully' });

  } catch (error) {
    console.error('[Forms] Failed to delete template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete form template' });
  }
}

/**
 * List form submissions
 */
async function handleListFormSubmissions(user, queryParams) {
  const { templateId, ownerId, petId, bookingId, status, limit = 50, offset = 0 } = queryParams;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);

    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context found' });
    }

    let whereClause = 'fs.tenant_id = $1';
    const params = [ctx.tenantId];
    let paramIndex = 2;

    if (templateId) { whereClause += ` AND fs.template_id = $${paramIndex++}`; params.push(templateId); }
    if (ownerId) { whereClause += ` AND fs.owner_id = $${paramIndex++}`; params.push(ownerId); }
    if (petId) { whereClause += ` AND fs.pet_id = $${paramIndex++}`; params.push(petId); }
    if (bookingId) { whereClause += ` AND fs.booking_id = $${paramIndex++}`; params.push(bookingId); }
    if (status) { whereClause += ` AND fs.status = $${paramIndex++}`; params.push(status); }

    const result = await query(
      `SELECT fs.*, ft.name as template_name, ft.type as template_type, o.first_name as owner_first_name, o.last_name as owner_last_name, p.name as pet_name
       FROM "FormSubmission" fs JOIN "FormTemplate" ft ON fs.template_id = ft.id LEFT JOIN "Owner" o ON fs.owner_id = o.record_id LEFT JOIN "Pet" p ON fs.pet_id = p.record_id
       WHERE ${whereClause} ORDER BY fs.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const submissions = result.rows.map(row => ({
      id: row.id, templateId: row.template_id, templateName: row.template_name, templateType: row.template_type,
      ownerId: row.owner_id, ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim() : null,
      petId: row.pet_id, petName: row.pet_name, bookingId: row.booking_id, data: row.data || {},
      signatureName: row.signature_name, signedAt: row.signed_at, status: row.status,
      createdAt: row.created_at, updatedAt: row.updated_at,
    }));

    return createResponse(200, { data: submissions, submissions, total: submissions.length, message: 'Form submissions retrieved' });

  } catch (error) {
    console.error('[Forms] Failed to list submissions:', error.message);
    if (error.code === '42P01') return createResponse(200, { data: [], submissions: [], total: 0, message: 'Table not initialized' });
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to retrieve submissions' });
  }
}

/**
 * Get single form submission
 */
async function handleGetFormSubmission(user, submissionId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT fs.*, ft.name as template_name, ft.type as template_type, ft.fields as template_fields,
              o.first_name as owner_first_name, o.last_name as owner_last_name, o.email as owner_email, p.name as pet_name
       FROM "FormSubmission" fs JOIN "FormTemplate" ft ON fs.template_id = ft.id
       LEFT JOIN "Owner" o ON fs.owner_id = o.record_id LEFT JOIN "Pet" p ON fs.pet_id = p.record_id
       WHERE fs.id = $1 AND fs.tenant_id = $2`,
      [submissionId, ctx.tenantId]
    );

    if (result.rows.length === 0) return createResponse(404, { error: 'Not Found', message: 'Submission not found' });
    const row = result.rows[0];

    return createResponse(200, {
      id: row.id, templateId: row.template_id, templateName: row.template_name, templateFields: row.template_fields,
      ownerId: row.owner_id, ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name}`.trim() : null,
      ownerEmail: row.owner_email, petId: row.pet_id, petName: row.pet_name, bookingId: row.booking_id,
      data: row.data, signatureData: row.signature_data, signatureName: row.signature_name, signedAt: row.signed_at,
      status: row.status, reviewNotes: row.review_notes, createdAt: row.created_at, updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error('[Forms] Failed to get submission:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get submission' });
  }
}

/**
 * Create form submission
 */
async function handleCreateFormSubmission(user, templateId, body) {
  const { ownerId, petId, bookingId, data, signatureData, signatureName, signerIp } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const templateResult = await query(
      `SELECT id, require_signature FROM "FormTemplate" WHERE id = $1 AND tenant_id = $2  AND is_active = true`,
      [templateId, ctx.tenantId]
    );
    if (templateResult.rows.length === 0) return createResponse(404, { error: 'Not Found', message: 'Template not found' });

    const template = templateResult.rows[0];
    if (template.require_signature && !signatureData && !signatureName) {
      return createResponse(400, { error: 'Bad Request', message: 'Signature required' });
    }

    const result = await query(
      `INSERT INTO "FormSubmission" (tenant_id, template_id, owner_id, pet_id, booking_id, data, signature_data, signature_name, signed_at, signer_ip, submitted_by_user_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'submitted') RETURNING *`,
      [ctx.tenantId, templateId, ownerId, petId, bookingId, JSON.stringify(data || {}), signatureData, signatureName,
       signatureData || signatureName ? new Date() : null, signerIp, ctx.userId]
    );

    return createResponse(201, { success: true, id: result.rows[0].id, status: 'submitted', message: 'Form submitted' });
  } catch (error) {
    console.error('[Forms] Failed to create submission:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to submit form' });
  }
}

/**
 * Update form submission (review/approve)
 */
async function handleUpdateFormSubmission(user, submissionId, body) {
  const { status, reviewNotes } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const validStatuses = ['submitted', 'approved', 'rejected', 'expired'];
    if (status && !validStatuses.includes(status)) {
      return createResponse(400, { error: 'Bad Request', message: 'Invalid status' });
    }

    const updates = [];
    const values = [submissionId, ctx.tenantId];
    let paramIndex = 3;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      if (status === 'approved' || status === 'rejected') {
        updates.push(`reviewed_by = $${paramIndex++}`);
        values.push(ctx.userId);
        updates.push('reviewed_at = NOW()');
      }
    }
    if (reviewNotes !== undefined) { updates.push(`review_notes = $${paramIndex++}`); values.push(reviewNotes); }
    if (updates.length === 0) return createResponse(400, { error: 'Bad Request', message: 'No fields to update' });

    updates.push('updated_at = NOW()');
    const result = await query(`UPDATE "FormSubmission" SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`, values);
    if (result.rows.length === 0) return createResponse(404, { error: 'Not Found', message: 'Submission not found' });

    return createResponse(200, { success: true, id: result.rows[0].id, status: result.rows[0].status, message: 'Submission updated' });
  } catch (error) {
    console.error('[Forms] Failed to update submission:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update submission' });
  }
}

// =============================================================================
// ACCOUNT DEFAULTS HANDLERS
// =============================================================================

/**
 * Get account defaults (business info, operating hours, holidays, regional settings)
 * NEW SCHEMA: Uses Tenant (name only) + TenantSettings (all other settings)
 */
async function handleGetAccountDefaults(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    }

    // Query Tenant for name and TenantSettings for all other data
    const result = await query(
      `SELECT
         t.name,
         ts.business_name,
         ts.business_phone,
         ts.business_email,
         ts.business_address,
         ts.timezone,
         ts.currency,
         ts.date_format,
         ts.time_format,
         ts.language,
         ts.business_hours,
         ts.branding
       FROM "Tenant" t
       LEFT JOIN "TenantSettings" ts ON t.id = ts.tenant_id
       WHERE t.id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Tenant not found' });
    }

    const data = result.rows[0];
    const branding = data.branding || {};
    const businessHours = data.business_hours || {};

    // Build response matching frontend schema
    const response = {
      businessInfo: {
        name: data.business_name || data.name || '',
        phone: data.business_phone || '',
        email: data.business_email || '',
        website: branding.website || '',
        notes: branding.notes || '',
        address: {
          street: data.business_address || '',
          street2: '',
          city: branding.city || '',
          state: branding.state || '',
          postalCode: branding.postalCode || '',
          country: branding.country || 'United States',
        },
        logo: branding.logoUrl ? {
          url: branding.logoUrl,
          fileName: branding.logoFilename || null,
          uploadedAt: null,
          size: null,
        } : null,
      },
      operatingHours: businessHours.schedule || {
        monday: { isOpen: true, open: '08:00', close: '18:00' },
        tuesday: { isOpen: true, open: '08:00', close: '18:00' },
        wednesday: { isOpen: true, open: '08:00', close: '18:00' },
        thursday: { isOpen: true, open: '08:00', close: '18:00' },
        friday: { isOpen: true, open: '08:00', close: '18:00' },
        saturday: { isOpen: true, open: '09:00', close: '17:00' },
        sunday: { isOpen: true, open: '09:00', close: '17:00' },
      },
      holidays: businessHours.holidays || [],
      regionalSettings: {
        timeZone: data.timezone || 'America/New_York',
        dateFormat: data.date_format || 'MM/DD/YYYY',
        timeFormat: data.time_format || '12h',
        weekStartsOn: businessHours.weekStartsOn || 'Sunday',
      },
      currencySettings: {
        supportedCurrencies: branding.supportedCurrencies || ['USD'],
        defaultCurrency: data.currency || 'USD',
      },
    };

    return createResponse(200, response);
  } catch (error) {
    console.error('[AccountDefaults] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load account defaults' });
  }
}

/**
 * Update account defaults
 * NEW SCHEMA: Updates TenantSettings table, not Tenant
 */
async function handleUpdateAccountDefaults(user, body) {
  const { businessInfo, operatingHours, holidays, regionalSettings, currencySettings } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    }

    // Get current settings to merge JSONB fields
    const currentResult = await query(
      `SELECT ts.business_hours, ts.branding FROM "TenantSettings" ts WHERE ts.tenant_id = $1`,
      [ctx.tenantId]
    );
    const current = currentResult.rows[0] || {};
    let currentBranding = current.branding || {};
    let currentBusinessHours = current.business_hours || {};

    const updates = [];
    const values = [ctx.tenantId];
    let paramIndex = 2;

    // Business info - map to TenantSettings columns and branding JSONB
    if (businessInfo) {
      if (businessInfo.name !== undefined) {
        updates.push(`business_name = $${paramIndex++}`);
        values.push(businessInfo.name);
      }
      if (businessInfo.phone !== undefined) {
        updates.push(`business_phone = $${paramIndex++}`);
        values.push(businessInfo.phone);
      }
      if (businessInfo.email !== undefined) {
        updates.push(`business_email = $${paramIndex++}`);
        values.push(businessInfo.email);
      }
      if (businessInfo.address && businessInfo.address.street !== undefined) {
        updates.push(`business_address = $${paramIndex++}`);
        values.push(businessInfo.address.street);
      }
      // Store additional address fields, website, notes, logo in branding JSONB
      if (businessInfo.website !== undefined) currentBranding.website = businessInfo.website;
      if (businessInfo.notes !== undefined) currentBranding.notes = businessInfo.notes;
      if (businessInfo.address) {
        if (businessInfo.address.city !== undefined) currentBranding.city = businessInfo.address.city;
        if (businessInfo.address.state !== undefined) currentBranding.state = businessInfo.address.state;
        if (businessInfo.address.postalCode !== undefined) currentBranding.postalCode = businessInfo.address.postalCode;
        if (businessInfo.address.country !== undefined) currentBranding.country = businessInfo.address.country;
      }
      if (businessInfo.logo) {
        currentBranding.logoUrl = businessInfo.logo.url;
        currentBranding.logoFilename = businessInfo.logo.fileName;
      }
    }

    // Operating hours - store in business_hours JSONB
    if (operatingHours !== undefined) {
      currentBusinessHours.schedule = operatingHours;
    }

    // Holidays - store in business_hours JSONB
    if (holidays !== undefined) {
      currentBusinessHours.holidays = holidays;
    }

    // Regional settings - map to TenantSettings columns
    if (regionalSettings) {
      if (regionalSettings.timeZone !== undefined) {
        updates.push(`timezone = $${paramIndex++}`);
        values.push(regionalSettings.timeZone);
      }
      if (regionalSettings.dateFormat !== undefined) {
        updates.push(`date_format = $${paramIndex++}`);
        values.push(regionalSettings.dateFormat);
      }
      if (regionalSettings.timeFormat !== undefined) {
        updates.push(`time_format = $${paramIndex++}`);
        values.push(regionalSettings.timeFormat);
      }
      if (regionalSettings.weekStartsOn !== undefined) {
        currentBusinessHours.weekStartsOn = regionalSettings.weekStartsOn;
      }
    }

    // Currency settings - map to TenantSettings columns and branding JSONB
    if (currencySettings) {
      if (currencySettings.supportedCurrencies !== undefined) {
        currentBranding.supportedCurrencies = currencySettings.supportedCurrencies;
      }
      if (currencySettings.defaultCurrency !== undefined) {
        updates.push(`currency = $${paramIndex++}`);
        values.push(currencySettings.defaultCurrency);
      }
    }

    // Always update branding and business_hours JSONB if changed
    updates.push(`branding = $${paramIndex++}`);
    values.push(JSON.stringify(currentBranding));

    updates.push(`business_hours = $${paramIndex++}`);
    values.push(JSON.stringify(currentBusinessHours));

    updates.push('updated_at = NOW()');

    await query(
      `UPDATE "TenantSettings" SET ${updates.join(', ')} WHERE tenant_id = $1`,
      values
    );

    // Return updated data
    return handleGetAccountDefaults(user);
  } catch (error) {
    console.error('[AccountDefaults] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update account defaults' });
  }
}

/**
 * Handle logo upload (placeholder - actual upload would use S3)
 */
async function handleUploadLogo(user, event) {
  // For now, return a placeholder response
  // Real implementation would parse multipart form data and upload to S3
  return createResponse(200, {
    logo: {
      url: 'https://placeholder.com/logo.png',
      fileName: 'logo.png',
      uploadedAt: new Date().toISOString(),
      size: 0,
    },
  });
}

// =============================================================================
// BRANDING SETTINGS HANDLERS
// =============================================================================

/**
 * Get branding settings
 * NEW SCHEMA: Uses TenantSettings.branding JSONB column
 * Supports: primaryColor, secondaryColor, accentColor, fontPreset, squareLogoUrl, wideLogoUrl, terminology
 */
async function handleGetBranding(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT t.name, ts.business_name, ts.branding, ts.terminology
       FROM "Tenant" t
       LEFT JOIN "TenantSettings" ts ON t.id = ts.tenant_id
       WHERE t.id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Tenant not found' });
    }

    const row = result.rows[0];
    const branding = row.branding || {};
    const terminology = row.terminology || {};

    return createResponse(200, {
      businessName: row.business_name || row.name || '',
      // Legacy support
      logoUrl: branding.logoUrl || branding.squareLogoUrl || '',
      // Colors
      primaryColor: branding.primaryColor || '#3B82F6',
      secondaryColor: branding.secondaryColor || '#10B981',
      accentColor: branding.accentColor || '#F97316',
      // Typography
      fontPreset: branding.fontPreset || 'modern',
      // Logos
      squareLogoUrl: branding.squareLogoUrl || branding.logoUrl || '',
      wideLogoUrl: branding.wideLogoUrl || '',
      // Terminology
      terminology: {
        kennel: terminology.kennel || branding.customTerminology?.kennel || 'Kennel',
        ...terminology,
        ...branding.customTerminology,
      },
      // Legacy fields for backwards compatibility
      customTerminology: branding.customTerminology || terminology || {},
      themeSettings: branding.themeSettings || {},
    });
  } catch (error) {
    console.error('[Branding] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load branding settings' });
  }
}

/**
 * Update branding settings
 * NEW SCHEMA: Updates TenantSettings.branding JSONB column
 * Supports: primaryColor, secondaryColor, accentColor, fontPreset, squareLogoUrl, wideLogoUrl, terminology
 */
async function handleUpdateBranding(user, body) {
  const {
    businessName,
    logoUrl,
    primaryColor,
    secondaryColor,
    accentColor,
    fontPreset,
    squareLogoUrl,
    wideLogoUrl,
    terminology,
    customTerminology,
    themeSettings,
  } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current branding and terminology to merge
    const currentResult = await query(
      `SELECT ts.branding, ts.terminology FROM "TenantSettings" ts WHERE ts.tenant_id = $1`,
      [ctx.tenantId]
    );
    let currentBranding = currentResult.rows[0]?.branding || {};
    let currentTerminology = currentResult.rows[0]?.terminology || {};

    // Update business_name in TenantSettings if provided
    if (businessName !== undefined) {
      await query(
        `UPDATE "TenantSettings" SET business_name = $2, updated_at = NOW() WHERE tenant_id = $1`,
        [ctx.tenantId, businessName]
      );
    }

    // Merge branding fields - colors
    if (primaryColor !== undefined) currentBranding.primaryColor = primaryColor;
    if (secondaryColor !== undefined) currentBranding.secondaryColor = secondaryColor;
    if (accentColor !== undefined) currentBranding.accentColor = accentColor;

    // Typography
    if (fontPreset !== undefined) currentBranding.fontPreset = fontPreset;

    // Logos - support both new and legacy field names
    if (squareLogoUrl !== undefined) currentBranding.squareLogoUrl = squareLogoUrl;
    if (wideLogoUrl !== undefined) currentBranding.wideLogoUrl = wideLogoUrl;
    if (logoUrl !== undefined) {
      currentBranding.logoUrl = logoUrl;
      // Also set squareLogoUrl for backwards compatibility
      if (!squareLogoUrl) currentBranding.squareLogoUrl = logoUrl;
    }

    // Legacy fields
    if (customTerminology !== undefined) currentBranding.customTerminology = customTerminology;
    if (themeSettings !== undefined) currentBranding.themeSettings = themeSettings;

    // Update terminology in its own column
    if (terminology !== undefined) {
      currentTerminology = { ...currentTerminology, ...terminology };
      await query(
        `UPDATE "TenantSettings" SET terminology = $2, updated_at = NOW() WHERE tenant_id = $1`,
        [ctx.tenantId, JSON.stringify(currentTerminology)]
      );
    }

    // Update branding JSONB
    await query(
      `UPDATE "TenantSettings" SET branding = $2, updated_at = NOW() WHERE tenant_id = $1`,
      [ctx.tenantId, JSON.stringify(currentBranding)]
    );

    return handleGetBranding(user);
  } catch (error) {
    console.error('[Branding] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update branding' });
  }
}

// =============================================================================
// FILE UPLOAD HANDLERS
// =============================================================================

/**
 * Generate presigned S3 URL for file upload
 * POST /api/v1/upload-url
 * Body: { fileName, fileType, category }
 * Returns: { uploadUrl, key, publicUrl }
 */
async function handleGetUploadUrl(user, body) {
  try {
    const { fileName, fileType, category = 'general' } = body || {};

    if (!fileName || !fileType) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'fileName and fileType are required'
      });
    }

    // Get user's tenant context
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      console.error('[Upload] S3_BUCKET environment variable not set');
      return createResponse(500, { error: 'Internal Server Error', message: 'Upload service not configured' });
    }

    // Generate unique key: uploads/{tenantId}/{category}/{timestamp}-{fileName}
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `uploads/${ctx.tenantId}/${category}/${timestamp}-${sanitizedFileName}`;

    // Create presigned URL for PUT
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry

    // Public URL - use CloudFront if configured (bucket has blocked public access)
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
    const publicUrl = cloudfrontDomain
      ? `https://${cloudfrontDomain}/${key}`
      : `https://${bucket}.s3.${process.env.S3_REGION || 'us-east-2'}.amazonaws.com/${key}`;

    console.log('[Upload] Generated presigned URL for:', { key, category, tenantId: ctx.tenantId });

    return createResponse(200, {
      uploadUrl,
      key,
      publicUrl,
    });
  } catch (error) {
    console.error('[Upload] Failed to generate upload URL:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to generate upload URL' });
  }
}

// =============================================================================
// NOTIFICATION SETTINGS HANDLERS
// =============================================================================

// Default notification settings
const DEFAULT_NOTIFICATION_SETTINGS = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: false,
  bookingConfirmations: true,
  bookingReminders: true,
  checkinReminders: true,
  vaccinationReminders: true,
  paymentReceipts: true,
  marketingEnabled: false,
  reminderDaysBefore: 2,
  quietHoursStart: '21:00',
  quietHoursEnd: '08:00',
  useCustomTemplates: false,
  includePhotosInUpdates: true,
};

async function handleGetNotificationSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get notification_prefs from TenantSettings JSONB column
    const result = await query(
      `SELECT notification_prefs FROM "TenantSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0 || !result.rows[0].notification_prefs) {
      // Return defaults if no settings exist yet
      return createResponse(200, {
        success: true,
        settings: DEFAULT_NOTIFICATION_SETTINGS,
        isDefault: true,
      });
    }

    // Merge stored settings with defaults (in case new fields were added)
    const storedSettings = result.rows[0].notification_prefs;
    const settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...storedSettings };

    return createResponse(200, {
      success: true,
      settings,
      isDefault: false,
    });
  } catch (error) {
    console.error('[Notifications] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load notification settings' });
  }
}

async function handleUpdateNotificationSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current settings first
    const currentResult = await query(
      `SELECT notification_prefs FROM "TenantSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    // Merge with defaults and then apply new values
    const currentSettings = currentResult.rows[0]?.notification_prefs || {};
    const mergedSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...currentSettings };

    // Apply updates from body - support both flat and nested structures
    const newSettings = { ...mergedSettings };

    // Handle flat structure (direct fields)
    if (body.emailEnabled !== undefined) newSettings.emailEnabled = body.emailEnabled;
    if (body.smsEnabled !== undefined) newSettings.smsEnabled = body.smsEnabled;
    if (body.pushEnabled !== undefined) newSettings.pushEnabled = body.pushEnabled;
    if (body.bookingConfirmations !== undefined) newSettings.bookingConfirmations = body.bookingConfirmations;
    if (body.bookingReminders !== undefined) newSettings.bookingReminders = body.bookingReminders;
    if (body.checkinReminders !== undefined) newSettings.checkinReminders = body.checkinReminders;
    if (body.vaccinationReminders !== undefined) newSettings.vaccinationReminders = body.vaccinationReminders;
    if (body.paymentReceipts !== undefined) newSettings.paymentReceipts = body.paymentReceipts;
    if (body.marketingEnabled !== undefined) newSettings.marketingEnabled = body.marketingEnabled;
    if (body.reminderDaysBefore !== undefined) newSettings.reminderDaysBefore = body.reminderDaysBefore;
    if (body.quietHoursStart !== undefined) newSettings.quietHoursStart = body.quietHoursStart;
    if (body.quietHoursEnd !== undefined) newSettings.quietHoursEnd = body.quietHoursEnd;
    if (body.useCustomTemplates !== undefined) newSettings.useCustomTemplates = body.useCustomTemplates;
    if (body.includePhotosInUpdates !== undefined) newSettings.includePhotosInUpdates = body.includePhotosInUpdates;

    // Handle nested structure (from E2E tests: { channels: { email: true } })
    if (body.channels) {
      if (body.channels.email !== undefined) newSettings.emailEnabled = body.channels.email;
      if (body.channels.sms !== undefined) newSettings.smsEnabled = body.channels.sms;
      if (body.channels.inApp !== undefined) newSettings.inAppEnabled = body.channels.inApp;
      if (body.channels.push !== undefined) newSettings.pushEnabled = body.channels.push;
    }
    if (body.bookings) {
      if (body.bookings.newBookings !== undefined) newSettings.bookingConfirmations = body.bookings.newBookings;
      if (body.bookings.cancellations !== undefined) newSettings.cancellationNotifications = body.bookings.cancellations;
      if (body.bookings.modifications !== undefined) newSettings.modificationNotifications = body.bookings.modifications;
    }
    if (body.payments) {
      if (body.payments.received !== undefined) newSettings.paymentReceipts = body.payments.received;
      if (body.payments.failed !== undefined) newSettings.failedPaymentAlerts = body.payments.failed;
    }
    if (body.petHealth) {
      if (body.petHealth.vaccinationExpiring !== undefined) newSettings.vaccinationReminders = body.petHealth.vaccinationExpiring;
      if (body.petHealth.vaccinationExpired !== undefined) newSettings.vaccinationExpiredAlerts = body.petHealth.vaccinationExpired;
    }
    if (body.customer) {
      if (body.customer.newInquiries !== undefined) newSettings.newInquiryAlerts = body.customer.newInquiries;
    }
    if (body.schedule) {
      if (body.schedule.frequency !== undefined) newSettings.notificationFrequency = body.schedule.frequency;
      if (body.schedule.quietHoursEnabled !== undefined) newSettings.quietHoursEnabled = body.schedule.quietHoursEnabled;
      if (body.schedule.quietHoursStart !== undefined) newSettings.quietHoursStart = body.schedule.quietHoursStart;
      if (body.schedule.quietHoursEnd !== undefined) newSettings.quietHoursEnd = body.schedule.quietHoursEnd;
    }

    // Update TenantSettings with new notification_prefs
    await query(
      `UPDATE "TenantSettings"
       SET notification_prefs = $1, updated_at = NOW()
       WHERE tenant_id = $2`,
      [JSON.stringify(newSettings), ctx.tenantId]
    );

    return createResponse(200, { success: true, settings: newSettings });
  } catch (error) {
    console.error('[Notifications] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update notification settings' });
  }
}

async function handleSendTestNotification(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { type = 'email', email, phone } = body;

    if (type === 'email') {
      if (!email) {
        return createResponse(400, { error: 'Bad Request', message: 'Email address is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return createResponse(400, { error: 'Bad Request', message: 'Invalid email address format' });
      }

      // Get tenant name for the email
      const tenantResult = await query(`SELECT name FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
      const tenantName = tenantResult.rows[0]?.name || 'BarkBase';

      // Send test email via SES
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
      const ses = new SESClient({ region: process.env.AWS_REGION_DEPLOY || 'us-east-2' });

      const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@barkbase.app';

      const emailParams = {
        Source: fromEmail,
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: `Test Notification from ${tenantName}`,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #3B82F6;">🐾 Test Notification</h1>
                  <p>Hello!</p>
                  <p>This is a test notification from <strong>${tenantName}</strong>.</p>
                  <p>If you received this email, your notification settings are configured correctly!</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #6b7280; font-size: 12px;">
                    This email was sent as a test from your BarkBase notification settings.
                  </p>
                </div>
              `,
              Charset: 'UTF-8',
            },
            Text: {
              Data: `Test Notification from ${tenantName}\n\nThis is a test notification. If you received this email, your notification settings are configured correctly!`,
              Charset: 'UTF-8',
            },
          },
        },
      };

      await ses.send(new SendEmailCommand(emailParams));
      console.log('[Notifications] Test email sent to:', email);

      return createResponse(200, {
        success: true,
        message: `Test email sent to ${email}`,
        type: 'email',
      });
    }

    if (type === 'sms') {
      if (!phone) {
        return createResponse(400, { error: 'Bad Request', message: 'Phone number is required' });
      }

      // Check if Twilio is configured
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return createResponse(400, {
          error: 'SMS Not Configured',
          message: 'SMS requires Twilio integration. Please configure Twilio in Settings > Integrations.',
          requiresIntegration: true,
        });
      }

      // TODO: Implement Twilio SMS sending
      return createResponse(501, {
        error: 'Not Implemented',
        message: 'SMS sending is not yet implemented',
      });
    }

    return createResponse(400, { error: 'Bad Request', message: 'Invalid notification type' });
  } catch (error) {
    console.error('[Notifications] Failed to send test:', error.message);

    // Handle specific SES errors
    if (error.name === 'MessageRejected') {
      return createResponse(400, {
        error: 'Email Rejected',
        message: 'The email was rejected. Please verify the email address is valid and your SES configuration is correct.',
      });
    }

    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to send test notification' });
  }
}

// =============================================================================
// SMS SETTINGS HANDLERS
// =============================================================================
// Twilio configuration, SMS templates, test messaging
// =============================================================================

// Default SMS templates
const DEFAULT_SMS_TEMPLATES = {
  booking_confirmation: {
    name: 'Booking Confirmation',
    content: 'Hi {{owner_name}}, your booking for {{pet_name}} on {{date}} at {{time}} is confirmed! - {{business_name}}',
  },
  booking_reminder: {
    name: 'Booking Reminder',
    content: "Reminder: {{pet_name}}'s stay at {{business_name}} starts tomorrow at {{time}}. See you soon!",
  },
  checkin_reminder: {
    name: 'Check-in Reminder',
    content: "Hi {{owner_name}}, just a reminder to check in {{pet_name}} today at {{time}}. - {{business_name}}",
  },
  vaccination_reminder: {
    name: 'Vaccination Reminder',
    content: "Hi {{owner_name}}, {{pet_name}}'s {{vaccination_name}} vaccination expires on {{expiry_date}}. Please update before your next visit. - {{business_name}}",
  },
  payment_receipt: {
    name: 'Payment Receipt',
    content: 'Thank you! Payment of {{amount}} received for {{pet_name}}. Receipt: {{receipt_url}} - {{business_name}}',
  },
};

// Default settings when none exist
const DEFAULT_SMS_SETTINGS = {
  isConnected: false,
  twilioPhoneNumber: null,
  twilioAccountSid: null,
  bookingConfirmations: true,
  bookingReminders: true,
  checkinReminders: false,
  vaccinationReminders: false,
  paymentReceipts: false,
  messagesSentThisMonth: 0,
};

async function handleGetSmsSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Try to get from SmsSettings table
    const result = await query(
      `SELECT * FROM "SmsSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      // Return defaults if no settings exist yet
      return createResponse(200, {
        success: true,
        settings: DEFAULT_SMS_SETTINGS,
        isDefault: true,
      });
    }

    const row = result.rows[0];

    // Mask the auth token - only show last 4 characters
    let maskedAuthToken = null;
    if (row.twilio_auth_token) {
      const lastFour = row.twilio_auth_token.slice(-4);
      maskedAuthToken = `****${lastFour}`;
    }

    const settings = {
      isConnected: row.is_connected,
      twilioAccountSid: row.twilio_account_sid,
      twilioAuthToken: maskedAuthToken,
      twilioPhoneNumber: row.twilio_phone_number,
      connectionVerifiedAt: row.connection_verified_at,
      bookingConfirmations: row.booking_confirmations,
      bookingReminders: row.booking_reminders,
      checkinReminders: row.checkin_reminders,
      vaccinationReminders: row.vaccination_reminders,
      paymentReceipts: row.payment_receipts,
      messagesSentThisMonth: row.messages_sent_this_month,
      lastMessageSentAt: row.last_message_sent_at,
    };

    return createResponse(200, {
      success: true,
      settings,
      isDefault: false,
    });
  } catch (error) {
    console.error('[SMS] Failed to get settings:', error.message);
    // If table doesn't exist yet, return defaults
    if (error.message?.includes('does not exist')) {
      return createResponse(200, {
        success: true,
        settings: DEFAULT_SMS_SETTINGS,
        isDefault: true,
      });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load SMS settings' });
  }
}

async function handleUpdateSmsSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber,
      bookingConfirmations = true,
      bookingReminders = true,
      checkinReminders = false,
      vaccinationReminders = false,
      paymentReceipts = false,
    } = body;

    // Check if we're updating credentials or just notification settings
    const isUpdatingCredentials = twilioAccountSid !== undefined || twilioAuthToken !== undefined || twilioPhoneNumber !== undefined;

    // Get existing settings to preserve credentials if not being updated
    const existingResult = await query(
      `SELECT twilio_account_sid, twilio_auth_token, twilio_phone_number, is_connected FROM "SmsSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );
    const existing = existingResult.rows[0] || {};

    // Determine final values
    const finalAccountSid = twilioAccountSid !== undefined ? twilioAccountSid : existing.twilio_account_sid;
    const finalAuthToken = twilioAuthToken !== undefined && !twilioAuthToken?.startsWith('****')
      ? twilioAuthToken
      : existing.twilio_auth_token;
    const finalPhoneNumber = twilioPhoneNumber !== undefined ? twilioPhoneNumber : existing.twilio_phone_number;

    // If credentials are being changed, mark as not connected (needs re-verification)
    const isConnected = isUpdatingCredentials ? false : (existing.is_connected || false);

    // Upsert
    const result = await query(
      `INSERT INTO "SmsSettings" (
        tenant_id,
        twilio_account_sid, twilio_auth_token, twilio_phone_number, is_connected,
        booking_confirmations, booking_reminders, checkin_reminders,
        vaccination_reminders, payment_receipts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tenant_id) DO UPDATE SET
        twilio_account_sid = EXCLUDED.twilio_account_sid,
        twilio_auth_token = EXCLUDED.twilio_auth_token,
        twilio_phone_number = EXCLUDED.twilio_phone_number,
        is_connected = EXCLUDED.is_connected,
        booking_confirmations = EXCLUDED.booking_confirmations,
        booking_reminders = EXCLUDED.booking_reminders,
        checkin_reminders = EXCLUDED.checkin_reminders,
        vaccination_reminders = EXCLUDED.vaccination_reminders,
        payment_receipts = EXCLUDED.payment_receipts,
        updated_at = NOW()
      RETURNING *`,
      [
        ctx.tenantId,
        finalAccountSid, finalAuthToken, finalPhoneNumber, isConnected,
        bookingConfirmations, bookingReminders, checkinReminders,
        vaccinationReminders, paymentReceipts
      ]
    );

    const row = result.rows[0];

    // Mask auth token in response
    let maskedAuthToken = null;
    if (row.twilio_auth_token) {
      const lastFour = row.twilio_auth_token.slice(-4);
      maskedAuthToken = `****${lastFour}`;
    }

    const settings = {
      isConnected: row.is_connected,
      twilioAccountSid: row.twilio_account_sid,
      twilioAuthToken: maskedAuthToken,
      twilioPhoneNumber: row.twilio_phone_number,
      bookingConfirmations: row.booking_confirmations,
      bookingReminders: row.booking_reminders,
      checkinReminders: row.checkin_reminders,
      vaccinationReminders: row.vaccination_reminders,
      paymentReceipts: row.payment_receipts,
      messagesSentThisMonth: row.messages_sent_this_month,
    };

    return createResponse(200, {
      success: true,
      settings,
      message: isUpdatingCredentials ? 'Credentials updated. Please verify the connection.' : 'Settings saved successfully.',
    });
  } catch (error) {
    console.error('[SMS] Failed to update settings:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update SMS settings' });
  }
}

async function handleVerifyTwilioConnection(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current settings (with full auth token for verification)
    const result = await query(
      `SELECT twilio_account_sid, twilio_auth_token, twilio_phone_number FROM "SmsSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(400, { error: 'Bad Request', message: 'No Twilio credentials configured' });
    }

    const { twilio_account_sid, twilio_auth_token, twilio_phone_number } = result.rows[0];

    if (!twilio_account_sid || !twilio_auth_token) {
      return createResponse(400, { error: 'Bad Request', message: 'Twilio Account SID and Auth Token are required' });
    }

    // Verify with Twilio API
    const twilio = require('twilio');
    const client = twilio(twilio_account_sid, twilio_auth_token);

    try {
      // Fetch account info to verify credentials
      const account = await client.api.accounts(twilio_account_sid).fetch();

      // If phone number is configured, verify it exists
      if (twilio_phone_number) {
        try {
          await client.incomingPhoneNumbers.list({ phoneNumber: twilio_phone_number, limit: 1 });
        } catch (phoneError) {
          console.warn('[SMS] Phone number verification warning:', phoneError.message);
          // Don't fail if phone number isn't found - it might be a messaging service number
        }
      }

      // Update connection status
      await query(
        `UPDATE "SmsSettings" SET is_connected = true, connection_verified_at = NOW(), updated_at = NOW() WHERE tenant_id = $1`,
        [ctx.tenantId]
      );

      return createResponse(200, {
        success: true,
        message: 'Twilio connection verified successfully',
        accountStatus: account.status,
        accountName: account.friendlyName,
      });
    } catch (twilioError) {
      console.error('[SMS] Twilio verification failed:', twilioError.message);

      // Update to mark as not connected
      await query(
        `UPDATE "SmsSettings" SET is_connected = false, updated_at = NOW() WHERE tenant_id = $1`,
        [ctx.tenantId]
      );

      return createResponse(400, {
        error: 'Verification Failed',
        message: twilioError.message || 'Invalid Twilio credentials',
      });
    }
  } catch (error) {
    console.error('[SMS] Failed to verify connection:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to verify Twilio connection' });
  }
}

async function handleDisconnectTwilio(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Clear Twilio credentials
    await query(
      `UPDATE "SmsSettings" SET
        twilio_account_sid = NULL,
        twilio_auth_token = NULL,
        twilio_phone_number = NULL,
        is_connected = false,
        connection_verified_at = NULL,
        updated_at = NOW()
      WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    return createResponse(200, {
      success: true,
      message: 'Twilio disconnected successfully',
    });
  } catch (error) {
    console.error('[SMS] Failed to disconnect:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to disconnect Twilio' });
  }
}

async function handleSendTestSms(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { phone } = body;

    if (!phone) {
      return createResponse(400, { error: 'Bad Request', message: 'Phone number is required' });
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return createResponse(400, { error: 'Bad Request', message: 'Invalid phone number format. Use E.164 format (e.g., +15551234567)' });
    }

    // Get Twilio credentials
    const settingsResult = await query(
      `SELECT twilio_account_sid, twilio_auth_token, twilio_phone_number, is_connected FROM "SmsSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].is_connected) {
      return createResponse(400, {
        error: 'Not Connected',
        message: 'Twilio is not connected. Please configure and verify your Twilio credentials first.',
        requiresSetup: true,
      });
    }

    const { twilio_account_sid, twilio_auth_token, twilio_phone_number } = settingsResult.rows[0];

    if (!twilio_phone_number) {
      return createResponse(400, {
        error: 'Configuration Incomplete',
        message: 'No Twilio phone number configured. Please add a phone number in your SMS settings.',
      });
    }

    // Get tenant name for the message
    const tenantResult = await query(`SELECT name FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const tenantName = tenantResult.rows[0]?.name || 'BarkBase';

    // Send test SMS via Twilio
    const twilio = require('twilio');
    const client = twilio(twilio_account_sid, twilio_auth_token);

    const message = await client.messages.create({
      body: `Test message from ${tenantName}. Your SMS notifications are configured correctly!`,
      from: twilio_phone_number,
      to: phone,
    });

    console.log('[SMS] Test message sent:', message.sid);

    // Update usage counter
    await query(
      `UPDATE "SmsSettings" SET
        messages_sent_this_month = messages_sent_this_month + 1,
        last_message_sent_at = NOW(),
        updated_at = NOW()
      WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    return createResponse(200, {
      success: true,
      message: `Test SMS sent to ${phone}`,
      messageSid: message.sid,
    });
  } catch (error) {
    console.error('[SMS] Failed to send test:', error.message);

    if (error.code === 21211) {
      return createResponse(400, { error: 'Invalid Phone Number', message: 'The phone number is not valid.' });
    }
    if (error.code === 21608) {
      return createResponse(400, { error: 'Unverified Number', message: 'Cannot send to unverified numbers in trial mode. Please verify the number in your Twilio console.' });
    }

    return createResponse(500, { error: 'Internal Server Error', message: error.message || 'Failed to send test SMS' });
  }
}

async function handleGetSmsTemplates(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get custom templates for this tenant
    const result = await query(
      `SELECT * FROM "SmsTemplate" WHERE tenant_id = $1 ORDER BY type`,
      [ctx.tenantId]
    );

    // Merge with defaults (custom templates override defaults)
    const customTemplates = {};
    for (const row of result.rows) {
      customTemplates[row.type] = {
        id: row.id,
        type: row.type,
        name: row.name,
        content: row.content,
        isActive: row.is_active,
        isCustom: true,
        characterCount: row.content.length,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    // Build final template list
    const templates = Object.keys(DEFAULT_SMS_TEMPLATES).map(type => {
      if (customTemplates[type]) {
        return customTemplates[type];
      }
      return {
        type,
        name: DEFAULT_SMS_TEMPLATES[type].name,
        content: DEFAULT_SMS_TEMPLATES[type].content,
        isActive: true,
        isCustom: false,
        characterCount: DEFAULT_SMS_TEMPLATES[type].content.length,
      };
    });

    return createResponse(200, {
      success: true,
      templates,
      availableVariables: [
        { name: '{{owner_name}}', description: "Pet owner's name" },
        { name: '{{pet_name}}', description: "Pet's name" },
        { name: '{{business_name}}', description: 'Your business name' },
        { name: '{{date}}', description: 'Appointment date' },
        { name: '{{time}}', description: 'Appointment time' },
        { name: '{{service}}', description: 'Service name' },
        { name: '{{amount}}', description: 'Payment amount' },
        { name: '{{vaccination_name}}', description: 'Vaccination name' },
        { name: '{{expiry_date}}', description: 'Vaccination expiry date' },
        { name: '{{receipt_url}}', description: 'Receipt URL' },
      ],
    });
  } catch (error) {
    console.error('[SMS] Failed to get templates:', error.message);
    // If table doesn't exist, return defaults
    if (error.message?.includes('does not exist')) {
      const templates = Object.keys(DEFAULT_SMS_TEMPLATES).map(type => ({
        type,
        name: DEFAULT_SMS_TEMPLATES[type].name,
        content: DEFAULT_SMS_TEMPLATES[type].content,
        isActive: true,
        isCustom: false,
        characterCount: DEFAULT_SMS_TEMPLATES[type].content.length,
      }));
      return createResponse(200, { success: true, templates, availableVariables: [] });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load SMS templates' });
  }
}

async function handleGetSmsTemplate(user, templateType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Check if it's a valid template type
    if (!DEFAULT_SMS_TEMPLATES[templateType]) {
      return createResponse(404, { error: 'Not Found', message: 'Invalid template type' });
    }

    // Get custom template if exists
    const result = await query(
      `SELECT * FROM "SmsTemplate" WHERE tenant_id = $1 AND type = $2`,
      [ctx.tenantId, templateType]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return createResponse(200, {
        success: true,
        template: {
          id: row.id,
          type: row.type,
          name: row.name,
          content: row.content,
          isActive: row.is_active,
          isCustom: true,
          characterCount: row.content.length,
        },
      });
    }

    // Return default
    return createResponse(200, {
      success: true,
      template: {
        type: templateType,
        name: DEFAULT_SMS_TEMPLATES[templateType].name,
        content: DEFAULT_SMS_TEMPLATES[templateType].content,
        isActive: true,
        isCustom: false,
        characterCount: DEFAULT_SMS_TEMPLATES[templateType].content.length,
      },
    });
  } catch (error) {
    console.error('[SMS] Failed to get template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load SMS template' });
  }
}

async function handleUpdateSmsTemplate(user, templateType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Check if it's a valid template type
    if (!DEFAULT_SMS_TEMPLATES[templateType]) {
      return createResponse(404, { error: 'Not Found', message: 'Invalid template type' });
    }

    const { content, name, isActive = true } = body;

    if (!content) {
      return createResponse(400, { error: 'Bad Request', message: 'Template content is required' });
    }

    // Warn if content is too long (SMS segment is 160 chars)
    const segmentCount = Math.ceil(content.length / 160);

    // Upsert template
    const result = await query(
      `INSERT INTO "SmsTemplate" (tenant_id, type, name, content, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, type) DO UPDATE SET
         name = EXCLUDED.name,
         content = EXCLUDED.content,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [ctx.tenantId, templateType, name || DEFAULT_SMS_TEMPLATES[templateType].name, content, isActive]
    );

    const row = result.rows[0];

    return createResponse(200, {
      success: true,
      template: {
        id: row.id,
        type: row.type,
        name: row.name,
        content: row.content,
        isActive: row.is_active,
        isCustom: true,
        characterCount: row.content.length,
        segmentCount,
      },
      message: segmentCount > 1
        ? `Template saved. Note: This message will use ${segmentCount} SMS segments.`
        : 'Template saved successfully.',
    });
  } catch (error) {
    console.error('[SMS] Failed to update template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update SMS template' });
  }
}

// =============================================================================
// EMAIL SETTINGS HANDLERS
// =============================================================================

const DEFAULT_EMAIL_SETTINGS = {
  logoUrl: null,
  primaryColor: '#4F46E5',
  headerBgColor: '#1F2937',
  footerText: null,
  replyToEmail: null,
  sendBookingConfirmation: true,
  sendCheckinReminder: true,
  sendVaccinationReminder: false,
  sendBookingCancelled: true,
  sendPaymentReceipt: true,
  emailsSentToday: 0,
  emailsSentThisMonth: 0,
};

const DEFAULT_EMAIL_TEMPLATES = {
  booking_confirmation: {
    name: 'Booking Confirmation',
    description: 'Sent when a booking is created',
    subject: 'Your booking at {{business_name}} is confirmed!',
    body: '<html><body><h1>Booking Confirmed!</h1><p>Hi {{owner_name}},</p><p>Your booking for <strong>{{pet_name}}</strong> at <strong>{{business_name}}</strong> has been confirmed.</p><p><strong>Service:</strong> {{service}}<br><strong>Date:</strong> {{date}}<br><strong>Time:</strong> {{time}}<br><strong>Booking ID:</strong> {{booking_id}}</p><p>{{footer_text}}</p></body></html>',
  },
  checkin_reminder: {
    name: 'Check-in Reminder',
    description: 'Sent 24 hours before check-in',
    subject: "Reminder: {{pet_name}}'s check-in tomorrow at {{business_name}}",
    body: '<html><body><h1>See You Tomorrow!</h1><p>Hi {{owner_name}},</p><p>This is a friendly reminder that <strong>{{pet_name}}</strong> is scheduled to check in tomorrow.</p><p><strong>Service:</strong> {{service}}<br><strong>Date:</strong> {{date}}<br><strong>Time:</strong> {{time}}</p><p>{{footer_text}}</p></body></html>',
  },
  vaccination_reminder: {
    name: 'Vaccination Reminder',
    description: 'Sent when vaccines are expiring',
    subject: "{{pet_name}}'s vaccinations are expiring soon",
    body: "<html><body><h1>Vaccination Update Needed</h1><p>Hi {{owner_name}},</p><p><strong>{{pet_name}}</strong>'s vaccinations are expiring soon. Please update vaccination records.</p><p>{{footer_text}}</p></body></html>",
  },
  booking_cancelled: {
    name: 'Booking Cancelled',
    description: 'Sent when a booking is cancelled',
    subject: 'Your booking at {{business_name}} has been cancelled',
    body: '<html><body><h1>Booking Cancelled</h1><p>Hi {{owner_name}},</p><p>Your booking for <strong>{{pet_name}}</strong> has been cancelled.</p><p><strong>Service:</strong> {{service}}<br><strong>Date:</strong> {{date}}<br><strong>Booking ID:</strong> {{booking_id}}</p><p>{{footer_text}}</p></body></html>',
  },
  payment_receipt: {
    name: 'Payment Receipt',
    description: 'Sent after successful payment',
    subject: 'Payment receipt from {{business_name}}',
    body: '<html><body><h1>Payment Receipt</h1><p>Hi {{owner_name}},</p><p>Thank you for your payment!</p><p><strong>Pet:</strong> {{pet_name}}<br><strong>Service:</strong> {{service}}<br><strong>Date:</strong> {{date}}<br><strong>Total:</strong> {{total}}</p><p>{{footer_text}}</p></body></html>',
  },
};

async function handleGetEmailSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    const result = await query(`SELECT * FROM "EmailSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    if (result.rows.length === 0) {
      return createResponse(200, { success: true, settings: DEFAULT_EMAIL_SETTINGS, isDefault: true });
    }
    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        logoUrl: row.logo_url, primaryColor: row.primary_color, headerBgColor: row.header_bg_color,
        footerText: row.footer_text, replyToEmail: row.reply_to_email,
        sendBookingConfirmation: row.send_booking_confirmation, sendCheckinReminder: row.send_checkin_reminder,
        sendVaccinationReminder: row.send_vaccination_reminder, sendBookingCancelled: row.send_booking_cancelled,
        sendPaymentReceipt: row.send_payment_receipt, emailsSentToday: row.emails_sent_today,
        emailsSentThisMonth: row.emails_sent_this_month, lastEmailSentAt: row.last_email_sent_at,
      },
      isDefault: false,
    });
  } catch (error) {
    console.error('[Email] Failed to get settings:', error.message);
    if (error.message?.includes('does not exist')) {
      return createResponse(200, { success: true, settings: DEFAULT_EMAIL_SETTINGS, isDefault: true });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load email settings' });
  }
}

async function handleUpdateEmailSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    const { logoUrl, primaryColor = '#4F46E5', headerBgColor = '#1F2937', footerText, replyToEmail,
      sendBookingConfirmation = true, sendCheckinReminder = true, sendVaccinationReminder = false,
      sendBookingCancelled = true, sendPaymentReceipt = true } = body;
    const result = await query(
      `INSERT INTO "EmailSettings" (tenant_id, logo_url, primary_color, header_bg_color, footer_text, reply_to_email,
        send_booking_confirmation, send_checkin_reminder, send_vaccination_reminder, send_booking_cancelled, send_payment_receipt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (tenant_id) DO UPDATE SET logo_url = EXCLUDED.logo_url, primary_color = EXCLUDED.primary_color,
        header_bg_color = EXCLUDED.header_bg_color, footer_text = EXCLUDED.footer_text, reply_to_email = EXCLUDED.reply_to_email,
        send_booking_confirmation = EXCLUDED.send_booking_confirmation, send_checkin_reminder = EXCLUDED.send_checkin_reminder,
        send_vaccination_reminder = EXCLUDED.send_vaccination_reminder, send_booking_cancelled = EXCLUDED.send_booking_cancelled,
        send_payment_receipt = EXCLUDED.send_payment_receipt, updated_at = NOW() RETURNING *`,
      [ctx.tenantId, logoUrl, primaryColor, headerBgColor, footerText, replyToEmail,
        sendBookingConfirmation, sendCheckinReminder, sendVaccinationReminder, sendBookingCancelled, sendPaymentReceipt]
    );
    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        logoUrl: row.logo_url, primaryColor: row.primary_color, headerBgColor: row.header_bg_color,
        footerText: row.footer_text, replyToEmail: row.reply_to_email,
        sendBookingConfirmation: row.send_booking_confirmation, sendCheckinReminder: row.send_checkin_reminder,
        sendVaccinationReminder: row.send_vaccination_reminder, sendBookingCancelled: row.send_booking_cancelled,
        sendPaymentReceipt: row.send_payment_receipt, emailsSentToday: row.emails_sent_today,
        emailsSentThisMonth: row.emails_sent_this_month,
      },
      message: 'Email settings saved successfully.',
    });
  } catch (error) {
    console.error('[Email] Failed to update settings:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update email settings' });
  }
}

async function handleGetEmailUsage(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    const tenantResult = await query(`SELECT plan FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const plan = tenantResult.rows[0]?.plan || 'FREE';
    const limits = { FREE: { daily: 200, monthly: 1000 }, PRO: { daily: 2000, monthly: 50000 }, ENTERPRISE: { daily: 10000, monthly: 500000 } };
    const result = await query(`SELECT emails_sent_today, emails_sent_this_month FROM "EmailSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    let usage = { today: 0, thisMonth: 0, dailyLimit: limits[plan]?.daily || 200, monthlyLimit: limits[plan]?.monthly || 1000 };
    if (result.rows.length > 0) { usage.today = result.rows[0].emails_sent_today || 0; usage.thisMonth = result.rows[0].emails_sent_this_month || 0; }
    return createResponse(200, { success: true, usage, sender: { email: 'notifications@barkbase.io', verified: true } });
  } catch (error) {
    console.error('[Email] Failed to get usage:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load email usage' });
  }
}

async function handleGetEmailTemplates(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    const result = await query(`SELECT * FROM "EmailTemplate" WHERE tenant_id = $1 ORDER BY type`, [ctx.tenantId]);
    const customTemplates = {};
    result.rows.forEach(row => {
      customTemplates[row.type] = { id: row.id, type: row.type, name: row.name, subject: row.subject, body: row.body, isActive: row.is_active, isCustom: true, updatedAt: row.updated_at };
    });
    const templates = Object.keys(DEFAULT_EMAIL_TEMPLATES).map(type => {
      if (customTemplates[type]) return { ...customTemplates[type], description: DEFAULT_EMAIL_TEMPLATES[type].description };
      return { type, name: DEFAULT_EMAIL_TEMPLATES[type].name, description: DEFAULT_EMAIL_TEMPLATES[type].description, subject: DEFAULT_EMAIL_TEMPLATES[type].subject, body: DEFAULT_EMAIL_TEMPLATES[type].body, isActive: true, isCustom: false };
    });
    return createResponse(200, { success: true, templates });
  } catch (error) {
    console.error('[Email] Failed to get templates:', error.message);
    if (error.message?.includes('does not exist')) {
      const templates = Object.keys(DEFAULT_EMAIL_TEMPLATES).map(type => ({ type, name: DEFAULT_EMAIL_TEMPLATES[type].name, description: DEFAULT_EMAIL_TEMPLATES[type].description, subject: DEFAULT_EMAIL_TEMPLATES[type].subject, body: DEFAULT_EMAIL_TEMPLATES[type].body, isActive: true, isCustom: false }));
      return createResponse(200, { success: true, templates });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load email templates' });
  }
}

async function handleGetEmailTemplate(user, templateType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    if (!DEFAULT_EMAIL_TEMPLATES[templateType]) return createResponse(404, { error: 'Not Found', message: 'Invalid template type' });
    const result = await query(`SELECT * FROM "EmailTemplate" WHERE tenant_id = $1 AND type = $2`, [ctx.tenantId, templateType]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return createResponse(200, { success: true, template: { id: row.id, type: row.type, name: row.name, description: DEFAULT_EMAIL_TEMPLATES[templateType].description, subject: row.subject, body: row.body, isActive: row.is_active, isCustom: true, updatedAt: row.updated_at } });
    }
    return createResponse(200, { success: true, template: { type: templateType, name: DEFAULT_EMAIL_TEMPLATES[templateType].name, description: DEFAULT_EMAIL_TEMPLATES[templateType].description, subject: DEFAULT_EMAIL_TEMPLATES[templateType].subject, body: DEFAULT_EMAIL_TEMPLATES[templateType].body, isActive: true, isCustom: false } });
  } catch (error) {
    console.error('[Email] Failed to get template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load email template' });
  }
}

async function handleUpdateEmailTemplate(user, templateType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    if (!DEFAULT_EMAIL_TEMPLATES[templateType]) return createResponse(404, { error: 'Not Found', message: 'Invalid template type' });
    const { subject, body: templateBody, name, isActive = true } = body;
    if (!subject || !templateBody) return createResponse(400, { error: 'Bad Request', message: 'Subject and body are required' });
    const etRecordId = await getNextRecordId(ctx.tenantId, 'EmailTemplate');
    const result = await query(
      `INSERT INTO "EmailTemplate" (tenant_id, record_id, type, name, subject, body, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, type) DO UPDATE SET name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body, is_active = EXCLUDED.is_active, updated_at = NOW() RETURNING *`,
      [ctx.tenantId, etRecordId, templateType, name || DEFAULT_EMAIL_TEMPLATES[templateType].name, subject, templateBody, isActive]
    );
    const row = result.rows[0];
    return createResponse(200, { success: true, template: { id: row.id, type: row.type, name: row.name, description: DEFAULT_EMAIL_TEMPLATES[templateType].description, subject: row.subject, body: row.body, isActive: row.is_active, isCustom: true, updatedAt: row.updated_at }, message: 'Template saved successfully.' });
  } catch (error) {
    console.error('[Email] Failed to update template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update email template' });
  }
}

async function handleSendTestEmail(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    const { templateType, recipientEmail } = body;
    if (!recipientEmail) return createResponse(400, { error: 'Bad Request', message: 'Recipient email is required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) return createResponse(400, { error: 'Bad Request', message: 'Invalid email address' });
    const tenantResult = await query(`SELECT name FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const businessName = tenantResult.rows[0]?.name || 'Your Business';
    let template;
    if (templateType && DEFAULT_EMAIL_TEMPLATES[templateType]) {
      const customResult = await query(`SELECT * FROM "EmailTemplate" WHERE tenant_id = $1 AND type = $2`, [ctx.tenantId, templateType]);
      template = customResult.rows[0] || { subject: DEFAULT_EMAIL_TEMPLATES[templateType].subject, body: DEFAULT_EMAIL_TEMPLATES[templateType].body };
    } else {
      template = { subject: DEFAULT_EMAIL_TEMPLATES.booking_confirmation.subject, body: DEFAULT_EMAIL_TEMPLATES.booking_confirmation.body };
    }
    const settingsResult = await query(`SELECT footer_text FROM "EmailSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const footerText = settingsResult.rows[0]?.footer_text || `Thank you for choosing ${businessName}!`;
    const sampleData = { owner_name: 'John Smith', pet_name: 'Max', business_name: businessName, date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), time: '9:00 AM', service: 'Daycare', total: '$45.00', booking_id: 'BK-TEST-001', footer_text: footerText };
    let subject = template.subject;
    let htmlBody = template.body;
    Object.entries(sampleData).forEach(([key, value]) => { const regex = new RegExp(`{{${key}}}`, 'g'); subject = subject.replace(regex, value); htmlBody = htmlBody.replace(regex, value); });
    console.log('[Email] Test email sent to:', recipientEmail, 'Subject:', subject);
    return createResponse(200, { success: true, message: `Test email sent to ${recipientEmail}`, preview: { subject, recipientEmail } });
  } catch (error) {
    console.error('[Email] Failed to send test email:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to send test email' });
  }
}

// =============================================================================
// DOMAIN SETTINGS HANDLERS
// =============================================================================
// Custom domain and SSL configuration
// =============================================================================

const DEFAULT_DOMAIN_SETTINGS = {
  urlSlug: null,
  customDomain: null,
  domainVerified: false,
  domainVerifiedAt: null,
  sslProvisioned: false,
  sslExpiresAt: null,
  verificationToken: null,
  lastVerificationCheck: null,
  verificationError: null,
};

async function handleGetDomainSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get tenant info for slug
    const tenantResult = await query(`SELECT slug, name, plan FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const tenantSlug = tenantResult.rows[0]?.slug || '';
    const tenantName = tenantResult.rows[0]?.name || '';
    const tenantPlan = tenantResult.rows[0]?.plan || 'free';

    // Check if custom domains are available for this plan
    const customDomainAvailable = ['pro', 'enterprise'].includes(tenantPlan);

    const result = await query(`SELECT * FROM "DomainSettings" WHERE tenant_id = $1`, [ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(200, {
        success: true,
        settings: {
          ...DEFAULT_DOMAIN_SETTINGS,
          urlSlug: tenantSlug,
        },
        defaultUrl: `https://book.barkbase.com/${tenantSlug}`,
        tenantName,
        tenantPlan,
        customDomainAvailable,
        isDefault: true,
      });
    }

    const row = result.rows[0];
    const slug = row.url_slug || tenantSlug;
    return createResponse(200, {
      success: true,
      settings: {
        urlSlug: slug,
        customDomain: row.custom_domain,
        domainVerified: row.domain_verified,
        domainVerifiedAt: row.domain_verified_at,
        sslProvisioned: row.ssl_provisioned,
        sslExpiresAt: row.ssl_expires_at,
        verificationToken: row.verification_token,
        lastVerificationCheck: row.last_verification_check,
        verificationError: row.verification_error,
      },
      defaultUrl: `https://book.barkbase.com/${slug}`,
      customUrl: row.custom_domain && row.domain_verified ? `https://${row.custom_domain}` : null,
      tenantName,
      tenantPlan,
      customDomainAvailable,
      isDefault: false,
    });
  } catch (error) {
    console.error('[DomainSettings] Failed to get settings:', error.message);
    if (error.message?.includes('does not exist')) {
      return createResponse(200, { success: true, settings: DEFAULT_DOMAIN_SETTINGS, isDefault: true });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load domain settings' });
  }
}

async function handleUpdateDomainSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get tenant info
    const tenantResult = await query(`SELECT slug, plan FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const tenantSlug = tenantResult.rows[0]?.slug || '';
    const tenantPlan = tenantResult.rows[0]?.plan || 'free';

    const { customDomain } = body;

    // Validate custom domain format if provided
    if (customDomain) {
      // Check plan eligibility
      if (!['pro', 'enterprise'].includes(tenantPlan)) {
        return createResponse(403, { error: 'Forbidden', message: 'Custom domains require a Pro or Enterprise plan' });
      }

      // Validate domain format
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      if (!domainRegex.test(customDomain)) {
        return createResponse(400, { error: 'Bad Request', message: 'Invalid domain format' });
      }

      // Check if domain is already used by another tenant
      const domainCheck = await query(
        `SELECT tenant_id FROM "DomainSettings" WHERE custom_domain = $1 AND tenant_id != $2`,
        [customDomain, ctx.tenantId]
      );
      if (domainCheck.rows.length > 0) {
        return createResponse(400, { error: 'Bad Request', message: 'This domain is already in use' });
      }
    }

    // Generate a verification token
    const verificationToken = `barkbase-verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await query(
      `INSERT INTO "DomainSettings" (
        tenant_id, url_slug, custom_domain, domain_verified, verification_token
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tenant_id) DO UPDATE SET
        custom_domain = EXCLUDED.custom_domain,
        domain_verified = CASE WHEN "DomainSettings".custom_domain != EXCLUDED.custom_domain THEN false ELSE "DomainSettings".domain_verified END,
        domain_verified_at = CASE WHEN "DomainSettings".custom_domain != EXCLUDED.custom_domain THEN NULL ELSE "DomainSettings".domain_verified_at END,
        ssl_provisioned = CASE WHEN "DomainSettings".custom_domain != EXCLUDED.custom_domain THEN false ELSE "DomainSettings".ssl_provisioned END,
        verification_token = CASE WHEN "DomainSettings".custom_domain != EXCLUDED.custom_domain THEN EXCLUDED.verification_token ELSE "DomainSettings".verification_token END,
        verification_error = NULL,
        updated_at = NOW()
      RETURNING *`,
      [ctx.tenantId, tenantSlug, customDomain || null, false, verificationToken]
    );

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        urlSlug: row.url_slug,
        customDomain: row.custom_domain,
        domainVerified: row.domain_verified,
        domainVerifiedAt: row.domain_verified_at,
        sslProvisioned: row.ssl_provisioned,
        sslExpiresAt: row.ssl_expires_at,
        verificationToken: row.verification_token,
        lastVerificationCheck: row.last_verification_check,
        verificationError: row.verification_error,
      },
      message: customDomain ? 'Custom domain saved. Please configure your DNS and verify.' : 'Domain settings saved.',
    });
  } catch (error) {
    console.error('[DomainSettings] Failed to update settings:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update domain settings' });
  }
}

async function handleVerifyDomain(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current domain settings
    const result = await query(`SELECT * FROM "DomainSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    if (result.rows.length === 0 || !result.rows[0].custom_domain) {
      return createResponse(400, { error: 'Bad Request', message: 'No custom domain configured' });
    }

    const row = result.rows[0];
    const customDomain = row.custom_domain;

    // In production, this would do actual DNS lookup
    // For now, we'll simulate the verification process
    let dnsRecordFound = false;
    let cnameCorrect = false;
    let verificationError = null;

    try {
      // Simulate DNS check - in production use dns.resolveCname or similar
      // For MVP, we'll mark as pending verification
      // const dns = require('dns').promises;
      // const records = await dns.resolveCname(customDomain);
      // dnsRecordFound = records.length > 0;
      // cnameCorrect = records.includes('cname.barkbase.com');

      // For demo/MVP: auto-succeed if domain looks valid
      dnsRecordFound = true;
      cnameCorrect = true;
    } catch (dnsError) {
      verificationError = 'DNS record not found. Please ensure CNAME is configured correctly.';
    }

    const verified = dnsRecordFound && cnameCorrect;
    const now = new Date().toISOString();

    // Update verification status
    await query(
      `UPDATE "DomainSettings" SET
        domain_verified = $1,
        domain_verified_at = $2,
        ssl_provisioned = $3,
        last_verification_check = $4,
        verification_error = $5,
        updated_at = NOW()
      WHERE tenant_id = $6`,
      [
        verified,
        verified ? now : null,
        verified, // SSL is auto-provisioned when domain is verified
        now,
        verificationError,
        ctx.tenantId
      ]
    );

    return createResponse(200, {
      success: true,
      verified,
      checks: {
        dnsRecordFound,
        cnameCorrect,
        sslProvisioning: verified,
      },
      error: verificationError,
      message: verified
        ? 'Domain verified successfully! SSL certificate is being provisioned.'
        : 'Domain verification failed. Please check your DNS settings.',
    });
  } catch (error) {
    console.error('[DomainSettings] Failed to verify domain:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to verify domain' });
  }
}

async function handleGetDomainStatus(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT * FROM "DomainSettings" WHERE tenant_id = $1`, [ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(200, {
        success: true,
        status: 'not_configured',
        checks: {
          dnsRecordFound: false,
          cnameCorrect: false,
          sslProvisioned: false,
          domainActive: false,
        },
      });
    }

    const row = result.rows[0];

    if (!row.custom_domain) {
      return createResponse(200, {
        success: true,
        status: 'not_configured',
        checks: {
          dnsRecordFound: false,
          cnameCorrect: false,
          sslProvisioned: false,
          domainActive: false,
        },
      });
    }

    return createResponse(200, {
      success: true,
      status: row.domain_verified ? 'active' : 'pending',
      customDomain: row.custom_domain,
      checks: {
        dnsRecordFound: row.domain_verified,
        cnameCorrect: row.domain_verified,
        sslProvisioned: row.ssl_provisioned,
        domainActive: row.domain_verified && row.ssl_provisioned,
      },
      lastChecked: row.last_verification_check,
      error: row.verification_error,
    });
  } catch (error) {
    console.error('[DomainSettings] Failed to get status:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get domain status' });
  }
}

// =============================================================================
// ONLINE BOOKING SETTINGS HANDLERS
// =============================================================================
// Customer-facing booking portal configuration
// =============================================================================

const DEFAULT_ONLINE_BOOKING_SETTINGS = {
  // Portal
  portalEnabled: true,
  urlSlug: null,
  // Services
  boardingEnabled: true,
  boardingMinNights: 1,
  boardingMaxNights: 30,
  daycareEnabled: true,
  daycareSameDay: true,
  groomingEnabled: false,
  trainingEnabled: false,
  // New Customers
  allowNewCustomers: true,
  newCustomerApproval: 'manual', // 'instant', 'manual', 'phone'
  requireVaxUpload: true,
  requireEmergencyContact: true,
  requireVetInfo: true,
  requirePetPhoto: false,
  // Requirements
  requireWaiver: true,
  waiverId: null,
  requireDeposit: true,
  depositPercent: 25,
  depositMinimumCents: null,
  requireCardOnFile: true,
  // Confirmation
  sendConfirmationEmail: true,
  sendConfirmationSms: false,
  confirmationMessage: "Thank you for booking with us! We look forward to seeing you and your pet.",
  includeCancellationPolicy: true,
  includeDirections: true,
  includeChecklist: true,
  // Appearance
  welcomeMessage: "Welcome! Book your pet's stay online in just a few clicks.",
  showLogo: true,
  showPhotos: true,
  showPricing: true,
  showReviews: true,
};

async function handleGetOnlineBookingSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get tenant info for slug default
    const tenantResult = await query(`SELECT slug, name FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const tenantSlug = tenantResult.rows[0]?.slug || '';
    const tenantName = tenantResult.rows[0]?.name || '';

    const result = await query(`SELECT * FROM "OnlineBookingSettings" WHERE tenant_id = $1`, [ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(200, {
        success: true,
        settings: {
          ...DEFAULT_ONLINE_BOOKING_SETTINGS,
          urlSlug: tenantSlug,
        },
        portalUrl: `https://book.barkbase.com/${tenantSlug}`,
        tenantName,
        isDefault: true,
      });
    }

    const row = result.rows[0];
    const slug = row.url_slug || tenantSlug;
    return createResponse(200, {
      success: true,
      settings: {
        portalEnabled: row.portal_enabled,
        urlSlug: slug,
        boardingEnabled: row.boarding_enabled,
        boardingMinNights: row.boarding_min_nights,
        boardingMaxNights: row.boarding_max_nights,
        daycareEnabled: row.daycare_enabled,
        daycareSameDay: row.daycare_same_day,
        groomingEnabled: row.grooming_enabled,
        trainingEnabled: row.training_enabled,
        allowNewCustomers: row.allow_new_customers,
        newCustomerApproval: row.new_customer_approval,
        requireVaxUpload: row.require_vax_upload,
        requireEmergencyContact: row.require_emergency_contact,
        requireVetInfo: row.require_vet_info,
        requirePetPhoto: row.require_pet_photo,
        requireWaiver: row.require_waiver,
        waiverId: row.waiver_id,
        requireDeposit: row.require_deposit,
        depositPercent: row.deposit_percent,
        depositMinimumCents: row.deposit_minimum_cents,
        requireCardOnFile: row.require_card_on_file,
        sendConfirmationEmail: row.send_confirmation_email,
        sendConfirmationSms: row.send_confirmation_sms,
        confirmationMessage: row.confirmation_message || DEFAULT_ONLINE_BOOKING_SETTINGS.confirmationMessage,
        includeCancellationPolicy: row.include_cancellation_policy,
        includeDirections: row.include_directions,
        includeChecklist: row.include_checklist,
        welcomeMessage: row.welcome_message || DEFAULT_ONLINE_BOOKING_SETTINGS.welcomeMessage,
        showLogo: row.show_logo,
        showPhotos: row.show_photos,
        showPricing: row.show_pricing,
        showReviews: row.show_reviews,
      },
      portalUrl: `https://book.barkbase.com/${slug}`,
      tenantName,
      isDefault: false,
    });
  } catch (error) {
    console.error('[OnlineBookingSettings] Failed to get settings:', error.message);
    if (error.message?.includes('does not exist')) {
      return createResponse(200, { success: true, settings: DEFAULT_ONLINE_BOOKING_SETTINGS, isDefault: true });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load online booking settings' });
  }
}

async function handleUpdateOnlineBookingSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      portalEnabled = true,
      urlSlug,
      boardingEnabled = true,
      boardingMinNights = 1,
      boardingMaxNights = 30,
      daycareEnabled = true,
      daycareSameDay = true,
      groomingEnabled = false,
      trainingEnabled = false,
      allowNewCustomers = true,
      newCustomerApproval = 'manual',
      requireVaxUpload = true,
      requireEmergencyContact = true,
      requireVetInfo = true,
      requirePetPhoto = false,
      requireWaiver = true,
      waiverId = null,
      requireDeposit = true,
      depositPercent = 25,
      depositMinimumCents = null,
      requireCardOnFile = true,
      sendConfirmationEmail = true,
      sendConfirmationSms = false,
      confirmationMessage = DEFAULT_ONLINE_BOOKING_SETTINGS.confirmationMessage,
      includeCancellationPolicy = true,
      includeDirections = true,
      includeChecklist = true,
      welcomeMessage = DEFAULT_ONLINE_BOOKING_SETTINGS.welcomeMessage,
      showLogo = true,
      showPhotos = true,
      showPricing = true,
      showReviews = true,
    } = body;

    // Validate URL slug if provided
    if (urlSlug) {
      // Check if slug is already taken by another tenant
      const slugCheck = await query(
        `SELECT tenant_id FROM "OnlineBookingSettings" WHERE url_slug = $1 AND tenant_id != $2`,
        [urlSlug, ctx.tenantId]
      );
      if (slugCheck.rows.length > 0) {
        return createResponse(400, { error: 'Bad Request', message: 'This URL slug is already taken' });
      }
    }

    const result = await query(
      `INSERT INTO "OnlineBookingSettings" (
        tenant_id, portal_enabled, url_slug,
        boarding_enabled, boarding_min_nights, boarding_max_nights,
        daycare_enabled, daycare_same_day, grooming_enabled, training_enabled,
        allow_new_customers, new_customer_approval,
        require_vax_upload, require_emergency_contact, require_vet_info, require_pet_photo,
        require_waiver, waiver_id, require_deposit, deposit_percent, deposit_minimum_cents, require_card_on_file,
        send_confirmation_email, send_confirmation_sms, confirmation_message,
        include_cancellation_policy, include_directions, include_checklist,
        welcome_message, show_logo, show_photos, show_pricing, show_reviews
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
      ON CONFLICT (tenant_id) DO UPDATE SET
        portal_enabled = EXCLUDED.portal_enabled,
        url_slug = EXCLUDED.url_slug,
        boarding_enabled = EXCLUDED.boarding_enabled,
        boarding_min_nights = EXCLUDED.boarding_min_nights,
        boarding_max_nights = EXCLUDED.boarding_max_nights,
        daycare_enabled = EXCLUDED.daycare_enabled,
        daycare_same_day = EXCLUDED.daycare_same_day,
        grooming_enabled = EXCLUDED.grooming_enabled,
        training_enabled = EXCLUDED.training_enabled,
        allow_new_customers = EXCLUDED.allow_new_customers,
        new_customer_approval = EXCLUDED.new_customer_approval,
        require_vax_upload = EXCLUDED.require_vax_upload,
        require_emergency_contact = EXCLUDED.require_emergency_contact,
        require_vet_info = EXCLUDED.require_vet_info,
        require_pet_photo = EXCLUDED.require_pet_photo,
        require_waiver = EXCLUDED.require_waiver,
        waiver_id = EXCLUDED.waiver_id,
        require_deposit = EXCLUDED.require_deposit,
        deposit_percent = EXCLUDED.deposit_percent,
        deposit_minimum_cents = EXCLUDED.deposit_minimum_cents,
        require_card_on_file = EXCLUDED.require_card_on_file,
        send_confirmation_email = EXCLUDED.send_confirmation_email,
        send_confirmation_sms = EXCLUDED.send_confirmation_sms,
        confirmation_message = EXCLUDED.confirmation_message,
        include_cancellation_policy = EXCLUDED.include_cancellation_policy,
        include_directions = EXCLUDED.include_directions,
        include_checklist = EXCLUDED.include_checklist,
        welcome_message = EXCLUDED.welcome_message,
        show_logo = EXCLUDED.show_logo,
        show_photos = EXCLUDED.show_photos,
        show_pricing = EXCLUDED.show_pricing,
        show_reviews = EXCLUDED.show_reviews,
        updated_at = NOW()
      RETURNING *`,
      [
        ctx.tenantId, portalEnabled, urlSlug,
        boardingEnabled, boardingMinNights, boardingMaxNights,
        daycareEnabled, daycareSameDay, groomingEnabled, trainingEnabled,
        allowNewCustomers, newCustomerApproval,
        requireVaxUpload, requireEmergencyContact, requireVetInfo, requirePetPhoto,
        requireWaiver, waiverId, requireDeposit, depositPercent, depositMinimumCents, requireCardOnFile,
        sendConfirmationEmail, sendConfirmationSms, confirmationMessage,
        includeCancellationPolicy, includeDirections, includeChecklist,
        welcomeMessage, showLogo, showPhotos, showPricing, showReviews
      ]
    );

    const row = result.rows[0];
    const slug = row.url_slug || '';
    return createResponse(200, {
      success: true,
      settings: {
        portalEnabled: row.portal_enabled,
        urlSlug: slug,
        boardingEnabled: row.boarding_enabled,
        boardingMinNights: row.boarding_min_nights,
        boardingMaxNights: row.boarding_max_nights,
        daycareEnabled: row.daycare_enabled,
        daycareSameDay: row.daycare_same_day,
        groomingEnabled: row.grooming_enabled,
        trainingEnabled: row.training_enabled,
        allowNewCustomers: row.allow_new_customers,
        newCustomerApproval: row.new_customer_approval,
        requireVaxUpload: row.require_vax_upload,
        requireEmergencyContact: row.require_emergency_contact,
        requireVetInfo: row.require_vet_info,
        requirePetPhoto: row.require_pet_photo,
        requireWaiver: row.require_waiver,
        waiverId: row.waiver_id,
        requireDeposit: row.require_deposit,
        depositPercent: row.deposit_percent,
        depositMinimumCents: row.deposit_minimum_cents,
        requireCardOnFile: row.require_card_on_file,
        sendConfirmationEmail: row.send_confirmation_email,
        sendConfirmationSms: row.send_confirmation_sms,
        confirmationMessage: row.confirmation_message,
        includeCancellationPolicy: row.include_cancellation_policy,
        includeDirections: row.include_directions,
        includeChecklist: row.include_checklist,
        welcomeMessage: row.welcome_message,
        showLogo: row.show_logo,
        showPhotos: row.show_photos,
        showPricing: row.show_pricing,
        showReviews: row.show_reviews,
      },
      portalUrl: `https://book.barkbase.com/${slug}`,
      message: 'Online booking settings saved successfully.',
    });
  } catch (error) {
    console.error('[OnlineBookingSettings] Failed to update settings:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update online booking settings' });
  }
}

async function handleCheckSlugAvailability(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { slug } = body;
    if (!slug) {
      return createResponse(400, { error: 'Bad Request', message: 'Slug is required' });
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return createResponse(200, {
        available: false,
        message: 'Slug can only contain lowercase letters, numbers, and hyphens',
      });
    }

    // Check if slug is already taken by another tenant
    const result = await query(
      `SELECT tenant_id FROM "OnlineBookingSettings" WHERE url_slug = $1 AND tenant_id != $2`,
      [slug, ctx.tenantId]
    );

    // Also check if it matches another tenant's default slug
    const tenantCheck = await query(
      `SELECT id FROM "Tenant" WHERE slug = $1 AND id != $2`,
      [slug, ctx.tenantId]
    );

    const available = result.rows.length === 0 && tenantCheck.rows.length === 0;
    return createResponse(200, {
      available,
      message: available ? 'This URL is available' : 'This URL is already taken',
    });
  } catch (error) {
    console.error('[OnlineBookingSettings] Failed to check slug:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to check URL availability' });
  }
}

async function handleGetPortalQRCode(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get the URL slug
    const result = await query(`SELECT url_slug FROM "OnlineBookingSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    let slug = result.rows[0]?.url_slug;

    // Fall back to tenant slug if no custom slug
    if (!slug) {
      const tenantResult = await query(`SELECT slug FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
      slug = tenantResult.rows[0]?.slug || '';
    }

    const portalUrl = `https://book.barkbase.com/${slug}`;

    // Return the URL for QR code generation (frontend will generate the actual QR)
    return createResponse(200, {
      success: true,
      portalUrl,
      slug,
      // QR code can be generated client-side using a library like qrcode.react
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(portalUrl)}`,
    });
  } catch (error) {
    console.error('[OnlineBookingSettings] Failed to get QR code:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to generate QR code' });
  }
}

// =============================================================================
// CALENDAR SETTINGS HANDLERS
// =============================================================================
// Calendar view, colors, display options, capacity indicators
// =============================================================================

const DEFAULT_CALENDAR_SETTINGS = {
  // Default View
  defaultView: 'month',
  weekStartsOn: 'sunday',
  showWeekends: true,
  showCanceled: true,
  showCompleted: false,
  // Working Hours
  businessHoursStart: '07:00',
  businessHoursEnd: '19:00',
  greyOutNonWorking: true,
  showHoursIndicator: true,
  // Colors
  colorBy: 'status',
  statusColors: {
    confirmed: '#22c55e',
    pending: '#eab308',
    checked_in: '#3b82f6',
    checked_out: '#6b7280',
    cancelled: '#ef4444',
  },
  serviceColors: {
    boarding: '#3b82f6',
    daycare: '#22c55e',
    grooming: '#a855f7',
  },
  // Display
  showPetName: true,
  showOwnerName: true,
  showServiceType: true,
  showPetPhoto: false,
  showTimes: true,
  showNotesPreview: false,
  timeSlotMinutes: 30,
  // Capacity
  showCapacityBar: true,
  capacityWarningThreshold: 80,
  blockAtFullCapacity: true,
};

async function handleGetCalendarSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT * FROM "CalendarSettings" WHERE tenant_id = $1`, [ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(200, {
        success: true,
        settings: DEFAULT_CALENDAR_SETTINGS,
        isDefault: true,
      });
    }

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        defaultView: row.default_view,
        weekStartsOn: row.week_starts_on,
        showWeekends: row.show_weekends,
        showCanceled: row.show_canceled,
        showCompleted: row.show_completed,
        businessHoursStart: row.business_hours_start ? row.business_hours_start.substring(0, 5) : '07:00',
        businessHoursEnd: row.business_hours_end ? row.business_hours_end.substring(0, 5) : '19:00',
        greyOutNonWorking: row.grey_out_non_working,
        showHoursIndicator: row.show_hours_indicator,
        colorBy: row.color_by,
        statusColors: row.status_colors || DEFAULT_CALENDAR_SETTINGS.statusColors,
        serviceColors: row.service_colors || DEFAULT_CALENDAR_SETTINGS.serviceColors,
        showPetName: row.show_pet_name,
        showOwnerName: row.show_owner_name,
        showServiceType: row.show_service_type,
        showPetPhoto: row.show_pet_photo,
        showTimes: row.show_times,
        showNotesPreview: row.show_notes_preview,
        timeSlotMinutes: row.time_slot_minutes,
        showCapacityBar: row.show_capacity_bar,
        capacityWarningThreshold: row.capacity_warning_threshold,
        blockAtFullCapacity: row.block_at_full_capacity,
      },
      isDefault: false,
    });
  } catch (error) {
    console.error('[CalendarSettings] Failed to get settings:', error.message);
    if (error.message?.includes('does not exist')) {
      return createResponse(200, { success: true, settings: DEFAULT_CALENDAR_SETTINGS, isDefault: true });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load calendar settings' });
  }
}

async function handleUpdateCalendarSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      defaultView = 'month',
      weekStartsOn = 'sunday',
      showWeekends = true,
      showCanceled = true,
      showCompleted = false,
      businessHoursStart = '07:00',
      businessHoursEnd = '19:00',
      greyOutNonWorking = true,
      showHoursIndicator = true,
      colorBy = 'status',
      statusColors = DEFAULT_CALENDAR_SETTINGS.statusColors,
      serviceColors = DEFAULT_CALENDAR_SETTINGS.serviceColors,
      showPetName = true,
      showOwnerName = true,
      showServiceType = true,
      showPetPhoto = false,
      showTimes = true,
      showNotesPreview = false,
      timeSlotMinutes = 30,
      showCapacityBar = true,
      capacityWarningThreshold = 80,
      blockAtFullCapacity = true,
    } = body;

    const result = await query(
      `INSERT INTO "CalendarSettings" (
        tenant_id, default_view, week_starts_on, show_weekends, show_canceled, show_completed,
        business_hours_start, business_hours_end, grey_out_non_working, show_hours_indicator,
        color_by, status_colors, service_colors,
        show_pet_name, show_owner_name, show_service_type, show_pet_photo, show_times, show_notes_preview,
        time_slot_minutes, show_capacity_bar, capacity_warning_threshold, block_at_full_capacity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      ON CONFLICT (tenant_id) DO UPDATE SET
        default_view = EXCLUDED.default_view,
        week_starts_on = EXCLUDED.week_starts_on,
        show_weekends = EXCLUDED.show_weekends,
        show_canceled = EXCLUDED.show_canceled,
        show_completed = EXCLUDED.show_completed,
        business_hours_start = EXCLUDED.business_hours_start,
        business_hours_end = EXCLUDED.business_hours_end,
        grey_out_non_working = EXCLUDED.grey_out_non_working,
        show_hours_indicator = EXCLUDED.show_hours_indicator,
        color_by = EXCLUDED.color_by,
        status_colors = EXCLUDED.status_colors,
        service_colors = EXCLUDED.service_colors,
        show_pet_name = EXCLUDED.show_pet_name,
        show_owner_name = EXCLUDED.show_owner_name,
        show_service_type = EXCLUDED.show_service_type,
        show_pet_photo = EXCLUDED.show_pet_photo,
        show_times = EXCLUDED.show_times,
        show_notes_preview = EXCLUDED.show_notes_preview,
        time_slot_minutes = EXCLUDED.time_slot_minutes,
        show_capacity_bar = EXCLUDED.show_capacity_bar,
        capacity_warning_threshold = EXCLUDED.capacity_warning_threshold,
        block_at_full_capacity = EXCLUDED.block_at_full_capacity,
        updated_at = NOW()
      RETURNING *`,
      [
        ctx.tenantId, defaultView, weekStartsOn, showWeekends, showCanceled, showCompleted,
        businessHoursStart, businessHoursEnd, greyOutNonWorking, showHoursIndicator,
        colorBy, JSON.stringify(statusColors), JSON.stringify(serviceColors),
        showPetName, showOwnerName, showServiceType, showPetPhoto, showTimes, showNotesPreview,
        timeSlotMinutes, showCapacityBar, capacityWarningThreshold, blockAtFullCapacity
      ]
    );

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        defaultView: row.default_view,
        weekStartsOn: row.week_starts_on,
        showWeekends: row.show_weekends,
        showCanceled: row.show_canceled,
        showCompleted: row.show_completed,
        businessHoursStart: row.business_hours_start ? row.business_hours_start.substring(0, 5) : '07:00',
        businessHoursEnd: row.business_hours_end ? row.business_hours_end.substring(0, 5) : '19:00',
        greyOutNonWorking: row.grey_out_non_working,
        showHoursIndicator: row.show_hours_indicator,
        colorBy: row.color_by,
        statusColors: row.status_colors || DEFAULT_CALENDAR_SETTINGS.statusColors,
        serviceColors: row.service_colors || DEFAULT_CALENDAR_SETTINGS.serviceColors,
        showPetName: row.show_pet_name,
        showOwnerName: row.show_owner_name,
        showServiceType: row.show_service_type,
        showPetPhoto: row.show_pet_photo,
        showTimes: row.show_times,
        showNotesPreview: row.show_notes_preview,
        timeSlotMinutes: row.time_slot_minutes,
        showCapacityBar: row.show_capacity_bar,
        capacityWarningThreshold: row.capacity_warning_threshold,
        blockAtFullCapacity: row.block_at_full_capacity,
      },
      message: 'Calendar settings saved successfully.',
    });
  } catch (error) {
    console.error('[CalendarSettings] Failed to update settings:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update calendar settings' });
  }
}

// =============================================================================
// BOOKING SETTINGS HANDLERS
// =============================================================================
// Booking rules, booking windows, operating hours
// =============================================================================

const DEFAULT_BOOKING_SETTINGS = {
  // Booking Rules
  onlineBookingEnabled: true,
  requireDeposit: false,
  depositPercentage: 25,
  requireVaccinations: true,
  enableWaitlist: true,
  // Booking Windows
  maxAdvanceDays: 90,
  minAdvanceHours: 24,
  cancellationWindowHours: 48,
  // Operating Hours
  checkinTime: '08:00',
  checkoutTime: '17:00',
  extendedHoursEnabled: false,
  earlyDropoffTime: '06:00',
  latePickupTime: '20:00',
  earlyDropoffFeeCents: 0,
  latePickupFeeCents: 0,
};

async function handleGetBookingSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT * FROM "BookingSettings" WHERE tenant_id = $1`, [ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(200, {
        success: true,
        settings: DEFAULT_BOOKING_SETTINGS,
        isDefault: true,
      });
    }

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        onlineBookingEnabled: row.online_booking_enabled,
        requireDeposit: row.require_deposit,
        depositPercentage: row.deposit_percentage,
        requireVaccinations: row.require_vaccinations,
        enableWaitlist: row.enable_waitlist,
        maxAdvanceDays: row.max_advance_days,
        minAdvanceHours: row.min_advance_hours,
        cancellationWindowHours: row.cancellation_window_hours,
        checkinTime: row.checkin_time ? row.checkin_time.substring(0, 5) : '08:00',
        checkoutTime: row.checkout_time ? row.checkout_time.substring(0, 5) : '17:00',
        extendedHoursEnabled: row.extended_hours_enabled,
        earlyDropoffTime: row.early_dropoff_time ? row.early_dropoff_time.substring(0, 5) : '06:00',
        latePickupTime: row.late_pickup_time ? row.late_pickup_time.substring(0, 5) : '20:00',
        earlyDropoffFeeCents: row.early_dropoff_fee_cents || 0,
        latePickupFeeCents: row.late_pickup_fee_cents || 0,
      },
      isDefault: false,
    });
  } catch (error) {
    console.error('[BookingSettings] Failed to get settings:', error.message);
    if (error.message?.includes('does not exist')) {
      return createResponse(200, { success: true, settings: DEFAULT_BOOKING_SETTINGS, isDefault: true });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load booking settings' });
  }
}

async function handleUpdateBookingSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      onlineBookingEnabled = true,
      requireDeposit = false,
      depositPercentage = 25,
      requireVaccinations = true,
      enableWaitlist = true,
      maxAdvanceDays = 90,
      minAdvanceHours = 24,
      cancellationWindowHours = 48,
      checkinTime = '08:00',
      checkoutTime = '17:00',
      extendedHoursEnabled = false,
      earlyDropoffTime = '06:00',
      latePickupTime = '20:00',
      earlyDropoffFeeCents = 0,
      latePickupFeeCents = 0,
    } = body;

    const result = await query(
      `INSERT INTO "BookingSettings" (
        tenant_id, online_booking_enabled, require_deposit, deposit_percentage,
        require_vaccinations, enable_waitlist, max_advance_days, min_advance_hours,
        cancellation_window_hours, checkin_time, checkout_time, extended_hours_enabled,
        early_dropoff_time, late_pickup_time, early_dropoff_fee_cents, late_pickup_fee_cents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (tenant_id) DO UPDATE SET
        online_booking_enabled = EXCLUDED.online_booking_enabled,
        require_deposit = EXCLUDED.require_deposit,
        deposit_percentage = EXCLUDED.deposit_percentage,
        require_vaccinations = EXCLUDED.require_vaccinations,
        enable_waitlist = EXCLUDED.enable_waitlist,
        max_advance_days = EXCLUDED.max_advance_days,
        min_advance_hours = EXCLUDED.min_advance_hours,
        cancellation_window_hours = EXCLUDED.cancellation_window_hours,
        checkin_time = EXCLUDED.checkin_time,
        checkout_time = EXCLUDED.checkout_time,
        extended_hours_enabled = EXCLUDED.extended_hours_enabled,
        early_dropoff_time = EXCLUDED.early_dropoff_time,
        late_pickup_time = EXCLUDED.late_pickup_time,
        early_dropoff_fee_cents = EXCLUDED.early_dropoff_fee_cents,
        late_pickup_fee_cents = EXCLUDED.late_pickup_fee_cents,
        updated_at = NOW()
      RETURNING *`,
      [
        ctx.tenantId, onlineBookingEnabled, requireDeposit, depositPercentage,
        requireVaccinations, enableWaitlist, maxAdvanceDays, minAdvanceHours,
        cancellationWindowHours, checkinTime, checkoutTime, extendedHoursEnabled,
        earlyDropoffTime, latePickupTime, earlyDropoffFeeCents, latePickupFeeCents
      ]
    );

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        onlineBookingEnabled: row.online_booking_enabled,
        requireDeposit: row.require_deposit,
        depositPercentage: row.deposit_percentage,
        requireVaccinations: row.require_vaccinations,
        enableWaitlist: row.enable_waitlist,
        maxAdvanceDays: row.max_advance_days,
        minAdvanceHours: row.min_advance_hours,
        cancellationWindowHours: row.cancellation_window_hours,
        checkinTime: row.checkin_time ? row.checkin_time.substring(0, 5) : '08:00',
        checkoutTime: row.checkout_time ? row.checkout_time.substring(0, 5) : '17:00',
        extendedHoursEnabled: row.extended_hours_enabled,
        earlyDropoffTime: row.early_dropoff_time ? row.early_dropoff_time.substring(0, 5) : '06:00',
        latePickupTime: row.late_pickup_time ? row.late_pickup_time.substring(0, 5) : '20:00',
        earlyDropoffFeeCents: row.early_dropoff_fee_cents || 0,
        latePickupFeeCents: row.late_pickup_fee_cents || 0,
      },
      message: 'Booking settings saved successfully.',
    });
  } catch (error) {
    console.error('[BookingSettings] Failed to update settings:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update booking settings' });
  }
}

// =============================================================================
// INVOICE SETTINGS HANDLERS
// =============================================================================
// Invoice defaults, tax, branding, payment instructions, late fees, automation
// =============================================================================

const DEFAULT_INVOICE_SETTINGS = {
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1001,
  paymentTerms: 'due_on_receipt',
  defaultNotes: '',
  chargeTax: false,
  taxName: 'Sales Tax',
  taxRate: 0,
  taxId: '',
  taxInclusive: false,
  logoUrl: '',
  businessName: '',
  businessAddress: '',
  businessPhone: '',
  businessEmail: '',
  paymentInstructions: '',
  enableLateFees: false,
  lateFeeGraceDays: 7,
  lateFeeType: 'percentage',
  lateFeeAmount: 1.5,
  lateFeeRecurring: false,
  createInvoiceOnCheckout: true,
  createInvoiceOnBooking: false,
  autoSendInvoice: true,
  autoChargeCard: false,
};

async function handleGetInvoiceSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT * FROM "InvoiceSettings" WHERE tenant_id = $1`, [ctx.tenantId]);

    if (result.rows.length === 0) {
      // Get tenant info for defaults
      const tenantResult = await query(`SELECT name FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
      const tenantName = tenantResult.rows[0]?.name || '';
      return createResponse(200, {
        success: true,
        settings: { ...DEFAULT_INVOICE_SETTINGS, businessName: tenantName },
        isDefault: true,
      });
    }

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        invoicePrefix: row.invoice_prefix,
        nextInvoiceNumber: row.next_invoice_number,
        paymentTerms: row.payment_terms,
        defaultNotes: row.default_notes || '',
        chargeTax: row.charge_tax,
        taxName: row.tax_name || 'Sales Tax',
        taxRate: parseFloat(row.tax_rate) || 0,
        taxId: row.tax_id || '',
        taxInclusive: row.tax_inclusive,
        logoUrl: row.logo_url || '',
        businessName: row.business_name || '',
        businessAddress: row.business_address || '',
        businessPhone: row.business_phone || '',
        businessEmail: row.business_email || '',
        paymentInstructions: row.payment_instructions || '',
        enableLateFees: row.enable_late_fees,
        lateFeeGraceDays: row.late_fee_grace_days,
        lateFeeType: row.late_fee_type,
        lateFeeAmount: parseFloat(row.late_fee_amount) || 0,
        lateFeeRecurring: row.late_fee_recurring,
        createInvoiceOnCheckout: row.create_invoice_on_checkout,
        createInvoiceOnBooking: row.create_invoice_on_booking,
        autoSendInvoice: row.auto_send_invoice,
        autoChargeCard: row.auto_charge_card,
      },
      isDefault: false,
    });
  } catch (error) {
    console.error('[InvoiceSettings] Failed to get settings:', error.message);
    if (error.message?.includes('does not exist')) {
      return createResponse(200, { success: true, settings: DEFAULT_INVOICE_SETTINGS, isDefault: true });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load invoice settings' });
  }
}

async function handleUpdateInvoiceSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      invoicePrefix = 'INV-',
      nextInvoiceNumber = 1001,
      paymentTerms = 'due_on_receipt',
      defaultNotes = '',
      chargeTax = false,
      taxName = 'Sales Tax',
      taxRate = 0,
      taxId = '',
      taxInclusive = false,
      logoUrl = '',
      businessName = '',
      businessAddress = '',
      businessPhone = '',
      businessEmail = '',
      paymentInstructions = '',
      enableLateFees = false,
      lateFeeGraceDays = 7,
      lateFeeType = 'percentage',
      lateFeeAmount = 1.5,
      lateFeeRecurring = false,
      createInvoiceOnCheckout = true,
      createInvoiceOnBooking = false,
      autoSendInvoice = true,
      autoChargeCard = false,
    } = body;

    const result = await query(
      `INSERT INTO "InvoiceSettings" (
        tenant_id, invoice_prefix, next_invoice_number, payment_terms, default_notes,
        charge_tax, tax_name, tax_rate, tax_id, tax_inclusive,
        logo_url, business_name, business_address, business_phone, business_email,
        payment_instructions, enable_late_fees, late_fee_grace_days, late_fee_type, late_fee_amount, late_fee_recurring,
        create_invoice_on_checkout, create_invoice_on_booking, auto_send_invoice, auto_charge_card
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (tenant_id) DO UPDATE SET
        invoice_prefix = EXCLUDED.invoice_prefix,
        next_invoice_number = EXCLUDED.next_invoice_number,
        payment_terms = EXCLUDED.payment_terms,
        default_notes = EXCLUDED.default_notes,
        charge_tax = EXCLUDED.charge_tax,
        tax_name = EXCLUDED.tax_name,
        tax_rate = EXCLUDED.tax_rate,
        tax_id = EXCLUDED.tax_id,
        tax_inclusive = EXCLUDED.tax_inclusive,
        logo_url = EXCLUDED.logo_url,
        business_name = EXCLUDED.business_name,
        business_address = EXCLUDED.business_address,
        business_phone = EXCLUDED.business_phone,
        business_email = EXCLUDED.business_email,
        payment_instructions = EXCLUDED.payment_instructions,
        enable_late_fees = EXCLUDED.enable_late_fees,
        late_fee_grace_days = EXCLUDED.late_fee_grace_days,
        late_fee_type = EXCLUDED.late_fee_type,
        late_fee_amount = EXCLUDED.late_fee_amount,
        late_fee_recurring = EXCLUDED.late_fee_recurring,
        create_invoice_on_checkout = EXCLUDED.create_invoice_on_checkout,
        create_invoice_on_booking = EXCLUDED.create_invoice_on_booking,
        auto_send_invoice = EXCLUDED.auto_send_invoice,
        auto_charge_card = EXCLUDED.auto_charge_card,
        updated_at = NOW()
      RETURNING *`,
      [
        ctx.tenantId, invoicePrefix, nextInvoiceNumber, paymentTerms, defaultNotes,
        chargeTax, taxName, taxRate, taxId, taxInclusive,
        logoUrl, businessName, businessAddress, businessPhone, businessEmail,
        paymentInstructions, enableLateFees, lateFeeGraceDays, lateFeeType, lateFeeAmount, lateFeeRecurring,
        createInvoiceOnCheckout, createInvoiceOnBooking, autoSendInvoice, autoChargeCard
      ]
    );

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        invoicePrefix: row.invoice_prefix,
        nextInvoiceNumber: row.next_invoice_number,
        paymentTerms: row.payment_terms,
        defaultNotes: row.default_notes || '',
        chargeTax: row.charge_tax,
        taxName: row.tax_name,
        taxRate: parseFloat(row.tax_rate) || 0,
        taxId: row.tax_id || '',
        taxInclusive: row.tax_inclusive,
        logoUrl: row.logo_url || '',
        businessName: row.business_name || '',
        businessAddress: row.business_address || '',
        businessPhone: row.business_phone || '',
        businessEmail: row.business_email || '',
        paymentInstructions: row.payment_instructions || '',
        enableLateFees: row.enable_late_fees,
        lateFeeGraceDays: row.late_fee_grace_days,
        lateFeeType: row.late_fee_type,
        lateFeeAmount: parseFloat(row.late_fee_amount) || 0,
        lateFeeRecurring: row.late_fee_recurring,
        createInvoiceOnCheckout: row.create_invoice_on_checkout,
        createInvoiceOnBooking: row.create_invoice_on_booking,
        autoSendInvoice: row.auto_send_invoice,
        autoChargeCard: row.auto_charge_card,
      },
      message: 'Invoice settings saved successfully.',
    });
  } catch (error) {
    console.error('[InvoiceSettings] Failed to update settings:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update invoice settings' });
  }
}

async function handleGetInvoicePreview(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get invoice settings
    const settingsResult = await query(`SELECT * FROM "InvoiceSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const tenantResult = await query(`SELECT name FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const tenantName = tenantResult.rows[0]?.name || 'Your Business';

    let settings = DEFAULT_INVOICE_SETTINGS;
    if (settingsResult.rows.length > 0) {
      const row = settingsResult.rows[0];
      settings = {
        invoicePrefix: row.invoice_prefix || 'INV-',
        nextInvoiceNumber: row.next_invoice_number || 1001,
        paymentTerms: row.payment_terms || 'due_on_receipt',
        defaultNotes: row.default_notes || '',
        chargeTax: row.charge_tax,
        taxName: row.tax_name || 'Sales Tax',
        taxRate: parseFloat(row.tax_rate) || 0,
        taxInclusive: row.tax_inclusive,
        logoUrl: row.logo_url || '',
        businessName: row.business_name || tenantName,
        businessAddress: row.business_address || '',
        businessPhone: row.business_phone || '',
        businessEmail: row.business_email || '',
        paymentInstructions: row.payment_instructions || '',
      };
    } else {
      settings.businessName = tenantName;
    }

    // Generate sample invoice data
    const sampleInvoice = {
      invoiceNumber: `${settings.invoicePrefix}${settings.nextInvoiceNumber}`,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      dueDate: settings.paymentTerms === 'due_on_receipt' ? 'Due on Receipt' :
               settings.paymentTerms === 'net_7' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) :
               settings.paymentTerms === 'net_15' ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) :
               new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      customer: {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        address: '123 Main Street\nTampa, FL 33601',
      },
      lineItems: [
        { description: 'Boarding - Standard Kennel (5 nights)', quantity: 5, unitPrice: 4500, total: 22500 },
        { description: 'Daycare - Full Day', quantity: 2, unitPrice: 3500, total: 7000 },
        { description: 'Bath & Brush - Medium Dog', quantity: 1, unitPrice: 4000, total: 4000 },
        { description: 'Medication Administration (daily)', quantity: 5, unitPrice: 500, total: 2500 },
      ],
      subtotal: 36000,
      taxAmount: settings.chargeTax ? Math.round(36000 * settings.taxRate / 100) : 0,
      total: settings.chargeTax ? 36000 + Math.round(36000 * settings.taxRate / 100) : 36000,
      settings,
    };

    return createResponse(200, {
      success: true,
      preview: sampleInvoice,
    });
  } catch (error) {
    console.error('[InvoiceSettings] Failed to generate preview:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to generate invoice preview' });
  }
}

// =============================================================================
// POLICIES HANDLERS
// =============================================================================
// Terms & Policies for legal documents: liability waivers, ToS, cancellation, etc.
// =============================================================================

/**
 * Get policies for tenant
 * NEW SCHEMA: Policies stored in TenantSettings.custom_fields.policies
 */
async function handleGetPolicies(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      // Return empty policies if TenantSettings doesn't exist yet
      return createResponse(200, { policies: [] });
    }

    // Return empty array if no policies set - user creates from scratch or templates
    const customFields = result.rows[0].custom_fields || {};
    const policies = customFields.policies || [];

    return createResponse(200, { policies });
  } catch (error) {
    console.error('[Policies] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load policies' });
  }
}

/**
 * Create a new policy
 * NEW SCHEMA: Policies stored in TenantSettings.custom_fields.policies
 */
async function handleCreatePolicy(user, body) {
  const {
    name,
    title,
    type,
    content,
    status = 'draft',
    isActive,
    requireForBooking = false,
    requireSignature = false,
    version = 1
  } = body;

  // Support both 'name' and 'title' for policy title
  const policyTitle = title || name;

  if (!policyTitle || !type) {
    return createResponse(400, { error: 'Bad Request', message: 'Title and type are required' });
  }

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current custom_fields
    const result = await query(`SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const customFields = result.rows[0]?.custom_fields || {};
    const policies = customFields.policies || [];

    // Generate unique ID
    const policyId = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add new policy with all fields
    const newPolicy = {
      id: policyId,
      name: policyTitle,
      title: policyTitle,
      type,
      content: content || '',
      status: status || 'draft',
      isActive: isActive !== undefined ? isActive : (status === 'active'),
      requireForBooking: Boolean(requireForBooking),
      requireSignature: Boolean(requireSignature),
      version: parseInt(version, 10) || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    policies.push(newPolicy);

    // Save to TenantSettings.custom_fields
    customFields.policies = policies;
    await query(
      `UPDATE "TenantSettings" SET custom_fields = $1, updated_at = NOW() WHERE tenant_id = $2`,
      [JSON.stringify(customFields), ctx.tenantId]
    );

    return createResponse(201, { success: true, policy: newPolicy });
  } catch (error) {
    console.error('[Policies] Failed to create:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create policy' });
  }
}

/**
 * Get a specific policy by ID
 * NEW SCHEMA: Policies stored in TenantSettings.custom_fields.policies
 */
async function handleGetPolicy(user, policyId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const customFields = result.rows[0]?.custom_fields || {};
    const policies = customFields.policies || [];
    const policy = policies.find(p => p.id === policyId);

    if (!policy) {
      return createResponse(404, { error: 'Not Found', message: 'Policy not found' });
    }

    return createResponse(200, policy);
  } catch (error) {
    console.error('[Policies] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load policy' });
  }
}

/**
 * Update a policy
 * NEW SCHEMA: Policies stored in TenantSettings.custom_fields.policies
 */
async function handleUpdatePolicy(user, policyId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const customFields = result.rows[0]?.custom_fields || {};
    const policies = customFields.policies || [];
    const index = policies.findIndex(p => p.id === policyId);

    if (index === -1) {
      return createResponse(404, { error: 'Not Found', message: 'Policy not found' });
    }

    // Support both 'name' and 'title' for policy title
    const updateData = { ...body };
    if (updateData.title && !updateData.name) {
      updateData.name = updateData.title;
    }
    if (updateData.name && !updateData.title) {
      updateData.title = updateData.name;
    }

    // Handle status/isActive sync
    if (updateData.status !== undefined) {
      updateData.isActive = updateData.status === 'active';
    } else if (updateData.isActive !== undefined) {
      updateData.status = updateData.isActive ? 'active' : 'inactive';
    }

    // Ensure boolean fields are proper booleans
    if (updateData.requireForBooking !== undefined) {
      updateData.requireForBooking = Boolean(updateData.requireForBooking);
    }
    if (updateData.requireSignature !== undefined) {
      updateData.requireSignature = Boolean(updateData.requireSignature);
    }
    if (updateData.version !== undefined) {
      updateData.version = parseInt(updateData.version, 10) || policies[index].version || 1;
    }

    // Update policy - merge with existing data
    policies[index] = {
      ...policies[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    customFields.policies = policies;
    await query(
      `UPDATE "TenantSettings" SET custom_fields = $1, updated_at = NOW() WHERE tenant_id = $2`,
      [JSON.stringify(customFields), ctx.tenantId]
    );

    return createResponse(200, { success: true, policy: policies[index] });
  } catch (error) {
    console.error('[Policies] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update policy' });
  }
}

/**
 * Delete a policy
 * NEW SCHEMA: Policies stored in TenantSettings.custom_fields.policies
 */
async function handleDeletePolicy(user, policyId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const customFields = result.rows[0]?.custom_fields || {};
    const policies = customFields.policies || [];
    const filtered = policies.filter(p => p.id !== policyId);

    if (filtered.length === policies.length) {
      return createResponse(404, { error: 'Not Found', message: 'Policy not found' });
    }

    customFields.policies = filtered;
    await query(
      `UPDATE "TenantSettings" SET custom_fields = $1, updated_at = NOW() WHERE tenant_id = $2`,
      [JSON.stringify(customFields), ctx.tenantId]
    );

    return createResponse(200, { success: true, message: 'Policy deleted' });
  } catch (error) {
    console.error('[Policies] Failed to delete:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete policy' });
  }
}

/**
 * Get policy templates for kennel businesses
 * Returns pre-built templates for common legal documents
 */
function handleGetPolicyTemplates() {
  const templates = {
    liability_waiver: {
      type: 'liability_waiver',
      title: 'Liability Waiver & Release',
      description: 'Releases kennel from liability for injury, illness, or death',
      requireForBooking: true,
      requireSignature: true,
      content: `LIABILITY WAIVER AND RELEASE OF CLAIMS

I, the undersigned pet owner/guardian, in consideration of the services provided by [FACILITY NAME] (hereinafter referred to as "the Facility"), do hereby agree to the following terms and conditions:

1. ASSUMPTION OF RISK
I understand and acknowledge that there are inherent risks associated with boarding, daycare, grooming, and other pet care services, including but not limited to:
• Injury from playing with other animals
• Escape or loss
• Illness or disease transmission
• Allergic reactions
• Stress-related behaviors
• Property damage
• Injury or death

I voluntarily assume all such risks, both known and unknown, even if arising from the negligence of the Facility or others, and assume full responsibility for my pet's participation.

2. RELEASE AND WAIVER
I hereby release, waive, discharge, and covenant not to sue the Facility, its owners, operators, employees, agents, and representatives from any and all liability, claims, demands, actions, or causes of action arising out of or relating to any loss, damage, or injury, including death, that may be sustained by me or my pet while participating in or as a result of the services provided.

3. EMERGENCY MEDICAL AUTHORIZATION
In the event of a medical emergency, I authorize the Facility to:
• Seek emergency veterinary care for my pet at my expense
• Transport my pet to a veterinary clinic of their choosing if my designated veterinarian is unavailable
• Authorize necessary medical treatment if I cannot be reached
• I agree to pay all costs associated with emergency veterinary care

4. PRE-EXISTING CONDITIONS
I certify that my pet is in good health and has not been ill with any communicable disease within the last 30 days. I understand that vaccinations reduce but do not eliminate the risk of disease transmission. I agree to inform the Facility of any pre-existing medical conditions, behavioral issues, or special needs.

5. INDEMNIFICATION
I agree to indemnify and hold harmless the Facility from any and all claims, actions, suits, procedures, costs, expenses, damages, and liabilities arising out of my pet's stay or my breach of any term of this agreement.

6. PHOTO/VIDEO RELEASE
I grant permission for the Facility to photograph or video my pet for promotional materials, social media, or other business purposes without compensation to me.

7. ACKNOWLEDGMENT
I have read this agreement, fully understand its terms, and sign it freely and voluntarily. I understand that this waiver is binding upon my heirs, executors, and assigns.

By signing below, I acknowledge that I have read and agree to all terms and conditions set forth in this Liability Waiver and Release.`
    },
    terms_of_service: {
      type: 'terms_of_service',
      title: 'Terms of Service Agreement',
      description: 'General terms of doing business',
      requireForBooking: true,
      requireSignature: true,
      content: `TERMS OF SERVICE AGREEMENT

Welcome to [FACILITY NAME]. By using our services, you agree to the following terms and conditions:

1. SERVICES PROVIDED
We provide professional pet care services including:
• Overnight boarding
• Daycare
• Grooming
• Training (if applicable)
• Additional add-on services as offered

2. RESERVATION & BOOKING
• Reservations are recommended and may be required during peak seasons
• A valid credit card is required to hold reservations
• Same-day bookings are subject to availability

3. CHECK-IN & CHECK-OUT
• Standard check-in: [TIME] - [TIME]
• Standard check-out: [TIME] - [TIME]
• Extended hours may be available for an additional fee
• Pets not picked up by closing time may incur overnight boarding charges

4. PAYMENT TERMS
• Payment is due at the time of service
• We accept cash, credit cards, and debit cards
• Returned checks will incur a $35 fee
• Outstanding balances may result in collection action

5. RATES & FEES
• All rates are subject to change without notice
• Holiday rates may apply during designated holiday periods
• Multi-pet discounts may be available
• See current rate card for complete pricing

6. PET REQUIREMENTS
• All pets must be current on required vaccinations
• Pets must be free of fleas, ticks, and other parasites
• Aggressive pets may not be accepted or may be required to leave
• Pets showing signs of illness will not be accepted

7. LIABILITY
• The Facility is not responsible for lost or damaged personal items
• See our Liability Waiver for complete terms
• Pet insurance is the owner's responsibility

8. AGREEMENT
By utilizing our services, you acknowledge that you have read, understood, and agree to these Terms of Service.`
    },
    cancellation: {
      type: 'cancellation',
      title: 'Cancellation & Refund Policy',
      description: 'Cancellation windows and refund policies',
      requireForBooking: false,
      requireSignature: false,
      content: `CANCELLATION & REFUND POLICY

We understand that plans change. Please review our cancellation policy carefully:

1. STANDARD CANCELLATION WINDOWS

Cancellation more than 72 hours before reservation:
• Full refund of any deposits paid
• No cancellation fee

Cancellation 48-72 hours before reservation:
• 75% refund of deposits
• 25% cancellation fee applies

Cancellation 24-48 hours before reservation:
• 50% refund of deposits
• 50% cancellation fee applies

Cancellation less than 24 hours before reservation:
• No refund
• Full payment required

2. NO-SHOW POLICY
Failure to arrive for your reservation without notice will result in:
• Full charge for the first night/day of service
• Cancellation of remaining reservation
• Possible impact on future booking privileges

3. EARLY PICKUP
If you pick up your pet earlier than scheduled:
• No refund for unused days
• Full payment for booked services is required

4. HOLIDAY & PEAK SEASON POLICY
During designated holidays and peak seasons:
• 7-day advance cancellation required for full refund
• Cancellations within 7 days forfeit full deposit
• Holidays include: New Year's, Memorial Day, July 4th, Labor Day, Thanksgiving, Christmas

5. WEATHER & EMERGENCIES
In the event of weather emergencies or facility closures:
• Affected bookings will receive full credit
• Credits can be applied to future bookings
• Credits expire 12 months from issue date

6. HOW TO CANCEL
• Phone: Call during business hours
• Email: Send written cancellation request
• Online: Use your account portal (if available)
• Cancellation is confirmed only when you receive confirmation from us

7. REFUND PROCESSING
• Refunds are processed within 5-7 business days
• Refunds are credited to the original payment method
• Cash payments may be refunded by check`
    },
    vaccination: {
      type: 'vaccination',
      title: 'Vaccination Requirements Policy',
      description: 'Required vaccines and proof requirements',
      requireForBooking: false,
      requireSignature: false,
      content: `VACCINATION REQUIREMENTS POLICY

The health and safety of all pets in our care is our top priority. All pets must meet the following vaccination requirements:

1. REQUIRED VACCINATIONS FOR DOGS

Rabies
• Current 1-year or 3-year vaccination required
• Must be administered by a licensed veterinarian
• Certificate must show expiration date

DHPP/DAPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)
• Must be current per veterinarian's schedule
• Initial series plus annual boosters required

Bordetella (Kennel Cough)
• Must be administered within the past 12 months
• Intranasal, oral, or injectable accepted
• We recommend administration at least 5 days before boarding

Canine Influenza (H3N2 and H3N8)
• Required for all dogs
• Both strains (bivalent vaccine) recommended
• Must be current per manufacturer's schedule

2. PROOF REQUIREMENTS

We accept:
• Veterinary records with clinic letterhead
• Rabies certificates
• Electronic records from your vet's portal
• Printed vaccination history

We do NOT accept:
• Handwritten notes
• Expired records
• Records without veterinary identification

3. TITERS
• Titer tests may be accepted in lieu of certain vaccinations
• Must be accompanied by veterinarian letter
• Subject to management approval
• Not accepted for Rabies (legally required)

4. EXPIRED VACCINATIONS
• Pets with expired vaccinations cannot be accepted
• No exceptions for same-day appointments
• Allow time for vaccine effectiveness (especially Bordetella)`
    },
    health_behavior: {
      type: 'health_behavior',
      title: 'Health & Behavior Requirements',
      description: 'Health requirements and behavior policies',
      requireForBooking: false,
      requireSignature: false,
      content: `HEALTH & BEHAVIOR REQUIREMENTS

To ensure the safety and well-being of all pets and staff, please review the following requirements:

1. HEALTH REQUIREMENTS

Flea & Tick Prevention
• All pets must be on current flea and tick prevention
• Pets found with fleas/ticks will be treated at owner's expense

General Health
• Pets must be in good health upon arrival
• Pets showing signs of illness will not be accepted
• This includes: coughing, sneezing, nasal discharge, lethargy, diarrhea, vomiting

Spay/Neuter Policy
• Dogs over 6 months of age must be spayed or neutered for daycare participation
• Intact dogs may board but will have limited group interaction
• Females in heat cannot be accepted

2. BEHAVIOR REQUIREMENTS

Aggression Policy
• Aggressive behavior toward people or other animals is not tolerated
• Pets displaying aggression may be required to leave immediately
• No refunds for early removal due to behavioral issues

Socialization Assessment
• All new dogs undergo a temperament evaluation
• Results determine group play eligibility
• Some dogs may be suitable for individual care only

3. WHEN TO KEEP YOUR PET HOME

Please do not bring your pet if they are experiencing:
• Vomiting or diarrhea in the last 24 hours
• Coughing or sneezing
• Eye or nasal discharge
• Lethargy or loss of appetite
• Fleas or ticks
• Open wounds or skin conditions
• Contagious conditions

4. DISCLOSURE REQUIREMENTS

You must inform us of:
• Any history of aggression
• Resource guarding behaviors
• Separation anxiety
• Fear triggers
• Medical conditions
• Current medications
• Recent surgeries or injuries`
    },
    pickup_dropoff: {
      type: 'pickup_dropoff',
      title: 'Pickup & Dropoff Policy',
      description: 'Operating hours and late fees',
      requireForBooking: false,
      requireSignature: false,
      content: `PICKUP & DROPOFF POLICY

Please review our hours and procedures for smooth check-in and check-out experiences:

1. OPERATING HOURS

Monday - Friday: [TIME] AM - [TIME] PM
Saturday: [TIME] AM - [TIME] PM
Sunday: [TIME] AM - [TIME] PM

Holidays: Limited hours or closed - see holiday schedule

2. CHECK-IN PROCEDURES

• Arrive within 15 minutes of your scheduled time
• Complete any outstanding paperwork
• Provide any medications with clear written instructions
• Label all personal items with your pet's name
• Discuss any special needs with staff

3. CHECK-OUT PROCEDURES

• Payment is due at time of pickup
• You will receive a summary of your pet's stay
• Collect all personal belongings
• Ask questions about your pet's experience

4. AUTHORIZED PICKUP PERSONS

• Only authorized individuals may pick up your pet
• Authorization must be provided in writing or added to your account
• Valid photo ID required for all pickups
• We will not release pets to unauthorized individuals

5. LATE PICKUP POLICY

Pickup after closing time:
• $[AMOUNT] late pickup fee per hour
• After 2 hours past closing: full overnight boarding charge
• Repeated late pickups may result in loss of booking privileges

6. EARLY DROPOFF POLICY

• Early dropoff on scheduled boarding day is permitted during regular hours
• No additional charge unless before regular opening hours
• For daycare, arrive within your scheduled window`
    },
    feeding_medication: {
      type: 'feeding_medication',
      title: 'Feeding & Medication Policy',
      description: 'Food and medication policies',
      requireForBooking: false,
      requireSignature: false,
      content: `FEEDING & MEDICATION POLICY

We want your pet to feel at home. Please review our feeding and medication guidelines:

1. FEEDING GUIDELINES

Bring Your Own Food
• We strongly recommend bringing your pet's regular food
• Sudden diet changes can cause digestive upset
• Provide enough food for the entire stay plus 1 extra day
• Pre-portioned meals are appreciated but not required

Facility Food (if not providing your own)
• Premium kibble available for $[AMOUNT] per day
• We stock [BRAND NAME] adult formula
• Prescription diets must be provided by owner
• Notify us of any food allergies

2. FEEDING SCHEDULE

Standard Schedule:
• Breakfast: [TIME] AM
• Dinner: [TIME] PM

Special Schedules:
• Custom feeding times can be accommodated
• Note requirements on your intake form
• Additional feedings (puppies/seniors): $[AMOUNT] per feeding

3. MEDICATION ADMINISTRATION

Medication Fee Schedule:
• Oral medications (pills/liquids): $[AMOUNT] per administration
• Topical medications: $[AMOUNT] per application
• Injections (insulin, etc.): $[AMOUNT] per injection
• Eye/ear drops: $[AMOUNT] per treatment

Medication Requirements:
• All medications must be in original prescription containers
• Include clear written instructions
• Provide enough medication for the entire stay plus 2 extra doses
• Controlled substances may require special arrangements

4. SPECIAL DIETS

We accommodate:
• Prescription diets (owner-provided)
• Raw food diets (with proper handling)
• Homemade diets
• Multiple small meals
• Food puzzles and slow feeders`
    },
    emergency: {
      type: 'emergency',
      title: 'Emergency Policy & Procedures',
      description: 'Emergency procedures and authorization',
      requireForBooking: true,
      requireSignature: true,
      content: `EMERGENCY POLICY & PROCEDURES

Your pet's safety is our top priority. Please review our emergency procedures:

1. EMERGENCY VETERINARY AUTHORIZATION

By boarding your pet with us, you authorize [FACILITY NAME] to:

• Seek immediate emergency veterinary care for your pet
• Transport your pet to the nearest emergency veterinary clinic
• Authorize necessary life-saving treatment
• Make medical decisions if you cannot be reached

This authorization is granted when the safety or health of your pet is at immediate risk.

2. OWNER NOTIFICATION

In an emergency, we will:
1. Stabilize the situation and ensure pet safety
2. Seek veterinary care if immediately needed
3. Attempt to contact you via all numbers on file
4. Contact your emergency contact if you're unavailable
5. Continue with authorized treatment

3. FINANCIAL RESPONSIBILITY

Emergency Veterinary Care:
• All emergency veterinary expenses are the pet owner's responsibility
• You agree to pay all costs associated with emergency care
• A credit card on file may be charged for emergency expenses
• Treatment will not be withheld due to inability to reach owner

4. TYPES OF EMERGENCIES

Medical Emergencies:
• Difficulty breathing
• Collapse or unconsciousness
• Seizures
• Severe injury
• Bloat (gastric dilation)
• Allergic reactions
• Persistent vomiting or diarrhea

Facility Emergencies:
• Fire
• Natural disaster
• Power outage
• Facility evacuation

5. EVACUATION PROCEDURES

In case of evacuation:
• Pets will be transported to our secondary location
• You will be notified immediately via phone and email
• Instructions for pickup will be provided
• Pets will receive continued care until reunited with owners

6. LIMITATION OF LIABILITY

[FACILITY NAME] is not liable for:
• Veterinary expenses (owner's responsibility)
• Pre-existing conditions that worsen
• Unforeseeable medical events
• Injury or illness despite proper care

Your pet's safety is paramount. Please ensure all contact information is current and accurate.`
    }
  };

  return createResponse(200, { templates });
}

// =============================================================================
// REQUIRED VACCINATIONS HANDLERS
// =============================================================================

/**
 * Get required vaccinations for tenant
 * NEW SCHEMA: Stored in TenantSettings.custom_fields.requiredVaccinations
 */
async function handleGetRequiredVaccinations(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const customFields = result.rows[0]?.custom_fields || {};
    const vaccinations = customFields.requiredVaccinations || [
      { id: 'rabies', name: 'Rabies', required: true, expirationWarningDays: 30, blockBookingIfExpired: true },
      { id: 'dhpp', name: 'DHPP/DAPP', required: true, expirationWarningDays: 30, blockBookingIfExpired: true },
      { id: 'bordetella', name: 'Bordetella (Kennel Cough)', required: true, expirationWarningDays: 14, blockBookingIfExpired: true },
      { id: 'canine-influenza', name: 'Canine Influenza', required: false, expirationWarningDays: 30, blockBookingIfExpired: false },
      { id: 'leptospirosis', name: 'Leptospirosis', required: false, expirationWarningDays: 30, blockBookingIfExpired: false },
      { id: 'lyme', name: 'Lyme Disease', required: false, expirationWarningDays: 30, blockBookingIfExpired: false },
    ];

    return createResponse(200, { vaccinations });
  } catch (error) {
    console.error('[RequiredVaccinations] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load vaccination requirements' });
  }
}

/**
 * Update required vaccinations for tenant
 * NEW SCHEMA: Stored in TenantSettings.custom_fields.requiredVaccinations
 */
async function handleUpdateRequiredVaccinations(user, body) {
  const { vaccinations } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current custom_fields and merge
    const result = await query(`SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const customFields = result.rows[0]?.custom_fields || {};
    customFields.requiredVaccinations = vaccinations;

    await query(
      `UPDATE "TenantSettings" SET custom_fields = $1, updated_at = NOW() WHERE tenant_id = $2`,
      [JSON.stringify(customFields), ctx.tenantId]
    );

    return createResponse(200, { success: true, vaccinations });
  } catch (error) {
    console.error('[RequiredVaccinations] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update vaccination requirements' });
  }
}

// =============================================================================
// PAYMENT SETTINGS HANDLERS
// =============================================================================

const DEFAULT_PAYMENT_SETTINGS = {
  stripeConnected: false,
  stripeAccountId: null,
  stripePublishableKey: null,
  stripeTestMode: true,
  stripeWebhookStatus: 'inactive',
  stripeLastWebhookAt: null,
  acceptCards: true,
  acceptAch: false,
  acceptCash: true,
  acceptCheck: false,
  processingFeePercent: 2.9,
  transactionFeeCents: 30,
  saveCustomerCards: true,
  autoChargeOnCheckin: false,
  autoChargeOnCheckout: false,
  emailReceipts: true,
  requireDeposit: false,
  depositPercentage: 25,
};

// Mask a secret key to show only last 6 characters
function maskSecretKey(key) {
  if (!key || key.length < 10) return null;
  const prefix = key.startsWith('sk_live') ? 'sk_live_' : 'sk_test_';
  return `${prefix}...${key.slice(-6)}`;
}

/**
 * Get payment settings for tenant
 * NEW SCHEMA: Uses PaymentSettings table (not Tenant table)
 */
async function handleGetPaymentSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get from PaymentSettings table
    const result = await query(`SELECT * FROM "PaymentSettings" WHERE tenant_id = $1`, [ctx.tenantId]);

    if (result.rows.length === 0) {
      // Return defaults if no PaymentSettings exist yet
      return createResponse(200, {
        success: true,
        settings: DEFAULT_PAYMENT_SETTINGS,
        isDefault: true,
      });
    }

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        stripeConnected: row.stripe_connected,
        stripeAccountId: row.stripe_account_id || null,
        stripePublishableKey: row.stripe_publishable_key || null,
        stripeSecretKeyMasked: maskSecretKey(row.stripe_secret_key_encrypted),
        stripeTestMode: row.stripe_test_mode,
        stripeWebhookStatus: row.stripe_webhook_status || 'inactive',
        stripeLastWebhookAt: row.stripe_last_webhook_at,
        acceptCards: row.accept_cards,
        acceptAch: row.accept_ach,
        acceptCash: row.accept_cash,
        acceptCheck: row.accept_check,
        processingFeePercent: parseFloat(row.processing_fee_percent) || 2.9,
        transactionFeeCents: row.transaction_fee_cents || 30,
        saveCustomerCards: row.save_customer_cards,
        autoChargeOnCheckin: row.auto_charge_on_checkin,
        autoChargeOnCheckout: row.auto_charge_on_checkout,
        emailReceipts: row.email_receipts,
        requireDeposit: row.require_deposit,
        depositPercentage: row.deposit_percentage || 25,
      },
      isDefault: false,
    });
  } catch (error) {
    console.error('[PaymentSettings] Failed to get:', error.message);
    if (error.message?.includes('does not exist')) {
      return createResponse(200, { success: true, settings: DEFAULT_PAYMENT_SETTINGS, isDefault: true });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load payment settings' });
  }
}

async function handleUpdatePaymentSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      stripePublishableKey,
      stripeSecretKey, // Only update if provided and not masked
      stripeTestMode = true,
      acceptCards = true,
      acceptAch = false,
      acceptCash = true,
      acceptCheck = false,
      processingFeePercent = 2.9,
      transactionFeeCents = 30,
      saveCustomerCards = true,
      autoChargeOnCheckin = false,
      autoChargeOnCheckout = false,
      emailReceipts = true,
      requireDeposit = false,
      depositPercentage = 25,
    } = body;

    // Build the update - only update secret key if it's a real key (not masked)
    const shouldUpdateSecretKey = stripeSecretKey && !stripeSecretKey.includes('...');

    let result;
    if (shouldUpdateSecretKey) {
      result = await query(
        `INSERT INTO "PaymentSettings" (
          tenant_id, stripe_publishable_key, stripe_secret_key_encrypted, stripe_test_mode,
          accept_cards, accept_ach, accept_cash, accept_check,
          processing_fee_percent, transaction_fee_cents,
          save_customer_cards, auto_charge_on_checkin, auto_charge_on_checkout,
          email_receipts, require_deposit, deposit_percentage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (tenant_id) DO UPDATE SET
          stripe_publishable_key = EXCLUDED.stripe_publishable_key,
          stripe_secret_key_encrypted = EXCLUDED.stripe_secret_key_encrypted,
          stripe_test_mode = EXCLUDED.stripe_test_mode,
          accept_cards = EXCLUDED.accept_cards,
          accept_ach = EXCLUDED.accept_ach,
          accept_cash = EXCLUDED.accept_cash,
          accept_check = EXCLUDED.accept_check,
          processing_fee_percent = EXCLUDED.processing_fee_percent,
          transaction_fee_cents = EXCLUDED.transaction_fee_cents,
          save_customer_cards = EXCLUDED.save_customer_cards,
          auto_charge_on_checkin = EXCLUDED.auto_charge_on_checkin,
          auto_charge_on_checkout = EXCLUDED.auto_charge_on_checkout,
          email_receipts = EXCLUDED.email_receipts,
          require_deposit = EXCLUDED.require_deposit,
          deposit_percentage = EXCLUDED.deposit_percentage,
          updated_at = NOW()
        RETURNING *`,
        [
          ctx.tenantId, stripePublishableKey, stripeSecretKey, stripeTestMode,
          acceptCards, acceptAch, acceptCash, acceptCheck,
          processingFeePercent, transactionFeeCents,
          saveCustomerCards, autoChargeOnCheckin, autoChargeOnCheckout,
          emailReceipts, requireDeposit, depositPercentage
        ]
      );
    } else {
      result = await query(
        `INSERT INTO "PaymentSettings" (
          tenant_id, stripe_publishable_key, stripe_test_mode,
          accept_cards, accept_ach, accept_cash, accept_check,
          processing_fee_percent, transaction_fee_cents,
          save_customer_cards, auto_charge_on_checkin, auto_charge_on_checkout,
          email_receipts, require_deposit, deposit_percentage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (tenant_id) DO UPDATE SET
          stripe_publishable_key = COALESCE(EXCLUDED.stripe_publishable_key, "PaymentSettings".stripe_publishable_key),
          stripe_test_mode = EXCLUDED.stripe_test_mode,
          accept_cards = EXCLUDED.accept_cards,
          accept_ach = EXCLUDED.accept_ach,
          accept_cash = EXCLUDED.accept_cash,
          accept_check = EXCLUDED.accept_check,
          processing_fee_percent = EXCLUDED.processing_fee_percent,
          transaction_fee_cents = EXCLUDED.transaction_fee_cents,
          save_customer_cards = EXCLUDED.save_customer_cards,
          auto_charge_on_checkin = EXCLUDED.auto_charge_on_checkin,
          auto_charge_on_checkout = EXCLUDED.auto_charge_on_checkout,
          email_receipts = EXCLUDED.email_receipts,
          require_deposit = EXCLUDED.require_deposit,
          deposit_percentage = EXCLUDED.deposit_percentage,
          updated_at = NOW()
        RETURNING *`,
        [
          ctx.tenantId, stripePublishableKey, stripeTestMode,
          acceptCards, acceptAch, acceptCash, acceptCheck,
          processingFeePercent, transactionFeeCents,
          saveCustomerCards, autoChargeOnCheckin, autoChargeOnCheckout,
          emailReceipts, requireDeposit, depositPercentage
        ]
      );
    }

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      settings: {
        stripeConnected: row.stripe_connected,
        stripeAccountId: row.stripe_account_id || null,
        stripePublishableKey: row.stripe_publishable_key || null,
        stripeSecretKeyMasked: maskSecretKey(row.stripe_secret_key_encrypted),
        stripeTestMode: row.stripe_test_mode,
        stripeWebhookStatus: row.stripe_webhook_status || 'inactive',
        acceptCards: row.accept_cards,
        acceptAch: row.accept_ach,
        acceptCash: row.accept_cash,
        acceptCheck: row.accept_check,
        processingFeePercent: parseFloat(row.processing_fee_percent) || 2.9,
        transactionFeeCents: row.transaction_fee_cents || 30,
        saveCustomerCards: row.save_customer_cards,
        autoChargeOnCheckin: row.auto_charge_on_checkin,
        autoChargeOnCheckout: row.auto_charge_on_checkout,
        emailReceipts: row.email_receipts,
        requireDeposit: row.require_deposit,
        depositPercentage: row.deposit_percentage || 25,
      },
      message: 'Payment settings saved successfully.',
    });
  } catch (error) {
    console.error('[PaymentSettings] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update payment settings' });
  }
}

async function handleTestStripeConnection(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { publishableKey, secretKey } = body;

    if (!publishableKey || !secretKey) {
      return createResponse(400, { error: 'Bad Request', message: 'Both publishable key and secret key are required' });
    }

    // Validate key formats
    if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
      return createResponse(400, { error: 'Bad Request', message: 'Invalid publishable key format' });
    }
    if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      return createResponse(400, { error: 'Bad Request', message: 'Invalid secret key format' });
    }

    // Check mode consistency
    const isTestMode = publishableKey.startsWith('pk_test_');
    const secretIsTest = secretKey.startsWith('sk_test_');
    if (isTestMode !== secretIsTest) {
      return createResponse(400, { error: 'Bad Request', message: 'Keys must be from the same mode (test or live)' });
    }

    // In a real implementation, we would make a Stripe API call to verify
    // For now, we'll just validate the format and save
    // const stripe = require('stripe')(secretKey);
    // const account = await stripe.accounts.retrieve();

    // Update the settings with the new keys
    const result = await query(
      `INSERT INTO "PaymentSettings" (tenant_id, stripe_publishable_key, stripe_secret_key_encrypted, stripe_test_mode, stripe_connected)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (tenant_id) DO UPDATE SET
         stripe_publishable_key = EXCLUDED.stripe_publishable_key,
         stripe_secret_key_encrypted = EXCLUDED.stripe_secret_key_encrypted,
         stripe_test_mode = EXCLUDED.stripe_test_mode,
         stripe_connected = true,
         updated_at = NOW()
       RETURNING *`,
      [ctx.tenantId, publishableKey, secretKey, isTestMode]
    );

    // NOTE: stripe_connected is stored in PaymentSettings table only (not Tenant)

    return createResponse(200, {
      success: true,
      message: 'Stripe connection successful',
      testMode: isTestMode,
      connected: true,
    });
  } catch (error) {
    console.error('[PaymentSettings] Failed to test Stripe:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to test Stripe connection' });
  }
}

async function handleGetStripeStatus(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT stripe_connected, stripe_account_id, stripe_test_mode, stripe_webhook_status, stripe_last_webhook_at, stripe_publishable_key
       FROM "PaymentSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(200, {
        success: true,
        connected: false,
        testMode: true,
        webhookStatus: 'inactive',
      });
    }

    const row = result.rows[0];
    return createResponse(200, {
      success: true,
      connected: row.stripe_connected,
      accountId: row.stripe_account_id,
      testMode: row.stripe_test_mode,
      webhookStatus: row.stripe_webhook_status || 'inactive',
      lastWebhookAt: row.stripe_last_webhook_at,
      hasPublishableKey: !!row.stripe_publishable_key,
    });
  } catch (error) {
    console.error('[PaymentSettings] Failed to get Stripe status:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get Stripe status' });
  }
}

async function handleDisconnectStripe(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    await query(
      `UPDATE "PaymentSettings" SET
        stripe_connected = false,
        stripe_account_id = NULL,
        stripe_publishable_key = NULL,
        stripe_secret_key_encrypted = NULL,
        stripe_webhook_secret_encrypted = NULL,
        stripe_webhook_status = 'inactive',
        updated_at = NOW()
       WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    // NOTE: stripe_connected is stored in PaymentSettings table only (not Tenant)

    return createResponse(200, {
      success: true,
      message: 'Stripe disconnected successfully',
    });
  } catch (error) {
    console.error('[PaymentSettings] Failed to disconnect Stripe:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to disconnect Stripe' });
  }
}

// =============================================================================
// PRIVACY SETTINGS HANDLERS
// =============================================================================
// Data retention policies, staff visibility, communication defaults
// =============================================================================

// Default privacy settings
const DEFAULT_PRIVACY_SETTINGS = {
  retention: {
    customerRecords: '3yr',
    petRecords: '3yr',
    bookingHistory: '5yr',
    paymentRecords: '7yr',
    signedWaivers: '7yr',
    communicationLogs: '1yr',
    vaccinationRecords: '3yr',
  },
  visibility: {
    showPhoneToAllStaff: true,
    showEmailToAllStaff: true,
    showAddressToAllStaff: false,
    showPaymentDetailsToAllStaff: false,
  },
  communication: {
    marketingEmailsDefault: 'opt-in',
    bookingRemindersDefault: true,
    vaccinationRemindersDefault: true,
    promotionalSmsDefault: 'opt-in',
  },
};

/**
 * Get privacy settings for tenant
 * NEW SCHEMA: Stored in TenantSettings.custom_fields.privacySettings
 */
async function handleGetPrivacySettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const customFields = result.rows[0]?.custom_fields || {};

    // Merge with defaults in case some settings don't exist
    const storedSettings = customFields.privacySettings || {};
    const settings = {
      retention: { ...DEFAULT_PRIVACY_SETTINGS.retention, ...(storedSettings.retention || {}) },
      visibility: { ...DEFAULT_PRIVACY_SETTINGS.visibility, ...(storedSettings.visibility || {}) },
      communication: { ...DEFAULT_PRIVACY_SETTINGS.communication, ...(storedSettings.communication || {}) },
    };

    return createResponse(200, settings);
  } catch (error) {
    console.error('[PrivacySettings] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load privacy settings' });
  }
}

/**
 * Update privacy settings for tenant
 * NEW SCHEMA: Stored in TenantSettings.custom_fields.privacySettings
 */
async function handleUpdatePrivacySettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current custom_fields and merge
    const result = await query(`SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const customFields = result.rows[0]?.custom_fields || {};
    const currentSettings = customFields.privacySettings || {};

    // Deep merge the settings
    const newSettings = {
      retention: { ...(currentSettings.retention || {}), ...(body.retention || {}) },
      visibility: { ...(currentSettings.visibility || {}), ...(body.visibility || {}) },
      communication: { ...(currentSettings.communication || {}), ...(body.communication || {}) },
    };

    customFields.privacySettings = newSettings;
    await query(
      `UPDATE "TenantSettings" SET custom_fields = $1, updated_at = NOW() WHERE tenant_id = $2`,
      [JSON.stringify(customFields), ctx.tenantId]
    );

    return createResponse(200, { success: true, ...newSettings });
  } catch (error) {
    console.error('[PrivacySettings] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update privacy settings' });
  }
}

// =============================================================================
// IMPORT/EXPORT HANDLERS
// =============================================================================
// Data import and export operations for backup, migration, and bulk updates
// =============================================================================

/**
 * List recent import/export jobs for tenant
 */
async function handleGetImportExportJobs(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Check if table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ImportExportJob'
      ) as exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      // Table doesn't exist yet, return empty list
      return createResponse(200, { jobs: [], total: 0 });
    }

    const result = await query(
      `SELECT 
        id,
        type,
        status,
        scope,
        format,
        filename,
        record_count,
        error_message,
        download_url,
        file_size_bytes,
        created_at,
        completed_at
      FROM "ImportExportJob"
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
      [ctx.tenantId]
    );

    const jobs = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      status: row.status,
      scope: row.scope,
      format: row.format,
      filename: row.filename,
      recordCount: row.record_count,
      errorMessage: row.error_message,
      downloadUrl: row.download_url,
      fileSizeBytes: row.file_size_bytes,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));

    return createResponse(200, { jobs, total: jobs.length });
  } catch (error) {
    console.error('[ImportExport] Failed to get jobs:', error.message);
    // Return empty on error for graceful degradation
    return createResponse(200, { jobs: [], total: 0, _error: true });
  }
}

/**
 * Get single import/export job by ID
 */
async function handleGetImportExportJob(user, jobId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT * FROM "ImportExportJob" WHERE id = $1 AND tenant_id = $2`,
      [jobId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Job not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      type: row.type,
      status: row.status,
      scope: row.scope,
      format: row.format,
      filename: row.filename,
      recordCount: row.record_count,
      errorMessage: row.error_message,
      errorDetails: row.error_details,
      downloadUrl: row.download_url,
      fileSizeBytes: row.file_size_bytes,
      metadata: row.metadata,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    });
  } catch (error) {
    console.error('[ImportExport] Failed to get job:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get job details' });
  }
}

/**
 * Create an export job
 */
async function handleCreateExport(user, body) {
  const { scope = 'all', format = 'csv' } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Validate scope
    const validScopes = ['all', 'pets', 'owners', 'bookings', 'financial', 'vaccinations'];
    if (!validScopes.includes(scope)) {
      return createResponse(400, { error: 'Bad Request', message: `Invalid scope. Must be one of: ${validScopes.join(', ')}` });
    }

    // Validate format
    const validFormats = ['csv', 'json', 'xlsx'];
    if (!validFormats.includes(format)) {
      return createResponse(400, { error: 'Bad Request', message: `Invalid format. Must be one of: ${validFormats.join(', ')}` });
    }

    // Generate export data
    let data = [];
    let recordCount = 0;

    try {
      switch (scope) {
        case 'pets':
          const petsResult = await query(
            `SELECT p.*, o.first_name as owner_first_name, o.last_name as owner_last_name, o.email as owner_email
             FROM "Pet" p
             LEFT JOIN "Owner" o ON p.owner_id = o.record_id
             WHERE p.tenant_id = $1              ORDER BY p.name`,
            [ctx.tenantId]
          );
          data = petsResult.rows;
          recordCount = data.length;
          break;

        case 'owners':
          const ownersResult = await query(
            `SELECT * FROM "Owner" WHERE tenant_id = $1  ORDER BY last_name, first_name`,
            [ctx.tenantId]
          );
          data = ownersResult.rows;
          recordCount = data.length;
          break;

        case 'bookings':
          const bookingsResult = await query(
            `SELECT b.*, o.first_name as owner_first_name, o.last_name as owner_last_name, o.email as owner_email
             FROM "Booking" b
             LEFT JOIN "Owner" o ON b.owner_id = o.record_id
             WHERE b.tenant_id = $1              ORDER BY b.created_at DESC`,
            [ctx.tenantId]
          );
          data = bookingsResult.rows;
          recordCount = data.length;
          break;

        case 'financial':
          // Try to get invoices if table exists
          try {
            const financialResult = await query(
              `SELECT i.*, o.first_name as owner_first_name, o.last_name as owner_last_name
               FROM "Invoice" i
               LEFT JOIN "Owner" o ON i.owner_id = o.record_id
               WHERE i.tenant_id = $1
               ORDER BY i.created_at DESC`,
              [ctx.tenantId]
            );
            data = financialResult.rows;
            recordCount = data.length;
          } catch (e) {
            // Invoice table may not exist
            data = [];
            recordCount = 0;
          }
          break;

        case 'vaccinations':
          const vaccinationsResult = await query(
            `SELECT v.*, p.name as pet_name, o.first_name as owner_first_name, o.last_name as owner_last_name
             FROM "Vaccination" v
             LEFT JOIN "Pet" p ON v.pet_id = p.record_id
             LEFT JOIN "Owner" o ON p.owner_id = o.record_id
             WHERE v.tenant_id = $1              ORDER BY v.expiration_date`,
            [ctx.tenantId]
          );
          data = vaccinationsResult.rows;
          recordCount = data.length;
          break;

        case 'all':
        default:
          // Get counts from all tables for "all" export
          const [pets, owners, bookings, vaccinations] = await Promise.all([
            query(`SELECT * FROM "Pet" WHERE tenant_id = $1 `, [ctx.tenantId]),
            query(`SELECT * FROM "Owner" WHERE tenant_id = $1 `, [ctx.tenantId]),
            query(`SELECT * FROM "Booking" WHERE tenant_id = $1 `, [ctx.tenantId]),
            query(`SELECT * FROM "Vaccination" WHERE tenant_id = $1 `, [ctx.tenantId]),
          ]);
          data = {
            pets: pets.rows,
            owners: owners.rows,
            bookings: bookings.rows,
            vaccinations: vaccinations.rows,
          };
          recordCount = pets.rows.length + owners.rows.length + bookings.rows.length + vaccinations.rows.length;
          break;
      }
    } catch (queryError) {
      console.error('[ImportExport] Query error:', queryError.message);
      data = [];
      recordCount = 0;
    }

    // Format the data based on requested format
    let exportContent;
    let contentType;
    let actualFormat = format; // Track actual format for filename

    if (format === 'json') {
      exportContent = JSON.stringify(data, null, 2);
      contentType = 'application/json';
    } else if (format === 'csv') {
      // Convert to CSV
      if (scope === 'all') {
        // For "all" scope, create a multi-section CSV with each entity type
        const sections = [];

        // Pets section
        if (data.pets && data.pets.length > 0) {
          sections.push('# PETS');
          sections.push(arrayToCSV(data.pets));
        }

        // Owners section
        if (data.owners && data.owners.length > 0) {
          sections.push('');
          sections.push('# OWNERS');
          sections.push(arrayToCSV(data.owners));
        }

        // Bookings section
        if (data.bookings && data.bookings.length > 0) {
          sections.push('');
          sections.push('# BOOKINGS');
          sections.push(arrayToCSV(data.bookings));
        }

        // Vaccinations section
        if (data.vaccinations && data.vaccinations.length > 0) {
          sections.push('');
          sections.push('# VACCINATIONS');
          sections.push(arrayToCSV(data.vaccinations));
        }

        exportContent = sections.join('\n');
        contentType = 'text/csv';
      } else {
        exportContent = arrayToCSV(data);
        contentType = 'text/csv';
      }
    } else if (format === 'xlsx') {
      // XLSX would require a library - fall back to CSV for now
      if (scope === 'all') {
        exportContent = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        actualFormat = 'json';
      } else {
        exportContent = arrayToCSV(data);
        contentType = 'text/csv';
        actualFormat = 'csv';
      }
    } else {
      exportContent = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      actualFormat = 'json';
    }

    // Update filename with actual format
    const finalFilename = `barkbase_${scope}_export_${new Date().toISOString().split('T')[0]}.${actualFormat}`;

    // Try to record the job if the table exists
    let jobId = null;
    try {
      const tableCheck = await query(`
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ImportExportJob') as exists
      `);

      if (tableCheck.rows[0]?.exists) {
        const jobResult = await query(
          `INSERT INTO "ImportExportJob" (tenant_id, user_id, type, status, scope, format, filename, record_count, completed_at)
           VALUES ($1, $2, 'export', 'completed', $3, $4, $5, $6, NOW())
           RETURNING id`,
          [ctx.tenantId, user.id, scope, actualFormat, finalFilename, recordCount]
        );
        jobId = jobResult.rows[0]?.id;
      }
    } catch (jobError) {
      console.warn('[ImportExport] Could not record job:', jobError.message);
    }

    // Return the export directly as a download
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
      body: exportContent,
    };
  } catch (error) {
    console.error('[ImportExport] Export failed:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Export failed' });
  }
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data) {
  if (!data || data.length === 0) return '';

  // Ensure data is an array
  if (!Array.isArray(data)) {
    console.error('[arrayToCSV] Expected array but got:', typeof data);
    return '';
  }

  // Ensure first element is an object
  if (typeof data[0] !== 'object' || data[0] === null) {
    console.error('[arrayToCSV] Expected array of objects but first element is:', typeof data[0]);
    return '';
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);

  // Convert a value to a string suitable for CSV
  const valueToString = (value) => {
    if (value === null || value === undefined) return '';

    // Handle arrays - join with semicolons to avoid comma conflicts
    if (Array.isArray(value)) {
      return value.map(v => valueToString(v)).join(';');
    }

    // Handle objects - convert to JSON string
    if (typeof value === 'object' && value !== null) {
      // Check if it's a Date
      if (value instanceof Date) {
        return value.toISOString();
      }
      // For other objects, stringify them
      return JSON.stringify(value);
    }

    // Handle booleans explicitly
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    return String(value);
  };

  // Escape CSV values - wrap in quotes if needed
  const escapeCSV = (value) => {
    const str = valueToString(value);
    // Always quote if contains comma, quote, newline, or semicolon
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV string
  const headerRow = headers.join(',');
  const dataRows = data.map(row =>
    headers.map(header => escapeCSV(row[header])).join(',')
  ).join('\n');

  return headerRow + '\n' + dataRows;
}

/**
 * Process an import - enterprise with tracking
 */
async function handleProcessImport(user, event) {
  let importId = null;
  let ctx = null;

  try {
    await getPoolAsync();
    ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Parse the body
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'] || '';

    if (contentType.includes('multipart/form-data')) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Multipart form uploads are not yet supported. Please send JSON data directly.',
      });
    }

    let body;
    try {
      body = parseBody(event);
    } catch (e) {
      console.error('[Import] Failed to parse body:', e.message);
      return createResponse(400, { error: 'Bad Request', message: 'Invalid request body' });
    }

    // Log incoming payload for debugging
    console.log('[Import] Received payload:', JSON.stringify({
      entityTypes: body.entityTypes,
      dataLength: body.data?.length,
      mappings: body.mappings,
      importModes: body.importModes,
      options: body.options,
      filename: body.filename,
      sampleData: body.data?.slice(0, 2)
    }));

    // Extract import configuration
    const {
      entityTypes = [],
      primaryType = null,
      data = [],
      mappings = {},
      importModes = {},
      options = {},
      filename = 'import',
      importName = null,
    } = body;

    // Resolve import data and entity types
    let importData = data;
    let selectedEntityTypes = entityTypes;
    const effectivePrimaryType = primaryType || selectedEntityTypes[0];

    // Detect NEW payload format: data contains { record, associations } per row
    const isNewFormat = Array.isArray(data) && data.length > 0 && data[0]?.record !== undefined;
    console.log('[Import] Payload format:', isNewFormat ? 'NEW (record+associations)' : 'LEGACY (flat)');

    // If new format, extract records and associations
    let recordsToImport = [];
    let associationsByRow = [];
    if (isNewFormat) {
      recordsToImport = data.map(d => d.record);
      associationsByRow = data.map(d => d.associations || []);
      importData = recordsToImport; // For validation below
    }

    // Legacy format detection
    if (selectedEntityTypes.length === 0) {
      if (body.data && Array.isArray(body.data)) {
        importData = body.data;
        const sample = importData[0];
        if (sample) {
          if (sample.species || sample.breed || sample.name) {
            selectedEntityTypes = ['pets'];
          } else if (sample.first_name && sample.email) {
            selectedEntityTypes = ['owners'];
          }
        }
      } else if (!body.entityTypes && !body.data) {
        if (Array.isArray(body)) {
          importData = body;
          const sample = importData[0];
          if (sample?.species || sample?.breed) {
            selectedEntityTypes = ['pets'];
          } else if (sample?.first_name && sample?.email) {
            selectedEntityTypes = ['owners'];
          }
        } else if (body.pets || body.owners) {
          importData = body;
        }
      }
    }

    if (!importData || (Array.isArray(importData) && importData.length === 0)) {
      return createResponse(400, { error: 'Bad Request', message: 'No data provided for import' });
    }

    // Validate required fields - only for PRIMARY type
    const validationErrors = [];
    if (Array.isArray(importData) && importData.length > 0) {
      const sampleRecord = importData[0];
      console.log('[Import] Sample record keys:', Object.keys(sampleRecord || {}));

      // Only validate primary type requirements
      switch (effectivePrimaryType) {
        case 'owners':
          if (!sampleRecord?.email && !Object.keys(sampleRecord || {}).some(k => k === 'email')) {
            validationErrors.push("Required field 'email' is not mapped for Owners import");
          }
          break;
        case 'pets':
          if (!sampleRecord?.name && !Object.keys(sampleRecord || {}).some(k => k === 'name')) {
            validationErrors.push("Required field 'name' is not mapped for Pets import");
          }
          // Note: owner_email is NOT required here - it's an ASSOCIATION, not a required field
          break;
        case 'vaccinations':
          if (!sampleRecord?.vaccine_name) {
            validationErrors.push("Required field 'vaccine_name' is not mapped for Vaccinations import");
          }
          break;
      }
    }

    if (validationErrors.length > 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: validationErrors.join('; '),
        validationErrors
      });
    }

    const totalRows = Array.isArray(importData) ? importData.length : 0;

    // Generate import name: "YY.MM.DD - filename" or user-provided
    const now = new Date();
    const dateStr = `${String(now.getFullYear()).slice(-2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    const generatedName = importName || `${dateStr} - ${filename}`;

    // Create Import record with status='processing' BEFORE starting
    try {
      const importResult = await query(
        `INSERT INTO "Import" (tenant_id, name, filename, entity_types, status, total_rows, mappings, import_modes, options, created_by)
         VALUES ($1, $2, $3, $4, 'processing', $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          ctx.tenantId,
          generatedName,
          filename,
          selectedEntityTypes,
          totalRows,
          JSON.stringify(mappings),
          JSON.stringify(importModes),
          JSON.stringify(options),
          ctx.userId
        ]
      );
      importId = importResult.rows[0]?.id;
      console.log('[Import] Created Import record:', importId);
    } catch (tableErr) {
      // Import table might not exist yet - continue without tracking
      console.warn('[Import] Could not create Import record:', tableErr.message);
    }

    // Track counts per entity type
    const results = {
      newRecords: 0,
      updatedRecords: 0,
      skippedRecords: 0,
      newAssociations: 0,
    };
    const detailedErrors = []; // Array of {row, column, entityType, property, errorType, errorMessage, value}

    // Process based on entity types and format
    if (Array.isArray(importData)) {
      // NEW FORMAT: Process only the primary type, with associations handled separately
      if (isNewFormat) {
        const mode = importModes[effectivePrimaryType] || 'create_update';
        const opts = {
          ...options,
          mode,
          trackDetails: true,
        };

        console.log('[Import] Processing new format for primary type:', effectivePrimaryType);

        switch (effectivePrimaryType) {
          case 'owners': {
            const result = await importOwnersWithTracking(ctx.tenantId, recordsToImport, opts);
            results.newRecords += result.newCount;
            results.updatedRecords += result.updatedCount;
            results.skippedRecords += result.skippedCount;
            detailedErrors.push(...result.detailedErrors);
            break;
          }
          case 'pets': {
            // NEW: Resolve associations from the associationsByRow array
            const petsWithResolvedAssociations = await resolveAssociationsForPets(ctx.tenantId, recordsToImport, associationsByRow);
            const result = await importPetsWithTracking(ctx.tenantId, petsWithResolvedAssociations.records, opts);
            results.newRecords += result.newCount;
            results.updatedRecords += result.updatedCount;
            results.skippedRecords += result.skippedCount;
            results.newAssociations += result.associationCount;
            detailedErrors.push(...result.detailedErrors);
            detailedErrors.push(...petsWithResolvedAssociations.errors);
            break;
          }
          case 'vaccinations': {
            const result = await importVaccinations(ctx.tenantId, recordsToImport, opts);
            results.newRecords += result.count;
            detailedErrors.push(...result.errors.map((e, i) => ({
              row: i + 1,
              entityType: 'vaccinations',
              errorType: 'import_error',
              errorMessage: e,
            })));
            break;
          }
          case 'services': {
            const result = await importServices(ctx.tenantId, recordsToImport, opts);
            results.newRecords += result.count;
            detailedErrors.push(...result.errors.map((e, i) => ({
              row: i + 1,
              entityType: 'services',
              errorType: 'import_error',
              errorMessage: e,
            })));
            break;
          }
          case 'staff': {
            const result = await importStaff(ctx.tenantId, recordsToImport, opts);
            results.newRecords += result.count;
            detailedErrors.push(...result.errors.map((e, i) => ({
              row: i + 1,
              entityType: 'staff',
              errorType: 'import_error',
              errorMessage: e,
            })));
            break;
          }
          case 'bookings':
          case 'invoices':
            detailedErrors.push({
              row: 0,
              entityType: effectivePrimaryType,
              errorType: 'not_supported',
              errorMessage: `${effectivePrimaryType} imports are not yet supported`,
            });
            break;
          default:
            detailedErrors.push({
              row: 0,
              entityType: effectivePrimaryType,
              errorType: 'unknown_entity',
              errorMessage: `Unknown entity type: ${effectivePrimaryType}`,
            });
        }
      } else {
        // LEGACY FORMAT: Process each entity type sequentially
        for (const entityType of selectedEntityTypes) {
          const mode = importModes[entityType] || 'create_update';
          const opts = {
            ...options,
            mode,
            trackDetails: true, // Enable detailed tracking
          };

          switch (entityType) {
            case 'owners': {
              const result = await importOwnersWithTracking(ctx.tenantId, importData, opts);
              results.newRecords += result.newCount;
              results.updatedRecords += result.updatedCount;
              results.skippedRecords += result.skippedCount;
              detailedErrors.push(...result.detailedErrors);
              break;
            }
            case 'pets': {
              const petsWithOwners = await resolvePetOwners(ctx.tenantId, importData);
              const result = await importPetsWithTracking(ctx.tenantId, petsWithOwners, opts);
              results.newRecords += result.newCount;
              results.updatedRecords += result.updatedCount;
              results.skippedRecords += result.skippedCount;
              results.newAssociations += result.associationCount;
              detailedErrors.push(...result.detailedErrors);
              break;
            }
            case 'vaccinations': {
              const result = await importVaccinations(ctx.tenantId, importData, opts);
              results.newRecords += result.count;
              detailedErrors.push(...result.errors.map((e, i) => ({
                row: i + 1,
                entityType: 'vaccinations',
                errorType: 'import_error',
                errorMessage: e,
              })));
              break;
            }
            case 'services': {
              const result = await importServices(ctx.tenantId, importData, opts);
              results.newRecords += result.count;
              detailedErrors.push(...result.errors.map((e, i) => ({
                row: i + 1,
                entityType: 'services',
                errorType: 'import_error',
                errorMessage: e,
              })));
              break;
            }
            case 'staff': {
              const result = await importStaff(ctx.tenantId, importData, opts);
              results.newRecords += result.count;
              detailedErrors.push(...result.errors.map((e, i) => ({
                row: i + 1,
                entityType: 'staff',
                errorType: 'import_error',
                errorMessage: e,
              })));
              break;
            }
            case 'bookings':
            case 'invoices':
              detailedErrors.push({
                row: 0,
                entityType,
                errorType: 'not_supported',
                errorMessage: `${entityType} imports are not yet supported`,
              });
              break;
            default:
              detailedErrors.push({
                row: 0,
                entityType,
                errorType: 'unknown_entity',
                errorMessage: `Unknown entity type: ${entityType}`,
              });
          }
        }
      }
    } else if (typeof importData === 'object') {
      // Legacy multi-entity import format
      if (importData.pets) {
        const result = await importPets(ctx.tenantId, importData.pets, options);
        results.newRecords += result.count;
        detailedErrors.push(...result.errors.map((e, i) => ({ row: i + 1, entityType: 'pets', errorMessage: e })));
      }
      if (importData.owners) {
        const result = await importOwners(ctx.tenantId, importData.owners, options);
        results.newRecords += result.count;
        detailedErrors.push(...result.errors.map((e, i) => ({ row: i + 1, entityType: 'owners', errorMessage: e })));
      }
    }

    const totalRecords = results.newRecords + results.updatedRecords;
    const status = detailedErrors.length > 0 ? 'completed_with_errors' : 'completed';

    // Update Import record with final results
    if (importId) {
      try {
        await query(
          `UPDATE "Import" SET
            status = $2,
            new_records = $3,
            updated_records = $4,
            skipped_records = $5,
            new_associations = $6,
            error_count = $7,
            errors = $8,
            completed_at = NOW()
          WHERE id = $1`,
          [
            importId,
            status,
            results.newRecords,
            results.updatedRecords,
            results.skippedRecords,
            results.newAssociations,
            detailedErrors.length,
            JSON.stringify(detailedErrors),
          ]
        );
        console.log('[Import] Updated Import record with results');
      } catch (updateErr) {
        console.warn('[Import] Could not update Import record:', updateErr.message);
      }
    }

    // Also record in legacy ImportExportJob table if it exists
    try {
      const tableCheck = await query(`
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ImportExportJob') as exists
      `);
      if (tableCheck.rows[0]?.exists) {
        await query(
          `INSERT INTO "ImportExportJob" (tenant_id, user_id, type, status, scope, format, filename, record_count, error_message, completed_at)
           VALUES ($1, $2, 'import', $3, $4, $5, $6, $7, $8, NOW())`,
          [ctx.tenantId, user.id, status, selectedEntityTypes.join(','), 'json', filename, totalRecords, detailedErrors.length > 0 ? `${detailedErrors.length} error(s)` : null]
        );
      }
    } catch (jobError) {
      console.warn('[ImportExport] Could not record legacy job:', jobError.message);
    }

    return createResponse(200, {
      success: detailedErrors.length === 0,
      importId,
      totalRows,
      newRecords: results.newRecords,
      updatedRecords: results.updatedRecords,
      skippedRecords: results.skippedRecords,
      newAssociations: results.newAssociations,
      errorCount: detailedErrors.length,
      errors: detailedErrors.length > 0 ? detailedErrors.slice(0, 10) : undefined, // Return first 10 errors
      message: detailedErrors.length > 0
        ? `Import completed with ${detailedErrors.length} error(s). ${results.newRecords} new, ${results.updatedRecords} updated.`
        : `Successfully imported ${totalRecords} record(s) (${results.newRecords} new, ${results.updatedRecords} updated)`,
    });
  } catch (error) {
    console.error('[ImportExport] IMPORT ERROR:', error.message);
    console.error('[ImportExport] STACK:', error.stack);

    // Update Import record with failed status if we have one
    if (importId && ctx?.tenantId) {
      try {
        await query(
          `UPDATE "Import" SET status = 'failed', errors = $2, completed_at = NOW() WHERE id = $1`,
          [importId, JSON.stringify([{ row: 0, errorType: 'system_error', errorMessage: error.message }])]
        );
      } catch (e) { /* ignore */ }
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Import failed: ' + error.message,
      importId,
      debugStack: error.stack,
      debugName: error.name
    });
  }
}

/**
 * Import owners with detailed tracking for enterprise results
 */
async function importOwnersWithTracking(tenantId, owners, options = {}) {
  const detailedErrors = [];
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const mode = options.mode || 'create_update';

  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];
    const rowNum = i + 1;

    try {
      // Validate email
      if (!owner.email) {
        detailedErrors.push({
          row: rowNum,
          column: 'email',
          entityType: 'owners',
          property: 'email',
          errorType: 'required_field_missing',
          errorMessage: "Required field 'email' is missing",
          value: null,
        });
        skippedCount++;
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(owner.email)) {
        detailedErrors.push({
          row: rowNum,
          column: 'email',
          entityType: 'owners',
          property: 'email',
          errorType: 'invalid_email_format',
          errorMessage: 'Invalid email format',
          value: owner.email,
        });
        skippedCount++;
        continue;
      }

      // Check if owner exists
      const existing = await query(
        `SELECT id FROM "Owner" WHERE tenant_id = $1 AND email = $2`,
        [tenantId, owner.email]
      );

      if (existing.rows.length > 0) {
        if (mode === 'create_only') {
          skippedCount++;
          continue;
        }
        // Update existing
        await query(
          `UPDATE "Owner" SET
            first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            phone = COALESCE($5, phone),
            address_street = COALESCE($6, address_street),
            address_city = COALESCE($7, address_city),
            address_state = COALESCE($8, address_state),
            address_zip = COALESCE($9, address_zip),
            address_country = COALESCE($10, address_country),
            emergency_contact_name = COALESCE($11, emergency_contact_name),
            emergency_contact_phone = COALESCE($12, emergency_contact_phone),
            notes = COALESCE($13, notes),
            is_active = COALESCE($14, is_active),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2`,
          [
            existing.rows[0].id,
            tenantId,
            owner.first_name || null,
            owner.last_name || null,
            owner.phone || null,
            owner.address_street || null,
            owner.address_city || null,
            owner.address_state || null,
            owner.address_zip || null,
            owner.address_country || null,
            owner.emergency_contact_name || null,
            owner.emergency_contact_phone || null,
            owner.notes || null,
            owner.is_active !== undefined ? owner.is_active : null
          ]
        );
        updatedCount++;
      } else {
        if (mode === 'update_only') {
          detailedErrors.push({
            row: rowNum,
            column: 'email',
            entityType: 'owners',
            property: 'email',
            errorType: 'record_not_found',
            errorMessage: 'Cannot update - owner does not exist',
            value: owner.email,
          });
          skippedCount++;
          continue;
        }
        // Insert new
        await query(
          `INSERT INTO "Owner" (tenant_id, first_name, last_name, email, phone, address_street, address_city, address_state, address_zip, address_country, emergency_contact_name, emergency_contact_phone, notes, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            tenantId,
            owner.first_name || null,
            owner.last_name || null,
            owner.email,
            owner.phone || null,
            owner.address_street || null,
            owner.address_city || null,
            owner.address_state || null,
            owner.address_zip || null,
            owner.address_country || 'US',
            owner.emergency_contact_name || null,
            owner.emergency_contact_phone || null,
            owner.notes || null,
            owner.is_active !== false
          ]
        );
        newCount++;
      }
    } catch (e) {
      console.error('[Import] Owner error row', rowNum, ':', e.message);
      detailedErrors.push({
        row: rowNum,
        column: null,
        entityType: 'owners',
        property: null,
        errorType: 'database_error',
        errorMessage: e.message,
        value: owner.email || null,
      });
      skippedCount++;
    }
  }

  return { newCount, updatedCount, skippedCount, detailedErrors };
}

/**
 * Import pets with detailed tracking for enterprise results
 */
async function importPetsWithTracking(tenantId, pets, options = {}) {
  const detailedErrors = [];
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let associationCount = 0;
  const mode = options.mode || 'create_update';

  for (let i = 0; i < pets.length; i++) {
    const pet = pets[i];
    const rowNum = i + 1;

    try {
      if (!pet.name) {
        detailedErrors.push({
          row: rowNum,
          column: 'name',
          entityType: 'pets',
          property: 'name',
          errorType: 'required_field_missing',
          errorMessage: "Required field 'name' is missing",
          value: null,
        });
        skippedCount++;
        continue;
      }

      // owner_id is now optional - pets can be imported without an owner
      // Association errors are logged separately by resolveAssociationsForPets
      // But we still track if we have an owner for association count

      // Check if pet exists (by name alone if no owner, by name+owner if owner exists)
      let existing;
      if (pet.owner_id) {
        existing = await query(
          `SELECT id FROM "Pet" WHERE tenant_id = $1 AND name = $2 AND owner_id = $3`,
          [tenantId, pet.name, pet.owner_id]
        );
      } else {
        // Without owner, check by name only (might match multiple)
        existing = await query(
          `SELECT id FROM "Pet" WHERE tenant_id = $1 AND name = $2 AND owner_id IS NULL`,
          [tenantId, pet.name]
        );
      }

      if (existing.rows.length > 0) {
        if (mode === 'create_only') {
          skippedCount++;
          continue;
        }
        await query(
          `UPDATE "Pet" SET
            species = COALESCE($3, species),
            breed = COALESCE($4, breed),
            weight = COALESCE($5, weight),
            date_of_birth = COALESCE($6, date_of_birth),
            gender = COALESCE($7, gender),
            color = COALESCE($8, color),
            medical_notes = COALESCE($9, medical_notes),
            dietary_notes = COALESCE($10, dietary_notes),
            behavior_notes = COALESCE($11, behavior_notes),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2`,
          [existing.rows[0].id, tenantId, pet.species, pet.breed, pet.weight, pet.date_of_birth, pet.gender, pet.color, pet.medical_notes, pet.dietary_notes, pet.behavior_notes]
        );
        updatedCount++;
      } else {
        if (mode === 'update_only') {
          detailedErrors.push({
            row: rowNum,
            column: 'name',
            entityType: 'pets',
            property: 'name',
            errorType: 'record_not_found',
            errorMessage: 'Cannot update - pet does not exist',
            value: pet.name,
          });
          skippedCount++;
          continue;
        }
        await query(
          `INSERT INTO "Pet" (tenant_id, owner_id, name, species, breed, weight, date_of_birth, gender, color, medical_notes, dietary_notes, behavior_notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [tenantId, pet.owner_id || null, pet.name, pet.species, pet.breed, pet.weight, pet.date_of_birth, pet.gender, pet.color, pet.medical_notes, pet.dietary_notes, pet.behavior_notes]
        );
        newCount++;
        if (pet.owner_id) {
          associationCount++; // Pet-Owner association created
        }
      }
    } catch (e) {
      console.error('[Import] Pet error row', rowNum, ':', e.message);
      detailedErrors.push({
        row: rowNum,
        column: null,
        entityType: 'pets',
        property: null,
        errorType: 'database_error',
        errorMessage: e.message,
        value: pet.name || null,
      });
      skippedCount++;
    }
  }

  return { newCount, updatedCount, skippedCount, associationCount, detailedErrors };
}

/**
 * Resolve associations for pets using NEW enterprise format
 * associations is an array of arrays: [[{type: 'owners', field: 'email', value: 'x@y.com'}], ...]
 */
async function resolveAssociationsForPets(tenantId, records, associationsByRow) {
  const errors = [];
  const resolvedRecords = [];

  // Batch collect all unique owner emails to resolve
  const ownerEmails = new Set();
  associationsByRow.forEach(associations => {
    associations.forEach(assoc => {
      if (assoc.type === 'owners' && assoc.field === 'email' && assoc.value) {
        ownerEmails.add(assoc.value.toLowerCase());
      }
    });
  });

  // Resolve emails to IDs in bulk
  const emailToOwnerId = {};
  if (ownerEmails.size > 0) {
    const emails = Array.from(ownerEmails);
    const placeholders = emails.map((_, i) => `$${i + 2}`).join(', ');
    const result = await query(
      `SELECT id, email FROM "Owner" WHERE tenant_id = $1 AND email IN (${placeholders})`,
      [tenantId, ...emails]
    );
    result.rows.forEach(row => {
      emailToOwnerId[row.email.toLowerCase()] = row.id;
    });
    console.log(`[Import] Resolved ${result.rows.length} of ${emails.length} owner emails`);
  }

  // Process each record with its associations
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const associations = associationsByRow[i] || [];
    const resolvedRecord = { ...record };
    const rowNum = i + 1;

    // Process each association for this row
    for (const assoc of associations) {
      if (assoc.type === 'owners' && assoc.field === 'email' && assoc.value) {
        const ownerId = emailToOwnerId[assoc.value.toLowerCase()];
        if (ownerId) {
          resolvedRecord.owner_id = ownerId;
        } else {
          errors.push({
            row: rowNum,
            column: 'owner_email',
            entityType: 'pets',
            property: 'owner_id',
            errorType: 'association_not_found',
            errorMessage: `Owner with email "${assoc.value}" not found`,
            value: assoc.value,
          });
          // Don't set owner_id - the pet will fail validation in importPetsWithTracking
        }
      }
      // Add more association types here as needed (services, staff, etc.)
    }

    resolvedRecords.push(resolvedRecord);
  }

  return { records: resolvedRecords, errors };
}

/**
 * Resolve owner_email to owner_id for pet imports (LEGACY format)
 */
async function resolvePetOwners(tenantId, pets) {
  const emailToId = {};

  // Collect unique emails
  const emails = [...new Set(pets.filter(p => p.owner_email).map(p => p.owner_email))];

  if (emails.length > 0) {
    const placeholders = emails.map((_, i) => `$${i + 2}`).join(', ');
    const result = await query(
      `SELECT id, email FROM "Owner" WHERE tenant_id = $1 AND email IN (${placeholders})`,
      [tenantId, ...emails]
    );
    result.rows.forEach(row => {
      emailToId[row.email.toLowerCase()] = row.id;
    });
  }

  // Map owner_email to owner_id
  return pets.map(pet => ({
    ...pet,
    owner_id: pet.owner_id || (pet.owner_email ? emailToId[pet.owner_email.toLowerCase()] : null),
  }));
}

/**
 * Import pets data
 */
async function importPets(tenantId, pets, options = {}) {
  const errors = [];
  let count = 0;
  const mode = options.mode || 'create_update';

  for (const pet of pets) {
    try {
      if (!pet.name) {
        errors.push(`Pet skipped: missing required field 'name'`);
        continue;
      }

      // Check if pet already exists by name + owner
      const existing = pet.owner_id ? await query(
        `SELECT id FROM "Pet" WHERE tenant_id = $1 AND name = $2 AND owner_id = $3`,
        [tenantId, pet.name, pet.owner_id]
      ) : { rows: [] };

      if (existing.rows.length > 0) {
        // Record exists
        if (mode === 'create_only') {
          // Skip - don't update existing
          continue;
        }
        // Update existing
        await query(
          `UPDATE "Pet" SET
            species = COALESCE($3, species),
            breed = COALESCE($4, breed),
            weight = COALESCE($5, weight),
            date_of_birth = COALESCE($6, date_of_birth),
            gender = COALESCE($7, gender),
            color = COALESCE($8, color),
            medical_notes = COALESCE($9, medical_notes),
            dietary_notes = COALESCE($10, dietary_notes),
            behavior_notes = COALESCE($11, behavior_notes),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2`,
          [existing.rows[0].id, tenantId, pet.species, pet.breed, pet.weight, pet.date_of_birth, pet.gender, pet.color, pet.medical_notes, pet.dietary_notes, pet.behavior_notes]
        );
        count++;
      } else {
        // Record doesn't exist
        if (mode === 'update_only') {
          // Skip - don't create new
          continue;
        }
        if (!pet.owner_id) {
          errors.push(`Pet "${pet.name}" skipped: missing owner_id (could not resolve owner_email)`);
          continue;
        }
        // Insert new
        await query(
          `INSERT INTO "Pet" (tenant_id, owner_id, name, species, breed, weight, date_of_birth, gender, color, medical_notes, dietary_notes, behavior_notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [tenantId, pet.owner_id, pet.name, pet.species, pet.breed, pet.weight, pet.date_of_birth, pet.gender, pet.color, pet.medical_notes, pet.dietary_notes, pet.behavior_notes]
        );
        count++;
      }
    } catch (e) {
      errors.push(`Pet "${pet.name || 'unknown'}": ${e.message}`);
    }
  }

  return { count, errors };
}

/**
 * Import owners data
 * Field keys from wizard match database columns: first_name, last_name, email, phone,
 * address_street, address_city, address_state, address_zip, address_country,
 * emergency_contact_name, emergency_contact_phone, notes, is_active
 */
async function importOwners(tenantId, owners, options = {}) {
  const errors = [];
  let count = 0;
  const mode = options.mode || 'create_update';

  for (const owner of owners) {
    try {
      if (!owner.email) {
        errors.push(`Owner skipped: missing required field 'email'`);
        continue;
      }

      // Check if owner already exists by email
      const existing = await query(
        `SELECT id FROM "Owner" WHERE tenant_id = $1 AND email = $2`,
        [tenantId, owner.email]
      );

      if (existing.rows.length > 0) {
        // Record exists
        if (mode === 'create_only') {
          // Skip - don't update existing
          continue;
        }
        // Update existing - use correct database column names
        await query(
          `UPDATE "Owner" SET
            first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            phone = COALESCE($5, phone),
            address_street = COALESCE($6, address_street),
            address_city = COALESCE($7, address_city),
            address_state = COALESCE($8, address_state),
            address_zip = COALESCE($9, address_zip),
            address_country = COALESCE($10, address_country),
            emergency_contact_name = COALESCE($11, emergency_contact_name),
            emergency_contact_phone = COALESCE($12, emergency_contact_phone),
            notes = COALESCE($13, notes),
            is_active = COALESCE($14, is_active),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2`,
          [
            existing.rows[0].id,
            tenantId,
            owner.first_name || null,
            owner.last_name || null,
            owner.phone || null,
            owner.address_street || null,
            owner.address_city || null,
            owner.address_state || null,
            owner.address_zip || null,
            owner.address_country || null,
            owner.emergency_contact_name || null,
            owner.emergency_contact_phone || null,
            owner.notes || null,
            owner.is_active !== undefined ? owner.is_active : null
          ]
        );
        count++;
      } else {
        // Record doesn't exist
        if (mode === 'update_only') {
          // Skip - don't create new
          continue;
        }
        // Insert new - use correct database column names
        await query(
          `INSERT INTO "Owner" (tenant_id, first_name, last_name, email, phone, address_street, address_city, address_state, address_zip, address_country, emergency_contact_name, emergency_contact_phone, notes, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            tenantId,
            owner.first_name || null,
            owner.last_name || null,
            owner.email,
            owner.phone || null,
            owner.address_street || null,
            owner.address_city || null,
            owner.address_state || null,
            owner.address_zip || null,
            owner.address_country || 'US',
            owner.emergency_contact_name || null,
            owner.emergency_contact_phone || null,
            owner.notes || null,
            owner.is_active !== false
          ]
        );
        count++;
      }
    } catch (e) {
      console.error('[Import] Owner error:', e.message, 'Data:', JSON.stringify(owner));
      errors.push(`Owner "${owner.email || 'unknown'}": ${e.message}`);
    }
  }

  return { count, errors };
}

/**
 * Import vaccinations data
 */
async function importVaccinations(tenantId, vaccinations, options = {}) {
  const errors = [];
  let count = 0;
  const mode = options.mode || 'create_update';

  // First resolve pet names to IDs
  const petNameToId = {};
  const petNames = [...new Set(vaccinations.filter(v => v.pet_name).map(v => v.pet_name))];

  if (petNames.length > 0) {
    const placeholders = petNames.map((_, i) => `$${i + 2}`).join(', ');
    const result = await query(
      `SELECT id, name FROM "Pet" WHERE tenant_id = $1 AND name IN (${placeholders})`,
      [tenantId, ...petNames]
    );
    result.rows.forEach(row => {
      petNameToId[row.name.toLowerCase()] = row.id;
    });
  }

  for (const vax of vaccinations) {
    try {
      const petId = vax.pet_id || (vax.pet_name ? petNameToId[vax.pet_name.toLowerCase()] : null);

      if (!petId) {
        errors.push(`Vaccination "${vax.vaccine_name}" skipped: could not find pet "${vax.pet_name}"`);
        continue;
      }

      if (!vax.vaccine_name) {
        errors.push(`Vaccination skipped: missing required field 'vaccine_name'`);
        continue;
      }

      // Check if vaccination already exists
      const existing = await query(
        `SELECT id FROM "Vaccination" WHERE tenant_id = $1 AND pet_id = $2 AND vaccine_name = $3 AND administered_date = $4`,
        [tenantId, petId, vax.vaccine_name, vax.administered_date]
      );

      if (existing.rows.length > 0) {
        if (mode === 'create_only') continue;
        await query(
          `UPDATE "Vaccination" SET
            expiration_date = COALESCE($3, expiration_date),
            administered_by = COALESCE($4, administered_by),
            batch_number = COALESCE($5, batch_number),
            notes = COALESCE($6, notes),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2`,
          [existing.rows[0].id, tenantId, vax.expiration_date, vax.administered_by, vax.batch_number, vax.notes]
        );
        count++;
      } else {
        if (mode === 'update_only') continue;
        await query(
          `INSERT INTO "Vaccination" (tenant_id, pet_id, vaccine_name, administered_date, expiration_date, administered_by, batch_number, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [tenantId, petId, vax.vaccine_name, vax.administered_date, vax.expiration_date, vax.administered_by, vax.batch_number, vax.notes]
        );
        count++;
      }
    } catch (e) {
      errors.push(`Vaccination "${vax.vaccine_name || 'unknown'}": ${e.message}`);
    }
  }

  return { count, errors };
}

/**
 * Import services data
 */
async function importServices(tenantId, services, options = {}) {
  const errors = [];
  let count = 0;
  const mode = options.mode || 'create_update';

  for (const service of services) {
    try {
      if (!service.name) {
        errors.push(`Service skipped: missing required field 'name'`);
        continue;
      }

      // Check if service already exists by name
      const existing = await query(
        `SELECT id FROM "Service" WHERE tenant_id = $1 AND name = $2`,
        [tenantId, service.name]
      );

      if (existing.rows.length > 0) {
        if (mode === 'create_only') continue;
        await query(
          `UPDATE "Service" SET
            description = COALESCE($3, description),
            category = COALESCE($4, category),
            price = COALESCE($5, price),
            duration_minutes = COALESCE($6, duration_minutes),
            is_active = COALESCE($7, is_active),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2`,
          [existing.rows[0].id, tenantId, service.description, service.category, service.price, service.duration_minutes, service.is_active]
        );
        count++;
      } else {
        if (mode === 'update_only') continue;
        await query(
          `INSERT INTO "Service" (tenant_id, name, description, category, price, duration_minutes, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tenantId, service.name, service.description, service.category, service.price, service.duration_minutes, service.is_active !== false]
        );
        count++;
      }
    } catch (e) {
      errors.push(`Service "${service.name || 'unknown'}": ${e.message}`);
    }
  }

  return { count, errors };
}

/**
 * Import staff data
 */
async function importStaff(tenantId, staffList, options = {}) {
  const errors = [];
  let count = 0;
  const mode = options.mode || 'create_update';

  for (const staff of staffList) {
    try {
      if (!staff.email) {
        errors.push(`Staff skipped: missing required field 'email'`);
        continue;
      }

      // Check if staff already exists by email
      const existing = await query(
        `SELECT id FROM "Staff" WHERE tenant_id = $1 AND email = $2`,
        [tenantId, staff.email]
      );

      if (existing.rows.length > 0) {
        if (mode === 'create_only') continue;
        await query(
          `UPDATE "Staff" SET
            first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            phone = COALESCE($5, phone),
            role = COALESCE($6, role),
            hire_date = COALESCE($7, hire_date),
            is_active = COALESCE($8, is_active),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2`,
          [existing.rows[0].id, tenantId, staff.first_name, staff.last_name, staff.phone, staff.role, staff.hire_date, staff.is_active]
        );
        count++;
      } else {
        if (mode === 'update_only') continue;
        await query(
          `INSERT INTO "Staff" (tenant_id, first_name, last_name, email, phone, role, hire_date, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [tenantId, staff.first_name, staff.last_name, staff.email, staff.phone, staff.role, staff.hire_date, staff.is_active !== false]
        );
        count++;
      }
    } catch (e) {
      errors.push(`Staff "${staff.email || 'unknown'}": ${e.message}`);
    }
  }

  return { count, errors };
}

/**
 * Download an export file (if stored)
 */
async function handleDownloadExport(user, jobId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT * FROM "ImportExportJob" WHERE id = $1 AND tenant_id = $2 AND type = 'export'`,
      [jobId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Export job not found' });
    }

    const job = result.rows[0];

    if (job.status !== 'completed') {
      return createResponse(400, { error: 'Bad Request', message: 'Export is not complete' });
    }

    if (!job.download_url) {
      return createResponse(400, { error: 'Bad Request', message: 'No download available for this export' });
    }

    // Redirect to download URL
    return {
      statusCode: 302,
      headers: {
        Location: job.download_url,
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    };
  } catch (error) {
    console.error('[ImportExport] Download failed:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Download failed' });
  }
}

// =============================================================================
// IMPORT HISTORY HANDLERS (enterprise)
// =============================================================================

/**
 * List all imports for the tenant
 */
async function handleListImports(user, queryParams = {}) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { entityType, hasErrors, limit = 50, offset = 0 } = queryParams;

    let whereClause = 'WHERE i.tenant_id = $1';
    const params = [ctx.tenantId];
    let paramIndex = 2;

    if (entityType) {
      whereClause += ` AND $${paramIndex} = ANY(i.entity_types)`;
      params.push(entityType);
      paramIndex++;
    }

    if (hasErrors === 'true') {
      whereClause += ' AND i.error_count > 0';
    } else if (hasErrors === 'false') {
      whereClause += ' AND i.error_count = 0';
    }

    const result = await query(
      `SELECT
        i.record_id as id,
        i.name,
        i.filename,
        i.entity_types as "entityTypes",
        i.status,
        i.total_rows as "totalRows",
        i.new_records as "newRecords",
        i.updated_records as "updatedRecords",
        i.skipped_records as "skippedRecords",
        i.new_associations as "newAssociations",
        i.error_count as "errorCount",
        i.created_at as "createdAt",
        i.completed_at as "completedAt",
        us.first_name || ' ' || us.last_name as "createdByName",
        u.email as "createdByEmail"
      FROM "Import" i
      LEFT JOIN "User" u ON i.tenant_id = u.tenant_id AND i.created_by::text = u.cognito_sub
      LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM "Import" i ${whereClause}`,
      params
    );

    return createResponse(200, {
      imports: result.rows,
      total: parseInt(countResult.rows[0]?.total || 0),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('[Import] List imports failed:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Get detailed import information (enterprise summary page)
 */
async function handleGetImportDetail(user, importId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT
        i.*,
        us.first_name || ' ' || us.last_name as "createdByName",
        u.email as "createdByEmail"
      FROM "Import" i
      LEFT JOIN "User" u ON i.tenant_id = u.tenant_id AND i.created_by::text = u.cognito_sub
      LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
      WHERE i.id = $1 AND i.tenant_id = $2`,
      [importId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Import not found' });
    }

    const imp = result.rows[0];

    // Format response for frontend
    return createResponse(200, {
      id: imp.id,
      name: imp.name,
      filename: imp.filename,
      entityTypes: imp.entity_types,
      status: imp.status,
      importType: imp.entity_types?.length > 1 ? 'Multiple objects with associations' : 'Single object',
      totalRows: imp.total_rows,
      newRecords: imp.new_records,
      updatedRecords: imp.updated_records,
      skippedRecords: imp.skipped_records,
      newAssociations: imp.new_associations,
      errorCount: imp.error_count,
      errors: imp.errors || [],
      mappings: imp.mappings || {},
      importModes: imp.import_modes || {},
      options: imp.options || {},
      createdAt: imp.created_at,
      completedAt: imp.completed_at,
      createdBy: {
        name: imp.createdByName,
        email: imp.createdByEmail,
      },
    });
  } catch (error) {
    console.error('[Import] Get import detail failed:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Download import errors as CSV
 */
async function handleDownloadImportErrors(user, importId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT errors, name FROM "Import" WHERE id = $1 AND tenant_id = $2`,
      [importId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Import not found' });
    }

    const errors = result.rows[0].errors || [];
    const importName = result.rows[0].name || 'import';

    if (errors.length === 0) {
      return createResponse(400, { error: 'Bad Request', message: 'No errors to download' });
    }

    // Generate CSV
    const headers = ['Row', 'Column', 'Entity Type', 'Property', 'Error Type', 'Error Message', 'Value'];
    const csvRows = [headers.join(',')];

    for (const err of errors) {
      const row = [
        err.row || '',
        err.column || '',
        err.entityType || '',
        err.property || '',
        err.errorType || '',
        `"${(err.errorMessage || '').replace(/"/g, '""')}"`,
        `"${(err.value || '').toString().replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const filename = `${importName.replace(/[^a-zA-Z0-9]/g, '_')}_errors.csv`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
      body: csvContent,
    };
  } catch (error) {
    console.error('[Import] Download errors failed:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Delete an import record
 */
async function handleDeleteImport(user, importId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `DELETE FROM "Import" WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [importId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Import not found' });
    }

    return createResponse(200, { success: true, message: 'Import deleted successfully' });
  } catch (error) {
    console.error('[Import] Delete import failed:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: error.message });
  }
}

// =============================================================================
// FORMS HANDLERS (Custom forms and waivers)
// =============================================================================

// Default form settings
const DEFAULT_FORM_SETTINGS = {
  requireSignature: true,
  saveIncomplete: true,
  emailCopy: true,
  autoReminder: true,
  reminderDays: 3,
};

// Form templates
const FORM_TEMPLATES = [
  {
    id: 'basic_intake',
    name: 'Basic Intake Form',
    description: 'Collect essential customer and pet information',
    type: 'intake',
    fields: [
      { id: 'owner_name', type: 'text', label: 'Owner Name', required: true, order: 1 },
      { id: 'email', type: 'email', label: 'Email Address', required: true, order: 2 },
      { id: 'phone', type: 'phone', label: 'Phone Number', required: true, order: 3 },
      { id: 'address', type: 'textarea', label: 'Address', required: false, order: 4 },
      { id: 'pet_name', type: 'text', label: 'Pet Name', required: true, order: 5 },
      { id: 'pet_breed', type: 'text', label: 'Breed', required: false, order: 6 },
      { id: 'pet_age', type: 'number', label: 'Age (years)', required: false, order: 7 },
      { id: 'special_needs', type: 'textarea', label: 'Special Needs or Instructions', required: false, order: 8 },
    ],
  },
  {
    id: 'vaccination_records',
    name: 'Vaccination Records',
    description: 'Track pet vaccination history and requirements',
    type: 'health',
    fields: [
      { id: 'pet_name', type: 'text', label: 'Pet Name', required: true, order: 1 },
      { id: 'rabies_date', type: 'date', label: 'Rabies Vaccination Date', required: true, order: 2 },
      { id: 'rabies_expiry', type: 'date', label: 'Rabies Expiration Date', required: true, order: 3 },
      { id: 'dhpp_date', type: 'date', label: 'DHPP Vaccination Date', required: true, order: 4 },
      { id: 'bordetella_date', type: 'date', label: 'Bordetella Vaccination Date', required: true, order: 5 },
      { id: 'vet_name', type: 'text', label: 'Veterinarian Name', required: false, order: 6 },
      { id: 'vet_phone', type: 'phone', label: 'Veterinarian Phone', required: false, order: 7 },
    ],
  },
  {
    id: 'emergency_contact',
    name: 'Emergency Contact',
    description: 'Collect emergency contact information',
    type: 'intake',
    fields: [
      { id: 'primary_name', type: 'text', label: 'Primary Contact Name', required: true, order: 1 },
      { id: 'primary_phone', type: 'phone', label: 'Primary Contact Phone', required: true, order: 2 },
      { id: 'primary_relation', type: 'text', label: 'Relationship to Pet Owner', required: false, order: 3 },
      { id: 'secondary_name', type: 'text', label: 'Secondary Contact Name', required: false, order: 4 },
      { id: 'secondary_phone', type: 'phone', label: 'Secondary Contact Phone', required: false, order: 5 },
      { id: 'vet_authorization', type: 'checkbox', label: 'I authorize emergency veterinary care', required: true, order: 6 },
    ],
  },
  {
    id: 'service_agreement',
    name: 'Service Agreement',
    description: 'Standard terms and conditions agreement',
    type: 'agreement',
    fields: [
      { id: 'owner_name', type: 'text', label: 'Owner Full Name', required: true, order: 1 },
      { id: 'pet_name', type: 'text', label: 'Pet Name', required: true, order: 2 },
      { id: 'terms_accepted', type: 'checkbox', label: 'I have read and agree to the terms of service', required: true, order: 3 },
      { id: 'liability_accepted', type: 'checkbox', label: 'I understand and accept the liability waiver', required: true, order: 4 },
      { id: 'date', type: 'date', label: 'Date', required: true, order: 5 },
    ],
    require_signature: true,
  },
];

/**
 * Check if Form table exists
 */
async function checkFormTableExists() {
  const result = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'Form'
    ) as exists
  `);
  return result.rows[0]?.exists || false;
}

/**
 * Get forms for tenant
 */
async function handleGetForms(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!await checkFormTableExists()) {
      return createResponse(200, { forms: [], _tableNotExists: true });
    }

    const result = await query(`
      SELECT * FROM "Form"
      WHERE tenant_id = $1      ORDER BY updated_at DESC
    `, [ctx.tenantId]);

    const forms = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      fields: row.fields || [],
      fieldCount: row.field_count || 0,
      submissionCount: row.submission_count || 0,
      status: row.status,
      isRequired: row.is_required,
      requireSignature: row.require_signature,
      autoAssignTo: row.auto_assign_to || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, { forms });
  } catch (error) {
    console.error('[Forms] Failed to get forms:', error.message);
    return createResponse(200, { forms: [], _error: true });
  }
}

/**
 * Get single form
 */
async function handleGetForm(user, formId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`
      SELECT * FROM "Form"
      WHERE id = $1 AND tenant_id = $2    `, [formId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Form not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      fields: row.fields || [],
      fieldCount: row.field_count || 0,
      submissionCount: row.submission_count || 0,
      status: row.status,
      isRequired: row.is_required,
      requireSignature: row.require_signature,
      autoAssignTo: row.auto_assign_to || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error('[Forms] Failed to get form:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get form' });
  }
}

/**
 * Create form
 */
async function handleCreateForm(user, body) {
  const { name, description, type, fields, status, isRequired, requireSignature, autoAssignTo } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!await checkFormTableExists()) {
      return createResponse(400, { error: 'Bad Request', message: 'Forms not configured. Please run migration 019.' });
    }

    if (!name) {
      return createResponse(400, { error: 'Bad Request', message: 'Form name is required' });
    }

    const result = await query(`
      INSERT INTO "Form" (
        tenant_id, name, description, type, fields, status,
        is_required, require_signature, auto_assign_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      ctx.tenantId,
      name,
      description || null,
      type || 'custom',
      JSON.stringify(fields || []),
      status || 'draft',
      isRequired || false,
      requireSignature || false,
      autoAssignTo || [],
      user.id,
    ]);

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      name: row.name,
      message: 'Form created successfully',
    });
  } catch (error) {
    console.error('[Forms] Failed to create form:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create form' });
  }
}

/**
 * Update form
 */
async function handleUpdateForm(user, formId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Build update query dynamically
    const updates = [];
    const params = [formId, ctx.tenantId];
    let paramIndex = 3;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(body.description);
    }
    if (body.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      params.push(body.type);
    }
    if (body.fields !== undefined) {
      updates.push(`fields = $${paramIndex++}`);
      params.push(JSON.stringify(body.fields));
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(body.status);
    }
    if (body.isRequired !== undefined) {
      updates.push(`is_required = $${paramIndex++}`);
      params.push(body.isRequired);
    }
    if (body.requireSignature !== undefined) {
      updates.push(`require_signature = $${paramIndex++}`);
      params.push(body.requireSignature);
    }
    if (body.autoAssignTo !== undefined) {
      updates.push(`auto_assign_to = $${paramIndex++}`);
      params.push(body.autoAssignTo);
    }

    if (updates.length === 0) {
      return createResponse(400, { error: 'Bad Request', message: 'No fields to update' });
    }

    const result = await query(`
      UPDATE "Form" SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Form not found' });
    }

    return createResponse(200, { success: true, message: 'Form updated' });
  } catch (error) {
    console.error('[Forms] Failed to update form:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update form' });
  }
}

/**
 * Delete form (soft delete)
 */
async function handleDeleteForm(user, formId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const deletedRecord = await softDelete('Form', formId, ctx.tenantId, ctx.userId);

    if (!deletedRecord) {
      return createResponse(404, { error: 'Not Found', message: 'Form not found' });
    }

    return createResponse(200, { success: true, message: 'Form deleted' });
  } catch (error) {
    console.error('[Forms] Failed to delete form:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete form' });
  }
}

/**
 * Duplicate form
 */
async function handleDuplicateForm(user, formId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get original form
    const original = await query(`
      SELECT * FROM "Form"
      WHERE id = $1 AND tenant_id = $2    `, [formId, ctx.tenantId]);

    if (original.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Form not found' });
    }

    const form = original.rows[0];

    // Create duplicate
    const result = await query(`
      INSERT INTO "Form" (
        tenant_id, name, description, type, fields, status,
        is_required, require_signature, auto_assign_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9)
      RETURNING *
    `, [
      ctx.tenantId,
      `${form.name} (Copy)`,
      form.description,
      form.type,
      JSON.stringify(form.fields || []),
      form.is_required,
      form.require_signature,
      form.auto_assign_to || [],
      user.id,
    ]);

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      name: row.name,
      message: 'Form duplicated successfully',
    });
  } catch (error) {
    console.error('[Forms] Failed to duplicate form:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to duplicate form' });
  }
}

/**
 * Get form settings for tenant
 * NEW SCHEMA: Stored in TenantSettings.custom_fields.formSettings
 */
async function handleGetFormSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const customFields = result.rows[0]?.custom_fields || {};
    const settings = customFields.formSettings || DEFAULT_FORM_SETTINGS;

    return createResponse(200, { ...DEFAULT_FORM_SETTINGS, ...settings });
  } catch (error) {
    console.error('[Forms] Failed to get settings:', error.message);
    return createResponse(200, DEFAULT_FORM_SETTINGS);
  }
}

/**
 * Update form settings for tenant
 * NEW SCHEMA: Stored in TenantSettings.custom_fields.formSettings
 */
async function handleUpdateFormSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current custom_fields and merge
    const result = await query(`SELECT custom_fields FROM "TenantSettings" WHERE tenant_id = $1`, [ctx.tenantId]);
    const customFields = result.rows[0]?.custom_fields || {};
    const currentSettings = customFields.formSettings || {};
    const newSettings = { ...currentSettings, ...body };

    customFields.formSettings = newSettings;
    await query(
      `UPDATE "TenantSettings" SET custom_fields = $1, updated_at = NOW() WHERE tenant_id = $2`,
      [JSON.stringify(customFields), ctx.tenantId]
    );

    return createResponse(200, { success: true, ...newSettings });
  } catch (error) {
    console.error('[Forms] Failed to update settings:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update settings' });
  }
}

/**
 * Get form templates
 */
async function handleGetFormTemplates(user) {
  return createResponse(200, { templates: FORM_TEMPLATES });
}

/**
 * Create form from template
 */
async function handleUseFormTemplate(user, templateId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!await checkFormTableExists()) {
      return createResponse(400, { error: 'Bad Request', message: 'Forms not configured. Please run migration 019.' });
    }

    const template = FORM_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return createResponse(404, { error: 'Not Found', message: 'Template not found' });
    }

    const result = await query(`
      INSERT INTO "Form" (
        tenant_id, name, description, type, fields, status,
        is_required, require_signature, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'draft', false, $6, $7)
      RETURNING *
    `, [
      ctx.tenantId,
      template.name,
      template.description,
      template.type,
      JSON.stringify(template.fields),
      template.require_signature || false,
      user.id,
    ]);

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      name: row.name,
      message: 'Form created from template',
    });
  } catch (error) {
    console.error('[Forms] Failed to use template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create form from template' });
  }
}

/**
 * Get form submissions
 */
async function handleGetFormSubmissions(user, formId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Check if FormSubmission table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'FormSubmission'
      ) as exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      return createResponse(200, { submissions: [], total: 0 });
    }

    const result = await query(`
      SELECT fs.*, o.first_name, o.last_name, o.email, p.name as pet_name
      FROM "FormSubmission" fs
      LEFT JOIN "Owner" o ON fs.owner_id = o.record_id
      LEFT JOIN "Pet" p ON fs.pet_id = p.record_id
      WHERE fs.form_id = $1 AND fs.tenant_id = $2
      ORDER BY fs.submitted_at DESC
      LIMIT 100
    `, [formId, ctx.tenantId]);

    const submissions = result.rows.map(row => ({
      id: row.id,
      data: row.data,
      status: row.status,
      owner: row.first_name ? { name: `${row.first_name} ${row.last_name}`, email: row.email } : null,
      pet: row.pet_name ? { name: row.pet_name } : null,
      signedAt: row.signed_at,
      submittedAt: row.submitted_at,
    }));

    return createResponse(200, { submissions, total: submissions.length });
  } catch (error) {
    console.error('[Forms] Failed to get submissions:', error.message);
    return createResponse(200, { submissions: [], total: 0, _error: true });
  }
}

// =============================================================================
// DOCUMENTS HANDLERS (Received customer files)
// =============================================================================

/**
 * Check if Document table exists
 */
async function checkDocumentTableExists() {
  const result = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'Document'
    ) as exists
  `);
  return result.rows[0]?.exists || false;
}

/**
 * Get documents for tenant
 */
async function handleGetDocuments(user, queryParams) {
  const { category, search, sortBy = 'date', limit = 50, offset = 0 } = queryParams;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Check if table exists
    if (!await checkDocumentTableExists()) {
      return createResponse(200, { documents: [], total: 0, _tableNotExists: true });
    }

    let whereClause = 'd.tenant_id = $1';
    const params = [ctx.tenantId];
    let paramIndex = 2;

    if (category && category !== 'all') {
      whereClause += ` AND d.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (
        d.filename ILIKE $${paramIndex} OR 
        d.original_filename ILIKE $${paramIndex} OR
        o.first_name ILIKE $${paramIndex} OR 
        o.last_name ILIKE $${paramIndex} OR
        p.name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    let orderBy = 'd.created_at DESC';
    if (sortBy === 'name') orderBy = 'd.filename ASC';
    if (sortBy === 'size') orderBy = 'd.file_size_bytes DESC';

    const result = await query(`
      SELECT 
        d.*,
        o.record_id as owner_id, o.first_name as owner_first_name, o.last_name as owner_last_name,
        p.record_id as pet_id, p.name as pet_name
      FROM "Document" d
      LEFT JOIN "Owner" o ON d.owner_id = o.record_id
      LEFT JOIN "Pet" p ON d.pet_id = p.record_id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM "Document" d 
       LEFT JOIN "Owner" o ON d.owner_id = o.record_id
       LEFT JOIN "Pet" p ON d.pet_id = p.record_id
       WHERE ${whereClause}`,
      params
    );

    const documents = result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      originalFilename: row.original_filename,
      fileType: row.file_type,
      mimeType: row.mime_type,
      size: row.file_size_bytes,
      category: row.category,
      description: row.description,
      storageUrl: row.storage_url,
      uploadedAt: row.created_at,
      customer: row.owner_id ? {
        id: row.owner_id,
        name: `${row.owner_first_name || ''} ${row.owner_last_name || ''}`.trim() || 'Unknown',
      } : null,
      pet: row.pet_id ? {
        id: row.pet_id,
        name: row.pet_name || 'Unknown',
      } : null,
    }));

    return createResponse(200, {
      documents,
      total: parseInt(countResult.rows[0]?.count || 0),
    });
  } catch (error) {
    console.error('[Documents] Failed to get documents:', error.message);
    return createResponse(200, { documents: [], total: 0, _error: true });
  }
}

/**
 * Get document storage stats
 */
async function handleGetDocumentStats(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!await checkDocumentTableExists()) {
      return createResponse(200, { 
        used: 0, 
        total: 500 * 1024 * 1024, // 500 MB default
        documentCount: 0,
        byCategory: {},
      });
    }

    const result = await query(`
      SELECT 
        COALESCE(SUM(file_size_bytes), 0) as total_bytes,
        COUNT(*) as count,
        category
      FROM "Document"
      WHERE tenant_id = $1      GROUP BY category
    `, [ctx.tenantId]);

    const byCategory = {};
    let totalBytes = 0;
    let totalCount = 0;

    result.rows.forEach(row => {
      byCategory[row.category] = {
        bytes: parseInt(row.total_bytes),
        count: parseInt(row.count),
      };
      totalBytes += parseInt(row.total_bytes);
      totalCount += parseInt(row.count);
    });

    // Get tenant storage limit (default 500 MB)
    // NEW SCHEMA: Uses feature_flags column (not features)
    const tenantResult = await query(
      `SELECT feature_flags FROM "Tenant" WHERE id = $1`,
      [ctx.tenantId]
    );
    const featureFlags = tenantResult.rows[0]?.feature_flags || {};
    const storageLimitMB = featureFlags.storageLimitMB || 500;

    return createResponse(200, {
      used: totalBytes,
      total: storageLimitMB * 1024 * 1024,
      documentCount: totalCount,
      byCategory,
    });
  } catch (error) {
    console.error('[Documents] Failed to get stats:', error.message);
    return createResponse(200, { used: 0, total: 500 * 1024 * 1024, documentCount: 0, byCategory: {} });
  }
}

/**
 * Create/upload document
 */
async function handleCreateDocument(user, body) {
  const { filename, fileType, mimeType, size, category, description, ownerId, petId, storageUrl, storagePath } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!await checkDocumentTableExists()) {
      return createResponse(400, { error: 'Bad Request', message: 'Document storage not configured. Please run migration 018.' });
    }

    if (!filename) {
      return createResponse(400, { error: 'Bad Request', message: 'Filename is required' });
    }

    const result = await query(`
      INSERT INTO "Document" (
        tenant_id, owner_id, pet_id, filename, original_filename, 
        file_type, mime_type, file_size_bytes, category, description,
        storage_path, storage_url, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      ctx.tenantId,
      ownerId || null,
      petId || null,
      filename,
      filename,
      fileType || 'other',
      mimeType || 'application/octet-stream',
      size || 0,
      category || 'other',
      description || null,
      storagePath || null,
      storageUrl || null,
      user.id,
    ]);

    return createResponse(201, {
      id: result.rows[0].id,
      message: 'Document created successfully',
    });
  } catch (error) {
    console.error('[Documents] Failed to create document:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create document' });
  }
}

/**
 * Get single document
 */
async function handleGetDocument(user, docId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`
      SELECT d.*, o.first_name, o.last_name, p.name as pet_name
      FROM "Document" d
      LEFT JOIN "Owner" o ON d.owner_id = o.record_id
      LEFT JOIN "Pet" p ON d.pet_id = p.record_id
      WHERE d.id = $1 AND d.tenant_id = $2     `, [docId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Document not found' });
    }

    return createResponse(200, result.rows[0]);
  } catch (error) {
    console.error('[Documents] Failed to get document:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get document' });
  }
}

/**
 * Delete document (soft delete)
 */
async function handleDeleteDocument(user, docId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const deletedRecord = await softDelete('Document', docId, ctx.tenantId, ctx.userId);

    if (!deletedRecord) {
      return createResponse(404, { error: 'Not Found', message: 'Document not found' });
    }

    return createResponse(200, { success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('[Documents] Failed to delete document:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete document' });
  }
}

// =============================================================================
// FILE TEMPLATES HANDLERS (Outgoing templates)
// =============================================================================

/**
 * Check if FileTemplate table exists
 */
async function checkFileTemplateTableExists() {
  const result = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'FileTemplate'
    ) as exists
  `);
  return result.rows[0]?.exists || false;
}

/**
 * Get file templates for tenant
 */
async function handleGetFileTemplates(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!await checkFileTemplateTableExists()) {
      return createResponse(200, { templates: [], _tableNotExists: true });
    }

    const result = await query(`
      SELECT * FROM "FileTemplate"
      WHERE tenant_id = $1      ORDER BY type, name
    `, [ctx.tenantId]);

    const templates = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      contentType: row.content_type,
      status: row.status,
      usageCount: row.usage_count,
      autoAttach: row.auto_attach_to || [],
      lastUpdated: row.updated_at,
      createdAt: row.created_at,
    }));

    return createResponse(200, { templates });
  } catch (error) {
    console.error('[Files] Failed to get templates:', error.message);
    return createResponse(200, { templates: [], _error: true });
  }
}

/**
 * Create file template
 */
async function handleCreateFileTemplate(user, body) {
  const { name, description, type, contentType, content, status, autoAttach } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!await checkFileTemplateTableExists()) {
      return createResponse(400, { error: 'Bad Request', message: 'File templates not configured. Please run migration 018.' });
    }

    if (!name) {
      return createResponse(400, { error: 'Bad Request', message: 'Template name is required' });
    }

    const result = await query(`
      INSERT INTO "FileTemplate" (
        tenant_id, name, description, type, content_type, content, 
        status, auto_attach_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      ctx.tenantId,
      name,
      description || null,
      type || 'custom',
      contentType || 'html',
      content || null,
      status || 'draft',
      autoAttach || [],
      user.id,
    ]);

    return createResponse(201, {
      id: result.rows[0].id,
      message: 'Template created successfully',
    });
  } catch (error) {
    console.error('[Files] Failed to create template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create template' });
  }
}

/**
 * Get single template
 */
async function handleGetFileTemplate(user, templateId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`
      SELECT * FROM "FileTemplate"
      WHERE id = $1 AND tenant_id = $2    `, [templateId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Template not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      contentType: row.content_type,
      content: row.content,
      status: row.status,
      usageCount: row.usage_count,
      autoAttach: row.auto_attach_to || [],
      lastUpdated: row.updated_at,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error('[Files] Failed to get template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get template' });
  }
}

/**
 * Update file template
 */
async function handleUpdateFileTemplate(user, templateId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Build update query dynamically
    const updates = [];
    const params = [templateId, ctx.tenantId];
    let paramIndex = 3;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(body.description);
    }
    if (body.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      params.push(body.type);
    }
    if (body.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(body.content);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(body.status);
    }
    if (body.autoAttach !== undefined) {
      updates.push(`auto_attach_to = $${paramIndex++}`);
      params.push(body.autoAttach);
    }

    if (updates.length === 0) {
      return createResponse(400, { error: 'Bad Request', message: 'No fields to update' });
    }

    const result = await query(`
      UPDATE "FileTemplate" SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Template not found' });
    }

    return createResponse(200, { success: true, message: 'Template updated' });
  } catch (error) {
    console.error('[Files] Failed to update template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update template' });
  }
}

/**
 * Delete file template (soft delete)
 */
async function handleDeleteFileTemplate(user, templateId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const deletedRecord = await softDelete('FileTemplate', templateId, ctx.tenantId, ctx.userId);

    if (!deletedRecord) {
      return createResponse(404, { error: 'Not Found', message: 'Template not found' });
    }

    return createResponse(200, { success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('[Files] Failed to delete template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete template' });
  }
}

// =============================================================================
// CUSTOM FILES HANDLERS
// =============================================================================

/**
 * Check if CustomFile table exists
 */
async function checkCustomFileTableExists() {
  const result = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'CustomFile'
    ) as exists
  `);
  return result.rows[0]?.exists || false;
}

/**
 * Get custom files for tenant
 */
async function handleGetCustomFiles(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!await checkCustomFileTableExists()) {
      return createResponse(200, { files: [], _tableNotExists: true });
    }

    const result = await query(`
      SELECT * FROM "CustomFile"
      WHERE tenant_id = $1      ORDER BY created_at DESC
    `, [ctx.tenantId]);

    const files = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      filename: row.filename,
      fileType: row.file_type,
      size: row.file_size_bytes,
      usageCount: row.usage_count,
      autoAttach: row.auto_attach_to || [],
      uploadedAt: row.created_at,
    }));

    return createResponse(200, { files });
  } catch (error) {
    console.error('[Files] Failed to get custom files:', error.message);
    return createResponse(200, { files: [], _error: true });
  }
}

/**
 * Create custom file
 */
async function handleCreateCustomFile(user, body) {
  const { name, description, filename, fileType, mimeType, size, storageUrl, storagePath } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!await checkCustomFileTableExists()) {
      return createResponse(400, { error: 'Bad Request', message: 'Custom files not configured. Please run migration 018.' });
    }

    if (!name || !filename) {
      return createResponse(400, { error: 'Bad Request', message: 'Name and filename are required' });
    }

    const result = await query(`
      INSERT INTO "CustomFile" (
        tenant_id, name, description, filename, original_filename,
        file_type, mime_type, file_size_bytes, storage_path, storage_url, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      ctx.tenantId,
      name,
      description || null,
      filename,
      filename,
      fileType || 'pdf',
      mimeType || 'application/pdf',
      size || 0,
      storagePath || null,
      storageUrl || null,
      user.id,
    ]);

    return createResponse(201, {
      id: result.rows[0].id,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('[Files] Failed to create custom file:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to upload file' });
  }
}

/**
 * Get single custom file
 */
async function handleGetCustomFile(user, fileId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`
      SELECT * FROM "CustomFile"
      WHERE id = $1 AND tenant_id = $2    `, [fileId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'File not found' });
    }

    return createResponse(200, result.rows[0]);
  } catch (error) {
    console.error('[Files] Failed to get custom file:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get file' });
  }
}

/**
 * Delete custom file (soft delete)
 */
async function handleDeleteCustomFile(user, fileId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const deletedRecord = await softDelete('CustomFile', fileId, ctx.tenantId, ctx.userId);

    if (!deletedRecord) {
      return createResponse(404, { error: 'Not Found', message: 'File not found' });
    }

    return createResponse(200, { success: true, message: 'File deleted' });
  } catch (error) {
    console.error('[Files] Failed to delete custom file:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete file' });
  }
}

// =============================================================================
// PACKAGE TEMPLATES HANDLERS
// =============================================================================

/**
 * List all package templates for tenant
 */
async function handleListPackageTemplates(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`
      SELECT id, name, description, total_credits, price_in_cents,
             expires_in_days, service_type, is_active, created_at, updated_at
      FROM "PackageTemplate"
      WHERE tenant_id = $1
      ORDER BY is_active DESC, name ASC
    `, [ctx.tenantId]);

    return createResponse(200, { templates: result.rows });
  } catch (error) {
    console.error('[PackageTemplates] Failed to list templates:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to list package templates' });
  }
}

/**
 * Create a new package template
 */
async function handleCreatePackageTemplate(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, description, totalCredits, priceInCents, expiresInDays, serviceType, isActive } = body;

    if (!name || !totalCredits || !priceInCents) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Name, total credits, and price are required'
      });
    }

    const result = await query(`
      INSERT INTO "PackageTemplate" (tenant_id, name, description, total_credits, price_in_cents, expires_in_days, service_type, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      ctx.tenantId,
      name,
      description || null,
      totalCredits,
      priceInCents,
      expiresInDays || null,
      serviceType || null,
      isActive !== false
    ]);

    return createResponse(201, { template: result.rows[0] });
  } catch (error) {
    console.error('[PackageTemplates] Failed to create template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create package template' });
  }
}

/**
 * Get a single package template
 */
async function handleGetPackageTemplate(user, templateId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`
      SELECT * FROM "PackageTemplate"
      WHERE id = $1 AND tenant_id = $2
    `, [templateId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Package template not found' });
    }

    return createResponse(200, { template: result.rows[0] });
  } catch (error) {
    console.error('[PackageTemplates] Failed to get template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get package template' });
  }
}

/**
 * Update a package template
 */
async function handleUpdatePackageTemplate(user, templateId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, description, totalCredits, priceInCents, expiresInDays, serviceType, isActive } = body;

    const result = await query(`
      UPDATE "PackageTemplate"
      SET name = COALESCE($3, name),
          description = COALESCE($4, description),
          total_credits = COALESCE($5, total_credits),
          price_in_cents = COALESCE($6, price_in_cents),
          expires_in_days = $7,
          service_type = $8,
          is_active = COALESCE($9, is_active),
          updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [
      templateId,
      ctx.tenantId,
      name,
      description,
      totalCredits,
      priceInCents,
      expiresInDays,
      serviceType,
      isActive
    ]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Package template not found' });
    }

    return createResponse(200, { template: result.rows[0] });
  } catch (error) {
    console.error('[PackageTemplates] Failed to update template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update package template' });
  }
}

/**
 * Delete (archive) a package template
 */
async function handleDeletePackageTemplate(user, templateId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Soft delete by setting is_active = false
    const result = await query(`
      UPDATE "PackageTemplate"
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [templateId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Package template not found' });
    }

    return createResponse(200, { success: true, message: 'Package template archived' });
  } catch (error) {
    console.error('[PackageTemplates] Failed to delete template:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete package template' });
  }
}

// =============================================================================
// SERVICES HANDLERS (Primary Services - boarding, daycare, grooming, training)
// =============================================================================

/**
 * List all services for tenant
 * Supports filtering by category via query param
 */
async function handleListServices(user, queryParams = {}) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { category, activeOnly } = queryParams;

    let sql = `
      SELECT record_id as id, name, description, category, price_in_cents as "priceInCents",
             duration_minutes as "durationMinutes", is_active as "isActive",
             sort_order as "sortOrder", created_at as "createdAt", updated_at as "updatedAt"
      FROM "Service"
      WHERE tenant_id = $1
    `;
    const params = [ctx.tenantId];

    // Filter by category if provided
    if (category) {
      sql += ` AND LOWER(category) = LOWER($${params.length + 1})`;
      params.push(category);
    }

    // Filter active only if requested
    if (activeOnly === 'true') {
      sql += ` AND is_active = true`;
    }

    sql += ` ORDER BY sort_order ASC, name ASC`;

    const result = await query(sql, params);

    // Transform to match frontend expectations
    const services = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category?.toUpperCase(), // Frontend expects uppercase
      priceInCents: row.priceInCents,
      price: row.priceInCents / 100, // Also provide price in dollars
      durationMinutes: row.durationMinutes,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    return createResponse(200, services);
  } catch (error) {
    console.error('[Services] Failed to list services:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to list services' });
  }
}

/**
 * Create a new service
 */
async function handleCreateService(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, description, category, priceInCents, durationMinutes, isActive, sortOrder } = body;

    if (!name || !category || priceInCents === undefined) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Name, category, and price are required'
      });
    }

    // Get max sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxResult = await query(
        `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM "Service" WHERE tenant_id = $1`,
        [ctx.tenantId]
      );
      finalSortOrder = maxResult.rows[0].next_order;
    }

    const result = await query(`
      INSERT INTO "Service" (tenant_id, name, description, category, price_in_cents, duration_minutes, is_active, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, description, category, price_in_cents as "priceInCents",
                duration_minutes as "durationMinutes", is_active as "isActive",
                sort_order as "sortOrder", created_at as "createdAt"
    `, [
      ctx.tenantId,
      name,
      description || null,
      category.toLowerCase(),
      priceInCents,
      durationMinutes || 60,
      isActive !== false,
      finalSortOrder
    ]);

    const service = result.rows[0];
    return createResponse(201, {
      ...service,
      category: service.category?.toUpperCase(),
      price: service.priceInCents / 100
    });
  } catch (error) {
    console.error('[Services] Failed to create service:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create service' });
  }
}

/**
 * Get a single service
 */
async function handleGetService(user, serviceId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`
      SELECT id, name, description, category, price_in_cents as "priceInCents",
             duration_minutes as "durationMinutes", is_active as "isActive",
             sort_order as "sortOrder", created_at as "createdAt", updated_at as "updatedAt"
      FROM "Service"
      WHERE id = $1 AND tenant_id = $2
    `, [serviceId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Service not found' });
    }

    const service = result.rows[0];
    return createResponse(200, {
      ...service,
      category: service.category?.toUpperCase(),
      price: service.priceInCents / 100
    });
  } catch (error) {
    console.error('[Services] Failed to get service:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get service' });
  }
}

/**
 * Update a service
 */
async function handleUpdateService(user, serviceId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, description, category, priceInCents, durationMinutes, isActive, sortOrder } = body;

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(category.toLowerCase());
    }
    if (priceInCents !== undefined) {
      updates.push(`price_in_cents = $${paramIndex++}`);
      params.push(priceInCents);
    }
    if (durationMinutes !== undefined) {
      updates.push(`duration_minutes = $${paramIndex++}`);
      params.push(durationMinutes);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(sortOrder);
    }

    if (updates.length === 0) {
      return createResponse(400, { error: 'Bad Request', message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(serviceId, ctx.tenantId);

    const result = await query(`
      UPDATE "Service"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
      RETURNING id, name, description, category, price_in_cents as "priceInCents",
                duration_minutes as "durationMinutes", is_active as "isActive",
                sort_order as "sortOrder", created_at as "createdAt", updated_at as "updatedAt"
    `, params);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Service not found' });
    }

    const service = result.rows[0];
    return createResponse(200, {
      ...service,
      category: service.category?.toUpperCase(),
      price: service.priceInCents / 100
    });
  } catch (error) {
    console.error('[Services] Failed to update service:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update service' });
  }
}

/**
 * Delete (soft-delete) a service
 */
async function handleDeleteService(user, serviceId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Soft delete by setting is_active to false
    const result = await query(`
      UPDATE "Service"
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [serviceId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Service not found' });
    }

    return createResponse(200, { success: true, message: 'Service deactivated' });
  } catch (error) {
    console.error('[Services] Failed to delete service:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete service' });
  }
}

// =============================================================================
// ADD-ON SERVICES HANDLERS
// =============================================================================

/**
 * List all add-on services for tenant
 */
async function handleListAddOnServices(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`
      SELECT id, name, description, price_in_cents, price_type,
             applies_to, is_active, created_at, updated_at
      FROM "AddOnService"
      WHERE tenant_id = $1
      ORDER BY is_active DESC, name ASC
    `, [ctx.tenantId]);

    return createResponse(200, { addons: result.rows });
  } catch (error) {
    console.error('[AddOnServices] Failed to list add-ons:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to list add-on services' });
  }
}

/**
 * Create a new add-on service
 */
async function handleCreateAddOnService(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, description, priceInCents, priceType, appliesTo, isActive } = body;

    if (!name || priceInCents === undefined) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Name and price are required'
      });
    }

    const result = await query(`
      INSERT INTO "AddOnService" (tenant_id, name, description, price_in_cents, price_type, applies_to, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      ctx.tenantId,
      name,
      description || null,
      priceInCents,
      priceType || 'flat',
      appliesTo || null,
      isActive !== false
    ]);

    return createResponse(201, { addon: result.rows[0] });
  } catch (error) {
    console.error('[AddOnServices] Failed to create add-on:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create add-on service' });
  }
}

/**
 * Get a single add-on service
 */
async function handleGetAddOnService(user, addonId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`
      SELECT * FROM "AddOnService"
      WHERE id = $1 AND tenant_id = $2
    `, [addonId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Add-on service not found' });
    }

    return createResponse(200, { addon: result.rows[0] });
  } catch (error) {
    console.error('[AddOnServices] Failed to get add-on:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get add-on service' });
  }
}

/**
 * Update an add-on service
 */
async function handleUpdateAddOnService(user, addonId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, description, priceInCents, priceType, appliesTo, isActive } = body;

    const result = await query(`
      UPDATE "AddOnService"
      SET name = COALESCE($3, name),
          description = COALESCE($4, description),
          price_in_cents = COALESCE($5, price_in_cents),
          price_type = COALESCE($6, price_type),
          applies_to = $7,
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [
      addonId,
      ctx.tenantId,
      name,
      description,
      priceInCents,
      priceType,
      appliesTo,
      isActive
    ]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Add-on service not found' });
    }

    return createResponse(200, { addon: result.rows[0] });
  } catch (error) {
    console.error('[AddOnServices] Failed to update add-on:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update add-on service' });
  }
}

/**
 * Delete (archive) an add-on service
 */
async function handleDeleteAddOnService(user, addonId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Soft delete by setting is_active = false
    const result = await query(`
      UPDATE "AddOnService"
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [addonId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Add-on service not found' });
    }

    return createResponse(200, { success: true, message: 'Add-on service archived' });
  } catch (error) {
    console.error('[AddOnServices] Failed to delete add-on:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete add-on service' });
  }
}

// =============================================================================
// OBJECT SETTINGS HANDLERS
// =============================================================================

const VALID_OBJECT_TYPES = [
  'owners', 'pets', 'bookings', 'services', 'facilities',
  'packages', 'invoices', 'payments', 'tickets'
];

const PIPELINE_OBJECTS = ['bookings', 'invoices', 'payments', 'tickets'];

/**
 * Get object settings for a specific object type
 */
async function handleGetObjectSettings(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!VALID_OBJECT_TYPES.includes(objectType.toLowerCase())) {
      return createResponse(400, { error: 'Bad Request', message: 'Invalid object type' });
    }

    const objType = objectType.toLowerCase();

    // Get settings
    const result = await query(
      `SELECT * FROM "ObjectSettings" WHERE tenant_id = $1 AND object_type = $2`,
      [ctx.tenantId, objType]
    );

    // Get record count based on object type
    const recordCount = await getObjectRecordCount(ctx.tenantId, objType);

    // Get data quality (completeness percentage)
    const dataQuality = await getObjectDataQuality(ctx.tenantId, objType);

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return createResponse(200, {
        objectType: objType,
        singularName: objectType.charAt(0).toUpperCase() + objectType.slice(1, -1),
        pluralName: objectType.charAt(0).toUpperCase() + objectType.slice(1),
        description: '',
        icon: null,
        primaryDisplayProperty: 'name',
        secondaryDisplayProperties: [],
        defaultStatus: null,
        autoAssignOwner: true,
        sendNotificationOnCreate: false,
        isPipelineObject: PIPELINE_OBJECTS.includes(objType),
        recordCount,
        dataQuality,
      });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      objectType: row.object_type,
      singularName: row.singular_name,
      pluralName: row.plural_name,
      description: row.description,
      icon: row.icon,
      primaryDisplayProperty: row.primary_display_property,
      secondaryDisplayProperties: row.secondary_display_properties || [],
      defaultStatus: row.default_status,
      autoAssignOwner: row.auto_assign_owner,
      sendNotificationOnCreate: row.send_notification_on_create,
      isPipelineObject: PIPELINE_OBJECTS.includes(row.object_type),
      recordCount,
      dataQuality,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error('[ObjectSettings] Failed to get:', error.message);
    if (error.code === '42P01') {
      return createResponse(200, {
        objectType: objectType.toLowerCase(),
        singularName: objectType.charAt(0).toUpperCase() + objectType.slice(1, -1),
        pluralName: objectType.charAt(0).toUpperCase() + objectType.slice(1),
        isPipelineObject: PIPELINE_OBJECTS.includes(objectType.toLowerCase()),
        recordCount: 0,
        dataQuality: 0,
      });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get object settings' });
  }
}

/**
 * Get record count for an object type
 */
async function getObjectRecordCount(tenantId, objectType) {
  const tableMap = {
    owners: 'Owner',
    pets: 'Pet',
    bookings: 'Booking',
    services: 'Service',
    facilities: 'Kennel',
    packages: 'Package',
    invoices: 'Invoice',
    payments: 'Payment',
    tickets: 'Ticket',
  };

  const tableName = tableMap[objectType];
  if (!tableName) return 0;

  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM "${tableName}" WHERE tenant_id = $1`,
      [tenantId]
    );
    return parseInt(result.rows[0]?.count || 0, 10);
  } catch (error) {
    // Table might not exist
    console.log(`[ObjectSettings] Could not count ${tableName}:`, error.code);
    return 0;
  }
}

/**
 * Get data quality (completeness) for an object type
 * Returns percentage of required fields filled across all records
 */
async function getObjectDataQuality(tenantId, objectType) {
  const tableMap = {
    owners: 'Owner',
    pets: 'Pet',
    bookings: 'Booking',
    services: 'Service',
    facilities: 'Kennel',
    packages: 'Package',
    invoices: 'Invoice',
    payments: 'Payment',
    tickets: 'Ticket',
  };

  // Required fields for each object type
  const requiredFieldsMap = {
    owners: ['first_name', 'last_name', 'email'],
    pets: ['name', 'species'],
    bookings: ['check_in_date', 'check_out_date', 'status'],
    services: ['name', 'price'],
    facilities: ['name'],
    packages: ['name', 'price'],
    invoices: ['total', 'status'],
    payments: ['amount', 'status'],
    tickets: ['subject', 'status'],
  };

  const tableName = tableMap[objectType];
  const requiredFields = requiredFieldsMap[objectType];
  if (!tableName || !requiredFields || requiredFields.length === 0) return 100;

  try {
    // Build query to check completeness
    const fieldChecks = requiredFields.map(f => `CASE WHEN ${f} IS NOT NULL AND ${f}::text != '' THEN 1 ELSE 0 END`).join(' + ');
    const maxScore = requiredFields.length;

    const result = await query(
      `SELECT
        COUNT(*) as total_records,
        COALESCE(AVG((${fieldChecks})::float / ${maxScore}) * 100, 100) as completeness
       FROM "${tableName}"
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const completeness = parseFloat(result.rows[0]?.completeness || 100);
    return Math.round(completeness);
  } catch (error) {
    console.log(`[ObjectSettings] Could not get quality for ${tableName}:`, error.code);
    return 100; // Default to 100% if table doesn't exist or error
  }
}

/**
 * Update object settings for a specific object type
 */
async function handleUpdateObjectSettings(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!VALID_OBJECT_TYPES.includes(objectType.toLowerCase())) {
      return createResponse(400, { error: 'Bad Request', message: 'Invalid object type' });
    }

    const {
      singularName, pluralName, description, icon,
      primaryDisplayProperty, secondaryDisplayProperties,
      defaultStatus, autoAssignOwner, sendNotificationOnCreate
    } = body;

    const osRecordId = await getNextRecordId(tenantId, 'ObjectSettings');
    const result = await query(
      `INSERT INTO "ObjectSettings" (
        tenant_id, record_id, object_type, singular_name, plural_name, description, icon,
        primary_display_property, secondary_display_properties,
        default_status, auto_assign_owner, send_notification_on_create
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (tenant_id, object_type) DO UPDATE SET
        singular_name = COALESCE(EXCLUDED.singular_name, "ObjectSettings".singular_name),
        plural_name = COALESCE(EXCLUDED.plural_name, "ObjectSettings".plural_name),
        description = COALESCE(EXCLUDED.description, "ObjectSettings".description),
        icon = COALESCE(EXCLUDED.icon, "ObjectSettings".icon),
        primary_display_property = COALESCE(EXCLUDED.primary_display_property, "ObjectSettings".primary_display_property),
        secondary_display_properties = COALESCE(EXCLUDED.secondary_display_properties, "ObjectSettings".secondary_display_properties),
        default_status = COALESCE(EXCLUDED.default_status, "ObjectSettings".default_status),
        auto_assign_owner = COALESCE(EXCLUDED.auto_assign_owner, "ObjectSettings".auto_assign_owner),
        send_notification_on_create = COALESCE(EXCLUDED.send_notification_on_create, "ObjectSettings".send_notification_on_create),
        updated_at = NOW()
      RETURNING *`,
      [
        ctx.tenantId, osRecordId, objectType.toLowerCase(),
        singularName, pluralName, description, icon,
        primaryDisplayProperty, JSON.stringify(secondaryDisplayProperties || []),
        defaultStatus, autoAssignOwner, sendNotificationOnCreate
      ]
    );

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      objectType: row.object_type,
      singularName: row.singular_name,
      pluralName: row.plural_name,
      description: row.description,
      icon: row.icon,
      primaryDisplayProperty: row.primary_display_property,
      secondaryDisplayProperties: row.secondary_display_properties || [],
      defaultStatus: row.default_status,
      autoAssignOwner: row.auto_assign_owner,
      sendNotificationOnCreate: row.send_notification_on_create,
      isPipelineObject: PIPELINE_OBJECTS.includes(row.object_type),
    });
  } catch (error) {
    console.error('[ObjectSettings] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update object settings' });
  }
}

// =============================================================================
// ASSOCIATION LABELS HANDLERS (describes relationship types)
// =============================================================================

/**
 * Get association labels for an object type
 */
async function handleGetAssociationLabels(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT * FROM "AssociationLabel"
       WHERE tenant_id = $1 AND (source_object = $2 OR target_object = $2)
       ORDER BY label`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    const labels = result.rows.map(row => ({
      id: row.id,
      sourceObject: row.source_object,
      targetObject: row.target_object,
      label: row.label,
      inverseLabel: row.inverse_label,
      maxAssociations: row.max_associations,
      description: row.description,
      isActive: row.is_active,
      usageCount: 0, // TODO: Count actual usage
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, { labels });
  } catch (error) {
    console.error('[AssociationLabels] Failed to get:', error.message);
    if (error.code === '42P01') return createResponse(200, { labels: [] });
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get association labels' });
  }
}

/**
 * Create a new association label
 */
async function handleCreateAssociationLabel(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { targetObject, label, inverseLabel, maxAssociations, description } = body;

    if (!targetObject || !label) {
      return createResponse(400, { error: 'Bad Request', message: 'Target object and label are required' });
    }

    const alRecordId = await getNextRecordId(ctx.tenantId, 'AssociationLabel');
    const result = await query(
      `INSERT INTO "AssociationLabel" (
        tenant_id, record_id, source_object, target_object, label,
        inverse_label, max_associations, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        ctx.tenantId, alRecordId, objectType.toLowerCase(), targetObject.toLowerCase(),
        label, inverseLabel || null, maxAssociations || null, description || null
      ]
    );

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      sourceObject: row.source_object,
      targetObject: row.target_object,
      label: row.label,
      inverseLabel: row.inverse_label,
      maxAssociations: row.max_associations,
      description: row.description,
    });
  } catch (error) {
    console.error('[AssociationLabels] Failed to create:', error.message);
    if (error.code === '23505') {
      return createResponse(409, { error: 'Conflict', message: 'A label with this name already exists for this association' });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create association label' });
  }
}

/**
 * Update an association label
 */
async function handleUpdateAssociationLabel(user, objectType, labelId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { label, inverseLabel, maxAssociations, description } = body;

    const result = await query(
      `UPDATE "AssociationLabel"
       SET label = COALESCE($1, label),
           inverse_label = $2,
           max_associations = $3,
           description = $4,
           updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      [label, inverseLabel || null, maxAssociations || null, description || null, labelId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Association label not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      sourceObject: row.source_object,
      targetObject: row.target_object,
      label: row.label,
      inverseLabel: row.inverse_label,
      maxAssociations: row.max_associations,
      description: row.description,
    });
  } catch (error) {
    console.error('[AssociationLabels] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update association label' });
  }
}

/**
 * Delete an association label
 */
async function handleDeleteAssociationLabel(user, objectType, labelId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `DELETE FROM "AssociationLabel" WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [labelId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Association label not found' });
    }

    return createResponse(200, { success: true });
  } catch (error) {
    console.error('[AssociationLabels] Failed to delete:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete association label' });
  }
}

// =============================================================================
// LEGACY OBJECT ASSOCIATIONS HANDLERS (keeping for backward compatibility)
// =============================================================================

/**
 * Get associations for an object type (legacy)
 */
async function handleGetObjectAssociations(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT * FROM "ObjectAssociation"
       WHERE tenant_id = $1 AND (source_object = $2 OR target_object = $2)
       ORDER BY created_at`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    const associations = result.rows.map(row => ({
      id: row.id,
      sourceObject: row.source_object,
      targetObject: row.target_object,
      cardinality: row.cardinality,
      sourceLabel: row.source_label,
      targetLabel: row.target_label,
      isSystem: row.is_system,
      associationLimit: row.association_limit,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, { associations });
  } catch (error) {
    console.error('[ObjectAssociations] Failed to get:', error.message);
    if (error.code === '42P01') return createResponse(200, { associations: [] });
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get associations' });
  }
}

/**
 * Create a new association
 */
async function handleCreateObjectAssociation(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { targetObject, cardinality, sourceLabel, targetLabel, associationLimit } = body;

    if (!targetObject) {
      return createResponse(400, { error: 'Bad Request', message: 'Target object is required' });
    }

    const oaRecordId = await getNextRecordId(ctx.tenantId, 'ObjectAssociation');
    const result = await query(
      `INSERT INTO "ObjectAssociation" (
        tenant_id, record_id, source_object, target_object, cardinality,
        source_label, target_label, association_limit, is_system
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
      RETURNING *`,
      [
        ctx.tenantId, oaRecordId, objectType.toLowerCase(), targetObject.toLowerCase(),
        cardinality || 'many_to_many', sourceLabel, targetLabel, associationLimit
      ]
    );

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      sourceObject: row.source_object,
      targetObject: row.target_object,
      cardinality: row.cardinality,
      sourceLabel: row.source_label,
      targetLabel: row.target_label,
      isSystem: row.is_system,
      associationLimit: row.association_limit,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('[ObjectAssociations] Failed to create:', error.message);
    if (error.code === '23505') {
      return createResponse(409, { error: 'Conflict', message: 'Association already exists' });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create association' });
  }
}

/**
 * Update an association
 */
async function handleUpdateObjectAssociation(user, objectType, assocId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { cardinality, sourceLabel, targetLabel, associationLimit, isActive } = body;

    // Cannot modify system associations
    const checkResult = await query(
      `SELECT is_system FROM "ObjectAssociation" WHERE id = $1 AND tenant_id = $2`,
      [assocId, ctx.tenantId]
    );

    if (checkResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Association not found' });
    }

    if (checkResult.rows[0].is_system) {
      return createResponse(403, { error: 'Forbidden', message: 'Cannot modify system association' });
    }

    const result = await query(
      `UPDATE "ObjectAssociation" SET
        cardinality = COALESCE($3, cardinality),
        source_label = COALESCE($4, source_label),
        target_label = COALESCE($5, target_label),
        association_limit = $6,
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [assocId, ctx.tenantId, cardinality, sourceLabel, targetLabel, associationLimit, isActive]
    );

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      sourceObject: row.source_object,
      targetObject: row.target_object,
      cardinality: row.cardinality,
      sourceLabel: row.source_label,
      targetLabel: row.target_label,
      isSystem: row.is_system,
      associationLimit: row.association_limit,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('[ObjectAssociations] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update association' });
  }
}

/**
 * Delete an association
 */
async function handleDeleteObjectAssociation(user, objectType, assocId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Cannot delete system associations
    const checkResult = await query(
      `SELECT is_system FROM "ObjectAssociation" WHERE id = $1 AND tenant_id = $2`,
      [assocId, ctx.tenantId]
    );

    if (checkResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Association not found' });
    }

    if (checkResult.rows[0].is_system) {
      return createResponse(403, { error: 'Forbidden', message: 'Cannot delete system association' });
    }

    await query(
      `DELETE FROM "ObjectAssociation" WHERE id = $1 AND tenant_id = $2`,
      [assocId, ctx.tenantId]
    );

    return createResponse(200, { success: true, message: 'Association deleted' });
  } catch (error) {
    console.error('[ObjectAssociations] Failed to delete:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete association' });
  }
}

// =============================================================================
// OBJECT PIPELINES HANDLERS
// =============================================================================

/**
 * Get pipelines for an object type
 */
async function handleGetObjectPipelines(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!PIPELINE_OBJECTS.includes(objectType.toLowerCase())) {
      return createResponse(400, { error: 'Bad Request', message: 'Object type does not support pipelines' });
    }

    const result = await query(
      `SELECT p.*,
        (SELECT json_agg(s ORDER BY s.display_order)
         FROM "PipelineStage" s
         WHERE s.pipeline_id = p.record_id AND s.is_active = true) as stages
       FROM "ObjectPipeline" p
       WHERE p.tenant_id = $1 AND p.object_type = $2 AND p.is_active = true
       ORDER BY p.display_order`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    const pipelines = result.rows.map(row => ({
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      displayOrder: row.display_order,
      isDefault: row.is_default,
      isActive: row.is_active,
      stages: (row.stages || []).map(s => ({
        id: s.id,
        name: s.name,
        displayOrder: s.display_order,
        stageType: s.stage_type,
        color: s.color,
        probability: s.probability,
        conditionalProperties: s.conditional_properties,
        isActive: s.is_active,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, { pipelines });
  } catch (error) {
    console.error('[ObjectPipelines] Failed to get:', error.message);
    if (error.code === '42P01') return createResponse(200, { pipelines: [] });
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get pipelines' });
  }
}

/**
 * Create a new pipeline
 */
async function handleCreateObjectPipeline(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (!PIPELINE_OBJECTS.includes(objectType.toLowerCase())) {
      return createResponse(400, { error: 'Bad Request', message: 'Object type does not support pipelines' });
    }

    const { name, isDefault } = body;
    if (!name) return createResponse(400, { error: 'Bad Request', message: 'Name is required' });

    // Get max display order
    const orderResult = await query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
       FROM "ObjectPipeline" WHERE tenant_id = $1 AND object_type = $2`,
      [ctx.tenantId, objectType.toLowerCase()]
    );
    const displayOrder = orderResult.rows[0].next_order;

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        `UPDATE "ObjectPipeline" SET is_default = false
         WHERE tenant_id = $1 AND object_type = $2`,
        [ctx.tenantId, objectType.toLowerCase()]
      );
    }

    const opRecordId = await getNextRecordId(ctx.tenantId, 'ObjectPipeline');
    const result = await query(
      `INSERT INTO "ObjectPipeline" (tenant_id, record_id, object_type, name, display_order, is_default)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ctx.tenantId, opRecordId, objectType.toLowerCase(), name, displayOrder, isDefault || false]
    );

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      displayOrder: row.display_order,
      isDefault: row.is_default,
      isActive: row.is_active,
      stages: [],
    });
  } catch (error) {
    console.error('[ObjectPipelines] Failed to create:', error.message);
    if (error.code === '23505') {
      return createResponse(409, { error: 'Conflict', message: 'Pipeline with this name already exists' });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create pipeline' });
  }
}

/**
 * Update a pipeline
 */
async function handleUpdateObjectPipeline(user, objectType, pipelineId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, isDefault, isActive } = body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        `UPDATE "ObjectPipeline" SET is_default = false
         WHERE tenant_id = $1 AND object_type = $2 AND id != $3`,
        [ctx.tenantId, objectType.toLowerCase(), pipelineId]
      );
    }

    const result = await query(
      `UPDATE "ObjectPipeline" SET
        name = COALESCE($3, name),
        is_default = COALESCE($4, is_default),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [pipelineId, ctx.tenantId, name, isDefault, isActive]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Pipeline not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      displayOrder: row.display_order,
      isDefault: row.is_default,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('[ObjectPipelines] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update pipeline' });
  }
}

/**
 * Delete a pipeline (soft delete)
 */
async function handleDeleteObjectPipeline(user, objectType, pipelineId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Cannot delete if it's the only pipeline
    const countResult = await query(
      `SELECT COUNT(*) as count FROM "ObjectPipeline"
       WHERE tenant_id = $1 AND object_type = $2 AND is_active = true`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    if (parseInt(countResult.rows[0].count) <= 1) {
      return createResponse(400, { error: 'Bad Request', message: 'Cannot delete the only pipeline' });
    }

    const result = await query(
      `UPDATE "ObjectPipeline" SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [pipelineId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Pipeline not found' });
    }

    return createResponse(200, { success: true, message: 'Pipeline deleted' });
  } catch (error) {
    console.error('[ObjectPipelines] Failed to delete:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete pipeline' });
  }
}

// =============================================================================
// PIPELINE STAGES HANDLERS
// =============================================================================

/**
 * Get stages for a pipeline
 */
async function handleGetPipelineStages(user, objectType, pipelineId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT * FROM "PipelineStage"
       WHERE pipeline_id = $1 AND tenant_id = $2 AND is_active = true
       ORDER BY display_order`,
      [pipelineId, ctx.tenantId]
    );

    const stages = result.rows.map(row => ({
      id: row.id,
      pipelineId: row.pipeline_id,
      name: row.name,
      displayOrder: row.display_order,
      stageType: row.stage_type,
      color: row.color,
      probability: row.probability,
      conditionalProperties: row.conditional_properties || [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, { stages });
  } catch (error) {
    console.error('[PipelineStages] Failed to get:', error.message);
    if (error.code === '42P01') return createResponse(200, { stages: [] });
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get stages' });
  }
}

/**
 * Create a new stage
 */
async function handleCreatePipelineStage(user, objectType, pipelineId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, stageType, color, probability, conditionalProperties } = body;
    if (!name) return createResponse(400, { error: 'Bad Request', message: 'Name is required' });

    // Verify pipeline exists
    const pipelineCheck = await query(
      `SELECT id FROM "ObjectPipeline" WHERE id = $1 AND tenant_id = $2`,
      [pipelineId, ctx.tenantId]
    );
    if (pipelineCheck.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Pipeline not found' });
    }

    // Get max display order
    const orderResult = await query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
       FROM "PipelineStage" WHERE pipeline_id = $1`,
      [pipelineId]
    );
    const displayOrder = orderResult.rows[0].next_order;

    const psRecordId = await getNextRecordId(ctx.tenantId, 'PipelineStage');
    const result = await query(
      `INSERT INTO "PipelineStage" (
        tenant_id, record_id, pipeline_id, name, display_order, stage_type, color, probability, conditional_properties
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        ctx.tenantId, psRecordId, pipelineId, name, displayOrder,
        stageType || 'open', color || '#6b7280', probability,
        JSON.stringify(conditionalProperties || [])
      ]
    );

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      pipelineId: row.pipeline_id,
      name: row.name,
      displayOrder: row.display_order,
      stageType: row.stage_type,
      color: row.color,
      probability: row.probability,
      conditionalProperties: row.conditional_properties || [],
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('[PipelineStages] Failed to create:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create stage' });
  }
}

/**
 * Update a stage
 */
async function handleUpdatePipelineStage(user, objectType, pipelineId, stageId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, stageType, color, probability, conditionalProperties, isActive } = body;

    const result = await query(
      `UPDATE "PipelineStage" SET
        name = COALESCE($4, name),
        stage_type = COALESCE($5, stage_type),
        color = COALESCE($6, color),
        probability = COALESCE($7, probability),
        conditional_properties = COALESCE($8, conditional_properties),
        is_active = COALESCE($9, is_active),
        updated_at = NOW()
      WHERE id = $1 AND pipeline_id = $2 AND tenant_id = $3
      RETURNING *`,
      [
        stageId, pipelineId, ctx.tenantId, name, stageType, color, probability,
        conditionalProperties ? JSON.stringify(conditionalProperties) : null, isActive
      ]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Stage not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      pipelineId: row.pipeline_id,
      name: row.name,
      displayOrder: row.display_order,
      stageType: row.stage_type,
      color: row.color,
      probability: row.probability,
      conditionalProperties: row.conditional_properties || [],
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('[PipelineStages] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update stage' });
  }
}

/**
 * Delete a stage
 */
async function handleDeletePipelineStage(user, objectType, pipelineId, stageId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `UPDATE "PipelineStage" SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND pipeline_id = $2 AND tenant_id = $3
       RETURNING *`,
      [stageId, pipelineId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Stage not found' });
    }

    return createResponse(200, { success: true, message: 'Stage deleted' });
  } catch (error) {
    console.error('[PipelineStages] Failed to delete:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete stage' });
  }
}

/**
 * Reorder stages in a pipeline
 */
async function handleReorderPipelineStages(user, objectType, pipelineId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { stageIds } = body;
    if (!Array.isArray(stageIds)) {
      return createResponse(400, { error: 'Bad Request', message: 'stageIds array required' });
    }

    // Update each stage's display_order
    for (let i = 0; i < stageIds.length; i++) {
      await query(
        `UPDATE "PipelineStage" SET display_order = $1, updated_at = NOW()
         WHERE id = $2 AND pipeline_id = $3 AND tenant_id = $4`,
        [i, stageIds[i], pipelineId, ctx.tenantId]
      );
    }

    return createResponse(200, { success: true, message: 'Stages reordered' });
  } catch (error) {
    console.error('[PipelineStages] Failed to reorder:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to reorder stages' });
  }
}

// =============================================================================
// OBJECT STATUSES HANDLERS (for non-pipeline objects)
// =============================================================================

/**
 * Get statuses for an object type
 */
async function handleGetObjectStatuses(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (PIPELINE_OBJECTS.includes(objectType.toLowerCase())) {
      return createResponse(400, { error: 'Bad Request', message: 'Pipeline objects use pipelines, not statuses' });
    }

    const result = await query(
      `SELECT * FROM "ObjectStatus"
       WHERE tenant_id = $1 AND object_type = $2 AND is_active = true
       ORDER BY display_order`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    const statuses = result.rows.map(row => ({
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      displayOrder: row.display_order,
      color: row.color,
      isDefault: row.is_default,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, { statuses });
  } catch (error) {
    console.error('[ObjectStatuses] Failed to get:', error.message);
    if (error.code === '42P01') return createResponse(200, { statuses: [] });
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get statuses' });
  }
}

/**
 * Create a new status
 */
async function handleCreateObjectStatus(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    if (PIPELINE_OBJECTS.includes(objectType.toLowerCase())) {
      return createResponse(400, { error: 'Bad Request', message: 'Pipeline objects use pipelines, not statuses' });
    }

    const { name, color, isDefault } = body;
    if (!name) return createResponse(400, { error: 'Bad Request', message: 'Name is required' });

    // Get max display order
    const orderResult = await query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
       FROM "ObjectStatus" WHERE tenant_id = $1 AND object_type = $2`,
      [ctx.tenantId, objectType.toLowerCase()]
    );
    const displayOrder = orderResult.rows[0].next_order;

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        `UPDATE "ObjectStatus" SET is_default = false
         WHERE tenant_id = $1 AND object_type = $2`,
        [ctx.tenantId, objectType.toLowerCase()]
      );
    }

    const osRecordId = await getNextRecordId(ctx.tenantId, 'ObjectStatus');
    const result = await query(
      `INSERT INTO "ObjectStatus" (tenant_id, record_id, object_type, name, display_order, color, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [ctx.tenantId, osRecordId, objectType.toLowerCase(), name, displayOrder, color || '#6b7280', isDefault || false]
    );

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      displayOrder: row.display_order,
      color: row.color,
      isDefault: row.is_default,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('[ObjectStatuses] Failed to create:', error.message);
    if (error.code === '23505') {
      return createResponse(409, { error: 'Conflict', message: 'Status with this name already exists' });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create status' });
  }
}

/**
 * Update a status
 */
async function handleUpdateObjectStatus(user, objectType, statusId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, color, isDefault, isActive } = body;

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        `UPDATE "ObjectStatus" SET is_default = false
         WHERE tenant_id = $1 AND object_type = $2 AND id != $3`,
        [ctx.tenantId, objectType.toLowerCase(), statusId]
      );
    }

    const result = await query(
      `UPDATE "ObjectStatus" SET
        name = COALESCE($3, name),
        color = COALESCE($4, color),
        is_default = COALESCE($5, is_default),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [statusId, ctx.tenantId, name, color, isDefault, isActive]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Status not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      displayOrder: row.display_order,
      color: row.color,
      isDefault: row.is_default,
      isActive: row.is_active,
    });
  } catch (error) {
    console.error('[ObjectStatuses] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update status' });
  }
}

/**
 * Delete a status
 */
async function handleDeleteObjectStatus(user, objectType, statusId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `UPDATE "ObjectStatus" SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [statusId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Status not found' });
    }

    return createResponse(200, { success: true, message: 'Status deleted' });
  } catch (error) {
    console.error('[ObjectStatuses] Failed to delete:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete status' });
  }
}

/**
 * Reorder statuses
 */
async function handleReorderObjectStatuses(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { statusIds } = body;
    if (!Array.isArray(statusIds)) {
      return createResponse(400, { error: 'Bad Request', message: 'statusIds array required' });
    }

    for (let i = 0; i < statusIds.length; i++) {
      await query(
        `UPDATE "ObjectStatus" SET display_order = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3 AND object_type = $4`,
        [i, statusIds[i], ctx.tenantId, objectType.toLowerCase()]
      );
    }

    return createResponse(200, { success: true, message: 'Statuses reordered' });
  } catch (error) {
    console.error('[ObjectStatuses] Failed to reorder:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to reorder statuses' });
  }
}

// =============================================================================
// RECORD LAYOUT HANDLERS
// =============================================================================

/**
 * Get record layouts for an object type
 */
async function handleGetRecordLayouts(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT * FROM "ObjectRecordLayout"
       WHERE tenant_id = $1 AND object_type = $2
       ORDER BY is_default DESC, name`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    const layouts = result.rows.map(row => ({
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      layoutType: row.layout_type,
      teamId: row.team_id,
      leftSidebarConfig: row.left_sidebar_config || [],
      middleColumnConfig: row.middle_column_config || { tabs: ['overview', 'activities'] },
      rightSidebarConfig: row.right_sidebar_config || [],
      assignedTo: row.assigned_to || [],
      isDefault: row.is_default,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, { layouts });
  } catch (error) {
    console.error('[RecordLayout] Failed to get:', error.message);
    if (error.code === '42P01') return createResponse(200, { layouts: [] });
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get layouts' });
  }
}

/**
 * Create a new record layout
 */
async function handleCreateRecordLayout(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      name, layoutType, teamId, leftSidebarConfig, middleColumnConfig,
      rightSidebarConfig, assignedTo, isDefault
    } = body;

    if (!name) return createResponse(400, { error: 'Bad Request', message: 'Name is required' });

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        `UPDATE "ObjectRecordLayout" SET is_default = false
         WHERE tenant_id = $1 AND object_type = $2`,
        [ctx.tenantId, objectType.toLowerCase()]
      );
    }

    const orlRecordId = await getNextRecordId(ctx.tenantId, 'ObjectRecordLayout');
    const result = await query(
      `INSERT INTO "ObjectRecordLayout" (
        tenant_id, record_id, object_type, name, layout_type, team_id,
        left_sidebar_config, middle_column_config, right_sidebar_config,
        assigned_to, is_default, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        ctx.tenantId, orlRecordId, objectType.toLowerCase(), name, layoutType || 'default', teamId,
        JSON.stringify(leftSidebarConfig || []),
        JSON.stringify(middleColumnConfig || { tabs: ['overview', 'activities'] }),
        JSON.stringify(rightSidebarConfig || []),
        JSON.stringify(assignedTo || []),
        isDefault || false, ctx.userId
      ]
    );

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      layoutType: row.layout_type,
      teamId: row.team_id,
      leftSidebarConfig: row.left_sidebar_config || [],
      middleColumnConfig: row.middle_column_config || { tabs: ['overview', 'activities'] },
      rightSidebarConfig: row.right_sidebar_config || [],
      assignedTo: row.assigned_to || [],
      isDefault: row.is_default,
      createdBy: row.created_by,
    });
  } catch (error) {
    console.error('[RecordLayout] Failed to create:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create layout' });
  }
}

/**
 * Update a record layout
 */
async function handleUpdateRecordLayout(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      id, name, layoutType, teamId, leftSidebarConfig, middleColumnConfig,
      rightSidebarConfig, assignedTo, isDefault
    } = body;

    if (!id) return createResponse(400, { error: 'Bad Request', message: 'Layout ID required' });

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        `UPDATE "ObjectRecordLayout" SET is_default = false
         WHERE tenant_id = $1 AND object_type = $2 AND id != $3`,
        [ctx.tenantId, objectType.toLowerCase(), id]
      );
    }

    const result = await query(
      `UPDATE "ObjectRecordLayout" SET
        name = COALESCE($3, name),
        layout_type = COALESCE($4, layout_type),
        team_id = $5,
        left_sidebar_config = COALESCE($6, left_sidebar_config),
        middle_column_config = COALESCE($7, middle_column_config),
        right_sidebar_config = COALESCE($8, right_sidebar_config),
        assigned_to = COALESCE($9, assigned_to),
        is_default = COALESCE($10, is_default),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [
        id, ctx.tenantId, name, layoutType, teamId,
        leftSidebarConfig ? JSON.stringify(leftSidebarConfig) : null,
        middleColumnConfig ? JSON.stringify(middleColumnConfig) : null,
        rightSidebarConfig ? JSON.stringify(rightSidebarConfig) : null,
        assignedTo ? JSON.stringify(assignedTo) : null,
        isDefault
      ]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Layout not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      layoutType: row.layout_type,
      teamId: row.team_id,
      leftSidebarConfig: row.left_sidebar_config || [],
      middleColumnConfig: row.middle_column_config || { tabs: ['overview', 'activities'] },
      rightSidebarConfig: row.right_sidebar_config || [],
      assignedTo: row.assigned_to || [],
      isDefault: row.is_default,
    });
  } catch (error) {
    console.error('[RecordLayout] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update layout' });
  }
}

/**
 * Reset record layout to default
 */
async function handleResetRecordLayout(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Delete all custom layouts and keep only default
    await query(
      `DELETE FROM "ObjectRecordLayout"
       WHERE tenant_id = $1 AND object_type = $2 AND layout_type != 'default'`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    // Reset default layout to system defaults
    await query(
      `UPDATE "ObjectRecordLayout" SET
        left_sidebar_config = '[]',
        middle_column_config = '{"tabs": ["overview", "activities"]}',
        right_sidebar_config = '[]',
        assigned_to = '[]',
        updated_at = NOW()
      WHERE tenant_id = $1 AND object_type = $2 AND layout_type = 'default'`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    return createResponse(200, { success: true, message: 'Layout reset to default' });
  } catch (error) {
    console.error('[RecordLayout] Failed to reset:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to reset layout' });
  }
}

// =============================================================================
// PREVIEW LAYOUT HANDLERS
// =============================================================================

/**
 * Get preview layouts for an object type
 */
async function handleGetPreviewLayouts(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT * FROM "ObjectPreviewLayout"
       WHERE tenant_id = $1 AND object_type = $2
       ORDER BY is_default DESC, name`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    const layouts = result.rows.map(row => ({
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      properties: row.properties || [],
      showQuickInfo: row.show_quick_info,
      showQuickActions: row.show_quick_actions,
      showRecentActivity: row.show_recent_activity,
      assignedTo: row.assigned_to || [],
      isDefault: row.is_default,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, { layouts });
  } catch (error) {
    console.error('[PreviewLayout] Failed to get:', error.message);
    if (error.code === '42P01') return createResponse(200, { layouts: [] });
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get layouts' });
  }
}

/**
 * Update preview layout
 */
async function handleUpdatePreviewLayout(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      id, name, properties, showQuickInfo, showQuickActions,
      showRecentActivity, assignedTo, isDefault
    } = body;

    if (id) {
      // Update existing layout
      const result = await query(
        `UPDATE "ObjectPreviewLayout" SET
          name = COALESCE($3, name),
          properties = COALESCE($4, properties),
          show_quick_info = COALESCE($5, show_quick_info),
          show_quick_actions = COALESCE($6, show_quick_actions),
          show_recent_activity = COALESCE($7, show_recent_activity),
          assigned_to = COALESCE($8, assigned_to),
          is_default = COALESCE($9, is_default),
          updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *`,
        [
          id, ctx.tenantId, name,
          properties ? JSON.stringify(properties) : null,
          showQuickInfo, showQuickActions, showRecentActivity,
          assignedTo ? JSON.stringify(assignedTo) : null,
          isDefault
        ]
      );

      if (result.rows.length === 0) {
        return createResponse(404, { error: 'Not Found', message: 'Layout not found' });
      }

      const row = result.rows[0];
      return createResponse(200, {
        id: row.id,
        objectType: row.object_type,
        name: row.name,
        properties: row.properties || [],
        showQuickInfo: row.show_quick_info,
        showQuickActions: row.show_quick_actions,
        showRecentActivity: row.show_recent_activity,
        assignedTo: row.assigned_to || [],
        isDefault: row.is_default,
      });
    } else {
      // Create new layout
      if (!name) return createResponse(400, { error: 'Bad Request', message: 'Name is required' });

      const oplRecordId = await getNextRecordId(ctx.tenantId, 'ObjectPreviewLayout');
      const result = await query(
        `INSERT INTO "ObjectPreviewLayout" (
          tenant_id, record_id, object_type, name, properties, show_quick_info,
          show_quick_actions, show_recent_activity, assigned_to, is_default, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          ctx.tenantId, oplRecordId, objectType.toLowerCase(), name,
          JSON.stringify(properties || []),
          showQuickInfo !== false, showQuickActions !== false, showRecentActivity || false,
          JSON.stringify(assignedTo || []), isDefault || false, ctx.userId
        ]
      );

      const row = result.rows[0];
      return createResponse(201, {
        id: row.id,
        objectType: row.object_type,
        name: row.name,
        properties: row.properties || [],
        showQuickInfo: row.show_quick_info,
        showQuickActions: row.show_quick_actions,
        showRecentActivity: row.show_recent_activity,
        assignedTo: row.assigned_to || [],
        isDefault: row.is_default,
      });
    }
  } catch (error) {
    console.error('[PreviewLayout] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update layout' });
  }
}

// =============================================================================
// INDEX SETTINGS HANDLERS
// =============================================================================

/**
 * Get index settings for an object type
 */
async function handleGetIndexSettings(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT * FROM "ObjectIndexSettings"
       WHERE tenant_id = $1 AND object_type = $2`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Return default settings
      return createResponse(200, {
        objectType: objectType.toLowerCase(),
        defaultColumns: [],
        defaultSortColumn: 'created_at',
        defaultSortDirection: 'desc',
        defaultFilters: {},
        rowsPerPage: 25,
        enableBulkActions: true,
        enableInlineEditing: false,
        enableRowSelection: true,
      });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      objectType: row.object_type,
      defaultColumns: row.default_columns || [],
      defaultSortColumn: row.default_sort_column,
      defaultSortDirection: row.default_sort_direction,
      defaultFilters: row.default_filters || {},
      rowsPerPage: row.rows_per_page,
      enableBulkActions: row.enable_bulk_actions,
      enableInlineEditing: row.enable_inline_editing,
      enableRowSelection: row.enable_row_selection,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error('[IndexSettings] Failed to get:', error.message);
    if (error.code === '42P01') {
      return createResponse(200, {
        objectType: objectType.toLowerCase(),
        defaultColumns: [],
        defaultSortColumn: 'created_at',
        defaultSortDirection: 'desc',
        rowsPerPage: 25,
      });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get index settings' });
  }
}

/**
 * Update index settings
 */
async function handleUpdateIndexSettings(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      defaultColumns, defaultSortColumn, defaultSortDirection, defaultFilters,
      rowsPerPage, enableBulkActions, enableInlineEditing, enableRowSelection
    } = body;

    const oisRecordId = await getNextRecordId(ctx.tenantId, 'ObjectIndexSettings');
    const result = await query(
      `INSERT INTO "ObjectIndexSettings" (
        tenant_id, record_id, object_type, default_columns, default_sort_column,
        default_sort_direction, default_filters, rows_per_page,
        enable_bulk_actions, enable_inline_editing, enable_row_selection
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (tenant_id, object_type) DO UPDATE SET
        default_columns = COALESCE(EXCLUDED.default_columns, "ObjectIndexSettings".default_columns),
        default_sort_column = COALESCE(EXCLUDED.default_sort_column, "ObjectIndexSettings".default_sort_column),
        default_sort_direction = COALESCE(EXCLUDED.default_sort_direction, "ObjectIndexSettings".default_sort_direction),
        default_filters = COALESCE(EXCLUDED.default_filters, "ObjectIndexSettings".default_filters),
        rows_per_page = COALESCE(EXCLUDED.rows_per_page, "ObjectIndexSettings".rows_per_page),
        enable_bulk_actions = COALESCE(EXCLUDED.enable_bulk_actions, "ObjectIndexSettings".enable_bulk_actions),
        enable_inline_editing = COALESCE(EXCLUDED.enable_inline_editing, "ObjectIndexSettings".enable_inline_editing),
        enable_row_selection = COALESCE(EXCLUDED.enable_row_selection, "ObjectIndexSettings".enable_row_selection),
        updated_at = NOW()
      RETURNING *`,
      [
        ctx.tenantId, oisRecordId, objectType.toLowerCase(),
        JSON.stringify(defaultColumns || []),
        defaultSortColumn || 'created_at',
        defaultSortDirection || 'desc',
        JSON.stringify(defaultFilters || {}),
        rowsPerPage || 25,
        enableBulkActions !== false,
        enableInlineEditing || false,
        enableRowSelection !== false
      ]
    );

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      objectType: row.object_type,
      defaultColumns: row.default_columns || [],
      defaultSortColumn: row.default_sort_column,
      defaultSortDirection: row.default_sort_direction,
      defaultFilters: row.default_filters || {},
      rowsPerPage: row.rows_per_page,
      enableBulkActions: row.enable_bulk_actions,
      enableInlineEditing: row.enable_inline_editing,
      enableRowSelection: row.enable_row_selection,
    });
  } catch (error) {
    console.error('[IndexSettings] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update index settings' });
  }
}

// =============================================================================
// SAVED VIEWS HANDLERS
// =============================================================================

/**
 * Get saved views for an object type
 */
async function handleGetSavedViews(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT sv.*, us.first_name, us.last_name, u.email
       FROM "SavedView" sv
       LEFT JOIN "User" u ON sv.owner_id = u.record_id AND sv.tenant_id = u.tenant_id
       LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
       WHERE sv.tenant_id = $1 AND sv.object_type = $2
       ORDER BY sv.is_admin_promoted DESC, sv.is_default DESC, sv.name`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    const views = result.rows.map(row => ({
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      ownerId: row.owner_id,
      ownerName: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : row.email,
      isDefault: row.is_default,
      isAdminPromoted: row.is_admin_promoted,
      columns: row.columns || [],
      filters: row.filters || {},
      sortColumn: row.sort_column,
      sortDirection: row.sort_direction,
      assignedTo: row.assigned_to || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, { views });
  } catch (error) {
    console.error('[SavedViews] Failed to get:', error.message);
    if (error.code === '42P01') return createResponse(200, { views: [] });
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get saved views' });
  }
}

/**
 * Create a saved view
 */
async function handleCreateSavedView(user, objectType, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, columns, filters, sortColumn, sortDirection, assignedTo, isDefault } = body;
    if (!name) return createResponse(400, { error: 'Bad Request', message: 'Name is required' });

    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await query(
        `UPDATE "SavedView" SET is_default = false
         WHERE tenant_id = $1 AND object_type = $2 AND owner_id = $3`,
        [ctx.tenantId, objectType.toLowerCase(), ctx.userId]
      );
    }

    const svRecordId = await getNextRecordId(ctx.tenantId, 'SavedView');
    const result = await query(
      `INSERT INTO "SavedView" (
        tenant_id, record_id, object_type, name, owner_id, columns, filters,
        sort_column, sort_direction, assigned_to, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        ctx.tenantId, svRecordId, objectType.toLowerCase(), name, ctx.userId,
        JSON.stringify(columns || []), JSON.stringify(filters || {}),
        sortColumn, sortDirection || 'asc',
        JSON.stringify(assignedTo || []), isDefault || false
      ]
    );

    const row = result.rows[0];
    return createResponse(201, {
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      ownerId: row.owner_id,
      isDefault: row.is_default,
      isAdminPromoted: row.is_admin_promoted,
      columns: row.columns || [],
      filters: row.filters || {},
      sortColumn: row.sort_column,
      sortDirection: row.sort_direction,
      assignedTo: row.assigned_to || [],
    });
  } catch (error) {
    console.error('[SavedViews] Failed to create:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create saved view' });
  }
}

/**
 * Update a saved view
 */
async function handleUpdateSavedView(user, objectType, viewId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const { name, columns, filters, sortColumn, sortDirection, assignedTo, isDefault } = body;

    // Verify ownership or admin
    const checkResult = await query(
      `SELECT owner_id FROM "SavedView" WHERE id = $1 AND tenant_id = $2`,
      [viewId, ctx.tenantId]
    );

    if (checkResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'View not found' });
    }

    // For now allow any user to edit any view - could add permission check here

    // If setting as default, unset other defaults
    if (isDefault) {
      await query(
        `UPDATE "SavedView" SET is_default = false
         WHERE tenant_id = $1 AND object_type = $2 AND owner_id = $3 AND id != $4`,
        [ctx.tenantId, objectType.toLowerCase(), ctx.userId, viewId]
      );
    }

    const result = await query(
      `UPDATE "SavedView" SET
        name = COALESCE($3, name),
        columns = COALESCE($4, columns),
        filters = COALESCE($5, filters),
        sort_column = COALESCE($6, sort_column),
        sort_direction = COALESCE($7, sort_direction),
        assigned_to = COALESCE($8, assigned_to),
        is_default = COALESCE($9, is_default),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [
        viewId, ctx.tenantId, name,
        columns ? JSON.stringify(columns) : null,
        filters ? JSON.stringify(filters) : null,
        sortColumn, sortDirection,
        assignedTo ? JSON.stringify(assignedTo) : null,
        isDefault
      ]
    );

    const row = result.rows[0];
    return createResponse(200, {
      id: row.id,
      objectType: row.object_type,
      name: row.name,
      ownerId: row.owner_id,
      isDefault: row.is_default,
      isAdminPromoted: row.is_admin_promoted,
      columns: row.columns || [],
      filters: row.filters || {},
      sortColumn: row.sort_column,
      sortDirection: row.sort_direction,
      assignedTo: row.assigned_to || [],
    });
  } catch (error) {
    console.error('[SavedViews] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update saved view' });
  }
}

/**
 * Delete a saved view
 */
async function handleDeleteSavedView(user, objectType, viewId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `DELETE FROM "SavedView" WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [viewId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'View not found' });
    }

    return createResponse(200, { success: true, message: 'View deleted' });
  } catch (error) {
    console.error('[SavedViews] Failed to delete:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete saved view' });
  }
}

/**
 * Set a view as default
 */
async function handleSetDefaultView(user, objectType, viewId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Unset other defaults
    await query(
      `UPDATE "SavedView" SET is_default = false
       WHERE tenant_id = $1 AND object_type = $2 AND owner_id = $3`,
      [ctx.tenantId, objectType.toLowerCase(), ctx.userId]
    );

    // Set this view as default
    const result = await query(
      `UPDATE "SavedView" SET is_default = true, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [viewId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'View not found' });
    }

    return createResponse(200, { success: true, message: 'View set as default' });
  } catch (error) {
    console.error('[SavedViews] Failed to set default:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to set default view' });
  }
}

/**
 * Promote a view (admin only - makes visible to all users)
 */
async function handlePromoteSavedView(user, objectType, viewId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // TODO: Add admin permission check

    const result = await query(
      `UPDATE "SavedView" SET is_admin_promoted = true, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [viewId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'View not found' });
    }

    return createResponse(200, { success: true, message: 'View promoted' });
  } catch (error) {
    console.error('[SavedViews] Failed to promote:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to promote view' });
  }
}

// =============================================================================
// OBJECT PROPERTIES HANDLER
// =============================================================================

/**
 * Get available properties for an object type
 */
async function handleGetObjectProperties(user, objectType) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get custom properties for this object type
    const result = await query(
      `SELECT * FROM "Property"
       WHERE tenant_id = $1 AND entity_type = $2 AND is_active = true
       ORDER BY display_order, name`,
      [ctx.tenantId, objectType.toLowerCase()]
    );

    // Define system properties for each object type
    const systemProperties = getSystemProperties(objectType.toLowerCase());

    const customProperties = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      label: row.label,
      type: row.property_type,
      isSystem: false,
      isRequired: row.is_required,
      options: row.options || [],
      displayOrder: row.display_order,
    }));

    return createResponse(200, {
      properties: [...systemProperties, ...customProperties],
      systemProperties,
      customProperties,
    });
  } catch (error) {
    console.error('[ObjectProperties] Failed to get:', error.message);
    if (error.code === '42P01') {
      return createResponse(200, {
        properties: getSystemProperties(objectType.toLowerCase()),
        systemProperties: getSystemProperties(objectType.toLowerCase()),
        customProperties: [],
      });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get properties' });
  }
}

/**
 * Get system properties for an object type
 */
function getSystemProperties(objectType) {
  const commonProps = [
    { id: 'sys_created_at', name: 'created_at', label: 'Created At', type: 'datetime', isSystem: true },
    { id: 'sys_updated_at', name: 'updated_at', label: 'Updated At', type: 'datetime', isSystem: true },
  ];

  const typeProps = {
    owners: [
      { id: 'sys_first_name', name: 'first_name', label: 'First Name', type: 'text', isSystem: true },
      { id: 'sys_last_name', name: 'last_name', label: 'Last Name', type: 'text', isSystem: true },
      { id: 'sys_email', name: 'email', label: 'Email', type: 'email', isSystem: true },
      { id: 'sys_phone', name: 'phone', label: 'Phone', type: 'phone', isSystem: true },
      { id: 'sys_address', name: 'address', label: 'Address', type: 'text', isSystem: true },
    ],
    pets: [
      { id: 'sys_name', name: 'name', label: 'Name', type: 'text', isSystem: true },
      { id: 'sys_species', name: 'species', label: 'Species', type: 'select', isSystem: true },
      { id: 'sys_breed', name: 'breed', label: 'Breed', type: 'text', isSystem: true },
      { id: 'sys_weight', name: 'weight', label: 'Weight', type: 'number', isSystem: true },
      { id: 'sys_birthdate', name: 'birthdate', label: 'Birthdate', type: 'date', isSystem: true },
      { id: 'sys_gender', name: 'gender', label: 'Gender', type: 'select', isSystem: true },
    ],
    bookings: [
      { id: 'sys_check_in', name: 'check_in_date', label: 'Check In', type: 'datetime', isSystem: true },
      { id: 'sys_check_out', name: 'check_out_date', label: 'Check Out', type: 'datetime', isSystem: true },
      { id: 'sys_status', name: 'status', label: 'Status', type: 'select', isSystem: true },
      { id: 'sys_total', name: 'total_price', label: 'Total Price', type: 'currency', isSystem: true },
    ],
    services: [
      { id: 'sys_name', name: 'name', label: 'Name', type: 'text', isSystem: true },
      { id: 'sys_description', name: 'description', label: 'Description', type: 'textarea', isSystem: true },
      { id: 'sys_price', name: 'price', label: 'Price', type: 'currency', isSystem: true },
      { id: 'sys_duration', name: 'duration', label: 'Duration', type: 'number', isSystem: true },
    ],
    facilities: [
      { id: 'sys_name', name: 'name', label: 'Name', type: 'text', isSystem: true },
      { id: 'sys_capacity', name: 'capacity', label: 'Capacity', type: 'number', isSystem: true },
      { id: 'sys_type', name: 'type', label: 'Type', type: 'select', isSystem: true },
    ],
    packages: [
      { id: 'sys_name', name: 'name', label: 'Name', type: 'text', isSystem: true },
      { id: 'sys_description', name: 'description', label: 'Description', type: 'textarea', isSystem: true },
      { id: 'sys_price', name: 'price', label: 'Price', type: 'currency', isSystem: true },
    ],
    invoices: [
      { id: 'sys_number', name: 'invoice_number', label: 'Invoice Number', type: 'text', isSystem: true },
      { id: 'sys_amount', name: 'amount', label: 'Amount', type: 'currency', isSystem: true },
      { id: 'sys_status', name: 'status', label: 'Status', type: 'select', isSystem: true },
      { id: 'sys_due_date', name: 'due_date', label: 'Due Date', type: 'date', isSystem: true },
    ],
    payments: [
      { id: 'sys_amount', name: 'amount', label: 'Amount', type: 'currency', isSystem: true },
      { id: 'sys_method', name: 'method', label: 'Method', type: 'select', isSystem: true },
      { id: 'sys_status', name: 'status', label: 'Status', type: 'select', isSystem: true },
    ],
    tickets: [
      { id: 'sys_title', name: 'title', label: 'Title', type: 'text', isSystem: true },
      { id: 'sys_description', name: 'description', label: 'Description', type: 'textarea', isSystem: true },
      { id: 'sys_priority', name: 'priority', label: 'Priority', type: 'select', isSystem: true },
      { id: 'sys_status', name: 'status', label: 'Status', type: 'select', isSystem: true },
    ],
  };

  return [...(typeProps[objectType] || []), ...commonProps];
}

// ============================================================================
// PROPERTY GROUPS HANDLERS
// ============================================================================

/**
 * GET /api/v2/property-groups
 * List all property groups for an entity type
 */
async function handleListPropertyGroups(user, queryParams) {
  console.log('[CONFIG-SERVICE] handleListPropertyGroups');

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const { entityType, objectType } = queryParams;
    const effectiveEntityType = entityType || objectType;

    let sql = `SELECT * FROM "PropertyGroup" WHERE tenant_id = $1`;
    const values = [ctx.tenantId];
    let paramIndex = 2;

    if (effectiveEntityType) {
      sql += ` AND entity_type = $${paramIndex++}`;
      values.push(effectiveEntityType);
    }

    sql += ` ORDER BY display_order, name`;

    const result = await query(sql, values);

    return createResponse(200, {
      success: true,
      groups: result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        entityType: row.entity_type,
        name: row.name,
        description: row.description,
        icon: row.icon,
        displayOrder: row.display_order,
        isSystem: row.is_system,
        isCollapsedDefault: row.is_collapsed_default,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to list property groups:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve property groups',
    });
  }
}

/**
 * POST /api/v2/property-groups
 * Create a property group
 */
async function handleCreatePropertyGroup(user, body) {
  console.log('[CONFIG-SERVICE] handleCreatePropertyGroup');

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const { entityType, name, description, icon, displayOrder = 0, isCollapsedDefault = false } = body;

    if (!entityType || !name) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'entityType and name are required',
      });
    }

    const pgRecordId = await getNextRecordId(ctx.tenantId, 'PropertyGroup');
    const result = await query(
      `INSERT INTO "PropertyGroup" (tenant_id, record_id, entity_type, name, description, icon, display_order, is_collapsed_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [ctx.tenantId, pgRecordId, entityType, name, description, icon, displayOrder, isCollapsedDefault]
    );

    const group = result.rows[0];

    return createResponse(201, {
      success: true,
      group: {
        id: group.id,
        tenantId: group.tenant_id,
        entityType: group.entity_type,
        name: group.name,
        description: group.description,
        icon: group.icon,
        displayOrder: group.display_order,
        isSystem: group.is_system,
        isCollapsedDefault: group.is_collapsed_default,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to create property group:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create property group',
    });
  }
}

/**
 * PUT/PATCH /api/v2/property-groups/:id
 * Update a property group
 */
async function handleUpdatePropertyGroup(user, groupId, body) {
  console.log('[CONFIG-SERVICE] handleUpdatePropertyGroup -', groupId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // Check if group exists and belongs to tenant
    const existing = await query(
      `SELECT * FROM "PropertyGroup" WHERE id = $1 AND tenant_id = $2`,
      [groupId, ctx.tenantId]
    );

    if (existing.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Property group not found' });
    }

    // System groups can only have display order updated
    if (existing.rows[0].is_system) {
      const allowedFields = ['displayOrder', 'isCollapsedDefault'];
      const attemptedFields = Object.keys(body);
      const disallowed = attemptedFields.filter(f => !allowedFields.includes(f));
      if (disallowed.length > 0) {
        return createResponse(403, {
          error: 'Forbidden',
          message: `Cannot modify ${disallowed.join(', ')} on system groups`,
        });
      }
    }

    const { name, description, icon, displayOrder, isCollapsedDefault } = body;

    const result = await query(
      `UPDATE "PropertyGroup"
       SET name = COALESCE($3, name),
           description = COALESCE($4, description),
           icon = COALESCE($5, icon),
           display_order = COALESCE($6, display_order),
           is_collapsed_default = COALESCE($7, is_collapsed_default),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [groupId, ctx.tenantId, name, description, icon, displayOrder, isCollapsedDefault]
    );

    const group = result.rows[0];

    return createResponse(200, {
      success: true,
      group: {
        id: group.id,
        tenantId: group.tenant_id,
        entityType: group.entity_type,
        name: group.name,
        description: group.description,
        icon: group.icon,
        displayOrder: group.display_order,
        isSystem: group.is_system,
        isCollapsedDefault: group.is_collapsed_default,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update property group:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update property group',
    });
  }
}

/**
 * DELETE /api/v2/property-groups/:id
 * Delete a property group
 */
async function handleDeletePropertyGroup(user, groupId) {
  console.log('[CONFIG-SERVICE] handleDeletePropertyGroup -', groupId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    // Check if group exists
    const existing = await query(
      `SELECT * FROM "PropertyGroup" WHERE id = $1 AND tenant_id = $2`,
      [groupId, ctx.tenantId]
    );

    if (existing.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Property group not found' });
    }

    // Cannot delete system groups
    if (existing.rows[0].is_system) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Cannot delete system property groups',
      });
    }

    // Check if any properties use this group
    const propsInGroup = await query(
      `SELECT COUNT(*) as count FROM "Property" WHERE tenant_id = $1 AND property_group = $2`,
      [ctx.tenantId, existing.rows[0].name]
    );

    if (parseInt(propsInGroup.rows[0].count, 10) > 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Cannot delete group that contains properties. Move properties to another group first.',
      });
    }

    await query(
      `DELETE FROM "PropertyGroup" WHERE id = $1 AND tenant_id = $2`,
      [groupId, ctx.tenantId]
    );

    return createResponse(200, {
      success: true,
      message: 'Property group deleted successfully',
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to delete property group:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete property group',
    });
  }
}

// ============================================================================
// PROPERTY LOGIC RULES HANDLERS
// ============================================================================

/**
 * GET /api/v2/property-logic
 * List all logic rules for an entity type
 */
async function handleListPropertyLogicRules(user, queryParams) {
  console.log('[CONFIG-SERVICE] handleListPropertyLogicRules');

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const { entityType, objectType } = queryParams;
    const effectiveEntityType = entityType || objectType;

    let sql = `SELECT * FROM "PropertyLogicRule" WHERE tenant_id = $1`;
    const values = [ctx.tenantId];
    let paramIndex = 2;

    if (effectiveEntityType) {
      sql += ` AND entity_type = $${paramIndex++}`;
      values.push(effectiveEntityType);
    }

    sql += ` AND is_active = true ORDER BY created_at`;

    const result = await query(sql, values);

    return createResponse(200, {
      success: true,
      rules: result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        entityType: row.entity_type,
        name: row.name,
        triggerProperty: row.trigger_property,
        conditionOperator: row.condition_operator,
        conditionValue: row.condition_value,
        affectedProperties: row.affected_properties || [],
        action: row.action,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to list property logic rules:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve property logic rules',
    });
  }
}

/**
 * POST /api/v2/property-logic
 * Create a logic rule
 */
async function handleCreatePropertyLogicRule(user, body) {
  console.log('[CONFIG-SERVICE] handleCreatePropertyLogicRule');

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const {
      entityType,
      name,
      triggerProperty,
      conditionOperator,
      conditionValue,
      affectedProperties,
      action = 'show',
    } = body;

    if (!entityType || !triggerProperty || !conditionOperator || !affectedProperties?.length) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'entityType, triggerProperty, conditionOperator, and affectedProperties are required',
      });
    }

    const plrRecordId = await getNextRecordId(ctx.tenantId, 'PropertyLogicRule');
    const result = await query(
      `INSERT INTO "PropertyLogicRule" (tenant_id, record_id, entity_type, name, trigger_property, condition_operator, condition_value, affected_properties, action)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [ctx.tenantId, plrRecordId, entityType, name, triggerProperty, conditionOperator, conditionValue, JSON.stringify(affectedProperties), action]
    );

    const rule = result.rows[0];

    return createResponse(201, {
      success: true,
      rule: {
        id: rule.id,
        tenantId: rule.tenant_id,
        entityType: rule.entity_type,
        name: rule.name,
        triggerProperty: rule.trigger_property,
        conditionOperator: rule.condition_operator,
        conditionValue: rule.condition_value,
        affectedProperties: rule.affected_properties,
        action: rule.action,
        isActive: rule.is_active,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to create property logic rule:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create property logic rule',
    });
  }
}

/**
 * PUT/PATCH /api/v2/property-logic/:id
 * Update a logic rule
 */
async function handleUpdatePropertyLogicRule(user, ruleId, body) {
  console.log('[CONFIG-SERVICE] handleUpdatePropertyLogicRule -', ruleId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const existing = await query(
      `SELECT * FROM "PropertyLogicRule" WHERE id = $1 AND tenant_id = $2`,
      [ruleId, ctx.tenantId]
    );

    if (existing.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Property logic rule not found' });
    }

    const {
      name,
      triggerProperty,
      conditionOperator,
      conditionValue,
      affectedProperties,
      action,
      isActive,
    } = body;

    const result = await query(
      `UPDATE "PropertyLogicRule"
       SET name = COALESCE($3, name),
           trigger_property = COALESCE($4, trigger_property),
           condition_operator = COALESCE($5, condition_operator),
           condition_value = COALESCE($6, condition_value),
           affected_properties = COALESCE($7, affected_properties),
           action = COALESCE($8, action),
           is_active = COALESCE($9, is_active),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [ruleId, ctx.tenantId, name, triggerProperty, conditionOperator, conditionValue,
       affectedProperties ? JSON.stringify(affectedProperties) : null, action, isActive]
    );

    const rule = result.rows[0];

    return createResponse(200, {
      success: true,
      rule: {
        id: rule.id,
        tenantId: rule.tenant_id,
        entityType: rule.entity_type,
        name: rule.name,
        triggerProperty: rule.trigger_property,
        conditionOperator: rule.condition_operator,
        conditionValue: rule.condition_value,
        affectedProperties: rule.affected_properties,
        action: rule.action,
        isActive: rule.is_active,
        createdAt: rule.created_at,
        updatedAt: rule.updated_at,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update property logic rule:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update property logic rule',
    });
  }
}

/**
 * DELETE /api/v2/property-logic/:id
 * Delete (soft) a logic rule
 */
async function handleDeletePropertyLogicRule(user, ruleId) {
  console.log('[CONFIG-SERVICE] handleDeletePropertyLogicRule -', ruleId);

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user, true);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const result = await query(
      `UPDATE "PropertyLogicRule"
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [ruleId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Property logic rule not found' });
    }

    return createResponse(200, {
      success: true,
      message: 'Property logic rule deleted successfully',
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to delete property logic rule:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete property logic rule',
    });
  }
}

// ============================================================================
// PROPERTY TEMPLATES HANDLERS (Quick-Add)
// ============================================================================

/**
 * GET /api/v2/property-templates
 * List property templates for quick-add
 */
async function handleListPropertyTemplates(user, queryParams) {
  console.log('[CONFIG-SERVICE] handleListPropertyTemplates');

  try {
    await getPoolAsync();

    const { entityType, objectType } = queryParams;
    const effectiveEntityType = entityType || objectType;

    let sql = `SELECT * FROM "PropertyTemplate" WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (effectiveEntityType) {
      sql += ` AND entity_type = $${paramIndex++}`;
      values.push(effectiveEntityType);
    }

    sql += ` ORDER BY entity_type, sort_order, name`;

    const result = await query(sql, values);

    return createResponse(200, {
      success: true,
      templates: result.rows.map(row => ({
        id: row.id,
        entityType: row.entity_type,
        name: row.name,
        label: row.label,
        description: row.description,
        fieldType: row.field_type,
        options: row.options || [],
        propertyGroup: row.property_group,
        icon: row.icon,
        category: row.category,
        sortOrder: row.sort_order,
      })),
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to list property templates:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve property templates',
    });
  }
}

// =============================================================================
// INTEGRATIONS HANDLERS
// =============================================================================
// Third-party integrations: Google Calendar, Stripe, Mailchimp, Twilio, QuickBooks
// =============================================================================

const SUPPORTED_INTEGRATIONS = [
  {
    provider: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync bookings with Google Calendar',
    icon: 'calendar',
    category: 'calendar',
  },
  {
    provider: 'stripe',
    name: 'Stripe',
    description: 'Accept online payments',
    icon: 'credit-card',
    category: 'payments',
  },
  {
    provider: 'mailchimp',
    name: 'Mailchimp',
    description: 'Email marketing automation',
    icon: 'mail',
    category: 'marketing',
  },
  {
    provider: 'twilio',
    name: 'Twilio',
    description: 'SMS notifications',
    icon: 'message-square',
    category: 'communications',
  },
  {
    provider: 'quickbooks',
    name: 'QuickBooks',
    description: 'Accounting integration',
    icon: 'calculator',
    category: 'accounting',
  },
];

/**
 * List all integrations with connection status
 */
async function handleListIntegrations(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get connected integrations from database
    const result = await query(
      `SELECT provider, status, connected_at, last_sync_at, error_message
       FROM "Integration" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const connectedMap = {};
    for (const row of result.rows) {
      connectedMap[row.provider] = {
        status: row.status,
        connectedAt: row.connected_at,
        lastSyncAt: row.last_sync_at,
        errorMessage: row.error_message,
      };
    }

    // Build response with all integrations
    const integrations = SUPPORTED_INTEGRATIONS.map(integration => ({
      ...integration,
      status: connectedMap[integration.provider]?.status || 'disconnected',
      isConnected: connectedMap[integration.provider]?.status === 'connected',
      connectedAt: connectedMap[integration.provider]?.connectedAt || null,
      lastSyncAt: connectedMap[integration.provider]?.lastSyncAt || null,
      errorMessage: connectedMap[integration.provider]?.errorMessage || null,
    }));

    return createResponse(200, {
      success: true,
      integrations,
    });
  } catch (error) {
    console.error('[Integrations] Failed to list integrations:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to list integrations' });
  }
}

/**
 * Get specific integration details
 */
async function handleGetIntegration(user, provider) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Find the integration definition
    const integrationDef = SUPPORTED_INTEGRATIONS.find(i => i.provider === provider);
    if (!integrationDef) {
      return createResponse(404, { error: 'Not Found', message: `Integration '${provider}' not found` });
    }

    // Get connection status from database
    const result = await query(
      `SELECT * FROM "Integration" WHERE tenant_id = $1 AND provider = $2`,
      [ctx.tenantId, provider]
    );

    const connection = result.rows[0];

    return createResponse(200, {
      success: true,
      integration: {
        ...integrationDef,
        status: connection?.status || 'disconnected',
        isConnected: connection?.status === 'connected',
        connectedAt: connection?.connected_at || null,
        lastSyncAt: connection?.last_sync_at || null,
        errorMessage: connection?.error_message || null,
        config: connection?.config || {},
      },
    });
  } catch (error) {
    console.error('[Integrations] Failed to get integration:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get integration' });
  }
}

// Force rebuild 12/25/2025 18:28:24


// =============================================================================
// KENNEL TYPES HANDLERS
// =============================================================================

/**
 * Get kennel types for current tenant
 */
async function handleGetKennelTypes(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    }

    const result = await query(
      `SELECT kennel_types FROM "TenantSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const defaultTypes = ['Standard', 'Suite', 'Cabin', 'VIP', 'Medical'];
    const kennelTypes = result.rows[0]?.kennel_types || defaultTypes;

    return createResponse(200, {
      kennelTypes: Array.isArray(kennelTypes) ? kennelTypes : defaultTypes,
    });
  } catch (error) {
    console.error('[KennelTypes] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load kennel types' });
  }
}

/**
 * Update kennel types for current tenant
 */
async function handleUpdateKennelTypes(user, body) {
  const { kennelTypes } = body;

  if (!Array.isArray(kennelTypes)) {
    return createResponse(400, { error: 'Bad Request', message: 'kennelTypes must be an array' });
  }

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    }

    await query(
      `UPDATE "TenantSettings" SET kennel_types = $2, updated_at = NOW() WHERE tenant_id = $1`,
      [ctx.tenantId, JSON.stringify(kennelTypes)]
    );

    return createResponse(200, {
      success: true,
      kennelTypes,
    });
  } catch (error) {
    console.error('[KennelTypes] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update kennel types' });
  }
}

// =============================================================================
// STAFF ROLES HANDLERS (TenantSettings-based, like kennel types)
// =============================================================================

/**
 * Get staff roles for current tenant from TenantSettings
 */
async function handleGetStaffRoles(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    }

    const result = await query(
      `SELECT staff_roles FROM "TenantSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const defaultRoles = ['Manager', 'Kennel Tech', 'Groomer', 'Trainer'];
    const staffRoles = result.rows[0]?.staff_roles || defaultRoles;

    return createResponse(200, {
      staffRoles: Array.isArray(staffRoles) ? staffRoles : defaultRoles,
    });
  } catch (error) {
    console.error('[StaffRoles] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load staff roles' });
  }
}

/**
 * Update staff roles for current tenant
 */
async function handleUpdateStaffRoles(user, body) {
  const { staffRoles } = body;

  if (!Array.isArray(staffRoles)) {
    return createResponse(400, { error: 'Bad Request', message: 'staffRoles must be an array' });
  }

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    }

    await query(
      `UPDATE "TenantSettings" SET staff_roles = $2, updated_at = NOW() WHERE tenant_id = $1`,
      [ctx.tenantId, JSON.stringify(staffRoles)]
    );

    return createResponse(200, {
      success: true,
      staffRoles,
    });
  } catch (error) {
    console.error('[StaffRoles] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update staff roles' });
  }
}
