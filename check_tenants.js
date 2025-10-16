const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve('./backend/.env') });

const { PrismaClient } = require('./backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const tenants = await prisma.tenant.findMany();
    console.log('Current tenants in database:');
    tenants.forEach(tenant => {
      console.log(`- ID: ${tenant.recordId}, Slug: ${tenant.slug}, Name: ${tenant.name}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
