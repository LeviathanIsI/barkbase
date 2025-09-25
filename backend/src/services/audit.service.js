const prisma = require('../config/prisma');

const recordAuditEvent = async ({ tenantId, actorId, action, entityType, entityId, diff }) => {
  if (!tenantId || !action || !entityType) {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: actorId ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        diff: diff ?? null,
      },
    });
  } catch (error) {
    // swallow audit failures to avoid impacting main flow
  }
};

module.exports = {
  recordAuditEvent,
};
