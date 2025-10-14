const prisma = require('./src/lib/prisma.js');

async function checkTenants() {
  try {
    await prisma.connectWithRetry();
    
    // Get all tenants
    const tenants = await prisma.tenant.findMany();
    
    console.log(`Total tenants: ${tenants.length}`);
    
    tenants.forEach(tenant => {
      console.log(`\nTenant: ${tenant.name}`);
      console.log(`  ID: ${tenant.id}`);
      console.log(`  Slug: ${tenant.slug}`);
      console.log(`  Plan: ${tenant.plan}`);
      console.log(`  Created: ${tenant.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error checking tenants:', error.message);
  } finally {
    await prisma.disconnect();
  }
}

checkTenants();

