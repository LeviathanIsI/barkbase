const express = require('express');
const analyticsRouter = require('./api/analytics');
const petsRouter = require('./api/pets');
const ownersRouter = require('./api/owners');
const staffRouter = require('./api/staff');
const vaccinationsRouter = require('./api/vaccinations');
const { authMiddleware } = require('./lib/auth');
const { tenantMiddleware } = require('./lib/tenants');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(authMiddleware);
  app.use(tenantMiddleware);

  app.use('/api/v1', analyticsRouter);
  app.use('/api/v1/pets/vaccinations', vaccinationsRouter);
  app.use('/api/v1/pets', petsRouter);
  app.use('/api/v1/owners', ownersRouter);
  app.use('/api/v1/staff', staffRouter);

  return app;
}

module.exports = {
  createApp,
};

