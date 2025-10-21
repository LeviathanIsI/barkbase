require('dotenv').config();
const { Pool } = require('pg');

// --- Configuration ---
const SOURCE_DB_URL = process.env.SUPABASE_DB_URL;
const TARGET_DB_URL = process.env.RDS_DB_URL;

// The order in which to migrate tables to respect foreign key constraints.
// Parent tables must come before child tables.
const TABLE_MIGRATION_ORDER = [
  // Core Tenant and User tables
  'Tenant',
  'User',
  'Membership',
  'Staff',
  
  // CRM Core
  'Owner',
  'Pet',
  'PetOwner',
  
  // Booking Core
  'Kennel',
  'Booking',
  'BookingSegment',
  'Service',
  'BookingService',

  // Health & Safety
  'Vaccination',
  'IncidentReport',
  
  // Financial
  'Payment',

  // Operations
  'CheckIn',
  'CheckOut', // Depends on IncidentReport
  'Task',
  'Run', // Mapped to 'runs'
  'RunAssignment', // Mapped to 'run_assignments'

  // Communications & Notes
  'Communication',
  'Note',
  'Message', // Mapped to 'messages'

  // Advanced CRM / Marketing
  'CustomerTag',
  'CustomerTagMember',
  'CustomerSegment',
  'CustomerSegmentMember',
  'Campaign',
  
  // System / Meta
  'Invite',
  'EmailVerificationToken',
  'AuditLog',
  'UsageCounter',
];

// --- Database Clients ---
const sourcePool = new Pool({ connectionString: SOURCE_DB_URL });
const targetPool = new Pool({ connectionString: TARGET_DB_URL });

async function migrateTable(tableName) {
    const sourceClient = await sourcePool.connect();
    const targetClient = await targetPool.connect();
    
    console.log(`🚀 Starting migration for table: ${tableName}`);

    try {
        // Get all data from the source table
        const { rows } = await sourceClient.query(`SELECT * FROM "${tableName}"`);
        if (rows.length === 0) {
            console.log(`- No data to migrate for ${tableName}.`);
            return;
        }

        console.log(`- Found ${rows.length} rows to migrate.`);

        // Temporarily disable triggers on the target table to avoid issues with updatedAt, etc.
        await targetClient.query(`ALTER TABLE "${tableName}" DISABLE TRIGGER ALL;`);

        // Insert all rows into the target table
        // This is a simplified approach. For large tables, batching is required.
        for (const row of rows) {
            const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
            const values = Object.values(row);
            const valuePlaceholders = values.map((_, i) => `$${i + 1}`).join(', ');
            
            const query = `INSERT INTO "${tableName}" (${columns}) VALUES (${valuePlaceholders}) ON CONFLICT ("recordId") DO NOTHING`;
            await targetClient.query(query, values);
        }

        // Re-enable triggers
        await targetClient.query(`ALTER TABLE "${tableName}" ENABLE TRIGGER ALL;`);

        console.log(`✅ Successfully migrated ${rows.length} rows for table: ${tableName}`);

    } catch (error) {
        console.error(`❌ Error migrating table ${tableName}:`, error);
        throw error; // Stop the migration on any error
    } finally {
        sourceClient.release();
        targetClient.release();
    }
}

async function runMigration() {
    console.log('--- Starting Data Migration ---');
    
    if (!SOURCE_DB_URL || !TARGET_DB_URL) {
        throw new Error('SUPABASE_DB_URL and RDS_DB_URL must be set in your .env file.');
    }

    for (const tableName of TABLE_MIGRATION_ORDER) {
        await migrateTable(tableName);
    }

    console.log('--- Data Migration Complete ---');
    await sourcePool.end();
    await targetPool.end();
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
