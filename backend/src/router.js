const express = require('express');
const analyticsRouter = require('./api/analytics');
const authRouter = require('./api/auth');
const configRouter = require('./api/config');
const operationsRouter = require('./api/operations');
const profilesRouter = require('./api/profiles');
const usersRouter = require('./api/users');
const tasksRouter = require('./api/features/tasks');
const notesRouter = require('./api/features/notes');
const messagesRouter = require('./api/features/messages');
const communicationsRouter = require('./api/features/communications');
const incidentsRouter = require('./api/features/incidents');
const invitesRouter = require('./api/features/invites');
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

  app.use('/api/v1/pets/vaccinations', vaccinationsRouter);
  app.use('/api/v1/pets', petsRouter);
  app.use('/api/v1/owners', ownersRouter);
  app.use('/api/v1/staff', staffRouter);
  app.use('/api/v1', analyticsRouter);
  app.use('/api/v1', authRouter);
  app.use('/api/v1', configRouter);
  app.use('/api/v1', operationsRouter);
  app.use('/api/v1', usersRouter);
  app.use('/api/v1', profilesRouter);
  app.use('/api/v1', tasksRouter);
  app.use('/api/v1', notesRouter);
  app.use('/api/v1', messagesRouter);
  app.use('/api/v1', communicationsRouter);
  app.use('/api/v1', incidentsRouter);
  app.use('/api/v1', invitesRouter);
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

module.exports = {
  createApp,
};

