#!/usr/bin/env node
/**
 * Run database migration for AssociationLabel and AssociationInstance tables
 * Automatically fetches credentials from AWS Secrets Manager
 * Usage: node run-associations-migration.js
 */

const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const fs = require('fs');
const path = require('path');

const SECRET_ID = 'Barkbase-dev-db-credentials';
const AWS_REGION = 'us-east-2';

async function getDbCredentials() {
  const client = new SecretsManagerClient({ region: AWS_REGION });
  const command = new GetSecretValueCommand({ SecretId: SECRET_ID });
  const response = await client.send(command);
  return JSON.parse(response.SecretString);
}

async function runMigration() {
  console.log('🔐 Fetching database credentials from AWS Secrets Manager...');
  const creds = await getDbCredentials();
  
  const pool = new Pool({
    host: creds.host,
    port: creds.port,
    database: creds.dbname,
    user: creds.username,
    password: creds.password,
    ssl: { rejectUnauthorized: false }
  });

  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'migrations/005_create_associations_table.sql'),
    'utf8'
  );

  const client = await pool.connect();
  try {
    console.log('🔌 Connected to database:', creds.dbname);
    console.log('📝 Running associations migration...\n');

    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully!');

    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('AssociationLabel', 'AssociationInstance')
    `);
    console.log('\n📊 Tables:', result.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    if (error.code === '42P07' || error.code === '42710') {
      console.log('⚠️  Tables/constraints already exist - migration already ran.');
    } else {
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => { console.log('\n✅ Done!'); process.exit(0); })
  .catch((e) => { console.error('❌ Error:', e.message); process.exit(1); });
