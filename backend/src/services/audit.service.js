const { forTenant } = require('../lib/tenantPrisma');

const recordAuditEvent = async ({ tenantId, actorId, action, entityType, entityId, diff }) => {
  if (!tenantId || !action || !entityType) {
    return;
  }

  try {
    const db = forTenant(tenantId);
    await db.auditLog.create({
      data: {
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
