const { forTenant } = require('../lib/tenantPrisma');
const { AppError } = require('../utils/errors');
const { addDays, subDays } = require('date-fns');

/**
 * Evaluate segment conditions for automatic segments
 */
const evaluateSegmentConditions = async (tenantDb, conditions) => {
  const where = { tenantId: conditions.tenantId };
  const include = {};

  // Build query based on conditions
  if (conditions.type === 'vip') {
    // VIP customers - high lifetime value
    const thirtyDaysAgo = subDays(new Date(), 30);
    const ownerIds = await tenantDb.payment.groupBy({
      by: ['ownerId'],
      where: {
        tenantId: conditions.tenantId,
        status: 'CAPTURED',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        amountCents: true,
      },
      having: {
        amountCents: {
          _sum: {
            gte: conditions.minValue || 100000, // $1000 default
          },
        },
      },
    });
    return ownerIds.map((o) => o.ownerId);
  }

  if (conditions.type === 'at_risk') {
    // At risk - no bookings in last 90 days but had bookings before
    const ninetyDaysAgo = subDays(new Date(), 90);
    const activeOwners = await tenantDb.booking.findMany({
      where: {
        tenantId: conditions.tenantId,
        createdAt: {
          gte: ninetyDaysAgo,
        },
      },
      select: {
        ownerId: true,
      },
      distinct: ['ownerId'],
    });

    const activeOwnerIds = activeOwners.map((o) => o.ownerId);

    const atRiskOwners = await tenantDb.owner.findMany({
      where: {
        tenantId: conditions.tenantId,
        recordId: {
          notIn: activeOwnerIds,
        },
        bookings: {
          some: {}, // Has at least one booking ever
        },
      },
      select: {
        recordId: true,
      },
    });

    return atRiskOwners.map((o) => o.recordId);
  }

  if (conditions.type === 'new') {
    // New customers - created in last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const newOwners = await tenantDb.owner.findMany({
      where: {
        tenantId: conditions.tenantId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        recordId: true,
      },
    });
    return newOwners.map((o) => o.recordId);
  }

  if (conditions.type === 'frequent') {
    // Frequent customers - more than X bookings in last 90 days
    const ninetyDaysAgo = subDays(new Date(), 90);
    const frequentOwners = await tenantDb.booking.groupBy({
      by: ['ownerId'],
      where: {
        tenantId: conditions.tenantId,
        createdAt: {
          gte: ninetyDaysAgo,
        },
      },
      _count: {
        recordId: true,
      },
      having: {
        recordId: {
          _count: {
            gte: conditions.minBookings || 3,
          },
        },
      },
    });
    return frequentOwners.map((o) => o.ownerId);
  }

  // Custom conditions
  if (conditions.customQuery) {
    const owners = await tenantDb.owner.findMany({
      where: conditions.customQuery,
      select: {
        recordId: true,
      },
    });
    return owners.map((o) => o.recordId);
  }

  return [];
};

/**
 * Create a customer segment
 */
const createSegment = async (tenantId, data) => {
  const tenantDb = forTenant(tenantId);

  // Check if segment name already exists
  const existing = await tenantDb.customerSegment.findFirst({
    where: {
      tenantId,
      name: data.name,
    },
  });

  if (existing) {
    throw new AppError('Segment with this name already exists', 400);
  }

  const segment = await tenantDb.customerSegment.create({
    data: {
      ...data,
      tenantId,
    },
  });

  // If automatic, populate members immediately
  if (segment.isAutomatic && segment.conditions) {
    const ownerIds = await evaluateSegmentConditions(tenantDb, {
      ...segment.conditions,
      tenantId,
    });

    if (ownerIds.length > 0) {
      await tenantDb.customerSegmentMember.createMany({
        data: ownerIds.map((ownerId) => ({
          tenantId,
          segmentId: segment.recordId,
          ownerId,
        })),
        skipDuplicates: true,
      });
    }
  }

  return segment;
};

/**
 * Update a customer segment
 */
const updateSegment = async (tenantId, segmentId, data) => {
  const tenantDb = forTenant(tenantId);

  const segment = await tenantDb.customerSegment.update({
    where: {
      recordId: segmentId,
    },
    data: {
      name: data.name,
      description: data.description,
      conditions: data.conditions,
      isActive: data.isActive,
    },
  });

  // If automatic and conditions changed, refresh members
  if (segment.isAutomatic && data.conditions) {
    // Remove all existing members
    await tenantDb.customerSegmentMember.deleteMany({
      where: {
        segmentId: segment.recordId,
      },
    });

    // Add new members based on conditions
    const ownerIds = await evaluateSegmentConditions(tenantDb, {
      ...segment.conditions,
      tenantId,
    });

    if (ownerIds.length > 0) {
      await tenantDb.customerSegmentMember.createMany({
        data: ownerIds.map((ownerId) => ({
          tenantId,
          segmentId: segment.recordId,
          ownerId,
        })),
        skipDuplicates: true,
      });
    }
  }

  return segment;
};

/**
 * Get all segments
 */
const getSegments = async (tenantId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { isActive } = options;

  const where = { tenantId };
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const segments = await tenantDb.customerSegment.findMany({
    where,
    include: {
      _count: {
        select: {
          members: true,
          campaigns: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return segments;
};

/**
 * Get segment members
 */
const getSegmentMembers = async (tenantId, segmentId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { limit = 50, offset = 0 } = options;

  const [members, total] = await Promise.all([
    tenantDb.customerSegmentMember.findMany({
      where: {
        tenantId,
        segmentId,
      },
      include: {
        owner: {
          include: {
            _count: {
              select: {
                bookings: true,
                pets: true,
              },
            },
          },
        },
      },
      orderBy: {
        addedAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    tenantDb.customerSegmentMember.count({
      where: {
        tenantId,
        segmentId,
      },
    }),
  ]);

  return {
    data: members,
    total,
    limit,
    offset,
  };
};

/**
 * Add members to a segment
 */
const addSegmentMembers = async (tenantId, segmentId, ownerIds) => {
  const tenantDb = forTenant(tenantId);

  const segment = await tenantDb.customerSegment.findFirst({
    where: {
      recordId: segmentId,
      tenantId,
    },
  });

  if (!segment) {
    throw new AppError('Segment not found', 404);
  }

  if (segment.isAutomatic) {
    throw new AppError('Cannot manually add members to automatic segments', 400);
  }

  const result = await tenantDb.customerSegmentMember.createMany({
    data: ownerIds.map((ownerId) => ({
      tenantId,
      segmentId,
      ownerId,
    })),
    skipDuplicates: true,
  });

  return result;
};

/**
 * Remove members from a segment
 */
const removeSegmentMembers = async (tenantId, segmentId, ownerIds) => {
  const tenantDb = forTenant(tenantId);

  const segment = await tenantDb.customerSegment.findFirst({
    where: {
      recordId: segmentId,
      tenantId,
    },
  });

  if (!segment) {
    throw new AppError('Segment not found', 404);
  }

  if (segment.isAutomatic) {
    throw new AppError('Cannot manually remove members from automatic segments', 400);
  }

  const result = await tenantDb.customerSegmentMember.deleteMany({
    where: {
      segmentId,
      ownerId: {
        in: ownerIds,
      },
    },
  });

  return result;
};

/**
 * Delete a segment
 */
const deleteSegment = async (tenantId, segmentId) => {
  const tenantDb = forTenant(tenantId);

  // Check if segment has active campaigns
  const activeCampaigns = await tenantDb.campaign.count({
    where: {
      segmentId,
      status: {
        in: ['SCHEDULED', 'ACTIVE'],
      },
    },
  });

  if (activeCampaigns > 0) {
    throw new AppError('Cannot delete segment with active campaigns', 400);
  }

  await tenantDb.customerSegment.delete({
    where: {
      recordId: segmentId,
    },
  });

  return { success: true };
};

/**
 * Refresh automatic segments
 */
const refreshAutomaticSegments = async (tenantId) => {
  const tenantDb = forTenant(tenantId);

  const automaticSegments = await tenantDb.customerSegment.findMany({
    where: {
      tenantId,
      isAutomatic: true,
      isActive: true,
    },
  });

  for (const segment of automaticSegments) {
    // Remove existing members
    await tenantDb.customerSegmentMember.deleteMany({
      where: {
        segmentId: segment.recordId,
      },
    });

    // Add new members based on conditions
    const ownerIds = await evaluateSegmentConditions(tenantDb, {
      ...segment.conditions,
      tenantId,
    });

    if (ownerIds.length > 0) {
      await tenantDb.customerSegmentMember.createMany({
        data: ownerIds.map((ownerId) => ({
          tenantId,
          segmentId: segment.recordId,
          ownerId,
        })),
        skipDuplicates: true,
      });
    }
  }

  return { refreshed: automaticSegments.length };
};

module.exports = {
  createSegment,
  updateSegment,
  getSegments,
  getSegmentMembers,
  addSegmentMembers,
  removeSegmentMembers,
  deleteSegment,
  refreshAutomaticSegments,
};

