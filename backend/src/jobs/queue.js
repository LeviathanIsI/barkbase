const {
  claimNextJob,
  getRunWithFlow,
  appendRunLog,
  updateRun,
  deleteJob,
  createJob,
  rescheduleJob,
  RUN_STATUS,
} = require('../services/handlerFlow.service');

function claimNext(workerId) {
  return claimNextJob({ workerId });
}

function loadRun({ tenantId, runId }) {
  return getRunWithFlow({ tenantId, runId });
}

function logRunEvent(args) {
  return appendRunLog(args);
}

function updateRunState(args) {
  return updateRun(args);
}

function createFollowUpJob(args) {
  return createJob(args);
}

function removeJob(jobId) {
  return deleteJob(jobId);
}

function scheduleRetry({ jobId, delayMs }) {
  return rescheduleJob({ jobId, delayMs });
}

module.exports = {
  claimNext,
  loadRun,
  logRunEvent,
  updateRunState,
  removeJob,
  createFollowUpJob,
  scheduleRetry,
  RUN_STATUS,
};
