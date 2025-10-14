const { forTenant } = require('../lib/tenantPrisma');
const { startOfDay, endOfDay, parseISO, isWithinInterval, areIntervalsOverlapping } = require('date-fns');

/**
 * Get merged calendar view with bookings, vaccinations, and staff shifts
 */
const getCalendarView = async (tenantId, { from, to }) => {
  const tenantDb = forTenant(tenantId);
  const startDate = from ? parseISO(from) : startOfDay(new Date());
  const endDate = to ? parseISO(to) : endOfDay(new Date());

  const [bookings, vaccinations, staff] = await Promise.all([
    tenantDb.booking.findMany({
      where: {
        OR: [
          {
            checkIn: { gte: startDate, lte: endDate },
          },
          {
            checkOut: { gte: startDate, lte: endDate },
          },
          {
            AND: [
              { checkIn: { lte: startDate } },
              { checkOut: { gte: endDate } },
            ],
          },
        ],
        status: { in: ['CONFIRMED', 'IN_PROGRESS', 'CHECKED_IN'] },
      },
      include: {
        pet: {
          select: {
            recordId: true,
            name: true,
            breed: true,
          },
        },
        owner: {
          select: {
            recordId: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        segments: {
          include: {
            kennel: true,
          },
        },
      },
      orderBy: { checkIn: 'asc' },
    }),

    tenantDb.vaccination.findMany({
      where: {
        expiresAt: { gte: startDate, lte: endDate },
      },
      include: {
        pet: {
          select: {
            recordId: true,
            name: true,
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    }),

    tenantDb.staff.findMany({
      select: { recordId: true,
        title: true,
        schedule: true,
        membership: {
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    bookings,
    vaccinations,
    staff,
    dateRange: {
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    },
  };
};

/**
 * Calculate occupancy for a given date range
 */
const getOccupancy = async (tenantId, { from, to }) => {
  const tenantDb = forTenant(tenantId);
  const startDate = from ? parseISO(from) : startOfDay(new Date());
  const endDate = to ? parseISO(to) : endOfDay(new Date());

  const [kennels, segments] = await Promise.all([
    tenantDb.kennel.findMany({
      where: { isActive: true },
      select: { recordId: true,
        name: true,
        type: true,
        size: true,
        capacity: true,
        location: true,
      },
    }),

    tenantDb.bookingSegment.findMany({
      where: {
        OR: [
          {
            startDate: { gte: startDate, lte: endDate },
          },
          {
            endDate: { gte: startDate, lte: endDate },
          },
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: endDate } },
            ],
          },
        ],
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
      include: {
        booking: {
          select: { recordId: true,
            status: true,
            pet: {
              select: { recordId: true,
                name: true,
              },
            },
          },
        },
        kennel: {
          select: { recordId: true,
            name: true,
            type: true,
            capacity: true,
          },
        },
      },
    }),
  ]);

  // Group segments by kennel
  const kennelOccupancy = kennels.map((kennel) => {
    const kennelSegments = segments.filter((seg) => seg.kennelId === kennel.recordId);
    const occupied = kennelSegments.length;
    const available = Math.max(0, kennel.capacity - occupied);
    const utilizationPercent = kennel.capacity > 0 ? Math.round((occupied / kennel.capacity) * 100) : 0;

    return {
      kennel,
      occupied,
      available,
      capacity: kennel.capacity,
      utilizationPercent,
      bookings: kennelSegments.map((seg) => ({
        bookingId: seg.bookingId,
        segmentId: seg.recordId,
        startDate: seg.startDate,
        endDate: seg.endDate,
        petName: seg.booking?.pet?.name,
        status: seg.status,
      })),
    };
  });

  const totalCapacity = kennels.reduce((sum, k) => sum + k.capacity, 0);
  const totalOccupied = segments.length;
  const totalAvailable = Math.max(0, totalCapacity - totalOccupied);
  const overallUtilization = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  return {
    summary: {
      totalCapacity,
      totalOccupied,
      totalAvailable,
      overallUtilization,
    },
    kennels: kennelOccupancy,
    dateRange: {
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    },
  };
};

/**
 * Check for kennel assignment clashes
 */
const checkClash = async (tenantId, { kennelId, startDate, endDate, excludeSegmentId = null }) => {
  const tenantDb = forTenant(tenantId);
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  const kennel = await tenantDb.kennel.findFirst({
    where: { recordId: kennelId },
  });

  if (!kennel) {
    throw Object.assign(new Error('Kennel not found'), { statusCode: 404 });
  }

  if (!kennel.isActive) {
    return {
      hasClash: true,
      reason: 'Kennel is not active',
      clashes: [],
    };
  }

  const existingSegments = await tenantDb.bookingSegment.findMany({
    where: {
      kennelId,
      status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      ...(excludeSegmentId ? { recordId: { not: excludeSegmentId } } : {}),
    },
    include: {
      booking: {
        select: { recordId: true,
          pet: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const clashes = existingSegments.filter((seg) =>
    areIntervalsOverlapping(
      { start, end },
      { start: new Date(seg.startDate), end: new Date(seg.endDate) },
      { inclusive: false },
    ),
  );

  if (clashes.length >= kennel.capacity) {
    return {
      hasClash: true,
      reason: 'Kennel capacity exceeded',
      capacity: kennel.capacity,
      currentOccupancy: clashes.length,
      clashes: clashes.map((seg) => ({
        segmentId: seg.recordId,
        bookingId: seg.bookingId,
        petName: seg.booking?.pet?.name,
        startDate: seg.startDate,
        endDate: seg.endDate,
      })),
    };
  }

  return {
    hasClash: false,
    capacity: kennel.capacity,
    currentOccupancy: clashes.length,
    availableSlots: kennel.capacity - clashes.length,
  };
};

/**
 * Suggest the best kennel for a booking based on dates, pet size, and preferences
 */
const suggestBestKennel = async (tenantId, { startDate, endDate, petSize = 'MEDIUM', kennelType = null }) => {
  const tenantDb = forTenant(tenantId);
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  const kennels = await tenantDb.kennel.findMany({
    where: {
      isActive: true,
      ...(kennelType ? { type: kennelType } : {}),
    },
    include: {
      bookings: {
        where: {
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        },
        select: { recordId: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  // Score kennels based on availability and suitability
  const scoredKennels = kennels
    .map((kennel) => {
      const overlappingSegments = kennel.bookings.filter((seg) =>
        areIntervalsOverlapping(
          { start, end },
          { start: new Date(seg.startDate), end: new Date(seg.endDate) },
          { inclusive: false },
        ),
      );

      const available = kennel.capacity - overlappingSegments.length;
      if (available <= 0) {
        return null;
      }

      let score = available * 10;

      // Prefer kennels that match pet size
      const sizesMatch = {
        SMALL: ['SMALL', 'MEDIUM'],
        MEDIUM: ['MEDIUM'],
        LARGE: ['LARGE', 'XLARGE'],
        XLARGE: ['XLARGE'],
      };

      if (kennel.size && sizesMatch[petSize]?.includes(kennel.size)) {
        score += 20;
      }

      // Prefer suites for longer stays
      const stayDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (stayDays > 7 && kennel.type === 'SUITE') {
        score += 15;
      }

      // Prefer daycare kennels for same-day bookings
      if (stayDays === 1 && kennel.type === 'DAYCARE') {
        score += 10;
      }

      return {
        kennel: { recordId: kennel.recordId,
          name: kennel.name,
          type: kennel.type,
          size: kennel.size,
          capacity: kennel.capacity,
          location: kennel.location,
          amenities: kennel.amenities,
        },
        available,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return {
    suggestions: scoredKennels.slice(0, 5),
    dateRange: {
      from: start.toISOString(),
      to: end.toISOString(),
    },
  };
};

/**
 * Assign a kennel to a booking (creates or updates BookingSegment)
 */
const assignKennel = async (tenantId, bookingId, { kennelId, startDate, endDate }) => {
  const tenantDb = forTenant(tenantId);
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  // Check for clashes
  const clashCheck = await checkClash(tenantId, { kennelId, startDate: start, endDate: end });
  if (clashCheck.hasClash) {
    throw Object.assign(new Error(clashCheck.reason), {
      statusCode: 409,
      clashes: clashCheck.clashes,
    });
  }

  // Verify booking exists
  const booking = await tenantDb.booking.findFirst({
    where: { recordId: bookingId },
  });

  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  // Create booking segment
  const segment = await tenantDb.bookingSegment.create({
    data: {
      bookingId,
      kennelId,
      startDate: start,
      endDate: end,
      status: 'CONFIRMED',
    },
    include: {
      kennel: true,
      booking: {
        include: {
          pet: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return segment;
};

/**
 * Reassign a kennel (updates existing BookingSegment)
 */
const reassignKennel = async (tenantId, segmentId, { kennelId, startDate = null, endDate = null }) => {
  const tenantDb = forTenant(tenantId);

  const segment = await tenantDb.bookingSegment.findFirst({
    where: { recordId: segmentId },
    include: { kennel: true },
  });

  if (!segment) {
    throw Object.assign(new Error('Booking segment not found'), { statusCode: 404 });
  }

  const newStart = startDate ? (typeof startDate === 'string' ? parseISO(startDate) : startDate) : segment.startDate;
  const newEnd = endDate ? (typeof endDate === 'string' ? parseISO(endDate) : endDate) : segment.endDate;
  const newKennelId = kennelId ?? segment.kennelId;

  // Check for clashes (excluding current segment)
  const clashCheck = await checkClash(tenantId, {
    kennelId: newKennelId,
    startDate: newStart,
    endDate: newEnd,
    excludeSegmentId: segmentId,
  });

  if (clashCheck.hasClash) {
    throw Object.assign(new Error(clashCheck.reason), {
      statusCode: 409,
      clashes: clashCheck.clashes,
    });
  }

  // Update segment
  const updated = await tenantDb.bookingSegment.update({
    where: { recordId: segmentId },
    data: {
      kennelId: newKennelId,
      startDate: newStart,
      endDate: newEnd,
    },
    include: {
      kennel: true,
      booking: {
        include: {
          pet: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return updated;
};

module.exports = {
  getCalendarView,
  getOccupancy,
  checkClash,
  suggestBestKennel,
  assignKennel,
  reassignKennel,
};
