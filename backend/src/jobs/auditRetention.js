const cron = require('node-cron');
const { subDays } = require('date-fns');
const prisma = require('../config/prisma');
const { resolveTenantFeatures } = require('../lib/features');
const logger = require('../utils/logger');

const resolveCutoffDate = (retentionDays) => {
  if (retentionDays === undefined || retentionDays === null) {
    return null;
  }
  if (!Number.isFinite(retentionDays)) {
    return null;
  }
  if (retentionDays <= 0) {
    return new Date();
  }
  return subDays(new Date(), retentionDays);
};

const scheduleAuditRetentionJob = () => {
  cron.schedule('30 2 * * *', async () => {
    try {
      const tenants = await prisma.tenant.findMany({
        select: {
          id: true,
          plan: true,
          featureFlags: true,
        },
      });

      for (const tenant of tenants) {
        const features = resolveTenantFeatures(tenant);
        const retentionDays = features.auditRetentionDays;
        const cutoff = resolveCutoffDate(retentionDays);
        if (!cutoff) {
          continue;
        }

        await prisma.auditLog.deleteMany({
          where: {
            tenantId: tenant.id,
            createdAt: {
              lt: cutoff,
            },
          },
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to enforce audit log retention policy');
    }
  });
};

module.exports = {
  scheduleAuditRetentionJob,
};
