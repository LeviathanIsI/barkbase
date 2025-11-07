/**
 * Schema Version Service
 * Manages tenant schema versions for zero-downtime migrations
 * Implements version tracking, compatibility checks, and migration orchestration
 */

const { getPool } = require('/opt/nodejs');
const { getTenantIdFromEvent } = require('/opt/nodejs');

exports.handler = async (event) => {

  const { httpMethod: method, path } = event.requestContext.http;
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};

  // Extract tenant context (admin endpoints may not have tenant)
  const tenantId = await getTenantIdFromEvent(event);

  // Extract user ID
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  const userId = claims['sub'] || 'system';

  try {
    // Route: GET /api/v1/schema-versions
    if (method === 'GET' && path.endsWith('/schema-versions')) {
      return await listSchemaVersions();
    }

    // Route: GET /api/v1/schema-versions/{version}
    if (method === 'GET' && path.match(/\/schema-versions\/\d+$/)) {
      const version = parseInt(pathParams.version, 10);
      return await getSchemaVersion(version);
    }

    // Route: GET /api/v1/tenants/{tenantId}/schema-version
    if (method === 'GET' && path.match(/\/tenants\/\d+\/schema-version$/)) {
      const tenantIdParam = parseInt(pathParams.tenantId, 10);
      return await getTenantSchemaVersion(tenantIdParam);
    }

    // Route: POST /api/v1/tenants/{tenantId}/schema-version/upgrade
    if (method === 'POST' && path.match(/\/tenants\/\d+\/schema-version\/upgrade$/)) {
      const tenantIdParam = parseInt(pathParams.tenantId, 10);
      return await initiateUpgrade(tenantIdParam, body.targetVersion, userId);
    }

    // Route: POST /api/v1/tenants/{tenantId}/schema-version/rollback
    if (method === 'POST' && path.match(/\/tenants\/\d+\/schema-version\/rollback$/)) {
      const tenantIdParam = parseInt(pathParams.tenantId, 10);
      return await rollbackUpgrade(tenantIdParam, body.reason, userId);
    }

    // Route: GET /api/v1/migration-status
    if (method === 'GET' && path.endsWith('/migration-status')) {
      return await getMigrationStatus();
    }

    // Route: GET /api/v1/tenants/{tenantId}/compatibility
    if (method === 'GET' && path.match(/\/tenants\/\d+\/compatibility$/)) {
      const tenantIdParam = parseInt(pathParams.tenantId, 10);
      return await checkCompatibility(tenantIdParam, queryParams.targetVersion);
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (error) {
    console.error('Error in schema-version-service:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

/**
 * List all schema versions
 */
async function listSchemaVersions() {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM "SchemaVersionRegistry"
     WHERE "is_active" = true
     ORDER BY "version_number" DESC`
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.rows),
  };
}

/**
 * Get specific schema version details
 */
async function getSchemaVersion(version) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM "SchemaVersionRegistry"
     WHERE "version_number" = $1`,
    [version]
  );

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Schema version not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.rows[0]),
  };
}

/**
 * Get tenant's current schema version
 */
async function getTenantSchemaVersion(tenantId) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT 
      tsv.*,
      current_ver."version_name" AS current_version_name,
      target_ver."version_name" AS target_version_name
    FROM "TenantSchemaVersion" tsv
    LEFT JOIN "SchemaVersionRegistry" current_ver 
      ON tsv."current_schema_version" = current_ver."version_number"
    LEFT JOIN "SchemaVersionRegistry" target_ver 
      ON tsv."target_schema_version" = target_ver."version_number"
    WHERE tsv."tenant_id" = $1`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Tenant schema version not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.rows[0]),
  };
}

/**
 * Initiate schema version upgrade
 */
async function initiateUpgrade(tenantId, targetVersion, userId) {
  const pool = getPool();

  // Validate target version exists
  const versionResult = await pool.query(
    `SELECT * FROM "SchemaVersionRegistry"
     WHERE "version_number" = $1 AND "is_active" = true`,
    [targetVersion]
  );

  if (versionResult.rows.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Target version not found or inactive' }),
    };
  }

  // Get current tenant version
  const tenantResult = await pool.query(
    `SELECT * FROM "TenantSchemaVersion" WHERE "tenant_id" = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Tenant not found' }),
    };
  }

  const currentVersion = tenantResult.rows[0].current_schema_version;

  // Validate upgrade path
  if (targetVersion <= currentVersion) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Target version must be higher than current version',
        currentVersion,
        targetVersion,
      }),
    };
  }

  // Check compatibility
  const compatResult = await pool.query(
    `SELECT "compatible_with_versions" FROM "SchemaVersionRegistry"
     WHERE "version_number" = $1`,
    [targetVersion]
  );

  const compatibleVersions = compatResult.rows[0].compatible_with_versions || [];
  if (!compatibleVersions.includes(currentVersion)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Incompatible version upgrade path',
        currentVersion,
        targetVersion,
        compatibleVersions,
      }),
    };
  }

  // Schedule upgrade
  await pool.query(
    `UPDATE "TenantSchemaVersion"
     SET "target_schema_version" = $1,
         "migration_status" = 'pending',
         "migration_scheduled_at" = NOW(),
         "updated_at" = NOW(),
         "updated_by" = $2
     WHERE "tenant_id" = $3`,
    [targetVersion, userId, tenantId]
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Schema upgrade scheduled',
      tenantId,
      currentVersion,
      targetVersion,
      status: 'pending',
    }),
  };
}

/**
 * Rollback schema upgrade
 */
async function rollbackUpgrade(tenantId, reason, userId) {
  const pool = getPool();

  // Get current migration status
  const tenantResult = await pool.query(
    `SELECT * FROM "TenantSchemaVersion" WHERE "tenant_id" = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Tenant not found' }),
    };
  }

  const tenant = tenantResult.rows[0];

  // Check if rollback is allowed
  if (!tenant.rollback_enabled) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Rollback not enabled for this tenant',
        reason: 'Rollback window expired or migration completed',
      }),
    };
  }

  if (tenant.rollback_window_until && new Date(tenant.rollback_window_until) < new Date()) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Rollback window expired',
        windowExpired: tenant.rollback_window_until,
      }),
    };
  }

  // Execute rollback
  await pool.query(
    `UPDATE "TenantSchemaVersion"
     SET "current_schema_version" = "previous_schema_version",
         "target_schema_version" = NULL,
         "migration_status" = 'rolled_back',
         "rollback_reason" = $1,
         "rollback_enabled" = false,
         "rollback_window_until" = NULL,
         "updated_at" = NOW(),
         "updated_by" = $2,
         "use_new_schema" = false
     WHERE "tenant_id" = $3`,
    [reason, userId, tenantId]
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Schema upgrade rolled back successfully',
      tenantId,
      rolledBackTo: tenant.previous_schema_version,
      reason,
    }),
  };
}

/**
 * Get migration status dashboard
 */
async function getMigrationStatus() {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM "MigrationStatusDashboard"
     ORDER BY "rollout_priority", "migration_started_at"`
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.rows),
  };
}

/**
 * Check compatibility for upgrade
 */
async function checkCompatibility(tenantId, targetVersion) {
  const pool = getPool();

  // Get current version
  const tenantResult = await pool.query(
    `SELECT "current_schema_version" FROM "TenantSchemaVersion"
     WHERE "tenant_id" = $1`,
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Tenant not found' }),
    };
  }

  const currentVersion = tenantResult.rows[0].current_schema_version;

  // Get compatibility info
  const compatResult = await pool.query(
    `SELECT 
      "version_number",
      "version_name",
      "compatible_with_versions",
      "breaking_changes",
      "requires_app_version"
    FROM "SchemaVersionRegistry"
    WHERE "version_number" = $1`,
    [targetVersion]
  );

  if (compatResult.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Target version not found' }),
    };
  }

  const targetVersionInfo = compatResult.rows[0];
  const isCompatible = targetVersionInfo.compatible_with_versions.includes(currentVersion);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentVersion,
      targetVersion: parseInt(targetVersion, 10),
      isCompatible,
      targetVersionInfo,
    }),
  };
}

