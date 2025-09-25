const { forTenant } = require('../lib/tenantPrisma');

const listPayments = async (tenantId, { status, page = 1, pageSize = 20 } = {}) => {
  const tenantDb = forTenant(tenantId);
  const where = {};
  if (status) {
    where.status = status;
  }

  const take = Math.max(1, Math.min(pageSize, 100));
  const skip = Math.max(0, (Math.max(page, 1) - 1) * take);

  const [items, total] = await Promise.all([
    tenantDb.payment.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            petId: true,
            pet: {
              select: {
                name: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    tenantDb.payment.count({ where }),
  ]);

  return {
    items,
    meta: {
      page: Math.max(page, 1),
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
};

const recordPayment = (tenantId, payload) =>
  forTenant(tenantId).payment.create({
    data: {
      ownerId: payload.ownerId,
      bookingId: payload.bookingId,
      amountCents: payload.amountCents,
      currency: payload.currency ?? 'USD',
      status: payload.status ?? 'CAPTURED',
      method: payload.method,
      externalId: payload.externalId,
      metadata: payload.metadata ?? {},
    },
  });

const getSummary = async (tenantId) => {
  const tenantDb = forTenant(tenantId);

  const [statusGroups, methodGroups, totals] = await Promise.all([
    tenantDb.payment.groupBy({
      by: ['status'],
      _sum: { amountCents: true },
      _count: { status: true },
      where: {},
    }),
    tenantDb.payment.groupBy({
      by: ['method'],
      _sum: { amountCents: true },
      _count: { method: true },
      where: {},
    }),
    tenantDb.payment.aggregate({
      _sum: { amountCents: true },
      _count: { _all: true },
      where: { status: 'CAPTURED' },
    }),
  ]);

  const lastCaptured = await tenantDb.payment.findFirst({
    where: { status: 'CAPTURED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amountCents: true,
      currency: true,
      createdAt: true,
      owner: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return {
    totalCapturedCents: totals._sum.amountCents ?? 0,
    capturedCount: totals._count._all ?? 0,
    byStatus: statusGroups.map((group) => ({
      status: group.status,
      amountCents: group._sum.amountCents ?? 0,
      count: group._count.status,
    })),
    byMethod: methodGroups.map((group) => ({
      method: group.method,
      amountCents: group._sum.amountCents ?? 0,
      count: group._count.method,
    })),
    lastCaptured,
  };
};

module.exports = {
  listPayments,
  recordPayment,
  getSummary,
};
