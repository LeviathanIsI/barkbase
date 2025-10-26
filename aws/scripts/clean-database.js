const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: 'barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com',
    port: 5432,
    database: 'barkbase',
    user: 'postgres',
    password: 'd9ZOrLo13E1iAjtUlWN1LiRm.1GZ-s',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🗑️  Deleting all data from all tables...\n');

    // Delete in correct order to respect foreign key constraints
    const tables = [
      'CustomerTagMember',
      'CustomerTag',
      'CustomerSegmentMember',
      'CustomerSegment',
      'run_assignments',
      'runs',
      'messages',
      'Task',
      'Note',
      'Campaign',
      'Communication',
      'IncidentReport',
      'CheckOut',
      'CheckIn',
      'Payment',
      'Vaccination',
      'BookingService',
      'Service',
      'BookingSegment',
      'Booking',
      'Kennel',
      'PetOwner',
      'Pet',
      'Owner',
      'Staff',
      'UsageCounter',
      'AuditLog',
      'EmailVerificationToken',
      'Invite',
      'Membership',
      'User',
      'Tenant'
    ];

    for (const table of tables) {
      const result = await client.query(`DELETE FROM "${table}"`);
      console.log(`  ✓ Deleted ${result.rowCount} rows from ${table}`);
    }

    console.log('\n✅ All data deleted successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();


