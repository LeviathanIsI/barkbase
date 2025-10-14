const prisma = require('./src/lib/prisma.js');

async function checkUsers() {
  try {
    await prisma.connectWithRetry();
    
    // Get all users with their memberships
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            tenant: true
          }
        }
      }
    });
    
    console.log(`Total users: ${users.length}`);
    
    users.forEach(user => {
      console.log(`\nUser: ${user.email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Email Verified: ${user.emailVerified}`);
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Memberships: ${user.memberships.length}`);
      
      if (user.memberships.length > 0) {
        user.memberships.forEach(membership => {
          console.log(`    - Tenant: ${membership.tenant.name} (${membership.tenant.slug})`);
          console.log(`      Role: ${membership.role}`);
        });
      } else {
        console.log('    - No memberships found!');
      }
    });
    
  } catch (error) {
    console.error('Error checking users:', error.message);
  } finally {
    await prisma.disconnect();
  }
}

checkUsers();

