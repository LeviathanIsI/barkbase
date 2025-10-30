/**
 * Rollout Scheduler
 * Manages staged tenant rollout across four groups
 * Groups: Internal (1-2), Beta (10%), Standard (70%), Enterprise (20%)
 */

const { getPool } = require('/opt/nodejs');

/**
 * Schedule staged rollout for a migration
 * @param {string} migrationId - Migration ID
 * @param {object} config - Migration configuration
 */
async function scheduleRollout(migrationId, config) {
  const pool = getPool();

  console.log(`[Rollout Scheduler] Scheduling rollout for migration: ${migrationId}`);

  // Get tenants by rollout group
  const groupsResult = await pool.query(
    `SELECT 
      "rollout_group",
      COUNT(*) AS tenant_count,
      array_agg("tenant_id") AS tenant_ids
    FROM "TenantSchemaVersion"
    WHERE "migration_status" = 'current'
    GROUP BY "rollout_group"
    ORDER BY 
      CASE "rollout_group"
        WHEN 'internal' THEN 1
        WHEN 'beta' THEN 2
        WHEN 'standard' THEN 3
        WHEN 'enterprise' THEN 4
      END`
  );

  const rolloutPlan = [];

  for (const group of groupsResult.rows) {
    rolloutPlan.push({
      group: group.rollout_group,
      tenantCount: group.tenant_count,
      tenantIds: group.tenant_ids,
      scheduledStart: calculateRolloutStart(group.rollout_group),
      monitoringPeriod: getMonitoringPeriod(group.rollout_group),
    });
  }

  // Store rollout plan
  await pool.query(
    `UPDATE "MigrationHistory"
     SET "rollout_plan" = $1
     WHERE "migration_id" = $2`,
    [JSON.stringify(rolloutPlan), migrationId]
  );

  console.log(`[Rollout Scheduler] Rollout plan created:`, rolloutPlan);

  return rolloutPlan;
}

/**
 * Calculate when each group should start
 */
function calculateRolloutStart(group) {
  const now = new Date();

  switch (group) {
    case 'internal':
      // Start immediately
      return now.toISOString();
    case 'beta':
      // Start 24 hours after internal
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case 'standard':
      // Start 72 hours after internal (48 hours after beta)
      return new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
    case 'enterprise':
      // Start 120 hours after internal (48 hours after standard)
      return new Date(now.getTime() + 120 * 60 * 60 * 1000).toISOString();
    default:
      return now.toISOString();
  }
}

/**
 * Get monitoring period for each group
 */
function getMonitoringPeriod(group) {
  switch (group) {
    case 'internal':
      return '24 hours';
    case 'beta':
      return '48 hours';
    case 'standard':
      return '48 hours';
    case 'enterprise':
      return '72 hours';
    default:
      return '24 hours';
  }
}

/**
 * Execute rollout for a specific group
 * @param {string} migrationId - Migration ID
 * @param {string} groupName - Rollout group name
 */
async function executeRolloutForGroup(migrationId, groupName) {
  const pool = getPool();

  console.log(`[Rollout Scheduler] Executing rollout for group: ${groupName}`);

  // Get migration config
  const migrationResult = await pool.query(
    `SELECT * FROM "MigrationHistory" WHERE "migration_id" = $1`,
    [migrationId]
  );

  if (migrationResult.rows.length === 0) {
    throw new Error('Migration not found');
  }

  const migration = migrationResult.rows[0];
  const targetVersion = migration.configuration.targetVersion;

  // Update tenants in this group
  await pool.query(
    `UPDATE "TenantSchemaVersion"
     SET "target_schema_version" = $1,
         "migration_status" = 'expanding',
         "migration_started_at" = NOW(),
         "rollback_window_until" = NOW() + INTERVAL '30 minutes',
         "rollback_enabled" = true
     WHERE "rollout_group" = $2
       AND "migration_status" = 'current'`,
    [targetVersion, groupName]
  );

  // Log rollout execution
  await pool.query(
    `INSERT INTO "MigrationRolloutLog" (
      "migration_id",
      "rollout_group",
      "executed_at",
      "status"
    ) VALUES ($1, $2, NOW(), 'started')`,
    [migrationId, groupName]
  );

  console.log(`[Rollout Scheduler] Rollout executed for group: ${groupName}`);
}

/**
 * Monitor rollout health for a group
 * @param {string} migrationId - Migration ID
 * @param {string} groupName - Rollout group name
 * @returns {object} - Health metrics
 */
async function monitorRolloutHealth(migrationId, groupName) {
  const pool = getPool();

  // Get error rate and health status for tenants in this group
  const healthResult = await pool.query(
    `SELECT 
      COUNT(*) AS total_tenants,
      COUNT(*) FILTER (WHERE "health_check_passed" = false) AS unhealthy_count,
      AVG("error_rate") AS avg_error_rate,
      MAX("error_rate") AS max_error_rate
    FROM "TenantSchemaVersion"
    WHERE "rollout_group" = $1
      AND "migration_status" IN ('expanding', 'migrating')`,
    [groupName]
  );

  const health = healthResult.rows[0];
  const healthScore = calculateHealthScore(health);

  // Auto-rollback if health is critical
  if (healthScore < 0.5) {
    console.error(`[Rollout Scheduler] CRITICAL: Health score ${healthScore} for group ${groupName}`);
    // Trigger auto-rollback
    await triggerAutoRollback(migrationId, groupName, 'Critical health score');
  }

  return {
    group: groupName,
    totalTenants: parseInt(health.total_tenants, 10),
    unhealthyCount: parseInt(health.unhealthy_count, 10),
    avgErrorRate: parseFloat(health.avg_error_rate) || 0,
    maxErrorRate: parseFloat(health.max_error_rate) || 0,
    healthScore,
  };
}

/**
 * Calculate health score (0-1)
 */
function calculateHealthScore(health) {
  const totalTenants = parseInt(health.total_tenants, 10) || 1;
  const unhealthyCount = parseInt(health.unhealthy_count, 10) || 0;
  const avgErrorRate = parseFloat(health.avg_error_rate) || 0;

  // Health = (1 - unhealthy ratio) * (1 - error rate ratio)
  const healthRatio = 1 - (unhealthyCount / totalTenants);
  const errorRatio = 1 - Math.min(avgErrorRate / 100, 1);

  return healthRatio * errorRatio;
}

/**
 * Trigger auto-rollback for a group
 */
async function triggerAutoRollback(migrationId, groupName, reason) {
  const pool = getPool();

  console.log(`[Rollout Scheduler] Auto-rollback triggered for group: ${groupName}`);

  // Rollback all tenants in this group
  await pool.query(
    `UPDATE "TenantSchemaVersion"
     SET "current_schema_version" = "previous_schema_version",
         "target_schema_version" = NULL,
         "migration_status" = 'rolled_back',
         "rollback_reason" = $1,
         "use_new_schema" = false
     WHERE "rollout_group" = $2
       AND "migration_status" IN ('expanding', 'migrating')`,
    [reason, groupName]
  );

  // Log rollback
  await pool.query(
    `UPDATE "MigrationRolloutLog"
     SET "status" = 'rolled_back',
         "rollback_reason" = $1,
         "rolled_back_at" = NOW()
     WHERE "migration_id" = $2
       AND "rollout_group" = $3`,
    [reason, migrationId, groupName]
  );
}

module.exports = {
  scheduleRollout,
  executeRolloutForGroup,
  monitorRolloutHealth,
};

