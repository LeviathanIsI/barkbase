#!/usr/bin/env node
/**
 * Run database migration for Package tables
 * Usage: node run-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read database credentials
const dbCredsPath = path.join(__dirname, '../../db_creds.txt');
const dbCreds = JSON.parse(fs.readFileSync(dbCredsPath, 'utf8'));

// Read migration SQL
const migrationSQL = fs.readFileSync(
  path.join(__dirname, 'schema-package-addition.sql'),
  'utf8'
);

// Create connection pool
const pool = new Pool({
  host: dbCreds.host,
  port: dbCreds.port,
  database: dbCreds.dbname,
  user: dbCreds.username,
  password: dbCreds.password,
  ssl: {
    rejectUnauthorized: false // AWS RDS requires SSL
  }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔌 Connected to database:', dbCreds.dbname);
    console.log('📝 Running migration...\n');

    // Run the migration SQL
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\nPackage and PackageService tables created.');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Package', 'PackageService')
      ORDER BY table_name
    `);

    console.log('\n📊 Tables created:');
    result.rows.forEach(row => {
      console.log('  ✓', row.table_name);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('\n⚠️  Tables already exist. This is OK if you already ran the migration.');
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
