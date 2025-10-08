const prisma = require('../config/prisma');
const { forTenant } = require('../lib/tenantPrisma');
const { getIO } = require('../lib/socket');

const emitBookingEvent = (tenantId, event, payload) => {
  try {
    const channel = `tenant:${tenantId}`;
    const io = getIO();
    io.to(channel).emit(event, payload);
    if (event === 'booking:deleted') {
      io.to(channel).emit('booking:remove', payload);
    } else {
      io.to(channel).emit('booking:update', payload);
    }
  } catch (error) {
    // Socket may not be initialised in tests
  }
};

const resolveStaffId = async (tenantDb, { staffId, membershipId } = {}) => {
  if (staffId) {
    const staff = await tenantDb.staff.findFirst({ where: { id: staffId } });
    if (!staff) {
      throw Object.assign(new Error('Staff member not found'), { statusCode: 404 });
    }
    return staff.id;
  }
  if (membershipId) {
    const staff = await tenantDb.staff.findFirst({ where: { membershipId } });
    return staff?.id ?? null;
  }
  return null;
};

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

  emitBookingEvent(tenantId, 'booking:created', created);

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

  emitBookingEvent(tenantId, 'booking:updated', booking);

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

  emitBookingEvent(tenantId, 'booking:updated', booking);

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

  emitBookingEvent(tenantId, 'booking:deleted', { id: bookingId });
};

const quickCheckIn = async (tenantId, { bookingId, kennelId }, context = {}) => {
  const tenantDb = forTenant(tenantId);
  const existing = await tenantDb.booking.findFirst({
    where: { id: bookingId },
    include: { segments: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  const checkInTime = new Date();

  const booking = await prisma.$transaction(async (tx) => {
    const scoped = forTenant(tenantId, tx);

    const staffId = await resolveStaffId(scoped, {
      membershipId: context.membershipId,
      staffId: context.staffId,
    });

    await scoped.booking.update({
      where: { id: bookingId },
      data: {
        status: 'IN_PROGRESS',
        checkIn: checkInTime,
      },
    });

    if (kennelId) {
      await scoped.bookingSegment.create({
        data: {
          bookingId,
          kennelId,
          startDate: checkInTime,
          endDate: existing.checkOut,
          status: 'IN_PROGRESS',
        },
      });
    }

    await scoped.checkIn.create({
      data: {
        bookingId,
        staffId,
        time: checkInTime,
        weight: null,
        photos: [],
        notes: null,
        conditionRating: null,
      },
    });

    return scoped.booking.findFirst({
      where: { id: bookingId },
      include: defaultIncludes,
    });
  });

  emitBookingEvent(tenantId, 'booking:checked-in', booking);

  return booking;
};


const checkIn = async (tenantId, bookingId, payload = {}, context = {}) => {
  const { membershipId } = context ?? {};

  const result = await prisma.$transaction(async (tx) => {
    const scoped = forTenant(tenantId, tx);
    const booking = await scoped.booking.findFirst({
      where: { id: bookingId },
    });

    if (!booking) {
      throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    }

    if (['CANCELLED', 'COMPLETED', 'CHECKED_OUT'].includes(booking.status)) {
      throw Object.assign(new Error('Booking cannot be checked in'), { statusCode: 409 });
    }

    const staffId = await resolveStaffId(scoped, {
      staffId: payload.staffId,
      membershipId,
    });

    const checkInTime = payload.time ? new Date(payload.time) : new Date();

    const checkInRecord = await scoped.checkIn.create({
      data: {
        bookingId,
        staffId,
        time: checkInTime,
        weight: payload.weight ?? null,
        photos: payload.photos ?? [],
        notes: payload.notes ?? null,
        conditionRating: payload.conditionRating ?? null,
      },
    });

    const updatedBooking = await scoped.booking.update({
      where: { id: bookingId },
      data: {
        status: 'IN_PROGRESS',
        checkIn: checkInTime,
      },
      include: defaultIncludes,
    });

    return { booking: updatedBooking, checkIn: checkInRecord };
  });

  emitBookingEvent(tenantId, 'booking:checked-in', result.booking);

  return result;
};

const checkOut = async (tenantId, bookingId, payload = {}, context = {}) => {
  const { membershipId } = context ?? {};

  const result = await prisma.$transaction(async (tx) => {
    const scoped = forTenant(tenantId, tx);
    const booking = await scoped.booking.findFirst({
      where: { id: bookingId },
    });

    if (!booking) {
      throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    }

    if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
      throw Object.assign(new Error('Booking cannot be checked out'), { statusCode: 409 });
    }

    const staffId = await resolveStaffId(scoped, {
      staffId: payload.staffId,
      membershipId,
    });

    let incidentReport = null;
    let incidentReportId = payload.incidentReportId ?? null;

    if (payload.incident) {
      incidentReport = await scoped.incidentReport.create({
        data: {
          petId: payload.incident.petId ?? booking.petId,
          bookingId,
          occurredAt: payload.incident.occurredAt ? new Date(payload.incident.occurredAt) : new Date(),
          severity: payload.incident.severity,
          narrative: payload.incident.narrative,
          photos: payload.incident.photos ?? [],
          vetContacted: payload.incident.vetContacted ?? false,
        },
      });
      incidentReportId = incidentReport.id;
    } else if (incidentReportId) {
      const existingIncident = await scoped.incidentReport.findFirst({
        where: { id: incidentReportId },
      });
      if (!existingIncident) {
        throw Object.assign(new Error('Incident report not found'), { statusCode: 404 });
      }
    }

    const checkOutTime = payload.time ? new Date(payload.time) : new Date();

    const checkOutRecord = await scoped.checkOut.create({
      data: {
        bookingId,
        staffId,
        time: checkOutTime,
        incidentReportId,
        extraCharges: payload.extraCharges ?? {},
        signatureUrl: payload.signatureUrl ?? null,
      },
    });

    const remainingBalanceCents =
      typeof payload.remainingBalanceCents === 'number'
        ? payload.remainingBalanceCents
        : booking.balanceDueCents;

    const nextStatus = remainingBalanceCents > 0 ? 'CHECKED_OUT' : 'COMPLETED';

    const updatedBooking = await scoped.booking.update({
      where: { id: bookingId },
      data: {
        status: nextStatus,
        balanceDueCents: remainingBalanceCents,
        checkOut: checkOutTime,
      },
      include: defaultIncludes,
    });

    let capturedPayment = null;
    if (payload.capturePayment !== false) {
      const paymentWhere = {
        bookingId,
      };

      if (payload.paymentIntentId) {
        paymentWhere.intentId = payload.paymentIntentId;
      } else {
        paymentWhere.status = { in: ['AUTHORIZED', 'PENDING'] };
      }

      const payment = await scoped.payment.findFirst({
        where: paymentWhere,
        orderBy: { createdAt: 'desc' },
      });

      if (payload.paymentIntentId && !payment) {
        throw Object.assign(new Error('Payment intent not found'), { statusCode: 404 });
      }

      if (payment && payment.status !== 'CAPTURED') {
        capturedPayment = await scoped.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            capturedAt: checkOutTime,
            metadata: {
              ...(payment.metadata ?? {}),
              ...(payload.metadata ?? {}),
            },
          },
        });
      }
    }

    return {
      booking: updatedBooking,
      checkOut: checkOutRecord,
      incidentReport,
      payment: capturedPayment,
    };
  });

  emitBookingEvent(tenantId, 'booking:checked-out', result.booking);

  return result;
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

  emitBookingEvent(tenantId, 'booking:updated', booking);

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
  checkIn,
  checkOut,
  promoteWaitlistBooking,
};
