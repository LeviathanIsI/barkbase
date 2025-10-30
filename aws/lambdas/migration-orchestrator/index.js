/**
 * Migration Orchestrator
 * Orchestrates zero-downtime schema migrations using Expand-Contract pattern
 * Manages staged tenant rollout with monitoring and rollback capabilities
 */

const { getPool } = require('/opt/nodejs');
const expandPhase = require('./phases/expand');
const migratePhase = require('./phases/migrate');
const contractPhase = require('./phases/contract');
const rolloutScheduler = require('./rollout-scheduler');
const rollbackHandler = require('./rollback-handler');

exports.handler = async (event) => {
  console.log('Migration Orchestrator invoked:', JSON.stringify(event, null, 2));

  const { httpMethod: method, path } = event.requestContext.http;
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    // Route: POST /api/v1/migrations/start
    if (method === 'POST' && path.endsWith('/migrations/start')) {
      return await startMigration(body.migrationConfig);
    }

    // Route: POST /api/v1/migrations/{migrationId}/phase/expand
    if (method === 'POST' && path.match(/\/migrations\/[^/]+\/phase\/expand$/)) {
      const migrationId = event.pathParameters.migrationId;
      return await executeExpandPhase(migrationId);
    }

    // Route: POST /api/v1/migrations/{migrationId}/phase/migrate
    if (method === 'POST' && path.match(/\/migrations\/[^/]+\/phase\/migrate$/)) {
      const migrationId = event.pathParameters.migrationId;
      return await executeMigratePhase(migrationId);
    }

    // Route: POST /api/v1/migrations/{migrationId}/phase/contract
    if (method === 'POST' && path.match(/\/migrations\/[^/]+\/phase\/contract$/)) {
      const migrationId = event.pathParameters.migrationId;
      return await executeContractPhase(migrationId);
    }

    // Route: POST /api/v1/migrations/{migrationId}/rollback
    if (method === 'POST' && path.match(/\/migrations\/[^/]+\/rollback$/)) {
      const migrationId = event.pathParameters.migrationId;
      return await rollbackMigration(migrationId, body.reason);
    }

    // Route: GET /api/v1/migrations/{migrationId}/status
    if (method === 'GET' && path.match(/\/migrations\/[^/]+\/status$/)) {
      const migrationId = event.pathParameters.migrationId;
      return await getMigrationStatus(migrationId);
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (error) {
    console.error('Error in migration-orchestrator:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

/**
 * Start a new migration
 */
async function startMigration(config) {
  const pool = getPool();

  // Validate configuration
  if (!config.targetVersion || !config.migrationName) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required configuration' }),
    };
  }

  // Create migration record
  const migrationId = `migration_${Date.now()}`;

  await pool.query(
    `INSERT INTO "MigrationHistory" (
      "migration_id",
      "migration_name",
      "target_version",
      "current_phase",
      "status",
      "started_at",
      "configuration"
    ) VALUES ($1, $2, $3, 'pending', 'started', NOW(), $4)`,
    [migrationId, config.migrationName, config.targetVersion, JSON.stringify(config)]
  );

  // Schedule rollout
  await rolloutScheduler.scheduleRollout(migrationId, config);

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Migration started',
      migrationId,
      targetVersion: config.targetVersion,
      status: 'started',
    }),
  };
}

/**
 * Execute Expand Phase
 */
async function executeExpandPhase(migrationId) {
  const result = await expandPhase.execute(migrationId);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
}

/**
 * Execute Migrate Phase
 */
async function executeMigratePhase(migrationId) {
  const result = await migratePhase.execute(migrationId);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
}

/**
 * Execute Contract Phase
 */
async function executeContractPhase(migrationId) {
  const result = await contractPhase.execute(migrationId);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
}

/**
 * Rollback migration
 */
async function rollbackMigration(migrationId, reason) {
  const result = await rollbackHandler.rollback(migrationId, reason);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
}

/**
 * Get migration status
 */
async function getMigrationStatus(migrationId) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM "MigrationHistory" WHERE "migration_id" = $1`,
    [migrationId]
  );

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Migration not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.rows[0]),
  };
}

