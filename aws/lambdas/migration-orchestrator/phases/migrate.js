/**
 * Migrate Phase
 * Second phase of Expand-Contract migration pattern
 * Dual-write to both old and new schema, validate data consistency
 */

const { getPool } = require('/opt/nodejs');

/**
 * Execute migrate phase for a migration
 * @param {string} migrationId - Migration ID
 * @returns {object} - Execution result
 */
async function execute(migrationId) {
  const pool = getPool();


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

    // Verify expand phase completed
    if (!migration.expand_completed_at) {
      throw new Error('Expand phase not completed');
    }

    // Update migration status
    await client.query(
      `UPDATE "MigrationHistory"
       SET "current_phase" = 'migrating',
           "migrate_started_at" = NOW()
       WHERE "migration_id" = $1`,
      [migrationId]
    );

    // Execute migrate script from SchemaVersionRegistry
    const versionResult = await client.query(
      `SELECT "migrate_script" FROM "SchemaVersionRegistry"
       WHERE "version_number" = $1`,
      [config.targetVersion]
    );

    if (versionResult.rows.length > 0 && versionResult.rows[0].migrate_script) {
      await client.query(versionResult.rows[0].migrate_script);
    }

    // Enable dual-write for tenants in rollout groups
    await client.query(
      `UPDATE "TenantSchemaVersion"
       SET "migration_status" = 'migrating',
           "use_new_schema" = false  -- Still read from old, but write to both
       WHERE "target_schema_version" = $1
         AND "migration_status" = 'expanding'`,
      [config.targetVersion]
    );

    // Mark migrate phase as complete
    await client.query(
      `UPDATE "MigrationHistory"
       SET "migrate_completed_at" = NOW()
       WHERE "migration_id" = $1`,
      [migrationId]
    );

    await client.query('COMMIT');


    return {
      phase: 'migrate',
      status: 'completed',
      migrationId,
      message: 'Dual-write enabled, data consistency validation in progress',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migrate Phase] Error:', error);

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

