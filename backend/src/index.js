const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { initSocket } = require('./lib/socket');
const { scheduleVaccinationReminders } = require('./jobs/vaccinationReminders');
const { scheduleStorageMaintenance } = require('./jobs/storageMaintenance');
const { scheduleAuditRetentionJob } = require('./jobs/auditRetention');

const server = http.createServer(app);
initSocket(server);
scheduleVaccinationReminders();
scheduleStorageMaintenance();
scheduleAuditRetentionJob();

server.listen(env.port, env.host, () => {
  logger.info({ port: env.port, host: env.host }, 'API server started');
});
