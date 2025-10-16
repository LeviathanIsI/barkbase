const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addPetColumns() {
  try {
    console.log('Adding missing Pet table columns...');

    // Add species column
    await prisma.$executeRaw`ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "species" TEXT;`;

    // Add weight column
    await prisma.$executeRaw`ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "weight" FLOAT;`;

    // Add allergies column
    await prisma.$executeRaw`ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "allergies" TEXT;`;

    // Add lastVetVisit column
    await prisma.$executeRaw`ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "lastVetVisit" TIMESTAMP;`;

    // Add nextAppointment column
    await prisma.$executeRaw`ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "nextAppointment" TIMESTAMP;`;

    console.log('✅ Successfully added Pet table columns!');
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addPetColumns();
