const prisma = require('./src/lib/prisma.js');

async function checkSchema() {
  try {
    await prisma.connectWithRetry();
    
    // Check if app schema exists
    const result = await prisma.$queryRaw`SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app'`;
    console.log('App schema exists:', result.length > 0);
    
    // Check current user permissions
    const userResult = await prisma.$queryRaw`SELECT current_user`;
    console.log('Current user:', userResult[0]?.current_user);
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await prisma.disconnect();
  }
}

checkSchema();
