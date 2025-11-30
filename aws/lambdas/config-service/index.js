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

    // GET /api/v2/properties - List all properties
    if ((path === '/api/v2/properties' || path === '/api/v2/properties/') && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      return handleListProperties(user, queryParams);
    }

    // POST /api/v2/properties - Create property
    if ((path === '/api/v2/properties' || path === '/api/v2/properties/') && method === 'POST') {
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

    // GET /api/v2/entities - List all entity definitions
    if ((path === '/api/v2/entities' || path === '/api/v2/entities/') && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      return handleListEntityDefinitions(user, queryParams);
    }

    // POST /api/v2/entities - Create custom entity definition
    if ((path === '/api/v2/entities' || path === '/api/v2/entities/') && method === 'POST') {
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
    const formIdMatch = path.match(/^\/(?:api\/v1\/)?forms\/([a-f0-9-]+)$/i);
    if (formIdMatch) {
      const formId = formIdMatch[1];

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
    const formSubmissionsMatch = path.match(/^\/(?:api\/v1\/)?forms\/([a-f0-9-]+)\/submissions$/i);
    if (formSubmissionsMatch && method === 'GET') {
      const formId = formSubmissionsMatch[1];
      const queryParams = event.queryStringParameters || {};
      return handleListFormSubmissions(user, { ...queryParams, templateId: formId });
    }

    // Create submission for a form
    if (formSubmissionsMatch && method === 'POST') {
      const formId = formSubmissionsMatch[1];
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
  console.log('[CONFIG-SERVICE] handleListProperties - start');

  try {
    await getPoolAsync();

    const ctx = await getTenantContext(user);
    if (ctx.error) {
      return createResponse(ctx.status, { error: ctx.error });
    }

    const { tenantId, plan } = ctx;
    const {
      entityType,
      objectType, // Alias for entityType (frontend uses this)
      includeArchived = 'false',
      includeUsage = 'false',
    } = queryParams;

    const effectiveEntityType = entityType || objectType;

    // Build query
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

    const result = await query(sql, values);

    const properties = result.rows.map(formatPropertyResponse);

    // Get usage stats if requested
    let usageStats = {};
    if (includeUsage === 'true' && properties.length > 0) {
      const propertyIds = properties.map(p => p.id);
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

    // Add usage to properties
    const propertiesWithUsage = properties.map(p => ({
      ...p,
      usageCount: usageStats[p.id] || 0,
    }));

    // Get plan limits
    const limits = effectiveEntityType
      ? await checkPropertyLimits(tenantId, plan, effectiveEntityType)
      : { currentCount: properties.length, limit: PLAN_LIMITS[plan], canCreate: true };

    console.log('[CONFIG-SERVICE] handleListProperties - found:', properties.length);

    return createResponse(200, {
      success: true,
      properties: propertiesWithUsage,
      metadata: {
        total: properties.length,
        plan,
        limits,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to list properties:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve properties',
    });
  }
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

    const result = await query(
      `SELECT * FROM "Property" WHERE id = $1 AND tenant_id = $2`,
      [propertyId, ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Property not found',
      });
    }

    const property = formatPropertyResponse(result.rows[0]);

    // Get usage count
    const usageResult = await query(
      `SELECT COUNT(*) as count FROM "PropertyValue" WHERE property_id = $1`,
      [propertyId]
    );
    property.usageCount = parseInt(usageResult.rows[0].count, 10);

    return createResponse(200, {
      success: true,
      property,
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

async function handleGetNotificationSettings(user) {
  try {
    await getPoolAsync();
    const ctx = await getUserTenantContext(user.id);
    if (!ctx.tenantId) return createResponse(400, { error: 'Bad Request', message: 'No tenant context' });

    const result = await query(
      `SELECT notification_settings FROM "Tenant" WHERE id = $1`,
      [ctx.tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Tenant not found' });
    }

    const settings = result.rows[0].notification_settings || {
      email: {
        bookingConfirmations: true,
        bookingReminders: true,
        bookingCancellations: true,
        vaccinationExpiry: true,
        paymentReceipts: true,
      },
      sms: {
        enabled: false,
        bookingReminders: false,
        checkInReminders: false,
      },
      reminderTiming: {
        beforeBooking: 24, // hours
        vaccinationWarning: 30, // days
      },
    };

    return createResponse(200, settings);
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

    await query(
      `UPDATE "Tenant" SET notification_settings = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(body), ctx.tenantId]
    );

    return createResponse(200, { success: true, ...body });
  } catch (error) {
    console.error('[Notifications] Failed to update:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update notification settings' });
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
