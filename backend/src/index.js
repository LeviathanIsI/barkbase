const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { initSocket } = require('./lib/socket');
const { scheduleVaccinationReminders } = require('./jobs/vaccinationReminders');

const server = http.createServer(app);
initSocket(server);
scheduleVaccinationReminders();

server.listen(env.port, env.host, () => {
  logger.info({ port: env.port, host: env.host }, 'API server started');
});
