const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

(async () => {
  // Get DB credentials from Secrets Manager
  const secretsClient = new SecretsManagerClient({ region: 'us-east-2' });
  const secretArn = 'arn:aws:secretsmanager:us-east-2:211125574375:secret:Barkbase-dev-db-credentials-VybGGM';
  
  console.log('📦 Fetching DB credentials from Secrets Manager...');
  const secret = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const credentials = JSON.parse(secret.SecretString);
  
  const client = new Client({
    host: 'barkbase-dev-postgresinstance19cdd68a-5zsrc6txjkcq.proxy-ctuea6sg4d0d.us-east-2.rds.amazonaws.com',
    port: 5432,
    database: 'barkbase',
    user: credentials.username,
    password: credentials.password,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database via RDS Proxy\n');

    const migrationFile = 'add-cognito-sub-column.sql';
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


