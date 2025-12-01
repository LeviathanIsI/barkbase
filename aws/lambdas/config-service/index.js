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

const { getPoolAsync, query } = dbLayer;
const {
  authenticateRequest,
  createResponse,
  parseBody,
} = sharedLayer;

/**
 * Route requests to appropriate handlers
 */
exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';

  console.log('[CONFIG-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  try {
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
    if (path === '/api/v1/config/payment-settings' || path === '/config/payment-settings') {
      if (method === 'GET') {
        return handleGetPaymentSettings(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePaymentSettings(user, parseBody(event));
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
    // Enterprise custom fields system - like HubSpot's custom properties
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
    `SELECT id, tenant_id, role FROM "User" WHERE cognito_sub = $1 LIMIT 1`,
    [cognitoSub]
  );

  if (result.rows.length === 0) {
    return { tenantId: null, userId: null, role: null };
  }

  const user = result.rows[0];
  return {
    tenantId: user.tenant_id,
    userId: user.id,
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
    const result = await query(
      `SELECT
         u.id as user_id,
         u.email,
         u.first_name,
         u.last_name,
         u.role,
         u.tenant_id,
         t.id as tenant_record_id,
         t.name as tenant_name,
         t.slug as tenant_slug,
         t.plan as tenant_plan,
         t.settings as tenant_settings,
         t.theme as tenant_theme,
         t.feature_flags as tenant_features,
         t.created_at as tenant_created_at,
         (SELECT COUNT(*) FROM "Service" WHERE tenant_id = t.id) as service_count,
         (SELECT COUNT(*) FROM "Kennel" WHERE tenant_id = t.id) as kennel_count
       FROM "User" u
       LEFT JOIN "Tenant" t ON u.tenant_id = t.id
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

    // Return tenant config in the format frontend expects
    return createResponse(200, {
      // Top-level fields for compatibility
      id: row.tenant_id,
      recordId: row.tenant_id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      hasOnboardingCompleted,
      name: row.tenant_name,
      slug: row.tenant_slug,
      plan: row.tenant_plan || 'FREE',
      settings: row.tenant_settings || {},
      theme: row.tenant_theme || {},
      featureFlags: row.tenant_features || {},
      createdAt: row.tenant_created_at,
      // User info
      user: {
        id: row.user_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
      },
      // Nested tenant object for some frontend code paths
      tenant: {
        id: row.tenant_id,
        recordId: row.tenant_id,
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
 */
async function handleUpdateTenantConfig(user, body) {
  const { name, settings } = body;

  try {
    await getPoolAsync();

    // Get user's tenant and verify permission
    const userResult = await query(
      `SELECT role, tenant_id FROM "User" WHERE cognito_sub = $1`,
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

    // Build update
    const updates = [];
    const values = [tenantId];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Tenant"
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING id, name, slug, plan, settings, updated_at`,
      values
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
      settings: updated.settings || {},
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
 */
async function handleGetTenantTheme(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT t.theme
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

    return createResponse(200, {
      theme: result.rows[0].theme || {
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
 */
async function handleUpdateTenantTheme(user, body) {
  const { theme, primaryColor, secondaryColor, logo } = body;

  try {
    await getPoolAsync();

    // Get user's tenant
    const userResult = await query(
      `SELECT role, tenant_id FROM "User" WHERE cognito_sub = $1`,
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
      `UPDATE "Tenant"
       SET theme = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING theme`,
      [tenantId, JSON.stringify(themeData)]
    );

    return createResponse(200, {
      success: true,
      theme: result.rows[0].theme,
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

    const userResult = await query(
      `SELECT role, tenant_id FROM "User" WHERE cognito_sub = $1`,
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
 */
async function handleGetSettings(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT t.settings
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

    return createResponse(200, {
      settings: result.rows[0].settings || {},
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

    // First get the user's tenant
    console.log('[CONFIG-SERVICE] Querying user with cognito_sub:', user.id);
    const userResult = await query(
      `SELECT tenant_id, role FROM "User" WHERE cognito_sub = $1`,
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

    // Get all memberships for this tenant with user details
    console.log('[CONFIG-SERVICE] Querying memberships for tenant:', tenantId);
    const result = await query(
      `SELECT
         m.id,
         m.tenant_id,
         m.user_id,
         m.role,
         m.status,
         m.invited_at,
         m.joined_at,
         m.created_at,
         m.updated_at,
         u.email,
         u.first_name,
         u.last_name,
         u.cognito_sub
       FROM "Membership" m
       LEFT JOIN "User" u ON m.user_id = u.id
       WHERE m.tenant_id = $1
       ORDER BY m.created_at DESC`,
      [tenantId]
    );

    console.log('[CONFIG-SERVICE] handleGetMemberships - found:', result.rows.length, 'members');

    // Transform to frontend-friendly format
    const members = result.rows.map(row => ({
      id: row.id,
      membershipId: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      role: row.role,
      status: row.status || 'active',
      invitedAt: row.invited_at,
      joinedAt: row.joined_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // User details
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      name: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email,
      // Flag if this is the current user
      isCurrentUser: row.cognito_sub === user.id,
    }));

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

    // Get current user's tenant and verify permission
    const userResult = await query(
      `SELECT tenant_id, role FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { tenant_id: tenantId, role: currentUserRole } = userResult.rows[0];

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

    // Check if user with this email already exists
    const existingUser = await query(
      `SELECT id FROM "User" WHERE email = $1`,
      [email.toLowerCase()]
    );

    let userId;

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;

      // Check if already a member of this tenant
      const existingMembership = await query(
        `SELECT id FROM "Membership" WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );

      if (existingMembership.rows.length > 0) {
        return createResponse(409, {
          error: 'Conflict',
          message: 'This user is already a member of your team',
        });
      }
    } else {
      // Create new user record (pending Cognito signup)
      const newUser = await query(
        `INSERT INTO "User" (email, first_name, last_name, role, tenant_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [email.toLowerCase(), firstName || null, lastName || null, role, tenantId]
      );
      userId = newUser.rows[0].id;
    }

    // Create membership record
    const membership = await query(
      `INSERT INTO "Membership" (tenant_id, user_id, role, status, invited_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'invited', NOW(), NOW(), NOW())
       RETURNING *`,
      [tenantId, userId, role]
    );

    const newMembership = membership.rows[0];

    console.log('[CONFIG-SERVICE] handleCreateMembership - created:', newMembership.id);

    return createResponse(201, {
      success: true,
      message: 'Team member invited successfully',
      membership: {
        id: newMembership.id,
        membershipId: newMembership.id,
        tenantId: newMembership.tenant_id,
        userId: newMembership.user_id,
        role: newMembership.role,
        status: newMembership.status,
        invitedAt: newMembership.invited_at,
        createdAt: newMembership.created_at,
        email,
        firstName,
        lastName,
        name: firstName && lastName ? `${firstName} ${lastName}` : email,
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

    // Get current user's tenant and role
    const userResult = await query(
      `SELECT tenant_id, role, id as user_id FROM "User" WHERE cognito_sub = $1`,
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
      `SELECT m.*, u.id as target_user_id
       FROM "Membership" m
       LEFT JOIN "User" u ON m.user_id = u.id
       WHERE m.id = $1 AND m.tenant_id = $2`,
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

    // Get current user's tenant and role
    const userResult = await query(
      `SELECT tenant_id, role, id as user_id FROM "User" WHERE cognito_sub = $1`,
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
      `SELECT m.*, u.id as target_user_id
       FROM "Membership" m
       LEFT JOIN "User" u ON m.user_id = u.id
       WHERE m.id = $1 AND m.tenant_id = $2`,
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
// data model. Similar to HubSpot's custom properties or Airtable's fields.
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
    `SELECT u.id as user_id, u.role, u.tenant_id, t.plan
     FROM "User" u
     LEFT JOIN "Tenant" t ON u.tenant_id = t.id
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
    tenantId: row.tenant_id,
    name: row.name,
    label: row.label,
    description: row.description,
    fieldType: row.field_type,
    entityType: row.entity_type,
    options: row.options || [],
    required: row.required,
    defaultValue: row.default_value,
    validationRules: row.validation_rules || {},
    sortOrder: row.sort_order,
    propertyGroup: row.property_group,
    showInList: row.show_in_list,
    showInForm: row.show_in_form,
    isSystem: row.is_system,
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
    propertyName: row.column_name,
    displayLabel: row.display_label,
    description: row.description,
    entityType: row.entity_type,
    dataType: row.data_type,
    options: row.options || [],
    isRequired: row.is_required,
    defaultValue: null,
    validationRules: row.validation_rules || {},
    propertyGroup: row.property_group,
    sortOrder: row.sort_order,
    showInList: row.show_in_list,
    showInForm: row.show_in_form,
    isSystem: true, // Always true for system properties
    isActive: true, // System properties are always active
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    const result = await query(
      `INSERT INTO "Property" (
        tenant_id, name, label, description, field_type, entity_type,
        options, required, default_value, validation_rules,
        sort_order, property_group, show_in_list, show_in_form
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        tenantId, name, label, description || null, fieldType, entityType,
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
      await query(
        `INSERT INTO "PropertyValue" (tenant_id, property_id, entity_type, entity_id, value)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (property_id, entity_id)
         DO UPDATE SET value = $5, updated_at = NOW()`,
        [ctx.tenantId, property.id, entityType, entityId, JSON.stringify(value)]
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

    let whereClause = 'tenant_id = $1 AND deleted_at IS NULL';
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
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
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
      `SELECT id FROM "FormTemplate" WHERE tenant_id = $1 AND slug = $2 AND deleted_at IS NULL`,
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
      `UPDATE "FormTemplate" SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING *`,
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

    const result = await query(
      `UPDATE "FormTemplate" SET deleted_at = NOW(), updated_by = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [formId, ctx.tenantId, ctx.userId]
    );

    if (result.rows.length === 0) {
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
       FROM "FormSubmission" fs JOIN "FormTemplate" ft ON fs.template_id = ft.id LEFT JOIN "Owner" o ON fs.owner_id = o.id LEFT JOIN "Pet" p ON fs.pet_id = p.id
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
       LEFT JOIN "Owner" o ON fs.owner_id = o.id LEFT JOIN "Pet" p ON fs.pet_id = p.id
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
      `SELECT id, require_signature FROM "FormTemplate" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND is_active = true`,
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
 */
async function handleGetAccountDefaults(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    }

    const result = await query(
      `SELECT
         name, phone, email, website, notes, address, city, state, zip_code as "postalCode", country,
         logo_url, logo_filename,
         operating_hours, holidays,
         timezone, date_format, time_format, week_starts_on,
         supported_currencies, default_currency,
         created_at, updated_at
       FROM "Tenant"
       WHERE id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Tenant not found' });
    }

    const tenant = result.rows[0];

    // Build response matching frontend schema
    const response = {
      businessInfo: {
        name: tenant.name || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        website: tenant.website || '',
        notes: tenant.notes || '',
        address: {
          street: tenant.address || '',
          street2: '',
          city: tenant.city || '',
          state: tenant.state || '',
          postalCode: tenant.postalCode || '',
          country: tenant.country || 'United States',
        },
        logo: tenant.logo_url ? {
          url: tenant.logo_url,
          fileName: tenant.logo_filename,
          uploadedAt: null,
          size: null,
        } : null,
      },
      operatingHours: tenant.operating_hours || {
        monday: { isOpen: true, open: '08:00', close: '18:00' },
        tuesday: { isOpen: true, open: '08:00', close: '18:00' },
        wednesday: { isOpen: true, open: '08:00', close: '18:00' },
        thursday: { isOpen: true, open: '08:00', close: '18:00' },
        friday: { isOpen: true, open: '08:00', close: '18:00' },
        saturday: { isOpen: true, open: '09:00', close: '17:00' },
        sunday: { isOpen: true, open: '09:00', close: '17:00' },
      },
      holidays: tenant.holidays || [],
      regionalSettings: {
        timeZone: tenant.timezone || 'America/New_York',
        dateFormat: tenant.date_format || 'MM/DD/YYYY',
        timeFormat: tenant.time_format || '12-hour',
        weekStartsOn: tenant.week_starts_on || 'Sunday',
      },
      currencySettings: {
        supportedCurrencies: tenant.supported_currencies || ['USD'],
        defaultCurrency: tenant.default_currency || 'USD',
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
 */
async function handleUpdateAccountDefaults(user, body) {
  const { businessInfo, operatingHours, holidays, regionalSettings, currencySettings } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) {
      return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Business info
    if (businessInfo) {
      if (businessInfo.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(businessInfo.name); }
      if (businessInfo.phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(businessInfo.phone); }
      if (businessInfo.email !== undefined) { updates.push(`email = $${paramIndex++}`); values.push(businessInfo.email); }
      if (businessInfo.website !== undefined) { updates.push(`website = $${paramIndex++}`); values.push(businessInfo.website); }
      if (businessInfo.notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(businessInfo.notes); }
      if (businessInfo.address) {
        if (businessInfo.address.street !== undefined) { updates.push(`address = $${paramIndex++}`); values.push(businessInfo.address.street); }
        if (businessInfo.address.city !== undefined) { updates.push(`city = $${paramIndex++}`); values.push(businessInfo.address.city); }
        if (businessInfo.address.state !== undefined) { updates.push(`state = $${paramIndex++}`); values.push(businessInfo.address.state); }
        if (businessInfo.address.postalCode !== undefined) { updates.push(`zip_code = $${paramIndex++}`); values.push(businessInfo.address.postalCode); }
        if (businessInfo.address.country !== undefined) { updates.push(`country = $${paramIndex++}`); values.push(businessInfo.address.country); }
      }
      if (businessInfo.logo) {
        updates.push(`logo_url = $${paramIndex++}`); values.push(businessInfo.logo.url);
        updates.push(`logo_filename = $${paramIndex++}`); values.push(businessInfo.logo.fileName);
      }
    }

    // Operating hours
    if (operatingHours !== undefined) {
      updates.push(`operating_hours = $${paramIndex++}`);
      values.push(JSON.stringify(operatingHours));
    }

    // Holidays
    if (holidays !== undefined) {
      updates.push(`holidays = $${paramIndex++}`);
      values.push(JSON.stringify(holidays));
    }

    // Regional settings
    if (regionalSettings) {
      if (regionalSettings.timeZone !== undefined) { updates.push(`timezone = $${paramIndex++}`); values.push(regionalSettings.timeZone); }
      if (regionalSettings.dateFormat !== undefined) { updates.push(`date_format = $${paramIndex++}`); values.push(regionalSettings.dateFormat); }
      if (regionalSettings.timeFormat !== undefined) { updates.push(`time_format = $${paramIndex++}`); values.push(regionalSettings.timeFormat); }
      if (regionalSettings.weekStartsOn !== undefined) { updates.push(`week_starts_on = $${paramIndex++}`); values.push(regionalSettings.weekStartsOn); }
    }

    // Currency settings
    if (currencySettings) {
      if (currencySettings.supportedCurrencies !== undefined) {
        updates.push(`supported_currencies = $${paramIndex++}`);
        values.push(currencySettings.supportedCurrencies);
      }
      if (currencySettings.defaultCurrency !== undefined) {
        updates.push(`default_currency = $${paramIndex++}`);
        values.push(currencySettings.defaultCurrency);
      }
    }

    if (updates.length === 0) {
      return createResponse(400, { error: 'Bad Request', message: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(ctx.tenantId);

    await query(
      `UPDATE "Tenant" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
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

async function handleGetBranding(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT name, logo_url, primary_color, secondary_color, custom_terminology, theme_settings
       FROM "Tenant" WHERE id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Tenant not found' });
    }

    const tenant = result.rows[0];
    return createResponse(200, {
      businessName: tenant.name || '',
      logoUrl: tenant.logo_url || '',
      primaryColor: tenant.primary_color || '#3B82F6',
      secondaryColor: tenant.secondary_color || '#10B981',
      customTerminology: tenant.custom_terminology || {},
      themeSettings: tenant.theme_settings || {},
    });
  } catch (error) {
    console.error('[Branding] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load branding settings' });
  }
}

async function handleUpdateBranding(user, body) {
  const { businessName, logoUrl, primaryColor, secondaryColor, customTerminology, themeSettings } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (businessName !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(businessName); }
    if (logoUrl !== undefined) { updates.push(`logo_url = $${paramIndex++}`); values.push(logoUrl); }
    if (primaryColor !== undefined) { updates.push(`primary_color = $${paramIndex++}`); values.push(primaryColor); }
    if (secondaryColor !== undefined) { updates.push(`secondary_color = $${paramIndex++}`); values.push(secondaryColor); }
    if (customTerminology !== undefined) { updates.push(`custom_terminology = $${paramIndex++}`); values.push(JSON.stringify(customTerminology)); }
    if (themeSettings !== undefined) { updates.push(`theme_settings = $${paramIndex++}`); values.push(JSON.stringify(themeSettings)); }

    if (updates.length === 0) return createResponse(400, { error: 'Bad Request', message: 'No fields to update' });

    updates.push('updated_at = NOW()');
    values.push(ctx.tenantId);

    await query(`UPDATE "Tenant" SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);

    return handleGetBranding(user);
  } catch (error) {
    console.error('[Branding] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update branding' });
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

    // Try to get from NotificationSettings table first
    const result = await query(
      `SELECT * FROM "NotificationSettings" WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      // Return defaults if no settings exist yet
      return createResponse(200, {
        success: true,
        settings: DEFAULT_NOTIFICATION_SETTINGS,
        isDefault: true,
      });
    }

    const row = result.rows[0];
    const settings = {
      emailEnabled: row.email_enabled,
      smsEnabled: row.sms_enabled,
      pushEnabled: row.push_enabled,
      bookingConfirmations: row.booking_confirmations,
      bookingReminders: row.booking_reminders,
      checkinReminders: row.checkin_reminders,
      vaccinationReminders: row.vaccination_reminders,
      paymentReceipts: row.payment_receipts,
      marketingEnabled: row.marketing_enabled,
      reminderDaysBefore: row.reminder_days_before,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
      useCustomTemplates: row.use_custom_templates,
      includePhotosInUpdates: row.include_photos_in_updates,
    };

    return createResponse(200, {
      success: true,
      settings,
      isDefault: false,
    });
  } catch (error) {
    console.error('[Notifications] Failed to get:', error.message);
    // If table doesn't exist yet, return defaults
    if (error.message?.includes('does not exist')) {
      return createResponse(200, {
        success: true,
        settings: DEFAULT_NOTIFICATION_SETTINGS,
        isDefault: true,
      });
    }
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load notification settings' });
  }
}

async function handleUpdateNotificationSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const {
      emailEnabled = true,
      smsEnabled = false,
      pushEnabled = false,
      bookingConfirmations = true,
      bookingReminders = true,
      checkinReminders = true,
      vaccinationReminders = true,
      paymentReceipts = true,
      marketingEnabled = false,
      reminderDaysBefore = 2,
      quietHoursStart = '21:00',
      quietHoursEnd = '08:00',
      useCustomTemplates = false,
      includePhotosInUpdates = true,
    } = body;

    // Upsert - insert or update
    const result = await query(
      `INSERT INTO "NotificationSettings" (
        tenant_id,
        email_enabled, sms_enabled, push_enabled,
        booking_confirmations, booking_reminders, checkin_reminders,
        vaccination_reminders, payment_receipts, marketing_enabled,
        reminder_days_before, quiet_hours_start, quiet_hours_end,
        use_custom_templates, include_photos_in_updates
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (tenant_id) DO UPDATE SET
        email_enabled = EXCLUDED.email_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        push_enabled = EXCLUDED.push_enabled,
        booking_confirmations = EXCLUDED.booking_confirmations,
        booking_reminders = EXCLUDED.booking_reminders,
        checkin_reminders = EXCLUDED.checkin_reminders,
        vaccination_reminders = EXCLUDED.vaccination_reminders,
        payment_receipts = EXCLUDED.payment_receipts,
        marketing_enabled = EXCLUDED.marketing_enabled,
        reminder_days_before = EXCLUDED.reminder_days_before,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        use_custom_templates = EXCLUDED.use_custom_templates,
        include_photos_in_updates = EXCLUDED.include_photos_in_updates,
        updated_at = NOW()
      RETURNING *`,
      [
        ctx.tenantId,
        emailEnabled, smsEnabled, pushEnabled,
        bookingConfirmations, bookingReminders, checkinReminders,
        vaccinationReminders, paymentReceipts, marketingEnabled,
        reminderDaysBefore, quietHoursStart, quietHoursEnd,
        useCustomTemplates, includePhotosInUpdates
      ]
    );

    const row = result.rows[0];
    const settings = {
      emailEnabled: row.email_enabled,
      smsEnabled: row.sms_enabled,
      pushEnabled: row.push_enabled,
      bookingConfirmations: row.booking_confirmations,
      bookingReminders: row.booking_reminders,
      checkinReminders: row.checkin_reminders,
      vaccinationReminders: row.vaccination_reminders,
      paymentReceipts: row.payment_receipts,
      marketingEnabled: row.marketing_enabled,
      reminderDaysBefore: row.reminder_days_before,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
      useCustomTemplates: row.use_custom_templates,
      includePhotosInUpdates: row.include_photos_in_updates,
    };

    return createResponse(200, { success: true, settings });
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
// POLICIES HANDLERS
// =============================================================================
// Terms & Policies for legal documents: liability waivers, ToS, cancellation, etc.
// =============================================================================

async function handleGetPolicies(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT policies FROM "Tenant" WHERE id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Tenant not found' });
    }

    // Return empty array if no policies set - user creates from scratch or templates
    const policies = result.rows[0].policies || [];

    return createResponse(200, { policies });
  } catch (error) {
    console.error('[Policies] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load policies' });
  }
}

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

    // Get current policies
    const result = await query(`SELECT policies FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const policies = result.rows[0]?.policies || [];

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

    // Save
    await query(`UPDATE "Tenant" SET policies = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(policies), ctx.tenantId]);

    return createResponse(201, { success: true, policy: newPolicy });
  } catch (error) {
    console.error('[Policies] Failed to create:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create policy' });
  }
}

async function handleGetPolicy(user, policyId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT policies FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const policies = result.rows[0]?.policies || [];
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

async function handleUpdatePolicy(user, policyId, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT policies FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const policies = result.rows[0]?.policies || [];
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

    await query(`UPDATE "Tenant" SET policies = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(policies), ctx.tenantId]);

    return createResponse(200, { success: true, policy: policies[index] });
  } catch (error) {
    console.error('[Policies] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update policy' });
  }
}

async function handleDeletePolicy(user, policyId) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT policies FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const policies = result.rows[0]?.policies || [];
    const filtered = policies.filter(p => p.id !== policyId);

    if (filtered.length === policies.length) {
      return createResponse(404, { error: 'Not Found', message: 'Policy not found' });
    }

    await query(`UPDATE "Tenant" SET policies = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(filtered), ctx.tenantId]);

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

async function handleGetRequiredVaccinations(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT required_vaccinations FROM "Tenant" WHERE id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Tenant not found' });
    }

    const vaccinations = result.rows[0].required_vaccinations || [
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

async function handleUpdateRequiredVaccinations(user, body) {
  const { vaccinations } = body;

  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    await query(
      `UPDATE "Tenant" SET required_vaccinations = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(vaccinations), ctx.tenantId]
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

async function handleGetPaymentSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT stripe_account_id, stripe_connected, payment_settings FROM "Tenant" WHERE id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Tenant not found' });
    }

    const tenant = result.rows[0];
    const settings = tenant.payment_settings || {};

    return createResponse(200, {
      stripeConnected: Boolean(tenant.stripe_connected),
      stripeAccountId: tenant.stripe_account_id || null,
      requireCardOnFile: settings.requireCardOnFile ?? false,
      autoChargeOnCheckout: settings.autoChargeOnCheckout ?? false,
      acceptedPaymentMethods: settings.acceptedPaymentMethods || ['card'],
      tipEnabled: settings.tipEnabled ?? false,
      tipPercentages: settings.tipPercentages || [15, 18, 20, 25],
    });
  } catch (error) {
    console.error('[PaymentSettings] Failed to get:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to load payment settings' });
  }
}

async function handleUpdatePaymentSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current settings and merge
    const result = await query(`SELECT payment_settings FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const currentSettings = result.rows[0]?.payment_settings || {};
    const newSettings = { ...currentSettings, ...body };

    await query(
      `UPDATE "Tenant" SET payment_settings = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(newSettings), ctx.tenantId]
    );

    return createResponse(200, { success: true, ...newSettings });
  } catch (error) {
    console.error('[PaymentSettings] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update payment settings' });
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

async function handleGetPrivacySettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT privacy_settings FROM "Tenant" WHERE id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Tenant not found' });
    }

    // Merge with defaults in case some settings don't exist
    const storedSettings = result.rows[0].privacy_settings || {};
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

async function handleUpdatePrivacySettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current settings and merge
    const result = await query(`SELECT privacy_settings FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const currentSettings = result.rows[0]?.privacy_settings || {};

    // Deep merge the settings
    const newSettings = {
      retention: { ...(currentSettings.retention || {}), ...(body.retention || {}) },
      visibility: { ...(currentSettings.visibility || {}), ...(body.visibility || {}) },
      communication: { ...(currentSettings.communication || {}), ...(body.communication || {}) },
    };

    await query(
      `UPDATE "Tenant" SET privacy_settings = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(newSettings), ctx.tenantId]
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
    const filename = `barkbase_${scope}_export_${new Date().toISOString().split('T')[0]}.${format}`;

    try {
      switch (scope) {
        case 'pets':
          const petsResult = await query(
            `SELECT p.*, o.first_name as owner_first_name, o.last_name as owner_last_name, o.email as owner_email
             FROM "Pet" p
             LEFT JOIN "Owner" o ON p.owner_id = o.id
             WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
             ORDER BY p.name`,
            [ctx.tenantId]
          );
          data = petsResult.rows;
          recordCount = data.length;
          break;

        case 'owners':
          const ownersResult = await query(
            `SELECT * FROM "Owner" WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY last_name, first_name`,
            [ctx.tenantId]
          );
          data = ownersResult.rows;
          recordCount = data.length;
          break;

        case 'bookings':
          const bookingsResult = await query(
            `SELECT b.*, o.first_name as owner_first_name, o.last_name as owner_last_name, o.email as owner_email
             FROM "Booking" b
             LEFT JOIN "Owner" o ON b.owner_id = o.id
             WHERE b.tenant_id = $1 AND b.deleted_at IS NULL
             ORDER BY b.created_at DESC`,
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
               LEFT JOIN "Owner" o ON i.owner_id = o.id
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
             LEFT JOIN "Pet" p ON v.pet_id = p.id
             LEFT JOIN "Owner" o ON p.owner_id = o.id
             WHERE v.tenant_id = $1 AND v.deleted_at IS NULL
             ORDER BY v.expiration_date`,
            [ctx.tenantId]
          );
          data = vaccinationsResult.rows;
          recordCount = data.length;
          break;

        case 'all':
        default:
          // Get counts from all tables for "all" export
          const [pets, owners, bookings, vaccinations] = await Promise.all([
            query(`SELECT * FROM "Pet" WHERE tenant_id = $1 AND deleted_at IS NULL`, [ctx.tenantId]),
            query(`SELECT * FROM "Owner" WHERE tenant_id = $1 AND deleted_at IS NULL`, [ctx.tenantId]),
            query(`SELECT * FROM "Booking" WHERE tenant_id = $1 AND deleted_at IS NULL`, [ctx.tenantId]),
            query(`SELECT * FROM "Vaccination" WHERE tenant_id = $1 AND deleted_at IS NULL`, [ctx.tenantId]),
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

    if (format === 'json') {
      exportContent = JSON.stringify(data, null, 2);
      contentType = 'application/json';
    } else if (format === 'csv') {
      // Convert to CSV
      if (scope === 'all') {
        // For "all" scope, we'll export as JSON since CSV can't handle nested data
        exportContent = JSON.stringify(data, null, 2);
        contentType = 'application/json';
      } else {
        exportContent = arrayToCSV(data);
        contentType = 'text/csv';
      }
    } else {
      // XLSX would require a library - for now, fall back to JSON
      exportContent = JSON.stringify(data, null, 2);
      contentType = 'application/json';
    }

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
          [ctx.tenantId, user.id, scope, format, filename, recordCount]
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
        'Content-Disposition': `attachment; filename="${filename}"`,
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

  // Get headers from first row
  const headers = Object.keys(data[0]);

  // Escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
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
 * Process an import
 */
async function handleProcessImport(user, event) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Parse the body - could be JSON or form data
    let importData;
    let filename = 'import';
    let format = 'json';

    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'] || '';

    if (contentType.includes('application/json')) {
      const body = parseBody(event);
      importData = body.data;
      format = body.format || 'json';
      filename = body.filename || 'import.json';
    } else if (contentType.includes('multipart/form-data')) {
      // For multipart, we'd need to parse the form data
      // This is a simplified version - in production you'd use a library
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Multipart form uploads are not yet supported. Please send JSON data directly.',
      });
    } else {
      // Try to parse as JSON anyway
      try {
        const body = parseBody(event);
        importData = body.data || body;
        format = body.format || 'json';
      } catch (e) {
        return createResponse(400, { error: 'Bad Request', message: 'Invalid request body' });
      }
    }

    if (!importData) {
      return createResponse(400, { error: 'Bad Request', message: 'No data provided for import' });
    }

    // Determine what we're importing based on data structure
    let scope = 'all';
    let recordCount = 0;
    let errors = [];

    // Process the import based on data structure
    if (Array.isArray(importData)) {
      // Single entity type array
      const sample = importData[0];
      if (sample) {
        if (sample.species || sample.breed) {
          scope = 'pets';
          const result = await importPets(ctx.tenantId, importData);
          recordCount = result.count;
          errors = result.errors;
        } else if (sample.first_name && sample.email) {
          scope = 'owners';
          const result = await importOwners(ctx.tenantId, importData);
          recordCount = result.count;
          errors = result.errors;
        } else if (sample.check_in || sample.booking_id) {
          scope = 'bookings';
          // Bookings import is more complex, skip for now
          errors.push('Booking imports are not yet supported');
        }
      }
    } else if (typeof importData === 'object') {
      // Multi-entity import (like full backup restore)
      if (importData.pets) {
        const result = await importPets(ctx.tenantId, importData.pets);
        recordCount += result.count;
        errors.push(...result.errors);
      }
      if (importData.owners) {
        const result = await importOwners(ctx.tenantId, importData.owners);
        recordCount += result.count;
        errors.push(...result.errors);
      }
    }

    const status = errors.length > 0 ? 'completed' : 'completed';

    // Try to record the job
    let jobId = null;
    try {
      const tableCheck = await query(`
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ImportExportJob') as exists
      `);

      if (tableCheck.rows[0]?.exists) {
        const jobResult = await query(
          `INSERT INTO "ImportExportJob" (tenant_id, user_id, type, status, scope, format, filename, record_count, error_message, completed_at)
           VALUES ($1, $2, 'import', $3, $4, $5, $6, $7, $8, NOW())
           RETURNING id`,
          [ctx.tenantId, user.id, status, scope, format, filename, recordCount, errors.length > 0 ? errors.join('; ') : null]
        );
        jobId = jobResult.rows[0]?.id;
      }
    } catch (jobError) {
      console.warn('[ImportExport] Could not record job:', jobError.message);
    }

    return createResponse(200, {
      success: errors.length === 0,
      jobId,
      recordCount,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0
        ? `Import completed with ${errors.length} error(s)`
        : `Successfully imported ${recordCount} record(s)`,
    });
  } catch (error) {
    console.error('[ImportExport] Import failed:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Import failed: ' + error.message });
  }
}

/**
 * Import pets data
 */
async function importPets(tenantId, pets) {
  const errors = [];
  let count = 0;

  for (const pet of pets) {
    try {
      // Check if pet already exists by name + owner
      const existing = await query(
        `SELECT id FROM "Pet" WHERE tenant_id = $1 AND name = $2 AND owner_id = $3`,
        [tenantId, pet.name, pet.owner_id]
      );

      if (existing.rows.length > 0) {
        // Update existing
        await query(
          `UPDATE "Pet" SET
            species = COALESCE($3, species),
            breed = COALESCE($4, breed),
            weight = COALESCE($5, weight),
            birth_date = COALESCE($6, birth_date),
            gender = COALESCE($7, gender),
            color = COALESCE($8, color),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2`,
          [existing.rows[0].id, tenantId, pet.species, pet.breed, pet.weight, pet.birth_date, pet.gender, pet.color]
        );
      } else if (pet.owner_id) {
        // Insert new
        await query(
          `INSERT INTO "Pet" (tenant_id, owner_id, name, species, breed, weight, birth_date, gender, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [tenantId, pet.owner_id, pet.name, pet.species, pet.breed, pet.weight, pet.birth_date, pet.gender, pet.color]
        );
      } else {
        errors.push(`Pet "${pet.name}" skipped: missing owner_id`);
        continue;
      }
      count++;
    } catch (e) {
      errors.push(`Pet "${pet.name}": ${e.message}`);
    }
  }

  return { count, errors };
}

/**
 * Import owners data
 */
async function importOwners(tenantId, owners) {
  const errors = [];
  let count = 0;

  for (const owner of owners) {
    try {
      // Check if owner already exists by email
      const existing = await query(
        `SELECT id FROM "Owner" WHERE tenant_id = $1 AND email = $2`,
        [tenantId, owner.email]
      );

      if (existing.rows.length > 0) {
        // Update existing
        await query(
          `UPDATE "Owner" SET
            first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            phone = COALESCE($5, phone),
            address = COALESCE($6, address),
            city = COALESCE($7, city),
            state = COALESCE($8, state),
            zip_code = COALESCE($9, zip_code),
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $2`,
          [existing.rows[0].id, tenantId, owner.first_name, owner.last_name, owner.phone, owner.address, owner.city, owner.state, owner.zip_code]
        );
      } else {
        // Insert new
        await query(
          `INSERT INTO "Owner" (tenant_id, first_name, last_name, email, phone, address, city, state, zip_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [tenantId, owner.first_name, owner.last_name, owner.email, owner.phone, owner.address, owner.city, owner.state, owner.zip_code]
        );
      }
      count++;
    } catch (e) {
      errors.push(`Owner "${owner.email}": ${e.message}`);
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
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY updated_at DESC
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
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    `, [formId, ctx.tenantId]);

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
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING *
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

    const result = await query(`
      UPDATE "Form" SET deleted_at = NOW()
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [formId, ctx.tenantId]);

    if (result.rows.length === 0) {
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
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    `, [formId, ctx.tenantId]);

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
 */
async function handleGetFormSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(`SELECT form_settings FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const settings = result.rows[0]?.form_settings || DEFAULT_FORM_SETTINGS;

    return createResponse(200, { ...DEFAULT_FORM_SETTINGS, ...settings });
  } catch (error) {
    console.error('[Forms] Failed to get settings:', error.message);
    return createResponse(200, DEFAULT_FORM_SETTINGS);
  }
}

/**
 * Update form settings for tenant
 */
async function handleUpdateFormSettings(user, body) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    // Get current settings and merge
    const result = await query(`SELECT form_settings FROM "Tenant" WHERE id = $1`, [ctx.tenantId]);
    const currentSettings = result.rows[0]?.form_settings || {};
    const newSettings = { ...currentSettings, ...body };

    await query(
      `UPDATE "Tenant" SET form_settings = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(newSettings), ctx.tenantId]
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
      LEFT JOIN "Owner" o ON fs.owner_id = o.id
      LEFT JOIN "Pet" p ON fs.pet_id = p.id
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

    let whereClause = 'd.tenant_id = $1 AND d.deleted_at IS NULL';
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
        o.id as owner_id, o.first_name as owner_first_name, o.last_name as owner_last_name,
        p.id as pet_id, p.name as pet_name
      FROM "Document" d
      LEFT JOIN "Owner" o ON d.owner_id = o.id
      LEFT JOIN "Pet" p ON d.pet_id = p.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM "Document" d 
       LEFT JOIN "Owner" o ON d.owner_id = o.id
       LEFT JOIN "Pet" p ON d.pet_id = p.id
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
      WHERE tenant_id = $1 AND deleted_at IS NULL
      GROUP BY category
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
    const tenantResult = await query(
      `SELECT features FROM "Tenant" WHERE id = $1`,
      [ctx.tenantId]
    );
    const features = tenantResult.rows[0]?.features || {};
    const storageLimitMB = features.storageLimitMB || 500;

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
      LEFT JOIN "Owner" o ON d.owner_id = o.id
      LEFT JOIN "Pet" p ON d.pet_id = p.id
      WHERE d.id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL
    `, [docId, ctx.tenantId]);

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

    const result = await query(`
      UPDATE "Document" SET deleted_at = NOW() 
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [docId, ctx.tenantId]);

    if (result.rows.length === 0) {
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
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY type, name
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
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    `, [templateId, ctx.tenantId]);

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
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING *
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

    const result = await query(`
      UPDATE "FileTemplate" SET deleted_at = NOW()
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [templateId, ctx.tenantId]);

    if (result.rows.length === 0) {
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
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
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
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    `, [fileId, ctx.tenantId]);

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

    const result = await query(`
      UPDATE "CustomFile" SET deleted_at = NOW()
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [fileId, ctx.tenantId]);

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'File not found' });
    }

    return createResponse(200, { success: true, message: 'File deleted' });
  } catch (error) {
    console.error('[Files] Failed to delete custom file:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete file' });
  }
}
