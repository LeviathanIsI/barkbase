const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');
const { v4: uuidv4 } = require('uuid');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id',
  'Access-Control-Max-Age': '86400',
};

/**
 * Properties API Lambda Handler
 * Manages both system properties (created by BarkBase) and custom properties (created by users)
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const tenantId = await getTenantIdFromEvent(event);
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

  if (!tenantId) {
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing tenant context' }),
    };
  }

  try {
    // Route the request
    if (method === 'GET' && path === '/api/v1/properties') {
      return await listProperties(event, tenantId);
    } else if (method === 'GET' && path.match(/^\/api\/v1\/properties\/[^/]+$/)) {
      const propertyId = path.split('/').pop();
      return await getProperty(tenantId, propertyId);
    } else if (method === 'POST' && path === '/api/v1/properties') {
      return await createProperty(event, tenantId, userId);
    } else if (method === 'PATCH' && path.match(/^\/api\/v1\/properties\/[^/]+$/)) {
      const propertyId = path.split('/').pop();
      return await updateProperty(event, tenantId, userId, propertyId);
    } else if (method === 'POST' && path.match(/^\/api\/v1\/properties\/[^/]+\/archive$/)) {
      const propertyId = path.split('/')[4];
      return await archiveProperty(tenantId, propertyId, userId);
    } else if (method === 'POST' && path.match(/^\/api\/v1\/properties\/[^/]+\/restore$/)) {
      const propertyId = path.split('/')[4];
      return await restoreProperty(tenantId, propertyId);
    } else if (method === 'DELETE' && path.match(/^\/api\/v1\/properties\/[^/]+$/)) {
      const propertyId = path.split('/').pop();
      return await deleteProperty(tenantId, userId, propertyId);
    } else {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Not found' }),
      };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};

/**
 * List properties for an object type
 * Returns both system properties (tenantId IS NULL) and custom properties (for this tenant)
 */
async function listProperties(event, tenantId) {
  const queryParams = event.queryStringParameters || {};
  const objectType = queryParams.objectType;

  if (!objectType) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required parameter: objectType' }),
    };
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    // Check for archived filter
    const includeArchived = queryParams.includeArchived === 'true';
    const onlyArchived = queryParams.onlyArchived === 'true';
    
    // Get both system properties (NULL tenantId) and tenant-specific custom properties
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
    
    // Add archive filter
    if (onlyArchived) {
      query += ` AND "isArchived" = true`;
    } else if (!includeArchived) {
      query += ` AND ("isArchived" = false OR "isArchived" IS NULL)`;
    }
    
    query += ` ORDER BY "isSystem" DESC, "group" ASC, "order" ASC, "label" ASC`;

    const result = await client.query(query, [objectType, tenantId]);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows),
    };
  } finally {
    client.release();
  }
}

/**
 * Get a single property by ID
 */
async function getProperty(tenantId, propertyId) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const query = `
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
      WHERE "recordId" = $1
        AND ("tenantId" IS NULL OR "tenantId" = $2)
    `;

    const result = await client.query(query, [propertyId, tenantId]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Property not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0]),
    };
  } finally {
    client.release();
  }
}

/**
 * Create a new custom property
 * Only tenants can create custom properties, not system properties
 */
async function createProperty(event, tenantId, userId) {
  const body = JSON.parse(event.body || '{}');

  // Validate required fields
  const required = ['objectType', 'name', 'label', 'type'];
  for (const field of required) {
    if (!body[field]) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Missing required field: ${field}` }),
      };
    }
  }

  // Validate property name (alphanumeric and underscores only, no spaces)
  if (!/^[a-z_][a-z0-9_]*$/i.test(body.name)) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Property name must start with a letter and contain only letters, numbers, and underscores' 
      }),
    };
  }

  // Prevent creating system properties via API
  if (body.isSystem === true) {
    return {
      statusCode: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Cannot create system properties via API' }),
    };
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if property name already exists for this tenant and object type
    const checkQuery = `
      SELECT "recordId" FROM "Property"
      WHERE "tenantId" = $1 
        AND "objectType" = $2 
        AND "name" = $3
    `;
    const existing = await client.query(checkQuery, [tenantId, body.objectType, body.name]);

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'A property with this name already exists for this object type' }),
      };
    }

    // Create the property
    const recordId = uuidv4();
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

    const values = [
      recordId,
      tenantId,
      body.objectType,
      body.name,
      body.label,
      body.description || null,
      body.type,
      false, // isSystem - always false for user-created properties
      body.isRequired || false,
      body.isVisible !== undefined ? body.isVisible : true,
      body.isSearchable !== undefined ? body.isSearchable : true,
      body.isEditable !== undefined ? body.isEditable : true,
      body.isUnique || false,
      body.group || 'Custom Fields',
      body.order || 1000,
      body.options ? JSON.stringify(body.options) : null,
      body.validation ? JSON.stringify(body.validation) : null,
      body.defaultValue ? JSON.stringify(body.defaultValue) : null,
      body.metadata ? JSON.stringify(body.metadata) : '{}',
      userId || 'api',
    ];

    const result = await client.query(insertQuery, values);
    await client.query('COMMIT');

    return {
      statusCode: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update a property
 * System properties cannot be edited (only visibility and order can be changed)
 */
async function updateProperty(event, tenantId, userId, propertyId) {
  const body = JSON.parse(event.body || '{}');

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the existing property
    const getQuery = `
      SELECT * FROM "Property"
      WHERE "recordId" = $1
        AND ("tenantId" IS NULL OR "tenantId" = $2)
    `;
    const existing = await client.query(getQuery, [propertyId, tenantId]);

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Property not found' }),
      };
    }

    const property = existing.rows[0];

    // System properties can only have limited fields updated
    if (property.isSystem) {
      const allowedFields = ['isVisible', 'isRequired', 'order', 'group'];
      const updates = {};
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
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No valid fields to update for system property' }),
        };
      }

      setClause.push(`"updatedAt" = CURRENT_TIMESTAMP`);
      values.push(propertyId);

      const updateQuery = `
        UPDATE "Property"
        SET ${setClause.join(', ')}
        WHERE "recordId" = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      await client.query('COMMIT');

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(result.rows[0]),
      };
    }

    // For custom properties, allow full updates
    const allowedFields = [
      'label', 'description', 'isRequired', 'isVisible', 'isSearchable', 
      'isEditable', 'isUnique', 'group', 'order', 'options', 'validation', 
      'defaultValue', 'metadata'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (['options', 'validation', 'defaultValue', 'metadata'].includes(field)) {
          setClause.push(`"${field}" = $${paramIndex}`);
          values.push(JSON.stringify(body[field]));
        } else {
          setClause.push(`"${field}" = $${paramIndex}`);
          values.push(body[field]);
        }
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No fields to update' }),
      };
    }

    setClause.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(propertyId);

    const updateQuery = `
      UPDATE "Property"
      SET ${setClause.join(', ')}
      WHERE "recordId" = $${paramIndex} AND "tenantId" = $${paramIndex + 1}
      RETURNING *
    `;
    values.push(tenantId);

    const result = await client.query(updateQuery, values);
    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete a custom property
 * System properties cannot be deleted
 */
async function deleteProperty(tenantId, userId, propertyId) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if property exists and is not a system property
    const checkQuery = `
      SELECT "isSystem" FROM "Property"
      WHERE "recordId" = $1 AND "tenantId" = $2
    `;
    const existing = await client.query(checkQuery, [propertyId, tenantId]);

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Property not found' }),
      };
    }

    if (existing.rows[0].isSystem) {
      await client.query('ROLLBACK');
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Cannot delete system properties' }),
      };
    }

    // Delete the property
    const deleteQuery = `
      DELETE FROM "Property"
      WHERE "recordId" = $1 AND "tenantId" = $2
    `;
    await client.query(deleteQuery, [propertyId, tenantId]);

    await client.query('COMMIT');

    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Archive a custom property
 */
async function archiveProperty(tenantId, propertyId, userId) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if property exists and is custom (not system)
    const existing = await client.query(
      'SELECT "isSystem" FROM "Property" WHERE "recordId" = $1 AND "tenantId" = $2',
      [propertyId, tenantId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Property not found' }),
      };
    }

    if (existing.rows[0].isSystem) {
      await client.query('ROLLBACK');
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Cannot archive system properties' }),
      };
    }

    // Archive the property
    const result = await client.query(
      `UPDATE "Property" 
       SET "isArchived" = true, "archivedAt" = NOW(), "archivedBy" = $1
       WHERE "recordId" = $2 AND "tenantId" = $3
       RETURNING *`,
      [userId, propertyId, tenantId]
    );

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Restore an archived property
 */
async function restoreProperty(tenantId, propertyId) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Restore the property
    const result = await client.query(
      `UPDATE "Property" 
       SET "isArchived" = false, "archivedAt" = NULL, "archivedBy" = NULL
       WHERE "recordId" = $1 AND "tenantId" = $2
       RETURNING *`,
      [propertyId, tenantId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Property not found' }),
      };
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

