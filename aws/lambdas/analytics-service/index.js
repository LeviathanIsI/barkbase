/**
 * =============================================================================
 * BarkBase Analytics Service Lambda
 * =============================================================================
 *
 * Handles analytics and reporting endpoints:
 * - GET /api/v1/analytics/dashboard - Dashboard metrics
 * - GET /api/v1/analytics/revenue - Revenue analytics
 * - GET /api/v1/analytics/occupancy - Occupancy metrics
 * - GET /api/v1/analytics/customers - Customer analytics
 * - GET /api/v1/analytics/pets - Pet analytics
 *
 * =============================================================================
 */

// Import from layers (mounted at /opt/nodejs in Lambda)
let dbLayer, sharedLayer;

try {
  dbLayer = require('/opt/nodejs/db');
  sharedLayer = require('/opt/nodejs/index');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
  sharedLayer = require('../../layers/shared-layer/nodejs/index');
}

const { getPoolAsync, query } = dbLayer;
const {
  authenticateRequest,
  createResponse,
  parseBody,
} = sharedLayer;

/**
 * Extract tenant ID from X-Tenant-Id header (case-insensitive)
 * @param {object} event - Lambda event
 * @returns {string|null} - Tenant ID or null
 */
function getTenantIdFromHeader(event) {
  const headers = event.headers || {};
  // Check common header name variations (case-insensitive)
  const tenantId = headers['X-Tenant-Id'] ||
    headers['x-tenant-id'] ||
    headers['X-TENANT-ID'] ||
    headers['x-Tenant-Id'] ||
    null;

  if (tenantId) {
    console.log('[ANALYTICS-SERVICE] Got tenant ID from header:', tenantId);
  }

  return tenantId;
}

/**
 * Route requests to appropriate handlers
 */
exports.handler = async (event, context) => {
  // Handle admin path rewriting (Ops Center requests)
  const { handleAdminPathRewrite } = require('/opt/nodejs/index');
  handleAdminPathRewrite(event);

  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';

  console.log('[ANALYTICS-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      });
    }

    const user = authResult.user;

    // Get tenantId - prefer X-Tenant-Id header from frontend, fallback to database lookup
    let tenantId = getTenantIdFromHeader(event);

    if (!tenantId) {
      // Fallback to database lookup
      tenantId = await getTenantIdForUser(user.id);
    }

    if (!tenantId) {
      console.warn('[ANALYTICS-SERVICE] No tenant context found for user:', user.id);
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Missing tenant context: X-Tenant-Id header is required',
      });
    }

    console.log('[ANALYTICS-SERVICE] Resolved tenantId:', tenantId);

    const queryParams = event.queryStringParameters || {};

    // ==========================================================================
    // Segments routes - /api/v1/segments/*
    // ==========================================================================
    if (path === '/api/v1/segments') {
      if (method === 'GET') {
        return handleGetSegments(tenantId);
      }
    }

    // Segment members
    const segmentMembersMatch = path.match(/\/api\/v1\/segments\/([a-f0-9-]+)\/members$/i);
    if (segmentMembersMatch) {
      if (method === 'GET') {
        return handleGetSegmentMembers(tenantId, segmentMembersMatch[1], queryParams);
      }
    }

    // ==========================================================================
    // Messages/Conversations routes - /api/v1/messages/*
    // ==========================================================================
    if (path === '/api/v1/messages/conversations') {
      if (method === 'GET') {
        return handleGetConversations(tenantId);
      }
    }

    if (path === '/api/v1/messages/unread/count') {
      if (method === 'GET') {
        return handleGetUnreadCount(tenantId);
      }
    }

    // Mark conversation as read - PUT /api/v1/messages/{id}/read
    const markReadMatch = path.match(/\/api\/v1\/messages\/([a-f0-9-]+)\/read$/i);
    if (markReadMatch && method === 'PUT') {
      return handleMarkConversationRead(tenantId, markReadMatch[1]);
    }

    // Messages by conversation ID
    const messagesMatch = path.match(/\/api\/v1\/messages\/([a-f0-9-]+)$/i);
    if (messagesMatch && method === 'GET') {
      return handleGetMessages(tenantId, messagesMatch[1]);
    }

    // ==========================================================================
    // Dashboard routes
    if (path === '/api/v1/analytics/dashboard' || path === '/analytics/dashboard') {
      return handleGetDashboard(tenantId);
    }
    if (path === '/api/v1/analytics/dashboard/summary' || path === '/analytics/dashboard/summary') {
      return handleGetDashboardSummary(tenantId);
    }
    if (path === '/api/v1/analytics/dashboard/kpis' || path === '/analytics/dashboard/kpis') {
      return handleGetKPIs(tenantId);
    }

    // Revenue routes
    if (path === '/api/v1/analytics/revenue' || path === '/analytics/revenue') {
      return handleGetRevenue(tenantId, queryParams);
    }
    if (path === '/api/v1/analytics/revenue/daily' || path === '/analytics/revenue/daily') {
      return handleGetDailyRevenue(tenantId, queryParams);
    }
    if (path === '/api/v1/analytics/revenue/monthly' || path === '/analytics/revenue/monthly') {
      return handleGetMonthlyRevenue(tenantId, queryParams);
    }

    // Occupancy routes
    if (path === '/api/v1/analytics/occupancy' || path === '/analytics/occupancy') {
      return handleGetOccupancy(tenantId, queryParams);
    }
    if (path === '/api/v1/analytics/occupancy/current' || path === '/analytics/occupancy/current') {
      return handleGetCurrentOccupancy(tenantId);
    }
    if (path === '/api/v1/analytics/occupancy/forecast' || path === '/analytics/occupancy/forecast') {
      return handleGetOccupancyForecast(tenantId, queryParams);
    }

    // Customer routes
    if (path === '/api/v1/analytics/customers' || path === '/analytics/customers') {
      return handleGetCustomerAnalytics(tenantId);
    }
    if (path === '/api/v1/analytics/customers/retention' || path === '/analytics/customers/retention') {
      return handleGetCustomerRetention(tenantId);
    }

    // Pet routes
    if (path === '/api/v1/analytics/pets' || path === '/analytics/pets') {
      return handleGetPetAnalytics(tenantId);
    }
    if (path === '/api/v1/analytics/pets/breeds' || path === '/analytics/pets/breeds') {
      return handleGetBreedAnalytics(tenantId);
    }
    if (path === '/api/v1/analytics/pets/services' || path === '/analytics/pets/services') {
      return handleGetServiceAnalytics(tenantId);
    }

    // Reports routes
    if (path === '/api/v1/analytics/reports' || path === '/analytics/reports') {
      if (method === 'GET') {
        return handleGetReports(tenantId);
      }
    }
    if (path === '/api/v1/analytics/reports/generate' || path === '/analytics/reports/generate') {
      if (method === 'POST') {
        return handleGenerateReport(tenantId, parseBody(event));
      }
    }

    // Report by ID
    const reportMatch = path.match(/\/api\/v1\/analytics\/reports\/([a-f0-9-]+)$/i);
    if (reportMatch) {
      return handleGetReport(tenantId, reportMatch[1]);
    }

    // Export routes
    if (path === '/api/v1/analytics/export/revenue' || path === '/analytics/export/revenue') {
      if (method === 'GET') {
        return handleExportRevenue(tenantId, queryParams);
      }
    }
    if (path === '/api/v1/analytics/export/bookings' || path === '/analytics/export/bookings') {
      if (method === 'GET') {
        return handleExportBookings(tenantId, queryParams);
      }
    }
    if (path === '/api/v1/analytics/export/customers' || path === '/analytics/export/customers') {
      if (method === 'GET') {
        return handleExportCustomers(tenantId, queryParams);
      }
    }
    if (path === '/api/v1/analytics/export/occupancy' || path === '/analytics/export/occupancy') {
      if (method === 'GET') {
        return handleExportOccupancy(tenantId, queryParams);
      }
    }
    if (path === '/api/v1/analytics/export/pets' || path === '/analytics/export/pets') {
      if (method === 'GET') {
        return handleExportPets(tenantId, queryParams);
      }
    }
    if (path === '/api/v1/analytics/export/vaccinations' || path === '/analytics/export/vaccinations') {
      if (method === 'GET') {
        return handleExportVaccinations(tenantId, queryParams);
      }
    }

    // ==========================================================================
    // CAPACITY AND INSIGHTS routes
    // ==========================================================================

    // Calendar capacity - returns daily capacity data for date range
    if (path === '/api/v1/analytics/capacity' || path === '/analytics/capacity') {
      if (method === 'GET') {
        return handleGetCapacity(tenantId, queryParams);
      }
    }

    // Bookings insights - returns booking trends and patterns
    if (path === '/api/v1/analytics/bookings-insights' || path === '/analytics/bookings-insights') {
      if (method === 'GET') {
        return handleGetBookingsInsights(tenantId, queryParams);
      }
    }

    // ==========================================================================
    // COMPLIANCE / USDA FORMS routes - /api/v1/compliance/*
    // ==========================================================================
    // Available forms list
    if (path === '/api/v1/compliance' || path === '/compliance') {
      if (method === 'GET') {
        return handleGetComplianceForms(tenantId);
      }
    }

    // USDA Form 7001 - Animals on Hand
    if (path === '/api/v1/compliance/usda/7001' || path === '/compliance/usda/7001') {
      if (method === 'GET') {
        return handleGetUSDAForm7001(tenantId, queryParams);
      }
    }
    if (path === '/api/v1/compliance/usda/7001/pdf' || path === '/compliance/usda/7001/pdf') {
      if (method === 'GET') {
        return handleGetUSDAForm7001PDF(tenantId, queryParams);
      }
    }

    // USDA Form 7002 - Acquisition/Disposition
    if (path === '/api/v1/compliance/usda/7002' || path === '/compliance/usda/7002') {
      if (method === 'GET') {
        return handleGetUSDAForm7002(tenantId, queryParams);
      }
    }
    if (path === '/api/v1/compliance/usda/7002/pdf' || path === '/compliance/usda/7002/pdf') {
      if (method === 'GET') {
        return handleGetUSDAForm7002PDF(tenantId, queryParams);
      }
    }

    // USDA Form 7005 - Veterinary Care
    if (path === '/api/v1/compliance/usda/7005' || path === '/compliance/usda/7005') {
      if (method === 'GET') {
        return handleGetUSDAForm7005(tenantId, queryParams);
      }
    }
    if (path === '/api/v1/compliance/usda/7005/pdf' || path === '/compliance/usda/7005/pdf') {
      if (method === 'GET') {
        return handleGetUSDAForm7005PDF(tenantId, queryParams);
      }
    }

    // Vaccination compliance report
    if (path === '/api/v1/compliance/vaccinations' || path === '/compliance/vaccinations') {
      if (method === 'GET') {
        return handleGetVaccinationCompliance(tenantId);
      }
    }

    // Inspection checklist
    if (path === '/api/v1/compliance/inspection-checklist' || path === '/compliance/inspection-checklist') {
      if (method === 'GET') {
        return handleGetInspectionChecklist(tenantId);
      }
    }

    // ==========================================================================
    // AUDIT LOG routes - /api/v1/audit-logs/*
    // ==========================================================================
    if (path === '/api/v1/audit-logs' || path === '/audit-logs') {
      if (method === 'GET') {
        return handleGetAuditLogs(tenantId, queryParams);
      }
    }

    if (path === '/api/v1/audit-logs/summary' || path === '/audit-logs/summary') {
      if (method === 'GET') {
        return handleGetAuditLogSummary(tenantId, queryParams);
      }
    }

    if (path === '/api/v1/audit-logs/export' || path === '/audit-logs/export') {
      if (method === 'GET') {
        return handleExportAuditLogs(tenantId, queryParams);
      }
    }

    // Default response for unmatched routes
    return createResponse(404, {
      error: 'Not Found',
      message: `Route ${method} ${path} not found`,
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Unhandled error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
    });
  }
};

/**
 * Helper: Get tenant ID for user from database
 */
async function getTenantIdForUser(cognitoSub) {
  try {
    await getPoolAsync();
    const result = await query(
      `SELECT tenant_id FROM "User" WHERE cognito_sub = $1`,
      [cognitoSub]
    );
    return result.rows[0]?.tenant_id || null;
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get tenant ID:', error.message);
    return null;
  }
}

// =============================================================================
// DASHBOARD HANDLERS
// =============================================================================

/**
 * Get main dashboard data
 */
async function handleGetDashboard(tenantId) {
  console.log('[Dashboard][get] tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Get active bookings count (status CHECKED_IN)
    const activeBookingsResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1 AND status = 'CHECKED_IN' `,
      [tenantId]
    );

    // Get today's arrivals (check_in date is today, schema uses check_in not start_date)
    const arrivalsResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1 AND status IN ('PENDING', 'CONFIRMED')
       AND DATE(check_in) = CURRENT_DATE `,
      [tenantId]
    );

    // Get today's departures (check_out date is today)
    const departuresResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1 AND status = 'CHECKED_IN'
       AND DATE(check_out) = CURRENT_DATE `,
      [tenantId]
    );

    // Get total capacity (kennels)
    const capacityResult = await query(
      `SELECT COALESCE(SUM(capacity), 0) as capacity, COUNT(*) as count FROM "Kennel"
       WHERE tenant_id = $1 AND is_active = true `,
      [tenantId]
    );

    // Get pending tasks
    const pendingTasksResult = await query(
      `SELECT COUNT(*) as count FROM "Task"
       WHERE tenant_id = $1 AND status = 'PENDING' `,
      [tenantId]
    );

    // Get total customers (owners)
    const customersResult = await query(
      `SELECT COUNT(*) as count FROM "Owner" WHERE tenant_id = $1 `,
      [tenantId]
    );

    // Get total pets
    const petsResult = await query(
      `SELECT COUNT(*) as count FROM "Pet" WHERE tenant_id = $1 `,
      [tenantId]
    );

    const activeBookings = parseInt(activeBookingsResult.rows[0]?.count || 0);
    const totalCapacity = parseInt(capacityResult.rows[0]?.capacity || 0);
    const kennelCount = parseInt(capacityResult.rows[0]?.count || 0);
    const capacity = totalCapacity > 0 ? totalCapacity : kennelCount;
    const occupancyRate = capacity > 0 ? Math.round((activeBookings / capacity) * 100) : 0;

    console.log('[Dashboard][diag] active:', activeBookings, 'capacity:', capacity);

    return createResponse(200, {
      data: {
        occupancy: {
          current: activeBookings,
          capacity: capacity,
          rate: occupancyRate,
        },
        todayArrivals: parseInt(arrivalsResult.rows[0]?.count || 0),
        todayDepartures: parseInt(departuresResult.rows[0]?.count || 0),
        pendingTasks: parseInt(pendingTasksResult.rows[0]?.count || 0),
        totalCustomers: parseInt(customersResult.rows[0]?.count || 0),
        totalPets: parseInt(petsResult.rows[0]?.count || 0),
        alerts: [],
      },
      message: 'Dashboard data retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get dashboard:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard data',
    });
  }
}

/**
 * Get dashboard summary
 */
async function handleGetDashboardSummary(tenantId) {
  console.log('[DashboardSummary][get] tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Get this week's bookings (schema uses check_in not start_date)
    const weeklyBookingsResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1
       AND check_in >= DATE_TRUNC('week', CURRENT_DATE)
       `,
      [tenantId]
    );

    // Get this month's bookings
    const monthlyBookingsResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1
       AND check_in >= DATE_TRUNC('month', CURRENT_DATE)
       `,
      [tenantId]
    );

    return createResponse(200, {
      data: {
        summary: {
          date: new Date().toISOString(),
          weeklyBookings: parseInt(weeklyBookingsResult.rows[0]?.count || 0),
          monthlyBookings: parseInt(monthlyBookingsResult.rows[0]?.count || 0),
          highlights: [],
        },
      },
      message: 'Dashboard summary retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get dashboard summary:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard summary',
    });
  }
}

/**
 * Get KPIs
 */
async function handleGetKPIs(tenantId) {
  try {
    await getPoolAsync();

    // Get active bookings
    const activeResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1 AND status = 'CHECKED_IN'`,
      [tenantId]
    );

    // Get capacity
    const capacityResult = await query(
      `SELECT COUNT(*) as count FROM "Kennel"
       WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    const active = parseInt(activeResult.rows[0]?.count || 0);
    const capacity = parseInt(capacityResult.rows[0]?.count || 1);

    return createResponse(200, {
      data: {
        kpis: [
          { name: 'Occupancy', value: capacity > 0 ? Math.round((active / capacity) * 100) : 0, unit: '%', change: 0 },
          { name: 'Active Bookings', value: active, change: 0 },
          { name: 'Capacity', value: capacity, change: 0 },
        ],
      },
      message: 'KPIs retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get KPIs:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve KPIs',
    });
  }
}

// =============================================================================
// CAPACITY AND INSIGHTS HANDLERS
// =============================================================================

/**
 * Get calendar capacity data for a date range
 * Used by calendar view to show available/occupied slots
 */
async function handleGetCapacity(tenantId, queryParams) {
  const { startDate, endDate } = queryParams;
  console.log('[Capacity][get] tenantId:', tenantId, 'range:', startDate, '-', endDate);

  try {
    await getPoolAsync();

    // Get total kennel capacity
    const capacityResult = await query(
      `SELECT
         COUNT(*) as kennel_count,
         COALESCE(SUM(capacity), COUNT(*)) as total_capacity
       FROM "Kennel"
       WHERE tenant_id = $1 AND is_active = true `,
      [tenantId]
    );

    const totalKennels = parseInt(capacityResult.rows[0]?.kennel_count || 0);
    const totalCapacity = parseInt(capacityResult.rows[0]?.total_capacity || totalKennels);

    // Default to current week if no dates provided
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get bookings that overlap with the date range
    const bookingsResult = await query(
      `SELECT
         DATE(check_in) as check_in_date,
         DATE(check_out) as check_out_date,
         COUNT(*) as booking_count
       FROM "Booking"
       WHERE tenant_id = $1
                 AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
         AND DATE(check_in) <= $3
         AND DATE(check_out) >= $2
       GROUP BY DATE(check_in), DATE(check_out)`,
      [tenantId, start, end]
    );

    // Build daily capacity data
    const dailyCapacity = [];
    const currentDate = new Date(start);
    const endDateObj = new Date(end);

    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Count bookings that span this date
      let occupied = 0;
      bookingsResult.rows.forEach(booking => {
        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);
        if (currentDate >= checkIn && currentDate < checkOut) {
          occupied += parseInt(booking.booking_count);
        }
      });

      const available = Math.max(0, totalCapacity - occupied);
      const occupancyRate = totalCapacity > 0 ? occupied / totalCapacity : 0;

      dailyCapacity.push({
        date: dateStr,
        totalKennels: totalKennels,
        totalCapacity: totalCapacity,
        occupied: occupied,
        available: available,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return createResponse(200, {
      data: dailyCapacity,
      summary: {
        totalKennels,
        totalCapacity,
        startDate: start,
        endDate: end,
        daysCount: dailyCapacity.length,
      },
      message: 'Capacity data retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get capacity:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve capacity data',
    });
  }
}

/**
 * Get bookings insights - trends, patterns, and analytics
 */
async function handleGetBookingsInsights(tenantId, queryParams) {
  const { period = 'month' } = queryParams;
  console.log('[BookingsInsights][get] tenantId:', tenantId, 'period:', period);

  try {
    await getPoolAsync();

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get total bookings in period
    const totalBookingsResult = await query(
      `SELECT COUNT(*) as count
       FROM "Booking"
       WHERE tenant_id = $1
                 AND created_at >= $2`,
      [tenantId, startDate.toISOString()]
    );

    // Get average stay duration
    const avgStayResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (check_out - check_in)) / 86400) as avg_days
       FROM "Booking"
       WHERE tenant_id = $1
                 AND created_at >= $2
         AND check_in IS NOT NULL
         AND check_out IS NOT NULL`,
      [tenantId, startDate.toISOString()]
    );

    // Get cancellation rate
    const cancellationResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
         COUNT(*) as total
       FROM "Booking"
       WHERE tenant_id = $1
                 AND created_at >= $2`,
      [tenantId, startDate.toISOString()]
    );

    // Get bookings by day of week
    const dayOfWeekResult = await query(
      `SELECT
         EXTRACT(DOW FROM check_in) as day_of_week,
         COUNT(*) as count
       FROM "Booking"
       WHERE tenant_id = $1
                 AND created_at >= $2
         AND check_in IS NOT NULL
       GROUP BY EXTRACT(DOW FROM check_in)
       ORDER BY count DESC`,
      [tenantId, startDate.toISOString()]
    );

    // Get popular services
    const servicesResult = await query(
      `SELECT
         s.name,
         COUNT(*) as booking_count
       FROM "Booking" b
       JOIN "Service" s ON b.service_id = s.id
       WHERE b.tenant_id = $1
                 AND b.created_at >= $2
       GROUP BY s.name
       ORDER BY booking_count DESC
       LIMIT 5`,
      [tenantId, startDate.toISOString()]
    );

    // Get booking status breakdown
    const statusResult = await query(
      `SELECT status, COUNT(*) as count
       FROM "Booking"
       WHERE tenant_id = $1
                 AND created_at >= $2
       GROUP BY status`,
      [tenantId, startDate.toISOString()]
    );

    // Map day of week numbers to names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDays = dayOfWeekResult.rows
      .slice(0, 2)
      .map(row => dayNames[parseInt(row.day_of_week)]);

    const totalBookings = parseInt(totalBookingsResult.rows[0]?.count || 0);
    const cancelled = parseInt(cancellationResult.rows[0]?.cancelled || 0);
    const total = parseInt(cancellationResult.rows[0]?.total || 1);
    const cancellationRate = total > 0 ? cancelled / total : 0;

    return createResponse(200, {
      data: {
        period,
        totalBookings,
        averageStay: parseFloat(avgStayResult.rows[0]?.avg_days || 0).toFixed(1),
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        peakDays,
        popularServices: servicesResult.rows.map(row => ({
          name: row.name,
          bookingCount: parseInt(row.booking_count),
        })),
        statusBreakdown: statusResult.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
        bookingsByDayOfWeek: dayOfWeekResult.rows.map(row => ({
          day: dayNames[parseInt(row.day_of_week)],
          count: parseInt(row.count),
        })),
      },
      message: 'Bookings insights retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get bookings insights:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve bookings insights',
    });
  }
}

// =============================================================================
// REVENUE HANDLERS
// =============================================================================

async function handleGetRevenue(tenantId, queryParams) {
  const { startDate, endDate } = queryParams;

  try {
    await getPoolAsync();

    let whereClause = 'b.tenant_id = $1';
    const params = [tenantId];

    if (startDate) {
      whereClause += ` AND b.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND b.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    const result = await query(
      `SELECT
         COALESCE(SUM(total_price_cents), 0) as total_revenue_cents,
         COUNT(*) as transaction_count,
         COALESCE(AVG(total_price_cents), 0) as avg_transaction_cents
       FROM "Booking" b
       WHERE ${whereClause} AND b.status IN ('CHECKED_IN', 'COMPLETED')`,
      params
    );

    const row = result.rows[0];

    return createResponse(200, {
      data: {
        totalRevenue: parseFloat(row.total_revenue_cents || 0) / 100,
        transactionCount: parseInt(row.transaction_count || 0),
        averageTransactionValue: parseFloat(row.avg_transaction_cents || 0) / 100,
        period: { startDate, endDate },
      },
      message: 'Revenue analytics retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get revenue:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve revenue analytics',
    });
  }
}

async function handleGetDailyRevenue(tenantId, queryParams) {
  const { date } = queryParams;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         COALESCE(SUM(total_price_cents), 0) as revenue_cents,
         COUNT(*) as bookings
       FROM "Booking"
       WHERE tenant_id = $1
       AND DATE(created_at) = $2
       AND status IN ('CHECKED_IN', 'COMPLETED')`,
      [tenantId, targetDate]
    );

    return createResponse(200, {
      data: {
        date: targetDate,
        revenue: parseFloat(result.rows[0]?.revenue_cents || 0) / 100,
        bookings: parseInt(result.rows[0]?.bookings || 0),
      },
      message: 'Daily revenue retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get daily revenue:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve daily revenue',
    });
  }
}

async function handleGetMonthlyRevenue(tenantId, queryParams) {
  const { year, month } = queryParams;
  const targetYear = year || new Date().getFullYear();
  const targetMonth = month || (new Date().getMonth() + 1);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         COALESCE(SUM(total_price_cents), 0) as revenue_cents,
         COUNT(*) as bookings
       FROM "Booking"
       WHERE tenant_id = $1
       AND EXTRACT(YEAR FROM created_at) = $2
       AND EXTRACT(MONTH FROM created_at) = $3
       AND status IN ('CHECKED_IN', 'COMPLETED')`,
      [tenantId, targetYear, targetMonth]
    );

    return createResponse(200, {
      data: {
        year: parseInt(targetYear),
        month: parseInt(targetMonth),
        revenue: parseFloat(result.rows[0]?.revenue_cents || 0) / 100,
        bookings: parseInt(result.rows[0]?.bookings || 0),
      },
      message: 'Monthly revenue retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get monthly revenue:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve monthly revenue',
    });
  }
}

// =============================================================================
// OCCUPANCY HANDLERS
// =============================================================================

async function handleGetOccupancy(tenantId, queryParams) {
  const { startDate, endDate } = queryParams;

  try {
    await getPoolAsync();

    // Get current occupancy
    const currentResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1 AND status = 'CHECKED_IN'`,
      [tenantId]
    );

    const capacityResult = await query(
      `SELECT COUNT(*) as count FROM "Kennel"
       WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    const current = parseInt(currentResult.rows[0]?.count || 0);
    const capacity = parseInt(capacityResult.rows[0]?.count || 1);

    return createResponse(200, {
      data: {
        currentOccupancy: current,
        totalCapacity: capacity,
        occupancyRate: capacity > 0 ? Math.round((current / capacity) * 100) : 0,
        availableSpots: Math.max(0, capacity - current),
        period: { startDate, endDate },
      },
      message: 'Occupancy analytics retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get occupancy:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve occupancy analytics',
    });
  }
}

async function handleGetCurrentOccupancy(tenantId) {
  return handleGetOccupancy(tenantId, {});
}

async function handleGetOccupancyForecast(tenantId, queryParams) {
  const days = parseInt(queryParams.days, 10) || 7;

  // Validate days to prevent abuse
  if (days < 1 || days > 365) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'days must be between 1 and 365',
    });
  }

  try {
    await getPoolAsync();

    // Get upcoming bookings
    const result = await query(
      `SELECT DATE(check_in) as date, COUNT(*) as bookings
       FROM "Booking"
       WHERE tenant_id = $1
       AND check_in >= CURRENT_DATE
       AND check_in <= CURRENT_DATE + INTERVAL '1 day' * $2
       AND status = 'PENDING'
       GROUP BY DATE(check_in)
       ORDER BY date`,
      [tenantId, days]
    );

    return createResponse(200, {
      data: {
        forecastDays: days,
        predictions: result.rows.map(row => ({
          date: row.date,
          expectedArrivals: parseInt(row.bookings),
        })),
      },
      message: 'Occupancy forecast retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get occupancy forecast:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve occupancy forecast',
    });
  }
}

// =============================================================================
// CUSTOMER HANDLERS
// =============================================================================

async function handleGetCustomerAnalytics(tenantId) {
  try {
    await getPoolAsync();

    const totalResult = await query(
      `SELECT COUNT(*) as count FROM "Owner" WHERE tenant_id = $1`,
      [tenantId]
    );

    const newThisMonthResult = await query(
      `SELECT COUNT(*) as count FROM "Owner"
       WHERE tenant_id = $1
       AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId]
    );

    return createResponse(200, {
      data: {
        totalCustomers: parseInt(totalResult.rows[0]?.count || 0),
        newCustomersThisMonth: parseInt(newThisMonthResult.rows[0]?.count || 0),
        activeCustomers: parseInt(totalResult.rows[0]?.count || 0), // Could be refined
      },
      message: 'Customer analytics retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get customer analytics:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve customer analytics',
    });
  }
}

async function handleGetCustomerRetention(tenantId) {
  // Placeholder - would need historical data
  return createResponse(200, {
    data: {
      retentionRate: 0,
      churnRate: 0,
      averageCustomerLifetime: 0,
    },
    message: 'Customer retention data (placeholder)',
  });
}

// =============================================================================
// PET HANDLERS
// =============================================================================

async function handleGetPetAnalytics(tenantId) {
  try {
    await getPoolAsync();

    const totalResult = await query(
      `SELECT COUNT(*) as count FROM "Pet" WHERE tenant_id = $1`,
      [tenantId]
    );

    const bySpeciesResult = await query(
      `SELECT species, COUNT(*) as count FROM "Pet"
       WHERE tenant_id = $1
       GROUP BY species`,
      [tenantId]
    );

    return createResponse(200, {
      data: {
        totalPets: parseInt(totalResult.rows[0]?.count || 0),
        bySpecies: bySpeciesResult.rows.reduce((acc, row) => {
          acc[row.species] = parseInt(row.count);
          return acc;
        }, {}),
      },
      message: 'Pet analytics retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get pet analytics:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve pet analytics',
    });
  }
}

async function handleGetBreedAnalytics(tenantId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT breed, COUNT(*) as count FROM "Pet"
       WHERE tenant_id = $1 AND breed IS NOT NULL
       GROUP BY breed
       ORDER BY count DESC
       LIMIT 10`,
      [tenantId]
    );

    return createResponse(200, {
      data: {
        popularBreeds: result.rows.map(row => ({
          breed: row.breed,
          count: parseInt(row.count),
        })),
      },
      message: 'Breed analytics retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get breed analytics:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve breed analytics',
    });
  }
}

async function handleGetServiceAnalytics(tenantId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT s.name, COUNT(b.id) as bookings
       FROM "Service" s
       LEFT JOIN "Booking" b ON b.service_id = s.id
       WHERE s.tenant_id = $1
       GROUP BY s.id, s.name
       ORDER BY bookings DESC`,
      [tenantId]
    );

    return createResponse(200, {
      data: {
        serviceUtilization: result.rows.map(row => ({
          service: row.name,
          bookings: parseInt(row.bookings || 0),
        })),
      },
      message: 'Service analytics retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get service analytics:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve service analytics',
    });
  }
}

// =============================================================================
// REPORTS HANDLERS
// =============================================================================

async function handleGetReports(tenantId) {
  // Placeholder - reports feature not yet implemented
  return createResponse(200, {
    data: {
      reports: [],
    },
    message: 'Reports list (feature pending implementation)',
  });
}

async function handleGetReport(tenantId, reportId) {
  return createResponse(404, {
    error: 'Not Found',
    message: 'Report not found (feature pending implementation)',
  });
}

async function handleGenerateReport(tenantId, body) {
  return createResponse(202, {
    data: {
      jobId: 'report-job-' + Date.now(),
      status: 'pending',
    },
    message: 'Report generation started (feature pending implementation)',
  });
}

// =============================================================================
// EXPORT HANDLERS
// =============================================================================

/**
 * Helper: Convert rows to CSV format
 */
function toCSV(rows, columns) {
  if (!rows || rows.length === 0) {
    return columns.join(',') + '\n';
  }
  
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const header = columns.join(',');
  const body = rows.map(row => 
    columns.map(col => escapeCSV(row[col])).join(',')
  ).join('\n');
  
  return header + '\n' + body;
}

/**
 * Helper: Create export response with proper headers
 */
function createExportResponse(data, filename, format = 'csv') {
  const contentType = format === 'csv' ? 'text/csv' : 'application/json';
  const body = format === 'csv' ? data : JSON.stringify(data, null, 2);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    },
    body,
  };
}

/**
 * Export revenue report
 */
async function handleExportRevenue(tenantId, queryParams) {
  const { startDate, endDate, format = 'csv' } = queryParams;
  
  console.log('[Export][revenue] tenantId:', tenantId, 'period:', startDate, '-', endDate);
  
  try {
    await getPoolAsync();
    
    let whereClause = 'tenant_id = $1';
    const params = [tenantId];
    
    if (startDate) {
      whereClause += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    const result = await query(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as booking_count,
         COALESCE(SUM(total_price_cents), 0) as revenue_cents,
         COALESCE(AVG(total_price_cents), 0) as avg_booking_value_cents,
         status
       FROM "Booking"
       WHERE ${whereClause} AND status IN ('CHECKED_IN', 'COMPLETED')
       GROUP BY DATE(created_at), status
       ORDER BY date DESC`,
      params
    );

    const columns = ['date', 'booking_count', 'revenue', 'avg_booking_value', 'status'];
    const rows = result.rows.map(row => ({
      date: row.date,
      booking_count: parseInt(row.booking_count),
      revenue: (parseFloat(row.revenue_cents) / 100).toFixed(2),
      avg_booking_value: (parseFloat(row.avg_booking_value_cents) / 100).toFixed(2),
      status: row.status,
    }));
    
    const filename = `revenue_report_${startDate || 'all'}_${endDate || 'all'}.${format}`;
    
    if (format === 'json') {
      return createExportResponse({
        report: 'Revenue Report',
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        data: rows,
        summary: {
          totalRevenue: rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0).toFixed(2),
          totalBookings: rows.reduce((sum, r) => sum + r.booking_count, 0),
        }
      }, filename, 'json');
    }
    
    return createExportResponse(toCSV(rows, columns), filename, 'csv');
    
  } catch (error) {
    console.error('[Export][revenue] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to export revenue report',
    });
  }
}

/**
 * Export bookings report
 */
async function handleExportBookings(tenantId, queryParams) {
  const { startDate, endDate, status, format = 'csv' } = queryParams;
  
  console.log('[Export][bookings] tenantId:', tenantId, 'period:', startDate, '-', endDate);
  
  try {
    await getPoolAsync();
    
    let whereClause = 'b.tenant_id = $1';
    const params = [tenantId];
    
    if (startDate) {
      whereClause += ` AND b.check_in >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND b.check_out <= $${params.length + 1}`;
      params.push(endDate);
    }
    if (status) {
      whereClause += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    const result = await query(
      `SELECT
         b.id as booking_id,
         b.check_in,
         b.check_out,
         b.status,
         b.total_price_cents,
         b.notes,
         b.created_at,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone,
         p.name as pet_name,
         p.breed as pet_breed,
         k.name as kennel_name
       FROM "Booking" b
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       LEFT JOIN "Pet" p ON p.id = ANY(b.pet_ids)
       LEFT JOIN "Kennel" k ON b.kennel_id = k.id
       WHERE ${whereClause}
       ORDER BY b.check_in DESC`,
      params
    );

    const columns = [
      'booking_id', 'check_in', 'check_out', 'status', 'total_price',
      'owner_first_name', 'owner_last_name', 'owner_email', 'owner_phone',
      'pet_name', 'pet_breed', 'kennel_name', 'notes', 'created_at'
    ];

    const rows = result.rows.map(row => ({
      booking_id: row.booking_id,
      check_in: row.check_in?.toISOString().split('T')[0] || '',
      check_out: row.check_out?.toISOString().split('T')[0] || '',
      status: row.status,
      total_price: (parseFloat(row.total_price_cents || 0) / 100).toFixed(2),
      owner_first_name: row.owner_first_name || '',
      owner_last_name: row.owner_last_name || '',
      owner_email: row.owner_email || '',
      owner_phone: row.owner_phone || '',
      pet_name: row.pet_name || '',
      pet_breed: row.pet_breed || '',
      kennel_name: row.kennel_name || '',
      notes: row.notes || '',
      created_at: row.created_at?.toISOString() || '',
    }));
    
    const filename = `bookings_report_${startDate || 'all'}_${endDate || 'all'}.${format}`;

    if (format === 'json') {
      return createExportResponse({
        report: 'Bookings Report',
        period: { startDate, endDate },
        filters: { status },
        generatedAt: new Date().toISOString(),
        data: rows,
        summary: {
          totalBookings: rows.length,
          totalRevenue: rows.reduce((sum, r) => sum + parseFloat(r.total_price), 0).toFixed(2),
        }
      }, filename, 'json');
    }

    return createExportResponse(toCSV(rows, columns), filename, 'csv');
    
  } catch (error) {
    console.error('[Export][bookings] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to export bookings report',
    });
  }
}

/**
 * Export customers report
 */
async function handleExportCustomers(tenantId, queryParams) {
  const { format = 'csv' } = queryParams;
  
  console.log('[Export][customers] tenantId:', tenantId);
  
  try {
    await getPoolAsync();
    
    const result = await query(
      `SELECT
         o.id as owner_id,
         o.first_name,
         o.last_name,
         o.email,
         o.phone,
         o.address,
         o.city,
         o.state,
         o.zip_code,
         o.emergency_contact_name,
         o.emergency_contact_phone,
         o.created_at,
         COUNT(DISTINCT b.id) as total_bookings,
         COALESCE(SUM(b.total_price_cents), 0) as lifetime_value_cents,
         MAX(b.created_at) as last_booking_date,
         COUNT(DISTINCT p.id) as pet_count
       FROM "Owner" o
       LEFT JOIN "Booking" b ON o.id = b.owner_id AND b.status IN ('CHECKED_IN', 'COMPLETED')
       LEFT JOIN "PetOwner" po ON o.id = po.owner_id
       LEFT JOIN "Pet" p ON po.pet_id = p.id
       WHERE o.tenant_id = $1
       GROUP BY o.id
       ORDER BY o.last_name, o.first_name`,
      [tenantId]
    );

    const columns = [
      'owner_id', 'first_name', 'last_name', 'email', 'phone',
      'address', 'city', 'state', 'zip_code',
      'emergency_contact_name', 'emergency_contact_phone',
      'total_bookings', 'lifetime_value', 'last_booking_date', 'pet_count', 'created_at'
    ];

    const rows = result.rows.map(row => ({
      owner_id: row.owner_id,
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      city: row.city || '',
      state: row.state || '',
      zip_code: row.zip_code || '',
      emergency_contact_name: row.emergency_contact_name || '',
      emergency_contact_phone: row.emergency_contact_phone || '',
      total_bookings: parseInt(row.total_bookings || 0),
      lifetime_value: (parseFloat(row.lifetime_value_cents || 0) / 100).toFixed(2),
      last_booking_date: row.last_booking_date?.toISOString().split('T')[0] || '',
      pet_count: parseInt(row.pet_count || 0),
      created_at: row.created_at?.toISOString() || '',
    }));
    
    const filename = `customers_report_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'json') {
      return createExportResponse({
        report: 'Customers Report',
        generatedAt: new Date().toISOString(),
        data: rows,
        summary: {
          totalCustomers: rows.length,
          totalLifetimeValue: rows.reduce((sum, r) => sum + parseFloat(r.lifetime_value), 0).toFixed(2),
          avgBookingsPerCustomer: (rows.reduce((sum, r) => sum + r.total_bookings, 0) / (rows.length || 1)).toFixed(2),
        }
      }, filename, 'json');
    }
    
    return createExportResponse(toCSV(rows, columns), filename, 'csv');
    
  } catch (error) {
    console.error('[Export][customers] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to export customers report',
    });
  }
}

/**
 * Export occupancy report
 */
async function handleExportOccupancy(tenantId, queryParams) {
  const { startDate, endDate, format = 'csv' } = queryParams;
  
  console.log('[Export][occupancy] tenantId:', tenantId, 'period:', startDate, '-', endDate);
  
  try {
    await getPoolAsync();
    
    // Default to last 30 days if no date range provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get total kennel capacity
    const capacityResult = await query(
      `SELECT COALESCE(SUM(capacity), 0) as total_capacity FROM "Kennel" WHERE tenant_id = $1`,
      [tenantId]
    );
    const totalCapacity = parseInt(capacityResult.rows[0]?.total_capacity || 0);
    
    // Get daily occupancy for the date range
    const result = await query(
      `SELECT
         d::date as date,
         COUNT(DISTINCT b.id) as bookings,
         COALESCE(SUM(array_length(b.pet_ids, 1)), 0) as pets_boarded
       FROM generate_series($2::date, $3::date, '1 day'::interval) d
       LEFT JOIN "Booking" b ON b.tenant_id = $1
         AND b.check_in <= d::date
         AND b.check_out > d::date
         AND b.status IN ('CONFIRMED', 'CHECKED_IN')
       GROUP BY d::date
       ORDER BY d::date`,
      [tenantId, start, end]
    );
    
    const columns = ['date', 'bookings', 'pets_boarded', 'total_capacity', 'occupancy_rate'];
    
    const rows = result.rows.map(row => ({
      date: row.date?.toISOString().split('T')[0] || '',
      bookings: parseInt(row.bookings || 0),
      pets_boarded: parseInt(row.pets_boarded || 0),
      total_capacity: totalCapacity,
      occupancy_rate: totalCapacity > 0 
        ? ((parseInt(row.pets_boarded || 0) / totalCapacity) * 100).toFixed(1) + '%'
        : '0%',
    }));
    
    const filename = `occupancy_report_${start}_${end}.${format}`;
    
    if (format === 'json') {
      const avgOccupancy = totalCapacity > 0
        ? (rows.reduce((sum, r) => sum + parseInt(r.pets_boarded), 0) / (rows.length * totalCapacity) * 100).toFixed(1)
        : 0;
        
      return createExportResponse({
        report: 'Occupancy Report',
        period: { startDate: start, endDate: end },
        generatedAt: new Date().toISOString(),
        data: rows,
        summary: {
          totalCapacity,
          avgOccupancyRate: avgOccupancy + '%',
          peakOccupancy: Math.max(...rows.map(r => parseInt(r.pets_boarded))),
          totalDays: rows.length,
        }
      }, filename, 'json');
    }
    
    return createExportResponse(toCSV(rows, columns), filename, 'csv');
    
  } catch (error) {
    console.error('[Export][occupancy] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to export occupancy report',
    });
  }
}

/**
 * Export pets report
 */
async function handleExportPets(tenantId, queryParams) {
  const { format = 'csv' } = queryParams;
  
  console.log('[Export][pets] tenantId:', tenantId);
  
  try {
    await getPoolAsync();
    
    const result = await query(
      `SELECT
         p.id as pet_id,
         p.name,
         p.breed,
         p.species,
         p.weight,
         p.birth_date,
         p.gender,
         p.color,
         p.microchip_number,
         p.special_needs,
         p.dietary_requirements,
         v.name as vet_name,
         v.phone as vet_phone,
         v.clinic_name as vet_clinic,
         p.created_at,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone,
         COUNT(DISTINCT b.id) as booking_count,
         MAX(b.created_at) as last_visit
       FROM "Pet" p
       LEFT JOIN "PetOwner" po ON p.id = po.pet_id
       LEFT JOIN "Owner" o ON po.owner_id = o.id
       LEFT JOIN "Veterinarian" v ON p.vet_id = v.id
       LEFT JOIN "Booking" b ON p.id = ANY(b.pet_ids)
       WHERE p.tenant_id = $1
       GROUP BY p.id, o.id, v.id
       ORDER BY p.name`,
      [tenantId]
    );

    const columns = [
      'pet_id', 'name', 'breed', 'species', 'weight', 'birth_date', 'gender', 'color',
      'microchip_number', 'special_needs', 'dietary_requirements',
      'vet_name', 'vet_phone', 'vet_clinic',
      'owner_first_name', 'owner_last_name', 'owner_email', 'owner_phone',
      'booking_count', 'last_visit', 'created_at'
    ];

    const rows = result.rows.map(row => ({
      pet_id: row.pet_id,
      name: row.name || '',
      breed: row.breed || '',
      species: row.species || '',
      weight: row.weight || '',
      birth_date: row.birth_date?.toISOString().split('T')[0] || '',
      gender: row.gender || '',
      color: row.color || '',
      microchip_number: row.microchip_number || '',
      special_needs: row.special_needs || '',
      dietary_requirements: row.dietary_requirements || '',
      vet_name: row.vet_name || '',
      vet_phone: row.vet_phone || '',
      vet_clinic: row.vet_clinic || '',
      owner_first_name: row.owner_first_name || '',
      owner_last_name: row.owner_last_name || '',
      owner_email: row.owner_email || '',
      owner_phone: row.owner_phone || '',
      booking_count: parseInt(row.booking_count || 0),
      last_visit: row.last_visit?.toISOString().split('T')[0] || '',
      created_at: row.created_at?.toISOString() || '',
    }));
    
    const filename = `pets_report_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'json') {
      const breedCounts = {};
      rows.forEach(r => {
        breedCounts[r.breed || 'Unknown'] = (breedCounts[r.breed || 'Unknown'] || 0) + 1;
      });
      
      return createExportResponse({
        report: 'Pets Report',
        generatedAt: new Date().toISOString(),
        data: rows,
        summary: {
          totalPets: rows.length,
          breedDistribution: breedCounts,
          avgBookingsPerPet: (rows.reduce((sum, r) => sum + r.booking_count, 0) / (rows.length || 1)).toFixed(2),
        }
      }, filename, 'json');
    }
    
    return createExportResponse(toCSV(rows, columns), filename, 'csv');
    
  } catch (error) {
    console.error('[Export][pets] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to export pets report',
    });
  }
}

/**
 * Export vaccinations report
 */
async function handleExportVaccinations(tenantId, queryParams) {
  const { expiring = 'false', days = '30', format = 'csv' } = queryParams;
  
  console.log('[Export][vaccinations] tenantId:', tenantId, 'expiring:', expiring, 'days:', days);
  
  try {
    await getPoolAsync();
    
    let whereClause = 'v.tenant_id = $1';
    const params = [tenantId];
    
    if (expiring === 'true') {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(days));
      whereClause += ` AND v.expiration_date <= $${params.length + 1} AND v.expiration_date >= NOW()`;
      params.push(expirationDate.toISOString());
    }
    
    const result = await query(
      `SELECT
         v.id as vaccination_id,
         v.vaccine_name,
         v.vaccination_date,
         v.expiration_date,
         v.administered_by,
         v.lot_number,
         v.notes,
         p.name as pet_name,
         p.breed as pet_breed,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone,
         CASE
           WHEN v.expiration_date < NOW() THEN 'Expired'
           WHEN v.expiration_date <= NOW() + INTERVAL '30 days' THEN 'Expiring Soon'
           ELSE 'Valid'
         END as status
       FROM "Vaccination" v
       LEFT JOIN "Pet" p ON v.pet_id = p.id
       LEFT JOIN "PetOwner" po ON p.id = po.pet_id
       LEFT JOIN "Owner" o ON po.owner_id = o.id
       WHERE ${whereClause}
       ORDER BY v.expiration_date ASC`,
      params
    );
    
    const columns = [
      'vaccination_id', 'vaccine_name', 'vaccination_date', 'expiration_date', 'status',
      'administered_by', 'lot_number', 'notes',
      'pet_name', 'pet_breed', 'owner_first_name', 'owner_last_name', 'owner_email', 'owner_phone'
    ];
    
    const rows = result.rows.map(row => ({
      vaccination_id: row.vaccination_id,
      vaccine_name: row.vaccine_name || '',
      vaccination_date: row.vaccination_date?.toISOString().split('T')[0] || '',
      expiration_date: row.expiration_date?.toISOString().split('T')[0] || '',
      status: row.status,
      administered_by: row.administered_by || '',
      lot_number: row.lot_number || '',
      notes: row.notes || '',
      pet_name: row.pet_name || '',
      pet_breed: row.pet_breed || '',
      owner_first_name: row.owner_first_name || '',
      owner_last_name: row.owner_last_name || '',
      owner_email: row.owner_email || '',
      owner_phone: row.owner_phone || '',
    }));
    
    const filename = `vaccinations_report_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'json') {
      const statusCounts = { Expired: 0, 'Expiring Soon': 0, Valid: 0 };
      rows.forEach(r => statusCounts[r.status]++);
      
      return createExportResponse({
        report: 'Vaccinations Report',
        generatedAt: new Date().toISOString(),
        filters: { expiring: expiring === 'true', days: parseInt(days) },
        data: rows,
        summary: {
          totalVaccinations: rows.length,
          statusCounts,
        }
      }, filename, 'json');
    }
    
    return createExportResponse(toCSV(rows, columns), filename, 'csv');
    
  } catch (error) {
    console.error('[Export][vaccinations] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to export vaccinations report',
    });
  }
}

// =============================================================================
// SEGMENTS HANDLERS
// =============================================================================

/**
 * Get all segments for tenant
 *
 * Expected response shape (from frontend SegmentList.jsx):
 * Array of: {
 *   id, recordId, name, description, criteria,
 *   isDynamic, isActive, isAutomatic,
 *   _count: { members: N, campaigns: N },
 *   createdAt, updatedAt
 * }
 *
 * Schema (Segment table):
 *   id, tenant_id, name, description, criteria, is_dynamic, member_count, created_at, updated_at, deleted_at
 *   NOTE: No is_active column. No SegmentCampaign table exists.
 */
async function handleGetSegments(tenantId) {
  console.log('[Segments][list] tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Query segments with member counts
    const result = await query(
      `SELECT
         s.id,
         s.name,
         s.description,
         s.criteria,
         s.is_automatic,
         s.is_active,
         s.created_at,
         s.updated_at,
         (SELECT COUNT(*) FROM "SegmentMember" sm WHERE sm.segment_id = s.id) as member_count
       FROM "Segment" s
       WHERE s.tenant_id = $1
       ORDER BY s.name ASC`,
      [tenantId]
    );

    console.log('[Segments][list] query returned:', result.rows.length, 'rows');

    const segments = result.rows.map(row => ({
      id: row.id,
      recordId: row.id,
      name: row.name,
      description: row.description,
      criteria: row.criteria || {},
      isDynamic: row.is_automatic ?? false,
      isActive: row.is_active ?? true,
      isAutomatic: row.is_automatic ?? false,
      _count: {
        members: parseInt(row.member_count || 0),
        campaigns: 0,
      },
      memberCount: parseInt(row.member_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log('[ANALYTICS-SERVICE] Fetched segments:', { tenantId, count: segments.length });

    return createResponse(200, {
      data: segments,
      segments: segments, // Compatibility
      total: segments.length,
      message: 'Segments retrieved successfully',
    });

  } catch (error) {
    // Handle missing table gracefully
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[ANALYTICS-SERVICE] Segment table not found, returning empty list');
      return createResponse(200, {
        data: [],
        segments: [],
        total: 0,
        message: 'Segments (table not initialized)',
      });
    }
    console.error('[ANALYTICS-SERVICE] Failed to get segments:', {
      message: error.message,
      stack: error.stack,
      tenantId,
    });
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve segments',
    });
  }
}

/**
 * Get segment members
 */
async function handleGetSegmentMembers(tenantId, segmentId, queryParams) {
  const { limit = 50, offset = 0 } = queryParams;

  try {
    await getPoolAsync();

    // Verify segment belongs to tenant
    const segmentCheck = await query(
      `SELECT id FROM "Segment" WHERE id = $1 AND tenant_id = $2 `,
      [segmentId, tenantId]
    );

    if (segmentCheck.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Segment not found',
      });
    }

    const result = await query(
      `SELECT
         o.id,
         o.first_name,
         o.last_name,
         o.email,
         o.phone,
         sm.added_at
       FROM "SegmentMember" sm
       JOIN "Owner" o ON sm.owner_id = o.id
       WHERE sm.segment_id = $1
       ORDER BY o.last_name, o.first_name
       LIMIT $2 OFFSET $3`,
      [segmentId, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM "SegmentMember" WHERE segment_id = $1`,
      [segmentId]
    );

    const members = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      addedAt: row.added_at,
    }));

    const total = parseInt(countResult.rows[0]?.count || 0);
    const hasMore = (parseInt(offset) + members.length) < total;

    return createResponse(200, {
      data: members,
      members: members,
      total,
      hasMore,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get segment members:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve segment members',
    });
  }
}

// =============================================================================
// MESSAGES / CONVERSATIONS HANDLERS
// =============================================================================

/**
 * Get all conversations for tenant
 *
 * Expected response shape (from frontend):
 * Array of: { id, subject, lastMessageAt, unreadCount, isArchived, owner, createdAt }
 */
async function handleGetConversations(tenantId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         c.id,
         c.subject,
         c.last_message_at,
         c.unread_count,
         c.is_archived,
         c.created_at,
         c.updated_at,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email
       FROM "Conversation" c
       LEFT JOIN "Owner" o ON c.owner_id = o.id
       WHERE c.tenant_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      [tenantId]
    );

    const conversations = result.rows.map(row => ({
      id: row.id,
      subject: row.subject,
      lastMessageAt: row.last_message_at,
      unreadCount: parseInt(row.unread_count || 0),
      isArchived: row.is_archived || false,
      owner: row.owner_id ? {
        id: row.owner_id,
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
        email: row.owner_email,
      } : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log('[ANALYTICS-SERVICE] Fetched conversations:', { tenantId, count: conversations.length });

    return createResponse(200, {
      data: conversations,
      conversations: conversations, // Compatibility
      total: conversations.length,
      message: 'Conversations retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get conversations:', {
      message: error.message,
      stack: error.stack,
      tenantId,
    });
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve conversations',
    });
  }
}

/**
 * Get messages in a conversation
 */
async function handleGetMessages(tenantId, conversationId) {
  try {
    await getPoolAsync();

    // Verify conversation belongs to tenant
    const convCheck = await query(
      `SELECT id FROM "Conversation" WHERE id = $1 AND tenant_id = $2`,
      [conversationId, tenantId]
    );

    if (convCheck.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Conversation not found',
      });
    }

    const result = await query(
      `SELECT
         m.id,
         m.sender_type,
         m.sender_id,
         m.content,
         m.is_read,
         m.read_at,
         m.created_at
       FROM "Message" m
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    const messages = result.rows.map(row => ({
      id: row.id,
      senderType: row.sender_type,
      senderId: row.sender_id,
      content: row.content,
      isRead: row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
    }));

    return createResponse(200, {
      data: messages,
      messages: messages,
      total: messages.length,
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get messages:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve messages',
    });
  }
}

/**
 * Mark conversation as read
 */
async function handleMarkConversationRead(tenantId, conversationId) {
  try {
    await getPoolAsync();

    // Update conversation unread count and mark messages as read
    await query(
      `UPDATE "Conversation"
       SET unread_count = 0, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [conversationId, tenantId]
    );

    await query(
      `UPDATE "Message"
       SET is_read = true, read_at = NOW()
       WHERE conversation_id = $1 AND tenant_id = $2 AND is_read = false`,
      [conversationId, tenantId]
    );

    console.log('[ANALYTICS-SERVICE] Marked conversation as read:', conversationId);

    return createResponse(200, {
      success: true,
      message: 'Conversation marked as read',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to mark conversation as read:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to mark conversation as read',
    });
  }
}

/**
 * Get unread message count
 */
async function handleGetUnreadCount(tenantId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT COALESCE(SUM(unread_count), 0) as count
       FROM "Conversation"
       WHERE tenant_id = $1 AND is_archived = false`,
      [tenantId]
    );

    return createResponse(200, {
      count: parseInt(result.rows[0]?.count || 0),
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get unread count:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve unread count',
    });
  }
}

// =============================================================================
// COMPLIANCE / USDA FORM HANDLERS
// =============================================================================

// Import USDA forms utility
let usdaForms;
try {
  usdaForms = require('/opt/nodejs/usda-forms');
} catch (e) {
  usdaForms = require('../../layers/shared-layer/nodejs/usda-forms');
}

/**
 * Get list of available compliance forms
 */
async function handleGetComplianceForms(tenantId) {
  return createResponse(200, {
    forms: [
      {
        id: '7001',
        name: 'APHIS Form 7001 - Report of Animals on Hand',
        description: 'Annual report of all animals currently in facility',
        endpoints: {
          json: '/api/v1/compliance/usda/7001',
          pdf: '/api/v1/compliance/usda/7001/pdf',
        },
      },
      {
        id: '7002',
        name: 'APHIS Form 7002 - Record of Acquisition and Disposition',
        description: 'Record of check-ins and check-outs',
        endpoints: {
          json: '/api/v1/compliance/usda/7002',
          pdf: '/api/v1/compliance/usda/7002/pdf',
        },
      },
      {
        id: '7005',
        name: 'APHIS Form 7005 - Record of Veterinary Care',
        description: 'Veterinary treatment records',
        endpoints: {
          json: '/api/v1/compliance/usda/7005',
          pdf: '/api/v1/compliance/usda/7005/pdf',
        },
      },
    ],
    reports: [
      {
        id: 'vaccination-compliance',
        name: 'Vaccination Compliance Report',
        endpoint: '/api/v1/compliance/vaccinations',
      },
      {
        id: 'inspection-checklist',
        name: 'Inspection Preparation Checklist',
        endpoint: '/api/v1/compliance/inspection-checklist',
      },
    ],
  });
}

/**
 * Get facility data for forms
 */
async function getFacilityData(tenantId) {
  const result = await query(
    `SELECT name, address, city, state, zip_code, phone, email,
            license_number, vet_name, vet_phone, vet_license, vet_address
     FROM "Tenant" WHERE id = $1`,
    [tenantId]
  );
  const row = result.rows[0] || {};
  return {
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    phone: row.phone,
    email: row.email,
    licenseNumber: row.license_number,
    vetName: row.vet_name,
    vetPhone: row.vet_phone,
    vetLicense: row.vet_license,
    vetAddress: row.vet_address,
  };
}

/**
 * Get USDA Form 7001 - Animals on Hand (JSON)
 */
async function handleGetUSDAForm7001(tenantId, queryParams) {
  const { reportDate } = queryParams;

  console.log('[Compliance][7001] tenantId:', tenantId);

  try {
    await getPoolAsync();

    const facilityData = await getFacilityData(tenantId);

    // Get all pets currently checked in (active bookings)
    const animalsResult = await query(
      `SELECT DISTINCT ON (p.id)
         p.id, p.name, p.species, p.breed, p.birth_date, p.gender,
         p.microchip_number,
         o.first_name || ' ' || o.last_name as owner_name,
         b.check_in as date_received
       FROM "Pet" p
       JOIN "Booking" b ON p.id = ANY(b.pet_ids)
       JOIN "PetOwner" po ON p.id = po.pet_id
       JOIN "Owner" o ON po.owner_id = o.id
       WHERE b.tenant_id = $1
         AND b.status = 'CHECKED_IN'
       ORDER BY p.id, b.check_in DESC`,
      [tenantId]
    );

    const form = usdaForms.generateForm7001(facilityData, animalsResult.rows, reportDate);

    return createResponse(200, form);

  } catch (error) {
    console.error('[Compliance][7001] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate Form 7001',
    });
  }
}

/**
 * Get USDA Form 7001 - Animals on Hand (PDF)
 */
async function handleGetUSDAForm7001PDF(tenantId, queryParams) {
  const { reportDate } = queryParams;

  console.log('[Compliance][7001/PDF] tenantId:', tenantId);

  try {
    await getPoolAsync();

    const facilityData = await getFacilityData(tenantId);

    const animalsResult = await query(
      `SELECT DISTINCT ON (p.id)
         p.id, p.name, p.species, p.breed, p.birth_date, p.gender,
         p.microchip_number,
         o.first_name || ' ' || o.last_name as owner_name,
         b.check_in as date_received
       FROM "Pet" p
       JOIN "Booking" b ON p.id = ANY(b.pet_ids)
       JOIN "PetOwner" po ON p.id = po.pet_id
       JOIN "Owner" o ON po.owner_id = o.id
       WHERE b.tenant_id = $1
         AND b.status = 'CHECKED_IN'
       ORDER BY p.id, b.check_in DESC`,
      [tenantId]
    );

    const pdfBuffer = await usdaForms.generateForm7001PDF(facilityData, animalsResult.rows, reportDate);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USDA-Form-7001-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('[Compliance][7001/PDF] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate Form 7001 PDF',
    });
  }
}

/**
 * Get USDA Form 7002 - Acquisition/Disposition (JSON)
 */
async function handleGetUSDAForm7002(tenantId, queryParams) {
  const { startDate, endDate } = queryParams;

  console.log('[Compliance][7002] tenantId:', tenantId);

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  try {
    await getPoolAsync();

    const facilityData = await getFacilityData(tenantId);

    // Get check-ins and check-outs in date range
    const transactionsResult = await query(
      `SELECT
         b.id as booking_id,
         p.id as pet_id,
         p.name as pet_name,
         p.species,
         p.breed,
         p.gender,
         o.first_name || ' ' || o.last_name as owner_name,
         o.address as owner_address,
         b.check_in,
         b.check_out,
         b.actual_check_in,
         b.actual_check_out,
         b.status
       FROM "Booking" b
       JOIN "Owner" o ON b.owner_id = o.id
       CROSS JOIN LATERAL unnest(b.pet_ids) AS pid
       JOIN "Pet" p ON p.id = pid
       WHERE b.tenant_id = $1
                 AND (
           (DATE(COALESCE(b.actual_check_in, b.check_in)) BETWEEN $2 AND $3)
           OR (DATE(COALESCE(b.actual_check_out, b.check_out)) BETWEEN $2 AND $3)
         )
       ORDER BY COALESCE(b.actual_check_in, b.check_in) DESC`,
      [tenantId, start, end]
    );

    // Transform to transactions
    const transactions = [];
    for (const row of transactionsResult.rows) {
      const checkInDate = row.actual_check_in || row.check_in;
      const checkOutDate = row.actual_check_out || row.check_out;

      if (checkInDate && new Date(checkInDate) >= new Date(start) && new Date(checkInDate) <= new Date(end)) {
        transactions.push({
          type: 'checkin',
          date: new Date(checkInDate).toISOString().split('T')[0],
          petId: row.pet_id,
          petName: row.pet_name,
          species: row.species,
          breed: row.breed,
          gender: row.gender,
          ownerName: row.owner_name,
          ownerAddress: row.owner_address,
          bookingId: row.booking_id,
        });
      }

      if (checkOutDate && new Date(checkOutDate) >= new Date(start) && new Date(checkOutDate) <= new Date(end)) {
        transactions.push({
          type: 'checkout',
          date: new Date(checkOutDate).toISOString().split('T')[0],
          petId: row.pet_id,
          petName: row.pet_name,
          species: row.species,
          breed: row.breed,
          gender: row.gender,
          ownerName: row.owner_name,
          ownerAddress: row.owner_address,
          bookingId: row.booking_id,
        });
      }
    }

    const form = usdaForms.generateForm7002(facilityData, transactions, start, end);

    return createResponse(200, form);

  } catch (error) {
    console.error('[Compliance][7002] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate Form 7002',
    });
  }
}

/**
 * Get USDA Form 7002 - Acquisition/Disposition (PDF)
 */
async function handleGetUSDAForm7002PDF(tenantId, queryParams) {
  const { startDate, endDate } = queryParams;

  console.log('[Compliance][7002/PDF] tenantId:', tenantId);

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  try {
    await getPoolAsync();

    const facilityData = await getFacilityData(tenantId);

    const transactionsResult = await query(
      `SELECT
         b.id as booking_id, p.id as pet_id, p.name as pet_name,
         p.species, p.breed, p.gender,
         o.first_name || ' ' || o.last_name as owner_name,
         o.address as owner_address,
         b.actual_check_in, b.actual_check_out, b.check_in, b.check_out
       FROM "Booking" b
       JOIN "Owner" o ON b.owner_id = o.id
       CROSS JOIN LATERAL unnest(b.pet_ids) AS pid
       JOIN "Pet" p ON p.id = pid
       WHERE b.tenant_id = $1         AND ((DATE(COALESCE(b.actual_check_in, b.check_in)) BETWEEN $2 AND $3)
           OR (DATE(COALESCE(b.actual_check_out, b.check_out)) BETWEEN $2 AND $3))`,
      [tenantId, start, end]
    );

    const transactions = [];
    for (const row of transactionsResult.rows) {
      const checkInDate = row.actual_check_in || row.check_in;
      const checkOutDate = row.actual_check_out || row.check_out;

      if (checkInDate && new Date(checkInDate) >= new Date(start) && new Date(checkInDate) <= new Date(end)) {
        transactions.push({ type: 'checkin', date: new Date(checkInDate).toISOString().split('T')[0], ...row });
      }
      if (checkOutDate && new Date(checkOutDate) >= new Date(start) && new Date(checkOutDate) <= new Date(end)) {
        transactions.push({ type: 'checkout', date: new Date(checkOutDate).toISOString().split('T')[0], ...row });
      }
    }

    const pdfBuffer = await usdaForms.generateForm7002PDF(facilityData, transactions, start, end);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USDA-Form-7002-${start}-to-${end}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('[Compliance][7002/PDF] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate Form 7002 PDF',
    });
  }
}

/**
 * Get USDA Form 7005 - Veterinary Care (JSON)
 */
async function handleGetUSDAForm7005(tenantId, queryParams) {
  const { startDate, endDate } = queryParams;

  console.log('[Compliance][7005] tenantId:', tenantId);

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  try {
    await getPoolAsync();

    const facilityData = await getFacilityData(tenantId);

    // Get veterinary records (from incidents and vaccinations)
    const vetRecordsResult = await query(
      `SELECT
         i.id, i.incident_date as date,
         p.id as pet_id, p.name as pet_name, p.species, p.breed,
         'treatment' as type,
         i.title as description,
         i.medical_treatment as medication,
         i.vet_recommendations as notes
       FROM "Incident" i
       JOIN "Pet" p ON i.pet_id = p.id
       WHERE i.tenant_id = $1
         AND i.vet_contacted = true
         AND DATE(i.incident_date) BETWEEN $2 AND $3
               UNION ALL
       SELECT
         v.id, v.administered_date as date,
         p.id as pet_id, p.name as pet_name, p.species, p.breed,
         'vaccination' as type,
         v.vaccine_name as description,
         NULL as medication,
         v.notes
       FROM "Vaccination" v
       JOIN "Pet" p ON v.pet_id = p.id
       WHERE v.tenant_id = $1
         AND DATE(v.administered_date) BETWEEN $2 AND $3
               ORDER BY date DESC`,
      [tenantId, start, end]
    );

    const form = usdaForms.generateForm7005(facilityData, vetRecordsResult.rows, start, end);

    return createResponse(200, form);

  } catch (error) {
    console.error('[Compliance][7005] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate Form 7005',
    });
  }
}

/**
 * Get USDA Form 7005 - Veterinary Care (PDF)
 */
async function handleGetUSDAForm7005PDF(tenantId, queryParams) {
  const { startDate, endDate } = queryParams;

  console.log('[Compliance][7005/PDF] tenantId:', tenantId);

  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  try {
    await getPoolAsync();

    const facilityData = await getFacilityData(tenantId);

    const vetRecordsResult = await query(
      `SELECT i.id, i.incident_date as date, p.id as pet_id, p.name as pet_name,
              p.species, p.breed, 'treatment' as type, i.title as description,
              i.medical_treatment as medication, i.vet_recommendations as notes
       FROM "Incident" i JOIN "Pet" p ON i.pet_id = p.id
       WHERE i.tenant_id = $1 AND i.vet_contacted = true
         AND DATE(i.incident_date) BETWEEN $2 AND $3       UNION ALL
       SELECT v.id, v.administered_date as date, p.id as pet_id, p.name as pet_name,
              p.species, p.breed, 'vaccination' as type, v.vaccine_name as description,
              NULL as medication, v.notes
       FROM "Vaccination" v JOIN "Pet" p ON v.pet_id = p.id
       WHERE v.tenant_id = $1 AND DATE(v.administered_date) BETWEEN $2 AND $3       ORDER BY date DESC`,
      [tenantId, start, end]
    );

    const pdfBuffer = await usdaForms.generateForm7005PDF(facilityData, vetRecordsResult.rows, start, end);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USDA-Form-7005-${start}-to-${end}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('[Compliance][7005/PDF] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate Form 7005 PDF',
    });
  }
}

/**
 * Get vaccination compliance report
 */
async function handleGetVaccinationCompliance(tenantId) {
  console.log('[Compliance][vaccinations] tenantId:', tenantId);

  try {
    await getPoolAsync();

    const facilityData = await getFacilityData(tenantId);

    // Get all pets with their vaccinations
    const petsResult = await query(
      `SELECT p.id, p.name, p.species, p.breed,
              o.first_name || ' ' || o.last_name as owner_name
       FROM "Pet" p
       LEFT JOIN "PetOwner" po ON p.id = po.pet_id
       LEFT JOIN "Owner" o ON po.owner_id = o.id
       WHERE p.tenant_id = $1`,
      [tenantId]
    );

    const vaccinationsResult = await query(
      `SELECT pet_id, vaccine_name, administered_date, expiration_date
       FROM "Vaccination"
       WHERE tenant_id = $1 `,
      [tenantId]
    );

    const report = usdaForms.generateVaccinationComplianceReport(
      facilityData,
      petsResult.rows,
      vaccinationsResult.rows.map(v => ({
        petId: v.pet_id,
        vaccineName: v.vaccine_name,
        vaccinationDate: v.administered_date,
        expirationDate: v.expiration_date,
      }))
    );

    return createResponse(200, report);

  } catch (error) {
    console.error('[Compliance][vaccinations] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate vaccination compliance report',
    });
  }
}

/**
 * Get inspection checklist
 */
async function handleGetInspectionChecklist(tenantId) {
  console.log('[Compliance][checklist] tenantId:', tenantId);

  try {
    await getPoolAsync();

    const facilityData = await getFacilityData(tenantId);
    const checklist = usdaForms.generateInspectionChecklist(facilityData);

    return createResponse(200, checklist);

  } catch (error) {
    console.error('[Compliance][checklist] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate inspection checklist',
    });
  }
}

// =============================================================================
// AUDIT LOG HANDLERS
// =============================================================================

// Action metadata for display - maps database actions to frontend format
const AUDIT_ACTION_META = {
  // Authentication actions
  'login': { label: 'Successful login', group: 'Security', variant: 'neutral', severity: null },
  'login_failed': { label: 'Failed login attempt', group: 'Security', variant: 'danger', severity: 'high' },
  'logout': { label: 'Logged out', group: 'Security', variant: 'neutral', severity: null },
  'password_change': { label: 'Password changed', group: 'Security', variant: 'warning', severity: null },
  'password_reset': { label: 'Password reset', group: 'Security', variant: 'warning', severity: null },
  'mfa_enabled': { label: 'MFA enabled', group: 'Security', variant: 'success', severity: null },
  'mfa_disabled': { label: 'MFA disabled', group: 'Security', variant: 'danger', severity: 'high' },
  
  // CRUD operations
  'create': { label: 'Created', group: 'Data', variant: 'info', severity: null },
  'update': { label: 'Updated', group: 'Data', variant: 'info', severity: null },
  'delete': { label: 'Deleted', group: 'Data', variant: 'warning', severity: null },
  'read': { label: 'Viewed', group: 'Data', variant: 'neutral', severity: null },
  
  // Booking actions
  'booking.created': { label: 'Booking created', group: 'Bookings', variant: 'info', severity: null },
  'booking.updated': { label: 'Booking updated', group: 'Bookings', variant: 'info', severity: null },
  'booking.cancelled': { label: 'Booking cancelled', group: 'Bookings', variant: 'warning', severity: null },
  'check_in': { label: 'Pet checked in', group: 'Bookings', variant: 'success', severity: null },
  'check_out': { label: 'Pet checked out', group: 'Bookings', variant: 'success', severity: null },
  
  // Team actions
  'team.invite.sent': { label: 'Team invite sent', group: 'Team', variant: 'info', severity: null },
  'team.role.updated': { label: 'Role updated', group: 'Team', variant: 'warning', severity: null },
  'permission_change': { label: 'Permissions changed', group: 'Team', variant: 'warning', severity: null },
  
  // Financial actions
  'payment': { label: 'Payment processed', group: 'Financial', variant: 'success', severity: null },
  'refund': { label: 'Refund issued', group: 'Financial', variant: 'warning', severity: null },
  
  // Data operations
  'export': { label: 'Data exported', group: 'Compliance', variant: 'info', severity: null },
  'import': { label: 'Data imported', group: 'Compliance', variant: 'info', severity: null },
  'settings.audit.exported': { label: 'Audit log exported', group: 'Compliance', variant: 'info', severity: null },
  'data.export.generated': { label: 'Workspace export generated', group: 'Compliance', variant: 'info', severity: null },
  
  // Config changes
  'config_change': { label: 'Settings changed', group: 'Settings', variant: 'warning', severity: null },
};

const FALLBACK_META = { label: 'Activity', group: 'Misc', variant: 'neutral', severity: null };

/**
 * Get audit logs for a tenant with filtering
 */
async function handleGetAuditLogs(tenantId, queryParams) {
  const { 
    group, // category filter: Security, Bookings, Team, Compliance, etc.
    timeframe = '30d', // 24h, 7d, 30d, 90d, all
    search, // search query
    limit = 100,
    offset = 0,
  } = queryParams;

  console.log('[AuditLog][list] tenantId:', tenantId, 'filters:', { group, timeframe, search });

  try {
    await getPoolAsync();

    // Calculate date window
    let startDate = null;
    const now = new Date();
    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      // 'all' or unrecognized - no date filter
    }

    // Check if audit tables exist first
    const tableCheckResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'AuditLog'
      ) as audit_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'AuthAuditLog'
      ) as auth_audit_exists
    `);
    
    const { audit_exists, auth_audit_exists } = tableCheckResult.rows[0] || {};
    
    // If neither table exists, return empty results gracefully
    if (!audit_exists && !auth_audit_exists) {
      console.log('[AuditLog] No audit tables found, returning empty result');
      return createResponse(200, {
        events: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: false,
        _empty: true,
        _message: 'Audit logging is not yet configured. Events will appear here once audit tables are created.',
      });
    }

    // Build queries based on which tables exist
    const queries = [];
    const params = [tenantId];
    let paramIndex = 2;
    
    const dateFilterAudit = startDate ? ` AND a.created_at >= $${paramIndex}` : '';
    const dateFilterAuth = startDate ? ` AND aa.created_at >= $${paramIndex}` : '';
    
    if (startDate) {
      params.push(startDate.toISOString());
      paramIndex++;
    }

    if (audit_exists) {
      queries.push(`
        SELECT 
          a.id,
          a.id as "recordId",
          a.action,
          a.entity_type as "entityType",
          a.entity_id as "entityId",
          COALESCE(a.new_values->>'name', a.entity_type || ' ' || COALESCE(a.entity_id::text, '')) as "entityName",
          a.old_values as "oldValues",
          a.new_values as "newValues",
          a.changes,
          a.ip_address as "ipAddress",
          a.user_agent as "userAgent",
          a.metadata,
          a.created_at as timestamp,
          u.id as "actorId",
          u.first_name as "actorFirstName",
          u.last_name as "actorLastName",
          u.email as "actorEmail",
          'general' as source_type
        FROM "AuditLog" a
        LEFT JOIN "User" u ON a.user_id = u.id
        WHERE a.tenant_id = $1${dateFilterAudit}
      `);
    }

    if (auth_audit_exists) {
      queries.push(`
        SELECT 
          aa.id,
          aa.id as "recordId",
          aa.action,
          'session' as "entityType",
          NULL::uuid as "entityId",
          CASE 
            WHEN aa.action = 'login' THEN 'App login'
            WHEN aa.action = 'login_failed' THEN 'Portal login'
            WHEN aa.action = 'logout' THEN 'Session ended'
            WHEN aa.action = 'mfa_enabled' THEN 'MFA status changed'
            WHEN aa.action = 'mfa_disabled' THEN 'MFA status changed'
            ELSE 'Auth event'
          END as "entityName",
          NULL::jsonb as "oldValues",
          NULL::jsonb as "newValues",
          NULL::jsonb as changes,
          aa.ip_address::text as "ipAddress",
          aa.user_agent as "userAgent",
          jsonb_build_object(
            'status', aa.status,
            'failureReason', aa.failure_reason,
            'location', aa.location
          ) as metadata,
          aa.created_at as timestamp,
          u.id as "actorId",
          u.first_name as "actorFirstName",
          u.last_name as "actorLastName",
          u.email as "actorEmail",
          'auth' as source_type
        FROM "AuthAuditLog" aa
        LEFT JOIN "User" u ON aa.user_id = u.id
        WHERE (aa.tenant_id = $1 OR aa.tenant_id IS NULL)${dateFilterAuth}
      `);
    }

    // Combine queries with UNION ALL
    const combinedQuery = `
      WITH combined AS (
        ${queries.join(' UNION ALL ')}
      )
      SELECT * FROM combined
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(combinedQuery, params);

    // Transform results to frontend format
    const events = result.rows.map(row => {
      const actionMeta = AUDIT_ACTION_META[row.action] || FALLBACK_META;
      
      // Apply group filter if specified
      if (group && group !== 'all' && actionMeta.group !== group) {
        return null;
      }

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const searchableText = [
          row.entityName,
          row.entityType,
          row.actorFirstName,
          row.actorLastName,
          row.actorEmail,
          actionMeta.label,
          row.action,
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) {
          return null;
        }
      }

      return {
        recordId: row.recordId,
        action: row.action,
        entityType: row.entityType,
        entityName: row.entityName || row.entityType,
        entityId: row.entityId,
        timestamp: row.timestamp,
        actor: {
          id: row.actorId,
          name: row.actorFirstName && row.actorLastName 
            ? `${row.actorFirstName} ${row.actorLastName}`
            : (row.actorEmail || 'System'),
          email: row.actorEmail || null,
        },
        source: row.source_type === 'auth' ? 'Auth System' : 'Dashboard',
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        location: row.metadata?.location?.city 
          ? `${row.metadata.location.city}, ${row.metadata.location.region || ''}`
          : null,
        metadata: row.metadata || {},
        diff: row.changes,
        // Frontend-specific fields
        _meta: {
          label: actionMeta.label,
          group: actionMeta.group,
          variant: actionMeta.variant,
          severity: actionMeta.severity,
        },
      };
    }).filter(Boolean);

    // Get count for pagination - build count query based on which tables exist
    let countQuery = 'SELECT ';
    const countParts = [];
    if (audit_exists) {
      countParts.push(`(SELECT COUNT(*) FROM "AuditLog" WHERE tenant_id = $1 ${startDate ? `AND created_at >= $2` : ''})`);
    }
    if (auth_audit_exists) {
      countParts.push(`(SELECT COUNT(*) FROM "AuthAuditLog" WHERE (tenant_id = $1 OR tenant_id IS NULL) ${startDate ? `AND created_at >= $2` : ''})`);
    }
    countQuery += countParts.length > 1 ? countParts.join(' + ') : (countParts[0] || '0');
    countQuery += ' as total';
    
    const countParams = startDate ? [tenantId, startDate.toISOString()] : [tenantId];
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0);

    console.log('[AuditLog][list] Found:', events.length, 'events, total:', total);

    return createResponse(200, {
      events,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + events.length < total,
    });

  } catch (error) {
    // Handle missing tables gracefully (fallback for any edge cases)
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[AuditLog] Tables not found, returning empty result');
      return createResponse(200, {
        events: [],
        total: 0,
        limit: parseInt(limit || 100),
        offset: parseInt(offset || 0),
        hasMore: false,
        _empty: true,
      });
    }
    
    console.error('[AuditLog][list] Error:', error.message, error.stack);
    // Return empty results instead of error for better UX
    return createResponse(200, {
      events: [],
      total: 0,
      limit: parseInt(limit || 100),
      offset: parseInt(offset || 0),
      hasMore: false,
      _error: true,
      _message: 'Unable to load audit logs at this time.',
    });
  }
}

/**
 * Get audit log summary stats
 */
async function handleGetAuditLogSummary(tenantId, queryParams) {
  const { timeframe = '30d' } = queryParams;

  console.log('[AuditLog][summary] tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Check if audit tables exist first
    const tableCheckResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'AuditLog'
      ) as audit_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'AuthAuditLog'
      ) as auth_audit_exists
    `);
    
    const { audit_exists, auth_audit_exists } = tableCheckResult.rows[0] || {};
    
    // If neither table exists, return empty summary
    if (!audit_exists && !auth_audit_exists) {
      return createResponse(200, {
        totalEvents: 0,
        uniqueActors: 0,
        highRiskCount: 0,
        byAction: [],
        timeframe,
        _empty: true,
      });
    }

    // Calculate date window
    let startDate = null;
    const now = new Date();
    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    const dateFilter = startDate ? `AND created_at >= '${startDate.toISOString()}'` : '';

    // Build queries based on which tables exist
    let totalEvents = 0;
    let uniqueActors = 0;
    let highRiskCount = 0;
    let byAction = [];

    // Get total events
    const totalParts = [];
    if (audit_exists) totalParts.push(`(SELECT COUNT(*) FROM "AuditLog" WHERE tenant_id = $1 ${dateFilter})`);
    if (auth_audit_exists) totalParts.push(`(SELECT COUNT(*) FROM "AuthAuditLog" WHERE (tenant_id = $1 OR tenant_id IS NULL) ${dateFilter})`);
    
    if (totalParts.length > 0) {
      const totalResult = await query(`SELECT ${totalParts.join(' + ')} as total`, [tenantId]);
      totalEvents = parseInt(totalResult.rows[0]?.total || 0);
    }

    // Get unique actors
    const actorParts = [];
    if (audit_exists) actorParts.push(`SELECT user_id FROM "AuditLog" WHERE tenant_id = $1 ${dateFilter}`);
    if (auth_audit_exists) actorParts.push(`SELECT user_id FROM "AuthAuditLog" WHERE (tenant_id = $1 OR tenant_id IS NULL) ${dateFilter}`);
    
    if (actorParts.length > 0) {
      const actorsResult = await query(`SELECT COUNT(DISTINCT user_id) as count FROM (${actorParts.join(' UNION ')}) as actors`, [tenantId]);
      uniqueActors = parseInt(actorsResult.rows[0]?.count || 0);
    }

    // Get high-risk events (failed logins, MFA disabled)
    if (auth_audit_exists) {
      const highRiskResult = await query(`
        SELECT COUNT(*) as count FROM "AuthAuditLog" 
        WHERE (tenant_id = $1 OR tenant_id IS NULL) 
        AND action IN ('login_failed', 'mfa_disabled') ${dateFilter}
      `, [tenantId]);
      highRiskCount = parseInt(highRiskResult.rows[0]?.count || 0);
    }

    // Get events by category
    const actionParts = [];
    if (audit_exists) actionParts.push(`SELECT action FROM "AuditLog" WHERE tenant_id = $1 ${dateFilter}`);
    if (auth_audit_exists) actionParts.push(`SELECT action FROM "AuthAuditLog" WHERE (tenant_id = $1 OR tenant_id IS NULL) ${dateFilter}`);
    
    if (actionParts.length > 0) {
      const byActionResult = await query(`
        SELECT action, COUNT(*) as count FROM (${actionParts.join(' UNION ALL ')}) as actions
        GROUP BY action ORDER BY count DESC
      `, [tenantId]);
      byAction = byActionResult.rows.map(r => ({
        action: r.action,
        count: parseInt(r.count),
        meta: AUDIT_ACTION_META[r.action] || FALLBACK_META,
      }));
    }

    return createResponse(200, {
      totalEvents,
      uniqueActors,
      highRiskCount,
      byAction,
      timeframe,
    });

  } catch (error) {
    console.error('[AuditLog][summary] Error:', error.message);
    // Return empty summary on error for graceful degradation
    return createResponse(200, {
      totalEvents: 0,
      uniqueActors: 0,
      highRiskCount: 0,
      byAction: [],
      timeframe,
      _error: true,
    });
  }
}

/**
 * Export audit logs as CSV
 */
async function handleExportAuditLogs(tenantId, queryParams) {
  const { 
    timeframe = '30d',
    format = 'csv',
  } = queryParams;

  console.log('[AuditLog][export] tenantId:', tenantId, 'format:', format);

  try {
    await getPoolAsync();

    // Check if audit tables exist first
    const tableCheckResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'AuditLog'
      ) as audit_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'AuthAuditLog'
      ) as auth_audit_exists
    `);
    
    const { audit_exists, auth_audit_exists } = tableCheckResult.rows[0] || {};
    
    // If neither table exists, return empty export
    if (!audit_exists && !auth_audit_exists) {
      const columns = ['timestamp', 'action', 'entity_type', 'entity_name', 'actor_name', 'actor_email', 'ip_address', 'source'];
      const filename = `audit_log_empty_${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (format === 'json') {
        return createExportResponse({
          report: 'Audit Log Export',
          timeframe,
          generatedAt: new Date().toISOString(),
          totalEvents: 0,
          data: [],
          _message: 'No audit logs available - audit tables not yet configured',
        }, filename, 'json');
      }
      
      return createExportResponse(toCSV([], columns), filename, 'csv');
    }

    // Calculate date window
    let startDate = null;
    const now = new Date();
    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    const dateFilter = startDate ? `AND a.created_at >= '${startDate.toISOString()}'` : '';
    const authDateFilter = startDate ? `AND aa.created_at >= '${startDate.toISOString()}'` : '';

    // Build query based on which tables exist
    const queries = [];
    
    if (audit_exists) {
      queries.push(`
        SELECT 
          a.id,
          a.created_at as timestamp,
          a.action,
          a.entity_type,
          COALESCE(a.new_values->>'name', a.entity_type) as entity_name,
          a.ip_address,
          u.first_name || ' ' || u.last_name as actor_name,
          u.email as actor_email,
          'Dashboard' as source
        FROM "AuditLog" a
        LEFT JOIN "User" u ON a.user_id = u.id
        WHERE a.tenant_id = $1 ${dateFilter}
      `);
    }

    if (auth_audit_exists) {
      queries.push(`
        SELECT 
          aa.id,
          aa.created_at as timestamp,
          aa.action,
          'session' as entity_type,
          CASE WHEN aa.action = 'login_failed' THEN 'Failed login' ELSE 'Auth event' END as entity_name,
          aa.ip_address::text,
          u.first_name || ' ' || u.last_name as actor_name,
          u.email as actor_email,
          'Auth System' as source
        FROM "AuthAuditLog" aa
        LEFT JOIN "User" u ON aa.user_id = u.id
        WHERE (aa.tenant_id = $1 OR aa.tenant_id IS NULL) ${authDateFilter}
      `);
    }

    const result = await query(`${queries.join(' UNION ALL ')} ORDER BY timestamp DESC`, [tenantId]);

    const columns = ['timestamp', 'action', 'entity_type', 'entity_name', 'actor_name', 'actor_email', 'ip_address', 'source'];
    
    const rows = result.rows.map(row => ({
      timestamp: row.timestamp?.toISOString() || '',
      action: row.action,
      entity_type: row.entity_type,
      entity_name: row.entity_name || '',
      actor_name: row.actor_name || 'System',
      actor_email: row.actor_email || '',
      ip_address: row.ip_address || '',
      source: row.source,
    }));

    const filename = `audit_log_${timeframe}_${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'json') {
      return createExportResponse({
        report: 'Audit Log Export',
        timeframe,
        generatedAt: new Date().toISOString(),
        totalEvents: rows.length,
        data: rows,
      }, filename, 'json');
    }

    return createExportResponse(toCSV(rows, columns), filename, 'csv');

  } catch (error) {
    console.error('[AuditLog][export] Error:', error.message);
    
    // Return empty export on error
    const columns = ['timestamp', 'action', 'entity_type', 'entity_name', 'actor_name', 'actor_email', 'ip_address', 'source'];
    const filename = `audit_log_error_${new Date().toISOString().split('T')[0]}.csv`;
    return createExportResponse(toCSV([], columns), filename, 'csv');
  }
}

/**
 * Get demo audit events when tables don't exist yet
 */
function getDemoAuditEvents() {
  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;
  
  return [
    {
      recordId: 'demo_log_1007',
      action: 'login_failed',
      entityType: 'session',
      entityName: 'Portal login',
      timestamp: new Date(now.getTime() - 0.2 * DAY_MS).toISOString(),
      actor: { name: 'Unknown user', email: null },
      source: 'Web portal',
      ipAddress: '198.51.100.12',
      location: 'Seattle, WA',
      metadata: { reason: 'Invalid password' },
      _meta: { label: 'Failed login attempt', group: 'Security', variant: 'danger', severity: 'high' },
    },
    {
      recordId: 'demo_log_1001',
      action: 'booking.created',
      entityType: 'booking',
      entityName: 'Overnight stay for Luna',
      timestamp: new Date(now.getTime() - 0.8 * DAY_MS).toISOString(),
      actor: { name: 'Danielle Boyd', email: 'danielle@example.com' },
      source: 'Dashboard',
      ipAddress: '172.16.0.16',
      location: 'Portland, OR',
      metadata: { status: 'confirmed', deposit: 75 },
      _meta: { label: 'Booking created', group: 'Bookings', variant: 'info', severity: null },
    },
    {
      recordId: 'demo_log_1002',
      action: 'booking.cancelled',
      entityType: 'booking',
      entityName: 'Daycare for Clover',
      timestamp: new Date(now.getTime() - 1.6 * DAY_MS).toISOString(),
      actor: { name: 'Maxwell Grant', email: 'max@example.com' },
      source: 'Dashboard',
      ipAddress: '172.16.0.32',
      location: 'Portland, OR',
      metadata: { reason: 'Owner request', refund: 'Pending' },
      _meta: { label: 'Booking cancelled', group: 'Bookings', variant: 'warning', severity: null },
    },
    {
      recordId: 'demo_log_1003',
      action: 'team.invite.sent',
      entityType: 'membership',
      entityName: 'Invite: julia@resortpaws.com',
      timestamp: new Date(now.getTime() - 2.2 * DAY_MS).toISOString(),
      actor: { name: 'Olivia Hart', email: 'olivia@example.com' },
      source: 'Dashboard',
      ipAddress: '172.16.0.8',
      location: 'Portland, OR',
      metadata: { role: 'Staff' },
      _meta: { label: 'Team invite sent', group: 'Team', variant: 'info', severity: null },
    },
    {
      recordId: 'demo_log_1004',
      action: 'settings.audit.exported',
      entityType: 'audit-log',
      entityName: 'Audit CSV download',
      timestamp: new Date(now.getTime() - 3.1 * DAY_MS).toISOString(),
      actor: { name: 'Olivia Hart', email: 'olivia@example.com' },
      source: 'Dashboard',
      ipAddress: '172.16.0.8',
      location: 'Portland, OR',
      metadata: { format: 'csv' },
      _meta: { label: 'Audit log exported', group: 'Compliance', variant: 'info', severity: null },
    },
    {
      recordId: 'demo_log_1005',
      action: 'team.role.updated',
      entityType: 'membership',
      entityName: 'Role change: jose@example.com',
      timestamp: new Date(now.getTime() - 5.7 * DAY_MS).toISOString(),
      actor: { name: 'Danielle Boyd', email: 'danielle@example.com' },
      source: 'Dashboard',
      ipAddress: '172.16.0.16',
      location: 'Portland, OR',
      metadata: { previousRole: 'Staff', nextRole: 'Manager' },
      diff: { role: ['Staff', 'Manager'] },
      _meta: { label: 'Role updated', group: 'Team', variant: 'warning', severity: null },
    },
    {
      recordId: 'demo_log_1006',
      action: 'login',
      entityType: 'session',
      entityName: 'App login',
      timestamp: new Date(now.getTime() - 9.5 * DAY_MS).toISOString(),
      actor: { name: 'Josephine Kemp', email: 'jo@example.com' },
      source: 'Mobile',
      ipAddress: '203.0.113.55',
      location: 'Boise, ID',
      metadata: { device: 'iPhone 15 Pro', mfa: true },
      _meta: { label: 'Successful login', group: 'Security', variant: 'neutral', severity: null },
    },
    {
      recordId: 'demo_log_1008',
      action: 'mfa_disabled',
      entityType: 'security',
      entityName: 'MFA status changed',
      timestamp: new Date(now.getTime() - 14 * DAY_MS).toISOString(),
      actor: { name: 'System Administrator', email: 'admin@barkbase.com' },
      source: 'Admin API',
      ipAddress: '10.0.1.5',
      location: 'Austin, TX',
      metadata: { user: 'guest@example.com', reason: 'Device reset' },
      _meta: { label: 'MFA disabled', group: 'Security', variant: 'danger', severity: 'high' },
    },
    {
      recordId: 'demo_log_1009',
      action: 'data.export.generated',
      entityType: 'export',
      entityName: 'Workspace export archive',
      timestamp: new Date(now.getTime() - 21 * DAY_MS).toISOString(),
      actor: { name: 'Josephine Kemp', email: 'jo@example.com' },
      source: 'Dashboard',
      ipAddress: '203.0.113.55',
      location: 'Boise, ID',
      metadata: { size: '12.4 MB', format: 'zip' },
      _meta: { label: 'Workspace export generated', group: 'Compliance', variant: 'info', severity: null },
    },
  ];
}
