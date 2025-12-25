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
  // Account code resolver (New ID System)
  resolveAccountContext,
  rewritePathToLegacy,
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
  let path = event.requestContext?.http?.path || event.path || '/';

  console.log('[ANALYTICS-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  try {
    // =========================================================================
    // NEW ID SYSTEM: Resolve account_code to tenant_id
    // Supports both new URL pattern and X-Account-Code header
    // =========================================================================
    const accountContext = await resolveAccountContext(event);
    if (!accountContext.valid) {
      console.error('[ANALYTICS-SERVICE] Account context invalid:', accountContext.error);
      return createResponse(400, {
        error: 'BadRequest',
        message: accountContext.error || 'Invalid account context',
      });
    }

    // If using new ID pattern, rewrite path to legacy format for handler compatibility
    if (accountContext.isNewPattern) {
      rewritePathToLegacy(event, accountContext);
      path = event.requestContext?.http?.path || event.path || '/';
      console.log('[ANALYTICS-SERVICE] New ID pattern detected:', {
        accountCode: accountContext.accountCode,
        tenantId: accountContext.tenantId,
        typeId: accountContext.typeId,
        recordId: accountContext.recordId,
      });
    }

    // Store resolved tenant_id for later use
    event.resolvedTenantId = accountContext.tenantId;
    event.accountContext = accountContext;

    // Authenticate request
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      });
    }

    const user = authResult.user;

    // Get tenantId - prefer account context, then X-Tenant-Id header, fallback to database lookup
    let tenantId = accountContext.tenantId || getTenantIdFromHeader(event);

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
    // Get database user for segment operations that need to track who made changes
    const dbUser = await getUserIdFromCognitoSub(user.id);
    const userId = dbUser?.id || null;

    if (path === '/api/v1/segments') {
      if (method === 'GET') {
        return handleGetSegments(tenantId);
      }
      if (method === 'POST') {
        return handleCreateSegment(tenantId, parseBody(event), userId);
      }
    }

    // Segment preview (for builder)
    if (path === '/api/v1/segments/preview') {
      if (method === 'POST') {
        return handlePreviewSegment(tenantId, parseBody(event));
      }
    }

    // Segment refresh all
    if (path === '/api/v1/segments/refresh') {
      if (method === 'POST') {
        return handleRefreshAllSegments(tenantId);
      }
    }

    // Single segment by ID
    const segmentIdMatch = path.match(/\/api\/v1\/segments\/([a-f0-9-]+)$/i);
    if (segmentIdMatch) {
      const segmentId = segmentIdMatch[1];
      if (method === 'GET') {
        return handleGetSegment(tenantId, segmentId);
      }
      if (method === 'PUT') {
        return handleUpdateSegment(tenantId, segmentId, parseBody(event), userId);
      }
      if (method === 'DELETE') {
        return handleDeleteSegment(tenantId, segmentId);
      }
    }

    // Segment members
    const segmentMembersMatch = path.match(/\/api\/v1\/segments\/([a-f0-9-]+)\/members$/i);
    if (segmentMembersMatch) {
      if (method === 'GET') {
        return handleGetSegmentMembers(tenantId, segmentMembersMatch[1], queryParams);
      }
      if (method === 'POST') {
        return handleAddSegmentMembers(tenantId, segmentMembersMatch[1], parseBody(event));
      }
      if (method === 'DELETE') {
        return handleRemoveSegmentMembers(tenantId, segmentMembersMatch[1], parseBody(event));
      }
    }

    // Segment clone
    const segmentCloneMatch = path.match(/\/api\/v1\/segments\/([a-f0-9-]+)\/clone$/i);
    if (segmentCloneMatch && method === 'POST') {
      return handleCloneSegment(tenantId, segmentCloneMatch[1]);
    }

    // Segment convert
    const segmentConvertMatch = path.match(/\/api\/v1\/segments\/([a-f0-9-]+)\/convert$/i);
    if (segmentConvertMatch && method === 'POST') {
      return handleConvertSegment(tenantId, segmentConvertMatch[1], parseBody(event));
    }

    // Segment refresh single
    const segmentRefreshMatch = path.match(/\/api\/v1\/segments\/([a-f0-9-]+)\/refresh$/i);
    if (segmentRefreshMatch && method === 'POST') {
      return handleRefreshSegment(tenantId, segmentRefreshMatch[1]);
    }

    // Segment activity
    const segmentActivityMatch = path.match(/\/api\/v1\/segments\/([a-f0-9-]+)\/activity$/i);
    if (segmentActivityMatch && method === 'GET') {
      return handleGetSegmentActivity(tenantId, segmentActivityMatch[1], queryParams);
    }

    // Segment export
    const segmentExportMatch = path.match(/\/api\/v1\/segments\/([a-f0-9-]+)\/export$/i);
    if (segmentExportMatch && method === 'GET') {
      return handleExportSegmentMembers(tenantId, segmentExportMatch[1]);
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
      return handleGetDashboard(tenantId, queryParams);
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

    // Custom Report Query endpoint
    if (path === '/api/v1/analytics/reports/query' || path === '/analytics/reports/query') {
      if (method === 'POST') {
        return handleCustomReportQuery(tenantId, parseBody(event));
      }
    }

    // Report Field Definitions - GET available fields per data source
    if (path === '/api/v1/analytics/reports/fields' || path === '/analytics/reports/fields') {
      if (method === 'GET') {
        return handleGetReportFields(tenantId, queryParams);
      }
    }

    // Saved Reports - CRUD operations
    if (path === '/api/v1/analytics/reports/saved' || path === '/analytics/reports/saved') {
      if (method === 'GET') {
        return handleGetSavedReports(tenantId, userId);
      }
      if (method === 'POST') {
        return handleSaveReport(tenantId, userId, parseBody(event));
      }
    }

    // Saved Report duplicate
    const savedReportDuplicateMatch = path.match(/\/api\/v1\/analytics\/reports\/saved\/([a-zA-Z0-9_-]+)\/duplicate$/i);
    if (savedReportDuplicateMatch && method === 'POST') {
      return handleDuplicateSavedReport(tenantId, userId, savedReportDuplicateMatch[1]);
    }

    // Saved Report by ID - get/update/delete
    const savedReportMatch = path.match(/\/api\/v1\/analytics\/reports\/saved\/([a-zA-Z0-9_-]+)$/i);
    if (savedReportMatch) {
      if (method === 'GET') {
        return handleGetSavedReportById(tenantId, savedReportMatch[1]);
      }
      if (method === 'PUT') {
        return handleUpdateSavedReport(tenantId, userId, savedReportMatch[1], parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteSavedReport(tenantId, userId, savedReportMatch[1]);
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

/**
 * Helper: Get database User ID from cognito_sub
 */
async function getUserIdFromCognitoSub(cognitoSub) {
  try {
    await getPoolAsync();
    const result = await query(
      `SELECT record_id, tenant_id, first_name, last_name, email FROM "User" WHERE cognito_sub = $1`,
      [cognitoSub]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get user ID:', error.message);
    return null;
  }
}

// =============================================================================
// DASHBOARD HANDLERS
// =============================================================================

/**
 * Get main dashboard data
 * @param {string} tenantId - Tenant ID
 * @param {object} queryParams - Query parameters including startDate, endDate, compareStartDate, compareEndDate
 */
async function handleGetDashboard(tenantId, queryParams = {}) {
  const { startDate, endDate, compareStartDate, compareEndDate } = queryParams;

  // Default to this month if no dates provided
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEndDate = now.toISOString().split('T')[0];

  const start = startDate || defaultStartDate;
  const end = endDate || defaultEndDate;

  // Calculate comparison dates if not provided
  let compStart = compareStartDate;
  let compEnd = compareEndDate;
  if (!compStart || !compEnd) {
    const startD = new Date(start);
    const endD = new Date(end);
    const daysDiff = Math.ceil((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
    const compEndDate = new Date(startD);
    compEndDate.setDate(compEndDate.getDate() - 1);
    const compStartDate = new Date(compEndDate);
    compStartDate.setDate(compStartDate.getDate() - daysDiff + 1);
    compStart = compStartDate.toISOString().split('T')[0];
    compEnd = compEndDate.toISOString().split('T')[0];
  }

  console.log('[Dashboard][get] tenantId:', tenantId, 'range:', start, 'to', end, 'compare:', compStart, 'to', compEnd);

  try {
    await getPoolAsync();

    // OPTIMIZED: Run all dashboard queries in parallel using Promise.all
    // This reduces response time from ~15 sequential queries to 1 parallel batch
    const [
      activeBookingsResult,
      totalBookingsResult,
      compareBookingsResult,
      pendingBookingsResult,
      arrivalsResult,
      departuresResult,
      capacityResult,
      pendingTasksResult,
      customersResult,
      totalCustomersResult,
      compareCustomersResult,
      petsResult,
      revenueResult,
      compareRevenueResult,
      noShowsResult,
    ] = await Promise.all([
      // Active bookings count (status CHECKED_IN)
      query(
        `SELECT COUNT(*) as count FROM "Booking"
         WHERE tenant_id = $1 AND status = 'CHECKED_IN'`,
        [tenantId]
      ),

      // Total bookings in date range
      query(
        `SELECT COUNT(*) as count FROM "Booking"
         WHERE tenant_id = $1
         AND created_at >= $2::date
         AND created_at <= ($3::date + INTERVAL '1 day')`,
        [tenantId, start, end]
      ),

      // Bookings in comparison period
      query(
        `SELECT COUNT(*) as count FROM "Booking"
         WHERE tenant_id = $1
         AND created_at >= $2::date
         AND created_at <= ($3::date + INTERVAL '1 day')`,
        [tenantId, compStart, compEnd]
      ),

      // Pending bookings
      query(
        `SELECT COUNT(*) as count FROM "Booking"
         WHERE tenant_id = $1 AND status IN ('PENDING', 'CONFIRMED')`,
        [tenantId]
      ),

      // Today's arrivals (check_in date is today)
      query(
        `SELECT COUNT(*) as count FROM "Booking"
         WHERE tenant_id = $1 AND status IN ('PENDING', 'CONFIRMED')
         AND DATE(check_in) = CURRENT_DATE`,
        [tenantId]
      ),

      // Today's departures (check_out date is today)
      query(
        `SELECT COUNT(*) as count FROM "Booking"
         WHERE tenant_id = $1 AND status = 'CHECKED_IN'
         AND DATE(check_out) = CURRENT_DATE`,
        [tenantId]
      ),

      // Total capacity (kennels) - Kennel table uses max_occupancy column
      query(
        `SELECT COALESCE(SUM(max_occupancy), 0) as capacity, COUNT(*) as count FROM "Kennel"
         WHERE tenant_id = $1 AND is_active = true`,
        [tenantId]
      ),

      // Pending tasks
      query(
        `SELECT COUNT(*) as count FROM "Task"
         WHERE tenant_id = $1 AND status = 'PENDING'`,
        [tenantId]
      ),

      // Total customers (owners) created in date range
      query(
        `SELECT COUNT(*) as count FROM "Owner"
         WHERE tenant_id = $1
         AND created_at >= $2::date
         AND created_at <= ($3::date + INTERVAL '1 day')`,
        [tenantId, start, end]
      ),

      // Total customers overall
      query(
        `SELECT COUNT(*) as count FROM "Owner" WHERE tenant_id = $1`,
        [tenantId]
      ),

      // Customers in comparison period
      query(
        `SELECT COUNT(*) as count FROM "Owner"
         WHERE tenant_id = $1
         AND created_at >= $2::date
         AND created_at <= ($3::date + INTERVAL '1 day')`,
        [tenantId, compStart, compEnd]
      ),

      // Total pets
      query(
        `SELECT COUNT(*) as count FROM "Pet" WHERE tenant_id = $1`,
        [tenantId]
      ),

      // Total revenue in date range (from successful payments)
      query(
        `SELECT COALESCE(SUM(amount_cents), 0) as total FROM "Payment"
         WHERE tenant_id = $1
         AND status IN ('SUCCEEDED', 'CAPTURED')
         AND processed_at >= $2::date
         AND processed_at <= ($3::date + INTERVAL '1 day')`,
        [tenantId, start, end]
      ),

      // Revenue in comparison period
      query(
        `SELECT COALESCE(SUM(amount_cents), 0) as total FROM "Payment"
         WHERE tenant_id = $1
         AND status IN ('SUCCEEDED', 'CAPTURED')
         AND processed_at >= $2::date
         AND processed_at <= ($3::date + INTERVAL '1 day')`,
        [tenantId, compStart, compEnd]
      ),

      // No-shows in date range
      query(
        `SELECT COUNT(*) as count FROM "Booking"
         WHERE tenant_id = $1
         AND status = 'NO_SHOW'
         AND check_in >= $2::date
         AND check_in <= ($3::date + INTERVAL '1 day')`,
        [tenantId, start, end]
      ),
    ]);

    const activeBookings = parseInt(activeBookingsResult.rows[0]?.count || 0);
    const totalCapacity = parseInt(capacityResult.rows[0]?.capacity || 0);
    const kennelCount = parseInt(capacityResult.rows[0]?.count || 0);
    const capacity = totalCapacity > 0 ? totalCapacity : kennelCount;
    const occupancyRate = capacity > 0 ? Math.round((activeBookings / capacity) * 100) : 0;

    // Current period metrics
    const totalBookings = parseInt(totalBookingsResult.rows[0]?.count || 0);
    const pendingBookings = parseInt(pendingBookingsResult.rows[0]?.count || 0);
    const newCustomers = parseInt(customersResult.rows[0]?.count || 0);
    const totalCustomersOverall = parseInt(totalCustomersResult.rows[0]?.count || 0);
    const totalRevenue = parseInt(revenueResult.rows[0]?.total || 0);
    const noShows = parseInt(noShowsResult.rows[0]?.count || 0);

    // Comparison period metrics
    const compareBookings = parseInt(compareBookingsResult.rows[0]?.count || 0);
    const compareCustomers = parseInt(compareCustomersResult.rows[0]?.count || 0);
    const compareRevenue = parseInt(compareRevenueResult.rows[0]?.total || 0);

    // Calculate percentage changes
    const revenueChange = compareRevenue > 0
      ? Math.round(((totalRevenue - compareRevenue) / compareRevenue) * 100)
      : (totalRevenue > 0 ? 100 : 0);

    const bookingsChange = compareBookings > 0
      ? Math.round(((totalBookings - compareBookings) / compareBookings) * 100)
      : (totalBookings > 0 ? 100 : 0);

    const customersChange = compareCustomers > 0
      ? Math.round(((newCustomers - compareCustomers) / compareCustomers) * 100)
      : (newCustomers > 0 ? 100 : 0);

    console.log('[Dashboard][diag] active:', activeBookings, 'capacity:', capacity, 'revenue:', totalRevenue, 'bookings:', totalBookings, 'revenueChange:', revenueChange);

    return createResponse(200, {
      data: {
        // Revenue metrics
        totalRevenue: totalRevenue,
        revenue: totalRevenue,
        revenueChange: revenueChange,
        compareRevenue: compareRevenue,

        // Booking metrics
        totalBookings: totalBookings,
        bookings: totalBookings,
        bookingsChange: bookingsChange,
        compareBookings: compareBookings,
        pendingBookings: pendingBookings,
        activeBookings: activeBookings,

        // Customer metrics
        totalCustomers: totalCustomersOverall,
        customers: totalCustomersOverall,
        newCustomers: newCustomers,
        customerChange: customersChange,
        compareCustomers: compareCustomers,

        // Capacity metrics
        capacityUtilization: occupancyRate,
        capacity: capacity,

        // Other metrics
        noShows: noShows,
        totalPets: parseInt(petsResult.rows[0]?.count || 0),
        todayArrivals: parseInt(arrivalsResult.rows[0]?.count || 0),
        todayDepartures: parseInt(departuresResult.rows[0]?.count || 0),
        pendingTasks: parseInt(pendingTasksResult.rows[0]?.count || 0),

        // Date range info
        dateRange: { startDate: start, endDate: end },
        comparisonRange: { startDate: compStart, endDate: compEnd },

        // Legacy occupancy object for backwards compatibility
        occupancy: {
          current: activeBookings,
          capacity: capacity,
          rate: occupancyRate,
        },
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

    // Get total kennel capacity - Kennel table uses max_occupancy column
    const capacityResult = await query(
      `SELECT
         COUNT(*) as kennel_count,
         COALESCE(SUM(max_occupancy), COUNT(*)) as total_capacity
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
       JOIN "Service" s ON b.service_id = s.record_id
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
      `SELECT s.name, COUNT(b.record_id) as bookings
       FROM "Service" s
       LEFT JOIN "Booking" b ON b.service_id = s.record_id
       WHERE s.tenant_id = $1
       GROUP BY s.record_id, s.name
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
// CUSTOM REPORT BUILDER HANDLERS
// =============================================================================

/**
 * Data source configurations for custom reports
 * Defines available fields, dimensions, and measures for each data source
 */
const DATA_SOURCE_CONFIG = {
  owners: {
    table: '"Owner"',
    idField: 'record_id',
    dimensions: {
      status: { column: 'status', label: 'Status' },
      source: { column: 'source', label: 'Lead Source' },
      created_month: { column: "TO_CHAR(created_at, 'YYYY-MM')", label: 'Signup Month' },
      created_date: { column: 'DATE(created_at)', label: 'Signup Date' },
    },
    measures: {
      count: { column: 'record_id', agg: 'COUNT', label: 'Count' },
    },
    dateField: 'created_at',
  },
  pets: {
    table: '"Pet"',
    idField: 'record_id',
    dimensions: {
      species: { column: 'species', label: 'Species' },
      breed: { column: 'breed', label: 'Breed' },
      size: { column: 'size', label: 'Size' },
      gender: { column: 'gender', label: 'Gender' },
      age_range: {
        column: `CASE
          WHEN date_of_birth IS NULL THEN 'Unknown'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 1 THEN 'Puppy/Kitten (<1)'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 3 THEN 'Young (1-3)'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 7 THEN 'Adult (3-7)'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 10 THEN 'Mature (7-10)'
          ELSE 'Senior (10+)'
        END`,
        label: 'Age Range'
      },
      fixed: { column: "CASE WHEN is_spayed_neutered THEN 'Fixed' ELSE 'Not Fixed' END", label: 'Fixed Status' },
    },
    measures: {
      count: { column: 'record_id', agg: 'COUNT', label: 'Count' },
    },
    dateField: 'created_at',
  },
  bookings: {
    table: '"Booking"',
    idField: 'record_id',
    dimensions: {
      status: { column: 'status', label: 'Status' },
      service_type: { column: 's.name', label: 'Service Type', join: 'LEFT JOIN "Service" s ON s.record_id = t.service_id AND s.tenant_id = t.tenant_id' },
      booking_date: { column: 'DATE(t.start_date)', label: 'Booking Date' },
      booking_month: { column: "TO_CHAR(t.start_date, 'YYYY-MM')", label: 'Booking Month' },
      booking_dow: { column: "TO_CHAR(t.start_date, 'Day')", label: 'Day of Week' },
      created_date: { column: 'DATE(t.created_at)', label: 'Created Date' },
    },
    measures: {
      count: { column: 'record_id', agg: 'COUNT', label: 'Count' },
      revenue: { column: 'COALESCE(total_cents, 0)', agg: 'SUM', label: 'Revenue (cents)' },
      avg_revenue: { column: 'COALESCE(total_cents, 0)', agg: 'AVG', label: 'Avg Revenue (cents)' },
    },
    dateField: 'start_date',
  },
  services: {
    table: '"Service"',
    idField: 'record_id',
    dimensions: {
      name: { column: 'name', label: 'Service Name' },
      category: { column: 'category', label: 'Category' },
      is_active: { column: "CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END", label: 'Status' },
    },
    measures: {
      count: { column: 'record_id', agg: 'COUNT', label: 'Count' },
      avg_price: { column: 'COALESCE(base_price_cents, 0)', agg: 'AVG', label: 'Avg Price (cents)' },
      total_bookings: {
        column: '(SELECT COUNT(*) FROM "Booking" b WHERE b.service_id = t.record_id AND b.tenant_id = t.tenant_id)',
        agg: 'SUM',
        label: 'Total Bookings'
      },
    },
    dateField: 'created_at',
  },
  payments: {
    table: '"Payment"',
    idField: 'record_id',
    dimensions: {
      status: { column: 'status', label: 'Status' },
      payment_method: { column: 'payment_method', label: 'Payment Method' },
      payment_date: { column: 'DATE(t.processed_at)', label: 'Payment Date' },
      payment_month: { column: "TO_CHAR(t.processed_at, 'YYYY-MM')", label: 'Payment Month' },
    },
    measures: {
      count: { column: 'record_id', agg: 'COUNT', label: 'Count' },
      total: { column: 'COALESCE(amount_cents, 0)', agg: 'SUM', label: 'Total (cents)' },
      avg_amount: { column: 'COALESCE(amount_cents, 0)', agg: 'AVG', label: 'Avg Amount (cents)' },
    },
    dateField: 'processed_at',
  },
  staff: {
    table: '"Staff"',
    idField: 'record_id',
    dimensions: {
      role: { column: 'role', label: 'Role' },
      status: { column: 'status', label: 'Status' },
      hire_month: { column: "TO_CHAR(hire_date, 'YYYY-MM')", label: 'Hire Month' },
    },
    measures: {
      count: { column: 'record_id', agg: 'COUNT', label: 'Count' },
    },
    dateField: 'hire_date',
  },
};

/**
 * Handle custom report query
 * Accepts a report definition and returns aggregated data
 */
async function handleCustomReportQuery(tenantId, body) {
  try {
    await getPoolAsync();

    const { dataSource, dimensions = [], measures = [], filters = [], dateRange = {} } = body;

    // Validate data source
    const config = DATA_SOURCE_CONFIG[dataSource];
    if (!config) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Invalid data source: ${dataSource}. Valid options: ${Object.keys(DATA_SOURCE_CONFIG).join(', ')}`,
      });
    }

    // Build the query
    const selectParts = [];
    const groupByParts = [];
    const joins = new Set();
    const params = [tenantId];
    let paramIndex = 2;

    // Add dimensions (group by columns)
    // Accept any valid column name - only reject SQL injection patterns
    const DANGEROUS_PATTERNS = /[;'"\\(){}[\]<>|&$`!]/;

    for (const dimKey of dimensions) {
      // Check for SQL injection patterns
      if (DANGEROUS_PATTERNS.test(dimKey)) {
        return createResponse(400, {
          error: 'Bad Request',
          message: `Invalid dimension name: ${dimKey}`,
        });
      }

      // Use hardcoded config if available (for computed columns), otherwise use column directly
      const dim = config.dimensions[dimKey];
      if (dim) {
        selectParts.push(`${dim.column} as "${dimKey}"`);
        groupByParts.push(dim.column);
        if (dim.join) joins.add(dim.join);
      } else {
        // Dynamic column from SystemProperty - use column name directly
        selectParts.push(`t.${dimKey} as "${dimKey}"`);
        groupByParts.push(`t.${dimKey}`);
      }
    }

    // Add measures (aggregated columns)
    for (const measureDef of measures) {
      const measureKey = typeof measureDef === 'string' ? measureDef : measureDef.field;
      const aggOverride = typeof measureDef === 'object' ? measureDef.aggregation : null;

      // Check for SQL injection patterns
      if (DANGEROUS_PATTERNS.test(measureKey)) {
        return createResponse(400, {
          error: 'Bad Request',
          message: `Invalid measure name: ${measureKey}`,
        });
      }

      // Use hardcoded config if available, otherwise use column directly with COUNT
      const measure = config.measures[measureKey];
      if (measure) {
        const agg = aggOverride || measure.agg;
        selectParts.push(`${agg}(${measure.column}) as "${measureKey}"`);
      } else {
        // Dynamic measure - default to COUNT for record_count, otherwise SUM
        const agg = aggOverride || (measureKey === 'record_count' ? 'COUNT' : 'SUM');
        const column = measureKey === 'record_count' ? `t.${config.idField}` : `t.${measureKey}`;
        selectParts.push(`${agg}(${column}) as "${measureKey}"`);
      }
    }

    // If no dimensions or measures, just count
    if (selectParts.length === 0) {
      selectParts.push(`COUNT(t.${config.idField}) as "count"`);
    }

    // Build WHERE clause
    const whereParts = ['t.tenant_id = $1'];

    // Date range filter
    if (dateRange.startDate && config.dateField) {
      whereParts.push(`t.${config.dateField} >= $${paramIndex}`);
      params.push(dateRange.startDate);
      paramIndex++;
    }
    if (dateRange.endDate && config.dateField) {
      whereParts.push(`t.${config.dateField} <= $${paramIndex}`);
      params.push(dateRange.endDate + ' 23:59:59');
      paramIndex++;
    }

    // Custom filters
    for (const filter of filters) {
      // Skip filters with dangerous patterns
      if (DANGEROUS_PATTERNS.test(filter.field)) continue;

      // Use hardcoded config if available, otherwise use column directly
      const dim = config.dimensions[filter.field] || config.measures[filter.field];
      const column = dim ? dim.column : `t.${filter.field}`;
      const operator = filter.operator || '=';
      const value = filter.value;

      switch (operator) {
        case '=':
        case '!=':
        case '>':
        case '<':
        case '>=':
        case '<=':
          whereParts.push(`${column} ${operator} $${paramIndex}`);
          params.push(value);
          paramIndex++;
          break;
        case 'contains':
          whereParts.push(`${column} ILIKE $${paramIndex}`);
          params.push(`%${value}%`);
          paramIndex++;
          break;
        case 'in':
          if (Array.isArray(value)) {
            const placeholders = value.map((_, i) => `$${paramIndex + i}`).join(', ');
            whereParts.push(`${column} IN (${placeholders})`);
            params.push(...value);
            paramIndex += value.length;
          }
          break;
        case 'is_null':
          whereParts.push(`${column} IS NULL`);
          break;
        case 'is_not_null':
          whereParts.push(`${column} IS NOT NULL`);
          break;
      }
    }

    // Build final query
    const joinClause = joins.size > 0 ? Array.from(joins).join(' ') : '';
    const whereClause = whereParts.join(' AND ');
    const groupByClause = groupByParts.length > 0 ? `GROUP BY ${groupByParts.join(', ')}` : '';
    const orderByClause = groupByParts.length > 0 ? `ORDER BY ${groupByParts[0]}` : '';

    const sql = `
      SELECT ${selectParts.join(', ')}
      FROM ${config.table} t
      ${joinClause}
      WHERE ${whereClause}
      ${groupByClause}
      ${orderByClause}
      LIMIT 1000
    `;

    console.log('[ANALYTICS-SERVICE] Custom report query:', { sql: sql.substring(0, 200), params: params.slice(0, 3) });

    const result = await query(sql, params);

    // Transform data for chart consumption
    const chartData = result.rows.map(row => {
      const transformed = {};
      for (const key of Object.keys(row)) {
        let value = row[key];
        // Convert BigInt to number, handle cents to dollars for revenue
        if (typeof value === 'bigint') {
          value = Number(value);
        }
        if (typeof value === 'string' && !isNaN(value)) {
          value = parseFloat(value);
        }
        transformed[key] = value;
      }
      return transformed;
    });

    return createResponse(200, {
      data: chartData,
      meta: {
        dataSource,
        dimensions,
        measures,
        rowCount: chartData.length,
        query: { filters, dateRange },
      },
      message: 'Report data retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Custom report query failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to execute report query: ' + error.message,
    });
  }
}

// Map data source names to entity_type values in SystemProperty/Property tables
const DATA_SOURCE_TO_ENTITY = {
  owners: 'owner',
  pets: 'pet',
  bookings: 'booking',
  services: 'service',
  payments: 'payment',
  staff: 'staff',
  invoices: 'invoice',
};

// Computed date fields - these are SQL transformations, not real columns
const COMPUTED_DATE_FIELDS = [
  { key: 'day_of_week', label: 'Day of Week', compute: "TO_CHAR({column}, 'Day')" },
  { key: 'month', label: 'Month', compute: "TO_CHAR({column}, 'Mon YYYY')" },
  { key: 'quarter', label: 'Quarter', compute: "'Q' || EXTRACT(QUARTER FROM {column}) || ' ' || EXTRACT(YEAR FROM {column})" },
  { key: 'year', label: 'Year', compute: 'EXTRACT(YEAR FROM {column})' },
];

// Field types that should be measures (aggregatable)
const MEASURE_FIELD_TYPES = ['number', 'currency'];

/**
 * Get report field definitions
 * Dynamically reads from SystemProperty + Property tables
 */
async function handleGetReportFields(tenantId, queryParams) {
  try {
    await getPoolAsync();
    const { dataSource } = queryParams;

    console.log('[REPORT-FIELDS] Request:', { dataSource, tenantId });

    const result = {};
    const sources = dataSource ? [dataSource] : Object.keys(DATA_SOURCE_TO_ENTITY);

    for (const source of sources) {
      const entityType = DATA_SOURCE_TO_ENTITY[source];
      if (!entityType) continue;

      console.log('[REPORT-FIELDS] Processing source:', source, '-> entityType:', entityType);

      result[source] = { dimensions: [], measures: [] };

      // 1. Get system properties for this entity type
      const systemProps = await query(
        `SELECT name, label, field_type, property_group, sort_order, options
         FROM "SystemProperty"
         WHERE entity_type = $1
         ORDER BY sort_order, label`,
        [entityType]
      );

      console.log('[REPORT-FIELDS] SystemProperty query returned:', systemProps.rows?.length, 'rows for', entityType);

      // 2. Get custom tenant properties for this entity type
      let customProps = { rows: [] };
      if (tenantId) {
        try {
          customProps = await query(
            `SELECT name, label, field_type, property_group, sort_order, options
             FROM "Property"
             WHERE tenant_id = $1 AND entity_type = $2 AND is_active = true
             ORDER BY sort_order, label`,
            [tenantId, entityType]
          );
        } catch {
          // Property table might not exist
        }
      }

      // Combine all properties
      const allProps = [...systemProps.rows, ...customProps.rows];

      for (const prop of allProps) {
        const field = {
          key: prop.name,
          label: prop.label,
          dataType: prop.field_type,
          group: prop.property_group || 'Properties',
          options: prop.options, // For enum/select fields
        };

        if (MEASURE_FIELD_TYPES.includes(prop.field_type)) {
          // Measures - aggregatable fields
          field.defaultAggregation = prop.field_type === 'currency' ? 'SUM' : 'AVG';
          result[source].measures.push(field);
        } else {
          // Dimensions - group by fields
          result[source].dimensions.push(field);

          // Add computed date fields for date/datetime columns
          if (prop.field_type === 'date' || prop.field_type === 'datetime') {
            for (const computed of COMPUTED_DATE_FIELDS) {
              result[source].dimensions.push({
                key: `${prop.name}_${computed.key}`,
                label: `${prop.label} (${computed.label})`,
                dataType: 'string',
                group: 'Date Properties',
                isComputed: true,
                sourceColumn: prop.name,
                computeExpression: computed.compute.replace('{column}', prop.name),
              });
            }
          }
        }
      }

      // 3. Add standard count measure
      result[source].measures.unshift({
        key: 'count',
        label: 'Record Count',
        dataType: 'number',
        group: 'Metrics',
        defaultAggregation: 'COUNT',
      });

      console.log('[REPORT-FIELDS] Final counts for', source, ':', {
        dimensions: result[source].dimensions.length,
        measures: result[source].measures.length,
      });
    }

    console.log('[REPORT-FIELDS] Returning result for sources:', Object.keys(result));

    return createResponse(200, {
      data: result,
      message: 'Report fields retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Get report fields failed:', error.message);

    // Fallback to DATA_SOURCE_CONFIG if properties system fails
    const { dataSource } = queryParams;
    const result = {};
    const sources = dataSource ? [dataSource] : Object.keys(DATA_SOURCE_CONFIG);

    for (const source of sources) {
      const config = DATA_SOURCE_CONFIG[source];
      if (!config) continue;

      result[source] = {
        dimensions: Object.entries(config.dimensions).map(([key, dim]) => ({
          key,
          label: dim.label,
          dataType: 'string',
          group: 'Properties',
        })),
        measures: Object.entries(config.measures).map(([key, measure]) => ({
          key,
          label: measure.label,
          dataType: 'number',
          group: 'Metrics',
          defaultAggregation: measure.agg,
        })),
      };
    }

    return createResponse(200, {
      data: result,
      message: 'Report fields retrieved (fallback to config)',
    });
  }
}

/**
 * Get saved reports for user
 */
async function handleGetSavedReports(tenantId, userId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         record_id,
         name,
         description,
         data_source,
         chart_type,
         config,
         visibility,
         is_favorite,
         folder_id,
         last_run_at,
         run_count,
         created_by,
         created_at,
         updated_at
       FROM "ReportDefinition"
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND (visibility = 'public' OR created_by = $2)
       ORDER BY updated_at DESC`,
      [tenantId, userId]
    );

    const reports = result.rows.map(row => ({
      id: row.record_id,
      recordId: row.record_id,
      name: row.name,
      description: row.description,
      dataSource: row.data_source,
      chartType: row.chart_type,
      config: row.config || {},
      visibility: row.visibility,
      isFavorite: row.is_favorite,
      folderId: row.folder_id,
      lastRunAt: row.last_run_at,
      runCount: row.run_count || 0,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, {
      data: reports,
      total: reports.length,
      message: 'Saved reports retrieved',
    });

  } catch (error) {
    // If table doesn't exist, return empty array
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('[ANALYTICS-SERVICE] ReportDefinition table not found, returning empty');
      return createResponse(200, {
        data: [],
        total: 0,
        message: 'Saved reports retrieved (table pending migration)',
      });
    }
    console.error('[ANALYTICS-SERVICE] Get saved reports failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to get saved reports',
    });
  }
}

/**
 * Save a report definition
 */
async function handleSaveReport(tenantId, userId, body) {
  try {
    await getPoolAsync();

    const { name, description, dataSource, chartType, config, visibility = 'private' } = body;

    if (!name || !dataSource || !chartType) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Missing required fields: name, dataSource, chartType',
      });
    }

    const result = await query(
      `INSERT INTO "ReportDefinition" (
         tenant_id, name, description, data_source, chart_type, config, visibility, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING record_id, name, description, data_source, chart_type, config, visibility, is_favorite, created_at, updated_at`,
      [tenantId, name, description || '', dataSource, chartType, JSON.stringify(config || {}), visibility, userId]
    );

    const row = result.rows[0];
    return createResponse(201, {
      data: {
        id: row.record_id,
        recordId: row.record_id,
        name: row.name,
        description: row.description,
        dataSource: row.data_source,
        chartType: row.chart_type,
        config: row.config,
        visibility: row.visibility,
        isFavorite: row.is_favorite,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      message: 'Report saved successfully',
    });

  } catch (error) {
    // If table doesn't exist, fall back to mock response
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('[ANALYTICS-SERVICE] ReportDefinition table not found, returning mock');
      return createResponse(200, {
        data: {
          id: 'local-' + Date.now(),
          ...body,
          savedAt: new Date().toISOString(),
        },
        message: 'Report saved (table pending migration)',
      });
    }
    console.error('[ANALYTICS-SERVICE] Save report failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to save report: ' + error.message,
    });
  }
}

/**
 * Get a single saved report by ID
 */
async function handleGetSavedReportById(tenantId, reportId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         record_id, name, description, data_source, chart_type, config,
         visibility, is_favorite, folder_id, last_run_at, run_count,
         created_by, created_at, updated_at
       FROM "ReportDefinition"
       WHERE tenant_id = $1 AND record_id = $2 AND deleted_at IS NULL`,
      [tenantId, reportId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Report not found',
      });
    }

    const row = result.rows[0];
    return createResponse(200, {
      data: {
        id: row.record_id,
        recordId: row.record_id,
        name: row.name,
        description: row.description,
        dataSource: row.data_source,
        chartType: row.chart_type,
        config: row.config || {},
        visibility: row.visibility,
        isFavorite: row.is_favorite,
        folderId: row.folder_id,
        lastRunAt: row.last_run_at,
        runCount: row.run_count || 0,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      message: 'Report retrieved successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Get saved report failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to get report',
    });
  }
}

/**
 * Update a saved report
 */
async function handleUpdateSavedReport(tenantId, userId, reportId, body) {
  try {
    await getPoolAsync();

    const { name, description, dataSource, chartType, config, visibility, isFavorite } = body;

    // Build dynamic update query
    const updates = [];
    const params = [tenantId, reportId];
    let paramIndex = 3;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (dataSource !== undefined) {
      updates.push(`data_source = $${paramIndex++}`);
      params.push(dataSource);
    }
    if (chartType !== undefined) {
      updates.push(`chart_type = $${paramIndex++}`);
      params.push(chartType);
    }
    if (config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      params.push(JSON.stringify(config));
    }
    if (visibility !== undefined) {
      updates.push(`visibility = $${paramIndex++}`);
      params.push(visibility);
    }
    if (isFavorite !== undefined) {
      updates.push(`is_favorite = $${paramIndex++}`);
      params.push(isFavorite);
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(userId);
    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "ReportDefinition"
       SET ${updates.join(', ')}
       WHERE tenant_id = $1 AND record_id = $2 AND deleted_at IS NULL
       RETURNING record_id, name, description, data_source, chart_type, config, visibility, is_favorite, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Report not found',
      });
    }

    const row = result.rows[0];
    return createResponse(200, {
      data: {
        id: row.record_id,
        recordId: row.record_id,
        name: row.name,
        description: row.description,
        dataSource: row.data_source,
        chartType: row.chart_type,
        config: row.config,
        visibility: row.visibility,
        isFavorite: row.is_favorite,
        updatedAt: row.updated_at,
      },
      message: 'Report updated successfully',
    });

  } catch (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return createResponse(200, {
        data: { id: reportId, ...body, updatedAt: new Date().toISOString() },
        message: 'Report updated (table pending migration)',
      });
    }
    console.error('[ANALYTICS-SERVICE] Update saved report failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update report',
    });
  }
}

/**
 * Delete a saved report (soft delete)
 */
async function handleDeleteSavedReport(tenantId, userId, reportId) {
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "ReportDefinition"
       SET deleted_at = NOW(), updated_by = $3
       WHERE tenant_id = $1 AND record_id = $2 AND deleted_at IS NULL
       RETURNING record_id`,
      [tenantId, reportId, userId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Report not found',
      });
    }

    return createResponse(200, {
      data: { id: reportId },
      message: 'Report deleted successfully',
    });

  } catch (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return createResponse(200, {
        data: { id: reportId },
        message: 'Report deleted (table pending migration)',
      });
    }
    console.error('[ANALYTICS-SERVICE] Delete saved report failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete report',
    });
  }
}

/**
 * Duplicate a saved report
 */
async function handleDuplicateSavedReport(tenantId, userId, reportId) {
  try {
    await getPoolAsync();

    // First get the original report
    const original = await query(
      `SELECT name, description, data_source, chart_type, config, visibility
       FROM "ReportDefinition"
       WHERE tenant_id = $1 AND record_id = $2 AND deleted_at IS NULL`,
      [tenantId, reportId]
    );

    if (original.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Report not found',
      });
    }

    const orig = original.rows[0];
    const newName = `${orig.name} (Copy)`;

    // Create the duplicate
    const result = await query(
      `INSERT INTO "ReportDefinition" (
         tenant_id, name, description, data_source, chart_type, config, visibility, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, 'private', $7, $7)
       RETURNING record_id, name, description, data_source, chart_type, config, visibility, created_at`,
      [tenantId, newName, orig.description, orig.data_source, orig.chart_type, JSON.stringify(orig.config || {}), userId]
    );

    const row = result.rows[0];
    return createResponse(201, {
      data: {
        id: row.record_id,
        recordId: row.record_id,
        name: row.name,
        description: row.description,
        dataSource: row.data_source,
        chartType: row.chart_type,
        config: row.config,
        visibility: row.visibility,
        createdAt: row.created_at,
      },
      message: 'Report duplicated successfully',
    });

  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Duplicate report failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to duplicate report',
    });
  }
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
         b.record_id as booking_id,
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
       LEFT JOIN "Owner" o ON o.tenant_id = b.tenant_id AND o.record_id = b.owner_id
       LEFT JOIN "Pet" p ON p.tenant_id = b.tenant_id AND p.record_id = ANY(b.pet_ids)
       LEFT JOIN "Kennel" k ON k.tenant_id = b.tenant_id AND k.record_id = b.kennel_id
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
         o.record_id as owner_id,
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
         COUNT(DISTINCT b.record_id) as total_bookings,
         COALESCE(SUM(b.total_price_cents), 0) as lifetime_value_cents,
         MAX(b.created_at) as last_booking_date,
         COUNT(DISTINCT p.record_id) as pet_count
       FROM "Owner" o
       LEFT JOIN "Booking" b ON b.tenant_id = o.tenant_id AND b.owner_id = o.record_id AND b.status IN ('CHECKED_IN', 'COMPLETED')
       LEFT JOIN "PetOwner" po ON po.tenant_id = o.tenant_id AND po.owner_id = o.record_id
       LEFT JOIN "Pet" p ON p.tenant_id = po.tenant_id AND p.record_id = po.pet_id
       WHERE o.tenant_id = $1
       GROUP BY o.record_id, o.first_name, o.last_name, o.email, o.phone, o.address, o.city, o.state, o.zip_code, o.emergency_contact_name, o.emergency_contact_phone, o.created_at
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
      `SELECT COALESCE(SUM(max_occupancy), 0) as total_capacity FROM "Kennel" WHERE tenant_id = $1`,
      [tenantId]
    );
    const totalCapacity = parseInt(capacityResult.rows[0]?.total_capacity || 0);
    
    // Get daily occupancy for the date range
    const result = await query(
      `SELECT
         d::date as date,
         COUNT(DISTINCT b.record_id) as bookings,
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
         p.record_id as pet_id,
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
         COUNT(DISTINCT b.record_id) as booking_count,
         MAX(b.created_at) as last_visit
       FROM "Pet" p
       LEFT JOIN "PetOwner" po ON po.tenant_id = p.tenant_id AND po.pet_id = p.record_id
       LEFT JOIN "Owner" o ON o.tenant_id = po.tenant_id AND o.record_id = po.owner_id
       LEFT JOIN "Veterinarian" v ON v.tenant_id = p.tenant_id AND v.record_id = p.vet_id
       LEFT JOIN "Booking" b ON b.tenant_id = p.tenant_id AND p.record_id = ANY(b.pet_ids)
       WHERE p.tenant_id = $1
       GROUP BY p.record_id, p.name, p.breed, p.species, p.weight, p.birth_date, p.gender, p.color, p.microchip_number, p.special_needs, p.dietary_requirements, p.created_at, o.first_name, o.last_name, o.email, o.phone, v.name, v.phone, v.clinic_name
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
         v.record_id as vaccination_id,
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
       LEFT JOIN "Pet" p ON p.tenant_id = v.tenant_id AND p.record_id = v.pet_id
       LEFT JOIN "PetOwner" po ON po.tenant_id = p.tenant_id AND po.pet_id = p.record_id
       LEFT JOIN "Owner" o ON o.tenant_id = po.tenant_id AND o.record_id = po.owner_id
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

    // Query segments with member counts and 7-day change calculated on-the-fly from snapshots
    const result = await query(
      `SELECT
         s.record_id,
         s.name,
         s.description,
         s.criteria,
         s.filters,
         s.object_type,
         s.segment_type,
         s.is_automatic,
         s.is_active,
         s.member_count,
         s.percent_of_total,
         s.seven_day_change,
         s.created_at,
         s.updated_at,
         COALESCE(s.member_count, (SELECT COUNT(*) FROM "SegmentMember" sm WHERE sm.segment_id = s.record_id)) as computed_member_count,
         NULL as snapshot_7d_ago
       FROM "Segment" s
       WHERE s.tenant_id = $1
       ORDER BY s.updated_at DESC NULLS LAST, s.name ASC`,
      [tenantId]
    );

    console.log('[Segments][list] query returned:', result.rows.length, 'rows');

    const segments = result.rows.map(row => {
      const currentCount = parseInt(row.computed_member_count || row.member_count || 0);
      // Calculate 7-day change: current count minus snapshot from 7+ days ago
      // If no snapshot exists, change is 0
      const oldCount = row.snapshot_7d_ago !== null ? parseInt(row.snapshot_7d_ago) : currentCount;
      const calculatedChange = currentCount - oldCount;

      return {
        id: row.record_id,
        recordId: row.record_id,
        name: row.name,
        description: row.description,
        criteria: row.criteria || {},
        filters: row.filters || { groups: [], groupLogic: 'OR' },
        object_type: row.object_type || 'owners',
        objectType: row.object_type || 'owners',
        segment_type: row.segment_type || 'active',
        segmentType: row.segment_type || 'active',
        isDynamic: row.is_automatic ?? (row.segment_type === 'active'),
        isActive: row.is_active ?? true,
        isAutomatic: row.is_automatic ?? false,
        _count: {
          members: currentCount,
          campaigns: 0,
        },
        memberCount: currentCount,
        member_count: currentCount,
        percentOfTotal: parseFloat(row.percent_of_total || 0),
        percent_of_total: parseFloat(row.percent_of_total || 0),
        change7d: calculatedChange,
        sevenDayChange: calculatedChange,
        seven_day_change: calculatedChange,
        createdAt: row.created_at,
        created_at: row.created_at,
        updatedAt: row.updated_at,
        updated_at: row.updated_at,
      };
    });

    console.log('[ANALYTICS-SERVICE] Fetched segments:', { tenantId, count: segments.length });

    return createResponse(200, {
      data: segments,
      segments: segments, // Compatibility
      total: segments.length,
      message: 'Segments retrieved successfully',
    });

  } catch (error) {
    // Handle missing SegmentSnapshot table - fall back to stored seven_day_change value
    if (error.message?.includes('SegmentSnapshot') && (error.message?.includes('does not exist') || error.code === '42P01')) {
      console.log('[ANALYTICS-SERVICE] SegmentSnapshot table not found, using stored seven_day_change');
      try {
        const fallbackResult = await query(
          `SELECT
             s.record_id, s.name, s.description, s.criteria, s.filters, s.object_type, s.segment_type,
             s.is_automatic, s.is_active, s.member_count, s.percent_of_total, s.seven_day_change,
             s.created_at, s.updated_at,
             COALESCE(s.member_count, (SELECT COUNT(*) FROM "SegmentMember" sm WHERE sm.segment_id = s.record_id)) as computed_member_count
           FROM "Segment" s WHERE s.tenant_id = $1
           ORDER BY s.updated_at DESC NULLS LAST, s.name ASC`,
          [tenantId]
        );

        const segments = fallbackResult.rows.map(row => {
          const currentCount = parseInt(row.computed_member_count || row.member_count || 0);
          return {
            id: row.record_id, recordId: row.record_id, name: row.name, description: row.description,
            criteria: row.criteria || {}, filters: row.filters || { groups: [], groupLogic: 'OR' },
            object_type: row.object_type || 'owners', objectType: row.object_type || 'owners',
            segment_type: row.segment_type || 'active', segmentType: row.segment_type || 'active',
            isDynamic: row.is_automatic ?? (row.segment_type === 'active'),
            isActive: row.is_active ?? true, isAutomatic: row.is_automatic ?? false,
            _count: { members: currentCount, campaigns: 0 },
            memberCount: currentCount, member_count: currentCount,
            percentOfTotal: parseFloat(row.percent_of_total || 0), percent_of_total: parseFloat(row.percent_of_total || 0),
            change7d: parseInt(row.seven_day_change || 0),
            sevenDayChange: parseInt(row.seven_day_change || 0),
            seven_day_change: parseInt(row.seven_day_change || 0),
            createdAt: row.created_at, created_at: row.created_at,
            updatedAt: row.updated_at, updated_at: row.updated_at,
          };
        });

        return createResponse(200, { data: segments, segments, total: segments.length, message: 'Segments retrieved (no snapshots)' });
      } catch (fallbackErr) {
        console.error('[ANALYTICS-SERVICE] Fallback query also failed:', fallbackErr.message);
      }
    }

    // Handle missing Segment table gracefully - but only for actual table missing errors
    if (error.code === '42P01') {
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

// =============================================================================
// enterprise FILTER TYPE SYSTEM
// =============================================================================

/**
 * Filter Types - defines how each filter should be processed
 */
const FILTER_TYPES = {
  PROPERTY: 'PROPERTY',     // Direct column lookup
  COMPUTED: 'COMPUTED',     // Requires subquery/aggregation
  ASSOCIATION: 'ASSOCIATION', // Filter on related objects
};

/**
 * Field Definition Registries - maps frontend fields to database handling
 */
const FIELD_DEFINITIONS = {
  pets: {
    // Direct column mappings (PROPERTY type)
    name: { type: 'PROPERTY', column: 'name', dataType: 'string' },
    species: { type: 'PROPERTY', column: 'species', dataType: 'enum', options: ['DOG', 'CAT', 'OTHER'] },
    breed: { type: 'PROPERTY', column: 'breed', dataType: 'string' },
    sex: { type: 'PROPERTY', column: 'gender', dataType: 'enum', options: ['MALE', 'FEMALE', 'UNKNOWN'] },
    gender: { type: 'PROPERTY', column: 'gender', dataType: 'enum', options: ['MALE', 'FEMALE', 'UNKNOWN'] },
    birthdate: { type: 'PROPERTY', column: 'date_of_birth', dataType: 'date' },
    dateOfBirth: { type: 'PROPERTY', column: 'date_of_birth', dataType: 'date' },
    weight: { type: 'PROPERTY', column: 'weight', dataType: 'number' },
    status: { type: 'PROPERTY', column: 'status', dataType: 'enum', options: ['ACTIVE', 'INACTIVE', 'DECEASED'] },
    isActive: { type: 'PROPERTY', column: 'is_active', dataType: 'boolean' },
    createdAt: { type: 'PROPERTY', column: 'created_at', dataType: 'date' },

    // Computed fields - require special SQL generation
    vaccinationStatus: { type: 'COMPUTED', dataType: 'enum', options: ['current', 'expiring', 'expired', 'missing'] },
    totalBookings: { type: 'COMPUTED', dataType: 'number' },
    lastBookingDate: { type: 'COMPUTED', dataType: 'date' },
    isFixed: { type: 'COMPUTED', dataType: 'boolean' }, // Not in DB, would need to add or derive
  },

  owners: {
    // Direct column mappings
    firstName: { type: 'PROPERTY', column: 'first_name', dataType: 'string' },
    lastName: { type: 'PROPERTY', column: 'last_name', dataType: 'string' },
    email: { type: 'PROPERTY', column: 'email', dataType: 'string' },
    phone: { type: 'PROPERTY', column: 'phone', dataType: 'string' },
    isActive: { type: 'PROPERTY', column: 'is_active', dataType: 'boolean' },
    createdAt: { type: 'PROPERTY', column: 'created_at', dataType: 'date' },
    tags: { type: 'PROPERTY', column: 'tags', dataType: 'array' },

    // Computed fields
    status: { type: 'COMPUTED', dataType: 'enum', options: ['active', 'inactive', 'blocked'] }, // Maps to is_active
    petCount: { type: 'COMPUTED', dataType: 'number' },
    totalSpend: { type: 'COMPUTED', dataType: 'currency' },
    totalBookings: { type: 'COMPUTED', dataType: 'number' },
    lastBookingDate: { type: 'COMPUTED', dataType: 'date' },
  },

  bookings: {
    // Direct column mappings (with frontend-friendly aliases)
    status: { type: 'PROPERTY', column: 'status', dataType: 'enum', options: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'] },
    startDate: { type: 'PROPERTY', column: 'check_in', dataType: 'date' },
    checkIn: { type: 'PROPERTY', column: 'check_in', dataType: 'date' },
    endDate: { type: 'PROPERTY', column: 'check_out', dataType: 'date' },
    checkOut: { type: 'PROPERTY', column: 'check_out', dataType: 'date' },
    createdAt: { type: 'PROPERTY', column: 'created_at', dataType: 'date' },
    totalPriceCents: { type: 'PROPERTY', column: 'total_price_cents', dataType: 'number' },

    // Computed fields
    totalAmount: { type: 'COMPUTED', dataType: 'currency' }, // Frontend sends dollars
    isPaid: { type: 'COMPUTED', dataType: 'boolean' },
    serviceType: { type: 'COMPUTED', dataType: 'string' },
  },
};

/**
 * Computed Field SQL Builders
 * Each builder returns { sql: string, params: array }
 */
const COMPUTED_FIELD_BUILDERS = {
  // =========================================================================
  // PET COMPUTED FIELDS
  // =========================================================================

  'pets.vaccinationStatus': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;

    // Handle different vaccination status values
    if (value === 'expired') {
      return {
        sql: `EXISTS (
          SELECT 1 FROM "Vaccination" v
          WHERE v.pet_id = ${ta}.id
          AND v.tenant_id = ${ta}.tenant_id
          AND v.expires_at < NOW()
        )`,
        params: [],
      };
    }

    if (value === 'expiring') {
      return {
        sql: `EXISTS (
          SELECT 1 FROM "Vaccination" v
          WHERE v.pet_id = ${ta}.id
          AND v.tenant_id = ${ta}.tenant_id
          AND v.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        )`,
        params: [],
      };
    }

    if (value === 'current') {
      // Current = has vaccinations AND none are expired or expiring
      return {
        sql: `(
          EXISTS (
            SELECT 1 FROM "Vaccination" v
            WHERE v.pet_id = ${ta}.id
            AND v.tenant_id = ${ta}.tenant_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM "Vaccination" v2
            WHERE v2.pet_id = ${ta}.id
            AND v2.tenant_id = ${ta}.tenant_id
            AND v2.expires_at < NOW() + INTERVAL '30 days'
          )
        )`,
        params: [],
      };
    }

    if (value === 'missing') {
      // Missing = no vaccination records at all
      return {
        sql: `NOT EXISTS (
          SELECT 1 FROM "Vaccination" v
          WHERE v.pet_id = ${ta}.id
          AND v.tenant_id = ${ta}.tenant_id
        )`,
        params: [],
      };
    }

    // Default fallback
    return { sql: 'TRUE', params: [] };
  },

  'pets.totalBookings': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    const sqlOp = mapOperatorToSql(operator);
    return {
      sql: `(
        SELECT COUNT(*) FROM "Booking" b
        JOIN "BookingPet" bp ON bp.booking_id = b.record_id
        WHERE bp.pet_id = ${ta}.id
        AND b.tenant_id = ${ta}.tenant_id
      ) ${sqlOp} $${paramIndex}`,
      params: [parseInt(value) || 0],
    };
  },

  'pets.lastBookingDate': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    const sqlOp = mapOperatorToSql(operator);

    if (operator === 'is_empty') {
      return {
        sql: `NOT EXISTS (
          SELECT 1 FROM "Booking" b
          JOIN "BookingPet" bp ON bp.booking_id = b.record_id
          WHERE bp.pet_id = ${ta}.id
          AND b.tenant_id = ${ta}.tenant_id
        )`,
        params: [],
      };
    }

    if (operator === 'is_not_empty') {
      return {
        sql: `EXISTS (
          SELECT 1 FROM "Booking" b
          JOIN "BookingPet" bp ON bp.booking_id = b.record_id
          WHERE bp.pet_id = ${ta}.id
          AND b.tenant_id = ${ta}.tenant_id
        )`,
        params: [],
      };
    }

    if (operator === 'in_last_days') {
      return {
        sql: `(
          SELECT MAX(b.check_in) FROM "Booking" b
          JOIN "BookingPet" bp ON bp.booking_id = b.record_id
          WHERE bp.pet_id = ${ta}.id
          AND b.tenant_id = ${ta}.tenant_id
        ) >= NOW() - INTERVAL '${parseInt(value) || 30} days'`,
        params: [],
      };
    }

    if (operator === 'more_than_days_ago') {
      return {
        sql: `(
          SELECT MAX(b.check_in) FROM "Booking" b
          JOIN "BookingPet" bp ON bp.booking_id = b.record_id
          WHERE bp.pet_id = ${ta}.id
          AND b.tenant_id = ${ta}.tenant_id
        ) < NOW() - INTERVAL '${parseInt(value) || 30} days'`,
        params: [],
      };
    }

    return {
      sql: `(
        SELECT MAX(b.check_in) FROM "Booking" b
        JOIN "BookingPet" bp ON bp.booking_id = b.record_id
        WHERE bp.pet_id = ${ta}.id
        AND b.tenant_id = ${ta}.tenant_id
      ) ${sqlOp} $${paramIndex}`,
      params: [value],
    };
  },

  'pets.isFixed': (operator, value, paramIndex, tableAlias, tenantId) => {
    // isFixed doesn't exist in DB schema - return TRUE to not filter
    console.warn('[FILTER] isFixed field not implemented - field does not exist in Pet table');
    return { sql: 'TRUE', params: [] };
  },

  // =========================================================================
  // OWNER COMPUTED FIELDS
  // =========================================================================

  'owners.status': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    // Map 'active'/'inactive'/'blocked' to is_active boolean
    if (value === 'active') {
      return { sql: `${ta}.is_active = true`, params: [] };
    }
    if (value === 'inactive' || value === 'blocked') {
      return { sql: `${ta}.is_active = false`, params: [] };
    }
    return { sql: 'TRUE', params: [] };
  },

  'owners.petCount': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    const sqlOp = mapOperatorToSql(operator);
    return {
      sql: `(
        SELECT COUNT(*) FROM "PetOwner" po
        JOIN "Pet" p ON po.pet_id = p.record_id
        WHERE po.owner_id = ${ta}.id
        AND po.tenant_id = ${ta}.tenant_id
        AND p.is_active = true
      ) ${sqlOp} $${paramIndex}`,
      params: [parseInt(value) || 0],
    };
  },

  'owners.totalSpend': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    const sqlOp = mapOperatorToSql(operator);
    // Convert dollars to cents for comparison
    const cents = Math.round((parseFloat(value) || 0) * 100);
    return {
      sql: `(
        SELECT COALESCE(SUM(b.total_price_cents), 0)
        FROM "Booking" b
        WHERE b.owner_id = ${ta}.id
        AND b.tenant_id = ${ta}.tenant_id
        AND b.status NOT IN ('CANCELLED', 'NO_SHOW')
      ) ${sqlOp} $${paramIndex}`,
      params: [cents],
    };
  },

  'owners.totalBookings': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    const sqlOp = mapOperatorToSql(operator);
    return {
      sql: `(
        SELECT COUNT(*) FROM "Booking" b
        WHERE b.owner_id = ${ta}.id
        AND b.tenant_id = ${ta}.tenant_id
      ) ${sqlOp} $${paramIndex}`,
      params: [parseInt(value) || 0],
    };
  },

  'owners.lastBookingDate': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    const sqlOp = mapOperatorToSql(operator);

    if (operator === 'is_empty') {
      return {
        sql: `NOT EXISTS (
          SELECT 1 FROM "Booking" b
          WHERE b.owner_id = ${ta}.id
          AND b.tenant_id = ${ta}.tenant_id
        )`,
        params: [],
      };
    }

    if (operator === 'is_not_empty') {
      return {
        sql: `EXISTS (
          SELECT 1 FROM "Booking" b
          WHERE b.owner_id = ${ta}.id
          AND b.tenant_id = ${ta}.tenant_id
        )`,
        params: [],
      };
    }

    if (operator === 'in_last_days') {
      return {
        sql: `(
          SELECT MAX(b.check_in) FROM "Booking" b
          WHERE b.owner_id = ${ta}.id
          AND b.tenant_id = ${ta}.tenant_id
        ) >= NOW() - INTERVAL '${parseInt(value) || 30} days'`,
        params: [],
      };
    }

    if (operator === 'more_than_days_ago') {
      return {
        sql: `(
          SELECT MAX(b.check_in) FROM "Booking" b
          WHERE b.owner_id = ${ta}.id
          AND b.tenant_id = ${ta}.tenant_id
        ) < NOW() - INTERVAL '${parseInt(value) || 30} days'`,
        params: [],
      };
    }

    return {
      sql: `(
        SELECT MAX(b.check_in) FROM "Booking" b
        WHERE b.owner_id = ${ta}.id
        AND b.tenant_id = ${ta}.tenant_id
      ) ${sqlOp} $${paramIndex}`,
      params: [value],
    };
  },

  // =========================================================================
  // BOOKING COMPUTED FIELDS
  // =========================================================================

  'bookings.totalAmount': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    const sqlOp = mapOperatorToSql(operator);
    // Convert dollars to cents for comparison
    const cents = Math.round((parseFloat(value) || 0) * 100);
    return {
      sql: `${ta}.total_price_cents ${sqlOp} $${paramIndex}`,
      params: [cents],
    };
  },

  'bookings.isPaid': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    const isPaid = value === true || value === 'true' || value === 'is_true';

    // Check if deposit_cents >= total_price_cents (simple paid check)
    if (isPaid) {
      return {
        sql: `${ta}.deposit_cents >= ${ta}.total_price_cents`,
        params: [],
      };
    }
    return {
      sql: `${ta}.deposit_cents < ${ta}.total_price_cents`,
      params: [],
    };
  },

  'bookings.serviceType': (operator, value, paramIndex, tableAlias, tenantId) => {
    const ta = tableAlias;
    const sqlOp = operator === 'is_not' ? '!=' : '=';
    return {
      sql: `(
        SELECT s.name FROM "Service" s
        WHERE s.record_id = ${ta}.service_id AND s.tenant_id = ${ta}.tenant_id
      ) ${sqlOp} $${paramIndex}`,
      params: [value],
    };
  },
};

/**
 * Map frontend operators to SQL operators
 */
function mapOperatorToSql(operator) {
  const operatorMap = {
    'is': '=',
    'equals': '=',
    'is_not': '!=',
    'not_equals': '!=',
    'contains': 'ILIKE',
    'not_contains': 'NOT ILIKE',
    'starts_with': 'ILIKE',
    'ends_with': 'ILIKE',
    'greater_than': '>',
    'less_than': '<',
    'greater_or_equal': '>=',
    'less_or_equal': '<=',
    'is_before': '<',
    'is_after': '>',
  };
  return operatorMap[operator] || '=';
}

/**
 * Resolve a field name to its definition, handling aliases
 */
function resolveFieldDefinition(objectType, fieldName) {
  const fields = FIELD_DEFINITIONS[objectType];
  if (!fields) return null;

  // Direct lookup
  if (fields[fieldName]) {
    return fields[fieldName];
  }

  return null;
}

/**
 * Build SQL clause for a single filter using the type system
 */
function buildSingleFilterClause(objectType, filter, paramIndex, tableAlias, tenantId) {
  const { field, operator, value } = filter;

  if (!field || !operator) {
    return { sql: '', params: [], nextParamIndex: paramIndex };
  }

  const fieldDef = resolveFieldDefinition(objectType, field);

  if (!fieldDef) {
    console.warn(`[FILTER] Unknown field: ${field} for object type: ${objectType}`);
    return { sql: '', params: [], nextParamIndex: paramIndex };
  }

  // Handle PROPERTY type - direct column lookup
  if (fieldDef.type === FILTER_TYPES.PROPERTY) {
    const column = `${tableAlias}.${fieldDef.column}`;
    let clause = '';
    let params = [];
    let nextParamIndex = paramIndex;

    switch (operator) {
      case 'is':
      case 'equals':
        clause = `${column} = $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'is_not':
      case 'not_equals':
        clause = `${column} != $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'contains':
        clause = `${column} ILIKE $${nextParamIndex}`;
        params.push(`%${value}%`);
        nextParamIndex++;
        break;
      case 'not_contains':
        clause = `${column} NOT ILIKE $${nextParamIndex}`;
        params.push(`%${value}%`);
        nextParamIndex++;
        break;
      case 'starts_with':
        clause = `${column} ILIKE $${nextParamIndex}`;
        params.push(`${value}%`);
        nextParamIndex++;
        break;
      case 'ends_with':
        clause = `${column} ILIKE $${nextParamIndex}`;
        params.push(`%${value}`);
        nextParamIndex++;
        break;
      case 'is_empty':
        clause = `(${column} IS NULL OR ${column} = '')`;
        break;
      case 'is_not_empty':
        clause = `(${column} IS NOT NULL AND ${column} != '')`;
        break;
      case 'greater_than':
        clause = `${column} > $${nextParamIndex}`;
        params.push(parseFloat(value) || 0);
        nextParamIndex++;
        break;
      case 'less_than':
        clause = `${column} < $${nextParamIndex}`;
        params.push(parseFloat(value) || 0);
        nextParamIndex++;
        break;
      case 'greater_or_equal':
        clause = `${column} >= $${nextParamIndex}`;
        params.push(parseFloat(value) || 0);
        nextParamIndex++;
        break;
      case 'less_or_equal':
        clause = `${column} <= $${nextParamIndex}`;
        params.push(parseFloat(value) || 0);
        nextParamIndex++;
        break;
      case 'is_before':
        clause = `${column} < $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'is_after':
        clause = `${column} > $${nextParamIndex}`;
        params.push(value);
        nextParamIndex++;
        break;
      case 'in_last_days':
        clause = `${column} >= NOW() - INTERVAL '${parseInt(value) || 30} days'`;
        break;
      case 'more_than_days_ago':
        clause = `${column} < NOW() - INTERVAL '${parseInt(value) || 30} days'`;
        break;
      case 'is_any_of':
        if (Array.isArray(value) && value.length > 0) {
          const placeholders = value.map((_, i) => `$${nextParamIndex + i}`).join(', ');
          clause = `${column} IN (${placeholders})`;
          params.push(...value);
          nextParamIndex += value.length;
        }
        break;
      case 'is_none_of':
        if (Array.isArray(value) && value.length > 0) {
          const placeholders = value.map((_, i) => `$${nextParamIndex + i}`).join(', ');
          clause = `${column} NOT IN (${placeholders})`;
          params.push(...value);
          nextParamIndex += value.length;
        }
        break;
      case 'is_true':
        clause = `${column} = true`;
        break;
      case 'is_false':
        clause = `${column} = false`;
        break;
      default:
        console.warn(`[FILTER] Unknown operator: ${operator}`);
        break;
    }

    return { sql: clause, params, nextParamIndex };
  }

  // Handle COMPUTED type - use specialized builder
  if (fieldDef.type === FILTER_TYPES.COMPUTED) {
    const builderKey = `${objectType}.${field}`;
    const builder = COMPUTED_FIELD_BUILDERS[builderKey];

    if (!builder) {
      console.warn(`[FILTER] No builder for computed field: ${builderKey}`);
      return { sql: '', params: [], nextParamIndex: paramIndex };
    }

    const result = builder(operator, value, paramIndex, tableAlias, tenantId);
    return {
      sql: result.sql,
      params: result.params,
      nextParamIndex: paramIndex + result.params.length,
    };
  }

  return { sql: '', params: [], nextParamIndex: paramIndex };
}

// =============================================================================
// END FILTER TYPE SYSTEM
// =============================================================================

/**
 * Build SQL WHERE clause from segment filters
 * Uses the enterprise filter type system for proper handling of
 * direct columns, computed fields, and associations.
 *
 * @param {object} filters - Filters object with groups and groupLogic
 * @param {string} objectType - 'owners', 'pets', or 'bookings'
 * @param {string} tableAlias - Table alias for column references
 * @param {number} startParamIndex - Starting index for query parameters
 * @returns {{ whereClause: string, params: any[], paramIndex: number }}
 */
function buildFilterWhereClause(filters, objectType, tableAlias = 'o', startParamIndex = 1) {
  if (!filters || !filters.groups || filters.groups.length === 0) {
    return { whereClause: '', params: [], paramIndex: startParamIndex };
  }

  // Use the new type system for filter building
  const params = [];
  let paramIndex = startParamIndex;
  const groupClauses = [];

  for (const group of filters.groups) {
    if (!group.filters || group.filters.length === 0) continue;

    const filterClauses = [];
    for (const filter of group.filters) {
      // Use the new type system to build filter clause
      const result = buildSingleFilterClause(
        objectType,
        filter,
        paramIndex,
        tableAlias,
        null // tenantId is handled at query level
      );

      if (result.sql) {
        filterClauses.push(result.sql);
        params.push(...result.params);
        paramIndex = result.nextParamIndex;
      }
    }

    if (filterClauses.length > 0) {
      const groupLogic = group.logic === 'OR' ? ' OR ' : ' AND ';
      groupClauses.push(`(${filterClauses.join(groupLogic)})`);
    }
  }

  if (groupClauses.length === 0) {
    return { whereClause: '', params: [], paramIndex };
  }

  const groupLogic = filters.groupLogic === 'AND' ? ' AND ' : ' OR ';
  const whereClause = groupClauses.join(groupLogic);

  return { whereClause, params, paramIndex };
}

/**
 * Get segment members
 * For ACTIVE segments: executes filter query against the object table
 * For STATIC segments: returns records from SegmentMember table
 */
async function handleGetSegmentMembers(tenantId, segmentId, queryParams) {
  const { limit = 50, offset = 0 } = queryParams;

  try {
    await getPoolAsync();

    // Get segment with filters and type
    const segmentResult = await query(
      `SELECT record_id, filters, segment_type, object_type FROM "Segment" WHERE record_id = $1 AND tenant_id = $2`,
      [segmentId, tenantId]
    );

    if (segmentResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Segment not found',
      });
    }

    const segment = segmentResult.rows[0];
    const segmentType = segment.segment_type || 'active';
    const objectType = segment.object_type || 'owners';
    const filters = segment.filters || { groups: [], groupLogic: 'OR' };

    let members = [];
    let total = 0;

    if (segmentType === 'active' && filters.groups && filters.groups.length > 0) {
      // ACTIVE segment: get members from SegmentMember table (populated by refresh)
      let tableName = '"Owner"';
      let idColumn = 'owner_id';
      let selectFields = 'o.record_id, o.first_name, o.last_name, o.email, o.phone';

      if (objectType === 'pets') {
        tableName = '"Pet"';
        idColumn = 'pet_id';
        selectFields = 'o.record_id, o.name, o.species, o.breed, o.owner_id';
      } else if (objectType === 'bookings') {
        tableName = '"Booking"';
        idColumn = 'booking_id';
        selectFields = 'o.record_id, o.pet_id, o.start_date, o.end_date, o.status';
      }

      // Query from SegmentMember joined with object table
      const result = await query(
        `SELECT ${selectFields}, sm.added_at
         FROM "SegmentMember" sm
         JOIN ${tableName} o ON sm.${idColumn} = o.record_id
         WHERE sm.segment_id = $1
         ORDER BY sm.added_at DESC
         LIMIT $2 OFFSET $3`,
        [segmentId, parseInt(limit), parseInt(offset)]
      );

      const countResult = await query(
        `SELECT COUNT(*) as count FROM "SegmentMember" WHERE segment_id = $1`,
        [segmentId]
      );

      total = parseInt(countResult.rows[0]?.count || 0);

      // Map results based on object type
      if (objectType === 'owners') {
        members = result.rows.map(row => ({
          id: row.record_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          addedAt: row.added_at,
        }));
      } else if (objectType === 'pets') {
        members = result.rows.map(row => ({
          id: row.record_id,
          name: row.name,
          species: row.species,
          breed: row.breed,
          ownerId: row.owner_id,
          addedAt: row.added_at,
        }));
      } else {
        members = result.rows.map(row => ({
          id: row.record_id,
          petId: row.pet_id,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.status,
          addedAt: row.added_at,
        }));
      }
    } else {
      // STATIC segment or no filters: use SegmentMember table
      const result = await query(
        `SELECT
           o.record_id,
           o.first_name,
           o.last_name,
           o.email,
           o.phone,
           sm.added_at
         FROM "SegmentMember" sm
         JOIN "Owner" o ON sm.owner_id = o.record_id
         WHERE sm.segment_id = $1
         ORDER BY o.last_name, o.first_name
         LIMIT $2 OFFSET $3`,
        [segmentId, parseInt(limit), parseInt(offset)]
      );

      const countResult = await query(
        `SELECT COUNT(*) as count FROM "SegmentMember" WHERE segment_id = $1`,
        [segmentId]
      );

      total = parseInt(countResult.rows[0]?.count || 0);
      members = result.rows.map(row => ({
        id: row.record_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        addedAt: row.added_at,
      }));
    }

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
    console.error('[ANALYTICS-SERVICE] Failed to get segment members:', error.message, error.stack);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve segment members',
    });
  }
}

/**
 * Get single segment by ID
 */
async function handleGetSegment(tenantId, segmentId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         s.record_id,
         s.name,
         s.description,
         s.criteria,
         s.filters,
         s.object_type,
         s.segment_type,
         s.is_automatic,
         s.is_active,
         s.member_count,
         s.percent_of_total,
         s.seven_day_change,
         s.created_by,
         s.created_at,
         s.updated_at,
         COALESCE(s.member_count, (SELECT COUNT(*) FROM "SegmentMember" sm WHERE sm.segment_id = s.record_id)) as computed_member_count
       FROM "Segment" s
       WHERE s.record_id = $1 AND s.tenant_id = $2`,
      [segmentId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Segment not found' });
    }

    const row = result.rows[0];
    const segment = {
      id: row.id,
      recordId: row.id,
      name: row.name,
      description: row.description,
      criteria: row.criteria || {},
      filters: row.filters || { groups: [], groupLogic: 'OR' },
      object_type: row.object_type || 'owners',
      objectType: row.object_type || 'owners',
      segment_type: row.segment_type || 'active',
      segmentType: row.segment_type || 'active',
      isDynamic: row.is_automatic ?? (row.segment_type === 'active'),
      isActive: row.is_active ?? true,
      isAutomatic: row.is_automatic ?? false,
      _count: {
        members: parseInt(row.computed_member_count || row.member_count || 0),
        campaigns: 0,
      },
      memberCount: parseInt(row.computed_member_count || row.member_count || 0),
      member_count: parseInt(row.computed_member_count || row.member_count || 0),
      percentOfTotal: parseFloat(row.percent_of_total || 0),
      percent_of_total: parseFloat(row.percent_of_total || 0),
      change7d: parseInt(row.seven_day_change || 0),
      sevenDayChange: parseInt(row.seven_day_change || 0),
      seven_day_change: parseInt(row.seven_day_change || 0),
      createdBy: row.created_by,
      created_by: row.created_by,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
    };

    return createResponse(200, { segment, data: segment });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to get segment:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to retrieve segment' });
  }
}

/**
 * Create new segment
 */
async function handleCreateSegment(tenantId, body, userId = null) {
  const { name, description, object_type = 'owners', segment_type = 'active', filters } = body;

  if (!name?.trim()) {
    return createResponse(400, { error: 'Bad Request', message: 'Segment name is required' });
  }

  try {
    await getPoolAsync();

    // Calculate initial member count and percentage
    let memberCount = 0;
    let percentOfTotal = 0;
    const parsedFilters = filters || { groups: [], groupLogic: 'OR' };

    // Get total count for object type
    let totalTableName = '"Owner"';
    if (object_type === 'pets') totalTableName = '"Pet"';
    else if (object_type === 'bookings') totalTableName = '"Booking"';

    const totalResult = await query(
      `SELECT COUNT(*) as count FROM ${totalTableName} WHERE tenant_id = $1`,
      [tenantId]
    );
    const totalCount = parseInt(totalResult.rows[0]?.count || 0);

    // For active segments with filters, calculate member count
    if (segment_type === 'active' && parsedFilters.groups && parsedFilters.groups.length > 0) {
      const { whereClause, params } = buildFilterWhereClause(parsedFilters, object_type, 'o', 2);
      let countQuery = `SELECT COUNT(*) as count FROM ${totalTableName} o WHERE o.tenant_id = $1`;
      let queryParams = [tenantId];

      if (whereClause) {
        countQuery += ` AND (${whereClause})`;
        queryParams = [tenantId, ...params];
      }

      const countResult = await query(countQuery, queryParams);
      memberCount = parseInt(countResult.rows[0]?.count || 0);
    }

    percentOfTotal = totalCount > 0 ? ((memberCount / totalCount) * 100).toFixed(2) : 0;

    const result = await query(
      `INSERT INTO "Segment" (tenant_id, record_id, name, description, object_type, segment_type, filters, member_count, percent_of_total, seven_day_change, created_by, created_at, updated_at)
       VALUES ($1, next_record_id($1, 70), $2, $3, $4, $5, $6, $7, $8, 0, $9, NOW(), NOW())
       RETURNING record_id`,
      [tenantId, name.trim(), description?.trim() || null, object_type, segment_type, JSON.stringify(parsedFilters), memberCount, percentOfTotal, userId]
    );

    const segmentId = result.rows[0].record_id;

    // Store initial snapshot
    try {
      await query(
        `INSERT INTO "SegmentSnapshot" (id, segment_id, member_count, snapshot_date)
         VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE)
         ON CONFLICT (segment_id, snapshot_date) DO UPDATE SET member_count = $2`,
        [segmentId, memberCount]
      );
    } catch (e) {
      // SegmentSnapshot table might not exist - ignore
    }

    // Log activity with user ID
    await query(
      `INSERT INTO "SegmentActivity" (segment_id, activity_type, description, created_by, created_at)
       VALUES ($1, 'segment_created', 'Segment created', $2, NOW())`,
      [segmentId, userId]
    ).catch(() => {}); // Ignore if table doesn't exist

    return createResponse(201, {
      segment: { id: segmentId, recordId: segmentId, name: name.trim(), memberCount, percentOfTotal: parseFloat(percentOfTotal), sevenDayChange: 0 },
      message: 'Segment created successfully',
    });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to create segment:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to create segment' });
  }
}

/**
 * Update segment
 */
async function handleUpdateSegment(tenantId, segmentId, body, userId = null) {
  const { name, description, object_type, segment_type, filters } = body;

  try {
    await getPoolAsync();

    // Verify segment exists and belongs to tenant
    const checkResult = await query(
      `SELECT record_id, is_automatic FROM "Segment" WHERE record_id = $1 AND tenant_id = $2`,
      [segmentId, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Segment not found' });
    }

    // Don't allow editing auto segments
    if (checkResult.rows[0].is_automatic) {
      return createResponse(403, { error: 'Forbidden', message: 'Cannot edit automatic segments' });
    }

    const updates = [];
    const values = [segmentId];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description?.trim() || null);
    }
    if (object_type !== undefined) {
      updates.push(`object_type = $${paramIndex++}`);
      values.push(object_type);
    }
    if (segment_type !== undefined) {
      updates.push(`segment_type = $${paramIndex++}`);
      values.push(segment_type);
    }
    if (filters !== undefined) {
      updates.push(`filters = $${paramIndex++}`);
      values.push(JSON.stringify(filters));
    }
    updates.push('updated_at = NOW()');

    await query(
      `UPDATE "Segment" SET ${updates.join(', ')} WHERE record_id = $1 AND tenant_id = '${tenantId}'`,
      values
    );

    // Log activity with user ID
    await query(
      `INSERT INTO "SegmentActivity" (segment_id, activity_type, description, created_by, created_at)
       VALUES ($1, 'segment_updated', 'Segment updated', $2, NOW())`,
      [segmentId, userId]
    ).catch(() => {});

    return createResponse(200, { message: 'Segment updated successfully' });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to update segment:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to update segment' });
  }
}

/**
 * Delete segment
 */
async function handleDeleteSegment(tenantId, segmentId) {
  try {
    await getPoolAsync();

    const result = await query(
      `DELETE FROM "Segment" WHERE record_id = $1 AND tenant_id = $2 RETURNING record_id`,
      [segmentId, tenantId]
    );

    if (result.rowCount === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Segment not found' });
    }

    return createResponse(200, { message: 'Segment deleted successfully' });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to delete segment:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to delete segment' });
  }
}

/**
 * Add members to segment
 */
async function handleAddSegmentMembers(tenantId, segmentId, body) {
  const { ownerIds = [], recordIds = [] } = body;
  const idsToAdd = [...new Set([...ownerIds, ...recordIds])];

  if (idsToAdd.length === 0) {
    return createResponse(400, { error: 'Bad Request', message: 'No member IDs provided' });
  }

  try {
    await getPoolAsync();

    // Verify segment
    const segmentCheck = await query(
      `SELECT record_id FROM "Segment" WHERE record_id = $1 AND tenant_id = $2`,
      [segmentId, tenantId]
    );
    if (segmentCheck.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Segment not found' });
    }

    // Insert members - use owner_id (existing column name)
    const placeholders = idsToAdd.map((_, i) => `($1, $${i + 2}, NOW())`).join(', ');
    await query(
      `INSERT INTO "SegmentMember" (segment_id, owner_id, added_at)
       VALUES ${placeholders}
       ON CONFLICT (segment_id, owner_id) DO NOTHING`,
      [segmentId, ...idsToAdd]
    );

    // Update member count
    await query(
      `UPDATE "Segment" SET member_count = (SELECT COUNT(*) FROM "SegmentMember" WHERE segment_id = $1), updated_at = NOW() WHERE record_id = $1`,
      [segmentId]
    );

    return createResponse(200, { message: `Added ${idsToAdd.length} members` });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to add segment members:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to add members' });
  }
}

/**
 * Remove members from segment
 */
async function handleRemoveSegmentMembers(tenantId, segmentId, body) {
  const { ownerIds = [], recordIds = [] } = body;
  const idsToRemove = [...new Set([...ownerIds, ...recordIds])];

  if (idsToRemove.length === 0) {
    return createResponse(400, { error: 'Bad Request', message: 'No member IDs provided' });
  }

  try {
    await getPoolAsync();

    const placeholders = idsToRemove.map((_, i) => `$${i + 2}`).join(', ');
    await query(
      `DELETE FROM "SegmentMember" WHERE segment_id = $1 AND owner_id IN (${placeholders})`,
      [segmentId, ...idsToRemove]
    );

    // Update member count
    await query(
      `UPDATE "Segment" SET member_count = (SELECT COUNT(*) FROM "SegmentMember" WHERE segment_id = $1), updated_at = NOW() WHERE record_id = $1`,
      [segmentId]
    );

    return createResponse(200, { message: `Removed ${idsToRemove.length} members` });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to remove segment members:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to remove members' });
  }
}

/**
 * Clone segment
 */
async function handleCloneSegment(tenantId, segmentId) {
  try {
    await getPoolAsync();

    const original = await query(
      `SELECT * FROM "Segment" WHERE record_id = $1 AND tenant_id = $2`,
      [segmentId, tenantId]
    );

    if (original.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Segment not found' });
    }

    const row = original.rows[0];
    const result = await query(
      `INSERT INTO "Segment" (tenant_id, record_id, name, description, object_type, segment_type, filters, is_automatic, created_at, updated_at)
       VALUES ($1, next_record_id($1, 70), $2, $3, $4, $5, $6, FALSE, NOW(), NOW())
       RETURNING record_id`,
      [tenantId, `${row.name} (Copy)`, row.description, row.object_type, row.segment_type, JSON.stringify(row.filters)]
    );

    return createResponse(201, {
      segment: { id: result.rows[0].record_id, recordId: result.rows[0].record_id },
      message: 'Segment cloned successfully',
    });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to clone segment:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to clone segment' });
  }
}

/**
 * Convert segment type (active <-> static)
 */
async function handleConvertSegment(tenantId, segmentId, body) {
  const { targetType } = body;

  if (!['active', 'static'].includes(targetType)) {
    return createResponse(400, { error: 'Bad Request', message: 'Invalid target type' });
  }

  try {
    await getPoolAsync();

    await query(
      `UPDATE "Segment" SET segment_type = $1, updated_at = NOW() WHERE record_id = $2 AND tenant_id = $3`,
      [targetType, segmentId, tenantId]
    );

    return createResponse(200, { message: `Converted to ${targetType} segment` });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to convert segment:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to convert segment' });
  }
}

/**
 * Refresh single segment member count
 * - For ACTIVE segments: executes filter query
 * - Stores daily snapshot
 * - Calculates 7-day change
 */
async function handleRefreshSegment(tenantId, segmentId) {
  try {
    await getPoolAsync();

    // Get segment details
    const segmentResult = await query(
      `SELECT record_id, filters, segment_type, object_type FROM "Segment" WHERE record_id = $1 AND tenant_id = $2`,
      [segmentId, tenantId]
    );

    if (segmentResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Segment not found' });
    }

    const segment = segmentResult.rows[0];
    const segmentType = segment.segment_type || 'active';
    const objectType = segment.object_type || 'owners';
    const filters = segment.filters || { groups: [], groupLogic: 'OR' };

    let count = 0;

    if (segmentType === 'active' && filters.groups && filters.groups.length > 0) {
      // Active segment: execute filter and sync SegmentMember table
      let tableName = '"Owner"';
      let idColumn = 'owner_id';
      if (objectType === 'pets') {
        tableName = '"Pet"';
        idColumn = 'pet_id';
      } else if (objectType === 'bookings') {
        tableName = '"Booking"';
        idColumn = 'booking_id';
      }

      const { whereClause, params } = buildFilterWhereClause(filters, objectType, 'o', 2);

      // Get all matching IDs
      let idsQuery = `SELECT o.record_id FROM ${tableName} o WHERE o.tenant_id = $1`;
      let queryParams = [tenantId];

      if (whereClause) {
        idsQuery += ` AND (${whereClause})`;
        queryParams = [tenantId, ...params];
      }

      const idsResult = await query(idsQuery, queryParams);
      const matchingIds = idsResult.rows.map(r => r.id);
      count = matchingIds.length;

      // Sync SegmentMember table for active segments
      // Delete all existing and re-insert with current timestamp for new members
      // Keep existing members that still match (preserve their added_at)

      const existingResult = await query(
        `SELECT ${idColumn} as record_id, added_at FROM "SegmentMember" WHERE segment_id = $1`,
        [segmentId]
      ).catch(() => ({ rows: [] }));

      // Map of existing record_id -> added_at
      const existingMap = new Map();
      for (const row of existingResult.rows) {
        existingMap.set(row.record_id, row.added_at);
      }

      const matchingIdsSet = new Set(matchingIds);

      // Find new members (not in existing) - these get added with NOW()
      const newIds = matchingIds.filter(id => !existingMap.has(id));

      // Find removed members (in existing but not matching anymore) - delete them
      const removedIds = [...existingMap.keys()].filter(id => !matchingIdsSet.has(id));

      console.log('[Refresh] Sync stats:', {
        totalMatching: matchingIds.length,
        existingCount: existingMap.size,
        newCount: newIds.length,
        removedCount: removedIds.length
      });

      // Insert new members with current timestamp
      for (const id of newIds) {
        try {
          await query(
            `INSERT INTO "SegmentMember" (segment_id, ${idColumn}, tenant_id, added_at)
             VALUES ($1, $2, $3, NOW())`,
            [segmentId, id, tenantId]
          );
        } catch (insertErr) {
          console.log('[Refresh] Insert error for id', id, ':', insertErr.message);
        }
      }

      // Remove members that no longer match
      if (removedIds.length > 0) {
        await query(
          `DELETE FROM "SegmentMember" WHERE segment_id = $1 AND ${idColumn} = ANY($2::uuid[])`,
          [segmentId, removedIds]
        ).catch((delErr) => console.log('[Refresh] Delete error:', delErr.message));
      }
    } else {
      // Static segment: count from SegmentMember table
      const countResult = await query(
        `SELECT COUNT(*) as count FROM "SegmentMember" WHERE segment_id = $1`,
        [segmentId]
      );
      count = parseInt(countResult.rows[0]?.count || 0);
    }

    // Get total count for percentage calculation
    let totalTableName = '"Owner"';
    if (objectType === 'pets') totalTableName = '"Pet"';
    else if (objectType === 'bookings') totalTableName = '"Booking"';

    const totalResult = await query(
      `SELECT COUNT(*) as count FROM ${totalTableName} WHERE tenant_id = $1`,
      [tenantId]
    );
    const totalCount = parseInt(totalResult.rows[0]?.count || 1);
    const percentOfTotal = totalCount > 0 ? ((count / totalCount) * 100).toFixed(2) : 0;

    // Calculate 7-day change from snapshots
    let sevenDayChange = 0;
    try {
      const snapshotResult = await query(
        `SELECT member_count FROM "SegmentSnapshot"
         WHERE segment_id = $1 AND snapshot_date <= NOW() - INTERVAL '7 days'
         ORDER BY snapshot_date DESC LIMIT 1`,
        [segmentId]
      );
      if (snapshotResult.rows.length > 0) {
        const oldCount = parseInt(snapshotResult.rows[0].member_count || 0);
        sevenDayChange = count - oldCount;
      }
    } catch (e) {
      // SegmentSnapshot table might not exist yet - ignore
      console.log('[Segment][refresh] Snapshot table not found, skipping 7-day calc');
    }

    // Store today's snapshot (upsert)
    try {
      await query(
        `INSERT INTO "SegmentSnapshot" (id, segment_id, member_count, snapshot_date)
         VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE)
         ON CONFLICT (segment_id, snapshot_date) DO UPDATE SET member_count = $2`,
        [segmentId, count]
      );
    } catch (e) {
      // SegmentSnapshot table might not exist - ignore
      console.log('[Segment][refresh] Could not store snapshot:', e.message);
    }

    // Update segment
    await query(
      `UPDATE "Segment"
       SET member_count = $1, percent_of_total = $2, seven_day_change = $3, updated_at = NOW()
       WHERE record_id = $4 AND tenant_id = $5`,
      [count, percentOfTotal, sevenDayChange, segmentId, tenantId]
    );

    return createResponse(200, {
      memberCount: count,
      percentOfTotal: parseFloat(percentOfTotal),
      sevenDayChange,
      message: 'Segment refreshed'
    });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to refresh segment:', error.message, error.stack);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to refresh segment' });
  }
}

/**
 * Refresh all segments
 */
async function handleRefreshAllSegments(tenantId) {
  try {
    await getPoolAsync();

    // Get all segments for tenant
    const segments = await query(
      `SELECT record_id FROM "Segment" WHERE tenant_id = $1`,
      [tenantId]
    );

    for (const segment of segments.rows) {
      const countResult = await query(
        `SELECT COUNT(*) as count FROM "SegmentMember" WHERE segment_id = $1`,
        [segment.record_id]
      );
      const count = parseInt(countResult.rows[0]?.count || 0);

      await query(
        `UPDATE "Segment" SET member_count = $1, updated_at = NOW() WHERE record_id = $2`,
        [count, segment.record_id]
      );
    }

    return createResponse(200, { message: `Refreshed ${segments.rows.length} segments` });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to refresh segments:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to refresh segments' });
  }
}

/**
 * Get segment activity
 * Joins with User table to get actual user names
 */
async function handleGetSegmentActivity(tenantId, segmentId, queryParams) {
  const { limit = 50, offset = 0 } = queryParams;

  try {
    await getPoolAsync();

    // Join with User table to get created_by user info
    const result = await query(
      `SELECT
         sa.id,
         sa.activity_type,
         sa.description,
         sa.metadata,
         sa.member_count_before,
         sa.member_count_after,
         sa.created_by,
         sa.created_at,
         u.first_name as user_first_name,
         u.last_name as user_last_name,
         u.email as user_email
       FROM "SegmentActivity" sa
       LEFT JOIN "User" u ON sa.created_by = u.record_id
       WHERE sa.segment_id = $1
       ORDER BY sa.created_at DESC
       LIMIT $2 OFFSET $3`,
      [segmentId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      `SELECT COUNT(*) as count FROM "SegmentActivity" WHERE segment_id = $1`,
      [segmentId]
    );

    const items = result.rows.map(row => {
      // Build user name from joined user data
      const userName = row.user_first_name || row.user_last_name
        ? `${row.user_first_name || ''} ${row.user_last_name || ''}`.trim()
        : null;

      return {
        id: row.id,
        type: row.activity_type,
        description: row.description,
        metadata: row.metadata,
        memberCountBefore: row.member_count_before,
        memberCountAfter: row.member_count_after,
        createdAt: row.created_at,
        created_by: row.created_by,
        // Include modifiedByUser for frontend fallback chain
        modifiedByUser: row.created_by ? {
          id: row.created_by,
          name: userName,
          email: row.user_email,
        } : null,
        // Also include as created_by_name for simpler access
        created_by_name: userName || row.user_email || null,
      };
    });

    return createResponse(200, {
      items,
      total: parseInt(countResult.rows[0]?.count || 0),
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    // Return empty if table doesn't exist
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return createResponse(200, { items: [], total: 0, offset: 0, limit: 50 });
    }
    console.error('[ANALYTICS-SERVICE] Failed to get segment activity:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to get activity' });
  }
}

/**
 * Preview segment (for builder)
 * Uses same filter logic as handleGetSegmentMembers for consistency
 */
async function handlePreviewSegment(tenantId, body) {
  const { filters, objectType = 'owners', limit = 10 } = body;

  try {
    await getPoolAsync();

    let tableName = '"Owner"';
    let selectFields = 'o.record_id, o.first_name, o.last_name, o.email, o.phone';

    if (objectType === 'pets') {
      tableName = '"Pet"';
      selectFields = 'o.record_id, o.name, o.species, o.breed';
    } else if (objectType === 'bookings') {
      tableName = '"Booking"';
      selectFields = 'o.record_id, o.pet_id, o.start_date, o.end_date, o.status';
    }

    // Build filter clause using same function as members endpoint
    const { whereClause, params, paramIndex } = buildFilterWhereClause(filters, objectType, 'o', 2);

    // Build queries
    let dataQuery = `SELECT ${selectFields} FROM ${tableName} o WHERE o.tenant_id = $1`;
    let countQuery = `SELECT COUNT(*) as count FROM ${tableName} o WHERE o.tenant_id = $1`;
    let queryParams = [tenantId];

    if (whereClause) {
      dataQuery += ` AND (${whereClause})`;
      countQuery += ` AND (${whereClause})`;
      queryParams = [tenantId, ...params];
    }

    dataQuery += ` LIMIT $${paramIndex}`;

    // Execute queries
    const result = await query(dataQuery, [...queryParams, parseInt(limit)]);
    const countResult = await query(countQuery, queryParams);

    const sample = result.rows.map(row => {
      if (objectType === 'owners') {
        return {
          id: row.record_id,
          recordId: row.record_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        };
      } else if (objectType === 'pets') {
        return {
          id: row.record_id,
          recordId: row.record_id,
          name: row.name,
          species: row.species,
          breed: row.breed,
        };
      } else {
        return {
          id: row.record_id,
          recordId: row.record_id,
          petId: row.pet_id,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.status,
        };
      }
    });

    return createResponse(200, {
      count: parseInt(countResult.rows[0]?.count || 0),
      sample,
    });
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to preview segment:', error.message, error.stack);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to preview segment' });
  }
}

/**
 * Export segment members to CSV
 */
async function handleExportSegmentMembers(tenantId, segmentId) {
  try {
    await getPoolAsync();

    // Get segment info
    const segmentResult = await query(
      `SELECT object_type FROM "Segment" WHERE record_id = $1 AND tenant_id = $2`,
      [segmentId, tenantId]
    );

    if (segmentResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'Segment not found' });
    }

    const objectType = segmentResult.rows[0].object_type || 'owners';

    // Get members with owner details
    const result = await query(
      `SELECT
         o.id,
         o.first_name,
         o.last_name,
         o.email,
         o.phone,
         o.created_at
       FROM "SegmentMember" sm
       JOIN "Owner" o ON sm.owner_id = o.record_id
       WHERE sm.segment_id = $1
       ORDER BY o.last_name, o.first_name`,
      [segmentId]
    );

    // Build CSV
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Created At'];
    const rows = result.rows.map(row => [
      row.id,
      row.first_name || '',
      row.last_name || '',
      row.email || '',
      row.phone || '',
      row.created_at ? new Date(row.created_at).toISOString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="segment-export-${segmentId}.csv"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: csv,
    };
  } catch (error) {
    console.error('[ANALYTICS-SERVICE] Failed to export segment:', error.message);
    return createResponse(500, { error: 'Internal Server Error', message: 'Failed to export segment' });
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
         c.record_id,
         c.subject,
         c.last_message_at,
         c.unread_count,
         c.is_archived,
         c.created_at,
         c.updated_at,
         o.record_id as owner_id,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email
       FROM "Conversation" c
       LEFT JOIN "Owner" o ON c.owner_id = o.record_id AND c.tenant_id = o.tenant_id
       WHERE c.tenant_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      [tenantId]
    );

    const conversations = result.rows.map(row => ({
      id: row.record_id,
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
      `SELECT record_id FROM "Conversation" WHERE record_id = $1 AND tenant_id = $2`,
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
         m.record_id,
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
      id: row.record_id,
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
       WHERE record_id = $1 AND tenant_id = $2`,
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
      `SELECT DISTINCT ON (p.record_id)
         p.record_id, p.name, p.species, p.breed, p.birth_date, p.gender,
         p.microchip_number,
         o.first_name || ' ' || o.last_name as owner_name,
         b.check_in as date_received
       FROM "Pet" p
       JOIN "Booking" b ON b.tenant_id = p.tenant_id AND p.record_id = ANY(b.pet_ids)
       JOIN "PetOwner" po ON po.tenant_id = p.tenant_id AND po.pet_id = p.record_id
       JOIN "Owner" o ON o.tenant_id = po.tenant_id AND o.record_id = po.owner_id
       WHERE b.tenant_id = $1
         AND b.status = 'CHECKED_IN'
       ORDER BY p.record_id, b.check_in DESC`,
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
      `SELECT DISTINCT ON (p.record_id)
         p.record_id, p.name, p.species, p.breed, p.birth_date, p.gender,
         p.microchip_number,
         o.first_name || ' ' || o.last_name as owner_name,
         b.check_in as date_received
       FROM "Pet" p
       JOIN "Booking" b ON b.tenant_id = p.tenant_id AND p.record_id = ANY(b.pet_ids)
       JOIN "PetOwner" po ON po.tenant_id = p.tenant_id AND po.pet_id = p.record_id
       JOIN "Owner" o ON o.tenant_id = po.tenant_id AND o.record_id = po.owner_id
       WHERE b.tenant_id = $1
         AND b.status = 'CHECKED_IN'
       ORDER BY p.record_id, b.check_in DESC`,
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
         b.record_id as booking_id,
         p.record_id as pet_id,
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
       JOIN "Owner" o ON o.tenant_id = b.tenant_id AND o.record_id = b.owner_id
       CROSS JOIN LATERAL unnest(b.pet_ids) AS pid
       JOIN "Pet" p ON p.tenant_id = b.tenant_id AND p.record_id = pid
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
         b.record_id as booking_id, p.record_id as pet_id, p.name as pet_name,
         p.species, p.breed, p.gender,
         o.first_name || ' ' || o.last_name as owner_name,
         o.address as owner_address,
         b.actual_check_in, b.actual_check_out, b.check_in, b.check_out
       FROM "Booking" b
       JOIN "Owner" o ON o.tenant_id = b.tenant_id AND o.record_id = b.owner_id
       CROSS JOIN LATERAL unnest(b.pet_ids) AS pid
       JOIN "Pet" p ON p.tenant_id = b.tenant_id AND p.record_id = pid
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
         p.record_id as pet_id, p.name as pet_name, p.species, p.breed,
         'treatment' as type,
         i.title as description,
         i.medical_treatment as medication,
         i.vet_recommendations as notes
       FROM "Incident" i
       JOIN "Pet" p ON i.pet_id = p.record_id
       WHERE i.tenant_id = $1
         AND i.vet_contacted = true
         AND DATE(i.incident_date) BETWEEN $2 AND $3
               UNION ALL
       SELECT
         v.id, v.administered_date as date,
         p.record_id as pet_id, p.name as pet_name, p.species, p.breed,
         'vaccination' as type,
         v.vaccine_name as description,
         NULL as medication,
         v.notes
       FROM "Vaccination" v
       JOIN "Pet" p ON v.pet_id = p.record_id
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
      `SELECT i.record_id, i.incident_date as date, p.record_id as pet_id, p.name as pet_name,
              p.species, p.breed, 'treatment' as type, i.title as description,
              i.medical_treatment as medication, i.vet_recommendations as notes
       FROM "Incident" i JOIN "Pet" p ON i.pet_id = p.record_id
       WHERE i.tenant_id = $1 AND i.vet_contacted = true
         AND DATE(i.incident_date) BETWEEN $2 AND $3       UNION ALL
       SELECT v.record_id, v.administered_date as date, p.record_id as pet_id, p.name as pet_name,
              p.species, p.breed, 'vaccination' as type, v.vaccine_name as description,
              NULL as medication, v.notes
       FROM "Vaccination" v JOIN "Pet" p ON v.pet_id = p.record_id
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
      `SELECT p.record_id, p.name, p.species, p.breed,
              o.first_name || ' ' || o.last_name as owner_name
       FROM "Pet" p
       LEFT JOIN "PetOwner" po ON po.tenant_id = p.tenant_id AND po.pet_id = p.record_id
       LEFT JOIN "Owner" o ON o.tenant_id = po.tenant_id AND o.record_id = po.owner_id
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
          u.record_id as "actorId",
          u.first_name as "actorFirstName",
          u.last_name as "actorLastName",
          u.email as "actorEmail",
          'general' as source_type
        FROM "AuditLog" a
        LEFT JOIN "User" u ON a.user_id = u.record_id
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
          u.record_id as "actorId",
          u.first_name as "actorFirstName",
          u.last_name as "actorLastName",
          u.email as "actorEmail",
          'auth' as source_type
        FROM "AuthAuditLog" aa
        LEFT JOIN "User" u ON aa.user_id = u.record_id
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
        LEFT JOIN "User" u ON a.user_id = u.record_id
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
        LEFT JOIN "User" u ON aa.user_id = u.record_id
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
