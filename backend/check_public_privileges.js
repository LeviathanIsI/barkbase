const prisma = require('./src/lib/prisma.js');

async function checkPublicPrivileges() {
  try {
    await prisma.connectWithRetry();
    
    // Check app_user permissions on public schema
    const result = await prisma.$queryRaw`SELECT has_schema_privilege('app_user', 'public', 'create') as has_create`;
    console.log('Public schema create privilege:', result[0]);
    
  } catch (error) {
    console.error('Error checking privileges:', error.message);
  } finally {
    await prisma.disconnect();
  }
}

checkPublicPrivileges();
