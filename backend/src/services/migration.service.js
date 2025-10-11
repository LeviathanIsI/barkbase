const startUpgrade = async ({ tenantId }) => ({
  tenantId,
  mode: 'SUPABASE',
  state: 'COMPLETE',
  startedAt: new Date().toISOString(),
  message: 'Storage already runs on BarkBase Supabase infrastructure.',
});

const validateByo = async () => {
  const error = new Error('Bring-your-own storage is no longer supported.');
  error.statusCode = 400;
  throw error;
};

const executeMigration = async ({ tenantId }) => startUpgrade({ tenantId });

const getStatus = async (tenantId) => ({
  tenantId,
  state: 'COMPLETE',
  updatedAt: new Date().toISOString(),
});

const cancelMigration = async () => ({
  state: 'COMPLETE',
  message: 'No migration in progress.',
});

module.exports = {
  startUpgrade,
  validateByo,
  executeMigration,
  getStatus,
  cancelMigration,
};