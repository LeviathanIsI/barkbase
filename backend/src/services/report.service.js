const { startOfMonth, endOfMonth } = require('date-fns');
const { forTenant } = require('../lib/tenantPrisma');

const dashboard = async (tenantId, { month } = {}) => {
  const reference = month ? new Date(month) : new Date();
  const range = {
    gte: startOfMonth(reference),
    lte: endOfMonth(reference),
  };

  const tenantDb = forTenant(tenantId);

  const [bookingCount, revenue] = await Promise.all([
    tenantDb.booking.count({ where: { checkIn: range } }),
    tenantDb.payment.aggregate({
      _sum: { amountCents: true },
      where: { status: 'CAPTURED', createdAt: range },
    }),
  ]);

  return {
    bookingCount,
    revenueCents: revenue._sum.amountCents ?? 0,
  };
};

module.exports = {
  dashboard,
};
