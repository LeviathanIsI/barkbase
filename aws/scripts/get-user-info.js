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

  await client.connect();
  
  const userId = process.argv[2] || 'd83ade91-f44d-4591-9e72-0d44c0740843';
  const result = await client.query(
    'SELECT email, name FROM "User" WHERE "recordId" = $1',
    [userId]
  );
  
  if (result.rows.length > 0) {
    console.log(JSON.stringify(result.rows[0], null, 2));
  } else {
    console.log('User not found');
  }
  
  await client.end();
})().catch(console.error);


