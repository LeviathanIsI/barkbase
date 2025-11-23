const { Router } = require('express');
const { getPool } = require('../../lib/db');
const { ok, fail } = require('../../lib/utils/responses');

const router = Router();

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/reports/dashboard-stats', getDashboardStats);
router.get('/dashboard/today-pets', getTodaysPets);
router.get('/dashboard/today/in-facility', getTodaysPets);
router.get('/dashboard/arrivals', getUpcomingArrivals);
router.get('/dashboard/today/arrivals', getUpcomingArrivals);
router.get('/dashboard/departures', getUpcomingDepartures);
router.get('/dashboard/occupancy', getOccupancy);
router.get('/dashboard/revenue', getRevenueMetrics);
router.get('/dashboard/activity', getActivityFeed);

// Reports
router.get('/dashboard/metrics', getDashboardMetrics);
router.get('/reports/dashboard', getDashboardMetrics);
router.get('/reports/revenue', getRevenueReport);
router.get('/reports/occupancy', getOccupancyReport);
router.get('/reports/arrivals', getReportArrivals);
router.get('/reports/departures', getReportDepartures);

// Schedule
router.get('/schedule/capacity', getScheduleCapacity);
router.get('/schedule', getSchedule);

module.exports = router;

async function getDashboardStats(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    const [
      petCount,
      ownerCount,
      activeBookings,
      todayCheckins,
      todayCheckouts,
      todayRevenue,
      weekRevenue,
      monthRevenue,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1 AND "status" = $2', [tenantId, 'active']),
      pool.query('SELECT COUNT(*) FROM "Owner" WHERE "tenantId" = $1', [tenantId]),
      pool.query(
        `SELECT COUNT(*) FROM "Booking"
             WHERE "tenantId" = $1
             AND "status" IN ('CHECKED_IN', 'CONFIRMED')
             AND "checkIn" <= $2 AND "checkOut" >= $2`,
        [tenantId, today],
      ),
      pool.query(
        `SELECT COUNT(*) FROM "Booking"
             WHERE "tenantId" = $1 AND "checkIn" = $2
             AND "status" IN ('PENDING', 'CONFIRMED')`,
        [tenantId, today],
      ),
      pool.query(
        `SELECT COUNT(*) FROM "Booking"
             WHERE "tenantId" = $1 AND "checkOut" = $2
             AND "status" IN ('CHECKED_IN', 'CONFIRMED')`,
        [tenantId, today],
      ),
      pool.query(
        `SELECT COALESCE(SUM("amountCents"), 0) as total
             FROM "Payment"
             WHERE "tenantId" = $1
             AND "createdAt"::date = $2
             AND "status" = 'CAPTURED'`,
        [tenantId, today],
      ),
      pool.query(
        `SELECT COALESCE(SUM("amountCents"), 0) as total
             FROM "Payment"
             WHERE "tenantId" = $1
             AND "createdAt" >= date_trunc('week', CURRENT_DATE)
             AND "status" = 'CAPTURED'`,
        [tenantId],
      ),
      pool.query(
        `SELECT COALESCE(SUM("amountCents"), 0) as total
             FROM "Payment"
             WHERE "tenantId" = $1
             AND "createdAt" >= date_trunc('month', CURRENT_DATE)
             AND "status" = 'CAPTURED'`,
        [tenantId],
      ),
    ]);

    const runCapacity = await pool.query(
      'SELECT COALESCE(SUM("maxCapacity"), 0) as total FROM "RunTemplate" WHERE "tenantId" = $1 AND "isActive" = true',
      [tenantId],
    );

    const totalCapacity = parseInt(runCapacity.rows[0].total, 10);
    const currentOccupancy = parseInt(activeBookings.rows[0].count, 10);
    const occupancyRate = totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;

    return ok(res, {
      totalPets: parseInt(petCount.rows[0].count, 10),
      totalOwners: parseInt(ownerCount.rows[0].count, 10),
      activeBookings: parseInt(activeBookings.rows[0].count, 10),
      todayCheckins: parseInt(todayCheckins.rows[0].count, 10),
      todayCheckouts: parseInt(todayCheckouts.rows[0].count, 10),
      occupancyRate,
      revenue: {
        today: parseInt(todayRevenue.rows[0].total, 10) / 100,
        thisWeek: parseInt(weekRevenue.rows[0].total, 10) / 100,
        thisMonth: parseInt(monthRevenue.rows[0].total, 10) / 100,
      },
    });
  } catch (error) {
    console.error('[analytics] getDashboardStats failed', error);
    return fail(res, 500, { message: 'Failed to load dashboard stats' });
  }
}

async function getTodaysPets(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT
            p."recordId", p."name" as "petName", p."breed", p."photoUrl",
            p."medicalNotes", p."behaviorNotes", p."dietaryNotes",
            o."recordId" as "ownerId", o."firstName", o."lastName",
            o."phone", o."email",
            b."recordId" as "bookingId", b."status", b."checkIn", b."checkOut",
            b."notes", b."specialRequirements",
            CASE
                WHEN b."checkIn" = $2 AND b."status" IN ('PENDING', 'CONFIRMED') THEN 'arriving'
                WHEN b."checkOut" = $2 AND b."status" IN ('CHECKED_IN') THEN 'departing'
                WHEN b."status" = 'CHECKED_IN' THEN 'checked-in'
                ELSE 'other'
            END as "todayStatus",
            (
                SELECT array_agg(DISTINCT v."type")
                FROM "Vaccination" v
                WHERE v."petId" = p."recordId"
                AND v."expiresAt" < CURRENT_DATE + INTERVAL '30 days'
                AND v."expiresAt" >= CURRENT_DATE
            ) as "expiringVaccinations"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND (
            (b."checkIn" <= $2 AND b."checkOut" >= $2 AND b."status" IN ('CHECKED_IN', 'CONFIRMED'))
            OR (b."checkIn" = $2 AND b."status" IN ('PENDING', 'CONFIRMED'))
            OR (b."checkOut" = $2 AND b."status" IN ('CHECKED_IN'))
         )
         ORDER BY
            CASE
                WHEN b."checkIn" = $2 THEN 1
                WHEN b."checkOut" = $2 THEN 2
                ELSE 3
            END,
            p."name"`,
      [tenantId, today],
    );

    const pets = result.rows.map((row) => ({
      petId: row.recordId,
      petName: row.petName,
      breed: row.breed,
      photoUrl: row.photoUrl,
      owner: {
        id: row.ownerId,
        name: `${row.firstName} ${row.lastName}`.trim(),
        phone: row.phone,
        email: row.email,
      },
      booking: {
        id: row.bookingId,
        status: row.status,
        checkIn: row.checkIn,
        checkOut: row.checkOut,
        notes: row.notes,
        specialRequirements: row.specialRequirements,
      },
      status: row.todayStatus,
      warnings: [],
      notes: row.notes,
    }));

    pets.forEach((pet) => {
      const row = result.rows.find((r) => r.recordId === pet.petId);
      if (pet.booking.specialRequirements?.includes('medication')) {
        pet.warnings.push('medication');
      }
      if (pet.booking.specialRequirements?.includes('special-diet')) {
        pet.warnings.push('special-diet');
      }
      if (row?.behaviorNotes?.toLowerCase().includes('aggressive') || row?.behaviorNotes?.toLowerCase().includes('bite')) {
        pet.warnings.push('aggressive');
      }
      if (row?.expiringVaccinations?.length > 0) {
        pet.warnings.push('expiring-vaccinations');
      }
    });

    return ok(res, pets);
  } catch (error) {
    console.error('[analytics] getTodaysPets failed', error);
    return fail(res, 500, { message: 'Failed to load today pets' });
  }
}

async function getUpcomingArrivals(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const { days = '7' } = req.query || {};
    const daysNum = parseInt(days, 10);

    const result = await pool.query(
      `SELECT
            b."recordId", b."checkIn", b."status",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND b."status" IN ('PENDING', 'CONFIRMED')
         AND b."checkIn" >= CURRENT_DATE
         AND b."checkIn" <= CURRENT_DATE + INTERVAL '${daysNum} days'
         ORDER BY b."checkIn", p."name"`,
      [tenantId],
    );

    const arrivals = result.rows.map((row) => ({
      bookingId: row.recordId,
      checkIn: row.checkIn,
      status: row.status,
      pet: {
        id: row.petId,
        name: row.petName,
        breed: row.breed,
      },
      owner: {
        id: row.ownerId,
        name: `${row.firstName} ${row.lastName}`.trim(),
      },
    }));

    return ok(res, arrivals);
  } catch (error) {
    console.error('[analytics] getUpcomingArrivals failed', error);
    return fail(res, 500, { message: 'Failed to load arrivals' });
  }
}

async function getUpcomingDepartures(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const { days = '7' } = req.query || {};
    const daysNum = parseInt(days, 10);

    const result = await pool.query(
      `SELECT
            b."recordId", b."checkOut", b."status", b."balanceDueCents",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND b."status" IN ('CHECKED_IN', 'CONFIRMED')
         AND b."checkOut" >= CURRENT_DATE
         AND b."checkOut" <= CURRENT_DATE + INTERVAL '${daysNum} days'
         ORDER BY b."checkOut", p."name"`,
      [tenantId],
    );

    const departures = result.rows.map((row) => ({
      bookingId: row.recordId,
      checkOut: row.checkOut,
      status: row.status,
      balanceDue: row.balanceDueCents / 100,
      pet: {
        id: row.petId,
        name: row.petName,
        breed: row.breed,
      },
      owner: {
        id: row.ownerId,
        name: `${row.firstName} ${row.lastName}`.trim(),
      },
    }));

    return ok(res, departures);
  } catch (error) {
    console.error('[analytics] getUpcomingDepartures failed', error);
    return fail(res, 500, { message: 'Failed to load departures' });
  }
}

async function getOccupancy(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    const capacityResult = await pool.query(
      `SELECT SUM("maxCapacity") as total
         FROM "RunTemplate"
         WHERE "tenantId" = $1 AND "isActive" = true`,
      [tenantId],
    );

    const occupancyResult = await pool.query(
      `SELECT COUNT(*) as total
         FROM "Booking" b
         WHERE b."tenantId" = $1
         AND b."status" = 'CHECKED_IN'
         AND b."checkIn" <= $2
         AND b."checkOut" >= $2`,
      [tenantId, today],
    );

    const capacity = capacityResult.rows[0];
    const occupancy = occupancyResult.rows[0];

    return ok(res, {
      current: parseInt(occupancy.total, 10),
      total: parseInt(capacity.total, 10) || 0,
      percentage: capacity.total > 0
        ? Math.round((parseInt(occupancy.total, 10) / parseInt(capacity.total, 10)) * 100)
        : 0,
    });
  } catch (error) {
    console.error('[analytics] getOccupancy failed', error);
    return fail(res, 500, { message: 'Failed to load occupancy' });
  }
}

async function getRevenueMetrics(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const { period = 'month' } = req.query || {};

    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND i.\"createdAt\" >= date_trunc('week', CURRENT_DATE)";
        break;
      case 'month':
        dateFilter = "AND i.\"createdAt\" >= date_trunc('month', CURRENT_DATE)";
        break;
      case 'year':
        dateFilter = "AND i.\"createdAt\" >= date_trunc('year', CURRENT_DATE)";
        break;
      default:
        break;
    }

    const result = await pool.query(
      `SELECT
            SUM(i."totalCents") as total,
            SUM(i."paidCents") as collected,
            SUM(i."totalCents" - i."paidCents") as pending,
            SUM(CASE
                WHEN i."dueDate" < CURRENT_DATE AND i."paidCents" < i."totalCents"
                THEN i."totalCents" - i."paidCents"
                ELSE 0
            END) as overdue
         FROM "Invoice" i
         WHERE i."tenantId" = $1
         AND i."status" != 'CANCELLED'
         ${dateFilter}`,
      [tenantId],
    );

    const chartResult = await pool.query(
      `SELECT
            DATE(p."createdAt") as date,
            SUM(p."amountCents") as amount
         FROM "Payment" p
         WHERE p."tenantId" = $1
         AND p."status" = 'CAPTURED'
         AND p."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY DATE(p."createdAt")
         ORDER BY date`,
      [tenantId],
    );

    const summary = result.rows[0];
    const chartData = chartResult.rows.map((row) => ({
      date: row.date,
      amount: parseInt(row.amount, 10) / 100,
    }));

    return ok(res, {
      total: parseInt(summary.total, 10) / 100 || 0,
      collected: parseInt(summary.collected, 10) / 100 || 0,
      pending: parseInt(summary.pending, 10) / 100 || 0,
      overdue: parseInt(summary.overdue, 10) / 100 || 0,
      chartData,
    });
  } catch (error) {
    console.error('[analytics] getRevenueMetrics failed', error);
    return fail(res, 500, { message: 'Failed to load revenue metrics' });
  }
}

async function getActivityFeed(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const { limit = '20' } = req.query || {};
    const limitNum = parseInt(limit, 10);

    const result = await pool.query(
      `(
            SELECT
                'check-in' as type,
                ci."createdAt" as timestamp,
                p."name" as petName,
                o."firstName" || ' ' || o."lastName" as ownerName,
                NULL as amount
            FROM "CheckIn" ci
            JOIN "Booking" b ON ci."bookingId" = b."recordId"
            JOIN "Pet" p ON b."petId" = p."recordId"
            JOIN "Owner" o ON b."ownerId" = o."recordId"
            WHERE b."tenantId" = $1
        )
        UNION ALL
        (
            SELECT
                'check-out' as type,
                co."createdAt" as timestamp,
                p."name" as petName,
                o."firstName" || ' ' || o."lastName" as ownerName,
                NULL as amount
            FROM "CheckOut" co
            JOIN "Booking" b ON co."bookingId" = b."recordId"
            JOIN "Pet" p ON b."petId" = p."recordId"
            JOIN "Owner" o ON b."ownerId" = o."recordId"
            WHERE b."tenantId" = $1
        )
        UNION ALL
        (
            SELECT
                'booking' as type,
                b."createdAt" as timestamp,
                p."name" as petName,
                o."firstName" || ' ' || o."lastName" as ownerName,
                NULL as amount
            FROM "Booking" b
            JOIN "Pet" p ON b."petId" = p."recordId"
            JOIN "Owner" o ON b."ownerId" = o."recordId"
            WHERE b."tenantId" = $1
            AND b."createdAt" >= CURRENT_DATE - INTERVAL '7 days'
        )
        UNION ALL
        (
            SELECT
                'payment' as type,
                pay."createdAt" as timestamp,
                NULL as petName,
                o."firstName" || ' ' || o."lastName" as ownerName,
                pay."amountCents" as amount
            FROM "Payment" pay
            JOIN "Owner" o ON pay."ownerId" = o."recordId"
            WHERE pay."tenantId" = $1
            AND pay."status" = 'CAPTURED'
        )
        ORDER BY timestamp DESC
        LIMIT $2`,
      [tenantId, limitNum],
    );

    const activities = result.rows.map((row) => ({
      type: row.type,
      timestamp: row.timestamp,
      petName: row.petname,
      ownerName: row.ownername,
      amount: row.amount ? row.amount / 100 : null,
      message: formatActivityMessage(row),
    }));

    return ok(res, activities);
  } catch (error) {
    console.error('[analytics] getActivityFeed failed', error);
    return fail(res, 500, { message: 'Failed to load activity feed' });
  }
}

async function getDashboardMetrics(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();

    const metrics = await Promise.all([
      pool.query('SELECT COUNT(*) FROM "Booking" WHERE "tenantId" = $1 AND "status" = \'CONFIRMED\'', [tenantId]),
      pool.query('SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1', [tenantId]),
      pool.query('SELECT COUNT(*) FROM "Owner" WHERE "tenantId" = $1', [tenantId]),
      pool.query('SELECT SUM("amountCents") FROM "Payment" WHERE "tenantId" = $1 AND "status" = \'CAPTURED\'', [tenantId]),
    ]);

    return ok(res, {
      activeBookings: parseInt(metrics[0].rows[0].count, 10),
      totalPets: parseInt(metrics[1].rows[0].count, 10),
      totalOwners: parseInt(metrics[2].rows[0].count, 10),
      totalRevenueCents: parseInt(metrics[3].rows[0].sum || 0, 10),
    });
  } catch (error) {
    console.error('[analytics] getDashboardMetrics failed', error);
    return fail(res, 500, { message: 'Failed to load dashboard metrics' });
  }
}

async function getRevenueReport(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const { startDate, endDate } = req.query || {};

    let query = `SELECT DATE("createdAt") as date, SUM("amountCents") as revenue
                 FROM "Payment"
                 WHERE "tenantId" = $1 AND "status" = 'CAPTURED'`;
    const params = [tenantId];
    let paramCount = 2;

    if (startDate) {
      query += ` AND "createdAt" >= $${paramCount}`;
      params.push(startDate);
      paramCount += 1;
    }

    if (endDate) {
      query += ` AND "createdAt" <= $${paramCount}`;
      params.push(endDate);
      paramCount += 1;
    }

    query += ' GROUP BY DATE("createdAt") ORDER BY date DESC';

    const { rows } = await pool.query(query, params);

    return ok(res, rows);
  } catch (error) {
    console.error('[analytics] getRevenueReport failed', error);
    return fail(res, 500, { message: 'Failed to load revenue report' });
  }
}

async function getOccupancyReport(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const { startDate, endDate } = req.query || {};

    const query = `
        SELECT DATE(bs."startDate") as date, COUNT(*) as occupied_kennels
        FROM "BookingSegment" bs
        WHERE bs."tenantId" = $1
        AND bs."startDate" >= $2
        AND bs."endDate" <= $3
        GROUP BY DATE(bs."startDate")
        ORDER BY date
    `;

    const { rows } = await pool.query(query, [tenantId, startDate || '2020-01-01', endDate || '2099-12-31']);

    return ok(res, rows);
  } catch (error) {
    console.error('[analytics] getOccupancyReport failed', error);
    return fail(res, 500, { message: 'Failed to load occupancy report' });
  }
}

async function getReportArrivals(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const { days = '7' } = req.query || {};
    const daysNum = parseInt(days, 10);

    const result = await pool.query(
      `SELECT
            b."recordId", b."checkIn", b."status",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName", o."phone", o."email"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND b."status" IN ('PENDING', 'CONFIRMED')
         AND b."checkIn" >= CURRENT_DATE
         AND b."checkIn" <= CURRENT_DATE + INTERVAL '${daysNum} days'
         ORDER BY b."checkIn", p."name"`,
      [tenantId],
    );

    return ok(res, {
      arrivals: result.rows.map((row) => ({
        bookingId: row.recordId,
        checkIn: row.checkIn,
        status: row.status,
        pet: {
          id: row.petId,
          name: row.petName,
          breed: row.breed,
        },
        owner: {
          id: row.ownerId,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
          email: row.email,
        },
      })),
    });
  } catch (error) {
    console.error('[analytics] getReportArrivals failed', error);
    return fail(res, 500, { message: 'Failed to load arrivals report' });
  }
}

async function getReportDepartures(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const { days = '7' } = req.query || {};
    const daysNum = parseInt(days, 10);

    const result = await pool.query(
      `SELECT
            b."recordId", b."checkOut", b."status", b."balanceDueCents",
            p."recordId" as "petId", p."name" as "petName", p."breed",
            o."recordId" as "ownerId", o."firstName", o."lastName", o."phone", o."email"
         FROM "Booking" b
         JOIN "Pet" p ON b."petId" = p."recordId"
         JOIN "Owner" o ON b."ownerId" = o."recordId"
         WHERE b."tenantId" = $1
         AND b."status" IN ('CHECKED_IN', 'CONFIRMED')
         AND b."checkOut" >= CURRENT_DATE
         AND b."checkOut" <= CURRENT_DATE + INTERVAL '${daysNum} days'
         ORDER BY b."checkOut", p."name"`,
      [tenantId],
    );

    return ok(res, {
      departures: result.rows.map((row) => ({
        bookingId: row.recordId,
        checkOut: row.checkOut,
        status: row.status,
        balanceDueCents: parseInt(row.balanceDueCents || 0, 10),
        pet: {
          id: row.petId,
          name: row.petName,
          breed: row.breed,
        },
        owner: {
          id: row.ownerId,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
          email: row.email,
        },
      })),
    });
  } catch (error) {
    console.error('[analytics] getReportDepartures failed', error);
    return fail(res, 500, { message: 'Failed to load departures report' });
  }
}

async function getScheduleCapacity(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const { startDate, endDate } = req.query || {};

    const { rows } = await pool.query(
      `WITH date_series AS (
            SELECT generate_series(
                $2::date,
                $3::date,
                '1 day'::interval
            )::date AS date
        ),
        total_capacity AS (
            SELECT COUNT(*) as count FROM "Kennel" WHERE "tenantId" = $1
        )
        SELECT
            ds.date,
            COUNT(DISTINCT b."recordId") as "bookedCount",
            tc.count as "totalCapacity",
            ROUND(
                COALESCE(COUNT(DISTINCT b."recordId")::numeric / NULLIF(tc.count, 0) * 100, 0),
                2
            ) as "utilizationPercent"
        FROM date_series ds
        CROSS JOIN total_capacity tc
        LEFT JOIN "Booking" b ON
            b."tenantId" = $1
            AND b."checkIn"::date <= ds.date
            AND b."checkOut"::date >= ds.date
            AND b."status" != 'CANCELLED'
        GROUP BY ds.date, tc.count
        ORDER BY ds.date`,
      [tenantId, startDate || '2020-01-01', endDate || '2099-12-31'],
    );

    return ok(res, rows);
  } catch (error) {
    console.error('[analytics] getScheduleCapacity failed', error);
    return fail(res, 500, { message: 'Failed to load schedule capacity' });
  }
}

async function getSchedule(req, res) {
  try {
    const tenantId = req.tenantId;
    const pool = getPool();
    const {
      from, to, startDate, endDate,
    } = req.query || {};
    const dateFrom = from || startDate || '2020-01-01';
    const dateTo = to || endDate || '2099-12-31';

    const { rows } = await pool.query(
      `SELECT
            b."recordId",
            b."checkIn",
            b."checkOut",
            b."status",
            b."serviceType",
            p."name" as "petName",
            p."recordId" as "petId",
            o."firstName" || ' ' || o."lastName" as "ownerName",
            o."recordId" as "ownerId",
            json_agg(
                json_build_object(
                    'kennelId', bs."kennelId",
                    'kennel', json_build_object('recordId', k."recordId", 'name', k."name")
                )
            ) FILTER (WHERE bs."kennelId" IS NOT NULL) as segments
         FROM "Booking" b
         LEFT JOIN "Pet" p ON b."petId" = p."recordId"
         LEFT JOIN "Owner" o ON p."ownerId" = o."recordId"
         LEFT JOIN "BookingSegment" bs ON b."recordId" = bs."bookingId"
         LEFT JOIN "Kennel" k ON bs."kennelId" = k."recordId"
         WHERE b."tenantId" = $1
           AND b."checkIn" <= $3
           AND b."checkOut" >= $2
         GROUP BY b."recordId", b."checkIn", b."checkOut", b."status", b."serviceType",
                  p."name", p."recordId", o."firstName", o."lastName", o."recordId"
         ORDER BY b."checkIn"`,
      [tenantId, dateFrom, dateTo],
    );

    return ok(res, rows);
  } catch (error) {
    console.error('[analytics] getSchedule failed', error);
    return fail(res, 500, { message: 'Failed to load schedule' });
  }
}

function formatActivityMessage(activity) {
  switch (activity.type) {
    case 'check-in':
      return `${activity.petname} checked in (${activity.ownername})`;
    case 'check-out':
      return `${activity.petname} checked out (${activity.ownername})`;
    case 'booking':
      return `New booking for ${activity.petname} (${activity.ownername})`;
    case 'payment':
      return `Payment received from ${activity.ownername} - $${activity.amount / 100}`;
    default:
      return 'Unknown activity';
  }
}

