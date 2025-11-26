// Canonical Service:
// Domain: Properties (advanced metadata / dependencies / cascade operations)
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

/**
 * Properties API v2
 * Enhanced properties API with rich metadata, dependency tracking, and versioned responses
 * This is the sole authoritative API for all Properties operations (CRUD + advanced).
 * Legacy v1 mode has been removed; all clients must use v2 payload format.
 */

const { getPool, getTenantIdFromEvent, getJWTValidator } = require('/opt/nodejs');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const propertySerializer = require('./serializers/property-serializer');
const dependenciesHandler = require('./handlers/dependencies');
const cascadeOperationsHandler = require('./handlers/cascade-operations');
const {
  getSecureHeaders,
  errorResponse,
  successResponse,
} = require('/opt/nodejs/security-utils');

// Extract user info with JWT fallback validation
async function getUserInfoFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (claims && claims.sub) {
        console.log('[AUTH] Using API Gateway JWT claims');
        return { sub: claims.sub, email: claims.email, tenantId: claims['custom:tenantId'] || claims.tenantId };
    }

    console.log('[AUTH] No API Gateway claims, falling back to manual JWT validation');
    const authHeader = event?.headers?.authorization || event?.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        const jwtValidator = getJWTValidator();
        const validationResult = await jwtValidator.validateToken(authHeader.substring(7));
        const userInfo = jwtValidator.extractUserInfo(validationResult.decoded, validationResult.tokenType);
        return { sub: userInfo.userId, email: userInfo.email, tenantId: userInfo.tenantId };
    } catch (error) {
        console.error('[AUTH] JWT validation failed:', error.message);
        return null;
    }
}

const API_HEADERS = {
  'X-API-Version': 'v2',
  'X-Property-Schema-Version': '2',
};

const ok = (event, statusCode, data = '', additionalHeaders = {}) => {
  const mergedHeaders = { ...API_HEADERS, ...additionalHeaders };
  if (statusCode === 204) {
    const origin = event?.headers?.origin || event?.headers?.Origin;
    const stage = process.env.STAGE || 'development';
    return {
      statusCode,
      headers: {
        ...getSecureHeaders(origin, stage),
        ...mergedHeaders,
      },
      body: '',
    };
  }

  return successResponse(statusCode, data, event, mergedHeaders);
};

const fail = (event, statusCode, errorCodeOrBody, message, additionalHeaders = {}) => {
  const mergedHeaders = { ...API_HEADERS, ...additionalHeaders };
  if (typeof errorCodeOrBody === 'object' && errorCodeOrBody !== null) {
    const origin = event?.headers?.origin || event?.headers?.Origin;
    const stage = process.env.STAGE || 'development';
    return {
      statusCode,
      headers: {
        ...getSecureHeaders(origin, stage),
        ...mergedHeaders,
      },
      body: JSON.stringify(errorCodeOrBody),
    };
  }

  const response = errorResponse(statusCode, errorCodeOrBody, message, event);
  return {
    ...response,
    headers: {
      ...response.headers,
      ...mergedHeaders,
    },
  };
};

exports.handler = async (event) => {

  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};
  
  // Handle OPTIONS for CORS
  if (method === 'OPTIONS') {
    const origin = event?.headers?.origin || event?.headers?.Origin;
    const stage = process.env.STAGE || 'development';
    return {
      statusCode: 200,
      headers: {
        ...getSecureHeaders(origin, stage),
        ...API_HEADERS,
      },
      body: JSON.stringify({}),
    };
  }
  
  const body = event.body ? JSON.parse(event.body) : {};

  // Extract tenant context
  const tenantId = await getTenantIdFromEvent(event);
  if (!tenantId) {
    return fail(event, 401, { error: 'Missing tenant context' });
  }

  // Extract user info with JWT fallback
  const userInfo = await getUserInfoFromEvent(event);
  const userId = userInfo?.sub || null;

  try {
    // Route: GET /api/v2/properties
    if (method === 'GET' && (path === '/api/v2/properties' || path.endsWith('/properties'))) {
      return await listProperties(event, tenantId, queryParams);
    }

    // Route: GET /api/v2/properties/{propertyId}
    if (method === 'GET' && path.match(/\/properties\/[^/]+$/) && !path.includes('/dependencies')) {
      const propertyId = pathParams.propertyId;
      return await getProperty(event, tenantId, propertyId, queryParams);
    }

    // Route: POST /api/v2/properties
    if (method === 'POST' && path.endsWith('/properties')) {
      return await createProperty(event, tenantId, userId, body);
    }

    // Route: PATCH /api/v2/properties/{propertyId}
    if (method === 'PATCH' && path.match(/\/properties\/[^/]+$/)) {
      const propertyId = pathParams.propertyId;
      return await updateProperty(event, tenantId, userId, propertyId, body);
    }

    // Route: DELETE /api/v2/properties/{propertyId}
    // Hard delete is not supported; use archive/substitute/force endpoints instead.
    if (method === 'DELETE' && path.match(/\/properties\/[^/]+$/) && !path.includes('/force')) {
      return fail(event, 405, { error: 'Delete not supported. Use archive/substitute/force endpoints.' });
    }

    // Route: GET /api/v2/properties/{propertyId}/dependencies
    if (method === 'GET' && path.match(/\/properties\/[^/]+\/dependencies$/)) {
      const propertyId = pathParams.propertyId;
      return await dependenciesHandler.getDependencies(tenantId, propertyId, queryParams.direction);
    }

    // Route: GET /api/v2/properties/{propertyId}/dependents
    if (method === 'GET' && path.match(/\/properties\/[^/]+\/dependents$/)) {
      const propertyId = pathParams.propertyId;
      return await dependenciesHandler.getDependents(tenantId, propertyId);
    }

    // Route: POST /api/v2/properties/{propertyId}/impact-analysis
    if (method === 'POST' && path.match(/\/properties\/[^/]+\/impact-analysis$/)) {
      const propertyId = pathParams.propertyId;
      return await dependenciesHandler.analyzeImpact(tenantId, propertyId, body.modificationType);
    }

    // Route: GET /api/v2/properties/{propertyId}/usage-report
    if (method === 'GET' && path.match(/\/properties\/[^/]+\/usage-report$/)) {
      const propertyId = pathParams.propertyId;
      return await dependenciesHandler.getUsageReport(tenantId, propertyId);
    }

    // Route: POST /api/v2/properties/{propertyId}/archive
    if (method === 'POST' && path.match(/\/properties\/[^/]+\/archive$/)) {
      const propertyId = pathParams.propertyId;
      return await cascadeOperationsHandler.archive(tenantId, userId, propertyId, body);
    }

    // Route: POST /api/v2/properties/{propertyId}/restore
    if (method === 'POST' && path.match(/\/properties\/[^/]+\/restore$/)) {
      const propertyId = pathParams.propertyId;
      return await cascadeOperationsHandler.restore(tenantId, userId, propertyId);
    }

    // Route: POST /api/v2/properties/{propertyId}/substitute
    if (method === 'POST' && path.match(/\/properties\/[^/]+\/substitute$/)) {
      const propertyId = pathParams.propertyId;
      return await cascadeOperationsHandler.substitute(tenantId, userId, propertyId, body.replacementPropertyId);
    }

    // Route: DELETE /api/v2/properties/{propertyId}/force
    if (method === 'DELETE' && path.match(/\/properties\/[^/]+\/force$/)) {
      const propertyId = pathParams.propertyId;
      return await cascadeOperationsHandler.forceDelete(tenantId, userId, propertyId, body.reason);
    }

    return fail(event, 404, { error: 'Route not found' });
  } catch (error) {
    console.error('Error in properties-api-v2:', error);
    return fail(event, 500, { error: error.message });
  }
};

/**
 * List properties with rich metadata
 */
async function listProperties(event, tenantId, queryParams) {
  const pool = getPool();

  const {
    objectType,
    propertyType,
    includeArchived = 'false',
    includeDeprecated = 'false',
    includeUsage = 'false',
    includeDependencies = 'false',
  } = queryParams;

  let query = `
    SELECT * FROM "PropertyMetadata"
    WHERE ("tenant_id" = $1 OR "is_global" = true)
  `;
  const params = [tenantId];
  let paramIndex = 2;

  if (objectType) {
    query += ` AND "object_type" = $${paramIndex}`;
    params.push(objectType);
    paramIndex++;
  }

  if (propertyType) {
    query += ` AND "property_type" = $${paramIndex}`;
    params.push(propertyType);
    paramIndex++;
  }

  if (includeArchived === 'false') {
    query += ` AND "is_deleted" = false`;
  }

  if (includeDeprecated === 'false') {
    query += ` AND "is_deprecated" = false`;
  }

  query += ` ORDER BY "display_order", "property_name"`;

  const result = await pool.query(query, params);

  // Serialize properties with rich metadata
  const properties = await Promise.all(
    result.rows.map(prop =>
      propertySerializer.serialize(prop, {
        includeUsage: includeUsage === 'true',
        includeDependencies: includeDependencies === 'true',
      })
    )
  );

  return ok(event, 200, {
      properties,
      metadata: {
        totalCount: properties.length,
        objectType,
        propertyType,
      },
    });
}

/**
 * Get single property with full details
 */
async function getProperty(event, tenantId, propertyId, queryParams) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM "PropertyMetadata"
     WHERE "property_id" = $1
       AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (result.rows.length === 0) {
    return fail(event, 404, { error: 'Property not found' });
  }

  const property = await propertySerializer.serialize(result.rows[0], {
    includeUsage: true,
    includeDependencies: true,
    includeAuditTrail: queryParams.includeAuditTrail === 'true',
  });

  return ok(event, 200, property);
}

/**
 * Create new property
 */
async function createProperty(event, tenantId, userId, data) {
  const pool = getPool();

  // Validate required fields
  const { propertyName, displayLabel, objectType, propertyType, dataType } = data;

  if (!propertyName || !displayLabel || !objectType || !propertyType || !dataType) {
    return fail(event, 400, { error: 'Missing required fields' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create property
    const result = await client.query(
      `INSERT INTO "PropertyMetadata" (
        "property_name",
        "display_label",
        "description",
        "object_type",
        "property_type",
        "property_group",
        "data_type",
        "field_type",
        "created_by",
        "tenant_id",
        "is_global",
        "enum_options",
        "validation_rules",
        "permission_profiles"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        propertyName,
        displayLabel,
        data.description || '',
        objectType,
        propertyType,
        data.propertyGroup || null,
        dataType,
        data.fieldType || dataType,
        userId,
        propertyType === 'custom' ? tenantId : null,
        propertyType !== 'custom',
        JSON.stringify(data.enumOptions || []),
        JSON.stringify(data.validationRules || []),
        JSON.stringify(data.permissionProfiles || {}),
      ]
    );

    const newProperty = result.rows[0];

    // Log to audit trail
    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "after_value",
        "changed_by",
        "change_reason"
      ) VALUES ($1, 'CREATE', $2, $3, 'Property created via API v2')`,
      [newProperty.property_id, JSON.stringify(newProperty), userId]
    );

    await client.query('COMMIT');

    const serialized = await propertySerializer.serialize(newProperty, {
      includeUsage: false,
      includeDependencies: false,
    });

    return ok(event, 201, serialized);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update property
 */
async function updateProperty(event, tenantId, userId, propertyId, data) {
  const pool = getPool();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current property
    const currentResult = await client.query(
      `SELECT * FROM "PropertyMetadata" WHERE "property_id" = $1`,
      [propertyId]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return fail(event, 404, { error: 'Property not found' });
    }

    const currentProperty = currentResult.rows[0];

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (data.displayLabel !== undefined) {
      updates.push(`"display_label" = $${paramIndex}`);
      params.push(data.displayLabel);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`"description" = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }

    if (data.propertyGroup !== undefined) {
      updates.push(`"property_group" = $${paramIndex}`);
      params.push(data.propertyGroup);
      paramIndex++;
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return fail(event, 400, { error: 'No fields to update' });
    }

    updates.push(`"modified_by" = $${paramIndex}`);
    params.push(userId);
    paramIndex++;

    params.push(propertyId);

    const updateQuery = `
      UPDATE "PropertyMetadata"
      SET ${updates.join(', ')}
      WHERE "property_id" = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(updateQuery, params);
    const updatedProperty = result.rows[0];

    // Log to audit trail
    await client.query(
      `INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "before_value",
        "after_value",
        "changed_by",
        "changed_fields"
      ) VALUES ($1, 'MODIFY', $2, $3, $4, $5)`,
      [
        propertyId,
        JSON.stringify(currentProperty),
        JSON.stringify(updatedProperty),
        userId,
        JSON.stringify(Object.keys(data)),
      ]
    );

    await client.query('COMMIT');

    const serialized = await propertySerializer.serialize(updatedProperty, {
      includeUsage: true,
      includeDependencies: false,
    });

    return ok(event, 200, serialized);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}


