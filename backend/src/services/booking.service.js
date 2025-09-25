const prisma = require('../config/prisma');
const { forTenant } = require('../lib/tenantPrisma');
const { getIO } = require('../lib/socket');

const defaultIncludes = {
  pet: {
    include: {
      owners: {
        include: { owner: true },
      },
    },
  },
  owner: true,
  segments: {
    include: {
      kennel: true,
    },
  },
  services: {
    include: {
      service: true,
    },
  },
};

const mapSegmentForCreate = (tenantId) => (segment) => ({
  tenantId,
  kennelId: segment.kennelId,
  startDate: new Date(segment.startDate),
  endDate: new Date(segment.endDate),
  status: segment.status ?? 'CONFIRMED',
  notes: segment.notes ?? null,
});

const mapSegmentForUpsert = (tenantId, bookingId) => (segment) => ({
  tenantId,
  bookingId,
  kennelId: segment.kennelId,
  startDate: new Date(segment.startDate),
  endDate: new Date(segment.endDate),
  status: segment.status ?? 'CONFIRMED',
  notes: segment.notes ?? null,
});

const mapServiceForCreate = (tenantId) => (service) => ({
  tenantId,
  serviceId: service.serviceId,
  quantity: service.quantity ?? 1,
  priceCents: service.priceCents ?? 0,
});

const mapServiceForUpsert = (tenantId, bookingId) => (service) => ({
  tenantId,
  bookingId,
  serviceId: service.serviceId,
  quantity: service.quantity ?? 1,
  priceCents: service.priceCents ?? 0,
});

const listBookings = async (tenantId, { status, startDate, endDate } = {}) => {
  const tenantDb = forTenant(tenantId);
  const where = {};

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.checkIn = {};
    if (startDate) {
      where.checkIn.gte = new Date(startDate);
    }
    if (endDate) {
      where.checkIn.lte = new Date(endDate);
    }
  }

  return tenantDb.booking.findMany({
    where,
    include: defaultIncludes,
    orderBy: [{ checkIn: 'asc' }],
  });
};

const getBookingById = (tenantId, bookingId) =>
  forTenant(tenantId).booking.findFirst({
    where: { id: bookingId },
    include: defaultIncludes,
  });

const createBooking = async (tenantId, payload) => {
  const created = await prisma.$transaction(async (tx) => {
    const scoped = forTenant(tenantId, tx);
    const booking = await scoped.booking.create({
      data: {
        petId: payload.petId,
        ownerId: payload.ownerId,
        status: payload.status,
        checkIn: new Date(payload.checkIn),
        checkOut: new Date(payload.checkOut),
        depositCents: payload.depositCents ?? 0,
        totalCents: payload.totalCents ?? 0,
        balanceDueCents: payload.balanceDueCents ?? 0,
        notes: payload.notes,
        specialInstructions: payload.specialInstructions,
        segments: {
          create: (payload.segments ?? []).map(mapSegmentForCreate(tenantId)),
        },
        services: {
          create: (payload.services ?? []).map(mapServiceForCreate(tenantId)),
        },
      },
      include: defaultIncludes,
    });

    return booking;
  });

  try {
    getIO().to(`tenant:${tenantId}`).emit('booking:created', created);
  } catch (error) {
    // Socket may not be initialised in tests
  }

  return created;
};

const updateBooking = async (tenantId, bookingId, payload = {}) => {
  const tenantDb = forTenant(tenantId);
  const existing = await tenantDb.booking.findFirst({
    where: { id: bookingId },
    include: {
      segments: true,
      services: true,
    },
  });

  if (!existing) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  const updateData = {
    petId: payload.petId ?? existing.petId,
    ownerId: payload.ownerId ?? existing.ownerId,
    status: payload.status ?? existing.status,
    checkIn: payload.checkIn ? new Date(payload.checkIn) : existing.checkIn,
    checkOut: payload.checkOut ? new Date(payload.checkOut) : existing.checkOut,
    depositCents: payload.depositCents ?? existing.depositCents,
    totalCents: payload.totalCents ?? existing.totalCents,
    balanceDueCents: payload.balanceDueCents ?? existing.balanceDueCents,
    notes: payload.notes ?? existing.notes,
    specialInstructions: payload.specialInstructions ?? existing.specialInstructions,
  };

  const incomingSegments = payload.segments?.length
    ? payload.segments
    : existing.segments.map((segment) => ({
        kennelId: segment.kennelId,
        startDate: segment.startDate,
        endDate: segment.endDate,
        status: segment.status,
        notes: segment.notes,
      }));

  const incomingServices = payload.services?.length
    ? payload.services
    : existing.services.map((service) => ({
        serviceId: service.serviceId,
        quantity: service.quantity,
        priceCents: service.priceCents,
      }));

  const booking = await prisma.$transaction(async (tx) => {
    const scoped = forTenant(tenantId, tx);

    await scoped.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    await scoped.bookingSegment.deleteMany({ where: { bookingId } });
    await scoped.bookingService.deleteMany({ where: { bookingId } });

    if (incomingSegments.length) {
      await scoped.bookingSegment.createMany({
        data: incomingSegments.map(mapSegmentForUpsert(tenantId, bookingId)),
      });
    }

    if (incomingServices.length) {
      await scoped.bookingService.createMany({
        data: incomingServices.map(mapServiceForUpsert(tenantId, bookingId)),
      });
    }

    return scoped.booking.findFirst({
      where: { id: bookingId },
      include: defaultIncludes,
    });
  });

  try {
    getIO().to(`tenant:${tenantId}`).emit('booking:updated', booking);
  } catch (error) {
    // ignore socket issues
  }

  return booking;
};

const updateBookingStatus = async (tenantId, bookingId, status) => {
  const tenantDb = forTenant(tenantId);
  const existing = await tenantDb.booking.findFirst({
    where: { id: bookingId },
  });

  if (!existing) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  const booking = await tenantDb.booking.update({
    where: { id: bookingId },
    data: { status },
    include: defaultIncludes,
  });

  try {
    getIO().to(`tenant:${tenantId}`).emit('booking:updated', booking);
  } catch (error) {
    // ignore socket issues
  }

  return booking;
};

const deleteBooking = async (tenantId, bookingId) => {
  const tenantDb = forTenant(tenantId);
  const existing = await tenantDb.booking.findFirst({
    where: { id: bookingId },
  });

  if (!existing) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  await tenantDb.booking.delete({ where: { id: bookingId } });

  try {
    getIO().to(`tenant:${tenantId}`).emit('booking:deleted', { id: bookingId });
  } catch (error) {
    // noop
  }
};

const quickCheckIn = async (tenantId, { bookingId, kennelId }) => {
  const tenantDb = forTenant(tenantId);
  const existing = await tenantDb.booking.findFirst({
    where: { id: bookingId },
    include: { segments: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  const booking = await prisma.$transaction(async (tx) => {
    const scoped = forTenant(tenantId, tx);
    await scoped.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CHECKED_IN',
        checkIn: new Date(),
      },
    });

    if (kennelId) {
      await scoped.bookingSegment.create({
        data: {
          bookingId,
          kennelId,
          startDate: new Date(),
          endDate: existing.checkOut,
          status: 'CHECKED_IN',
        },
      });
    }

    return scoped.booking.findFirst({
      where: { id: bookingId },
      include: defaultIncludes,
    });
  });

  try {
    getIO().to(`tenant:${tenantId}`).emit('booking:checked-in', booking);
  } catch (error) {
    // noop
  }

  return booking;
};

const promoteWaitlistBooking = async (
  tenantId,
  bookingId,
  { kennelId, startDate, endDate } = {},
) => {
  const tenantDb = forTenant(tenantId);
  const existing = await tenantDb.booking.findFirst({
    where: { id: bookingId },
    include: {
      segments: true,
    },
  });

  if (!existing) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  const nextStatus = existing.status === 'PENDING' ? 'CONFIRMED' : existing.status;
  const resolvedStart = startDate ? new Date(startDate) : existing.checkIn;
  const resolvedEnd = endDate ? new Date(endDate) : existing.checkOut;
  const resolvedKennel = kennelId ?? existing.segments[0]?.kennelId ?? null;

  const booking = await prisma.$transaction(async (tx) => {
    const scoped = forTenant(tenantId, tx);
    await scoped.booking.update({
      where: { id: bookingId },
      data: {
        status: nextStatus,
        checkIn: resolvedStart,
        checkOut: resolvedEnd,
      },
    });

    if (resolvedKennel) {
      await scoped.bookingSegment.deleteMany({ where: { bookingId } });
      await scoped.bookingSegment.create({
        data: {
          bookingId,
          kennelId: resolvedKennel,
          startDate: resolvedStart,
          endDate: resolvedEnd,
          status: 'CONFIRMED',
        },
      });
    }

    return scoped.booking.findFirst({
      where: { id: bookingId },
      include: defaultIncludes,
    });
  });

  try {
    getIO().to(`tenant:${tenantId}`).emit('booking:updated', booking);
  } catch (error) {
    // ignore socket issues
  }

  return booking;
};

module.exports = {
  listBookings,
  getBookingById,
  createBooking,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  quickCheckIn,
  promoteWaitlistBooking,
};
