const {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  startOfDay,
} = require('date-fns');
const { forTenant } = require('../lib/tenantPrisma');

async function getRevenueOptimizer(tenantId) {
  const tenantDb = forTenant(tenantId);
  const today = new Date();
  const weekAhead = addDays(today, 7);
  const thirtyDaysAgo = addDays(today, -30);

  const [emptyKennels, longStayGuests, waitlistBookings, services, recentBookings] = await Promise.all([
    tenantDb.kennel.findMany({
      where: {
        isActive: true,
        bookings: {
          none: {
            startDate: { lte: weekAhead },
            endDate: { gte: today },
          },
        },
      },
    }),
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
    tenantDb.booking.count({
      where: {
        status: 'PENDING',
        checkIn: { gte: today, lte: weekAhead },
      },
    }),
    tenantDb.service.findMany({
      where: { isActive: true },
      orderBy: { priceCents: 'desc' },
    }),
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

  const groomingService = services.find((s) => s.category === 'GROOMING');
  const longStayWithoutGrooming = longStayGuests.filter(
    (b) => !b.services.some((s) => s.service.category === 'GROOMING'),
  );

  const potentialRevenue = {
    emptyKennels: emptyKennels.length * 50 * 2,
    groomingUpsells:
      (longStayWithoutGrooming.length * (groomingService?.priceCents || 4500)) / 100,
    premiumWaitlist: waitlistBookings * 15,
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
}

async function getStaffingIntelligence(tenantId) {
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
    tenantDb.staff.count(),
  ]);

  const recommendedStaffToday = Math.ceil(todayBookings / 5);
  const recommendedStaffTomorrow = Math.ceil(tomorrowBookings / 5);

  const medicalNeedsPets = upcomingBookings.filter((b) =>
    b.pet.medicalNotes?.toLowerCase().includes('medication'),
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
}

async function getCustomerCLV(tenantId) {
  const tenantDb = forTenant(tenantId);
  const ninetyDaysAgo = addDays(new Date(), -90);

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

  const ownerMetrics = owners.map((owner) => {
    const ownerBookings = owner.bookings;
    const totalRevenue =
      ownerBookings.reduce((sum, b) => {
        const paid = b.payments.reduce((s, p) => s + p.amountCents, 0);
        return sum + paid;
      }, 0) / 100;

    const lastBooking = ownerBookings.sort(
      (a, b) => new Date(b.checkOut) - new Date(a.checkOut),
    )[0];
    const daysSinceLastVisit = lastBooking
      ? differenceInCalendarDays(new Date(), lastBooking.checkOut)
      : 999;

    const avgDaysBetween =
      ownerBookings.length > 1
        ? ownerBookings.reduce((sum, booking, i) => {
            if (i === 0) return 0;
            return (
              sum +
              differenceInCalendarDays(
                new Date(booking.checkIn),
                new Date(ownerBookings[i - 1].checkOut),
              )
            );
          }, 0) /
          (ownerBookings.length - 1)
        : 30;

    const isAtRisk = daysSinceLastVisit > avgDaysBetween * 1.5;
    const isVIP = totalRevenue > 1000;

    return { recordId: owner.recordId,
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

  const vipCustomers = ownerMetrics
    .filter((o) => o.isVIP)
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  const atRiskCustomers = ownerMetrics.filter((o) => o.isAtRisk && o.isVIP);

  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amountCents, 0) / 100;
  const averageBookingValue =
    bookings.reduce((sum, booking) => {
      const paid = booking.payments.reduce((s, p) => s + p.amountCents, 0);
      return sum + paid;
    }, 0) /
    100 /
    (bookings.length || 1);

  const repeatBookingRate =
    (bookings.filter((booking) => {
      const ownerBookingCount = ownerMetrics.find((o) => o.recordId === booking.ownerId)?.bookingCount || 0;
      return ownerBookingCount > 1;
    }).length /
      (bookings.length || 1)) *
    100;

  return {
    ownerMetrics,
    vipCustomers,
    atRiskCustomers,
    totals: {
      totalRevenue,
      averageBookingValue,
      repeatBookingRate: repeatBookingRate.toFixed(1),
    },
  };
}

async function getIncidentAnalytics(tenantId) {
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
      topKennelHotspots.length > 0 &&
        `Investigate ${topKennelHotspots[0].kennel} - ${topKennelHotspots[0].incidents} incidents`,
      topTimeSlots.length > 0 && `Increase supervision during ${topTimeSlots[0].time}`,
      topBreeds.length > 0 && `${topBreeds[0].breed} has elevated incidents - review protocols`,
    ].filter(Boolean),
  };
}

module.exports = {
  getRevenueOptimizer,
  getStaffingIntelligence,
  getCustomerCLV,
  getIncidentAnalytics,
};
