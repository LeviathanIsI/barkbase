const { recordAuditEvent } = require('../services/audit.service');

const auditLogger = (action, entityType, entityIdSelector, diffSelector) => async (req, _res, next) => {
  resOnFinish(req, _res, async () => {
    const tenantId = req.tenantId;
    const actorId = req.user?.id ?? null;
    if (!tenantId) {
      return;
    }

    const entityId = typeof entityIdSelector === 'function' ? entityIdSelector(req) : entityIdSelector;
    const diff = typeof diffSelector === 'function' ? diffSelector(req) : diffSelector;

    await recordAuditEvent({ tenantId, actorId, action, entityType, entityId, diff });
  });
  next();
};

const resOnFinish = (req, res, callback) => {
  const handler = async () => {
    res.removeListener('finish', handler);
    res.removeListener('close', handler);
    if (res.statusCode >= 200 && res.statusCode < 400) {
      await callback(req, res);
    }
  };

  res.on('finish', handler);
  res.on('close', handler);
};

module.exports = {
  auditLogger,
};
