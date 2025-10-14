const { forTenant } = require('../lib/tenantPrisma');
const { AppError } = require('../utils/errors');
const { sendMail } = require('../lib/mailer');
const { sendSMS } = require('../lib/sms');

/**
 * Create a communication record
 */
const createCommunication = async (tenantId, data) => {
  const tenantDb = forTenant(tenantId);
  
  const communication = await tenantDb.communication.create({
    data: {
      ...data,
      tenantId,
    },
    include: {
      owner: true,
      user: true,
    },
  });

  // If it's an outbound email or SMS, actually send it
  if (data.direction === 'OUTBOUND') {
    if (data.type === 'EMAIL' && data.owner?.email) {
      await sendMail({
        to: data.owner.email,
        subject: data.subject,
        html: data.content,
      });
    } else if (data.type === 'SMS' && data.owner?.phone) {
      await sendSMS({
        to: data.owner.phone,
        message: data.content,
      });
    }
  }

  return communication;
};

/**
 * Get communications for a customer
 */
const getCustomerCommunications = async (tenantId, ownerId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { limit = 50, offset = 0, type, direction } = options;

  const where = {
    tenantId,
    ownerId,
  };

  if (type) {
    where.type = type;
  }

  if (direction) {
    where.direction = direction;
  }

  const [communications, total] = await Promise.all([
    tenantDb.communication.findMany({
      where,
      include: {
        user: {
          select: {
            recordId: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    tenantDb.communication.count({ where }),
  ]);

  return {
    data: communications,
    total,
    limit,
    offset,
  };
};

/**
 * Get customer activity timeline
 */
const getCustomerTimeline = async (tenantId, ownerId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { limit = 50, offset = 0 } = options;

  // Fetch different types of activities in parallel
  const [
    communications,
    bookings,
    payments,
    notes,
    incidents,
  ] = await Promise.all([
    // Communications
    tenantDb.communication.findMany({
      where: { tenantId, ownerId },
      select: {
        recordId: true,
        type: true,
        direction: true,
        subject: true,
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Recent bookings
    tenantDb.booking.findMany({
      where: { tenantId, ownerId },
      select: {
        recordId: true,
        status: true,
        checkIn: true,
        checkOut: true,
        createdAt: true,
        pet: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Recent payments
    tenantDb.payment.findMany({
      where: { tenantId, ownerId },
      select: {
        recordId: true,
        amountCents: true,
        status: true,
        createdAt: true,
        booking: {
          select: {
            recordId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Recent notes
    tenantDb.note.findMany({
      where: {
        tenantId,
        entityType: 'owner',
        entityId: ownerId,
      },
      select: {
        recordId: true,
        content: true,
        category: true,
        createdAt: true,
        author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Recent incidents involving their pets
    tenantDb.incidentReport.findMany({
      where: {
        tenantId,
        pet: {
          owners: {
            some: {
              ownerId,
            },
          },
        },
      },
      select: {
        recordId: true,
        severity: true,
        occurredAt: true,
        pet: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    }),
  ]);

  // Combine and sort all activities by date
  const timeline = [];

  communications.forEach((comm) => {
    timeline.push({ recordId: comm.recordId,
      type: 'communication',
      subtype: comm.type.toLowerCase(),
      title: comm.subject || `${comm.type} ${comm.direction}`,
      description: comm.user?.name ? `by ${comm.user.name}` : null,
      timestamp: comm.createdAt,
      data: comm,
    });
  });

  bookings.forEach((booking) => {
    timeline.push({ recordId: booking.recordId,
      type: 'booking',
      subtype: booking.status.toLowerCase(),
      title: `Booking ${booking.status.toLowerCase()} for ${booking.pet.name}`,
      description: `${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}`,
      timestamp: booking.createdAt,
      data: booking,
    });
  });

  payments.forEach((payment) => {
    timeline.push({ recordId: payment.recordId,
      type: 'payment',
      subtype: payment.status.toLowerCase(),
      title: `Payment ${payment.status.toLowerCase()}`,
      description: `$${(payment.amountCents / 100).toFixed(2)}`,
      timestamp: payment.createdAt,
      data: payment,
    });
  });

  notes.forEach((note) => {
    timeline.push({ recordId: note.recordId,
      type: 'note',
      subtype: note.category || 'general',
      title: 'Note added',
      description: `by ${note.author.name}`,
      timestamp: note.createdAt,
      data: note,
    });
  });

  incidents.forEach((incident) => {
    timeline.push({ recordId: incident.recordId,
      type: 'incident',
      subtype: incident.severity.toLowerCase(),
      title: `${incident.severity} incident with ${incident.pet.name}`,
      description: null,
      timestamp: incident.occurredAt,
      data: incident,
    });
  });

  // Sort by timestamp descending
  timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply pagination
  const paginatedTimeline = timeline.slice(offset, offset + limit);

  return {
    data: paginatedTimeline,
    total: timeline.length,
    limit,
    offset,
  };
};

/**
 * Get communication statistics for a customer
 */
const getCustomerCommunicationStats = async (tenantId, ownerId) => {
  const tenantDb = forTenant(tenantId);

  const stats = await tenantDb.communication.groupBy({
    by: ['type', 'direction'],
    where: {
      tenantId,
      ownerId,
    },
    _count: {
      recordId: true,
    },
  });

  const result = {
    total: 0,
    byType: {},
    byDirection: {},
  };

  stats.forEach((stat) => {
    const count = stat._count.recordId;
    result.total += count;

    if (!result.byType[stat.type]) {
      result.byType[stat.type] = 0;
    }
    result.byType[stat.type] += count;

    if (!result.byDirection[stat.direction]) {
      result.byDirection[stat.direction] = 0;
    }
    result.byDirection[stat.direction] += count;
  });

  return result;
};

module.exports = {
  createCommunication,
  getCustomerCommunications,
  getCustomerTimeline,
  getCustomerCommunicationStats,
};
