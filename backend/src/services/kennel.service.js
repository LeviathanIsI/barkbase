const { addDays, startOfDay } = require('date-fns');
const { forTenant } = require('../lib/tenantPrisma');
const { AppError } = require('../utils/errors');

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
    const occupied = occupancyByKennel[kennel.recordId] ?? 0;
    const available = Math.max(kennel.capacity - occupied, 0);
    return { recordId: kennel.recordId,
      name: kennel.name,
      type: kennel.type,
      capacity: kennel.capacity,
      occupied,
      available,
    };
  });
};

const listKennels = async (tenantId, filters = {}) => {
  const tenantDb = forTenant(tenantId);
  
  const where = {};
  if (filters.type) where.type = filters.type;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' };
  if (filters.building) where.building = { contains: filters.building, mode: 'insensitive' };
  
  const kennels = await tenantDb.kennel.findMany({
    where,
    orderBy: [
      { building: 'asc' },
      { zone: 'asc' },
      { name: 'asc' }
    ],
    include: {
      _count: {
        select: { bookings: true }
      }
    }
  });
  
  return kennels;
};

const getKennel = async (tenantId, kennelId) => {
  const tenantDb = forTenant(tenantId);
  
  const kennel = await tenantDb.kennel.findFirst({
    where: { recordId: kennelId },
    include: {
      bookings: {
        where: {
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
          endDate: { gte: new Date() }
        },
        include: {
          booking: {
            include: {
              pet: {
                select: { recordId: true, name: true }
              }
            }
          }
        },
        orderBy: { startDate: 'asc' },
        take: 5
      }
    }
  });
  
  if (!kennel) {
    throw new AppError('Kennel not found', 404);
  }
  
  return kennel;
};

const createKennel = async (tenantId, data) => {
  const tenantDb = forTenant(tenantId);
  
  // Parse amenities if it's a string
  if (typeof data.amenities === 'string') {
    try {
      data.amenities = JSON.parse(data.amenities);
    } catch {
      data.amenities = [];
    }
  }
  
  // Convert amenities array to JSON string for storage
  if (Array.isArray(data.amenities)) {
    data.amenities = JSON.stringify(data.amenities);
  }
  
  const kennel = await tenantDb.kennel.create({
    data: {
      ...data,
      tenantId
    }
  });
  
  return kennel;
};

const updateKennel = async (tenantId, kennelId, data) => {
  const tenantDb = forTenant(tenantId);
  
  // Check if kennel exists
  const existing = await tenantDb.kennel.findFirst({
    where: { recordId: kennelId }
  });
  
  if (!existing) {
    throw new AppError('Kennel not found', 404);
  }
  
  // Parse amenities if needed
  if (typeof data.amenities === 'string') {
    try {
      data.amenities = JSON.parse(data.amenities);
    } catch {
      data.amenities = [];
    }
  }
  
  // Convert amenities array to JSON string for storage
  if (Array.isArray(data.amenities)) {
    data.amenities = JSON.stringify(data.amenities);
  }
  
  const kennel = await tenantDb.kennel.update({
    where: { recordId: kennelId },
    data
  });
  
  return kennel;
};

const deleteKennel = async (tenantId, kennelId) => {
  const tenantDb = forTenant(tenantId);
  
  // Check if kennel has active bookings
  const activeBookings = await tenantDb.bookingSegment.count({
    where: {
      kennelId,
      status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      endDate: { gte: new Date() }
    }
  });
  
  if (activeBookings > 0) {
    throw new AppError('Cannot delete kennel with active bookings', 400);
  }
  
  await tenantDb.kennel.delete({
    where: { recordId: kennelId }
  });
  
  return { success: true };
};

const checkKennelAvailability = async (tenantId, kennelId, startDate, endDate) => {
  const tenantDb = forTenant(tenantId);
  
  const kennel = await tenantDb.kennel.findFirst({
    where: { recordId: kennelId }
  });
  
  if (!kennel) {
    throw new AppError('Kennel not found', 404);
  }
  
  const overlappingSegments = await tenantDb.bookingSegment.findMany({
    where: {
      kennelId,
      status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      AND: [
        { startDate: { lt: endDate } },
        { endDate: { gt: startDate } }
      ]
    },
    include: {
      booking: {
        include: {
          pet: {
            select: { name: true }
          }
        }
      }
    }
  });
  
  const isAvailable = overlappingSegments.length < kennel.capacity;
  const availableSlots = Math.max(0, kennel.capacity - overlappingSegments.length);
  
  return {
    kennel: {
      recordId: kennel.recordId,
      name: kennel.name,
      type: kennel.type,
      capacity: kennel.capacity
    },
    isAvailable,
    availableSlots,
    occupancy: overlappingSegments.map(seg => ({
      bookingId: seg.bookingId,
      petName: seg.booking.pet.name,
      startDate: seg.startDate,
      endDate: seg.endDate
    }))
  };
};

module.exports = {
  getAvailability,
  listKennels,
  getKennel,
  createKennel,
  updateKennel,
  deleteKennel,
  checkKennelAvailability
};
