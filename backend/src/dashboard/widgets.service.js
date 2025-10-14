const { addDays, differenceInCalendarDays, endOfDay, startOfDay } = require('date-fns');
const { forTenant } = require('../lib/tenantPrisma');

async function getShiftHandoff(tenantId) {
  const tenantDb = forTenant(tenantId);
  const today = new Date();
  const start = startOfDay(today);
  const sixHoursAgo = addDays(today, -0.25);

  const [criticalAlerts, pendingTasks, recentIncidents, recentCheckIns] = await Promise.all([
    tenantDb.checkIn.findMany({
      where: {
        time: { gte: sixHoursAgo },
        OR: [
          { conditionRating: { lte: 2 } },
          { notes: { contains: 'refused' } },
          { notes: { contains: 'anxious' } },
          { notes: { contains: 'concern' } },
        ],
      },
      include: {
        booking: {
          include: {
            pet: true,
            segments: { include: { kennel: true }, take: 1 },
          },
        },
      },
      take: 10,
    }),
    tenantDb.booking.findMany({
      where: {
        status: 'IN_PROGRESS',
        specialInstructions: { not: null },
      },
      include: {
        pet: true,
        segments: { include: { kennel: true }, take: 1 },
      },
      take: 10,
    }),
    tenantDb.incidentReport.findMany({
      where: {
        occurredAt: { gte: addDays(start, -1) },
      },
      include: {
        pet: true,
        booking: {
          include: {
            segments: { include: { kennel: true }, take: 1 },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 5,
    }),
    tenantDb.checkIn.findMany({
      where: {
        time: { gte: start },
        notes: { not: null },
      },
      include: {
        booking: {
          include: {
            pet: true,
            segments: { include: { kennel: true }, take: 1 },
          },
        },
        staff: true,
      },
      orderBy: { time: 'desc' },
      take: 10,
    }),
  ]);

  return {
    criticalAlerts: criticalAlerts.map((checkIn) => ({ recordId: checkIn.recordId,
      time: checkIn.time,
      notes: checkIn.notes,
      conditionRating: checkIn.conditionRating,
      petName: checkIn.booking.pet.name,
      kennelName: checkIn.booking.segments[0]?.kennel?.name ?? 'Unassigned',
    })),
    pendingTasks: pendingTasks.map((booking) => ({ recordId: booking.recordId,
      petName: booking.pet.name,
      kennelName: booking.segments[0]?.kennel?.name ?? 'Unassigned',
      specialInstructions: booking.specialInstructions,
    })),
    recentIncidents: recentIncidents.map((incident) => ({ recordId: incident.recordId,
      occurredAt: incident.occurredAt,
      description: incident.description,
      petName: incident.pet?.name,
      kennelName: incident.booking?.segments[0]?.kennel?.name ?? 'Unassigned',
    })),
    recentCheckIns: recentCheckIns.map((checkIn) => ({ recordId: checkIn.recordId,
      time: checkIn.time,
      notes: checkIn.notes,
      staffName: checkIn.staff ? `${checkIn.staff.firstName} ${checkIn.staff.lastName}` : null,
      petName: checkIn.booking.pet.name,
      kennelName: checkIn.booking.segments[0]?.kennel?.name ?? 'Unassigned',
    })),
  };
}

async function getEmergencyAccess(tenantId) {
  const tenantDb = forTenant(tenantId);

  const criticalPets = await tenantDb.booking.findMany({
    where: {
      status: 'IN_PROGRESS',
      OR: [
        { pet: { medicalNotes: { contains: 'allerg' } } },
        { pet: { medicalNotes: { contains: 'seizure' } } },
        { pet: { medicalNotes: { contains: 'heart' } } },
        { pet: { medicalNotes: { contains: 'diabetes' } } },
        { pet: { medicalNotes: { contains: 'emergency' } } },
      ],
    },
    include: {
      pet: true,
      owner: true,
      segments: { include: { kennel: true }, take: 1 },
    },
    take: 20,
  });

  return criticalPets.map((booking) => ({ recordId: booking.recordId,
    petName: booking.pet.name,
    kennelName: booking.segments[0]?.kennel?.name ?? 'Unassigned',
    medicalNotes: booking.pet.medicalNotes,
    ownerName: `${booking.owner.firstName} ${booking.owner.lastName}`,
    ownerPhone: booking.owner.phone,
    ownerEmail: booking.owner.email,
    emergencyContact: booking.owner.emergencyContact,
    vetInfo: booking.pet.medicalNotes?.match(/vet[:\s]+([^\n.]+)/i)?.[1] ?? null,
  }));
}

async function getWellnessMonitoring(tenantId) {
  const tenantDb = forTenant(tenantId);
  const twoDaysAgo = addDays(new Date(), -2);

  const [recentCheckIns, activeBookings] = await Promise.all([
    tenantDb.checkIn.findMany({
      where: {
        time: { gte: twoDaysAgo },
      },
      include: {
        booking: {
          include: {
            pet: true,
            segments: { include: { kennel: true }, take: 1 },
          },
        },
      },
      orderBy: { time: 'desc' },
    }),
    tenantDb.booking.findMany({
      where: {
        status: 'IN_PROGRESS',
      },
      include: {
        pet: true,
        checkIns: {
          orderBy: { time: 'desc' },
          take: 5,
        },
        segments: { include: { kennel: true }, take: 1 },
      },
    }),
  ]);

  const concerns = [];

  activeBookings.forEach((booking) => {
    const checkIns = booking.checkIns;
    if (checkIns.length >= 2) {
      const latest = checkIns[0];
      const previous = checkIns[checkIns.length - 1];

      if (latest.weight && previous.weight) {
        const percentChange = Math.abs(((latest.weight - previous.weight) / previous.weight) * 100);
        if (percentChange > 5) {
          concerns.push({
            type: 'weight_change',
            severity: percentChange > 10 ? 'danger' : 'warning',
            petName: booking.pet.name,
            kennelName: booking.segments[0]?.kennel?.name ?? 'Unassigned',
            message: `Weight ${latest.weight > previous.weight ? 'gain' : 'loss'} of ${percentChange.toFixed(1)}%`,
            data: { current: latest.weight, previous: previous.weight, change: percentChange },
          });
        }
      }

      if (latest.conditionRating && latest.conditionRating <= 2) {
        concerns.push({
          type: 'low_condition',
          severity: 'danger',
          petName: booking.pet.name,
          kennelName: booking.segments[0]?.kennel?.name ?? 'Unassigned',
          message: `Low condition rating: ${latest.conditionRating}/5`,
          data: { rating: latest.conditionRating },
        });
      }
    }
  });

  return {
    concerns,
    totalMonitored: activeBookings.length,
    lastUpdated: new Date().toISOString(),
  };
}

async function getParentCommunication(tenantId) {
  const tenantDb = forTenant(tenantId);
  const today = new Date();
  const start = startOfDay(today);

  const activeBookings = await tenantDb.booking.findMany({
    where: {
      status: 'IN_PROGRESS',
    },
    include: {
      pet: true,
      owner: true,
      checkIns: {
        where: {
          time: { gte: start },
        },
        orderBy: { time: 'desc' },
      },
      segments: { include: { kennel: true }, take: 1 },
    },
  });

  const needsUpdate = [];
  const recentUpdates = [];

  activeBookings.forEach((booking) => {
    const todayCheckIns = booking.checkIns;
    const hasPhotos = todayCheckIns.some((ci) => {
      try {
        const photos = JSON.parse(ci.photos);
        return photos.length > 0;
      } catch {
        return false;
      }
    });

    if (!hasPhotos) {
      needsUpdate.push({ recordId: booking.recordId,
        petName: booking.pet.name,
        ownerName: `${booking.owner.firstName} ${booking.owner.lastName}`,
        priority: booking.checkIn === start ? 'high' : 'normal',
        daysStayed: differenceInCalendarDays(today, booking.checkIn),
      });
    } else {
      recentUpdates.push({ recordId: booking.recordId,
        petName: booking.pet.name,
        photoCount: todayCheckIns.reduce((sum, ci) => {
          try {
            return sum + JSON.parse(ci.photos).length;
          } catch {
            return sum;
          }
        }, 0),
        lastUpdate: todayCheckIns[0]?.time,
      });
    }
  });

  return {
    needsUpdate,
    recentUpdates,
    totalActive: activeBookings.length,
    updateRate: ((recentUpdates.length / activeBookings.length) * 100).toFixed(1),
  };
}

async function getFacilityHeatmap(tenantId) {
  const tenantDb = forTenant(tenantId);
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  const [kennels, activeSegments] = await Promise.all([
    tenantDb.kennel.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),
    tenantDb.bookingSegment.findMany({
      where: {
        startDate: { lte: end },
        endDate: { gte: start },
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
      include: {
        booking: {
          include: {
            pet: true,
            owner: true,
          },
        },
      },
    }),
  ]);

  return kennels.map((kennel) => {
    const segment = activeSegments.find((s) => s.kennelId === kennel.recordId);
    const status = segment
      ? segment.booking.status === 'IN_PROGRESS'
        ? 'occupied'
        : 'reserved'
      : 'available';

    return { recordId: kennel.recordId,
      name: kennel.name,
      type: kennel.type,
      size: kennel.size,
      capacity: kennel.capacity,
      status,
      pet: segment
        ? {
            name: segment.booking.pet.name,
            breed: segment.booking.pet.breed,
            ownerName: `${segment.booking.owner.firstName} ${segment.booking.owner.lastName}`,
            checkOut: segment.endDate,
            specialNeeds: segment.booking.specialInstructions,
          }
        : null,
    };
  });
}

async function getSocialCompatibility(tenantId) {
  const tenantDb = forTenant(tenantId);

  const [activeBookings, incidents] = await Promise.all([
    tenantDb.booking.findMany({
      where: {
        status: 'IN_PROGRESS',
      },
      include: {
        pet: true,
        segments: { include: { kennel: true }, take: 1 },
      },
    }),
    tenantDb.incidentReport.findMany({
      where: {
        occurredAt: { gte: addDays(new Date(), -90) },
      },
      include: {
        pet: true,
      },
    }),
  ]);

  const petCompatibility = activeBookings.map((booking) => {
    const pet = booking.pet;
    const behaviorFlags = typeof pet.behaviorFlags === 'object' ? pet.behaviorFlags : {};
    const petIncidents = incidents.filter((i) => i.petId === pet.recordId);

    return { recordId: pet.recordId,
      name: pet.name,
      breed: pet.breed,
      kennelName: booking.segments[0]?.kennel?.name ?? 'Unassigned',
      energyLevel: behaviorFlags.energyLevel || 'medium',
      playStyle: behaviorFlags.playStyle || 'gentle',
      size: behaviorFlags.size || 'medium',
      warnings: [
        behaviorFlags.aggressionTowards && `Aggression: ${behaviorFlags.aggressionTowards}`,
        petIncidents.length > 2 && `${petIncidents.length} incidents in 90 days`,
      ].filter(Boolean),
      incidentCount: petIncidents.length,
    };
  });

  const highEnergy = petCompatibility.filter((p) => p.energyLevel === 'high' && !p.warnings.length);
  const gentlePlay = petCompatibility.filter((p) => p.playStyle === 'gentle' && !p.warnings.length);
  const needsSupervision = petCompatibility.filter((p) => p.warnings.length > 0);

  return {
    suggestedGroups: [
      {
        name: 'High Energy Group',
        pets: highEnergy.map((p) => ({ name: p.name, kennel: p.kennelName })),
        compatibilityScore: 95,
        recommendedTime: '2:00 PM - 3:00 PM',
      },
      {
        name: 'Gentle Play Group',
        pets: gentlePlay.map((p) => ({ name: p.name, kennel: p.kennelName })),
        compatibilityScore: 90,
        recommendedTime: '3:00 PM - 4:00 PM',
      },
    ],
    warnings: needsSupervision.map((p) => ({
      petName: p.name,
      kennelName: p.kennelName,
      warnings: p.warnings,
      recommendation: 'Individual play only',
    })),
  };
}

module.exports = {
  getShiftHandoff,
  getEmergencyAccess,
  getWellnessMonitoring,
  getParentCommunication,
  getFacilityHeatmap,
  getSocialCompatibility,
};
