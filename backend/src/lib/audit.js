const prisma = require('../config/prisma');

/**
 * Create enhanced audit log entry
 * Tracks what changed (before/after), who did it, when, and from where
 */
const createAuditLog = async ({
  tenantId,
  userId = null,
  entityType,
  entityId,
  action,
  before = null,
  after = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    const changes = {};
    
    if (before !== null) changes.before = before;
    if (after !== null) changes.after = after;

    return await prisma.enhancedAuditLog.create({
      data: {
        tenantId,
        userId,
        entityType,
        entityId,
        action,
        changes,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Log to console but don't fail the operation
    console.error('Failed to create audit log:', error);
    return null;
  }
};

/**
 * Audit log decorator for service methods
 * Usage:
 *   const result = await auditedOperation({
 *     tenantId,
 *     userId,
 *     entityType: 'booking',
 *     action: 'created',
 *     operation: async () => await createBooking(...),
 *     req,
 *   });
 */
const auditedOperation = async ({
  tenantId,
  userId = null,
  entityType,
  entityId = null,
  action,
  operation,
  req = null,
  captureBeforeState = false,
  getEntityId = null,
}) => {
  let before = null;
  
  // Optionally capture before state for updates
  if (captureBeforeState && entityId) {
    try {
      // This would need to be customized per entity type
      // For now, just log that we should capture it
      before = { _note: 'Before state should be captured' };
    } catch (error) {
      console.error('Failed to capture before state:', error);
    }
  }

  // Execute the operation
  const result = await operation();

  // Extract entityId if function provided
  const finalEntityId = entityId || (getEntityId ? getEntityId(result) : null);

  // Create audit log
  await createAuditLog({
    tenantId,
    userId,
    entityType,
    entityId: finalEntityId || 'unknown',
    action,
    before,
    after: result,
    ipAddress: req?.ip || req?.connection?.remoteAddress || null,
    userAgent: req?.headers?.['user-agent'] || null,
  });

  return result;
};

/**
 * Get audit history for an entity
 */
const getAuditHistory = async (tenantId, entityType, entityId, options = {}) => {
  const { limit = 50, offset = 0 } = options;

  return await prisma.enhancedAuditLog.findMany({
    where: {
      tenantId,
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          recordId: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });
};

/**
 * Diff utility to compute changes
 */
const computeChanges = (before, after) => {
  const changes = {};

  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const key of allKeys) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
      changes[key] = {
        from: before?.[key],
        to: after?.[key],
      };
    }
  }

  return changes;
};

module.exports = {
  createAuditLog,
  auditedOperation,
  getAuditHistory,
  computeChanges,
};

