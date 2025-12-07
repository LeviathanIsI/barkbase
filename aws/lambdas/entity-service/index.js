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

const { getPoolAsync, query, softDelete, softDeleteBatch } = dbLayer;
const { createResponse, authenticateRequest, parseBody, getQueryParams, getPathParams } = sharedLayer;

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
 * 1. JWT claims (authorizer) - most trusted source
 * 2. event.user.tenantId (from authenticateRequest)
 * 3. X-Tenant-Id header - only if matches JWT or no JWT available
 *
 * @param {object} event - Lambda event
 * @returns {string|null} - Resolved tenant ID or null if validation fails
 */
function resolveTenantId(event) {
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
  'GET /api/v1/entity/pets/{id}/vaccinations': getPetVaccinations,
  'POST /api/v1/entity/pets/{id}/vaccinations': createPetVaccination,
  'PUT /api/v1/entity/pets/{petId}/vaccinations/{id}': updatePetVaccination,
  'DELETE /api/v1/entity/pets/{petId}/vaccinations/{id}': deletePetVaccination,

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
};

exports.handler = async (event, context) => {
  // Handle admin path rewriting (Ops Center requests)
  const { handleAdminPathRewrite } = require('/opt/nodejs/index');
  handleAdminPathRewrite(event);

  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';

  console.log('[ENTITY-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  try {
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

    // Find and replace UUIDs with placeholders
    // For nested resources like pets/{id}/vaccinations/{id}
    let foundFirstId = false;
    const normalizedSegments = pathSegments.map((segment, idx) => {
      if (uuidPattern.test(segment)) {
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

    // Also try simple replacement for backward compatibility
    const simpleRouteKey = `${method} ${path.replace(/\/[a-f0-9-]{36}$/i, '/{id}')}`;

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

    console.log('[ENTITY-SERVICE] Created tenant:', result.rows[0].id);
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
  const deletedBy = event.user?.id || null;

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
      `SELECT k.id, k.tenant_id, k.name, k.size, k.location, k.max_occupancy,
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
       ) occ ON k.id = occ.kennel_id
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
    // Schema: id, tenant_id, name, size, location, max_occupancy, is_active, created_at, updated_at
    const result = await query(
      `SELECT id, tenant_id, name, size, location, max_occupancy,
              is_active, created_at, updated_at
       FROM "Kennel"
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Facility not found' });
    }
    return createResponse(200, result.rows[0]);
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
    // Schema: id, tenant_id, name, size, location, max_occupancy, is_active, created_at, updated_at
    // size must be: SMALL, MEDIUM, LARGE, XLARGE or null
    const result = await query(
      `INSERT INTO "Kennel" (tenant_id, name, size, location, max_occupancy, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tenantId,
        body.name,
        body.size || null, // SMALL, MEDIUM, LARGE, XLARGE
        body.location || null,
        body.maxOccupancy || body.max_occupancy || body.capacity || 1,
        body.isActive !== false
      ]
    );

    console.log('[Facilities][create] created:', result.rows[0].id);
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
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
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
  const deletedBy = event.user?.id || null;

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
      joinClause = 'INNER JOIN "PetOwner" po ON po.pet_id = p.id';
      whereClause += ` AND po.owner_id = $${paramIndex}`;
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
      `SELECT COUNT(DISTINCT p.id) as total FROM "Pet" p ${joinClause} WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / limit);

    // Schema: id, tenant_id, vet_id (FK), name, species, breed, gender, color, weight,
    //         date_of_birth, microchip_number, photo_url, medical_notes, dietary_notes,
    //         behavior_notes, behavior_flags, status, is_active, created_at, updated_at
    // Vet info comes from Veterinarian table via vet_id FK
    const result = await query(
      `SELECT DISTINCT p.id, p.tenant_id, p.name, p.species, p.breed, p.gender, p.color,
              p.weight, p.date_of_birth, p.microchip_number,
              p.medical_notes, p.behavior_notes, p.dietary_notes,
              p.behavior_flags, p.status, p.photo_url, p.is_active,
              p.vet_id, p.created_at, p.updated_at,
              v.clinic_name AS vet_clinic, v.vet_name, v.phone AS vet_phone,
              v.email AS vet_email, v.notes AS vet_notes,
              v.address_street AS vet_address_street, v.address_city AS vet_address_city,
              v.address_state AS vet_address_state, v.address_zip AS vet_address_zip
       FROM "Pet" p
       LEFT JOIN "Veterinarian" v ON p.vet_id = v.id
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
      `SELECT p.id, p.tenant_id, p.name, p.species, p.breed, p.gender, p.color,
              p.weight, p.date_of_birth, p.microchip_number,
              p.medical_notes, p.behavior_notes, p.dietary_notes,
              p.behavior_flags, p.status, p.photo_url, p.is_active,
              p.vet_id, p.created_at, p.updated_at, p.created_by, p.updated_by,
              v.clinic_name AS vet_clinic, v.vet_name, v.phone AS vet_phone,
              v.email AS vet_email, v.notes AS vet_notes,
              v.address_street AS vet_address_street, v.address_city AS vet_address_city,
              v.address_state AS vet_address_state, v.address_zip AS vet_address_zip
       FROM "Pet" p
       LEFT JOIN "Veterinarian" v ON p.vet_id = v.id
       WHERE p.id = $1 AND p.tenant_id = $2`,
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
          `SELECT id FROM "Veterinarian"
           WHERE tenant_id = $1 AND (clinic_name = $2 OR vet_name = $3)
           LIMIT 1`,
          [tenantId, vetClinic, vetName]
        );

        if (existingVet.rows.length > 0) {
          vetId = existingVet.rows[0].id;
        } else {
          // Create new Veterinarian record
          const newVet = await query(
            `INSERT INTO "Veterinarian" (tenant_id, clinic_name, vet_name, phone, email, is_active)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING id`,
            [tenantId, vetClinic, vetName, vetPhone, vetEmail]
          );
          vetId = newVet.rows[0].id;
        }
      }
    }

    // Schema: Pet table has vet_id FK, NOT embedded vet fields
    const result = await query(
      `INSERT INTO "Pet" (tenant_id, name, species, breed, gender, color, weight, date_of_birth,
                         microchip_number, medical_notes, behavior_notes, dietary_notes,
                         status, photo_url, is_active, vet_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        tenantId,
        body.name,
        body.species || 'Dog',
        body.breed || null,
        body.gender || null,
        body.color || null,
        body.weight || null,
        body.dateOfBirth || body.date_of_birth || null,
        body.microchipNumber || body.microchip_number || null,
        body.medicalNotes || body.medical_notes || null,
        body.behaviorNotes || body.behavior_notes || null,
        body.dietaryNotes || body.dietary_notes || null,
        body.status || 'ACTIVE',
        body.photoUrl || body.photo_url || null,
        body.isActive !== false,
        vetId,
        event.user?.id || null
      ]
    );

    const petId = result.rows[0].id;

    // If ownerId is provided, create PetOwner relationship
    if (body.ownerId || body.owner_id) {
      const ownerId = body.ownerId || body.owner_id;
      await query(
        `INSERT INTO "PetOwner" (tenant_id, pet_id, owner_id, is_primary, relationship)
         VALUES ($1, $2, $3, true, 'owner')
         ON CONFLICT (pet_id, owner_id) DO NOTHING`,
        [tenantId, petId, ownerId]
      );
    }

    console.log('[ENTITY-SERVICE] Created pet:', petId);
    return createResponse(201, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] createPet error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to create pet' });
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
    if (body.weight !== undefined) { updates.push(`weight = $${paramIndex++}`); values.push(body.weight); }
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
          `SELECT id FROM "Veterinarian"
           WHERE tenant_id = $1 AND (clinic_name = $2 OR vet_name = $3)
           LIMIT 1`,
          [tenantId, vetClinic, vetName]
        );

        let vetId;
        if (existingVet.rows.length > 0) {
          vetId = existingVet.rows[0].id;
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
          const newVet = await query(
            `INSERT INTO "Veterinarian" (tenant_id, clinic_name, vet_name, phone, email, is_active)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING id`,
            [tenantId, vetClinic, vetName, vetPhone, vetEmail]
          );
          vetId = newVet.rows[0].id;
        }
        updates.push(`vet_id = $${paramIndex++}`);
        values.push(vetId);
      }
    }

    // Add updated_by
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(event.user?.id || null);

    if (updates.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No fields to update' });
    }

    values.push(id, tenantId);

    const result = await query(
      `UPDATE "Pet" SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Pet not found' });
    }

    console.log('[ENTITY-SERVICE] Updated pet:', id);
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
  const deletedBy = event.user?.id || null;

  console.log('[Pets][delete] id:', id, 'tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    // Use softDelete helper - archives to DeletedRecord table then hard deletes
    const result = await softDelete('Pet', id, tenantId, deletedBy);

    if (!result) {
      return createResponse(404, { error: 'NotFound', message: 'Pet not found' });
    }

    console.log('[ENTITY-SERVICE] Deleted pet:', id);
    return createResponse(204, '');
  } catch (error) {
    console.error('[ENTITY-SERVICE] deletePet error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete pet' });
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

  // Diagnostic logging
  console.log('[Owners][list] tenantId:', tenantId, 'page:', page, 'limit:', limit);
  console.log('[Owners][list] env DB_HOST:', process.env.DB_HOST);
  console.log('[Owners][list] env DB_NAME:', process.env.DB_NAME || process.env.DB_DATABASE);
  console.log('[ENTITY-SERVICE] Getting owners for tenant:', tenantId);

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
    const result = await query(
      `SELECT o.id, o.tenant_id, o.first_name, o.last_name, o.email, o.phone,
              o.address_street, o.address_city, o.address_state,
              o.address_zip, o.address_country,
              o.emergency_contact_name, o.emergency_contact_phone, o.notes,
              o.tags, o.stripe_customer_id,
              o.is_active, o.created_at, o.updated_at, o.created_by, o.updated_by
       FROM "Owner" o
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
      `SELECT o.id, o.tenant_id, o.first_name, o.last_name, o.email, o.phone,
              o.address_street, o.address_city, o.address_state,
              o.address_zip, o.address_country,
              o.emergency_contact_name, o.emergency_contact_phone, o.notes,
              o.tags, o.stripe_customer_id,
              o.is_active, o.created_at, o.updated_at, o.created_by, o.updated_by
       FROM "Owner" o
       WHERE o.id = $1 AND o.tenant_id = $2`,
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

  try {
    await getPoolAsync();
    // Schema: Owner has tags (TEXT[]), stripe_customer_id, created_by, updated_by
    const result = await query(
      `INSERT INTO "Owner" (tenant_id, first_name, last_name, email, phone,
                           address_street, address_city, address_state, address_zip, address_country,
                           emergency_contact_name, emergency_contact_phone, notes, tags, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        tenantId,
        body.firstName || body.first_name || null,
        body.lastName || body.last_name || null,
        body.email || null,
        body.phone || null,
        body.addressStreet || body.address_street || body.address || null,
        body.addressCity || body.address_city || body.city || null,
        body.addressState || body.address_state || body.state || null,
        body.addressZip || body.address_zip || body.zipCode || body.zip_code || null,
        body.addressCountry || body.address_country || body.country || 'US',
        body.emergencyContactName || body.emergency_contact_name || null,
        body.emergencyContactPhone || body.emergency_contact_phone || null,
        body.notes || null,
        body.tags || [],
        body.isActive !== false,
        event.user?.id || null
      ]
    );

    console.log('[ENTITY-SERVICE] Created owner:', result.rows[0].id);
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
    values.push(event.user?.id || null);

    if (updates.length === 0) {
      return createResponse(400, { error: 'BadRequest', message: 'No fields to update' });
    }

    values.push(id, tenantId);

    const result = await query(
      `UPDATE "Owner" SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Owner not found' });
    }

    console.log('[ENTITY-SERVICE] Updated owner:', id);
    return createResponse(200, { data: result.rows[0] });
  } catch (error) {
    console.error('[ENTITY-SERVICE] updateOwner error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update owner' });
  }
}

async function deleteOwner(event) {
  const tenantId = resolveTenantId(event);
  const pathParams = getPathParams(event);
  const id = pathParams.id || event.path?.split('/').pop();
  const deletedBy = event.user?.id || null;

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
      `SELECT * FROM "Owner" WHERE id = $1 AND tenant_id = $2`,
      [ownerId, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Owner not found' });
    }

    const owner = ownerResult.rows[0];

    // Get all pets via PetOwner junction table (Pet has NO owner_id column)
    const petsResult = await query(
      `SELECT p.* FROM "Pet" p
       JOIN "PetOwner" po ON p.id = po.pet_id
       WHERE po.owner_id = $1 AND p.tenant_id = $2`,
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
    const petIds = petsResult.rows.map(p => p.id);
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
         LEFT JOIN "Policy" p ON pa.policy_id = p.id
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
  const deletedBy = event.user?.id || null;

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
      `SELECT id, first_name, last_name FROM "Owner" WHERE id = $1 AND tenant_id = $2`,
      [ownerId, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Owner not found' });
    }

    const owner = ownerResult.rows[0];

    // Get all pet IDs for this owner via PetOwner junction table
    const petsResult = await query(
      `SELECT p.id FROM "Pet" p
       JOIN "PetOwner" po ON p.id = po.pet_id
       WHERE po.owner_id = $1 AND p.tenant_id = $2`,
      [ownerId, tenantId]
    );
    const petIds = petsResult.rows.map(p => p.id);

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
          `SELECT id FROM "Vaccination" WHERE pet_id = ANY($1) AND tenant_id = $2`,
          [petIds, tenantId]
        );
        const vacIds = vacResult.rows.map(v => v.id);
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
        `SELECT id FROM "Communication" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const commIds = commResult.rows.map(c => c.id);
      if (commIds.length > 0) {
        deletionSummary.communications = await softDeleteBatch('Communication', commIds, tenantId, deletedBy);
      }
    } catch (e) {
      console.log('[ENTITY-SERVICE] Communication delete skipped:', e.message);
    }

    // Delete policy agreements
    try {
      const paResult = await query(
        `SELECT id FROM "PolicyAgreement" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const paIds = paResult.rows.map(p => p.id);
      if (paIds.length > 0) {
        deletionSummary.policyAgreements = await softDeleteBatch('PolicyAgreement', paIds, tenantId, deletedBy);
      }
    } catch (e) {
      console.log('[ENTITY-SERVICE] PolicyAgreement delete skipped:', e.message);
    }

    // Delete payments
    try {
      const payResult = await query(
        `SELECT id FROM "Payment" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const payIds = payResult.rows.map(p => p.id);
      if (payIds.length > 0) {
        deletionSummary.payments = await softDeleteBatch('Payment', payIds, tenantId, deletedBy);
      }
    } catch (e) {
      console.log('[ENTITY-SERVICE] Payment delete skipped:', e.message);
    }

    // Delete invoices
    try {
      const invResult = await query(
        `SELECT id FROM "Invoice" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const invIds = invResult.rows.map(i => i.id);
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
        `SELECT id FROM "Booking" WHERE owner_id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      const bookIds = bookResult.rows.map(b => b.id);
      if (bookIds.length > 0) {
        deletionSummary.bookings = await softDeleteBatch('Booking', bookIds, tenantId, deletedBy);
      }
    } catch (e) {
      console.log('[ENTITY-SERVICE] Booking delete skipped:', e.message);
    }

    // Delete PetOwner relationships (hard delete junction table - no archive needed)
    try {
      await query(
        `DELETE FROM "PetOwner" WHERE owner_id = $1`,
        [ownerId]
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
      `SELECT u.id, u.tenant_id, u.id as user_id,
              u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              u.is_active, u.created_at, u.updated_at,
              COALESCE(r.name, 'user') AS role,
              r.name as title
       FROM "User" u
       LEFT JOIN "UserRole" ur ON u.id = ur.user_id
       LEFT JOIN "Role" r ON ur.role_id = r.id
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
      `SELECT u.id, u.tenant_id, u.id as user_id,
              u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
              u.is_active, u.created_at, u.updated_at,
              COALESCE(r.name, 'user') AS role,
              r.name as title
       FROM "User" u
       LEFT JOIN "UserRole" ur ON u.id = ur.user_id
       LEFT JOIN "Role" r ON ur.role_id = r.id
       WHERE u.id = $1 AND u.tenant_id = $2`,
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
      `SELECT id FROM "User" WHERE id = $1 AND tenant_id = $2`,
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

    const result = await query(
      `INSERT INTO "Staff" (tenant_id, user_id, title, department, hire_date, is_active, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        tenantId,
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
       LEFT JOIN "User" u ON s.user_id = u.id
       WHERE s.id = $1`,
      [result.rows[0].id]
    );

    console.log('[ENTITY-SERVICE] Created staff member:', result.rows[0].id);
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
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
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
       LEFT JOIN "User" u ON s.user_id = u.id
       WHERE s.id = $1`,
      [result.rows[0].id]
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
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
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

    // Get vaccinations expiring within daysAhead days
    // Also include recently expired (within 7 days past) to show overdue
    const result = await query(
      `SELECT
         v.id,
         v.pet_id,
         v.type,
         v.administered_at,
         v.expires_at,
         v.provider,
         v.notes,
         v.created_at,
         p.name as pet_name,
         p.species as pet_species,
         p.breed as pet_breed,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone
       FROM "Vaccination" v
       JOIN "Pet" p ON v.pet_id = p.id
       LEFT JOIN "PetOwner" po ON p.id = po.pet_id AND po.is_primary = true
       LEFT JOIN "Owner" o ON po.owner_id = o.id
       WHERE v.tenant_id = $1
                 AND v.expires_at IS NOT NULL
         AND v.expires_at >= CURRENT_DATE - INTERVAL '7 days'
         AND v.expires_at <= CURRENT_DATE + INTERVAL '1 day' * $2
       ORDER BY v.expires_at ASC`,
      [tenantId, daysAhead]
    );

    const vaccinations = result.rows.map(row => {
      // Determine status based on expiry
      const expiresAt = new Date(row.expires_at);
      const now = new Date();
      let status = 'valid';
      if (expiresAt < now) {
        status = 'expired';
      } else if (expiresAt <= new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)) {
        status = 'expiring_soon';
      }

      return {
        id: row.id,
        recordId: row.id, // Alias for frontend compatibility
        petId: row.pet_id,
        petName: row.pet_name,
        petSpecies: row.pet_species,
        petBreed: row.pet_breed,
        type: row.type,
        administeredAt: row.administered_at,
        expiresAt: row.expires_at,
        provider: row.provider,
        notes: row.notes,
        status,
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
 */
async function getPetVaccinations(event) {
  const tenantId = resolveTenantId(event);
  const petId = event.pathParameters?.id;

  console.log('[ENTITY-SERVICE] Getting vaccinations for pet:', petId, 'tenant:', tenantId);

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
      `SELECT id FROM "Pet" WHERE id = $1 AND tenant_id = $2`,
      [petId, tenantId]
    );

    if (petResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Pet not found',
      });
    }

    // Actual Vaccination schema columns:
    // id, tenant_id, pet_id, type, administered_at, expires_at, provider, lot_number, notes, document_url, created_at, updated_at
    const result = await query(
      `SELECT
         v.id, v.pet_id, v.type, v.administered_at, v.expires_at,
         v.provider, v.lot_number, v.notes, v.document_url,
         v.created_at, v.updated_at
       FROM "Vaccination" v
       WHERE v.pet_id = $1 AND v.tenant_id = $2       ORDER BY v.expires_at ASC NULLS LAST, v.administered_at DESC`,
      [petId, tenantId]
    );

    const vaccinations = result.rows.map(row => ({
      id: row.id,
      petId: row.pet_id,
      // Map to camelCase for frontend compatibility
      vaccineName: row.type, // Schema uses 'type' column
      type: row.type,
      administeredDate: row.administered_at,
      administeredAt: row.administered_at,
      expirationDate: row.expires_at,
      expiresAt: row.expires_at,
      provider: row.provider,
      lotNumber: row.lot_number,
      notes: row.notes,
      documentUrl: row.document_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false,
      isExpiringSoon: row.expires_at ? (new Date(row.expires_at) - new Date()) / (1000 * 60 * 60 * 24) <= 30 : false,
    }));

    console.log('[ENTITY-SERVICE] Found', vaccinations.length, 'vaccinations for pet');

    return createResponse(200, {
      data: vaccinations,
      vaccinations: vaccinations,
      total: vaccinations.length,
      petId: petId,
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
  const petId = event.pathParameters?.id;
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
      `SELECT id, name FROM "Pet" WHERE id = $1 AND tenant_id = $2`,
      [petId, tenantId]
    );

    if (petResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Pet not found',
      });
    }

    // Use correct column names from actual schema
    const result = await query(
      `INSERT INTO "Vaccination" (
         tenant_id, pet_id, type, administered_at, expires_at,
         provider, lot_number, notes, document_url,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        tenantId, petId, vaccineType,
        administeredAt || administeredDate || null,
        expiresAt || expirationDate || null,
        provider || null, lotNumber || null,
        notes || null, documentUrl || null
      ]
    );

    const row = result.rows[0];

    console.log('[ENTITY-SERVICE] Created vaccination:', row.id, 'for pet:', petId);

    return createResponse(201, {
      success: true,
      id: row.id,
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
  const petId = event.pathParameters?.petId;
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
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Vaccination record not found',
      });
    }

    const row = result.rows[0];

    console.log('[ENTITY-SERVICE] Updated vaccination:', row.id);

    return createResponse(200, {
      success: true,
      id: row.id,
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
  const petId = event.pathParameters?.petId;
  const vaccinationId = event.pathParameters?.id;
  const deletedBy = event.user?.id || null;

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
  const deletedBy = event.user?.id || null;

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
       WHERE id = ANY($1) AND tenant_id = $2       RETURNING id`,
      values
    );

    console.log('[Pets][bulkUpdate] updated:', result.rowCount);

    return createResponse(200, {
      success: true,
      updatedCount: result.rowCount,
      updatedIds: result.rows.map(r => r.id),
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
      SELECT p.id, p.name, p.species, p.breed, p.gender, p.color,
             p.weight, p.date_of_birth, p.microchip_number,
             p.medical_notes, p.behavior_notes, p.dietary_notes,
             p.status, p.is_active, p.vet_id,
             p.created_at, p.updated_at,
             v.clinic_name AS vet_clinic, v.vet_name, v.phone AS vet_phone,
             v.email AS vet_email
      FROM "Pet" p
      LEFT JOIN "Veterinarian" v ON p.vet_id = v.id
      WHERE p.tenant_id = $1    `;
    const params = [tenantId];

    if (Array.isArray(ids) && ids.length > 0) {
      queryText += ` AND p.id = ANY($2)`;
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
  const deletedBy = event.user?.id || null;

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
       WHERE id = ANY($1) AND tenant_id = $2       RETURNING id`,
      values
    );

    console.log('[Owners][bulkUpdate] updated:', result.rowCount);

    return createResponse(200, {
      success: true,
      updatedCount: result.rowCount,
      updatedIds: result.rows.map(r => r.id),
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
      SELECT o.id, o.first_name, o.last_name, o.email, o.phone,
             o.address_street, o.address_city, o.address_state, o.address_zip, o.address_country,
             o.emergency_contact_name, o.emergency_contact_phone, o.notes,
             o.is_active, o.created_at, o.updated_at
      FROM "Owner" o
      WHERE o.tenant_id = $1    `;
    const params = [tenantId];

    if (Array.isArray(ids) && ids.length > 0) {
      queryText += ` AND o.id = ANY($2)`;
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
       WHERE id = ANY($1) AND tenant_id = $2
       RETURNING id`,
      [ids, tenantId]
    );

    console.log('[Staff][bulkDelete] deleted:', result.rowCount);

    return createResponse(200, {
      success: true,
      deletedCount: result.rowCount,
      deletedIds: result.rows.map(r => r.id),
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
       WHERE id = ANY($1) AND tenant_id = $2
       RETURNING id`,
      values
    );

    console.log('[Staff][bulkUpdate] updated:', result.rowCount);

    return createResponse(200, {
      success: true,
      updatedCount: result.rowCount,
      updatedIds: result.rows.map(r => r.id),
      message: `${result.rowCount} staff member(s) updated successfully`,
    });
  } catch (error) {
    console.error('[ENTITY-SERVICE] bulkUpdateStaff error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to update staff' });
  }
}
