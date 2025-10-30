/**
 * Expand Phase
 * First phase of Expand-Contract migration pattern
 * Adds new schema elements alongside existing ones (zero downtime)
 */

const { getPool } = require('/opt/nodejs');

/**
 * Execute expand phase for a migration
 * @param {string} migrationId - Migration ID
 * @returns {object} - Execution result
 */
async function execute(migrationId) {
  const pool = getPool();

  console.log(`[Expand Phase] Starting for migration: ${migrationId}`);

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

    // Update migration status
    await client.query(
      `UPDATE "MigrationHistory"
       SET "current_phase" = 'expanding',
           "status" = 'in_progress',
           "expand_started_at" = NOW()
       WHERE "migration_id" = $1`,
      [migrationId]
    );

    // Execute expand script from SchemaVersionRegistry
    const versionResult = await client.query(
      `SELECT "expand_script" FROM "SchemaVersionRegistry"
       WHERE "version_number" = $1`,
      [config.targetVersion]
    );

    if (versionResult.rows.length > 0 && versionResult.rows[0].expand_script) {
      console.log('[Expand Phase] Executing expand script');
      await client.query(versionResult.rows[0].expand_script);
    }

    // Mark expand phase as complete
    await client.query(
      `UPDATE "MigrationHistory"
       SET "expand_completed_at" = NOW()
       WHERE "migration_id" = $1`,
      [migrationId]
    );

    await client.query('COMMIT');

    console.log(`[Expand Phase] Completed for migration: ${migrationId}`);

    return {
      phase: 'expand',
      status: 'completed',
      migrationId,
      message: 'New schema elements added alongside existing ones',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Expand Phase] Error:', error);

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

