const { forTenant } = require('../lib/tenantPrisma');

const defaultInclude = {
  pet: {
    select: {
      id: true,
      name: true,
    },
  },
  booking: {
    select: {
      id: true,
      status: true,
      checkIn: true,
      checkOut: true,
    },
  },
};

const createIncident = async (tenantId, payload) => {
  const tenantDb = forTenant(tenantId);
  return tenantDb.incidentReport.create({
    data: {
      petId: payload.petId,
      bookingId: payload.bookingId ?? null,
      occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : new Date(),
      severity: payload.severity,
      narrative: payload.narrative,
      photos: payload.photos ?? [],
      vetContacted: payload.vetContacted ?? false,
    },
    include: defaultInclude,
  });
};

const listIncidents = async (tenantId, { petId, bookingId } = {}) => {
  const tenantDb = forTenant(tenantId);
  const where = {};

  if (petId) {
    where.petId = petId;
  }

  if (bookingId) {
    where.bookingId = bookingId;
  }

  return tenantDb.incidentReport.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    include: defaultInclude,
  });
};

module.exports = {
  createIncident,
  listIncidents,
};
