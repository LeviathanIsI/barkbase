const { Client } = require('pg');
const fs = require('fs');

(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'barkbase',
    user: 'postgres',
    password: 'd9ZOrLo13E1iAjtUlWN1LiRm.1GZ-s',
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  await client.connect();
  console.log('Connected to database');
  
  const sql = fs.readFileSync('schema.sql', 'utf8');
  await client.query(sql);
  console.log('Schema created successfully!');
  
  await client.end();
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});