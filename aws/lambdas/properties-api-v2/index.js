/**
 * Properties API v2
 * Enhanced properties API with rich metadata, dependency tracking, and versioned responses
 * Backward compatible with v1, but adds comprehensive enterprise features
 */

const { getPool } = require('/opt/nodejs');
const { getTenantIdFromEvent } = require('/opt/nodejs');
const propertySerializer = require('./serializers/property-serializer');
const dependenciesHandler = require('./handlers/dependencies');
const cascadeOperationsHandler = require('./handlers/cascade-operations');

exports.handler = async (event) => {
  console.log('Properties API v2 invoked:', JSON.stringify(event, null, 2));

  const { httpMethod: method, path } = event.requestContext.http;
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};

  // Extract tenant context
  const tenantId = await getTenantIdFromEvent(event);
  if (!tenantId) {
    return {
      statusCode: 401,
      headers: getResponseHeaders(2),
      body: JSON.stringify({ error: 'Missing tenant context' }),
    };
  }

  // Extract user ID
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  const userId = claims['sub'] || null;

  try {
    // Route: GET /api/v2/properties
    if (method === 'GET' && path.endsWith('/properties')) {
      return await listProperties(tenantId, queryParams);
    }

    // Route: GET /api/v2/properties/{propertyId}
    if (method === 'GET' && path.match(/\/properties\/[^/]+$/) && !path.includes('/dependencies')) {
      const propertyId = pathParams.propertyId;
      return await getProperty(tenantId, propertyId, queryParams);
    }

    // Route: POST /api/v2/properties
    if (method === 'POST' && path.endsWith('/properties')) {
      return await createProperty(tenantId, userId, body);
    }

    // Route: PATCH /api/v2/properties/{propertyId}
    if (method === 'PATCH' && path.match(/\/properties\/[^/]+$/)) {
      const propertyId = pathParams.propertyId;
      return await updateProperty(tenantId, userId, propertyId, body);
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

    return {
      statusCode: 404,
      headers: getResponseHeaders(2),
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (error) {
    console.error('Error in properties-api-v2:', error);
    return {
      statusCode: 500,
      headers: getResponseHeaders(2),
      body: JSON.stringify({ error: error.message }),
    };
  }
};

/**
 * List properties with rich metadata
 */
async function listProperties(tenantId, queryParams) {
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

  return {
    statusCode: 200,
    headers: getResponseHeaders(2),
    body: JSON.stringify({
      properties,
      metadata: {
        totalCount: properties.length,
        objectType,
        propertyType,
      },
    }),
  };
}

/**
 * Get single property with full details
 */
async function getProperty(tenantId, propertyId, queryParams) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM "PropertyMetadata"
     WHERE "property_id" = $1
       AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      headers: getResponseHeaders(2),
      body: JSON.stringify({ error: 'Property not found' }),
    };
  }

  const property = await propertySerializer.serialize(result.rows[0], {
    includeUsage: true,
    includeDependencies: true,
    includeAuditTrail: queryParams.includeAuditTrail === 'true',
  });

  return {
    statusCode: 200,
    headers: getResponseHeaders(2),
    body: JSON.stringify(property),
  };
}

/**
 * Create new property
 */
async function createProperty(tenantId, userId, data) {
  const pool = getPool();

  // Validate required fields
  const { propertyName, displayLabel, objectType, propertyType, dataType } = data;

  if (!propertyName || !displayLabel || !objectType || !propertyType || !dataType) {
    return {
      statusCode: 400,
      headers: getResponseHeaders(2),
      body: JSON.stringify({ error: 'Missing required fields' }),
    };
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

    return {
      statusCode: 201,
      headers: getResponseHeaders(2),
      body: JSON.stringify(serialized),
    };
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
async function updateProperty(tenantId, userId, propertyId, data) {
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
      return {
        statusCode: 404,
        headers: getResponseHeaders(2),
        body: JSON.stringify({ error: 'Property not found' }),
      };
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
      return {
        statusCode: 400,
        headers: getResponseHeaders(2),
        body: JSON.stringify({ error: 'No fields to update' }),
      };
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

    return {
      statusCode: 200,
      headers: getResponseHeaders(2),
      body: JSON.stringify(serialized),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get response headers with API version
 */
function getResponseHeaders(version) {
  return {
    'Content-Type': 'application/json',
    'X-API-Version': `v${version}`,
    'X-Property-Schema-Version': '2',
  };
}

