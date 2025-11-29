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
       WHERE tenant_id = $1 AND status = 'CHECKED_IN' AND deleted_at IS NULL`,
      [tenantId]
    );

    // Get today's arrivals (check_in date is today, schema uses check_in not start_date)
    const arrivalsResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1 AND status IN ('PENDING', 'CONFIRMED')
       AND DATE(check_in) = CURRENT_DATE AND deleted_at IS NULL`,
      [tenantId]
    );

    // Get today's departures (check_out date is today)
    const departuresResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1 AND status = 'CHECKED_IN'
       AND DATE(check_out) = CURRENT_DATE AND deleted_at IS NULL`,
      [tenantId]
    );

    // Get total capacity (kennels)
    const capacityResult = await query(
      `SELECT COALESCE(SUM(capacity), 0) as capacity, COUNT(*) as count FROM "Kennel"
       WHERE tenant_id = $1 AND is_active = true AND deleted_at IS NULL`,
      [tenantId]
    );

    // Get pending tasks
    const pendingTasksResult = await query(
      `SELECT COUNT(*) as count FROM "Task"
       WHERE tenant_id = $1 AND status = 'PENDING' AND deleted_at IS NULL`,
      [tenantId]
    );

    // Get total customers (owners)
    const customersResult = await query(
      `SELECT COUNT(*) as count FROM "Owner" WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    // Get total pets
    const petsResult = await query(
      `SELECT COUNT(*) as count FROM "Pet" WHERE tenant_id = $1 AND deleted_at IS NULL`,
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
       AND deleted_at IS NULL`,
      [tenantId]
    );

    // Get this month's bookings
    const monthlyBookingsResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1
       AND check_in >= DATE_TRUNC('month', CURRENT_DATE)
       AND deleted_at IS NULL`,
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
         COALESCE(SUM(total_price), 0) as total_revenue,
         COUNT(*) as transaction_count,
         COALESCE(AVG(total_price), 0) as avg_transaction
       FROM "Booking" b
       WHERE ${whereClause} AND b.status IN ('CHECKED_IN', 'COMPLETED')`,
      params
    );

    const row = result.rows[0];

    return createResponse(200, {
      data: {
        totalRevenue: parseFloat(row.total_revenue || 0),
        transactionCount: parseInt(row.transaction_count || 0),
        averageTransactionValue: parseFloat(row.avg_transaction || 0),
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
         COALESCE(SUM(total_price), 0) as revenue,
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
        revenue: parseFloat(result.rows[0]?.revenue || 0),
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
         COALESCE(SUM(total_price), 0) as revenue,
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
        revenue: parseFloat(result.rows[0]?.revenue || 0),
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
  const days = parseInt(queryParams.days) || 7;

  try {
    await getPoolAsync();

    // Get upcoming bookings
    const result = await query(
      `SELECT DATE(start_date) as date, COUNT(*) as bookings
       FROM "Booking"
       WHERE tenant_id = $1
       AND start_date >= CURRENT_DATE
       AND start_date <= CURRENT_DATE + INTERVAL '${days} days'
       AND status = 'PENDING'
       GROUP BY DATE(start_date)
       ORDER BY date`,
      [tenantId]
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
  console.log('[Segments][list] env DB_NAME:', process.env.DB_NAME || process.env.DB_DATABASE);

  try {
    await getPoolAsync();

    // Diagnostic: counts per tenant
    try {
      const diagCounts = await query(
        `SELECT tenant_id, COUNT(*) as cnt FROM "Segment" GROUP BY tenant_id`
      );
      console.log('[Segments][diag] counts per tenant:', JSON.stringify(diagCounts.rows));
    } catch (diagErr) {
      console.warn('[Segments][diag] count query failed:', diagErr.message);
    }

    // Diagnostic: sample rows for this tenant
    try {
      const diagSample = await query(
        `SELECT id, name, is_dynamic, member_count FROM "Segment" WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 5`,
        [tenantId]
      );
      console.log('[Segments][diag] sample for tenant', tenantId, ':', JSON.stringify(diagSample.rows));
    } catch (diagErr) {
      console.warn('[Segments][diag] sample query failed:', diagErr.message);
    }

    // Main query - use actual schema columns (no is_active, no SegmentCampaign)
    const result = await query(
      `SELECT
         s.id,
         s.name,
         s.description,
         s.criteria,
         s.is_dynamic,
         s.member_count,
         s.created_at,
         s.updated_at
       FROM "Segment" s
       WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
       ORDER BY s.name ASC`,
      [tenantId]
    );

    console.log('[Segments][list] query returned:', result.rows.length, 'rows');

    const segments = result.rows.map(row => ({
      id: row.id,
      recordId: row.id, // Alias for frontend compatibility
      name: row.name,
      description: row.description,
      criteria: row.criteria || {},
      isDynamic: row.is_dynamic ?? true,
      isActive: true, // Schema has no is_active - assume all non-deleted are active
      isAutomatic: row.is_dynamic ?? true, // Alias for frontend (isAutomatic = isDynamic)
      _count: {
        members: parseInt(row.member_count || 0),
        campaigns: 0, // No SegmentCampaign table exists
      },
      memberCount: parseInt(row.member_count || 0), // Backwards compatibility
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
      `SELECT id FROM "Segment" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
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
