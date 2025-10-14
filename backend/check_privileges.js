const prisma = require('./src/lib/prisma.js');

async function checkPrivileges() {
  try {
    await prisma.connectWithRetry();
    
    // Check app_user permissions on app schema
    const result = await prisma.$queryRaw`SELECT has_schema_privilege('app_user', 'app', 'usage') as has_usage, has_schema_privilege('app_user', 'app', 'create') as has_create`;
    console.log('Schema privileges:', result[0]);
    
  } catch (error) {
    console.error('Error checking privileges:', error.message);
  } finally {
    await prisma.disconnect();
  }
}

checkPrivileges();
