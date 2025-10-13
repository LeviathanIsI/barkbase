const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const prisma = require('../src/lib/prisma');
const { getConnectionInfo } = require('../src/config/databaseUrl');

(async () => {
  const meta = getConnectionInfo();
  let exitCode = 0;
  try {
    await prisma.connectWithRetry();
    const healthy = await prisma.healthCheck();
    if (healthy) {
      console.log(`DB PASS ${meta.host}:${meta.port} (pooler=${meta.isPooler})`);
    } else {
      console.error(`DB FAIL ${meta.host}:${meta.port} (pooler=${meta.isPooler})`);
      exitCode = 1;
    }
  } catch (error) {
    console.error(
      `DB FAIL ${meta.host}:${meta.port} (pooler=${meta.isPooler}) - ${error.message}`,
    );
    exitCode = 1;
  } finally {
    await prisma.disconnect();
    process.exit(exitCode);
  }
})();
