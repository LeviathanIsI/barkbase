require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkRunsTable() {
  const prisma = new PrismaClient();

  try {
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'runs'
    `;

    console.log('Runs table exists:', result.length > 0);

    // Also check if we can query the runs table
    if (result.length > 0) {
      try {
        const runs = await prisma.run.findMany({ take: 1 });
        console.log('Can query runs table:', true, `Found ${runs.length} runs`);
      } catch (err) {
        console.log('Can query runs table:', false, `Error: ${err.message}`);
      }
    }

  } catch (err) {
    console.error('Database error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRunsTable();
