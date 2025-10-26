const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

(async () => {
  const client = new Client({
    host: 'barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com',
    port: 5432,
    database: 'barkbase',
    user: 'postgres',
    password: 'd9ZOrLo13E1iAjtUlWN1LiRm.1GZ-s',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to AWS database\n');

    const migrationFile = process.argv[2] || 'add-cognito-sub-column.sql';
    const migrationPath = path.join(__dirname, migrationFile);
    
    console.log(`📄 Running migration: ${migrationFile}\n`);
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();


