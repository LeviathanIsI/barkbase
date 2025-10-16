const { startOfMonth, endOfMonth } = require('date-fns');
const prisma = require('../config/prisma');
const { forTenant } = require('../lib/tenantPrisma');

const asFiniteLimit = (value) => (Number.isFinite(value) ? value : null);

const planLimitError = (message, meta = {}) =>
  Object.assign(new Error(message), {
    statusCode: 402,
    code: 'PLAN_LIMIT_REACHED',
    meta,
  });

const ensureUsageCounter = async ({ tenantId, periodStart, tx, snapshot }) => {
  const client = tx ?? prisma;
  try {
    // Always set tenant RLS context on the client we are using
    await client.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

    await client.usageCounter.upsert({
      where: { tenantId_date: { tenantId, date: periodStart } },
      create: {
        tenantId,
        date: periodStart,
        bookings: snapshot.bookings.used,
        activePets: snapshot.activePets.used,
        staffSeats: snapshot.seats.used,
      },
      update: {
        bookings: snapshot.bookings.used,
        activePets: snapshot.activePets.used,
        staffSeats: snapshot.seats.used,
      },
    });
  } catch (_error) {
    // Advisory only: ignore failures (e.g., RLS or race conditions)
  }
};

const getUsageSnapshot = async ({ tenantId, features, tx, now = new Date() }) => {
  const client = tx ?? prisma;
  const scoped = forTenant(tenantId, client);
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const [bookingsThisMonth, activePets, seatCount, invitesThisMonth, pendingInvites] = await Promise.all([
    scoped.booking.count({
      where: {
        checkIn: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    }),
    scoped.pet.count({
      where: {
        status: 'active',
      },
    }),
    scoped.membership.count(),
    scoped.invite.count({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    }),
    scoped.invite.count({
      where: {
        acceptedAt: null,
      },
    }),
  ]);

  const bookingsLimit = features?.bookingsPerMonth;
  const seatLimit = features?.seats;
  const petLimit = features?.activePets;
  const inviteLimit = features?.invitesPerMonth;

  const snapshot = {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    bookings: {
      used: bookingsThisMonth,
      limit: asFiniteLimit(bookingsLimit),
      remaining: Number.isFinite(bookingsLimit)
        ? Math.max(bookingsLimit - bookingsThisMonth, 0)
        : null,
    },
    seats: {
      used: seatCount,
      pendingInvites,
      limit: asFiniteLimit(seatLimit),
      remaining: Number.isFinite(seatLimit)
        ? Math.max(seatLimit - (seatCount + pendingInvites), 0)
        : null,
    },
    activePets: {
      used: activePets,
      limit: asFiniteLimit(petLimit),
      remaining: Number.isFinite(petLimit) ? Math.max(petLimit - activePets, 0) : null,
    },
    invites: {
      used: invitesThisMonth,
      limit: asFiniteLimit(inviteLimit),
      remaining: Number.isFinite(inviteLimit) ? Math.max(inviteLimit - invitesThisMonth, 0) : null,
    },
  };

  await ensureUsageCounter({ tenantId, periodStart, tx: client, snapshot });

  return snapshot;
};

const assertBookingsLimit = async ({ tenantId, features, tx, increment = 1, now = new Date() }) => {
  const snapshot = await getUsageSnapshot({ tenantId, features, tx, now });
  const limit = features?.bookingsPerMonth;
  if (Number.isFinite(limit) && snapshot.bookings.used + increment > limit) {
    throw planLimitError('Monthly booking allotment reached for current plan.', {
      feature: 'bookingsPerMonth',
      limit,
      used: snapshot.bookings.used,
    });
  }
  return snapshot;
};

const incrementBookingsUsage = async ({ tenantId, snapshot, tx, increment = 1, now = new Date() }) => {
  const client = tx ?? prisma;
  const periodStart = startOfMonth(now);
  const nextBookings = snapshot ? snapshot.bookings.used + increment : increment;
  const activePets = snapshot?.activePets.used ?? 0;
  const staffSeats = snapshot?.seats.used ?? 0;

  const updateData = snapshot
    ? {
        bookings: nextBookings,
        activePets,
        staffSeats,
      }
    : {
        bookings: { increment },
        activePets,
        staffSeats,
      };

  try {
    // Always set tenant RLS context on the client
    await client.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

    await client.usageCounter.upsert({
      where: { tenantId_date: { tenantId, date: periodStart } },
      create: {
        tenantId,
        date: periodStart,
        bookings: nextBookings,
        activePets,
        staffSeats,
      },
      update: updateData,
    });
  } catch (_error) {
    // Advisory only: ignore failures
  }
};

const assertSeatAndInviteCapacity = async ({
  tenantId,
  features,
  tx,
  seatsToAdd = 1,
  invitesToAdd = 1,
  now = new Date(),
}) => {
  const snapshot = await getUsageSnapshot({ tenantId, features, tx, now });

  const seatLimit = features?.seats;
  const pendingSeats = snapshot.seats.used + snapshot.seats.pendingInvites + seatsToAdd;
  if (Number.isFinite(seatLimit) && pendingSeats > seatLimit) {
    throw planLimitError('Seat limit reached for current plan.', {
      feature: 'seats',
      limit: seatLimit,
      used: snapshot.seats.used,
      pendingInvites: snapshot.seats.pendingInvites,
    });
  }

  const inviteLimit = features?.invitesPerMonth;
  if (Number.isFinite(inviteLimit) && snapshot.invites.used + invitesToAdd > inviteLimit) {
    throw planLimitError('Monthly invite allowance reached for current plan.', {
      feature: 'invitesPerMonth',
      limit: inviteLimit,
      used: snapshot.invites.used,
    });
  }

  return snapshot;
};

module.exports = {
  getUsageSnapshot,
  assertBookingsLimit,
  incrementBookingsUsage,
  assertSeatAndInviteCapacity,
  planLimitError,
};
