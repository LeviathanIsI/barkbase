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
  
  const result = await client.query(
    'SELECT "recordId", email, name, "cognitoSub" FROM "User" ORDER BY "createdAt" DESC LIMIT 10'
  );
  
  console.log(JSON.stringify(result.rows, null, 2));
  
  await client.end();
})().catch(console.error);


