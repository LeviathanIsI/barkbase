// Canonical Service:
// Domain: Properties (advanced metadata / dependencies / cascade operations)
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

/**
 * Properties API v2
 * Enhanced properties API with rich metadata, dependency tracking, and versioned responses
 * Backward compatible with v1, but adds comprehensive enterprise features
 */
// TODO (Consolidation Phase): Keep v2 focused on advanced operations while v1 handles CRUD.
// Phase 5 will migrate v1 CRUD flows into this Lambda and decommission the legacy handler.
// Until then, avoid collapsing routes; follow docs/PROPERTIES_CONSOLIDATION_PLAN.md for timing.

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

  // Legacy mode is no longer supported - v2 handles all properties
  const isLegacyMode = false;

  try {
    
    // NOTE: v2 now handles all properties CRUD.
    // properties-api (v1) has been retired and returns 410.
    // Do NOT reintroduce v1 behavior or DTOs here.

    // Route: GET /api/v2/properties
    if (method === 'GET' && (path === '/api/v2/properties' || path.endsWith('/properties'))) {
      if (isLegacyMode) {
        return await listLegacyProperties(event, queryParams, tenantId);
      }
      return await listProperties(event, tenantId, queryParams);
    }

    // Route: GET /api/v2/properties/{propertyId}
    if (method === 'GET' && path.match(/\/properties\/[^/]+$/) && !path.includes('/dependencies')) {
      const propertyId = pathParams.propertyId;
      if (isLegacyMode) {
        return await getLegacyProperty(event, tenantId, propertyId);
      }
      return await getProperty(event, tenantId, propertyId, queryParams);
    }

    // Route: POST /api/v2/properties
    if (method === 'POST' && path.endsWith('/properties')) {
      if (isLegacyCreatePayload(body)) {
        return await createLegacyProperty(event, body, tenantId, userId);
      }
      return await createProperty(event, tenantId, userId, body);
    }

    // Route: PATCH /api/v2/properties/{propertyId}
    if (method === 'PATCH' && path.match(/\/properties\/[^/]+$/)) {
      const propertyId = pathParams.propertyId;
      if (isLegacyUpdatePayload(body)) {
        return await updateLegacyProperty(event, body, tenantId, userId, propertyId);
      }
      return await updateProperty(event, tenantId, userId, propertyId, body);
    }

    // Route: DELETE /api/v2/properties/{propertyId}
    if (method === 'DELETE' && path.match(/\/properties\/[^/]+$/) && !path.includes('/force')) {
      const propertyId = pathParams.propertyId;
      if (isLegacyMode) {
        return await deleteLegacyProperty(event, tenantId, propertyId);
      }
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

/**
 * Legacy CRUD support (v1 compatibility over v2 routes)
 */
function isLegacyCreatePayload(body) {
  return (
    body &&
    body.objectType &&
    body.name &&
    body.label &&
    !body.propertyName &&
    !body.propertyType
  );
}

function isLegacyUpdatePayload(body = {}) {
  if (!body || typeof body !== 'object') {
    return false;
  }
  if (body.displayLabel !== undefined || body.propertyGroup !== undefined || body.propertyName !== undefined) {
    return false;
  }
  const legacyFields = [
    'label',
    'description',
    'isRequired',
    'isVisible',
    'isSearchable',
    'isEditable',
    'isUnique',
    'group',
    'order',
    'options',
    'validation',
    'defaultValue',
    'metadata',
  ];
  return legacyFields.some((field) => Object.prototype.hasOwnProperty.call(body, field));
}

function stringifyIfObject(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function mapLegacyRow(row) {
  if (!row) return row;
  return {
    ...row,
    options: stringifyIfObject(row.options),
    validation: stringifyIfObject(row.validation),
    defaultValue: stringifyIfObject(row.defaultValue),
    metadata: stringifyIfObject(row.metadata),
  };
}

async function listLegacyProperties(event, queryParams, tenantId) {
  const objectType = queryParams.objectType;
  if (!objectType) {
    return fail(event, 400, { error: 'Missing required parameter: objectType' });
  }

  const includeArchived = queryParams.includeArchived === 'true';
  const onlyArchived = queryParams.onlyArchived === 'true';

  const pool = getPool();
  const client = await pool.connect();
  try {
    let query = `
      SELECT 
        "recordId",
        "tenantId",
        "objectType",
        "name",
        "label",
        "description",
        "type",
        "isSystem",
        "isRequired",
        "isVisible",
        "isSearchable",
        "isEditable",
        "isUnique",
        "group",
        "order",
        "options",
        "validation",
        "defaultValue",
        "metadata",
        "createdAt",
        "updatedAt",
        "createdBy",
        "accessLevel",
        "isArchived",
        "archivedAt",
        "archivedBy"
      FROM "Property"
      WHERE "objectType" = $1
        AND ("tenantId" IS NULL OR "tenantId" = $2)
    `;

    if (onlyArchived) {
      query += ` AND "isArchived" = true`;
    } else if (!includeArchived) {
      query += ` AND ("isArchived" = false OR "isArchived" IS NULL)`;
    }

    query += ` ORDER BY "isSystem" DESC, "group" ASC, "order" ASC, "label" ASC`;

    const result = await client.query(query, [objectType, tenantId]);
    const rows = result.rows.map(mapLegacyRow);

    return ok(event, 200, rows);
  } finally {
    client.release();
  }
}

async function getLegacyProperty(event, tenantId, propertyId) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        "recordId",
        "tenantId",
        "objectType",
        "name",
        "label",
        "description",
        "type",
        "isSystem",
        "isRequired",
        "isVisible",
        "isSearchable",
        "isEditable",
        "isUnique",
        "group",
        "order",
        "options",
        "validation",
        "defaultValue",
        "metadata",
        "createdAt",
        "updatedAt",
        "createdBy",
        "accessLevel",
        "isArchived",
        "archivedAt",
        "archivedBy"
      FROM "Property"
      WHERE "recordId" = $1
        AND ("tenantId" IS NULL OR "tenantId" = $2)`,
      [propertyId, tenantId]
    );

    if (result.rows.length === 0) {
      return fail(event, 404, { error: 'Property not found' });
    }

    return ok(event, 200, mapLegacyRow(result.rows[0]));
  } finally {
    client.release();
  }
}

async function createLegacyProperty(event, body, tenantId, userId) {
  const requiredFields = ['objectType', 'name', 'label', 'type'];
  for (const field of requiredFields) {
    if (!body[field]) {
      return fail(event, 400, { error: `Missing required field: ${field}` });
    }
  }

  if (!/^[a-z_][a-z0-9_]*$/i.test(body.name)) {
    return fail(event, 400, {
        error: 'Property name must start with a letter and contain only letters, numbers, and underscores',
      });
  }

  if (body.isSystem === true) {
    return fail(event, 403, { error: 'Cannot create system properties via API' });
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT "recordId" FROM "Property"
       WHERE "tenantId" = $1
         AND "objectType" = $2
         AND "name" = $3`,
      [tenantId, body.objectType, body.name]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return fail(event, 409, { error: 'A property with this name already exists for this object type' });
    }

    const values = [
      uuidv4(),
      tenantId,
      body.objectType,
      body.name,
      body.label,
      body.description || null,
      body.type,
      false,
      body.isRequired || false,
      body.isVisible !== undefined ? body.isVisible : true,
      body.isSearchable !== undefined ? body.isSearchable : true,
      body.isEditable !== undefined ? body.isEditable : true,
      body.isUnique || false,
      body.group || 'Custom Fields',
      body.order || 1000,
      stringifyIfObject(body.options),
      stringifyIfObject(body.validation),
      stringifyIfObject(body.defaultValue),
      stringifyIfObject(body.metadata) || '{}',
      userId || 'api',
    ];

    const insertQuery = `
      INSERT INTO "Property" (
        "recordId",
        "tenantId",
        "objectType",
        "name",
        "label",
        "description",
        "type",
        "isSystem",
        "isRequired",
        "isVisible",
        "isSearchable",
        "isEditable",
        "isUnique",
        "group",
        "order",
        "options",
        "validation",
        "defaultValue",
        "metadata",
        "createdBy"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      RETURNING *
    `;

    const result = await client.query(insertQuery, values);
    await client.query('COMMIT');

    return ok(event, 201, mapLegacyRow(result.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateLegacyProperty(event, body, tenantId, userId, propertyId) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT * FROM "Property"
       WHERE "recordId" = $1
         AND ("tenantId" IS NULL OR "tenantId" = $2)`,
      [propertyId, tenantId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return fail(event, 404, { error: 'Property not found' });
    }

    const property = existing.rows[0];

    if (property.isSystem) {
      const allowedFields = ['isVisible', 'isRequired', 'order', 'group'];
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          setClause.push(`"${field}" = $${paramIndex}`);
          values.push(body[field]);
          paramIndex++;
        }
      }

      if (setClause.length === 0) {
        await client.query('ROLLBACK');
        return fail(event, 400, { error: 'No valid fields to update for system property' });
      }

      setClause.push(`"updatedAt" = CURRENT_TIMESTAMP`);
      values.push(propertyId);

      const result = await client.query(
        `UPDATE "Property"
         SET ${setClause.join(', ')}
         WHERE "recordId" = $${paramIndex}
         RETURNING *`,
        values
      );

      await client.query('COMMIT');

      return ok(event, 200, mapLegacyRow(result.rows[0]));
    }

    const allowedFields = [
      'label',
      'description',
      'isRequired',
      'isVisible',
      'isSearchable',
      'isEditable',
      'isUnique',
      'group',
      'order',
      'options',
      'validation',
      'defaultValue',
      'metadata',
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (['options', 'validation', 'defaultValue', 'metadata'].includes(field)) {
          setClause.push(`"${field}" = $${paramIndex}`);
          values.push(stringifyIfObject(body[field]));
        } else {
          setClause.push(`"${field}" = $${paramIndex}`);
          values.push(body[field]);
        }
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      await client.query('ROLLBACK');
      return fail(event, 400, { error: 'No fields to update' });
    }

    setClause.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(propertyId, tenantId);

    const result = await client.query(
      `UPDATE "Property"
       SET ${setClause.join(', ')}
       WHERE "recordId" = $${paramIndex} AND "tenantId" = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    await client.query('COMMIT');

    return ok(event, 200, mapLegacyRow(result.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteLegacyProperty(event, tenantId, propertyId) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT "isSystem" FROM "Property"
       WHERE "recordId" = $1 AND "tenantId" = $2`,
      [propertyId, tenantId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return fail(event, 404, { error: 'Property not found' });
    }

    if (existing.rows[0].isSystem) {
      await client.query('ROLLBACK');
      return fail(event, 403, { error: 'Cannot delete system properties' });
    }

    await client.query(
      `DELETE FROM "Property"
       WHERE "recordId" = $1 AND "tenantId" = $2`,
      [propertyId, tenantId]
    );

    await client.query('COMMIT');

    return ok(event, 204);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

