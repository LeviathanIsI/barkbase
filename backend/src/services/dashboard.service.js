const { addDays, differenceInCalendarDays, eachDayOfInterval, endOfDay, startOfDay, startOfWeek } = require('date-fns');
const { forTenant } = require('../lib/tenantPrisma');

const getStats = async (tenantId) => {
  const tenantDb = forTenant(tenantId);
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);
  const thirtyDaysAgo = addDays(start, -30);

  const [activeBookings, checkedInToday, waitlist, newClients] = await Promise.all([
    tenantDb.booking.count({
      where: {
        status: {
          in: ['CONFIRMED', 'IN_PROGRESS'],
        },
      },
    }),
    tenantDb.booking.count({
      where: {
        status: 'IN_PROGRESS',
        checkIn: {
          gte: start,
          lte: end,
        },
      },
    }),
    tenantDb.booking.count({
      where: {
        status: 'PENDING',
      },
    }),
    tenantDb.owner.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
  ]);

  return {
    activeBookings,
    checkedInToday,
    waitlist,
    newClients,
  };
};

const getOccupancy = async (tenantId) => {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const end = addDays(start, 6);
  const tenantDb = forTenant(tenantId);

  const [kennels, segments] = await Promise.all([
    tenantDb.kennel.findMany({
      where: {
        isActive: true,
      },
    }),
    tenantDb.bookingSegment.findMany({
      where: {
        startDate: {
          lt: addDays(end, 1),
        },
        endDate: {
          gt: start,
        },
      },
    }),
  ]);

  const totalCapacity = kennels.reduce((sum, kennel) => sum + kennel.capacity, 0) || 1;
  const days = eachDayOfInterval({ start, end });

  return days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    const occupied = segments.filter(
      (segment) => segment.startDate < dayEnd && segment.endDate > dayStart,
    ).length;
    const occupancy = Math.round(Math.min(100, (occupied / totalCapacity) * 100));
    return {
      date: dayStart.toISOString(),
      dayLabel: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      occupancy,
    };
  });
};

const getUpcomingVaccinations = async (tenantId, { daysAhead = 180, limit = 5 } = {}) => {
  const today = startOfDay(new Date());
  const windowEnd = endOfDay(addDays(today, daysAhead));
  const tenantDb = forTenant(tenantId);

  const vaccinations = await tenantDb.vaccination.findMany({
    where: {
      expiresAt: {
        gte: today,
        lte: windowEnd,
      },
    },
    orderBy: { expiresAt: 'asc' },
    take: limit,
    include: {
      pet: {
        include: {
          owners: {
            where: { isPrimary: true },
            include: { owner: true },
            take: 1,
          },
        },
      },
    },
  });

  return vaccinations.map((vaccination) => {
    const primaryOwner = vaccination.pet.owners[0]?.owner;
    const daysUntil = differenceInCalendarDays(vaccination.expiresAt, today);
    let severity = 'info';
    if (daysUntil <= 30) {
      severity = 'danger';
    } else if (daysUntil <= 60) {
      severity = 'warning';
    }

    return {
      id: vaccination.id,
      petName: vaccination.pet.name,
      ownerName: primaryOwner ? `${primaryOwner.firstName} ${primaryOwner.lastName}` : null,
      vaccine: vaccination.type,
      expiresAt: vaccination.expiresAt,
      daysUntil,
      severity,
    };
  });
};

module.exports = {
  getStats,
  getOccupancy,
  getUpcomingVaccinations,
};
