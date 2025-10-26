const { Client } = require('pg');
const bcrypt = require('bcrypt');

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
  
  await client.connect();
  console.log('✅ Connected to database\n');
  
  const TENANT_ID = '4bde2693-9d01-4389-9747-8799d72d7d9c';
  const USER_ID = 'd83ade91-f44d-4591-9e72-0d44c0740843';
  
  // Hash the password
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);
  
  console.log('🔑 Updating user password...');
  
  // Update YOUR existing user with proper password hash
  await client.query(`
    UPDATE "User" 
    SET "passwordHash" = $1, "emailVerified" = true, "isActive" = true
    WHERE "recordId" = $2
  `, [passwordHash, USER_ID]);
  
  // Get user email
  const userResult = await client.query(`
    SELECT "email", "name" FROM "User" WHERE "recordId" = $1
  `, [USER_ID]);
  
  console.log('\n✅ User password updated successfully!\n');
  console.log('═══════════════════════════════════════════════');
  console.log('🔑 TEST LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════');
  console.log(`Email:    ${userResult.rows[0].email}`);
  console.log(`Password: password123`);
  console.log(`Name:     ${userResult.rows[0].name || 'Not set'}`);
  console.log(`User ID:  ${USER_ID}`);
  console.log(`Tenant:   ${TENANT_ID}`);
  console.log('═══════════════════════════════════════════════\n');
  
  await client.end();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});


