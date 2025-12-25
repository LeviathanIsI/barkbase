/**
 * Entity Service Lambda Handler
 * Manages CRUD operations for core business entities:
 * - Tenants, Facilities, Pets, Owners, Staff, etc.
 */

let dbLayer, sharedLayer;

try {
  dbLayer = require('/opt/nodejs/db');
  sharedLayer = require('/opt/nodejs/index');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
  sharedLayer = require('../../layers/shared-layer/nodejs/index');
}

const { getPoolAsync, query, getClient, softDelete, softDeleteBatch, getNextRecordId } = dbLayer;
const { createResponse, authenticateRequest, parseBody, getQueryParams, getPathParams } = sharedLayer;
const { enforceLimit, getLimit, getTenantPlan, createTierErrorResponse } = sharedLayer;
const { resolveAccountContext, rewritePathToLegacy, OBJECT_TYPE_CODES } = sharedLayer;

// SQS for workflow trigger events
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const sqs = new SQSClient({
  region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
});
const WORKFLOW_TRIGGER_QUEUE_URL = process.env.WORKFLOW_TRIGGER_QUEUE_URL;

/**
 * Publish a workflow trigger event to the trigger queue
 * This notifies the workflow-trigger-processor Lambda about domain events
 * that may trigger workflow enrollments.
 *
 * @param {string} eventType - Event type (e.g., 'pet.created', 'owner.updated')
 * @param {string} recordId - ID of the record that triggered the event
 * @param {string} recordType - Type of record ('pet', 'owner', etc.)
 * @param {string} tenantId - Tenant ID for multi-tenancy
 * @param {object} eventData - Additional event data (optional)
 */
async function publishWorkflowEvent(eventType, recordId, recordType, tenantId, eventData = {}) {
  if (!WORKFLOW_TRIGGER_QUEUE_URL) {
    // Silently skip if queue URL not configured
    return false;
  }

  try {
    const message = {
      eventType,
      recordId,
      recordType,
      tenantId,
      eventData,
      timestamp: new Date().toISOString(),
    };

    await sqs.send(new SendMessageCommand({
      QueueUrl: WORKFLOW_TRIGGER_QUEUE_URL,
      MessageBody: JSON.stringify(message),
    }));

    console.log('[EntityService][WorkflowEvent] Published:', eventType, 'for', recordType, recordId);
    return true;
  } catch (error) {
    // Log but don't throw - workflow events shouldn't break main operations
    console.error('[EntityService][WorkflowEvent] Failed to publish:', eventType, error.message);
    return false;
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
function validateEmail(email) {
  if (!email) {
    return { valid: true }; // Email is optional, null/undefined is valid
  }

  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }

  // Trim whitespace
  const trimmed = email.trim();

  // Check length constraints
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email exceeds maximum length of 254 characters' };
  }

  // RFC 5322 simplified email regex - covers 99% of valid emails
  // Allows: letters, numbers, dots, underscores, hyphens, plus signs in local part
  // Requires: @ symbol followed by domain with at least one dot
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Extract tenant ID from X-Tenant-Id header (case-insensitive)
 * @param {object} event - Lambda event
 * @returns {string|null} - Tenant ID or null
 */
function getTenantIdFromHeader(event) {
  const headers = event.headers || {};
  const tenantId = headers['X-Tenant-Id'] ||
    headers['x-tenant-id'] ||
    headers['X-TENANT-ID'] ||
    headers['x-Tenant-Id'] ||
    null;

  if (tenantId) {
    console.log('[ENTITY-SERVICE] Got tenant ID from header:', tenantId);
  }

  return tenantId;
}

/**
 * Resolve tenant ID with security validation
 *
 * SECURITY: Validates that header tenant ID matches JWT tenant ID to prevent
 * tenant spoofing attacks where a malicious user could try to access another
 * tenant's data by manipulating the X-Tenant-Id header.
 *
 * Precedence:
 * 1. Account context (from new ID system URL pattern or X-Account-Code header)
 * 2. JWT claims (authorizer) - most trusted source
 * 3. event.user.tenantId (from authenticateRequest)
 * 4. X-Tenant-Id header - only if matches JWT or no JWT available
 *
 * @param {object} event - Lambda event
 * @returns {string|null} - Resolved tenant ID or null if validation fails
 */
function resolveTenantId(event) {
  // NEW ID SYSTEM: Check for resolved tenant from account_code first
  const accountTenantId = event.resolvedTenantId || event.accountContext?.tenantId;

  // Extract tenant ID from all sources
  const headers = event.headers || {};
  const headerTenantId =
    headers['x-tenant-id'] ||
    headers['X-Tenant-Id'] ||
    headers['x-Tenant-Id'] ||
    headers['X-TENANT-ID'];

  const jwtTenantId =
    event.requestContext?.authorizer?.jwt?.claims?.['custom:tenant_id'] ||
    event.requestContext?.authorizer?.claims?.['custom:tenant_id'] ||
    event.requestContext?.authorizer?.tenantId;

  const userTenantId = event.user?.tenantId;

  // SECURITY: If account_code resolved to a tenant, validate it matches JWT/user
  if (accountTenantId) {
    if (jwtTenantId && accountTenantId !== jwtTenantId) {
      console.error('[ENTITY-SERVICE][SECURITY] Account tenant mismatch - account:', accountTenantId, 'jwt:', jwtTenantId);
      return null;
    }
    if (userTenantId && accountTenantId !== userTenantId) {
      console.error('[ENTITY-SERVICE][SECURITY] Account tenant mismatch - account:', accountTenantId, 'user:', userTenantId);
      return null;
    }
    console.log('[ENTITY-SERVICE] Resolved tenantId:', accountTenantId, '(source: account_code)');
    return accountTenantId;
  }

  // SECURITY: If both header and JWT exist, they MUST match
  if (headerTenantId && jwtTenantId && headerTenantId !== jwtTenantId) {
    console.error('[ENTITY-SERVICE][SECURITY] Tenant ID mismatch - header:', headerTenantId, 'jwt:', jwtTenantId);
    return null; // Return null to trigger auth failure
  }

  // SECURITY: If both header and user exist, they MUST match
  if (headerTenantId && userTenantId && headerTenantId !== userTenantId) {
    console.error('[ENTITY-SERVICE][SECURITY] Tenant ID mismatch - header:', headerTenantId, 'user:', userTenantId);
    return null; // Return null to trigger auth failure
  }

  // Prefer trusted sources: JWT > user > header
  const resolvedTenantId = jwtTenantId || userTenantId || headerTenantId;

  if (resolvedTenantId) {
    console.log('[ENTITY-SERVICE] Resolved tenantId:', resolvedTenantId,
      '(source:', jwtTenantId ? 'jwt' : userTenantId ? 'user' : 'header', ')');
    return resolvedTenantId;
  }

  console.warn('[ENTITY-SERVICE] Could not resolve tenantId from any source');
  return null;
}

// Route handlers
const handlers = {
  // Tenants
  'GET /api/v1/entity/tenants': getTenants,
  'GET /api/v1/entity/tenants/{id}': getTenant,
  'POST /api/v1/entity/tenants': createTenant,
  'PUT /api/v1/entity/tenants/{id}': updateTenant,
  'DELETE /api/v1/entity/tenants/{id}': deleteTenant,

  // Facilities
  'GET /api/v1/entity/facilities': getFacilities,
  'GET /api/v1/entity/facilities/{id}': getFacility,
  'POST /api/v1/entity/facilities': createFacility,
  'PUT /api/v1/entity/facilities/{id}': updateFacility,
  'DELETE /api/v1/entity/facilities/{id}': deleteFacility,

  // Pets
  'GET /api/v1/entity/pets': getPets,
  'GET /api/v1/entity/pets/{id}': getPet,
  'POST /api/v1/entity/pets': createPet,
  'PUT /api/v1/entity/pets/{id}': updatePet,
  'DELETE /api/v1/entity/pets/{id}': deletePet,
  // Pet Bulk Actions
  'POST /api/v1/entity/pets/bulk/delete': bulkDeletePets,
  'POST /api/v1/entity/pets/bulk/update': bulkUpdatePets,
  'POST /api/v1/entity/pets/bulk/export': bulkExportPets,

  // Pet Vaccinations
  'GET /api/v1/entity/pets/vaccinations/expiring': getExpiringVaccinations,
  'GET /api/v1/entity/pets/{petId}/vaccinations': getPetVaccinations,
  'POST /api/v1/entity/pets/{petId}/vaccinations': createPetVaccination,
  'PUT /api/v1/entity/pets/{petId}/vaccinations/{id}': updatePetVaccination,
  'DELETE /api/v1/entity/pets/{petId}/vaccinations/{id}': deletePetVaccination,
  'POST /api/v1/entity/pets/{petId}/vaccinations/{id}/renew': renewPetVaccination,

  // Pet Owners (relationship via PetOwner junction table)
  'GET /api/v1/entity/pets/{petId}/owners': getPetOwners,

  // Owners
  'GET /api/v1/entity/owners': getOwners,
  'GET /api/v1/entity/owners/{id}': getOwner,
  'POST /api/v1/entity/owners': createOwner,
  'PUT /api/v1/entity/owners/{id}': updateOwner,
  'DELETE /api/v1/entity/owners/{id}': deleteOwner,
  // Owner Bulk Actions
  'POST /api/v1/entity/owners/bulk/delete': bulkDeleteOwners,
  'POST /api/v1/entity/owners/bulk/update': bulkUpdateOwners,
  'POST /api/v1/entity/owners/bulk/export': bulkExportOwners,
  // Privacy / Data Request endpoints
  'GET /api/v1/entity/owners/{id}/export': exportOwnerData,
  'DELETE /api/v1/entity/owners/{id}/data': deleteOwnerData,

  // Staff
  'GET /api/v1/entity/staff': getStaff,
  'GET /api/v1/entity/staff/{id}': getStaffMember,
  'POST /api/v1/entity/staff': createStaffMember,
  'PUT /api/v1/entity/staff/{id}': updateStaffMember,
  'DELETE /api/v1/entity/staff/{id}': deleteStaffMember,
  // Staff Bulk Actions
  'POST /api/v1/entity/staff/bulk/delete': bulkDeleteStaff,
  'POST /api/v1/entity/staff/bulk/update': bulkUpdateStaff,

  // Activities
  'GET /api/v1/entity/activities': getActivities,
  'GET /api/v1/entity/activities/{id}': getActivity,
  'POST /api/v1/entity/activities': createActivity,
  'PUT /api/v1/entity/activities/{id}': updateActivity,
  'DELETE /api/v1/entity/activities/{id}': deleteActivity,
};

exports.handler = async (event, context) => {
  // Handle admin path rewriting (Ops Center requests)
  const { handleAdminPathRewrite } = require('/opt/nodejs/index');
  handleAdminPathRewrite(event);

  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  let path = event.requestContext?.http?.path || event.path || '/';

  console.log('[ENTITY-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

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
      console.error('[ENTITY-SERVICE] Account context invalid:', accountContext.error);
      return createResponse(400, {
        error: 'BadRequest',
        message: accountContext.error || 'Invalid account context',
      });
    }

    // If using new ID pattern, rewrite path to legacy format for handler compatibility
    if (accountContext.isNewPattern) {
      rewritePathToLegacy(event, accountContext);
      path = event.requestContext?.http?.path || event.path || '/';
      console.log('[ENTITY-SERVICE] New ID pattern detected:', {
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
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      });
    }

    // Attach user to event
    event.user = authResult.user;

    // Extract route key - handle various path patterns
    // Pattern 1: /api/v1/entity/pets/{petId}/vaccinations/{id} -> with {petId} and {id}
    // Pattern 2: /api/v1/entity/pets/{id}/vaccinations -> with single {id}
    // Pattern 3: /api/v1/entity/owners/{id} -> simple {id}
    let normalizedPath = path;
    const pathSegments = path.split('/');
    const uuidPattern = /^[a-f0-9-]{36}$/i;

    // Find and replace IDs (UUID or numeric) with placeholders
    // For nested resources like pets/{id}/vaccinations/{id}
    const numericPattern = /^\d+$/;
    let foundFirstId = false;
    const normalizedSegments = pathSegments.map((segment, idx) => {
      if (uuidPattern.test(segment) || numericPattern.test(segment)) {
        // Check if this is a nested resource pattern
        const prevSegment = pathSegments[idx - 1];
        const nextSegment = pathSegments[idx + 1];

        // If there's a next segment (nested resource), use {petId} for parent
        if (nextSegment && !foundFirstId) {
          foundFirstId = true;
          event.pathParameters = event.pathParameters || {};
          event.pathParameters.petId = segment;
          return '{petId}';
        } else {
          // Otherwise use {id}
          event.pathParameters = event.pathParameters || {};
          event.pathParameters.id = segment;
          return '{id}';
        }
      }
      return segment;
    });

    normalizedPath = normalizedSegments.join('/');
    const routeKey = `${method} ${normalizedPath}`;
    const exactRouteKey = `${method} ${path}`;

    // Also try simple replacement for backward compatibility (UUID or numeric ID)
    const simpleRouteKey = `${method} ${path.replace(/\/([a-f0-9-]{36}|\d+)$/i, '/{id}')}`;

    const handler = handlers[exactRouteKey] || handlers[routeKey] || handlers[simpleRouteKey];

    if (!handler) {
      console.log('[ENTITY-SERVICE] No handler found for:', routeKey, 'or', simpleRouteKey);
      return createResponse(404, {
        error: 'Not Found',
        message: `Route ${method} ${path} not found`,
        service: 'entity-service'
      });
    }

    // Execute handler
    return await handler(event);

  } catch (error) {
    console.error('[ENTITY-SERVICE] Error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An error occurred' : error.message,
      service: 'entity-service'
    });
  }
};

// Tenant handlers
async function getTenants(event) {
  const tenantId = resolveTenantId(event);
  console.log('[Tenants][list] tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();
    // Return full tenant data including settings fields
    const result = await query(
      `SELECT id, name, slug, plan, feature_flags, theme, terminology, settings,
              storage_provider, db_provider, custom_domain, onboarding_dismissed,
              created_at, updated_at
       FROM "Tenant" WHERE id = $1`,
      [tenantId]
    );
    return createResponse(200, { data: result.rows });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getTenants error:', error);
    return createResponse(200, { data: [] });
  }
}

async function getTenant(event) {
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const userTenantId = resolveTenantId(event);
  const isAdmin = event.isAdminRequest === true;

  console.log('[Tenants][get] id:', id, 'userTenantId:', userTenantId, 'isAdmin:', isAdmin);

  // SECURITY: Non-admin users can only access their own tenant
  if (!isAdmin && id !== userTenantId) {
    console.warn('[ENTITY-SERVICE] Tenant access denied:', { requestedId: id, userTenantId });
    return createResponse(403, { error: 'Forbidden', message: 'Access denied to this tenant' });
  }

  try {
    await getPoolAsync();
    const result = await query(
      `SELECT id, name, slug, plan, feature_flags, theme, terminology, settings,
              storage_provider, db_provider, custom_domain, onboarding_dismissed,
              created_at, updated_at
       FROM "Tenant" WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Tenant not found' });
    }
    return createResponse(200, result.rows[0]);
  } catch (error) {
    console.error('[ENTITY-SERVICE] getTenant error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to get tenant' });
  }
}

async function createTenant(event) {
  const isAdmin = event.isAdminRequest === true;

  // SECURITY: Only admin/ops users can create tenants
  // Regular users get tenants created during signup flow
  if (!isAdmin) {
    console.warn('[ENTITY-SERVICE] Tenant creation denied - not an admin request');
    return createResponse(403, { error: 'Forbidden', message: 'Only administrators can create tenants' });
  }

  const body = parseBody(event);

  console.log('[ENTITY-SERVICE] Creating tenant (admin):', body);

  if (!body.name || !body.slug) {
    return createResponse(400, { error: 'BadRequest', message: 'Name and slug are required' });
  }

  try {
    await getPoolAsync();

    // Check if slug is unique
    const slugCheck = await query(
      `SELECT id FROM "Tenant" WHERE slug = $1`,
      [body.slug]
    );

    if (slugCheck.rows.length > 0) {
      return createResponse(409, { error: 'Conflict', message: 'A tenant with this slug already exists' });
    }

    const result = await query(
      `INSERT INTO "Tenant" (name, slug, plan, feature_flags, theme, terminology, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        body.name,
        body.slug,
        body.plan || 'FREE',
        JSON.stringify(body.featureFlags || body.feature_flags || {}),
        JSON.stringify(body.theme || {}),
        JSON.stringify(body.terminology || {}),
        JSON.stringify(body.settings || {})
      ]
    );

    console.log('[ENTITY-SERVICE] Created tenant:', result.rows[0].record_id);
    return createResponse(201, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] createTenant error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to create tenant' });
  }
}

async function updateTenant(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const body = parseBody(event);

  console.log('[Tenants][update] id:', id, 'tenantId:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  // Only allow updating own tenant for non-admin users
  if (id !== tenantId) {
    return createResponse(403, { error: 'Forbidden', message: 'Cannot update another tenant' });
  }

  try {
    await getPoolAsync();

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (body.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(body.name); }
    if (body.plan !== undefined) { updates.push(`plan = $${paramIndex++}`); values.push(body.plan); }
    if (body.featureFlags !== undefined || body.feature_flags !== undefined) {
      updates.push(`feature_flags = $${paramIndex++}`);
      values.push(JSON.stringify(body.featureFlags || body.feature_flags));
    }
    if (body.theme !== undefined) {
      updates.push(`theme = $${paramIndex++}`);
      values.push(JSON.stringify(body.theme));
    }
    if (body.terminology !== undefined) {
      updates.push(`terminology = $${paramIndex++}`);
      values.push(JSON.stringify(body.terminology));
    }
    if (body.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(body.settings));
    }
    if (body.onboardingDismissed !== undefined || body.onboarding_dismissed !== undefined) {
      updates.push(`onboarding_dismissed = $${paramIndex++}`);
      values.push(body.onboardingDismissed ?? body.onboarding_dismissed);
    }

    if (updates.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No fields to update' });
    }

    values.push(id);

    const result = await query(
      `UPDATE "Tenant" SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Tenant not found' });
    }

    console.log('[ENTITY-SERVICE] Updated tenant:', id);
    return createResponse(200, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] updateTenant error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update tenant' });
  }
}

async function deleteTenant(event) {
  const tenantId = event.user?.tenantId;
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const deletedBy = event.user?.userId || null;

  console.log('[ENTITY-SERVICE] Deleting tenant:', id);

  // Prevent deleting own tenant
  if (id === tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Cannot delete your own tenant' });
  }

  try {
    // Use softDelete helper - archives to DeletedRecord table then hard deletes
    // Note: Tenant uses itself as tenantId for the archive
    const result = await softDelete('Tenant', id, id, deletedBy);

    if (!result) {
      return createResponse(404, { error: 'NotFound', message: 'Tenant not found' });
    }

    console.log('[ENTITY-SERVICE] Deleted tenant:', id);
    return createResponse(204, '');
  } catch (error) {
    console.error('[ENTITY-SERVICE] deleteTenant error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete tenant' });
  }
}

// Facilities handlers (Kennels are facilities)
async function getFacilities(event) {
  const tenantId = resolveTenantId(event);
  const queryParams = getQueryParams(event);
  const type = queryParams.type; // e.g., 'kennel'

  console.log('[Facilities][list] tenantId:', tenantId, 'type:', type);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();
    // Schema: id, tenant_id, name, size, location, max_occupancy, is_active, created_at, updated_at
    // Also calculate current occupancy by counting active bookings (CHECKED_IN or CONFIRMED with dates spanning today)
    const result = await query(
      `SELECT k.record_id, k.tenant_id, k.name, k.size, k.location, k.max_occupancy,
              k.is_active, k.created_at, k.updated_at,
              COALESCE(occ.occupied, 0) AS occupied
       FROM "Kennel" k
       LEFT JOIN (
         SELECT kennel_id, COUNT(*) AS occupied
         FROM "Booking"
         WHERE tenant_id = $1
           AND kennel_id IS NOT NULL
           AND (status = 'CHECKED_IN' OR (status = 'CONFIRMED' AND check_in <= CURRENT_DATE AND check_out >= CURRENT_DATE))
         GROUP BY kennel_id
       ) occ ON k.record_id = occ.kennel_id
       WHERE k.tenant_id = $1
       ORDER BY k.name`,
      [tenantId]
    );
    console.log('[Facilities][diag] count:', result.rows.length);
    return createResponse(200, { data: result.rows });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getFacilities error:', error);
    return createResponse(200, { data: [] });
  }
}

async function getFacility(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();

  console.log('[Facilities][get] id:', id, 'tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();
    // Schema: record_id, tenant_id, name, size, location, max_occupancy, is_active, created_at, updated_at
    const result = await query(
      `SELECT record_id, tenant_id, name, size, location, max_occupancy,
              is_active, created_at, updated_at
       FROM "Kennel"
       WHERE record_id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Facility not found' });
    }
    return createResponse(200, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getFacility error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to get facility' });
  }
}

async function createFacility(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);

  console.log('[Facilities][create] tenantId:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!body.name) {
    return createResponse(400, { error: 'BadRequest', message: 'Name is required' });
  }

  try {
    await getPoolAsync();

    // Tier enforcement: Check kennels limit
    const plan = getTenantPlan(event);
    const countResult = await query(
      `SELECT COUNT(*) as count FROM "Kennel" WHERE tenant_id = $1`,
      [tenantId]
    );
    const currentKennelCount = parseInt(countResult.rows[0]?.count || '0', 10);

    try {
      enforceLimit(plan, 'kennels', currentKennelCount);
    } catch (tierError) {
      if (tierError.tierError) {
        console.warn('[Facilities][create] Tier limit exceeded:', tierError.tierError);
        return createTierErrorResponse(tierError.tierError);
      }
      throw tierError;
    }

    // Get next record_id for Kennel table
    const recordId = await getNextRecordId(tenantId, 'Kennel');

    // Schema: id, tenant_id, record_id, name, size, location, max_occupancy, is_active, created_at, updated_at
    // size must be: SMALL, MEDIUM, LARGE, XLARGE or null
    const result = await query(
      `INSERT INTO "Kennel" (tenant_id, record_id, name, size, location, max_occupancy, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        tenantId,
        recordId,
        body.name,
        body.size || null, // SMALL, MEDIUM, LARGE, XLARGE
        body.location || null,
        body.maxOccupancy || body.max_occupancy || body.capacity || 1,
        body.isActive !== false
      ]
    );

    console.log('[Facilities][create] created:', result.rows[0].record_id, 'record_id:', recordId);
    return createResponse(201, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] createFacility error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to create facility' });
  }
}

async function updateFacility(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const body = parseBody(event);

  console.log('[Facilities][update] id:', id, 'tenantId:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Build dynamic update query
    // Schema: id, tenant_id, name, size, location, max_occupancy, is_active, created_at, updated_at
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (body.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(body.name); }
    if (body.size !== undefined) { updates.push(`size = $${paramIndex++}`); values.push(body.size); }
    if (body.location !== undefined) { updates.push(`location = $${paramIndex++}`); values.push(body.location); }
    if (body.maxOccupancy !== undefined || body.max_occupancy !== undefined || body.capacity !== undefined) {
      updates.push(`max_occupancy = $${paramIndex++}`);
      values.push(body.maxOccupancy || body.max_occupancy || body.capacity);
    }
    if (body.isActive !== undefined || body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.isActive ?? body.is_active);
    }

    if (updates.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No fields to update' });
    }

    values.push(id, tenantId);

    const result = await query(
      `UPDATE "Kennel" SET ${updates.join(', ')}, updated_at = NOW()
       WHERE record_id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Facility not found' });
    }

    console.log('[ENTITY-SERVICE] Updated facility:', id);
    return createResponse(200, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] updateFacility error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update facility' });
  }
}

async function deleteFacility(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const deletedBy = event.user?.userId || null;

  console.log('[Facilities][delete] id:', id, 'tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    // Use softDelete helper - archives to DeletedRecord table then hard deletes
    const result = await softDelete('Kennel', id, tenantId, deletedBy);

    if (!result) {
      return createResponse(404, { error: 'NotFound', message: 'Facility not found' });
    }

    console.log('[ENTITY-SERVICE] Deleted facility:', id);
    return createResponse(204, '');
  } catch (error) {
    console.error('[ENTITY-SERVICE] deleteFacility error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete facility' });
  }
}

// Pets handlers
async function getPets(event) {
  const tenantId = resolveTenantId(event);
  const queryParams = getQueryParams(event);
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = Math.min(parseInt(queryParams.limit, 10) || 50, 200);
  const offset = (page - 1) * limit;
  const search = queryParams.search || queryParams.q || '';
  const ownerId = queryParams.ownerId || queryParams.owner_id || '';

  console.log('[Pets][list] tenantId:', tenantId, 'page:', page, 'limit:', limit, 'ownerId:', ownerId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Build WHERE clause with optional search and owner filter
    let whereClause = 'p.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;
    let joinClause = '';

    // Filter by owner via PetOwner junction table
    if (ownerId) {
      joinClause = 'INNER JOIN "PetOwner" po ON po.tenant_id = p.tenant_id AND po.pet_record_id = p.record_id';
      whereClause += ` AND po.owner_record_id = $${paramIndex}`;
      params.push(ownerId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.breed ILIKE $${paramIndex} OR p.species ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(DISTINCT p.record_id) as total FROM "Pet" p ${joinClause} WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / limit);

    // Schema: id, tenant_id, vet_id (FK), name, species, breed, gender, color, weight,
    //         date_of_birth, microchip_number, photo_url, medical_notes, dietary_notes,
    //         behavior_notes, behavior_flags, status, is_active, created_at, updated_at
    // Vet info comes from Veterinarian table via vet_id FK
    // Owner info comes from PetOwner junction table (get primary owner)
    const result = await query(
      `SELECT DISTINCT p.record_id, p.tenant_id, p.name, p.species, p.breed, p.gender, p.color,
              p.weight, p.date_of_birth, p.microchip_number,
              p.medical_notes, p.behavior_notes, p.dietary_notes,
              p.behavior_flags, p.status, p.photo_url, p.is_active,
              p.vet_id, p.created_at, p.updated_at,
              v.clinic_name AS vet_clinic, v.vet_name, v.phone AS vet_phone,
              v.email AS vet_email, v.notes AS vet_notes,
              v.address_street AS vet_address_street, v.address_city AS vet_address_city,
              v.address_state AS vet_address_state, v.address_zip AS vet_address_zip,
              primary_owner.record_id AS owner_id,
              primary_owner.first_name AS owner_first_name,
              primary_owner.last_name AS owner_last_name,
              primary_owner.email AS owner_email,
              primary_owner.phone AS owner_phone
       FROM "Pet" p
       LEFT JOIN "Veterinarian" v ON v.tenant_id = p.tenant_id AND v.record_id = p.vet_id
       LEFT JOIN "PetOwner" primary_po ON primary_po.tenant_id = p.tenant_id AND primary_po.pet_record_id = p.record_id AND primary_po.is_primary = true
       LEFT JOIN "Owner" primary_owner ON primary_owner.tenant_id = p.tenant_id AND primary_owner.record_id = primary_po.owner_record_id
       ${joinClause}
       WHERE ${whereClause}
       ORDER BY p.name
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );
    console.log('[Pets][diag] count:', result.rows.length, 'total:', total);
    return createResponse(200, {
      data: result.rows,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getPets error:', error);
    return createResponse(200, { data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
  }
}

async function getPet(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();

  console.log('[Pets][get] id:', id, 'tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();
    // Schema: Pet has vet_id FK, vet info comes from Veterinarian table
    const result = await query(
      `SELECT p.record_id, p.tenant_id, p.name, p.species, p.breed, p.gender, p.color,
              p.weight, p.date_of_birth, p.microchip_number,
              p.medical_notes, p.behavior_notes, p.dietary_notes,
              p.behavior_flags, p.status, p.photo_url, p.is_active,
              p.vet_id, p.created_at, p.updated_at, p.created_by, p.updated_by,
              v.clinic_name AS vet_clinic, v.vet_name, v.phone AS vet_phone,
              v.email AS vet_email, v.notes AS vet_notes,
              v.address_street AS vet_address_street, v.address_city AS vet_address_city,
              v.address_state AS vet_address_state, v.address_zip AS vet_address_zip
       FROM "Pet" p
       LEFT JOIN "Veterinarian" v ON v.tenant_id = p.tenant_id AND v.record_id = p.vet_id
       WHERE p.record_id = $1 AND p.tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Pet not found' });
    }
    return createResponse(200, result.rows[0]);
  } catch (error) {
    console.error('[ENTITY-SERVICE] getPet error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to get pet' });
  }
}

/**
 * Get all owners for a specific pet via PetOwner junction table
 * Returns owner records with relationship metadata (isPrimary, relationship type)
 */
async function getPetOwners(event) {
  const tenantId = resolveTenantId(event);
  const petId = event.pathParameters?.petId || event.pathParameters?.id;

  console.log('[ENTITY-SERVICE] Getting owners for pet:', petId, 'tenant:', tenantId);

  if (!tenantId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Missing tenant context',
    });
  }

  if (!petId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Pet ID is required',
    });
  }

  try {
    await getPoolAsync();

    // Verify pet belongs to tenant
    const petResult = await query(
      `SELECT record_id FROM "Pet" WHERE record_id = $1 AND tenant_id = $2`,
      [petId, tenantId]
    );

    if (petResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Pet not found',
      });
    }

    // Get all owners for this pet via PetOwner junction table
    const result = await query(
      `SELECT o.record_id, o.tenant_id, o.first_name, o.last_name, o.email, o.phone,
              o.address_street, o.address_city, o.address_state,
              o.address_zip, o.address_country,
              o.emergency_contact_name, o.emergency_contact_phone, o.notes,
              o.tags, o.stripe_customer_id,
              o.is_active, o.created_at, o.updated_at,
              po.is_primary, po.relationship
       FROM "Owner" o
       JOIN "PetOwner" po ON po.tenant_id = o.tenant_id AND po.owner_record_id = o.record_id
       WHERE po.pet_record_id = $1 AND o.tenant_id = $2
       ORDER BY po.is_primary DESC, o.last_name, o.first_name`,
      [petId, tenantId]
    );

    return createResponse(200, {
      data: result.rows,
      owners: result.rows,
      total: result.rows.length,
      petId,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getPetOwners error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to get owners for pet',
    });
  }
}

async function createPet(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);

  console.log('[Pets][create] tenantId:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!body.name) {
    return createResponse(400, { error: 'BadRequest', message: 'Name is required' });
  }

  try {
    await getPoolAsync();

    // Tier enforcement: Check active pets limit
    const plan = getTenantPlan(event);
    const countResult = await query(
      `SELECT COUNT(*) as count FROM "Pet" WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );
    const currentPetCount = parseInt(countResult.rows[0]?.count || '0', 10);

    try {
      enforceLimit(plan, 'activePets', currentPetCount);
    } catch (tierError) {
      if (tierError.tierError) {
        console.warn('[Pets][create] Tier limit exceeded:', tierError.tierError);
        return createTierErrorResponse(tierError.tierError);
      }
      throw tierError;
    }

    // Validate foreign key references
    // Support both single ownerId and array of ownerIds
    const singleOwnerId = body.ownerId || body.owner_id;
    const ownerIdsArray = body.ownerIds || body.owner_ids || [];
    const allOwnerIds = singleOwnerId ? [singleOwnerId, ...ownerIdsArray] : ownerIdsArray;
    // Deduplicate owner IDs
    const uniqueOwnerIds = [...new Set(allOwnerIds.filter(Boolean))];

    // Validate all owner IDs exist
    for (const ownerId of uniqueOwnerIds) {
      const ownerCheck = await query(
        `SELECT record_id FROM "Owner" WHERE record_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      if (ownerCheck.rows.length === 0) {
        return createResponse(400, {
          error: 'BadRequest',
          message: `Owner with ID ${ownerId} not found`,
        });
      }
    }

    // Handle vet_id - can be provided directly or we can create/find a Veterinarian record
    let vetId = body.vetId || body.vet_id || null;

    // If vet info is provided but no vetId, try to find or create Veterinarian
    if (!vetId && (body.vetName || body.vet_name || body.vetClinic || body.vet_clinic)) {
      const vetClinic = body.vetClinic || body.vet_clinic || null;
      const vetName = body.vetName || body.vet_name || null;
      const vetPhone = body.vetPhone || body.vet_phone || null;
      const vetEmail = body.vetEmail || body.vet_email || null;

      // Try to find existing vet by clinic name and vet name
      if (vetClinic || vetName) {
        const existingVet = await query(
          `SELECT record_id FROM "Veterinarian"
           WHERE tenant_id = $1 AND (clinic_name = $2 OR vet_name = $3)
           LIMIT 1`,
          [tenantId, vetClinic, vetName]
        );

        if (existingVet.rows.length > 0) {
          vetId = existingVet.rows[0].record_id;
        } else {
          // Create new Veterinarian record
          const vetRecordId = await getNextRecordId(tenantId, 'Veterinarian');
          const newVet = await query(
            `INSERT INTO "Veterinarian" (tenant_id, record_id, clinic_name, vet_name, phone, email, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING record_id`,
            [tenantId, vetRecordId, vetClinic, vetName, vetPhone, vetEmail]
          );
          vetId = newVet.rows[0].record_id;
        }
      }
    }

    // Get next record_id for Pet table
    const recordId = await getNextRecordId(tenantId, 'Pet');

    // Normalize species/gender/status to uppercase (schema uses CHECK constraints)
    const species = (body.species || 'DOG').toUpperCase();
    const gender = body.gender ? body.gender.toUpperCase() : null;
    const status = (body.status || 'ACTIVE').toUpperCase();

    // Validate species
    if (!['DOG', 'CAT', 'OTHER'].includes(species)) {
      return createResponse(400, { error: 'BadRequest', message: `Invalid species: ${species}. Must be DOG, CAT, or OTHER` });
    }
    // Validate gender if provided
    if (gender && !['MALE', 'FEMALE', 'UNKNOWN'].includes(gender)) {
      return createResponse(400, { error: 'BadRequest', message: `Invalid gender: ${gender}. Must be MALE, FEMALE, or UNKNOWN` });
    }
    // Validate status
    if (!['ACTIVE', 'INACTIVE', 'DECEASED'].includes(status)) {
      return createResponse(400, { error: 'BadRequest', message: `Invalid status: ${status}. Must be ACTIVE, INACTIVE, or DECEASED` });
    }

    // Schema: Pet table has vet_id FK, NOT embedded vet fields
    const result = await query(
      `INSERT INTO "Pet" (tenant_id, record_id, name, species, breed, gender, color, weight, date_of_birth,
                         microchip_number, medical_notes, behavior_notes, dietary_notes,
                         status, photo_url, is_active, vet_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        tenantId,
        recordId,
        body.name,
        species,
        body.breed || null,
        gender,
        body.color || null,
        body.weight || null,
        body.dateOfBirth || body.date_of_birth || null,
        body.microchipNumber || body.microchip_number || null,
        body.medicalNotes || body.medical_notes || null,
        body.behaviorNotes || body.behavior_notes || null,
        body.dietaryNotes || body.dietary_notes || null,
        status,
        body.photoUrl || body.photo_url || null,
        body.isActive !== false,
        vetId,
        event.user?.userId || null
      ]
    );

    const petId = result.rows[0].record_id;

    // Create PetOwner relationships for all provided owner IDs
    // First owner is marked as primary
    for (let i = 0; i < uniqueOwnerIds.length; i++) {
      const ownerId = uniqueOwnerIds[i];
      const isPrimary = i === 0; // First owner is primary
      await query(
        `INSERT INTO "PetOwner" (tenant_id, pet_record_id, owner_record_id, is_primary, relationship)
         VALUES ($1, $2, $3, $4, 'owner')
         ON CONFLICT (pet_record_id, owner_record_id) DO NOTHING`,
        [tenantId, petId, ownerId, isPrimary]
      );
    }

    console.log('[ENTITY-SERVICE] Created pet:', petId, 'record_id:', recordId, 'with', uniqueOwnerIds.length, 'owners');

    // Publish workflow event
    try {
      await publishWorkflowEvent('pet.created', petId, 'pet', tenantId, {
        name: result.rows[0].name,
        species: result.rows[0].species,
        breed: result.rows[0].breed,
        ownerIds: uniqueOwnerIds,
      });
    } catch (err) {
      console.error('[ENTITY-SERVICE] Failed to publish pet.created event:', err.message);
    }

    return createResponse(201, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] createPet error:', error);
    // Return actual error message for debugging
    const errorMessage = error.message || 'Failed to create pet';
    return createResponse(500, { error: 'InternalServerError', message: errorMessage });
  }
}

async function updatePet(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const body = parseBody(event);

  console.log('[Pets][update] id:', id, 'tenantId:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (body.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(body.name); }
    if (body.species !== undefined) { updates.push(`species = $${paramIndex++}`); values.push(body.species); }
    if (body.breed !== undefined) { updates.push(`breed = $${paramIndex++}`); values.push(body.breed); }
    if (body.gender !== undefined) { updates.push(`gender = $${paramIndex++}`); values.push(body.gender); }
    if (body.color !== undefined) { updates.push(`color = $${paramIndex++}`); values.push(body.color); }
    if (body.weight !== undefined) { updates.push(`weight = $${paramIndex++}`); values.push(body.weight === '' ? null : body.weight); }
    if (body.dateOfBirth !== undefined || body.date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramIndex++}`);
      values.push(body.dateOfBirth || body.date_of_birth);
    }
    if (body.microchipNumber !== undefined || body.microchip_number !== undefined) {
      updates.push(`microchip_number = $${paramIndex++}`);
      values.push(body.microchipNumber || body.microchip_number);
    }
    if (body.medicalNotes !== undefined || body.medical_notes !== undefined) {
      updates.push(`medical_notes = $${paramIndex++}`);
      values.push(body.medicalNotes || body.medical_notes);
    }
    if (body.behaviorNotes !== undefined || body.behavior_notes !== undefined) {
      updates.push(`behavior_notes = $${paramIndex++}`);
      values.push(body.behaviorNotes || body.behavior_notes);
    }
    if (body.dietaryNotes !== undefined || body.dietary_notes !== undefined) {
      updates.push(`dietary_notes = $${paramIndex++}`);
      values.push(body.dietaryNotes || body.dietary_notes);
    }
    if (body.status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(body.status); }
    if (body.photoUrl !== undefined || body.photo_url !== undefined) {
      updates.push(`photo_url = $${paramIndex++}`);
      values.push(body.photoUrl || body.photo_url);
    }
    if (body.isActive !== undefined || body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.isActive ?? body.is_active);
    }

    // Handle vet_id - Schema uses vet_id FK to Veterinarian table, NOT embedded vet fields
    if (body.vetId !== undefined || body.vet_id !== undefined) {
      updates.push(`vet_id = $${paramIndex++}`);
      values.push(body.vetId || body.vet_id);
    } else if (body.vetName !== undefined || body.vet_name !== undefined ||
               body.vetClinic !== undefined || body.vet_clinic !== undefined) {
      // If vet info provided without vetId, find or create Veterinarian
      const vetClinic = body.vetClinic || body.vet_clinic || null;
      const vetName = body.vetName || body.vet_name || null;
      const vetPhone = body.vetPhone || body.vet_phone || null;
      const vetEmail = body.vetEmail || body.vet_email || null;

      if (vetClinic || vetName) {
        const existingVet = await query(
          `SELECT record_id FROM "Veterinarian"
           WHERE tenant_id = $1 AND (clinic_name = $2 OR vet_name = $3)
           LIMIT 1`,
          [tenantId, vetClinic, vetName]
        );

        let vetId;
        if (existingVet.rows.length > 0) {
          vetId = existingVet.rows[0].record_id;
          // Optionally update vet info
          await query(
            `UPDATE "Veterinarian" SET
               clinic_name = COALESCE($2, clinic_name),
               vet_name = COALESCE($3, vet_name),
               phone = COALESCE($4, phone),
               email = COALESCE($5, email),
               updated_at = NOW()
             WHERE id = $1`,
            [vetId, vetClinic, vetName, vetPhone, vetEmail]
          );
        } else {
          const vetRecordId = await getNextRecordId(tenantId, 'Veterinarian');
          const newVet = await query(
            `INSERT INTO "Veterinarian" (tenant_id, record_id, clinic_name, vet_name, phone, email, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING record_id`,
            [tenantId, vetRecordId, vetClinic, vetName, vetPhone, vetEmail]
          );
          vetId = newVet.rows[0].record_id;
        }
        updates.push(`vet_id = $${paramIndex++}`);
        values.push(vetId);
      }
    }

    // Add updated_by
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(event.user?.userId || null);

    if (updates.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No fields to update' });
    }

    values.push(id, tenantId);

    const result = await query(
      `UPDATE "Pet" SET ${updates.join(', ')}, updated_at = NOW()
       WHERE record_id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Pet not found' });
    }

    console.log('[ENTITY-SERVICE] Updated pet:', id);

    // Publish workflow event
    try {
      await publishWorkflowEvent('pet.updated', id, 'pet', tenantId, {
        changedFields: Object.keys(body).filter(k => body[k] !== undefined),
      });
    } catch (err) {
      console.error('[ENTITY-SERVICE] Failed to publish pet.updated event:', err.message);
    }

    return createResponse(200, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] updatePet error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update pet' });
  }
}

async function deletePet(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();

  console.log('[Pets][delete] id:', id, 'tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    // Check pet exists first
    const petCheck = await query(
      `SELECT record_id FROM "Pet" WHERE record_id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (petCheck.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Pet not found' });
    }

    // Delete vaccinations for this pet
    await query(`DELETE FROM "Vaccination" WHERE pet_id = $1 AND tenant_id = $2`, [id, tenantId]);
    console.log('[Pets][delete] Deleted vaccinations for pet:', id);

    // Delete PetOwner junction records
    await query(`DELETE FROM "PetOwner" WHERE pet_record_id = $1 AND tenant_id = $2`, [id, tenantId]);
    console.log('[Pets][delete] Deleted PetOwner records for pet:', id);

    // Delete the pet
    await query(`DELETE FROM "Pet" WHERE record_id = $1 AND tenant_id = $2`, [id, tenantId]);
    console.log('[ENTITY-SERVICE] Deleted pet:', id);

    return createResponse(204, '');
  } catch (error) {
    console.error('[ENTITY-SERVICE] deletePet error:', error);
    return createResponse(500, { error: 'InternalServerError', message: error.message || 'Failed to delete pet' });
  }
}

// Owners handlers
async function getOwners(event) {
  // Use resolveTenantId helper with header fallback
  const tenantId = resolveTenantId(event);
  const queryParams = getQueryParams(event);
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = Math.min(parseInt(queryParams.limit, 10) || 50, 200);
  const offset = (page - 1) * limit;
  const search = queryParams.search || queryParams.q || '';

  // Diagnostic logging (sanitized - no env values)
  console.log('[Owners][list] tenantId:', tenantId, 'page:', page, 'limit:', limit);

  // Return 400 if no tenant context
  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Build WHERE clause with optional search
    let whereClause = 'o.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (o.first_name ILIKE $${paramIndex} OR o.last_name ILIKE $${paramIndex} OR o.email ILIKE $${paramIndex} OR o.phone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total FROM "Owner" o WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / limit);

    console.log('[Owners][diag] total for tenant', tenantId, ':', total);

    // Schema: Owner has address_street, address_city, address_state, address_zip, address_country
    // Also has tags (TEXT[]), stripe_customer_id, created_by, updated_by
    // Pet count comes from PetOwner junction table
    // Bookings count, last visit, lifetime value, and pending balance calculated from related tables
    const result = await query(
      `SELECT o.record_id, o.tenant_id, o.first_name, o.last_name, o.email, o.phone,
              o.address_street, o.address_city, o.address_state,
              o.address_zip, o.address_country,
              o.emergency_contact_name, o.emergency_contact_phone, o.notes,
              o.tags, o.stripe_customer_id,
              o.is_active, o.created_at, o.updated_at, o.created_by, o.updated_by,
              COALESCE(pet_counts.pet_count, 0) AS pet_count,
              COALESCE(booking_stats.bookings_count, 0) AS bookings_count,
              booking_stats.last_visit,
              COALESCE(invoice_stats.lifetime_value, 0) AS lifetime_value,
              COALESCE(invoice_stats.pending_balance, 0) AS pending_balance
       FROM "Owner" o
       LEFT JOIN (
         SELECT owner_record_id, COUNT(*) AS pet_count
         FROM "PetOwner"
         WHERE tenant_id = $1
         GROUP BY owner_record_id
       ) pet_counts ON pet_counts.owner_record_id = o.record_id
       LEFT JOIN (
         SELECT b.owner_id,
                COUNT(*) AS bookings_count,
                MAX(CASE WHEN b.status IN ('CHECKED_OUT', 'COMPLETED', 'checked_out', 'completed') THEN b.check_out ELSE NULL END) AS last_visit
         FROM "Booking" b
         WHERE b.tenant_id = $1
         GROUP BY b.owner_id
       ) booking_stats ON booking_stats.owner_id = o.record_id
       LEFT JOIN (
         SELECT i.owner_id,
                SUM(CASE WHEN LOWER(i.status) = 'paid' THEN i.total_cents ELSE 0 END) AS lifetime_value,
                SUM(CASE WHEN LOWER(i.status) NOT IN ('paid', 'cancelled', 'void') THEN i.total_cents ELSE 0 END) AS pending_balance
         FROM "Invoice" i
         WHERE i.tenant_id = $1
         GROUP BY i.owner_id
       ) invoice_stats ON invoice_stats.owner_id = o.record_id
       WHERE ${whereClause}
       ORDER BY o.last_name, o.first_name
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );
    return createResponse(200, {
      data: result.rows,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getOwners error:', error);
    return createResponse(200, { data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
  }
}

async function getOwner(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();

  console.log('[ENTITY-SERVICE] Getting owner:', id, 'for tenant:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();
    // Schema: Owner has address_street, address_city, address_state, address_zip, address_country
    // Also has tags (TEXT[]), stripe_customer_id, created_by, updated_by
    const result = await query(
      `SELECT o.record_id, o.tenant_id, o.first_name, o.last_name, o.email, o.phone,
              o.address_street, o.address_city, o.address_state,
              o.address_zip, o.address_country,
              o.emergency_contact_name, o.emergency_contact_phone, o.notes,
              o.tags, o.stripe_customer_id,
              o.is_active, o.created_at, o.updated_at, o.created_by, o.updated_by
       FROM "Owner" o
       WHERE o.record_id = $1 AND o.tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Owner not found' });
    }
    return createResponse(200, result.rows[0]);
  } catch (error) {
    console.error('[ENTITY-SERVICE] getOwner error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to get owner' });
  }
}

async function createOwner(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);

  console.log('[ENTITY-SERVICE] Creating owner for tenant:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  // At minimum need either first_name, last_name, or email
  if (!body.firstName && !body.first_name && !body.lastName && !body.last_name && !body.email) {
    return createResponse(400, { error: 'BadRequest', message: 'At least one of firstName, lastName, or email is required' });
  }

  // Validate email format if provided
  if (body.email) {
    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) {
      return createResponse(400, { error: 'BadRequest', message: emailValidation.error });
    }
  }

  try {
    await getPoolAsync();

    // Support petIds array for associating pets with owner
    const petIdsArray = body.petIds || body.pet_ids || [];
    const uniquePetIds = [...new Set(petIdsArray.filter(Boolean))];

    // Validate all pet IDs exist
    for (const petId of uniquePetIds) {
      const petCheck = await query(
        `SELECT record_id FROM "Pet" WHERE record_id = $1 AND tenant_id = $2`,
        [petId, tenantId]
      );
      if (petCheck.rows.length === 0) {
        return createResponse(400, {
          error: 'BadRequest',
          message: `Pet with ID ${petId} not found`,
        });
      }
    }

    // Get next record_id for Owner table
    const recordId = await getNextRecordId(tenantId, 'Owner');

    // Schema: Owner has tags (TEXT[]), stripe_customer_id, created_by, updated_by
    const result = await query(
      `INSERT INTO "Owner" (tenant_id, record_id, first_name, last_name, email, phone,
                           address_street, address_city, address_state, address_zip, address_country,
                           emergency_contact_name, emergency_contact_phone, notes, tags, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        tenantId,
        recordId,
        body.firstName || body.first_name || null,
        body.lastName || body.last_name || null,
        body.email || null,
        body.phone || null,
        body.addressStreet || body.address_street || body.address?.street || null,
        body.addressCity || body.address_city || body.address?.city || null,
        body.addressState || body.address_state || body.address?.state || null,
        body.addressZip || body.address_zip || body.zipCode || body.zip_code || body.address?.zip || null,
        body.addressCountry || body.address_country || body.address?.country || 'US',
        body.emergencyContactName || body.emergency_contact_name || null,
        body.emergencyContactPhone || body.emergency_contact_phone || null,
        body.notes || null,
        body.tags || [],
        body.isActive !== false,
        null
      ]
    );

    const ownerId = result.rows[0].record_id;

    // Create PetOwner relationships for all provided pet IDs
    for (const petId of uniquePetIds) {
      await query(
        `INSERT INTO "PetOwner" (tenant_id, pet_record_id, owner_record_id, is_primary, relationship)
         VALUES ($1, $2, $3, false, 'owner')
         ON CONFLICT (pet_record_id, owner_record_id) DO NOTHING`,
        [tenantId, petId, ownerId]
      );
    }

    console.log('[ENTITY-SERVICE] Created owner:', ownerId, 'record_id:', recordId, 'with', uniquePetIds.length, 'pets');

    // Publish workflow event
    try {
      await publishWorkflowEvent('owner.created', ownerId, 'owner', tenantId, {
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        email: result.rows[0].email,
        petIds: uniquePetIds,
      });
    } catch (err) {
      console.error('[ENTITY-SERVICE] Failed to publish owner.created event:', err.message);
    }

    return createResponse(201, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] createOwner error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to create owner' });
  }
}

async function updateOwner(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const body = parseBody(event);

  console.log('[ENTITY-SERVICE] Updating owner:', id, 'for tenant:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  // Validate email format if being updated
  if (body.email !== undefined && body.email !== null) {
    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) {
      return createResponse(400, { error: 'BadRequest', message: emailValidation.error });
    }
  }

  try {
    await getPoolAsync();

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (body.firstName !== undefined || body.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(body.firstName || body.first_name);
    }
    if (body.lastName !== undefined || body.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(body.lastName || body.last_name);
    }
    if (body.email !== undefined) { updates.push(`email = $${paramIndex++}`); values.push(body.email); }
    if (body.phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(body.phone); }
    if (body.addressStreet !== undefined || body.address_street !== undefined || body.address !== undefined) {
      updates.push(`address_street = $${paramIndex++}`);
      values.push(body.addressStreet || body.address_street || body.address);
    }
    if (body.addressCity !== undefined || body.address_city !== undefined || body.city !== undefined) {
      updates.push(`address_city = $${paramIndex++}`);
      values.push(body.addressCity || body.address_city || body.city);
    }
    if (body.addressState !== undefined || body.address_state !== undefined || body.state !== undefined) {
      updates.push(`address_state = $${paramIndex++}`);
      values.push(body.addressState || body.address_state || body.state);
    }
    if (body.addressZip !== undefined || body.address_zip !== undefined || body.zipCode !== undefined || body.zip_code !== undefined) {
      updates.push(`address_zip = $${paramIndex++}`);
      values.push(body.addressZip || body.address_zip || body.zipCode || body.zip_code);
    }
    if (body.addressCountry !== undefined || body.address_country !== undefined || body.country !== undefined) {
      updates.push(`address_country = $${paramIndex++}`);
      values.push(body.addressCountry || body.address_country || body.country);
    }
    if (body.emergencyContactName !== undefined || body.emergency_contact_name !== undefined) {
      updates.push(`emergency_contact_name = $${paramIndex++}`);
      values.push(body.emergencyContactName || body.emergency_contact_name);
    }
    if (body.emergencyContactPhone !== undefined || body.emergency_contact_phone !== undefined) {
      updates.push(`emergency_contact_phone = $${paramIndex++}`);
      values.push(body.emergencyContactPhone || body.emergency_contact_phone);
    }
    if (body.notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(body.notes); }
    if (body.tags !== undefined) { updates.push(`tags = $${paramIndex++}`); values.push(body.tags); }
    if (body.isActive !== undefined || body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.isActive ?? body.is_active);
    }

    // Add updated_by
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(event.user?.userId || null);

    if (updates.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No fields to update' });
    }

    values.push(id, tenantId);

    const result = await query(
      `UPDATE "Owner" SET ${updates.join(', ')}, updated_at = NOW()
       WHERE record_id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Owner not found' });
    }

    console.log('[ENTITY-SERVICE] Updated owner:', id);

    // Publish workflow event
    try {
      await publishWorkflowEvent('owner.updated', id, 'owner', tenantId, {
        changedFields: Object.keys(body).filter(k => body[k] !== undefined),
      });
    } catch (err) {
      console.error('[ENTITY-SERVICE] Failed to publish owner.updated event:', err.message);
    }

    return createResponse(200, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] updateOwner error:', error);
    // Return actual error message for debugging
    const errorMessage = error.message || 'Failed to update owner';
    return createResponse(500, { error: 'InternalServerError', message: errorMessage });
  }
}

async function deleteOwner(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const deletedBy = event.user?.userId || null;

  console.log('[ENTITY-SERVICE] Deleting owner:', id, 'for tenant:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    // Use softDelete helper - archives to DeletedRecord table then hard deletes
    const result = await softDelete('Owner', id, tenantId, deletedBy);

    if (!result) {
      return createResponse(404, { error: 'NotFound', message: 'Owner not found' });
    }

    console.log('[ENTITY-SERVICE] Deleted owner:', id);
    return createResponse(204, '');
  } catch (error) {
    console.error('[ENTITY-SERVICE] deleteOwner error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete owner' });
  }
}

/**
 * Export all data for a customer (GDPR/privacy data export)
 * Returns all owner data, pets, bookings, payments, communications
 */
async function exportOwnerData(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const ownerId = pathParams.id || event.path?.split('/')[5]; // /api/v1/entity/owners/{id}/export

  console.log('[ENTITY-SERVICE] Exporting owner data:', ownerId, 'for tenant:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!ownerId) {
    return createResponse(400, { error: 'BadRequest', message: 'Owner ID is required' });
  }

  try {
    await getPoolAsync();

    // Get owner details
    const ownerResult = await query(
      `SELECT * FROM "Owner" WHERE record_id = $1 AND tenant_id = $2`,
      [ownerId, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Owner not found' });
    }

    const owner = ownerResult.rows[0];

    // Get all pets via PetOwner junction table (Pet has NO owner_id column)
    const petsResult = await query(
      `SELECT p.* FROM "Pet" p
       JOIN "PetOwner" po ON po.tenant_id = p.tenant_id AND po.pet_record_id = p.record_id
       WHERE po.owner_record_id = $1 AND p.tenant_id = $2`,
      [ownerId, tenantId]
    );

    // Get all bookings
    const bookingsResult = await query(
      `SELECT * FROM "Booking" WHERE owner_id = $1 AND tenant_id = $2`,
      [ownerId, tenantId]
    );

    // Get all invoices
    let invoices = [];
    try {
      const invoicesResult = await query(
        `SELECT * FROM "Invoice" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      invoices = invoicesResult.rows;
    } catch (e) {
      console.log('[ENTITY-SERVICE] Invoice table not found or error:', e.message);
    }

    // Get all payments
    let payments = [];
    try {
      const paymentsResult = await query(
        `SELECT * FROM "Payment" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      payments = paymentsResult.rows;
    } catch (e) {
      console.log('[ENTITY-SERVICE] Payment table not found or error:', e.message);
    }

    // Get vaccinations for all pets
    const petIds = petsResult.rows.map(p => p.record_id);
    let vaccinations = [];
    if (petIds.length > 0) {
      try {
        const vaccinationsResult = await query(
          `SELECT * FROM "Vaccination" WHERE pet_id = ANY($1) AND tenant_id = $2`,
          [petIds, tenantId]
        );
        vaccinations = vaccinationsResult.rows;
      } catch (e) {
        console.log('[ENTITY-SERVICE] Vaccination table not found or error:', e.message);
      }
    }

    // Get communications
    let communications = [];
    try {
      const communicationsResult = await query(
        `SELECT * FROM "Communication" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      communications = communicationsResult.rows;
    } catch (e) {
      console.log('[ENTITY-SERVICE] Communication table not found or error:', e.message);
    }

    // Get policy agreements
    let policyAgreements = [];
    try {
      const agreementsResult = await query(
        `SELECT pa.*, p.title as policy_title, p.type as policy_type
         FROM "PolicyAgreement" pa
         LEFT JOIN "Policy" p ON pa.policy_id = p.record_id
         WHERE pa.owner_id = $1 AND pa.tenant_id = $2`,
        [ownerId, tenantId]
      );
      policyAgreements = agreementsResult.rows;
    } catch (e) {
      console.log('[ENTITY-SERVICE] PolicyAgreement table not found or error:', e.message);
    }

    // Build the export object
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      owner: {
        ...owner,
        // Remove sensitive internal fields
        tenant_id: undefined,
      },
      pets: petsResult.rows.map(pet => ({
        ...pet,
        tenant_id: undefined,
      })),
      bookings: bookingsResult.rows.map(booking => ({
        ...booking,
        tenant_id: undefined,
      })),
      invoices: invoices.map(inv => ({
        ...inv,
        tenant_id: undefined,
      })),
      payments: payments.map(payment => ({
        ...payment,
        tenant_id: undefined,
        // Remove sensitive payment details
        stripe_payment_intent_id: undefined,
        stripe_customer_id: undefined,
      })),
      vaccinations: vaccinations.map(vax => ({
        ...vax,
        tenant_id: undefined,
      })),
      communications: communications.map(comm => ({
        ...comm,
        tenant_id: undefined,
      })),
      policyAgreements: policyAgreements.map(pa => ({
        ...pa,
        tenant_id: undefined,
      })),
    };

    console.log('[ENTITY-SERVICE] Exported data for owner:', ownerId, {
      pets: exportData.pets.length,
      bookings: exportData.bookings.length,
      invoices: exportData.invoices.length,
      payments: exportData.payments.length,
    });

    return createResponse(200, exportData);
  } catch (error) {
    console.error('[ENTITY-SERVICE] exportOwnerData error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to export owner data' });
  }
}

/**
 * Delete all data for a customer (GDPR/privacy right to erasure)
 *
 * GDPR COMPLIANCE NOTE:
 * This uses the softDelete/softDeleteBatch helpers which:
 * 1. Archive records to the DeletedRecord table (preserves audit trail)
 * 2. Hard delete from original tables (data erasure)
 *
 * The DeletedRecord table preserves data for legal retention requirements
 * while removing it from active queries.
 */
async function deleteOwnerData(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const ownerId = pathParams.id || event.path?.split('/')[5]; // /api/v1/entity/owners/{id}/data
  const deletedBy = event.user?.userId || null;

  console.log('[ENTITY-SERVICE] Deleting all owner data:', ownerId, 'for tenant:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!ownerId) {
    return createResponse(400, { error: 'BadRequest', message: 'Owner ID is required' });
  }

  try {
    await getPoolAsync();

    // Verify owner exists
    const ownerResult = await query(
      `SELECT id, first_name, last_name FROM "Owner" WHERE record_id = $1 AND tenant_id = $2`,
      [ownerId, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Owner not found' });
    }

    const owner = ownerResult.rows[0];

    // Get all pet IDs for this owner via PetOwner junction table
    const petsResult = await query(
      `SELECT p.record_id FROM "Pet" p
       JOIN "PetOwner" po ON po.tenant_id = p.tenant_id AND po.pet_record_id = p.record_id
       WHERE po.owner_record_id = $1 AND p.tenant_id = $2`,
      [ownerId, tenantId]
    );
    const petIds = petsResult.rows.map(p => p.record_id);

    // Begin deletion (archive to DeletedRecord, then hard delete)
    const deletionSummary = {
      vaccinations: 0,
      communications: 0,
      policyAgreements: 0,
      payments: 0,
      invoices: 0,
      bookings: 0,
      pets: 0,
      owner: 0,
    };

    // Delete vaccinations for all pets
    if (petIds.length > 0) {
      try {
        // Get vaccination IDs first
        const vacResult = await query(
          `SELECT record_id FROM "Vaccination" WHERE pet_id = ANY($1) AND tenant_id = $2`,
          [petIds, tenantId]
        );
        const vacIds = vacResult.rows.map(v => v.record_id);
        if (vacIds.length > 0) {
          deletionSummary.vaccinations = await softDeleteBatch('Vaccination', vacIds, tenantId, deletedBy);
        }
      } catch (e) {
        console.log('[ENTITY-SERVICE] Vaccination delete skipped:', e.message);
      }
    }

    // Delete communications
    try {
      const commResult = await query(
        `SELECT record_id FROM "Communication" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const commIds = commResult.rows.map(c => c.record_id);
      if (commIds.length > 0) {
        deletionSummary.communications = await softDeleteBatch('Communication', commIds, tenantId, deletedBy);
      }
    } catch (e) {
      console.log('[ENTITY-SERVICE] Communication delete skipped:', e.message);
    }

    // Delete policy agreements
    try {
      const paResult = await query(
        `SELECT record_id FROM "PolicyAgreement" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const paIds = paResult.rows.map(p => p.record_id);
      if (paIds.length > 0) {
        deletionSummary.policyAgreements = await softDeleteBatch('PolicyAgreement', paIds, tenantId, deletedBy);
      }
    } catch (e) {
      console.log('[ENTITY-SERVICE] PolicyAgreement delete skipped:', e.message);
    }

    // Delete payments
    try {
      const payResult = await query(
        `SELECT record_id FROM "Payment" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const payIds = payResult.rows.map(p => p.record_id);
      if (payIds.length > 0) {
        deletionSummary.payments = await softDeleteBatch('Payment', payIds, tenantId, deletedBy);
      }
    } catch (e) {
      console.log('[ENTITY-SERVICE] Payment delete skipped:', e.message);
    }

    // Delete invoices
    try {
      const invResult = await query(
        `SELECT record_id FROM "Invoice" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const invIds = invResult.rows.map(i => i.record_id);
      if (invIds.length > 0) {
        deletionSummary.invoices = await softDeleteBatch('Invoice', invIds, tenantId, deletedBy);
      }
    } catch (e) {
      console.log('[ENTITY-SERVICE] Invoice delete skipped:', e.message);
    }

    // Delete bookings (cancel status first for any active ones)
    try {
      await query(
        `UPDATE "Booking" SET status = 'CANCELLED' WHERE owner_id = $1 AND tenant_id = $2 AND status NOT IN ('CANCELLED', 'COMPLETED')`,
        [ownerId, tenantId]
      );
      const bookResult = await query(
        `SELECT record_id FROM "Booking" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const bookIds = bookResult.rows.map(b => b.record_id);
      if (bookIds.length > 0) {
        deletionSummary.bookings = await softDeleteBatch('Booking', bookIds, tenantId, deletedBy);
      }
    } catch (e) {
      console.log('[ENTITY-SERVICE] Booking delete skipped:', e.message);
    }

    // Delete PetOwner relationships (hard delete junction table - no archive needed)
    try {
      await query(
        `DELETE FROM "PetOwner" WHERE owner_record_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
    } catch (e) {
      console.log('[ENTITY-SERVICE] PetOwner delete skipped:', e.message);
    }

    // Delete pets using the petIds we already collected
    if (petIds.length > 0) {
      deletionSummary.pets = await softDeleteBatch('Pet', petIds, tenantId, deletedBy);
    }

    // Finally, delete the owner
    const ownerDeleted = await softDelete('Owner', ownerId, tenantId, deletedBy);
    deletionSummary.owner = ownerDeleted ? 1 : 0;

    console.log('[ENTITY-SERVICE] Deleted all data for owner:', ownerId, deletionSummary);

    return createResponse(200, {
      success: true,
      message: `All data for ${owner.first_name} ${owner.last_name} has been deleted (GDPR erasure)`,
      summary: deletionSummary,
      note: 'Data has been archived to DeletedRecord table and removed from active tables.',
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] deleteOwnerData error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete owner data' });
  }
}

// Staff handlers
async function getStaff(event) {
  const tenantId = resolveTenantId(event);

  console.log('[Staff][list] tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();
    // Query User table directly - no separate Staff table needed
    // Users with tenant_id are staff/admin accounts for that tenant
    const result = await query(
      `SELECT u.record_id, u.tenant_id, u.record_id as user_id,
              u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              u.is_active, u.created_at, u.updated_at,
              COALESCE(r.name, 'user') AS role,
              r.name as title
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = u.tenant_id AND r.record_id = ur.role_id
       WHERE u.tenant_id = $1
       ORDER BY u.last_name, u.first_name`,
      [tenantId]
    );

    // Transform to include name field for frontend compatibility
    const staff = result.rows.map(row => ({
      ...row,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
    }));

    console.log('[Staff][diag] count:', staff.length);
    return createResponse(200, { data: staff });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getStaff error:', error);
    return createResponse(200, { data: [] });
  }
}

async function getStaffMember(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();

  console.log('[Staff][get] id:', id, 'tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();
    // Query User table directly
    const result = await query(
      `SELECT u.record_id, u.tenant_id, u.record_id as user_id,
              u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              u.is_active, u.created_at, u.updated_at,
              COALESCE(r.name, 'user') AS role,
              r.name as title
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id
       LEFT JOIN "Role" r ON r.tenant_id = u.tenant_id AND r.record_id = ur.role_id
       WHERE u.record_id = $1 AND u.tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Staff member not found' });
    }
    const row = result.rows[0];
    return createResponse(200, {
      ...row,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getStaffMember error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to get staff member' });
  }
}

async function createStaffMember(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);

  console.log('[Staff][create] tenantId:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  // Need userId to link staff to a user
  if (!body.userId && !body.user_id) {
    return createResponse(400, { error: 'BadRequest', message: 'userId is required' });
  }

  try {
    await getPoolAsync();

    const userId = body.userId || body.user_id;

    // Check if user exists and belongs to tenant
    const userCheck = await query(
      `SELECT id FROM "User" WHERE record_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (userCheck.rows.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'User not found or does not belong to this tenant' });
    }

    // Check if staff record already exists for this user
    const existingCheck = await query(
      `SELECT id FROM "Staff" WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (existingCheck.rows.length > 0) {
      return createResponse(409, { error: 'Conflict', message: 'Staff record already exists for this user' });
    }

    const recordId = await getNextRecordId(tenantId, 'Staff');
    const result = await query(
      `INSERT INTO "Staff" (tenant_id, record_id, user_id, title, department, hire_date, is_active, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        tenantId,
        recordId,
        userId,
        body.title || null,
        body.department || null,
        body.hireDate || body.hire_date || null,
        body.isActive !== false,
        JSON.stringify(body.permissions || [])
      ]
    );

    // Fetch with user info joined
    const staffWithUser = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email
       FROM "Staff" s
       LEFT JOIN "User" u ON u.tenant_id = s.tenant_id AND u.record_id = s.user_id
       WHERE s.record_id = $1`,
      [result.rows[0].record_id]
    );

    console.log('[ENTITY-SERVICE] Created staff member:', result.rows[0].record_id);
    return createResponse(201, { data: staffWithUser.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] createStaffMember error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to create staff member' });
  }
}

async function updateStaffMember(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const body = parseBody(event);

  console.log('[Staff][update] id:', id, 'tenantId:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (body.title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(body.title); }
    if (body.department !== undefined) { updates.push(`department = $${paramIndex++}`); values.push(body.department); }
    if (body.hireDate !== undefined || body.hire_date !== undefined) {
      updates.push(`hire_date = $${paramIndex++}`);
      values.push(body.hireDate || body.hire_date);
    }
    if (body.isActive !== undefined || body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.isActive ?? body.is_active);
    }
    if (body.permissions !== undefined) {
      updates.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(body.permissions));
    }

    if (updates.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No fields to update' });
    }

    values.push(id, tenantId);

    const result = await query(
      `UPDATE "Staff" SET ${updates.join(', ')}, updated_at = NOW()
       WHERE record_id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Staff member not found' });
    }

    // Fetch with user info joined
    const staffWithUser = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email
       FROM "Staff" s
       LEFT JOIN "User" u ON u.tenant_id = s.tenant_id AND u.record_id = s.user_id
       WHERE s.record_id = $1`,
      [result.rows[0].record_id]
    );

    console.log('[ENTITY-SERVICE] Updated staff member:', id);
    return createResponse(200, { data: staffWithUser.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] updateStaffMember error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update staff member' });
  }
}

async function deleteStaffMember(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();

  console.log('[Staff][delete] id:', id, 'tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Hard delete for staff records (they can be re-created)
    const result = await query(
      `DELETE FROM "Staff"
       WHERE record_id = $1 AND tenant_id = $2
       RETURNING record_id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Staff member not found' });
    }

    console.log('[ENTITY-SERVICE] Deleted staff member:', id);
    return createResponse(204, '');
  } catch (error) {
    console.error('[ENTITY-SERVICE] deleteStaffMember error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete staff member' });
  }
}

/**
 * Get expiring vaccinations for tenant
 *
 * Expected response shape (from frontend):
 * Array of: { id, petId, petName, ownerName, type, administeredAt, expiresAt, provider, status }
 *
 * Query params:
 * - daysAhead: number of days to look ahead (default 30)
 */
async function getExpiringVaccinations(event) {
  // Get tenantId - prefer header, fallback to user lookup
  let tenantId = getTenantIdFromHeader(event);

  if (!tenantId && event.user?.tenantId) {
    tenantId = event.user.tenantId;
  }

  if (!tenantId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Missing tenant context',
    });
  }

  const queryParams = getQueryParams(event);
  const daysAhead = parseInt(queryParams.daysAhead, 10) || 30;

  // Validate daysAhead to prevent abuse
  if (daysAhead < 1 || daysAhead > 365) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'daysAhead must be between 1 and 365',
    });
  }

  console.log('[ENTITY-SERVICE] Getting expiring vaccinations:', { tenantId, daysAhead });

  try {
    await getPoolAsync();

    // Get query params for status filtering
    const queryParams = getQueryParams(event);
    const statusFilter = queryParams.statusFilter || 'active'; // 'active', 'archived', 'all'

    // Build status condition - default to active only (excludes archived)
    let statusCondition = '';
    if (statusFilter === 'active') {
      statusCondition = ` AND (v.status = 'active' OR v.status IS NULL)`;
    } else if (statusFilter === 'archived') {
      statusCondition = ` AND v.status = 'archived'`;
    }
    // 'all' shows everything

    // Get vaccinations expiring within daysAhead days
    // Only includes active vaccinations by default (excludes archived)
    const result = await query(
      `SELECT
         v.record_id as id,
         v.pet_id,
         v.type,
         v.administered_at,
         v.expires_at,
         v.provider,
         v.notes,
         v.status as record_status,
         v.renewed_from_id,
         v.renewed_by_id,
         v.created_at,
         p.name as pet_name,
         p.species as pet_species,
         p.breed as pet_breed,
         o.record_id as owner_id,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone
       FROM "Vaccination" v
       JOIN "Pet" p ON p.tenant_id = v.tenant_id AND p.record_id = v.pet_id
       LEFT JOIN "PetOwner" po ON po.tenant_id = p.tenant_id AND po.pet_record_id = p.record_id AND po.is_primary = true
       LEFT JOIN "Owner" o ON o.tenant_id = p.tenant_id AND o.record_id = po.owner_record_id
       WHERE v.tenant_id = $1${statusCondition}
       ORDER BY v.expires_at ASC NULLS LAST`,
      [tenantId]
    );

    const vaccinations = result.rows.map(row => {
      // Determine display status based on expiry and record status
      const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
      const now = new Date();
      const recordStatus = row.record_status || 'active';

      // Compute display status for UI
      let displayStatus = 'current';
      if (recordStatus === 'archived') {
        displayStatus = 'archived';
      } else if (expiresAt && expiresAt < now) {
        displayStatus = 'overdue';
      } else if (expiresAt && expiresAt <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        displayStatus = 'critical';
      } else if (expiresAt && expiresAt <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        displayStatus = 'expiring';
      }

      return {
        id: row.id,
        recordId: row.id,
        petId: row.pet_id,
        petName: row.pet_name,
        petSpecies: row.pet_species,
        petBreed: row.pet_breed,
        type: row.type,
        administeredAt: row.administered_at,
        expiresAt: row.expires_at,
        provider: row.provider,
        notes: row.notes,
        // Record status from database
        recordStatus: recordStatus,
        status: displayStatus,
        // Renewal tracking
        renewedFromId: row.renewed_from_id,
        renewedById: row.renewed_by_id,
        isArchived: recordStatus === 'archived',
        isActive: recordStatus === 'active' || !recordStatus,
        // Owner info
        owner: row.owner_id ? {
          id: row.owner_id,
          firstName: row.owner_first_name,
          lastName: row.owner_last_name,
          name: `${row.owner_first_name || ''} ${row.owner_last_name || ''}`.trim(),
          email: row.owner_email,
          phone: row.owner_phone,
        } : null,
        ownerFirstName: row.owner_first_name,
        ownerLastName: row.owner_last_name,
        ownerEmail: row.owner_email,
        ownerPhone: row.owner_phone,
        ownerName: row.owner_first_name
          ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim()
          : null,
        createdAt: row.created_at,
      };
    });

    console.log('[ENTITY-SERVICE] Found expiring vaccinations:', vaccinations.length);

    return createResponse(200, {
      data: vaccinations,
      items: vaccinations, // Compatibility
      total: vaccinations.length,
      daysAhead,
      message: 'Expiring vaccinations retrieved successfully',
    });

  } catch (error) {
    console.error('[ENTITY-SERVICE] Failed to get expiring vaccinations:', {
      message: error.message,
      stack: error.stack,
      tenantId,
    });
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve expiring vaccinations',
    });
  }
}

// =============================================================================
// PET VACCINATION CRUD HANDLERS
// =============================================================================

/**
 * Get all vaccinations for a pet
 *
 * Query params:
 * - status: 'active' | 'archived' | 'expired' | 'all' (default: 'all')
 * - includeHistory: boolean - if true, includes renewal chain info
 */
async function getPetVaccinations(event) {
  const tenantId = resolveTenantId(event);
  const petId = event.pathParameters?.petId || event.pathParameters?.id;
  const queryParams = getQueryParams(event);
  const statusFilter = queryParams.status || 'all';
  const includeHistory = queryParams.includeHistory === 'true';

  console.log('[ENTITY-SERVICE] Getting vaccinations for pet:', petId, 'tenant:', tenantId, 'status:', statusFilter);

  if (!tenantId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Missing tenant context',
    });
  }

  if (!petId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Pet ID is required',
    });
  }

  try {
    await getPoolAsync();

    // Verify pet belongs to tenant
    const petResult = await query(
      `SELECT record_id FROM "Pet" WHERE record_id = $1 AND tenant_id = $2`,
      [petId, tenantId]
    );

    if (petResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Pet not found',
      });
    }

    // Build status filter condition
    let statusCondition = '';
    const params = [petId, tenantId];
    if (statusFilter !== 'all') {
      statusCondition = ` AND v.status = $3`;
      params.push(statusFilter);
    }

    // Vaccination schema columns including renewal system fields
    const result = await query(
      `SELECT
         v.record_id, v.pet_id, v.type, v.administered_at, v.expires_at,
         v.provider, v.lot_number, v.notes, v.document_url,
         v.status, v.renewed_from_id, v.renewed_by_id,
         v.created_at, v.updated_at
       FROM "Vaccination" v
       WHERE v.pet_id = $1 AND v.tenant_id = $2${statusCondition}
       ORDER BY v.status ASC, v.expires_at ASC NULLS LAST, v.administered_at DESC`,
      params
    );

    const vaccinations = result.rows.map(row => ({
      id: row.record_id,
      recordId: row.record_id,
      petId: row.pet_id,
      // Map to camelCase for frontend compatibility
      vaccineName: row.type,
      type: row.type,
      administeredDate: row.administered_at,
      administeredAt: row.administered_at,
      expirationDate: row.expires_at,
      expiresAt: row.expires_at,
      provider: row.provider,
      lotNumber: row.lot_number,
      notes: row.notes,
      documentUrl: row.document_url,
      // Renewal system fields
      status: row.status || 'active',
      renewedFromId: row.renewed_from_id,
      renewedById: row.renewed_by_id,
      // Computed status helpers
      isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false,
      isExpiringSoon: row.expires_at ? (new Date(row.expires_at) - new Date()) / (1000 * 60 * 60 * 24) <= 30 : false,
      isArchived: row.status === 'archived',
      isActive: row.status === 'active' || !row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log('[ENTITY-SERVICE] Found', vaccinations.length, 'vaccinations for pet');

    return createResponse(200, {
      data: vaccinations,
      vaccinations: vaccinations,
      total: vaccinations.length,
      petId: petId,
      statusFilter: statusFilter,
      message: 'Vaccinations retrieved successfully',
    });

  } catch (error) {
    console.error('[ENTITY-SERVICE] Failed to get pet vaccinations:', error.message);

    if (error.code === '42P01') {
      return createResponse(200, {
        data: [],
        vaccinations: [],
        total: 0,
        petId: petId,
        message: 'Vaccinations (table not initialized)',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve vaccinations',
    });
  }
}

/**
 * Create a vaccination record for a pet
 */
async function createPetVaccination(event) {
  const tenantId = resolveTenantId(event);
  const petId = event.pathParameters?.petId || event.pathParameters?.id;
  const body = parseBody(event);

  console.log('[ENTITY-SERVICE] Creating vaccination for pet:', petId);

  if (!tenantId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Missing tenant context',
    });
  }

  if (!petId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Pet ID is required',
    });
  }

  // Actual Vaccination schema: type, administered_at, expires_at, provider, lot_number, notes, document_url
  const {
    vaccineName, type, administeredDate, administeredAt, expirationDate, expiresAt,
    provider, lotNumber, notes, documentUrl
  } = body;

  // Accept either 'type' or 'vaccineName' for the vaccine type
  const vaccineType = type || vaccineName;

  if (!vaccineType) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Vaccine type is required',
    });
  }

  try {
    await getPoolAsync();

    // Verify pet belongs to tenant
    const petResult = await query(
      `SELECT record_id, name FROM "Pet" WHERE record_id = $1 AND tenant_id = $2`,
      [petId, tenantId]
    );

    if (petResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Pet not found',
      });
    }

    // Use correct column names from actual schema
    const vaccinationRecordId = await getNextRecordId(tenantId, 'Vaccination');
    const result = await query(
      `INSERT INTO "Vaccination" (
         tenant_id, record_id, pet_id, type, administered_at, expires_at,
         provider, lot_number, notes, document_url,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        tenantId, vaccinationRecordId, petId, vaccineType,
        administeredAt || administeredDate || null,
        expiresAt || expirationDate || null,
        provider || null, lotNumber || null,
        notes || null, documentUrl || null
      ]
    );

    const row = result.rows[0];

    console.log('[ENTITY-SERVICE] Created vaccination:', row.record_id, 'for pet:', petId);

    return createResponse(201, {
      success: true,
      id: row.record_id,
      type: row.type,
      vaccineName: row.type, // Alias for frontend compatibility
      petId: row.pet_id,
      message: 'Vaccination record created successfully',
    });

  } catch (error) {
    console.error('[ENTITY-SERVICE] Failed to create vaccination:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create vaccination record',
    });
  }
}

/**
 * Update a vaccination record
 */
async function updatePetVaccination(event) {
  const tenantId = resolveTenantId(event);
  const petId = event.pathParameters?.petId || event.pathParameters?.id;
  const vaccinationId = event.pathParameters?.id;
  const body = parseBody(event);

  console.log('[ENTITY-SERVICE] Updating vaccination:', vaccinationId, 'for pet:', petId);

  if (!tenantId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Missing tenant context',
    });
  }

  if (!vaccinationId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Vaccination ID is required',
    });
  }

  // Actual Vaccination schema: type, administered_at, expires_at, provider, lot_number, notes, document_url
  const {
    vaccineName, type, administeredDate, administeredAt, expirationDate, expiresAt,
    provider, lotNumber, notes, documentUrl
  } = body;

  try {
    await getPoolAsync();

    const updates = [];
    const values = [vaccinationId, tenantId];
    let paramIndex = 3;

    // Map incoming fields to actual schema columns
    if (type !== undefined || vaccineName !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type || vaccineName);
    }
    if (administeredAt !== undefined || administeredDate !== undefined) {
      updates.push(`administered_at = $${paramIndex++}`);
      values.push(administeredAt || administeredDate);
    }
    if (expiresAt !== undefined || expirationDate !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(expiresAt || expirationDate);
    }
    if (provider !== undefined) { updates.push(`provider = $${paramIndex++}`); values.push(provider); }
    if (lotNumber !== undefined) { updates.push(`lot_number = $${paramIndex++}`); values.push(lotNumber); }
    if (notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(notes); }
    if (documentUrl !== undefined) { updates.push(`document_url = $${paramIndex++}`); values.push(documentUrl); }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Vaccination"
       SET ${updates.join(', ')}
       WHERE record_id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Vaccination record not found',
      });
    }

    const row = result.rows[0];

    console.log('[ENTITY-SERVICE] Updated vaccination:', row.record_id);

    return createResponse(200, {
      success: true,
      id: row.record_id,
      type: row.type,
      vaccineName: row.type, // Alias for frontend compatibility
      message: 'Vaccination record updated successfully',
    });

  } catch (error) {
    console.error('[ENTITY-SERVICE] Failed to update vaccination:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update vaccination record',
    });
  }
}

/**
 * Delete a vaccination record (soft delete)
 */
async function deletePetVaccination(event) {
  const tenantId = resolveTenantId(event);
  const petId = event.pathParameters?.petId || event.pathParameters?.id;
  const vaccinationId = event.pathParameters?.id;
  const deletedBy = event.user?.userId || null;

  console.log('[ENTITY-SERVICE] Deleting vaccination:', vaccinationId);

  if (!tenantId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Missing tenant context',
    });
  }

  if (!vaccinationId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Vaccination ID is required',
    });
  }

  try {
    // Use softDelete helper - archives to DeletedRecord table then hard deletes
    const result = await softDelete('Vaccination', vaccinationId, tenantId, deletedBy);

    if (!result) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Vaccination record not found',
      });
    }

    console.log('[ENTITY-SERVICE] Deleted vaccination:', vaccinationId);

    return createResponse(200, {
      success: true,
      id: vaccinationId,
      message: 'Vaccination record deleted successfully',
    });

  } catch (error) {
    console.error('[ENTITY-SERVICE] Failed to delete vaccination:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete vaccination record',
    });
  }
}

/**
 * Renew a vaccination record
 *
 * This creates a NEW vaccination record and archives the old one.
 * The renewal chain is maintained via renewed_from_id and renewed_by_id.
 *
 * Required body:
 * - administeredAt: date when the new vaccine was administered
 * - expiresAt: date when the new vaccine expires
 *
 * Optional body:
 * - provider: who administered the vaccine
 * - lotNumber: lot number of the vaccine
 * - notes: any notes about the renewal
 */
async function renewPetVaccination(event) {
  const tenantId = resolveTenantId(event);
  const petId = event.pathParameters?.petId;
  const vaccinationId = event.pathParameters?.id;
  const body = parseBody(event);

  console.log('[ENTITY-SERVICE] Renewing vaccination:', vaccinationId, 'for pet:', petId);

  if (!tenantId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Missing tenant context',
    });
  }

  if (!vaccinationId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Vaccination ID is required',
    });
  }

  const { administeredAt, expiresAt, provider, lotNumber, notes } = body;

  if (!administeredAt) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Administration date is required for renewal',
    });
  }

  if (!expiresAt) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Expiration date is required for renewal',
    });
  }

  try {
    await getPoolAsync();

    // Get next record ID BEFORE transaction (uses different connection)
    const newRecordId = await getNextRecordId(tenantId, 'Vaccination');

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 1. Fetch the existing vaccination record
      const existingResult = await client.query(
        `SELECT * FROM "Vaccination" WHERE record_id = $1 AND tenant_id = $2`,
        [vaccinationId, tenantId]
      );

      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return createResponse(404, {
          error: 'Not Found',
          message: 'Vaccination record not found',
        });
      }

      const existingVaccine = existingResult.rows[0];

      // 2. Check if already archived (can't renew archived records)
      if (existingVaccine.status === 'archived') {
        await client.query('ROLLBACK');
        return createResponse(400, {
          error: 'Bad Request',
          message: 'Cannot renew an archived vaccination record',
        });
      }

      // 3. Create the NEW vaccination record

      const newVaccineResult = await client.query(
        `INSERT INTO "Vaccination" (
           tenant_id, record_id, pet_id, type, administered_at, expires_at,
           provider, lot_number, notes, document_url,
           status, renewed_from_id, renewed_by_id,
           created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, NULL, NOW(), NOW())
         RETURNING *`,
        [
          tenantId,
          newRecordId,
          existingVaccine.pet_id,
          existingVaccine.type, // Same vaccine type
          administeredAt,
          expiresAt,
          provider || existingVaccine.provider, // Use new or inherit
          lotNumber || null,
          notes || null,
          existingVaccine.document_url, // Inherit document
          vaccinationId, // renewed_from_id points to old record
        ]
      );

      const newVaccine = newVaccineResult.rows[0];

      // 4. Archive the OLD vaccination record and link to new one
      await client.query(
        `UPDATE "Vaccination"
         SET status = 'archived',
             renewed_by_id = $3,
             updated_at = NOW()
         WHERE record_id = $1 AND tenant_id = $2`,
        [vaccinationId, tenantId, newRecordId]
      );

      await client.query('COMMIT');

      console.log('[ENTITY-SERVICE] Renewed vaccination:', vaccinationId, '-> new record:', newRecordId);

      return createResponse(201, {
        success: true,
        message: 'Vaccination renewed successfully',
        newVaccination: {
          id: newVaccine.record_id,
          recordId: newVaccine.record_id,
          petId: newVaccine.pet_id,
          type: newVaccine.type,
          administeredAt: newVaccine.administered_at,
          expiresAt: newVaccine.expires_at,
          provider: newVaccine.provider,
          lotNumber: newVaccine.lot_number,
          notes: newVaccine.notes,
          status: 'active',
          renewedFromId: newVaccine.renewed_from_id,
        },
        archivedVaccination: {
          id: vaccinationId,
          recordId: vaccinationId,
          status: 'archived',
          renewedById: newRecordId,
        },
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[ENTITY-SERVICE] Failed to renew vaccination:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to renew vaccination record',
    });
  }
}

// =============================================================================
// BULK ACTION HANDLERS
// =============================================================================

/**
 * Bulk delete pets (soft delete)
 * Body: { ids: string[] }
 */
async function bulkDeletePets(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);
  const { ids } = body;
  const deletedBy = event.user?.userId || null;

  console.log('[Pets][bulkDelete] tenantId:', tenantId, 'count:', ids?.length);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return createResponse(400, { error: 'BadRequest', message: 'ids array is required' });
  }

  if (ids.length > 100) {
    return createResponse(400, { error: 'BadRequest', message: 'Maximum 100 items per bulk operation' });
  }

  try {
    // Use softDeleteBatch helper - archives to DeletedRecord table then hard deletes
    const deletedCount = await softDeleteBatch('Pet', ids, tenantId, deletedBy);

    console.log('[Pets][bulkDelete] deleted:', deletedCount);

    return createResponse(200, {
      success: true,
      deletedCount,
      deletedIds: ids.slice(0, deletedCount), // Best approximation of which were deleted
      message: `${deletedCount} pet(s) deleted successfully`,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] bulkDeletePets error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete pets' });
  }
}

/**
 * Bulk update pets
 * Body: { ids: string[], updates: { status?: string, isActive?: boolean } }
 */
async function bulkUpdatePets(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);
  const { ids, updates } = body;

  console.log('[Pets][bulkUpdate] tenantId:', tenantId, 'count:', ids?.length);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return createResponse(400, { error: 'BadRequest', message: 'ids array is required' });
  }

  if (!updates || typeof updates !== 'object') {
    return createResponse(400, { error: 'BadRequest', message: 'updates object is required' });
  }

  if (ids.length > 100) {
    return createResponse(400, { error: 'BadRequest', message: 'Maximum 100 items per bulk operation' });
  }

  try {
    await getPoolAsync();

    const setClauses = [];
    const values = [ids, tenantId];
    let paramIndex = 3;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.isActive !== undefined || updates.is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive ?? updates.is_active);
    }

    if (setClauses.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No valid updates provided' });
    }

    setClauses.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Pet"
       SET ${setClauses.join(', ')}
       WHERE record_id = ANY($1) AND tenant_id = $2       RETURNING record_id`,
      values
    );

    console.log('[Pets][bulkUpdate] updated:', result.rowCount);

    return createResponse(200, {
      success: true,
      updatedCount: result.rowCount,
      updatedIds: result.rows.map(r => r.record_id),
      message: `${result.rowCount} pet(s) updated successfully`,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] bulkUpdatePets error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update pets' });
  }
}

/**
 * Bulk export pets
 * Body: { ids: string[] } - if empty/missing, exports all
 */
async function bulkExportPets(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);
  const { ids } = body;

  console.log('[Pets][bulkExport] tenantId:', tenantId, 'count:', ids?.length || 'all');

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Schema: Pet has vet_id FK, vet info comes from Veterinarian table
    let queryText = `
      SELECT p.record_id, p.name, p.species, p.breed, p.gender, p.color,
             p.weight, p.date_of_birth, p.microchip_number,
             p.medical_notes, p.behavior_notes, p.dietary_notes,
             p.status, p.is_active, p.vet_id,
             p.created_at, p.updated_at,
             v.clinic_name AS vet_clinic, v.vet_name, v.phone AS vet_phone,
             v.email AS vet_email
      FROM "Pet" p
      LEFT JOIN "Veterinarian" v ON p.vet_id = v.record_id
      WHERE p.tenant_id = $1    `;
    const params = [tenantId];

    if (Array.isArray(ids) && ids.length > 0) {
      queryText += ` AND p.record_id = ANY($2)`;
      params.push(ids);
    }

    queryText += ` ORDER BY p.name`;

    const result = await query(queryText, params);

    console.log('[Pets][bulkExport] exported:', result.rows.length);

    return createResponse(200, {
      success: true,
      exportedCount: result.rows.length,
      data: result.rows,
      exportDate: new Date().toISOString(),
      message: `${result.rows.length} pet(s) exported successfully`,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] bulkExportPets error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to export pets' });
  }
}

/**
 * Bulk delete owners (soft delete)
 * Body: { ids: string[] }
 */
async function bulkDeleteOwners(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);
  const { ids } = body;
  const deletedBy = event.user?.userId || null;

  console.log('[Owners][bulkDelete] tenantId:', tenantId, 'count:', ids?.length);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return createResponse(400, { error: 'BadRequest', message: 'ids array is required' });
  }

  if (ids.length > 100) {
    return createResponse(400, { error: 'BadRequest', message: 'Maximum 100 items per bulk operation' });
  }

  try {
    // Use softDeleteBatch helper - archives to DeletedRecord table then hard deletes
    const deletedCount = await softDeleteBatch('Owner', ids, tenantId, deletedBy);

    console.log('[Owners][bulkDelete] deleted:', deletedCount);

    return createResponse(200, {
      success: true,
      deletedCount,
      deletedIds: ids.slice(0, deletedCount), // Best approximation of which were deleted
      message: `${deletedCount} owner(s) deleted successfully`,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] bulkDeleteOwners error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete owners' });
  }
}

/**
 * Bulk update owners
 * Body: { ids: string[], updates: { isActive?: boolean } }
 */
async function bulkUpdateOwners(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);
  const { ids, updates } = body;

  console.log('[Owners][bulkUpdate] tenantId:', tenantId, 'count:', ids?.length);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return createResponse(400, { error: 'BadRequest', message: 'ids array is required' });
  }

  if (!updates || typeof updates !== 'object') {
    return createResponse(400, { error: 'BadRequest', message: 'updates object is required' });
  }

  if (ids.length > 100) {
    return createResponse(400, { error: 'BadRequest', message: 'Maximum 100 items per bulk operation' });
  }

  try {
    await getPoolAsync();

    const setClauses = [];
    const values = [ids, tenantId];
    let paramIndex = 3;

    if (updates.isActive !== undefined || updates.is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive ?? updates.is_active);
    }

    if (setClauses.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No valid updates provided' });
    }

    setClauses.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Owner"
       SET ${setClauses.join(', ')}
       WHERE record_id = ANY($1) AND tenant_id = $2       RETURNING record_id`,
      values
    );

    console.log('[Owners][bulkUpdate] updated:', result.rowCount);

    return createResponse(200, {
      success: true,
      updatedCount: result.rowCount,
      updatedIds: result.rows.map(r => r.record_id),
      message: `${result.rowCount} owner(s) updated successfully`,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] bulkUpdateOwners error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update owners' });
  }
}

/**
 * Bulk export owners
 * Body: { ids: string[] } - if empty/missing, exports all
 */
async function bulkExportOwners(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);
  const { ids } = body;

  console.log('[Owners][bulkExport] tenantId:', tenantId, 'count:', ids?.length || 'all');

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    let queryText = `
      SELECT o.record_id, o.first_name, o.last_name, o.email, o.phone,
             o.address_street, o.address_city, o.address_state, o.address_zip, o.address_country,
             o.emergency_contact_name, o.emergency_contact_phone, o.notes,
             o.is_active, o.created_at, o.updated_at
      FROM "Owner" o
      WHERE o.tenant_id = $1    `;
    const params = [tenantId];

    if (Array.isArray(ids) && ids.length > 0) {
      queryText += ` AND o.record_id = ANY($2)`;
      params.push(ids);
    }

    queryText += ` ORDER BY o.last_name, o.first_name`;

    const result = await query(queryText, params);

    console.log('[Owners][bulkExport] exported:', result.rows.length);

    return createResponse(200, {
      success: true,
      exportedCount: result.rows.length,
      data: result.rows,
      exportDate: new Date().toISOString(),
      message: `${result.rows.length} owner(s) exported successfully`,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] bulkExportOwners error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to export owners' });
  }
}

/**
 * Bulk delete staff (hard delete since staff can be re-created)
 * Body: { ids: string[] }
 */
async function bulkDeleteStaff(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);
  const { ids } = body;

  console.log('[Staff][bulkDelete] tenantId:', tenantId, 'count:', ids?.length);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return createResponse(400, { error: 'BadRequest', message: 'ids array is required' });
  }

  if (ids.length > 100) {
    return createResponse(400, { error: 'BadRequest', message: 'Maximum 100 items per bulk operation' });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `DELETE FROM "Staff"
       WHERE record_id = ANY($1) AND tenant_id = $2
       RETURNING record_id`,
      [ids, tenantId]
    );

    console.log('[Staff][bulkDelete] deleted:', result.rowCount);

    return createResponse(200, {
      success: true,
      deletedCount: result.rowCount,
      deletedIds: result.rows.map(r => r.record_id),
      message: `${result.rowCount} staff member(s) deleted successfully`,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] bulkDeleteStaff error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete staff' });
  }
}

/**
 * Bulk update staff
 * Body: { ids: string[], updates: { isActive?: boolean, department?: string } }
 */
async function bulkUpdateStaff(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);
  const { ids, updates } = body;

  console.log('[Staff][bulkUpdate] tenantId:', tenantId, 'count:', ids?.length);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return createResponse(400, { error: 'BadRequest', message: 'ids array is required' });
  }

  if (!updates || typeof updates !== 'object') {
    return createResponse(400, { error: 'BadRequest', message: 'updates object is required' });
  }

  if (ids.length > 100) {
    return createResponse(400, { error: 'BadRequest', message: 'Maximum 100 items per bulk operation' });
  }

  try {
    await getPoolAsync();

    const setClauses = [];
    const values = [ids, tenantId];
    let paramIndex = 3;

    if (updates.isActive !== undefined || updates.is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive ?? updates.is_active);
    }
    if (updates.department !== undefined) {
      setClauses.push(`department = $${paramIndex++}`);
      values.push(updates.department);
    }

    if (setClauses.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No valid updates provided' });
    }

    setClauses.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Staff"
       SET ${setClauses.join(', ')}
       WHERE record_id = ANY($1) AND tenant_id = $2
       RETURNING record_id`,
      values
    );

    console.log('[Staff][bulkUpdate] updated:', result.rowCount);

    return createResponse(200, {
      success: true,
      updatedCount: result.rowCount,
      updatedIds: result.rows.map(r => r.record_id),
      message: `${result.rowCount} staff member(s) updated successfully`,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] bulkUpdateStaff error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update staff' });
  }
}

// ============================================================================
// ACTIVITY HANDLERS
// ============================================================================

/**
 * Get activities for an entity
 * Query params: entity_type, entity_id, activity_type (optional filter), page, limit
 */
async function getActivities(event) {
  const tenantId = resolveTenantId(event);
  const queryParams = getQueryParams(event);
  const entityType = queryParams.entity_type || queryParams.entityType;
  const entityId = queryParams.entity_id || queryParams.entityId;
  const activityType = queryParams.activity_type || queryParams.activityType;
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = Math.min(parseInt(queryParams.limit, 10) || 50, 200);
  const offset = (page - 1) * limit;

  console.log('[ENTITY-SERVICE] Getting activities for tenant:', tenantId, 'entity:', entityType, entityId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  if (!entityType || !entityId) {
    return createResponse(400, { error: 'BadRequest', message: 'entity_type and entity_id are required' });
  }

  try {
    await getPoolAsync();

    // Build WHERE clause using entity_id (BIGINT record_id)
    let whereClause = 'a.tenant_id = $1 AND a.entity_type = $2 AND a.entity_id = $3';
    const params = [tenantId, entityType, entityId];
    let paramIndex = 4;

    if (activityType) {
      whereClause += ` AND a.activity_type = $${paramIndex}`;
      params.push(activityType);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM "Activity" a WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / limit);

    // Get activities with creator info
    const result = await query(
      `SELECT a.record_id, a.tenant_id, a.entity_type, a.entity_id,
              a.activity_type, a.subject, a.content,
              a.call_duration_seconds, a.call_direction, a.call_outcome,
              a.recipient, a.is_pinned,
              a.created_by, a.created_at, a.updated_at,
              u.first_name as creator_first_name, u.last_name as creator_last_name,
              u.email as creator_email
       FROM "Activity" a
       LEFT JOIN "User" u ON a.created_by = u.record_id
       WHERE ${whereClause}
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Transform rows
    const activities = result.rows.map(row => ({
      id: row.record_id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      activityType: row.activity_type,
      subject: row.subject,
      content: row.content,
      callDurationSeconds: row.call_duration_seconds,
      callDirection: row.call_direction,
      callOutcome: row.call_outcome,
      recipient: row.recipient,
      isPinned: row.is_pinned,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      creator: row.creator_first_name ? {
        firstName: row.creator_first_name,
        lastName: row.creator_last_name,
        email: row.creator_email,
        name: `${row.creator_first_name || ''} ${row.creator_last_name || ''}`.trim()
      } : null
    }));

    return createResponse(200, {
      data: activities,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getActivities error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to get activities' });
  }
}

/**
 * Get a single activity by ID
 */
async function getActivity(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();

  console.log('[ENTITY-SERVICE] Getting activity:', id, 'for tenant:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT a.record_id, a.tenant_id, a.entity_type, a.entity_id,
              a.activity_type, a.subject, a.content,
              a.call_duration_seconds, a.call_direction, a.call_outcome,
              a.recipient, a.is_pinned,
              a.created_by, a.created_at, a.updated_at,
              u.first_name as creator_first_name, u.last_name as creator_last_name,
              u.email as creator_email
       FROM "Activity" a
       LEFT JOIN "User" u ON u.tenant_id = a.tenant_id AND u.record_id = a.created_by
       WHERE a.record_id = $1 AND a.tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Activity not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.record_id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      activityType: row.activity_type,
      subject: row.subject,
      content: row.content,
      callDurationSeconds: row.call_duration_seconds,
      callDirection: row.call_direction,
      callOutcome: row.call_outcome,
      recipient: row.recipient,
      isPinned: row.is_pinned,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      creator: row.creator_first_name ? {
        firstName: row.creator_first_name,
        lastName: row.creator_last_name,
        email: row.creator_email,
        name: `${row.creator_first_name || ''} ${row.creator_last_name || ''}`.trim()
      } : null
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getActivity error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to get activity' });
  }
}

/**
 * Create a new activity
 */
async function createActivity(event) {
  const tenantId = resolveTenantId(event);
  const body = parseBody(event);
  // Use the database User ID (userId/recordId), not event.user.id which is Cognito sub
  const userId = event.user?.userId || event.user?.recordId;

  console.log('[ENTITY-SERVICE] Creating activity for tenant:', tenantId, 'userId:', userId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  // Validate required fields
  const entityType = body.entityType || body.entity_type;
  const entityId = body.entityId || body.entity_id;
  const activityType = body.activityType || body.activity_type;

  if (!entityType || !entityId) {
    return createResponse(400, { error: 'BadRequest', message: 'entity_type and entity_id are required' });
  }

  if (!activityType) {
    return createResponse(400, { error: 'BadRequest', message: 'activity_type is required' });
  }

  const validActivityTypes = ['note', 'call', 'email', 'sms', 'system'];
  if (!validActivityTypes.includes(activityType)) {
    return createResponse(400, { error: 'BadRequest', message: `activity_type must be one of: ${validActivityTypes.join(', ')}` });
  }

  const validEntityTypes = ['owner', 'pet', 'booking', 'invoice'];
  if (!validEntityTypes.includes(entityType)) {
    return createResponse(400, { error: 'BadRequest', message: `entity_type must be one of: ${validEntityTypes.join(', ')}` });
  }

  try {
    await getPoolAsync();

    // entity_id is now BIGINT, use record_id directly
    const activityRecordId = await getNextRecordId(tenantId, 'Activity');
    const result = await query(
      `INSERT INTO "Activity" (
        tenant_id, record_id, entity_type, entity_id, activity_type,
        subject, content,
        call_duration_seconds, call_direction, call_outcome,
        recipient, is_pinned, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        tenantId,
        activityRecordId,
        entityType,
        entityId,
        activityType,
        body.subject || null,
        body.content || null,
        body.callDurationSeconds || body.call_duration_seconds || null,
        body.callDirection || body.call_direction || null,
        body.callOutcome || body.call_outcome || null,
        body.recipient || null,
        body.isPinned || body.is_pinned || false,
        userId || null
      ]
    );

    const row = result.rows[0];
    return createResponse(201, {
      id: row.record_id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      activityType: row.activity_type,
      subject: row.subject,
      content: row.content,
      callDurationSeconds: row.call_duration_seconds,
      callDirection: row.call_direction,
      callOutcome: row.call_outcome,
      recipient: row.recipient,
      isPinned: row.is_pinned,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] createActivity error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to create activity' });
  }
}

/**
 * Update an activity
 */
async function updateActivity(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const body = parseBody(event);

  console.log('[ENTITY-SERVICE] Updating activity:', id, 'for tenant:', tenantId, body);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Build SET clause dynamically
    const updates = [];
    const params = [id, tenantId];
    let paramIndex = 3;

    const fieldMappings = {
      subject: 'subject',
      content: 'content',
      callDurationSeconds: 'call_duration_seconds',
      call_duration_seconds: 'call_duration_seconds',
      callDirection: 'call_direction',
      call_direction: 'call_direction',
      callOutcome: 'call_outcome',
      call_outcome: 'call_outcome',
      recipient: 'recipient',
      isPinned: 'is_pinned',
      is_pinned: 'is_pinned'
    };

    for (const [bodyKey, dbColumn] of Object.entries(fieldMappings)) {
      if (body[bodyKey] !== undefined) {
        updates.push(`${dbColumn} = $${paramIndex}`);
        params.push(body[bodyKey]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No fields to update' });
    }

    const result = await query(
      `UPDATE "Activity" SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Activity not found' });
    }

    const row = result.rows[0];
    return createResponse(200, {
      id: row.record_id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      activityType: row.activity_type,
      subject: row.subject,
      content: row.content,
      callDurationSeconds: row.call_duration_seconds,
      callDirection: row.call_direction,
      callOutcome: row.call_outcome,
      recipient: row.recipient,
      isPinned: row.is_pinned,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] updateActivity error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update activity' });
  }
}

/**
 * Delete an activity
 */
async function deleteActivity(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();

  console.log('[ENTITY-SERVICE] Deleting activity:', id, 'for tenant:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `DELETE FROM "Activity" WHERE record_id = $1 AND tenant_id = $2 RETURNING record_id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Activity not found' });
    }

    return createResponse(200, { success: true, id: result.rows[0].record_id });
  } catch (error) {
    console.error('[ENTITY-SERVICE] deleteActivity error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete activity' });
  }
}
