/**
 * Soft Delete Utilities
 * Instead of hard deleting records, we set deletedAt timestamp
 * This prevents "disappeared reservations" issues reported by competitors
 */

/**
 * Soft delete a record
 * Sets deletedAt to current timestamp
 */
const softDelete = async (prismaModel, recordId) => {
  return await prismaModel.update({
    where: { recordId },
    data: { deletedAt: new Date() },
  });
};

/**
 * Restore a soft-deleted record
 * Sets deletedAt back to null
 */
const restore = async (prismaModel, recordId) => {
  return await prismaModel.update({
    where: { recordId },
    data: { deletedAt: null },
  });
};

/**
 * Check if record is soft-deleted
 */
const isDeleted = (record) => {
  return record && record.deletedAt !== null;
};

/**
 * Query filter to exclude soft-deleted records
 * Usage: where: { ...notDeleted(), tenantId }
 */
const notDeleted = () => {
  return { deletedAt: null };
};

/**
 * Query filter to include only soft-deleted records
 * Usage: where: { ...onlyDeleted(), tenantId }
 */
const onlyDeleted = () => {
  return { deletedAt: { not: null } };
};

/**
 * Prisma middleware to automatically filter soft-deleted records
 * Add this to your prisma client setup
 */
const applySoftDeleteMiddleware = (prisma) => {
  // Guard: some environments wrap Prisma or provide a proxy without $use
  if (!prisma || typeof prisma.$use !== 'function') {
    return; // No-op if middleware is not supported in this runtime
  }

  prisma.$use(async (params, next) => {
    // Models that support soft delete
    const softDeleteModels = ['owner', 'pet', 'booking', 'bookingSegment'];

    if (softDeleteModels.includes(params.model?.toLowerCase())) {
      // For findUnique, findFirst, findMany - exclude deleted
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.args.where = params.args.where || {};
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      }

      if (params.action === 'findMany') {
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        } else {
          params.args.where = { deletedAt: null };
        }
      }

      // For count - exclude deleted
      if (params.action === 'count') {
        params.args.where = params.args.where || {};
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      }

      // Convert delete to update (soft delete)
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      }

      // Convert deleteMany to updateMany (soft delete)
      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        params.args.data = { deletedAt: new Date() };
      }
    }

    return next(params);
  });
};

/**
 * Hard delete a record (permanent)
 * Use with extreme caution - this bypasses soft delete
 */
const hardDelete = async (prismaModel, recordId) => {
  console.warn(`HARD DELETE: Permanently deleting ${prismaModel.name} ${recordId}`);
  return await prismaModel.delete({
    where: { recordId },
  });
};

/**
 * Cleanup old soft-deleted records (run as cron job)
 * Permanently deletes records soft-deleted more than X days ago
 */
const cleanupOldDeleted = async (prismaModel, daysOld = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const deleted = await prismaModel.deleteMany({
    where: {
      deletedAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(
    `Permanently deleted ${deleted.count} ${prismaModel.name} records older than ${daysOld} days`
  );

  return deleted.count;
};

module.exports = {
  softDelete,
  restore,
  isDeleted,
  notDeleted,
  onlyDeleted,
  applySoftDeleteMiddleware,
  hardDelete,
  cleanupOldDeleted,
};

