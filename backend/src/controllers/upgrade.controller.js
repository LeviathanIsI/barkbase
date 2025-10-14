const migrationService = require('../services/migration.service');

const start = async (req, res, next) => {
  try {
    const info = await migrationService.startUpgrade({
      tenantId: req.tenantId,
      actorId: req.user?.recordId ?? null,
    });
    return res.status(200).json(info);
  } catch (error) {
    return next(error);
  }
};

const execute = async (req, res, next) => {
  try {
    const { confirm } = req.body ?? {};
    const result = await migrationService.executeMigration({ tenantId: req.tenantId, confirm });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
};

const status = async (req, res, next) => {
  try {
    const payload = await migrationService.getStatus(req.tenantId);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const payload = await migrationService.cancelMigration(req.tenantId);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  start,
  execute,
  status,
  cancel,
};
