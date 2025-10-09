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

/**
 * 1. TODAY'S SHIFT HANDOFF
 * Critical information for staff transitions
 */
const getShiftHandoff = async (tenantId) => {
  const tenantDb = forTenant(tenantId);
  const today = new Date();
  const start = startOfDay(today);
  const sixHoursAgo = addDays(today, -0.25); // 6 hours

  const [criticalAlerts, pendingTasks, recentIncidents, recentCheckIns] = await Promise.all([
    // Critical alerts: pets with concerning check-in notes or low condition ratings
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

    // Pending tasks: medications, special feeding, etc. from booking special instructions
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

    // Recent incidents from last 24 hours
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

    // Recent check-ins with notes
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
    alerts: criticalAlerts.map((checkIn) => ({
      id: checkIn.id,
      type: 'critical',
      petName: checkIn.booking.pet.name,
      kennelName: checkIn.booking.segments[0]?.kennel?.name ?? 'Unassigned',
      message: checkIn.notes || `Low condition rating: ${checkIn.conditionRating}/5`,
      time: checkIn.time,
    })),
    tasks: pendingTasks.map((booking) => ({
      id: booking.id,
      petName: booking.pet.name,
      kennelName: booking.segments[0]?.kennel?.name ?? 'Unassigned',
      task: booking.specialInstructions,
      dueTime: booking.checkOut,
    })),
    incidents: recentIncidents.map((incident) => ({
      id: incident.id,
      severity: incident.severity,
      petName: incident.pet.name,
      kennelName: incident.booking?.segments[0]?.kennel?.name ?? 'Unknown',
      narrative: incident.narrative,
      occurredAt: incident.occurredAt,
    })),
    staffNotes: recentCheckIns.map((checkIn) => ({
      id: checkIn.id,
      petName: checkIn.booking.pet.name,
      kennelName: checkIn.booking.segments[0]?.kennel?.name ?? 'Unassigned',
      note: checkIn.notes,
      staffName: checkIn.staff?.name ?? 'Staff',
      time: checkIn.time,
    })),
  };
};

/**
 * 2. EMERGENCY QUICK ACCESS
 * Critical medical info and emergency contacts
 */
const getEmergencyAccess = async (tenantId) => {
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

  return criticalPets.map((booking) => ({
    id: booking.id,
    petName: booking.pet.name,
    kennelName: booking.segments[0]?.kennel?.name ?? 'Unassigned',
    medicalNotes: booking.pet.medicalNotes,
    ownerName: `${booking.owner.firstName} ${booking.owner.lastName}`,
    ownerPhone: booking.owner.phone,
    ownerEmail: booking.owner.email,
    emergencyContact: booking.owner.emergencyContact,
    vetInfo: booking.pet.medicalNotes?.match(/vet[:\s]+([^\n.]+)/i)?.[1] ?? null,
  }));
};

/**
 * 3. PET WELLNESS DASHBOARD
 * Health monitoring and pattern detection
 */
const getWellnessMonitoring = async (tenantId) => {
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

  // Analyze eating patterns, weight changes, and condition ratings
  const concerns = [];

  activeBookings.forEach((booking) => {
    const checkIns = booking.checkIns;
    if (checkIns.length >= 2) {
      const latest = checkIns[0];
      const previous = checkIns[checkIns.length - 1];

      // Weight change > 5%
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

      // Low condition rating
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
};

/**
 * 4. PARENT COMMUNICATION HUB
 * Track photo updates and communication metrics
 */
const getParentCommunication = async (tenantId) => {
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
      needsUpdate.push({
        id: booking.id,
        petName: booking.pet.name,
        ownerName: `${booking.owner.firstName} ${booking.owner.lastName}`,
        priority: booking.checkIn === start ? 'high' : 'normal', // High priority for first day
        daysStayed: differenceInCalendarDays(today, booking.checkIn),
      });
    } else {
      recentUpdates.push({
        id: booking.id,
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
};

/**
 * 5. LIVE FACILITY HEATMAP
 * Real-time kennel occupancy visualization
 */
const getFacilityHeatmap = async (tenantId) => {
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
    const segment = activeSegments.find((s) => s.kennelId === kennel.id);
    const status = segment
      ? segment.booking.status === 'IN_PROGRESS'
        ? 'occupied'
        : 'reserved'
      : 'available';

    return {
      id: kennel.id,
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
};

/**
 * 6. REVENUE OPTIMIZER
 * AI-driven revenue suggestions and upsell opportunities
 */
const getRevenueOptimizer = async (tenantId) => {
  const tenantDb = forTenant(tenantId);
  const today = new Date();
  const weekAhead = addDays(today, 7);
  const thirtyDaysAgo = addDays(today, -30);

  const [emptyKennels, longStayGuests, waitlistBookings, services, recentBookings] = await Promise.all([
    // Empty kennels this weekend
    tenantDb.kennel.findMany({
      where: {
        isActive: true,
        segments: {
          none: {
            startDate: { lte: weekAhead },
            endDate: { gte: today },
          },
        },
      },
    }),

    // Long-term guests (5+ days) for upsell opportunities
    tenantDb.booking.findMany({
      where: {
        status: 'IN_PROGRESS',
        checkOut: { gte: addDays(today, 5) },
      },
      include: {
        pet: true,
        services: { include: { service: true } },
        owner: true,
      },
    }),

    // Waitlist that could pay premium
    tenantDb.booking.count({
      where: {
        status: 'PENDING',
        checkIn: { gte: today, lte: weekAhead },
      },
    }),

    // Available services for upsell
    tenantDb.service.findMany({
      where: { isActive: true },
      orderBy: { priceCents: 'desc' },
    }),

    // Recent booking patterns for predictions
    tenantDb.booking.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        owner: true,
        services: true,
      },
    }),
  ]);

  // Calculate upsell conversion rates
  const groomingService = services.find((s) => s.category === 'GROOMING');
  const longStayWithoutGrooming = longStayGuests.filter(
    (b) => !b.services.some((s) => s.service.category === 'GROOMING')
  );

  const potentialRevenue = {
    emptyKennels: emptyKennels.length * 50 * 2, // Avg $50/night for 2 nights
    groomingUpsells: longStayWithoutGrooming.length * (groomingService?.priceCents || 4500) / 100,
    premiumWaitlist: waitlistBookings * 15, // $15 premium for waitlist bookings
  };

  return {
    potentialRevenue: Object.values(potentialRevenue).reduce((a, b) => a + b, 0),
    opportunities: [
      {
        type: 'empty_kennels',
        count: emptyKennels.length,
        potential: potentialRevenue.emptyKennels,
        message: `${emptyKennels.length} kennels empty this weekend`,
        action: 'Send promotional email to recent clients',
      },
      {
        type: 'grooming_upsell',
        count: longStayWithoutGrooming.length,
        potential: potentialRevenue.groomingUpsells,
        message: `${longStayWithoutGrooming.length} long-stay guests without grooming`,
        action: 'Offer grooming add-on (80% conversion rate)',
        pets: longStayWithoutGrooming.map((b) => ({
          petName: b.pet.name,
          ownerName: `${b.owner.firstName} ${b.owner.lastName}`,
          daysRemaining: differenceInCalendarDays(b.checkOut, today),
        })),
      },
      {
        type: 'premium_waitlist',
        count: waitlistBookings,
        potential: potentialRevenue.premiumWaitlist,
        message: `${waitlistBookings} waitlist bookings`,
        action: 'Offer premium pricing for confirmed spots',
      },
    ],
  };
};

/**
 * 7. SOCIAL COMPATIBILITY MATRIX
 * Play group suggestions based on behavior data
 */
const getSocialCompatibility = async (tenantId) => {
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
        occurredAt: { gte: addDays(new Date(), -90) }, // Last 90 days
      },
      include: {
        pet: true,
      },
    }),
  ]);

  // Analyze behavior flags and incident history
  const petCompatibility = activeBookings.map((booking) => {
    const pet = booking.pet;
    const behaviorFlags = typeof pet.behaviorFlags === 'object' ? pet.behaviorFlags : {};
    const petIncidents = incidents.filter((i) => i.petId === pet.id);

    return {
      id: pet.id,
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

  // Generate compatible groups
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
};

/**
 * 8. STAFFING INTELLIGENCE
 * Predictive staffing recommendations
 */
const getStaffingIntelligence = async (tenantId) => {
  const tenantDb = forTenant(tenantId);
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const weekAhead = addDays(today, 7);

  const [todayBookings, tomorrowBookings, upcomingBookings, staff] = await Promise.all([
    tenantDb.booking.count({
      where: {
        status: 'IN_PROGRESS',
      },
    }),

    tenantDb.booking.count({
      where: {
        checkIn: {
          gte: startOfDay(tomorrow),
          lte: endOfDay(tomorrow),
        },
      },
    }),

    tenantDb.booking.findMany({
      where: {
        checkIn: {
          gte: tomorrow,
          lte: weekAhead,
        },
      },
      include: {
        pet: true,
      },
    }),

    tenantDb.staff.count({
      where: {
        isActive: true,
      },
    }),
  ]);

  // Calculate recommended staffing ratios
  const recommendedStaffToday = Math.ceil(todayBookings / 5); // 1:5 ratio
  const recommendedStaffTomorrow = Math.ceil(tomorrowBookings / 5);

  // Analyze special skill needs
  const medicalNeedsPets = upcomingBookings.filter((b) =>
    b.pet.medicalNotes?.toLowerCase().includes('medication')
  ).length;
  const puppiesCount = upcomingBookings.filter((b) => {
    const birthdate = b.pet.birthdate;
    return birthdate && differenceInCalendarDays(today, birthdate) < 365;
  }).length;

  return {
    today: {
      activeBookings: todayBookings,
      currentStaff: staff,
      recommended: recommendedStaffToday,
      status: staff >= recommendedStaffToday ? 'optimal' : 'understaffed',
    },
    tomorrow: {
      expectedCheckIns: tomorrowBookings,
      recommended: recommendedStaffTomorrow,
      specialNeeds: {
        medicalCare: medicalNeedsPets,
        puppySupervision: puppiesCount,
      },
      skillsNeeded: [
        medicalNeedsPets > 0 && 'Vet tech for medication administration',
        puppiesCount > 2 && 'Puppy care specialist',
      ].filter(Boolean),
    },
    weekForecast: upcomingBookings.length,
  };
};

/**
 * 9. CUSTOMER LIFETIME VALUE TRACKER
 * Customer intelligence and churn prediction
 */
const getCustomerCLV = async (tenantId) => {
  const tenantDb = forTenant(tenantId);
  const ninetyDaysAgo = addDays(new Date(), -90);
  const thirtyDaysAgo = addDays(new Date(), -30);

  const [owners, bookings, payments] = await Promise.all([
    tenantDb.owner.findMany({
      include: {
        bookings: {
          include: {
            payments: true,
            services: true,
          },
        },
      },
    }),

    tenantDb.booking.findMany({
      where: {
        createdAt: { gte: ninetyDaysAgo },
      },
      include: {
        owner: true,
        payments: true,
      },
    }),

    tenantDb.payment.findMany({
      where: {
        createdAt: { gte: ninetyDaysAgo },
      },
    }),
  ]);

  // Calculate CLV for each owner
  const ownerMetrics = owners.map((owner) => {
    const ownerBookings = owner.bookings;
    const totalRevenue = ownerBookings.reduce((sum, b) => {
      const paid = b.payments.reduce((s, p) => s + p.amountCents, 0);
      return sum + paid;
    }, 0) / 100;

    const lastBooking = ownerBookings.sort((a, b) => new Date(b.checkOut) - new Date(b.checkOut))[0];
    const daysSinceLastVisit = lastBooking ? differenceInCalendarDays(new Date(), lastBooking.checkOut) : 999;

    const avgDaysBetween = ownerBookings.length > 1
      ? ownerBookings.reduce((sum, booking, i) => {
          if (i === 0) return 0;
          return sum + differenceInCalendarDays(new Date(booking.checkIn), new Date(ownerBookings[i - 1].checkOut));
        }, 0) / (ownerBookings.length - 1)
      : 30;

    const isAtRisk = daysSinceLastVisit > avgDaysBetween * 1.5;
    const isVIP = totalRevenue > 1000;

    return {
      id: owner.id,
      name: `${owner.firstName} ${owner.lastName}`,
      email: owner.email,
      phone: owner.phone,
      lifetimeValue: totalRevenue,
      bookingCount: ownerBookings.length,
      lastVisit: lastBooking?.checkOut,
      daysSinceLastVisit,
      avgDaysBetween,
      isAtRisk,
      isVIP,
      riskLevel: daysSinceLastVisit > avgDaysBetween * 2 ? 'high' : isAtRisk ? 'medium' : 'low',
    };
  });

  const vipCustomers = ownerMetrics.filter((o) => o.isVIP).sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  const atRiskCustomers = ownerMetrics.filter((o) => o.isAtRisk && o.isVIP);

  return {
    vipCustomers: vipCustomers.slice(0, 10),
    atRiskCustomers: atRiskCustomers.slice(0, 5),
    totalRevenue: ownerMetrics.reduce((sum, o) => sum + o.lifetimeValue, 0),
    activeCustomers: ownerMetrics.filter((o) => o.daysSinceLastVisit < 60).length,
  };
};

/**
 * 10. INCIDENT & TREND ANALYTICS
 * Pattern detection for proactive prevention
 */
const getIncidentAnalytics = async (tenantId) => {
  const tenantDb = forTenant(tenantId);
  const ninetyDaysAgo = addDays(new Date(), -90);

  const incidents = await tenantDb.incidentReport.findMany({
    where: {
      occurredAt: { gte: ninetyDaysAgo },
    },
    include: {
      pet: true,
      booking: {
        include: {
          segments: {
            include: { kennel: true },
          },
        },
      },
    },
  });

  // Analyze patterns
  const kennelHotspots = {};
  const timePatterns = {};
  const breedPatterns = {};

  incidents.forEach((incident) => {
    const kennelName = incident.booking?.segments[0]?.kennel?.name;
    if (kennelName) {
      kennelHotspots[kennelName] = (kennelHotspots[kennelName] || 0) + 1;
    }

    const hour = new Date(incident.occurredAt).getHours();
    const timeSlot = `${hour}:00-${hour + 1}:00`;
    timePatterns[timeSlot] = (timePatterns[timeSlot] || 0) + 1;

    const breed = incident.pet.breed || 'Unknown';
    breedPatterns[breed] = (breedPatterns[breed] || 0) + 1;
  });

  const topKennelHotspots = Object.entries(kennelHotspots)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([kennel, count]) => ({ kennel, incidents: count }));

  const topTimeSlots = Object.entries(timePatterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([time, count]) => ({ time, incidents: count }));

  const topBreeds = Object.entries(breedPatterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([breed, count]) => ({ breed, incidents: count }));

  return {
    totalIncidents: incidents.length,
    bySeverity: {
      minor: incidents.filter((i) => i.severity === 'MINOR').length,
      moderate: incidents.filter((i) => i.severity === 'MODERATE').length,
      major: incidents.filter((i) => i.severity === 'MAJOR').length,
    },
    kennelHotspots: topKennelHotspots,
    timePatterns: topTimeSlots,
    breedInsights: topBreeds,
    recommendations: [
      topKennelHotspots.length > 0 && `Investigate ${topKennelHotspots[0].kennel} - ${topKennelHotspots[0].incidents} incidents`,
      topTimeSlots.length > 0 && `Increase supervision during ${topTimeSlots[0].time}`,
      topBreeds.length > 0 && `${topBreeds[0].breed} has elevated incidents - review protocols`,
    ].filter(Boolean),
  };
};

module.exports = {
  getStats,
  getOccupancy,
  getUpcomingVaccinations,
  getShiftHandoff,
  getEmergencyAccess,
  getWellnessMonitoring,
  getParentCommunication,
  getFacilityHeatmap,
  getRevenueOptimizer,
  getSocialCompatibility,
  getStaffingIntelligence,
  getCustomerCLV,
  getIncidentAnalytics,
};
