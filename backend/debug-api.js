require('dotenv').config({ path: '.env.development' });
const express = require('express');
const { initPool, getPool } = require('./src/lib/db');
const { authMiddleware } = require('./src/lib/auth');
const { tenantMiddleware } = require('./src/lib/tenants');
const workflowsRouter = require('./src/api/workflows');

async function start() {
  await initPool();
  console.log('[DB] Pool initialized');
  
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use(tenantMiddleware);
  app.use('/api/v1', workflowsRouter);
  
  // Add error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message });
  });
  
  app.listen(4001, () => {
    console.log('Debug server on 4001');
  });
}

start().catch(console.error);
