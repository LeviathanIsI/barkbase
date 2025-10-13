// node scripts/db-smoke.js
require('dotenv').config();
const prisma = require('../src/lib/prisma');

(async () => {
  try {
    const now = await prisma.$queryRaw`select now() as now`;
    console.log('DB OK:', now[0].now);
  } catch (e) {
    console.error('DB FAIL:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
