/**
 * Contract Phase
 * Final phase of Expand-Contract migration pattern
 * Removes old schema elements after all tenants migrated to new schema
 */

const { getPool } = require('/opt/nodejs');

/**
 * Execute contract phase for a migration
 * @param {string} migrationId - Migration ID
 * @returns {object} - Execution result
 */
async function execute(migrationId) {
  const pool = getPool();

  console.log(`[Contract Phase] Starting for migration: ${migrationId}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get migration configuration
    const migrationResult = await client.query(
      `SELECT * FROM "MigrationHistory" WHERE "migration_id" = $1`,
      [migrationId]
    );

    if (migrationResult.rows.length === 0) {
      throw new Error('Migration not found');
    }

    const migration = migrationResult.rows[0];
    const config = migration.configuration;

    // Verify migrate phase completed
    if (!migration.migrate_completed_at) {
      throw new Error('Migrate phase not completed');
    }

    // Check if all tenants have migrated
    const pendingTenantsResult = await client.query(
      `SELECT COUNT(*) AS pending_count
       FROM "TenantSchemaVersion"
       WHERE "target_schema_version" = $1
         AND "current_schema_version" != "target_schema_version"`,
      [config.targetVersion]
    );

    const pendingCount = parseInt(pendingTenantsResult.rows[0].pending_count, 10);

    if (pendingCount > 0) {
      throw new Error(`${pendingCount} tenants still pending migration. Cannot contract yet.`);
    }

    // Update migration status
    await client.query(
      `UPDATE "MigrationHistory"
       SET "current_phase" = 'contracting',
           "contract_started_at" = NOW()
       WHERE "migration_id" = $1`,
      [migrationId]
    );

    // Execute contract script from SchemaVersionRegistry
    const versionResult = await client.query(
      `SELECT "contract_script" FROM "SchemaVersionRegistry"
       WHERE "version_number" = $1`,
      [config.targetVersion]
    );

    if (versionResult.rows.length > 0 && versionResult.rows[0].contract_script) {
      console.log('[Contract Phase] Executing contract script (removing old schema)');
      await client.query(versionResult.rows[0].contract_script);
    }

    // Mark migration as completed
    await client.query(
      `UPDATE "MigrationHistory"
       SET "status" = 'completed',
           "contract_completed_at" = NOW(),
           "completed_at" = NOW()
       WHERE "migration_id" = $1`,
      [migrationId]
    );

    // Disable rollback for all tenants (migration complete)
    await client.query(
      `UPDATE "TenantSchemaVersion"
       SET "migration_status" = 'completed',
           "rollback_enabled" = false,
           "rollback_window_until" = NULL
       WHERE "current_schema_version" = $1`,
      [config.targetVersion]
    );

    await client.query('COMMIT');

    console.log(`[Contract Phase] Completed for migration: ${migrationId}`);

    return {
      phase: 'contract',
      status: 'completed',
      migrationId,
      message: 'Old schema elements removed, migration fully completed',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Contract Phase] Error:', error);

    // Update migration status to failed
    await pool.query(
      `UPDATE "MigrationHistory"
       SET "status" = 'failed',
           "error_message" = $1
       WHERE "migration_id" = $2`,
      [error.message, migrationId]
    );

    throw error;
  } finally {
    client.release();
  }
}

module.exports = { execute };

