const prisma = require('./src/lib/prisma.js');

async function checkFunctions() {
  try {
    await prisma.connectWithRetry();
    
    // Check if set_tenant_id function exists
    const setTenantResult = await prisma.$queryRaw`SELECT proname FROM pg_proc WHERE proname = 'set_tenant_id'`;
    console.log('set_tenant_id function found:', setTenantResult.length > 0);
    
    // Check if create_membership function exists
    const createMembershipResult = await prisma.$queryRaw`SELECT proname FROM pg_proc WHERE proname = 'create_membership'`;
    console.log('create_membership function found:', createMembershipResult.length > 0);
    
    if (setTenantResult.length === 0 || createMembershipResult.length === 0) {
      console.log('ERROR: Required SQL functions are missing from the database.');
      console.log('These functions are needed for the signup process to work.');
    } else {
      console.log('All required SQL functions are present.');
    }
    
    await prisma.disconnect();
  } catch (error) {
    console.error('Error checking functions:', error.message);
  }
}

checkFunctions();
