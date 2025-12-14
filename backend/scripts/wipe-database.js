/**
 * =============================================================================
 * BarkBase Database Wipe Script
 * =============================================================================
 *
 * Wipes all data from the database EXCEPT the preserved User and Tenant records.
 *
 * CRITICAL PRESERVED RECORDS:
 * - User ID: f6082373-c6f5-45a9-a01d-981d7c060550
 * - Tenant ID: 038db85c-4c00-4547-ba36-616db24151da
 *
 * Usage: npm run db:wipe
 *
 * =============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.development') });
const { Pool } = require('pg');

// CRITICAL: These records must NEVER be deleted
const PRESERVED_USER_ID = 'f6082373-c6f5-45a9-a01d-981d7c060550';
const PRESERVED_TENANT_ID = '038db85c-4c00-4547-ba36-616db24151da';

// Tables in deletion order (children before parents, respecting FK constraints)
const TABLES_TO_WIPE = [
  // Junction/linking tables (no dependencies)
  'BookingPet',
  'PetOwner',
  'RunAssignment',
  'SegmentMember',
  'PackageService',
  'RolePermission',
  'InvoiceLine',
  'PipelineStage',

  // Child tables with foreign keys
  'Message',
  'Conversation',
  'Vaccination',
  'Task',
  'Incident',
  'RunTemplate',
  'EmailTemplate',
  'SavedView',
  'ObjectPreviewLayout',
  'ObjectRecordLayout',
  'ObjectIndexSettings',
  'ObjectStatus',
  'ObjectPipeline',
  'ObjectAssociation',
  'ObjectSettings',
  'Payment',
  'Invoice',
  'Booking',
  'Pet',
  'Owner',
  'Veterinarian',
  'Kennel',
  'Run',
  'Service',
  'Package',
  'Segment',
  'CustomProperty',
  'AuditLog',
  'DeletedRecord',
  'Notification',
  'Import',
  'UserSession',
  'UserRole',

  // Parent tables (need special handling)
  'Role',        // Delete non-default roles
  'User',        // Preserve specific user
  'TenantSettings',
  'Tenant',      // Preserve specific tenant
];

// Tables that reference tenant_id but should be wiped completely
const TENANT_SCOPED_TABLES = [
  'BookingPet',
  'PetOwner',
  'RunAssignment',
  'SegmentMember',
  'PackageService',
  'InvoiceLine',
  'PipelineStage',
  'Message',
  'Conversation',
  'Vaccination',
  'Task',
  'Incident',
  'RunTemplate',
  'EmailTemplate',
  'SavedView',
  'ObjectPreviewLayout',
  'ObjectRecordLayout',
  'ObjectIndexSettings',
  'ObjectStatus',
  'ObjectPipeline',
  'ObjectAssociation',
  'ObjectSettings',
  'Payment',
  'Invoice',
  'Booking',
  'Pet',
  'Owner',
  'Veterinarian',
  'Kennel',
  'Run',
  'Service',
  'Package',
  'Segment',
  'CustomProperty',
  'AuditLog',
  'DeletedRecord',
  'Notification',
  'Import',
  'UserSession',
  'UserRole',
];

async function wipeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('BarkBase Database Wipe Script');
  console.log('='.repeat(60));
  console.log('');
  console.log('PRESERVED RECORDS:');
  console.log(`  User ID:   ${PRESERVED_USER_ID}`);
  console.log(`  Tenant ID: ${PRESERVED_TENANT_ID}`);
  console.log('');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    // Verify preserved records exist
    console.log('Verifying preserved records exist...');

    const userCheck = await client.query(
      'SELECT id, email FROM "User" WHERE id = $1',
      [PRESERVED_USER_ID]
    );

    if (userCheck.rows.length === 0) {
      console.error(`ERROR: Preserved user ${PRESERVED_USER_ID} not found!`);
      process.exit(1);
    }
    console.log(`  Found preserved user: ${userCheck.rows[0].email}`);

    const tenantCheck = await client.query(
      'SELECT id, name FROM "Tenant" WHERE id = $1',
      [PRESERVED_TENANT_ID]
    );

    if (tenantCheck.rows.length === 0) {
      console.error(`ERROR: Preserved tenant ${PRESERVED_TENANT_ID} not found!`);
      process.exit(1);
    }
    console.log(`  Found preserved tenant: ${tenantCheck.rows[0].name}`);
    console.log('');

    // Start transaction
    await client.query('BEGIN');

    // Disable foreign key checks temporarily by deferring constraints
    await client.query('SET CONSTRAINTS ALL DEFERRED');

    console.log('Wiping tables...');
    console.log('-'.repeat(60));

    let totalDeleted = 0;

    for (const table of TABLES_TO_WIPE) {
      try {
        let result;

        if (table === 'User') {
          // Delete all users except the preserved one
          result = await client.query(
            `DELETE FROM "${table}" WHERE id != $1`,
            [PRESERVED_USER_ID]
          );
        } else if (table === 'Tenant') {
          // Delete all tenants except the preserved one
          result = await client.query(
            `DELETE FROM "${table}" WHERE id != $1`,
            [PRESERVED_TENANT_ID]
          );
        } else if (table === 'TenantSettings') {
          // Delete tenant settings except for preserved tenant
          result = await client.query(
            `DELETE FROM "${table}" WHERE tenant_id != $1`,
            [PRESERVED_TENANT_ID]
          );
        } else if (table === 'Role') {
          // Keep system roles (they don't have tenant_id or have special handling)
          result = await client.query(
            `DELETE FROM "${table}" WHERE tenant_id IS NOT NULL AND tenant_id != $1`,
            [PRESERVED_TENANT_ID]
          );
        } else if (table === 'Permission' || table === 'RolePermission') {
          // Skip Permission table - it contains system-level permissions
          // RolePermission links roles to permissions
          result = await client.query(`DELETE FROM "${table}"`);
        } else if (TENANT_SCOPED_TABLES.includes(table)) {
          // Delete all records for this tenant-scoped table
          result = await client.query(`DELETE FROM "${table}"`);
        } else {
          // Generic delete
          result = await client.query(`DELETE FROM "${table}"`);
        }

        if (result.rowCount > 0) {
          console.log(`  ${table}: ${result.rowCount} rows deleted`);
          totalDeleted += result.rowCount;
        }
      } catch (err) {
        if (err.code === '42P01') {
          // Table doesn't exist - skip silently
          console.log(`  ${table}: (table not found, skipping)`);
        } else {
          console.error(`  ${table}: ERROR - ${err.message}`);
        }
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('-'.repeat(60));
    console.log(`Total rows deleted: ${totalDeleted}`);
    console.log('');

    // Verify preserved records still exist
    console.log('Verifying preserved records still exist...');

    const userVerify = await client.query(
      'SELECT id FROM "User" WHERE id = $1',
      [PRESERVED_USER_ID]
    );

    const tenantVerify = await client.query(
      'SELECT id FROM "Tenant" WHERE id = $1',
      [PRESERVED_TENANT_ID]
    );

    if (userVerify.rows.length === 0) {
      console.error('CRITICAL ERROR: Preserved user was deleted!');
      process.exit(1);
    }

    if (tenantVerify.rows.length === 0) {
      console.error('CRITICAL ERROR: Preserved tenant was deleted!');
      process.exit(1);
    }

    console.log('  Preserved user: OK');
    console.log('  Preserved tenant: OK');
    console.log('');
    console.log('Database wipe completed successfully!');
    console.log('='.repeat(60));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('ERROR: Database wipe failed!');
    console.error(err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the wipe
wipeDatabase().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
