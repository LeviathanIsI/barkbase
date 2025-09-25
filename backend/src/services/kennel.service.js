const { addDays, startOfDay } = require('date-fns');
const { forTenant } = require('../lib/tenantPrisma');

const getAvailability = async (tenantId, dateInput) => {
  const day = dateInput ? startOfDay(new Date(dateInput)) : startOfDay(new Date());
  const dayEnd = addDays(day, 1);

  const tenantDb = forTenant(tenantId);

  const [kennels, segments] = await Promise.all([
    tenantDb.kennel.findMany({
      where: {
        isActive: true,
      },
      orderBy: { name: 'asc' },
    }),
    tenantDb.bookingSegment.findMany({
      where: {
        startDate: {
          lt: dayEnd,
        },
        endDate: {
          gt: day,
        },
      },
      select: {
        kennelId: true,
      },
    }),
  ]);

  const occupancyByKennel = segments.reduce((acc, segment) => {
    acc[segment.kennelId] = (acc[segment.kennelId] ?? 0) + 1;
    return acc;
  }, {});

  return kennels.map((kennel) => {
    const occupied = occupancyByKennel[kennel.id] ?? 0;
    const available = Math.max(kennel.capacity - occupied, 0);
    return {
      id: kennel.id,
      name: kennel.name,
      type: kennel.type,
      capacity: kennel.capacity,
      occupied,
      available,
    };
  });
};

module.exports = {
  getAvailability,
};
