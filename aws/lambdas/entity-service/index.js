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

const { getPoolAsync, query } = dbLayer;
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
 * Resolve tenant ID with fallback precedence:
 * 1. X-Tenant-Id header (case-insensitive)
 * 2. event.user.tenantId (from authenticateRequest)
 * 3. Authorizer claims
 * @param {object} event - Lambda event
 * @returns {string|null} - Resolved tenant ID or null
 */
function resolveTenantId(event) {
  // 1. Check headers first (case-insensitive)
  const headers = event.headers || {};
  const tenantFromHeader =
    headers['x-tenant-id'] ||
    headers['X-Tenant-Id'] ||
    headers['x-Tenant-Id'] ||
    headers['X-TENANT-ID'];

  if (tenantFromHeader) {
    console.log('[ENTITY-SERVICE] Resolved tenantId from header:', tenantFromHeader);
    return tenantFromHeader;
  }

  // 2. Check event.user (set by authenticateRequest)
  if (event.user?.tenantId) {
    console.log('[ENTITY-SERVICE] Resolved tenantId from event.user:', event.user.tenantId);
    return event.user.tenantId;
  }

  // 3. Check authorizer claims
  const authorizerTenantId =
    event.requestContext?.authorizer?.tenantId ||
    event.requestContext?.authorizer?.claims?.['custom:tenant_id'];

  if (authorizerTenantId) {
    console.log('[ENTITY-SERVICE] Resolved tenantId from authorizer:', authorizerTenantId);
    return authorizerTenantId;
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

  // Staff
  'GET /api/v1/entity/staff': getStaff,
  'GET /api/v1/entity/staff/{id}': getStaffMember,
  'POST /api/v1/entity/staff': createStaffMember,
  'PUT /api/v1/entity/staff/{id}': updateStaffMember,
  'DELETE /api/v1/entity/staff/{id}': deleteStaffMember,
};

exports.handler = async (event, context) => {
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
       FROM "Tenant" WHERE id = $1 AND deleted_at IS NULL`,
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
  console.log('[Tenants][get] id:', id);

  try {
    await getPoolAsync();
    const result = await query(
      `SELECT id, name, slug, plan, feature_flags, theme, terminology, settings,
              storage_provider, db_provider, custom_domain, onboarding_dismissed,
              created_at, updated_at
       FROM "Tenant" WHERE id = $1 AND deleted_at IS NULL`,
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
  const body = parseBody(event);

  console.log('[ENTITY-SERVICE] Creating tenant:', body);

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

  console.log('[ENTITY-SERVICE] Deleting tenant:', id);

  // Prevent deleting own tenant
  if (id === tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Cannot delete your own tenant' });
  }

  try {
    await getPoolAsync();

    // Soft delete
    const result = await query(
      `UPDATE "Tenant" SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
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
    // Schema: id, tenant_id, name, category, capacity, size, features, price_modifier_cents, is_active, sort_order
    const result = await query(
      `SELECT id, tenant_id, name, category AS type, capacity, size, features,
              price_modifier_cents, is_active, sort_order, created_at, updated_at
       FROM "Kennel"
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY sort_order, name`,
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
    const result = await query(
      `SELECT id, tenant_id, name, category AS type, capacity, size, features,
              price_modifier_cents, is_active, sort_order, created_at, updated_at
       FROM "Kennel"
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
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
    const result = await query(
      `INSERT INTO "Kennel" (tenant_id, name, category, capacity, size, features, price_modifier_cents, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tenantId,
        body.name,
        body.category || body.type || 'standard',
        body.capacity || 1,
        body.size || null,
        JSON.stringify(body.features || []),
        body.priceModifierCents || body.price_modifier_cents || 0,
        body.isActive !== false,
        body.sortOrder || body.sort_order || 0
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
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (body.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(body.name); }
    if (body.category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(body.category); }
    if (body.capacity !== undefined) { updates.push(`capacity = $${paramIndex++}`); values.push(body.capacity); }
    if (body.size !== undefined) { updates.push(`size = $${paramIndex++}`); values.push(body.size); }
    if (body.features !== undefined) { updates.push(`features = $${paramIndex++}`); values.push(JSON.stringify(body.features)); }
    if (body.priceModifierCents !== undefined) { updates.push(`price_modifier_cents = $${paramIndex++}`); values.push(body.priceModifierCents); }
    if (body.isActive !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(body.isActive); }
    if (body.sortOrder !== undefined) { updates.push(`sort_order = $${paramIndex++}`); values.push(body.sortOrder); }

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

  console.log('[Facilities][delete] id:', id, 'tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Soft delete
    const result = await query(
      `UPDATE "Kennel" SET deleted_at = NOW(), is_active = false
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
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

  console.log('[Pets][list] tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();
    // Schema: id, tenant_id, name, species, breed, gender, color, weight, date_of_birth,
    //         microchip_number, last_vet_visit, medical_notes, behavior_notes, dietary_notes,
    //         notes, description, documents, behavior_flags, status, photo_url, is_active,
    //         vet_name, vet_phone, vet_clinic, vet_address, vet_email, vet_notes
    const result = await query(
      `SELECT p.id, p.tenant_id, p.name, p.species, p.breed, p.gender, p.color,
              p.weight, p.date_of_birth, p.microchip_number, p.last_vet_visit,
              p.medical_notes, p.behavior_notes, p.dietary_notes, p.notes, p.description,
              p.documents, p.behavior_flags, p.status, p.photo_url, p.is_active,
              p.vet_name, p.vet_phone, p.vet_clinic, p.vet_address, p.vet_email, p.vet_notes,
              p.created_at, p.updated_at
       FROM "Pet" p
       WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.name`,
      [tenantId]
    );
    console.log('[Pets][diag] count:', result.rows.length);
    return createResponse(200, { data: result.rows });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getPets error:', error);
    return createResponse(200, { data: [] });
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
    const result = await query(
      `SELECT p.id, p.tenant_id, p.name, p.species, p.breed, p.gender, p.color,
              p.weight, p.date_of_birth, p.microchip_number, p.last_vet_visit,
              p.medical_notes, p.behavior_notes, p.dietary_notes, p.notes, p.description,
              p.documents, p.behavior_flags, p.status, p.photo_url, p.is_active,
              p.vet_name, p.vet_phone, p.vet_clinic, p.vet_address, p.vet_email, p.vet_notes,
              p.created_at, p.updated_at
       FROM "Pet" p
       WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL`,
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
    const result = await query(
      `INSERT INTO "Pet" (tenant_id, name, species, breed, gender, color, weight, date_of_birth,
                         microchip_number, medical_notes, behavior_notes, dietary_notes, notes,
                         description, status, photo_url, is_active,
                         vet_name, vet_phone, vet_clinic, vet_address, vet_email, vet_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
               $18, $19, $20, $21, $22, $23)
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
        body.notes || null,
        body.description || null,
        body.status || 'ACTIVE',
        body.photoUrl || body.photo_url || null,
        body.isActive !== false,
        // Veterinarian info fields
        body.vetName || body.vet_name || null,
        body.vetPhone || body.vet_phone || null,
        body.vetClinic || body.vet_clinic || null,
        body.vetAddress || body.vet_address || null,
        body.vetEmail || body.vet_email || null,
        body.vetNotes || body.vet_notes || null
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
    if (body.notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(body.notes); }
    if (body.description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(body.description); }
    if (body.status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(body.status); }
    if (body.photoUrl !== undefined || body.photo_url !== undefined) {
      updates.push(`photo_url = $${paramIndex++}`);
      values.push(body.photoUrl || body.photo_url);
    }
    if (body.isActive !== undefined || body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.isActive ?? body.is_active);
    }
    // Veterinarian info fields
    if (body.vetName !== undefined || body.vet_name !== undefined) {
      updates.push(`vet_name = $${paramIndex++}`);
      values.push(body.vetName || body.vet_name);
    }
    if (body.vetPhone !== undefined || body.vet_phone !== undefined) {
      updates.push(`vet_phone = $${paramIndex++}`);
      values.push(body.vetPhone || body.vet_phone);
    }
    if (body.vetClinic !== undefined || body.vet_clinic !== undefined) {
      updates.push(`vet_clinic = $${paramIndex++}`);
      values.push(body.vetClinic || body.vet_clinic);
    }
    if (body.vetAddress !== undefined || body.vet_address !== undefined) {
      updates.push(`vet_address = $${paramIndex++}`);
      values.push(body.vetAddress || body.vet_address);
    }
    if (body.vetEmail !== undefined || body.vet_email !== undefined) {
      updates.push(`vet_email = $${paramIndex++}`);
      values.push(body.vetEmail || body.vet_email);
    }
    if (body.vetNotes !== undefined || body.vet_notes !== undefined) {
      updates.push(`vet_notes = $${paramIndex++}`);
      values.push(body.vetNotes || body.vet_notes);
    }

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

  console.log('[Pets][delete] id:', id, 'tenantId:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Soft delete
    const result = await query(
      `UPDATE "Pet" SET deleted_at = NOW(), is_active = false
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
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

  // Diagnostic logging
  console.log('[Owners][list] tenantId:', tenantId);
  console.log('[Owners][list] env DB_HOST:', process.env.DB_HOST);
  console.log('[Owners][list] env DB_NAME:', process.env.DB_NAME || process.env.DB_DATABASE);
  console.log('[ENTITY-SERVICE] Getting owners for tenant:', tenantId);

  // Return 400 if no tenant context
  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Diagnostic queries
    try {
      const diagAll = await query('SELECT tenant_id, COUNT(*) AS count FROM "Owner" GROUP BY tenant_id;');
      console.log('[Owners][diag] counts per tenant:', JSON.stringify(diagAll.rows));
      const diagForTenant = await query(
        'SELECT id, email FROM "Owner" WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 5;',
        [tenantId]
      );
      console.log('[Owners][diag] sample for tenant', tenantId, ':', JSON.stringify(diagForTenant.rows));
    } catch (err) {
      console.error('[Owners][diag] diagnostic queries failed:', err);
    }

    const result = await query(
      `SELECT o.id, o.tenant_id, o.first_name, o.last_name, o.email, o.phone,
              o.address_street AS address, o.address_city AS city, o.address_state AS state,
              o.address_zip AS zip_code, o.address_country AS country,
              o.emergency_contact_name, o.emergency_contact_phone, o.notes,
              o.is_active, o.created_at, o.updated_at
       FROM "Owner" o
       WHERE o.tenant_id = $1
       ORDER BY o.last_name, o.first_name`,
      [tenantId]
    );
    return createResponse(200, { data: result.rows });
  } catch (error) {
    console.error('[ENTITY-SERVICE] getOwners error:', error);
    return createResponse(200, { data: [] });
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
    const result = await query(
      `SELECT o.id, o.tenant_id, o.first_name, o.last_name, o.email, o.phone,
              o.address_street AS address, o.address_city AS city, o.address_state AS state,
              o.address_zip AS zip_code, o.address_country AS country,
              o.emergency_contact_name, o.emergency_contact_phone, o.notes,
              o.is_active, o.created_at, o.updated_at
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
    const result = await query(
      `INSERT INTO "Owner" (tenant_id, first_name, last_name, email, phone,
                           address_street, address_city, address_state, address_zip, address_country,
                           emergency_contact_name, emergency_contact_phone, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
        body.isActive !== false
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
    if (body.isActive !== undefined || body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.isActive ?? body.is_active);
    }

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

  console.log('[ENTITY-SERVICE] Deleting owner:', id, 'for tenant:', tenantId);

  if (!tenantId) {
    return createResponse(400, { error: 'BadRequest', message: 'Tenant context is required' });
  }

  try {
    await getPoolAsync();

    // Soft delete
    const result = await query(
      `UPDATE "Owner" SET deleted_at = NOW(), is_active = false
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Owner not found' });
    }

    console.log('[ENTITY-SERVICE] Deleted owner:', id);
    return createResponse(204, '');
  } catch (error) {
    console.error('[ENTITY-SERVICE] deleteOwner error:', error);
    return createResponse(500, { error: 'InternalServerError', message: 'Failed to delete owner' });
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
    const result = await query(
      `SELECT s.id, s.tenant_id, s.user_id, s.title, s.department, s.hire_date,
              s.is_active, s.permissions, s.created_at, s.updated_at,
              u.first_name, u.last_name, u.email, u.phone, u.role, u.avatar_url
       FROM "Staff" s
       LEFT JOIN "User" u ON s.user_id = u.id
       WHERE s.tenant_id = $1
       ORDER BY u.last_name, u.first_name`,
      [tenantId]
    );
    console.log('[Staff][diag] count:', result.rows.length);
    return createResponse(200, { data: result.rows });
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
    const result = await query(
      `SELECT s.id, s.tenant_id, s.user_id, s.title, s.department, s.hire_date,
              s.is_active, s.permissions, s.created_at, s.updated_at,
              u.first_name, u.last_name, u.email, u.phone, u.role, u.avatar_url
       FROM "Staff" s
       LEFT JOIN "User" u ON s.user_id = u.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) {
      return createResponse(404, { error: 'NotFound', message: 'Staff member not found' });
    }
    return createResponse(200, result.rows[0]);
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
  const daysAhead = parseInt(queryParams.daysAhead) || 30;

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
         AND v.deleted_at IS NULL
         AND v.expires_at IS NOT NULL
         AND v.expires_at >= CURRENT_DATE - INTERVAL '7 days'
         AND v.expires_at <= CURRENT_DATE + INTERVAL '${daysAhead} days'
       ORDER BY v.expires_at ASC`,
      [tenantId]
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
      `SELECT id FROM "Pet" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [petId, tenantId]
    );

    if (petResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Pet not found',
      });
    }

    const result = await query(
      `SELECT
         v.id, v.pet_id, v.vaccine_name, v.vaccine_type,
         v.administered_date, v.expiration_date, v.next_due_date,
         v.lot_number, v.manufacturer, v.administered_by,
         v.vet_clinic, v.vet_name, v.notes, v.is_required,
         v.document_url, v.verified, v.verified_by, v.verified_at,
         v.created_at, v.updated_at
       FROM "Vaccination" v
       WHERE v.pet_id = $1 AND v.tenant_id = $2 AND v.deleted_at IS NULL
       ORDER BY v.expiration_date ASC NULLS LAST, v.administered_date DESC`,
      [petId, tenantId]
    );

    const vaccinations = result.rows.map(row => ({
      id: row.id,
      petId: row.pet_id,
      vaccineName: row.vaccine_name,
      vaccineType: row.vaccine_type,
      administeredDate: row.administered_date,
      expirationDate: row.expiration_date,
      nextDueDate: row.next_due_date,
      lotNumber: row.lot_number,
      manufacturer: row.manufacturer,
      administeredBy: row.administered_by,
      vetClinic: row.vet_clinic,
      vetName: row.vet_name,
      notes: row.notes,
      isRequired: row.is_required,
      documentUrl: row.document_url,
      verified: row.verified,
      verifiedBy: row.verified_by,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isExpired: row.expiration_date ? new Date(row.expiration_date) < new Date() : false,
      isExpiringSoon: row.expiration_date ? (new Date(row.expiration_date) - new Date()) / (1000 * 60 * 60 * 24) <= 30 : false,
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

  const {
    vaccineName, vaccineType, administeredDate, expirationDate, nextDueDate,
    lotNumber, manufacturer, administeredBy, vetClinic, vetName,
    notes, isRequired, documentUrl
  } = body;

  if (!vaccineName) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Vaccine name is required',
    });
  }

  try {
    await getPoolAsync();

    // Verify pet belongs to tenant
    const petResult = await query(
      `SELECT id, name FROM "Pet" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [petId, tenantId]
    );

    if (petResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Pet not found',
      });
    }

    const result = await query(
      `INSERT INTO "Vaccination" (
         tenant_id, pet_id, vaccine_name, vaccine_type,
         administered_date, expiration_date, next_due_date,
         lot_number, manufacturer, administered_by,
         vet_clinic, vet_name, notes, is_required, document_url,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
       RETURNING *`,
      [
        tenantId, petId, vaccineName, vaccineType || null,
        administeredDate || null, expirationDate || null, nextDueDate || null,
        lotNumber || null, manufacturer || null, administeredBy || null,
        vetClinic || null, vetName || null, notes || null,
        isRequired || false, documentUrl || null
      ]
    );

    const row = result.rows[0];

    console.log('[ENTITY-SERVICE] Created vaccination:', row.id, 'for pet:', petId);

    return createResponse(201, {
      success: true,
      id: row.id,
      vaccineName: row.vaccine_name,
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

  const {
    vaccineName, vaccineType, administeredDate, expirationDate, nextDueDate,
    lotNumber, manufacturer, administeredBy, vetClinic, vetName,
    notes, isRequired, documentUrl, verified
  } = body;

  try {
    await getPoolAsync();

    const updates = [];
    const values = [vaccinationId, tenantId];
    let paramIndex = 3;

    if (vaccineName !== undefined) { updates.push(`vaccine_name = $${paramIndex++}`); values.push(vaccineName); }
    if (vaccineType !== undefined) { updates.push(`vaccine_type = $${paramIndex++}`); values.push(vaccineType); }
    if (administeredDate !== undefined) { updates.push(`administered_date = $${paramIndex++}`); values.push(administeredDate); }
    if (expirationDate !== undefined) { updates.push(`expiration_date = $${paramIndex++}`); values.push(expirationDate); }
    if (nextDueDate !== undefined) { updates.push(`next_due_date = $${paramIndex++}`); values.push(nextDueDate); }
    if (lotNumber !== undefined) { updates.push(`lot_number = $${paramIndex++}`); values.push(lotNumber); }
    if (manufacturer !== undefined) { updates.push(`manufacturer = $${paramIndex++}`); values.push(manufacturer); }
    if (administeredBy !== undefined) { updates.push(`administered_by = $${paramIndex++}`); values.push(administeredBy); }
    if (vetClinic !== undefined) { updates.push(`vet_clinic = $${paramIndex++}`); values.push(vetClinic); }
    if (vetName !== undefined) { updates.push(`vet_name = $${paramIndex++}`); values.push(vetName); }
    if (notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(notes); }
    if (isRequired !== undefined) { updates.push(`is_required = $${paramIndex++}`); values.push(isRequired); }
    if (documentUrl !== undefined) { updates.push(`document_url = $${paramIndex++}`); values.push(documentUrl); }
    if (verified !== undefined) {
      updates.push(`verified = $${paramIndex++}`);
      values.push(verified);
      if (verified && event.user?.id) {
        updates.push(`verified_by = $${paramIndex++}`);
        values.push(event.user.id);
        updates.push(`verified_at = NOW()`);
      }
    }

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
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
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

    console.log('[ENTITY-SERVICE] Updated vaccination:', row.id);

    return createResponse(200, {
      success: true,
      id: row.id,
      vaccineName: row.vaccine_name,
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
    await getPoolAsync();

    const result = await query(
      `UPDATE "Vaccination"
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id, vaccine_name`,
      [vaccinationId, tenantId]
    );

    if (result.rows.length === 0) {
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
