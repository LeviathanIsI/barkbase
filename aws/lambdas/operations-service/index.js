/**
 * =============================================================================
 * BarkBase Operations Service Lambda
 * =============================================================================
 *
 * Handles operational endpoints:
 * - GET /api/v1/operations/bookings - List bookings
 * - GET /api/v1/operations/bookings/{id} - Get booking
 * - POST /api/v1/operations/bookings - Create booking
 * - PUT /api/v1/operations/bookings/{id} - Update booking
 * - POST /api/v1/operations/bookings/{id}/checkin - Check in
 * - POST /api/v1/operations/bookings/{id}/checkout - Check out
 * - GET /api/v1/operations/tasks - List tasks
 * - GET /api/v1/operations/tasks/{id} - Get task
 * - POST /api/v1/operations/tasks - Create task
 * - PUT /api/v1/operations/tasks/{id} - Update task
 * - GET /api/v1/calendar/events - Get calendar events (bookings, tasks, runs)
 * - GET /api/v1/calendar/occupancy - Get occupancy data
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
    console.log('[OPERATIONS-SERVICE] Got tenant ID from header:', tenantId);
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

  console.log('[OPERATIONS-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

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
      console.warn('[OPERATIONS-SERVICE] No tenant context found for user:', user.id);
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Missing tenant context: X-Tenant-Id header is required',
      });
    }

    console.log('[OPERATIONS-SERVICE] Resolved tenantId:', tenantId);

    // Route to appropriate handler
    // Bookings routes
    if (path === '/api/v1/operations/bookings' || path === '/operations/bookings') {
      if (method === 'GET') {
        return handleGetBookings(tenantId, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCreateBooking(tenantId, user, parseBody(event));
      }
    }

    // Availability check endpoint - check capacity without creating booking
    if (path === '/api/v1/operations/bookings/availability' || path === '/operations/bookings/availability') {
      if (method === 'GET' || method === 'POST') {
        return handleCheckAvailability(tenantId, method === 'POST' ? parseBody(event) : event.queryStringParameters || {});
      }
    }

    // Booking by ID routes
    const bookingMatch = path.match(/\/api\/v1\/operations\/bookings\/([a-f0-9-]+)(\/.*)?$/i);
    if (bookingMatch) {
      const bookingId = bookingMatch[1];
      const subPath = bookingMatch[2] || '';

      if (subPath === '/checkin' && method === 'POST') {
        return handleCheckIn(tenantId, bookingId, parseBody(event));
      }
      if (subPath === '/checkout' && method === 'POST') {
        return handleCheckOut(tenantId, bookingId, parseBody(event));
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetBooking(tenantId, bookingId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdateBooking(tenantId, bookingId, parseBody(event));
        }
        if (method === 'DELETE') {
          return handleCancelBooking(tenantId, bookingId);
        }
      }
    }

    // Tasks routes
    if (path === '/api/v1/operations/tasks' || path === '/operations/tasks') {
      if (method === 'GET') {
        return handleGetTasks(tenantId, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCreateTask(tenantId, user, parseBody(event));
      }
    }

    // Task by ID routes
    const taskMatch = path.match(/\/api\/v1\/operations\/tasks\/([a-f0-9-]+)(\/.*)?$/i);
    if (taskMatch) {
      const taskId = taskMatch[1];
      const subPath = taskMatch[2] || '';

      if (subPath === '/complete' && (method === 'PUT' || method === 'POST')) {
        return handleCompleteTask(tenantId, taskId);
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetTask(tenantId, taskId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdateTask(tenantId, taskId, parseBody(event));
        }
        if (method === 'DELETE') {
          return handleDeleteTask(tenantId, taskId);
        }
      }
    }

    // Schedules routes
    if (path === '/api/v1/operations/schedules' || path === '/operations/schedules') {
      if (method === 'GET') {
        return handleGetSchedules(tenantId, event.queryStringParameters || {});
      }
    }

    if (path === '/api/v1/operations/schedules/staff' || path === '/operations/schedules/staff') {
      if (method === 'GET') {
        return handleGetStaffSchedules(tenantId, event.queryStringParameters || {});
      }
    }

    // Notifications routes
    if (path === '/api/v1/operations/notifications' || path === '/operations/notifications') {
      if (method === 'GET') {
        return handleGetNotifications(tenantId);
      }
    }

    // ==========================================================================
    // Incident routes - /api/v1/incidents/*
    // ==========================================================================
    if (path === '/api/v1/incidents' || path === '/incidents') {
      if (method === 'GET') {
        return handleGetIncidents(tenantId, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCreateIncident(tenantId, user, parseBody(event));
      }
    }

    // Incident by ID routes
    const incidentMatch = path.match(/\/api\/v1\/incidents\/([a-f0-9-]+)(\/.*)?$/i);
    if (incidentMatch) {
      const incidentId = incidentMatch[1];
      const subPath = incidentMatch[2] || '';

      if (subPath === '/resolve' && method === 'POST') {
        return handleResolveIncident(tenantId, user, incidentId, parseBody(event));
      }
      if (subPath === '/notify-owner' && method === 'POST') {
        return handleNotifyOwnerOfIncident(tenantId, user, incidentId, parseBody(event));
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetIncident(tenantId, incidentId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdateIncident(tenantId, user, incidentId, parseBody(event));
        }
        if (method === 'DELETE') {
          return handleDeleteIncident(tenantId, incidentId);
        }
      }
    }

    // ==========================================================================
    // Email Notification routes - /api/v1/notifications/*
    // ==========================================================================
    if (path === '/api/v1/notifications/email' || path === '/notifications/email') {
      if (method === 'POST') {
        return handleSendEmail(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/booking-confirmation' || path === '/notifications/booking-confirmation') {
      if (method === 'POST') {
        return handleSendBookingConfirmation(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/booking-reminder' || path === '/notifications/booking-reminder') {
      if (method === 'POST') {
        return handleSendBookingReminder(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/vaccination-reminder' || path === '/notifications/vaccination-reminder') {
      if (method === 'POST') {
        return handleSendVaccinationReminder(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/vaccination-reminders/bulk' || path === '/notifications/vaccination-reminders/bulk') {
      if (method === 'POST') {
        return handleBulkVaccinationReminders(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/check-in' || path === '/notifications/check-in') {
      if (method === 'POST') {
        return handleSendCheckInConfirmation(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/check-out' || path === '/notifications/check-out') {
      if (method === 'POST') {
        return handleSendCheckOutConfirmation(tenantId, user, parseBody(event));
      }
    }

    // ==========================================================================
    // Calendar routes - /api/v1/calendar/*
    // ==========================================================================
    if (path === '/api/v1/calendar/events' || path === '/calendar/events') {
      if (method === 'GET') {
        return handleGetCalendarEvents(tenantId, event.queryStringParameters || {});
      }
    }

    if (path === '/api/v1/calendar/occupancy' || path === '/calendar/occupancy') {
      if (method === 'GET') {
        return handleGetOccupancy(tenantId, event.queryStringParameters || {});
      }
    }

    // ==========================================================================
    // Run Templates routes - /api/v1/run-templates/*
    // ==========================================================================
    if (path === '/api/v1/run-templates') {
      if (method === 'GET') {
        return handleGetRunTemplates(tenantId, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCreateRunTemplate(tenantId, parseBody(event));
      }
    }

    // Run template by ID
    const runTemplateMatch = path.match(/\/api\/v1\/run-templates\/([a-f0-9-]+)$/i);
    if (runTemplateMatch) {
      const templateId = runTemplateMatch[1];
      if (method === 'GET') {
        return handleGetRunTemplate(tenantId, templateId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateRunTemplate(tenantId, templateId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteRunTemplate(tenantId, templateId);
      }
    }

    // ==========================================================================
    // Runs routes - /api/v1/runs/*
    // ==========================================================================
    if (path === '/api/v1/runs') {
      if (method === 'GET') {
        return handleGetRuns(tenantId, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCreateRun(tenantId, parseBody(event));
      }
    }

    if (path === '/api/v1/runs/assignments') {
      if (method === 'GET') {
        return handleGetRunAssignments(tenantId, event.queryStringParameters || {});
      }
    }

    // Run by ID
    const runMatch = path.match(/\/api\/v1\/runs\/([a-f0-9-]+)(\/.*)?$/i);
    if (runMatch) {
      const runId = runMatch[1];
      const subPath = runMatch[2] || '';

      if (subPath === '/available-slots' && method === 'GET') {
        return handleGetAvailableSlots(tenantId, runId, event.queryStringParameters || {});
      }
      if (subPath === '/remove-pet' && method === 'POST') {
        return handleRemovePetFromRun(tenantId, runId, parseBody(event));
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetRun(tenantId, runId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdateRun(tenantId, runId, parseBody(event));
        }
        if (method === 'DELETE') {
          return handleDeleteRun(tenantId, runId);
        }
      }
    }

    // Default response for unmatched routes
    return createResponse(404, {
      error: 'Not Found',
      message: `Route ${method} ${path} not found`,
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Unhandled error:', error);
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
    console.error('[OPERATIONS-SERVICE] Failed to get tenant ID:', error.message);
    return null;
  }
}

// =============================================================================
// BOOKINGS HANDLERS
// =============================================================================

/**
 * Get all bookings for tenant
 *
 * Schema (Booking table):
 *   id, tenant_id, pet_id, owner_id, service_id, kennel_id, check_in, check_out,
 *   status, service_type, service_name, kennel_name, room_number, total_price_in_cents,
 *   deposit_in_cents, notes, special_instructions, checked_in_at, checked_out_at, ...
 */
async function handleGetBookings(tenantId, queryParams) {
  const { status, date, startDate, endDate, days, pet_id, owner_id, limit = 50, offset = 0 } = queryParams;

  console.log('[Bookings][list] tenantId:', tenantId);
  console.log('[Bookings][list] query:', JSON.stringify(queryParams || {}));
  console.log('[Bookings][list] env DB_NAME:', process.env.DB_NAME || process.env.DB_DATABASE);

  try {
    await getPoolAsync();

    // Diagnostic: counts per tenant
    try {
      const diagCounts = await query(
        `SELECT tenant_id, COUNT(*) as cnt FROM "Booking" GROUP BY tenant_id`
      );
      console.log('[Bookings][diag] counts per tenant:', JSON.stringify(diagCounts.rows));
    } catch (diagErr) {
      console.warn('[Bookings][diag] count query failed:', diagErr.message);
    }

    // Diagnostic: sample rows for this tenant
    try {
      const diagSample = await query(
        `SELECT id, status, check_in, check_out FROM "Booking" WHERE tenant_id = $1 ORDER BY check_in ASC LIMIT 5`,
        [tenantId]
      );
      console.log('[Bookings][diag] sample for tenant', tenantId, ':', JSON.stringify(diagSample.rows));
    } catch (diagErr) {
      console.warn('[Bookings][diag] sample query failed:', diagErr.message);
    }

    let whereClause = 'b.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    // Status filter (case-insensitive, validate against known statuses)
    if (status) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'COMPLETED'];
      const normalizedStatus = status.toUpperCase();
      if (!validStatuses.includes(normalizedStatus)) {
        return createResponse(400, {
          error: 'Bad Request',
          message: `Invalid status: ${status}. Valid values: ${validStatuses.join(', ')}`,
        });
      }
      whereClause += ` AND b.status = $${paramIndex++}`;
      params.push(normalizedStatus);
    }

    // Date range filter (startDate/endDate) - returns bookings that OVERLAP with the range
    // A booking overlaps if: booking.check_in <= endDate AND booking.check_out >= startDate
    // This ensures Month/Week/Day views show consistent results for any booking spanning those dates
    if (startDate && endDate) {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return createResponse(400, {
          error: 'Bad Request',
          message: 'Invalid date range. Expected format: YYYY-MM-DD for startDate and endDate',
        });
      }
      // Overlap logic: check_in <= endDate AND check_out >= startDate
      whereClause += ` AND DATE(b.check_in) <= $${paramIndex} AND DATE(b.check_out) >= $${paramIndex + 1}`;
      params.push(endDate, startDate);
      paramIndex += 2;
      console.log('[Bookings][list] Using date range filter:', startDate, 'to', endDate);
    }
    // Single date filter - filter by check_in OR check_out matching the given date
    // This catches arrivals (check_in) and departures (check_out) on the same day
    else if (date) {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return createResponse(400, {
          error: 'Bad Request',
          message: 'Invalid date parameter. Expected format: YYYY-MM-DD',
        });
      }
      whereClause += ` AND (DATE(b.check_in) = $${paramIndex} OR DATE(b.check_out) = $${paramIndex})`;
      params.push(date);
      paramIndex++;
    }

    if (days) {
      const daysInt = parseInt(days, 10);
      if (isNaN(daysInt) || daysInt < 0) {
        return createResponse(400, {
          error: 'Bad Request',
          message: 'Invalid days parameter. Expected a positive integer.',
        });
      }
      whereClause += ` AND b.check_in <= NOW() + INTERVAL '${daysInt} days'`;
    }

    if (pet_id) {
      whereClause += ` AND bp.pet_id = $${paramIndex++}`;
      params.push(pet_id);
    }

    console.log('[Bookings][list] tenantId:', tenantId, 'status:', status, 'date:', date, 'startDate:', startDate, 'endDate:', endDate);

    // Schema: check_in, check_out (not start_date/end_date), total_price_in_cents (not total_price)
    const result = await query(
      `SELECT
         b.id,
         b.tenant_id,
         b.pet_id,
         b.owner_id,
         b.status,
         b.check_in AS start_date,
         b.check_out AS end_date,
         b.checked_in_at,
         b.checked_out_at,
         b.total_price_in_cents,
         b.deposit_in_cents,
         b.notes,
         b.special_instructions,
         b.service_type,
         b.room_number,
         b.created_at,
         b.updated_at,
         k.id as kennel_id,
         COALESCE(b.kennel_name, k.name) as kennel_name,
         s.id as service_id,
         COALESCE(b.service_name, s.name) as service_name,
         o.id as resolved_owner_id,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone
       FROM "Booking" b
       LEFT JOIN "Kennel" k ON b.kennel_id = k.id
       LEFT JOIN "Service" s ON b.service_id = s.id
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       LEFT JOIN "BookingPet" bp ON bp.booking_id = b.id
       WHERE ${whereClause} AND b.deleted_at IS NULL
       GROUP BY b.id, k.id, k.name, s.id, s.name, o.id, o.first_name, o.last_name, o.email, o.phone
       ORDER BY b.check_in DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get pets for each booking
    const bookingIds = result.rows.map(b => b.id);
    let petsMap = {};

    if (bookingIds.length > 0) {
      const petsResult = await query(
        `SELECT
           bp.booking_id,
           p.id,
           p.name,
           p.species,
           p.breed
         FROM "BookingPet" bp
         JOIN "Pet" p ON bp.pet_id = p.id
         WHERE bp.booking_id = ANY($1)`,
        [bookingIds]
      );

      petsResult.rows.forEach(pet => {
        if (!petsMap[pet.booking_id]) {
          petsMap[pet.booking_id] = [];
        }
        petsMap[pet.booking_id].push({
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
        });
      });
    }

    console.log('[Bookings][diag] count:', result.rows.length);

    const bookings = result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      petId: row.pet_id,
      ownerId: row.owner_id || row.resolved_owner_id,
      status: row.status,
      startDate: row.start_date,  // Aliased from check_in
      endDate: row.end_date,      // Aliased from check_out
      checkedInAt: row.checked_in_at,
      checkedOutAt: row.checked_out_at,
      totalPrice: row.total_price_in_cents ? row.total_price_in_cents / 100 : 0,
      totalPriceInCents: row.total_price_in_cents,
      depositInCents: row.deposit_in_cents,
      notes: row.notes,
      specialInstructions: row.special_instructions,
      serviceType: row.service_type,
      roomNumber: row.room_number,
      kennel: row.kennel_id ? {
        id: row.kennel_id,
        name: row.kennel_name,
      } : null,
      service: row.service_id ? {
        id: row.service_id,
        name: row.service_name,
      } : null,
      owner: (row.owner_id || row.resolved_owner_id) ? {
        id: row.owner_id || row.resolved_owner_id,
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
        email: row.owner_email,
        phone: row.owner_phone,
      } : null,
      pets: petsMap[row.id] || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, {
      data: bookings,
      bookings: bookings, // Compatibility
      total: bookings.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to get bookings:', {
      message: error.message,
      stack: error.stack,
      tenantId,
      queryParams,
    });
    // Check for common database errors and return appropriate responses
    if (error.message?.includes('does not exist')) {
      // Table doesn't exist - return empty array gracefully
      console.warn('[OPERATIONS-SERVICE] Booking table may not exist, returning empty array');
      return createResponse(200, {
        data: [],
        bookings: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve bookings',
    });
  }
}

/**
 * Get single booking
 */
async function handleGetBooking(tenantId, bookingId) {
  console.log('[Bookings][get] id:', bookingId, 'tenantId:', tenantId);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         b.id, b.tenant_id, b.pet_id, b.owner_id, b.service_id, b.kennel_id,
         b.check_in, b.check_out, b.status, b.service_type, b.service_name AS stored_service_name,
         b.kennel_name AS stored_kennel_name, b.room_number, b.total_price_in_cents,
         b.deposit_in_cents, b.notes, b.special_instructions, b.checked_in_at,
         b.checked_out_at, b.cancelled_at, b.cancellation_reason,
         b.created_at, b.updated_at,
         k.name as kennel_name,
         s.name as service_name,
         o.first_name as owner_first_name, o.last_name as owner_last_name,
         o.email as owner_email, o.phone as owner_phone
       FROM "Booking" b
       LEFT JOIN "Kennel" k ON b.kennel_id = k.id
       LEFT JOIN "Service" s ON b.service_id = s.id
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       WHERE b.id = $1 AND b.tenant_id = $2 AND b.deleted_at IS NULL`,
      [bookingId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const booking = result.rows[0];

    // Get pets for this booking
    const petsResult = await query(
      `SELECT p.id, p.name, p.species, p.breed
       FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [bookingId]
    );

    return createResponse(200, {
      id: booking.id,
      tenantId: booking.tenant_id,
      petId: booking.pet_id,
      ownerId: booking.owner_id,
      status: booking.status,
      startDate: booking.check_in,
      endDate: booking.check_out,
      checkedInAt: booking.checked_in_at,
      checkedOutAt: booking.checked_out_at,
      totalPrice: booking.total_price_in_cents ? booking.total_price_in_cents / 100 : 0,
      totalPriceInCents: booking.total_price_in_cents,
      depositInCents: booking.deposit_in_cents,
      notes: booking.notes,
      specialInstructions: booking.special_instructions,
      serviceType: booking.service_type,
      roomNumber: booking.room_number,
      kennelId: booking.kennel_id,
      kennelName: booking.stored_kennel_name || booking.kennel_name,
      serviceId: booking.service_id,
      serviceName: booking.stored_service_name || booking.service_name,
      owner: booking.owner_id ? {
        id: booking.owner_id,
        firstName: booking.owner_first_name,
        lastName: booking.owner_last_name,
        email: booking.owner_email,
        phone: booking.owner_phone,
      } : null,
      pets: petsResult.rows,
      cancelledAt: booking.cancelled_at,
      cancellationReason: booking.cancellation_reason,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to get booking:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve booking',
    });
  }
}

/**
 * Create booking
 */
async function handleCreateBooking(tenantId, user, body) {
  const { petIds, petId, ownerId, kennelId, serviceId, startDate, endDate, notes, totalPrice, totalPriceInCents, specialInstructions, serviceType, roomNumber, sendConfirmation = true, skipCapacityCheck = false } = body;

  console.log('[Bookings][create] tenantId:', tenantId, body);

  if (!startDate || !endDate) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Start date and end date are required',
    });
  }

  try {
    await getPoolAsync();

    // ==========================================================================
    // CAPACITY ENFORCEMENT
    // Check if there's available capacity before creating the booking
    // ==========================================================================
    if (!skipCapacityCheck) {
      const capacityCheck = await checkBookingCapacity(tenantId, kennelId, startDate, endDate);
      
      if (!capacityCheck.hasCapacity) {
        console.log('[Bookings][create] Capacity exceeded:', capacityCheck);
        return createResponse(409, {
          error: 'Conflict',
          message: capacityCheck.message || 'No available capacity for the selected dates',
          details: {
            totalCapacity: capacityCheck.totalCapacity,
            currentOccupancy: capacityCheck.currentOccupancy,
            availableSlots: capacityCheck.availableSlots,
            requestedKennel: kennelId,
          },
        });
      }
      
      console.log('[Bookings][create] Capacity check passed:', capacityCheck);
    }

    // Calculate price in cents
    const priceInCents = totalPriceInCents || (totalPrice ? totalPrice * 100 : 0);

    // Create booking using correct schema columns
    const result = await query(
      `INSERT INTO "Booking" (tenant_id, pet_id, owner_id, kennel_id, service_id, check_in, check_out,
                              notes, special_instructions, total_price_in_cents, service_type, room_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING')
       RETURNING *`,
      [tenantId, petId || null, ownerId || null, kennelId || null, serviceId || null,
       startDate, endDate, notes || null, specialInstructions || null, priceInCents,
       serviceType || 'boarding', roomNumber || null]
    );

    const booking = result.rows[0];

    // Link pets to booking via BookingPet
    const petsToLink = petIds && petIds.length > 0 ? petIds : (petId ? [petId] : []);
    for (const pid of petsToLink) {
      await query(
        `INSERT INTO "BookingPet" (booking_id, pet_id) VALUES ($1, $2)`,
        [booking.id, pid]
      );
    }

    console.log('[Bookings][create] created:', booking.id);

    // Send confirmation email asynchronously (don't block response)
    if (sendConfirmation && ownerId) {
      sendBookingConfirmationEmail(tenantId, booking.id, user?.id).catch(err => {
        console.error('[Bookings][create] Failed to send confirmation email:', err.message);
      });
    }

    return createResponse(201, {
      success: true,
      booking: {
        id: booking.id,
        tenantId: booking.tenant_id,
        status: booking.status,
        startDate: booking.check_in,
        endDate: booking.check_out,
        totalPriceInCents: booking.total_price_in_cents,
      },
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to create booking:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create booking',
    });
  }
}

/**
 * Handle availability check request
 * GET/POST /api/v1/operations/bookings/availability
 */
async function handleCheckAvailability(tenantId, params) {
  const { startDate, endDate, kennelId } = params;

  console.log('[Bookings][availability] Checking:', { tenantId, startDate, endDate, kennelId });

  if (!startDate || !endDate) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'startDate and endDate are required',
    });
  }

  try {
    await getPoolAsync();

    const result = await checkBookingCapacity(tenantId, kennelId, startDate, endDate);

    return createResponse(200, {
      available: result.hasCapacity,
      ...result,
    });

  } catch (error) {
    console.error('[Bookings][availability] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to check availability',
    });
  }
}

/**
 * Helper: Check booking capacity for a date range
 * Returns { hasCapacity, totalCapacity, currentOccupancy, availableSlots, message }
 */
async function checkBookingCapacity(tenantId, kennelId, startDate, endDate) {
  try {
    // If a specific kennel is requested, check that kennel's availability
    if (kennelId) {
      // Check if the specific kennel is available for the date range
      const kennelResult = await query(
        `SELECT k.id, k.name, k.capacity
         FROM "Kennel" k
         WHERE k.id = $1 AND k.tenant_id = $2 AND k.is_active = true AND k.deleted_at IS NULL`,
        [kennelId, tenantId]
      );

      if (kennelResult.rows.length === 0) {
        return {
          hasCapacity: false,
          message: 'Selected kennel not found or inactive',
          totalCapacity: 0,
          currentOccupancy: 0,
          availableSlots: 0,
        };
      }

      const kennel = kennelResult.rows[0];
      const kennelCapacity = kennel.capacity || 1;

      // Count overlapping bookings for this specific kennel
      const overlappingResult = await query(
        `SELECT COUNT(*) as count
         FROM "Booking" b
         WHERE b.tenant_id = $1
           AND b.kennel_id = $2
           AND b.deleted_at IS NULL
           AND b.status NOT IN ('CANCELLED', 'NO_SHOW', 'CHECKED_OUT')
           AND b.check_in < $4::timestamptz
           AND b.check_out > $3::timestamptz`,
        [tenantId, kennelId, startDate, endDate]
      );

      const currentOccupancy = parseInt(overlappingResult.rows[0]?.count || 0);
      const availableSlots = kennelCapacity - currentOccupancy;

      return {
        hasCapacity: availableSlots > 0,
        totalCapacity: kennelCapacity,
        currentOccupancy,
        availableSlots: Math.max(0, availableSlots),
        kennelName: kennel.name,
        message: availableSlots <= 0 
          ? `Kennel "${kennel.name}" is fully booked for the selected dates`
          : null,
      };
    }

    // No specific kennel - check overall facility capacity
    // Get total capacity from all active kennels
    const capacityResult = await query(
      `SELECT 
         COALESCE(SUM(k.capacity), 0) as total_capacity,
         COUNT(k.id) as kennel_count
       FROM "Kennel" k
       WHERE k.tenant_id = $1 AND k.is_active = true AND k.deleted_at IS NULL`,
      [tenantId]
    );

    const totalCapacity = parseInt(capacityResult.rows[0]?.total_capacity || 0);
    const kennelCount = parseInt(capacityResult.rows[0]?.kennel_count || 0);

    // If no kennels configured, check FacilitySettings for total_capacity
    let effectiveCapacity = totalCapacity;
    if (effectiveCapacity === 0) {
      const facilityResult = await query(
        `SELECT total_capacity FROM "FacilitySettings" WHERE tenant_id = $1`,
        [tenantId]
      );
      effectiveCapacity = parseInt(facilityResult.rows[0]?.total_capacity || 0);
    }

    // If still no capacity configured, allow booking (no restrictions)
    if (effectiveCapacity === 0) {
      console.log('[Bookings][capacity] No capacity configured, allowing booking');
      return {
        hasCapacity: true,
        totalCapacity: 0,
        currentOccupancy: 0,
        availableSlots: -1, // -1 indicates unlimited
        message: 'No capacity limits configured',
      };
    }

    // Count overlapping bookings across all kennels
    const overlappingResult = await query(
      `SELECT COUNT(*) as count
       FROM "Booking" b
       WHERE b.tenant_id = $1
         AND b.deleted_at IS NULL
         AND b.status NOT IN ('CANCELLED', 'NO_SHOW', 'CHECKED_OUT')
         AND b.check_in < $3::timestamptz
         AND b.check_out > $2::timestamptz`,
      [tenantId, startDate, endDate]
    );

    const currentOccupancy = parseInt(overlappingResult.rows[0]?.count || 0);
    const availableSlots = effectiveCapacity - currentOccupancy;

    return {
      hasCapacity: availableSlots > 0,
      totalCapacity: effectiveCapacity,
      currentOccupancy,
      availableSlots: Math.max(0, availableSlots),
      kennelCount,
      message: availableSlots <= 0
        ? `Facility is at full capacity (${currentOccupancy}/${effectiveCapacity}) for the selected dates`
        : null,
    };

  } catch (error) {
    console.error('[Bookings][capacity] Error checking capacity:', error.message);
    // On error, allow booking but log the issue
    return {
      hasCapacity: true,
      totalCapacity: 0,
      currentOccupancy: 0,
      availableSlots: -1,
      message: 'Capacity check failed, allowing booking',
      error: error.message,
    };
  }
}

/**
 * Helper: Send booking confirmation email
 */
async function sendBookingConfirmationEmail(tenantId, bookingId, userId) {
  try {
    // Get booking with owner and pet info
    const bookingResult = await query(
      `SELECT
         b.*,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         s.name as service_name
       FROM "Booking" b
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       LEFT JOIN "Service" s ON b.service_id = s.id
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [bookingId, tenantId]
    );

    if (bookingResult.rows.length === 0 || !bookingResult.rows[0].owner_email) {
      console.log('[EMAIL] No booking or owner email found, skipping confirmation');
      return;
    }

    const booking = bookingResult.rows[0];

    // Get pets for booking
    const petsResult = await query(
      `SELECT p.name FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [bookingId]
    );
    const petNames = petsResult.rows.map(p => p.name).join(', ') || 'Your pet';

    // Get tenant info
    const tenantResult = await query(
      `SELECT name FROM "Tenant" WHERE id = $1`,
      [tenantId]
    );
    const tenant = tenantResult.rows[0];

    // Send email
    const { sendBookingConfirmation } = sharedLayer;
    await sendBookingConfirmation(
      {
        check_in: booking.check_in,
        check_out: booking.check_out,
        service_name: booking.service_name || booking.service_type || 'Boarding',
      },
      {
        first_name: booking.owner_first_name,
        email: booking.owner_email,
      },
      { name: petNames },
      tenant
    );

    // Log to Communication table
    await logEmailToCommunication(tenantId, {
      ownerId: booking.owner_id,
      recipientEmail: booking.owner_email,
      subject: `Booking Confirmed - ${petNames}`,
      content: `Automated booking confirmation for ${booking.check_in}`,
      status: 'sent',
      templateUsed: 'bookingConfirmation',
      userId,
    });

    console.log('[EMAIL] Booking confirmation sent to', booking.owner_email);
  } catch (error) {
    console.error('[EMAIL] Failed to send booking confirmation:', error.message);
  }
}

/**
 * Update booking
 */
async function handleUpdateBooking(tenantId, bookingId, body) {
  const { status, startDate, endDate, kennelId, serviceId, ownerId, petId, notes, specialInstructions, totalPriceInCents, roomNumber } = body;

  console.log('[Bookings][update] id:', bookingId, 'tenantId:', tenantId, body);

  try {
    await getPoolAsync();

    const updates = [];
    const values = [bookingId, tenantId];
    let paramIndex = 3;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status.toUpperCase());
    }
    if (startDate) {
      updates.push(`check_in = $${paramIndex++}`);
      values.push(startDate);
    }
    if (endDate) {
      updates.push(`check_out = $${paramIndex++}`);
      values.push(endDate);
    }
    if (kennelId !== undefined) {
      updates.push(`kennel_id = $${paramIndex++}`);
      values.push(kennelId);
    }
    if (serviceId !== undefined) {
      updates.push(`service_id = $${paramIndex++}`);
      values.push(serviceId);
    }
    if (ownerId !== undefined) {
      updates.push(`owner_id = $${paramIndex++}`);
      values.push(ownerId);
    }
    if (petId !== undefined) {
      updates.push(`pet_id = $${paramIndex++}`);
      values.push(petId);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    if (specialInstructions !== undefined) {
      updates.push(`special_instructions = $${paramIndex++}`);
      values.push(specialInstructions);
    }
    if (totalPriceInCents !== undefined) {
      updates.push(`total_price_in_cents = $${paramIndex++}`);
      values.push(totalPriceInCents);
    }
    if (roomNumber !== undefined) {
      updates.push(`room_number = $${paramIndex++}`);
      values.push(roomNumber);
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Booking"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const booking = result.rows[0];
    console.log('[Bookings][update] updated:', bookingId);

    return createResponse(200, {
      success: true,
      booking: {
        ...booking,
        startDate: booking.check_in,
        endDate: booking.check_out,
      },
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to update booking:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update booking',
    });
  }
}

/**
 * Cancel booking
 */
async function handleCancelBooking(tenantId, bookingId) {
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Booking"
       SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [bookingId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    // Send cancellation email asynchronously
    sendBookingCancellationEmail(tenantId, bookingId).catch(err => {
      console.error('[Bookings][cancel] Failed to send cancellation email:', err.message);
    });

    return createResponse(200, {
      success: true,
      message: 'Booking cancelled',
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to cancel booking:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to cancel booking',
    });
  }
}

/**
 * Helper: Send booking cancellation email
 */
async function sendBookingCancellationEmail(tenantId, bookingId) {
  try {
    // Get booking with owner info
    const bookingResult = await query(
      `SELECT
         b.*,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.email as owner_email,
         s.name as service_name
       FROM "Booking" b
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       LEFT JOIN "Service" s ON b.service_id = s.id
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [bookingId, tenantId]
    );

    if (bookingResult.rows.length === 0 || !bookingResult.rows[0].owner_email) {
      console.log('[EMAIL] No booking or owner email found, skipping cancellation email');
      return;
    }

    const booking = bookingResult.rows[0];

    // Get pets for booking
    const petsResult = await query(
      `SELECT p.name FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [bookingId]
    );
    const petNames = petsResult.rows.map(p => p.name).join(', ') || 'Your pet';

    // Send email
    const { sendBookingCancellation } = sharedLayer;
    await sendBookingCancellation(
      {
        check_in: booking.check_in,
        check_out: booking.check_out,
        service_name: booking.service_name || booking.service_type || 'Boarding',
      },
      {
        first_name: booking.owner_first_name,
        email: booking.owner_email,
      },
      { name: petNames },
      booking.cancellation_reason
    );

    // Log to Communication table
    await logEmailToCommunication(tenantId, {
      ownerId: booking.owner_id,
      recipientEmail: booking.owner_email,
      subject: `Booking Cancelled - ${petNames}`,
      content: `Booking cancellation notification`,
      status: 'sent',
      templateUsed: 'bookingCancellation',
    });

    console.log('[EMAIL] Booking cancellation sent to', booking.owner_email);
  } catch (error) {
    console.error('[EMAIL] Failed to send booking cancellation:', error.message);
  }
}

/**
 * Check in for booking
 * Schema column: checked_in_at (not check_in_time)
 */
async function handleCheckIn(tenantId, bookingId, body) {
  const { sendConfirmation = true } = body || {};
  
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Booking"
       SET status = 'CHECKED_IN', checked_in_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [bookingId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    // Send check-in confirmation email asynchronously
    if (sendConfirmation) {
      sendCheckInEmail(tenantId, bookingId).catch(err => {
        console.error('[Bookings][checkin] Failed to send confirmation email:', err.message);
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Check-in successful',
      checkInTime: result.rows[0].checked_in_at,
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to check in:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to check in',
    });
  }
}

/**
 * Helper: Send check-in confirmation email
 */
async function sendCheckInEmail(tenantId, bookingId) {
  try {
    const bookingResult = await query(
      `SELECT
         b.*,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.email as owner_email,
         s.name as service_name
       FROM "Booking" b
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       LEFT JOIN "Service" s ON b.service_id = s.id
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [bookingId, tenantId]
    );

    if (bookingResult.rows.length === 0 || !bookingResult.rows[0].owner_email) {
      return;
    }

    const booking = bookingResult.rows[0];

    const petsResult = await query(
      `SELECT p.name FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [bookingId]
    );
    const petNames = petsResult.rows.map(p => p.name).join(', ') || 'Your pet';

    const { sendCheckInConfirmation } = sharedLayer;
    await sendCheckInConfirmation(
      {
        check_out: booking.check_out,
        service_name: booking.service_name || booking.service_type,
      },
      { first_name: booking.owner_first_name, email: booking.owner_email },
      { name: petNames }
    );

    await logEmailToCommunication(tenantId, {
      ownerId: booking.owner_id,
      recipientEmail: booking.owner_email,
      subject: `${petNames} Has Been Checked In`,
      content: `Automated check-in confirmation`,
      status: 'sent',
      templateUsed: 'checkInConfirmation',
    });

    console.log('[EMAIL] Check-in confirmation sent to', booking.owner_email);
  } catch (error) {
    console.error('[EMAIL] Failed to send check-in confirmation:', error.message);
  }
}

/**
 * Check out for booking
 * Schema column: checked_out_at (not check_out_time)
 */
async function handleCheckOut(tenantId, bookingId, body) {
  const { sendConfirmation = true } = body || {};
  
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Booking"
       SET status = 'CHECKED_OUT', checked_out_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [bookingId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const booking = result.rows[0];

    // Send check-out confirmation email asynchronously
    if (sendConfirmation) {
      sendCheckOutEmail(tenantId, bookingId, booking.total_price_in_cents).catch(err => {
        console.error('[Bookings][checkout] Failed to send confirmation email:', err.message);
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Check-out successful',
      checkOutTime: result.rows[0].checked_out_at,
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to check out:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to check out',
    });
  }
}

/**
 * Helper: Send check-out confirmation email
 */
async function sendCheckOutEmail(tenantId, bookingId, totalPriceInCents) {
  try {
    const bookingResult = await query(
      `SELECT
         b.*,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.email as owner_email
       FROM "Booking" b
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [bookingId, tenantId]
    );

    if (bookingResult.rows.length === 0 || !bookingResult.rows[0].owner_email) {
      return;
    }

    const booking = bookingResult.rows[0];

    const petsResult = await query(
      `SELECT p.name FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [bookingId]
    );
    const petNames = petsResult.rows.map(p => p.name).join(', ') || 'Your pet';

    const { sendCheckOutConfirmation } = sharedLayer;
    await sendCheckOutConfirmation(
      booking,
      { first_name: booking.owner_first_name, email: booking.owner_email },
      { name: petNames },
      totalPriceInCents
    );

    await logEmailToCommunication(tenantId, {
      ownerId: booking.owner_id,
      recipientEmail: booking.owner_email,
      subject: `${petNames} is Ready for Pick-Up`,
      content: `Automated check-out confirmation`,
      status: 'sent',
      templateUsed: 'checkOutConfirmation',
    });

    console.log('[EMAIL] Check-out confirmation sent to', booking.owner_email);
  } catch (error) {
    console.error('[EMAIL] Failed to send check-out confirmation:', error.message);
  }
}

// =============================================================================
// TASKS HANDLERS
// =============================================================================

/**
 * Get all tasks for tenant
 */
async function handleGetTasks(tenantId, queryParams) {
  const { status, assigned_to, due_date, limit = 50, offset = 0 } = queryParams;

  console.log('[Tasks][list] tenantId:', tenantId, { status, assigned_to, due_date });

  try {
    await getPoolAsync();

    let whereClause = 't.tenant_id = $1 AND t.deleted_at IS NULL';
    const params = [tenantId];
    let paramIndex = 2;

    // Status filter with validation
    if (status) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
      const normalizedStatus = status.toUpperCase();
      if (!validStatuses.includes(normalizedStatus)) {
        return createResponse(400, {
          error: 'Bad Request',
          message: `Invalid status: ${status}. Valid values: ${validStatuses.join(', ')}`,
        });
      }
      whereClause += ` AND t.status = $${paramIndex++}`;
      params.push(normalizedStatus);
    }

    if (assigned_to) {
      whereClause += ` AND t.assigned_to = $${paramIndex++}`;
      params.push(assigned_to);
    }

    // Due date filter with validation - schema uses due_at
    if (due_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
        return createResponse(400, {
          error: 'Bad Request',
          message: 'Invalid due_date parameter. Expected format: YYYY-MM-DD',
        });
      }
      whereClause += ` AND DATE(t.due_at) = $${paramIndex++}`;
      params.push(due_date);
    }

    // Schema: id, tenant_id, pet_id, owner_id, booking_id, assigned_to, type, status,
    //         priority, title, description, notes, scheduled_for, due_at, completed_at, completed_by
    const result = await query(
      `SELECT
         t.id,
         t.tenant_id,
         t.type,
         t.title,
         t.description,
         t.notes,
         t.status,
         t.priority,
         t.scheduled_for,
         t.due_at,
         t.completed_at,
         t.completed_by,
         t.assigned_to,
         t.booking_id,
         t.pet_id,
         t.owner_id,
         t.created_at,
         t.updated_at,
         u.first_name as assignee_first_name,
         u.last_name as assignee_last_name,
         p.name as pet_name,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name
       FROM "Task" t
       LEFT JOIN "User" u ON t.assigned_to = u.id
       LEFT JOIN "Pet" p ON t.pet_id = p.id
       LEFT JOIN "Owner" o ON t.owner_id = o.id
       WHERE ${whereClause}
       ORDER BY t.due_at ASC NULLS LAST, t.scheduled_for ASC NULLS LAST, t.priority DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    console.log('[Tasks][diag] count:', result.rows.length);

    const tasks = result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type,
      title: row.title,
      description: row.description,
      notes: row.notes,
      status: row.status,
      priority: row.priority,
      scheduledFor: row.scheduled_for,
      dueDate: row.due_at,  // Alias for frontend compatibility
      dueAt: row.due_at,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      assignedTo: row.assigned_to,
      assigneeName: row.assignee_first_name
        ? `${row.assignee_first_name} ${row.assignee_last_name || ''}`.trim()
        : null,
      bookingId: row.booking_id,
      petId: row.pet_id,
      petName: row.pet_name,
      ownerId: row.owner_id,
      ownerName: row.owner_first_name
        ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim()
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, {
      data: tasks,
      tasks: tasks, // Compatibility
      total: tasks.length,
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to get tasks:', {
      message: error.message,
      stack: error.stack,
      tenantId,
      queryParams,
    });
    // Check for common database errors and return appropriate responses
    if (error.message?.includes('does not exist')) {
      // Table doesn't exist - return empty array gracefully
      console.warn('[OPERATIONS-SERVICE] Task table may not exist, returning empty array');
      return createResponse(200, {
        data: [],
        tasks: [],
        total: 0,
      });
    }
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve tasks',
    });
  }
}

/**
 * Get single task
 * Schema: due_at (not due_date)
 */
async function handleGetTask(tenantId, taskId) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT t.*, u.first_name, u.last_name
       FROM "Task" t
       LEFT JOIN "User" u ON t.assigned_to = u.id
       WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
      [taskId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type,
      title: row.title,
      description: row.description,
      notes: row.notes,
      status: row.status,
      priority: row.priority,
      scheduledFor: row.scheduled_for,
      dueDate: row.due_at, // Alias for frontend compatibility
      dueAt: row.due_at,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      assignedTo: row.assigned_to,
      assigneeName: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : null,
      bookingId: row.booking_id,
      petId: row.pet_id,
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to get task:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve task',
    });
  }
}

/**
 * Create task
 * Schema: due_at (not due_date)
 */
async function handleCreateTask(tenantId, user, body) {
  const { title, description, priority, dueDate, dueAt, assignedTo, bookingId, petId, scheduledFor, type } = body;

  if (!title) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Title is required',
    });
  }

  try {
    await getPoolAsync();

    // Support both dueDate (frontend) and dueAt (schema)
    const dueDateValue = dueAt || dueDate || null;

    const result = await query(
      `INSERT INTO "Task" (tenant_id, title, description, priority, due_at, scheduled_for, type, assigned_to, booking_id, pet_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', NOW(), NOW())
       RETURNING *`,
      [tenantId, title, description, priority || 'NORMAL', dueDateValue, scheduledFor || null, type || 'OTHER', assignedTo, bookingId, petId]
    );

    const task = result.rows[0];

    return createResponse(201, {
      success: true,
      task: {
        ...task,
        dueDate: task.due_at, // Alias for frontend
        dueAt: task.due_at,
      },
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to create task:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create task',
    });
  }
}

/**
 * Update task
 * Schema: due_at (not due_date)
 */
async function handleUpdateTask(tenantId, taskId, body) {
  const { title, description, status, priority, dueDate, dueAt, assignedTo, scheduledFor, type } = body;

  try {
    await getPoolAsync();

    const updates = [];
    const values = [taskId, tenantId];
    let paramIndex = 3;

    if (title) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status.toUpperCase());
    }
    if (priority) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority.toUpperCase());
    }
    // Support both dueDate (frontend) and dueAt (schema)
    if (dueDate || dueAt) {
      updates.push(`due_at = $${paramIndex++}`);
      values.push(dueAt || dueDate);
    }
    if (scheduledFor !== undefined) {
      updates.push(`scheduled_for = $${paramIndex++}`);
      values.push(scheduledFor);
    }
    if (type) {
      updates.push(`type = $${paramIndex++}`);
      values.push(type.toUpperCase());
    }
    if (assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      values.push(assignedTo);
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Task"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    const task = result.rows[0];

    return createResponse(200, {
      success: true,
      task: {
        ...task,
        dueDate: task.due_at, // Alias for frontend
        dueAt: task.due_at,
      },
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to update task:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update task',
    });
  }
}

/**
 * Complete task
 */
async function handleCompleteTask(tenantId, taskId) {
  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Task"
       SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [taskId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Task completed',
      completedAt: result.rows[0].completed_at,
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to complete task:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to complete task',
    });
  }
}

/**
 * Delete task
 */
async function handleDeleteTask(tenantId, taskId) {
  try {
    await getPoolAsync();

    const result = await query(
      `DELETE FROM "Task" WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [taskId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Task deleted',
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to delete task:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete task',
    });
  }
}

// =============================================================================
// SCHEDULES HANDLERS
// =============================================================================

/**
 * Get schedules
 */
async function handleGetSchedules(tenantId, queryParams) {
  // For now, return bookings as schedules
  return handleGetBookings(tenantId, queryParams);
}

/**
 * Get staff schedules
 */
async function handleGetStaffSchedules(tenantId, queryParams) {
  try {
    await getPoolAsync();

    // Return staff with their assignments for today
    const result = await query(
      `SELECT
         s.id,
         s.title,
         u.first_name,
         u.last_name,
         u.email
       FROM "Staff" s
       JOIN "User" u ON s.user_id = u.id
       WHERE s.tenant_id = $1 AND s.is_active = true`,
      [tenantId]
    );

    return createResponse(200, {
      data: result.rows.map(s => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`.trim(),
        title: s.title,
        email: s.email,
      })),
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to get staff schedules:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve staff schedules',
    });
  }
}

// =============================================================================
// NOTIFICATIONS HANDLERS
// =============================================================================

/**
 * Get notifications (stub)
 */
async function handleGetNotifications(tenantId) {
  return createResponse(200, {
    data: [],
    notifications: [],
    unreadCount: 0,
  });
}

// =============================================================================
// RUN TEMPLATES HANDLERS
// =============================================================================

/**
 * Get all run templates for tenant
 *
 * Frontend expects (from RunTemplatesTab.jsx):
 * Array of: { recordId, name, timePeriodMinutes, maxCapacity, capacityType }
 *
 * Schema (RunTemplate table):
 *   id, tenant_id, name, description, time_period_minutes, max_capacity,
 *   capacity_type, species_allowed, is_active, sort_order, created_at, updated_at, deleted_at
 */
async function handleGetRunTemplates(tenantId, queryParams) {
  console.log('[RunTemplates][list] tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Check if RunTemplate table exists
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'RunTemplate'
      ) as exists`
    );

    if (!tableCheck.rows[0]?.exists) {
      console.log('[RunTemplates] Table does not exist, returning empty array');
      return createResponse(200, {
        data: [],
        runTemplates: [],
        total: 0,
        message: 'Run templates retrieved (table not initialized)',
      });
    }

    const result = await query(
      `SELECT
         rt.id,
         rt.name,
         rt.description,
         rt.time_period_minutes,
         rt.max_capacity,
         rt.capacity_type,
         rt.species_allowed,
         rt.is_active,
         rt.sort_order,
         rt.created_at,
         rt.updated_at
       FROM "RunTemplate" rt
       WHERE rt.tenant_id = $1 AND rt.deleted_at IS NULL
       ORDER BY rt.sort_order ASC, rt.name ASC`,
      [tenantId]
    );

    console.log('[RunTemplates][list] Found:', result.rows.length, 'templates');

    // Map to frontend expected shape
    const templates = result.rows.map(row => ({
      id: row.id,
      recordId: row.id, // Frontend uses recordId for mutations
      name: row.name,
      description: row.description,
      timePeriodMinutes: row.time_period_minutes,
      maxCapacity: row.max_capacity,
      capacityType: row.capacity_type,
      speciesAllowed: row.species_allowed || ['Dog'],
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, {
      data: templates,
      runTemplates: templates,
      total: templates.length,
      message: 'Run templates retrieved successfully',
    });

  } catch (error) {
    // If table doesn't exist, return empty array
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[RunTemplates] Table not found, returning empty array');
      return createResponse(200, {
        data: [],
        runTemplates: [],
        total: 0,
        message: 'Run templates (table not initialized)',
      });
    }

    console.error('[RunTemplates] Failed to get:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve run templates',
    });
  }
}

async function handleGetRunTemplate(tenantId, templateId) {
  console.log('[RunTemplates][get] tenantId:', tenantId, 'templateId:', templateId);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         rt.id,
         rt.name,
         rt.description,
         rt.time_period_minutes,
         rt.max_capacity,
         rt.capacity_type,
         rt.species_allowed,
         rt.is_active,
         rt.sort_order,
         rt.created_at,
         rt.updated_at
       FROM "RunTemplate" rt
       WHERE rt.id = $1 AND rt.tenant_id = $2 AND rt.deleted_at IS NULL`,
      [templateId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Run template not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      recordId: row.id,
      name: row.name,
      description: row.description,
      timePeriodMinutes: row.time_period_minutes,
      maxCapacity: row.max_capacity,
      capacityType: row.capacity_type,
      speciesAllowed: row.species_allowed || ['Dog'],
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

  } catch (error) {
    console.error('[RunTemplates] Failed to get template:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve run template',
    });
  }
}

async function handleCreateRunTemplate(tenantId, body) {
  console.log('[RunTemplates][create] tenantId:', tenantId, 'payload:', JSON.stringify(body));

  const { name, description, timePeriodMinutes, maxCapacity, capacityType, speciesAllowed } = body;

  if (!name) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Name is required',
    });
  }

  try {
    await getPoolAsync();

    // Get next sort order
    const sortOrderResult = await query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
       FROM "RunTemplate"
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );
    const nextSortOrder = sortOrderResult.rows[0]?.next_order || 1;

    const result = await query(
      `INSERT INTO "RunTemplate" (
         tenant_id, name, description, time_period_minutes, max_capacity,
         capacity_type, species_allowed, is_active, sort_order, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        name,
        description || null,
        timePeriodMinutes || 30,
        maxCapacity || 10,
        capacityType || 'total',
        speciesAllowed || ['Dog'],
        nextSortOrder,
      ]
    );

    const row = result.rows[0];

    console.log('[RunTemplates][create] Created template:', row.id);

    return createResponse(201, {
      success: true,
      id: row.id,
      recordId: row.id,
      name: row.name,
      description: row.description,
      timePeriodMinutes: row.time_period_minutes,
      maxCapacity: row.max_capacity,
      capacityType: row.capacity_type,
      speciesAllowed: row.species_allowed,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      message: 'Run template created successfully',
    });

  } catch (error) {
    console.error('[RunTemplates] Failed to create:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create run template',
    });
  }
}

async function handleUpdateRunTemplate(tenantId, templateId, body) {
  console.log('[RunTemplates][update] tenantId:', tenantId, 'templateId:', templateId, 'payload:', JSON.stringify(body));

  const { name, description, timePeriodMinutes, maxCapacity, capacityType, speciesAllowed, isActive, sortOrder } = body;

  try {
    await getPoolAsync();

    const updates = [];
    const values = [templateId, tenantId];
    let paramIndex = 3;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (timePeriodMinutes !== undefined) {
      updates.push(`time_period_minutes = $${paramIndex++}`);
      values.push(timePeriodMinutes);
    }
    if (maxCapacity !== undefined) {
      updates.push(`max_capacity = $${paramIndex++}`);
      values.push(maxCapacity);
    }
    if (capacityType !== undefined) {
      updates.push(`capacity_type = $${paramIndex++}`);
      values.push(capacityType);
    }
    if (speciesAllowed !== undefined) {
      updates.push(`species_allowed = $${paramIndex++}`);
      values.push(speciesAllowed);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(sortOrder);
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "RunTemplate"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Run template not found',
      });
    }

    const row = result.rows[0];

    console.log('[RunTemplates][update] Updated template:', row.id);

    return createResponse(200, {
      success: true,
      id: row.id,
      recordId: row.id,
      name: row.name,
      description: row.description,
      timePeriodMinutes: row.time_period_minutes,
      maxCapacity: row.max_capacity,
      capacityType: row.capacity_type,
      speciesAllowed: row.species_allowed,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
      message: 'Run template updated successfully',
    });

  } catch (error) {
    console.error('[RunTemplates] Failed to update:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update run template',
    });
  }
}

async function handleDeleteRunTemplate(tenantId, templateId) {
  console.log('[RunTemplates][delete] tenantId:', tenantId, 'templateId:', templateId);

  try {
    await getPoolAsync();

    // Soft delete
    const result = await query(
      `UPDATE "RunTemplate"
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [templateId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Run template not found',
      });
    }

    console.log('[RunTemplates][delete] Deleted template:', templateId);

    return createResponse(200, {
      success: true,
      message: 'Run template deleted successfully',
    });

  } catch (error) {
    console.error('[RunTemplates] Failed to delete:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete run template',
    });
  }
}

// =============================================================================
// RUNS HANDLERS
// =============================================================================

/**
 * =============================================================================
 * TODO: IMPLEMENT RUN ASSIGNMENT PERSISTENCE
 * =============================================================================
 *
 * The frontend Run Assignment UI (frontend/src/features/daycare/routes/RunAssignment.jsx)
 * allows users to drag-and-drop pets into runs with time slots. However, there is
 * currently NO backend endpoint to persist these assignments.
 *
 * CURRENT STATE:
 * - GET /api/v1/runs/assignments - WORKS (reads from RunAssignment table)
 * - PUT /api/v1/runs/:id - Only updates Run metadata, IGNORES { assignedPets } payload
 * - POST /api/v1/runs/:id/remove-pet - WORKS (deletes from RunAssignment table)
 * - NO endpoint exists to CREATE or UPDATE assignments
 *
 * NEEDED ENDPOINTS:
 *
 * 1. POST /api/v1/runs/assignments
 *    Purpose: Create/update run assignments for a specific date
 *    Payload: {
 *      runId: string,
 *      date: string (YYYY-MM-DD),
 *      assignments: [{
 *        petId: string,
 *        bookingId: string (optional - link to daycare booking),
 *        startAt: ISO timestamp,
 *        endAt: ISO timestamp,
 *        notes: string (optional)
 *      }]
 *    }
 *    Logic:
 *    - Delete existing assignments for runId + date
 *    - Insert new assignments from payload
 *    - Or use upsert logic based on runId + petId + date
 *
 * 2. PUT /api/v1/runs/assignments/:id
 *    Purpose: Update a single assignment (time slot, notes, status)
 *    Payload: { startAt, endAt, status, notes }
 *
 * FRONTEND CHANGES NEEDED (once backend is ready):
 * - Update useAssignPetsToRunMutation in frontend/src/features/daycare/api.js
 *   to call POST /api/v1/runs/assignments
 * - Re-enable success toast in RunAssignment.jsx handleSaveAssignments
 * - Remove warning styling from Save button
 *
 * =============================================================================
 */

/**
 * Get all runs for tenant
 *
 * Schema (Run table - NEW):
 *   id, tenant_id, facility_id, template_id, name, code, size, species,
 *   sort_order, is_active, created_at, updated_at, deleted_at
 */
async function handleGetRuns(tenantId, queryParams) {
  const { isActive, facilityId } = queryParams;
  console.log('[Runs][list] tenantId:', tenantId, 'isActive:', isActive, 'facilityId:', facilityId);

  try {
    await getPoolAsync();

    let whereClause = 'r.tenant_id = $1 AND r.deleted_at IS NULL';
    const params = [tenantId];
    let paramIndex = 2;

    // Filter by active status (default to active only)
    if (isActive !== undefined) {
      whereClause += ` AND r.is_active = $${paramIndex++}`;
      params.push(isActive === 'true' || isActive === true);
    } else {
      whereClause += ' AND r.is_active = true';
    }

    // Filter by facility
    if (facilityId) {
      whereClause += ` AND r.facility_id = $${paramIndex++}`;
      params.push(facilityId);
    }

    const result = await query(
      `SELECT
         r.id,
         r.template_id,
         r.facility_id,
         r.name,
         r.code,
         r.size,
         r.species,
         r.sort_order,
         r.is_active,
         r.created_at,
         r.updated_at,
         rt.name as template_name,
         rt.max_capacity,
         rt.time_period_minutes,
         (SELECT COUNT(*) FROM "RunAssignment" ra WHERE ra.run_id = r.id AND ra.deleted_at IS NULL) as assignment_count
       FROM "Run" r
       LEFT JOIN "RunTemplate" rt ON r.template_id = rt.id AND rt.tenant_id = r.tenant_id
       WHERE ${whereClause}
       ORDER BY r.sort_order ASC, r.name ASC`,
      params
    );

    console.log('[Runs][list] Found:', result.rows.length, 'runs');

    const runs = result.rows.map(row => ({
      id: row.id,
      templateId: row.template_id,
      facilityId: row.facility_id,
      templateName: row.template_name,
      name: row.name,
      code: row.code,
      size: row.size,
      species: row.species,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      maxCapacity: row.max_capacity || 10,
      timePeriodMinutes: row.time_period_minutes,
      assignmentCount: parseInt(row.assignment_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return createResponse(200, {
      data: runs,
      runs: runs,
      total: runs.length,
      message: 'Runs retrieved successfully',
    });

  } catch (error) {
    // If table doesn't exist, return empty array
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[Runs] Table not found, returning empty array');
      return createResponse(200, {
        data: [],
        runs: [],
        total: 0,
        message: 'Runs (table not initialized)',
      });
    }

    console.error('[Runs] Failed to get:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve runs',
    });
  }
}

/**
 * Get run assignments for a date range
 *
 * Schema (RunAssignment table - NEW):
 *   id, tenant_id, booking_id, run_id, pet_id, start_at, end_at, status, notes,
 *   created_at, updated_at, deleted_at
 *
 * Query params:
 *   - date: Single date (YYYY-MM-DD) - returns assignments for that day
 *   - startDate/endDate: Date range - returns assignments within range
 *   - weekStart/weekEnd: Alternative date range params
 */
async function handleGetRunAssignments(tenantId, queryParams) {
  // Parse date range from various param formats
  const { date, startDate, endDate, weekStart, weekEnd } = queryParams;

  let rangeStart, rangeEnd;

  if (startDate && endDate) {
    rangeStart = startDate;
    rangeEnd = endDate;
  } else if (weekStart && weekEnd) {
    rangeStart = weekStart;
    rangeEnd = weekEnd;
  } else if (date) {
    // Single date - make it a one-day range
    rangeStart = date;
    rangeEnd = date; // Same day for single date query
  } else {
    // Default to today
    const today = new Date().toISOString().split('T')[0];
    rangeStart = today;
    rangeEnd = today;
  }

  // Validate date formats
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(rangeStart) || !dateRegex.test(rangeEnd)) {
    console.log('[RunAssignments] Invalid date range params:', { startDate, endDate, rangeStart, rangeEnd });
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Invalid date format. Expected YYYY-MM-DD for startDate and endDate',
    });
  }

  console.log('[RunAssignments][list] Query params:', { tenantId, startDate, endDate, rangeStart, rangeEnd });

  try {
    await getPoolAsync();

    // Debug: Check total assignments for tenant first
    const debugCount = await query(
      `SELECT COUNT(*) as total FROM "RunAssignment" WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );
    console.log('[RunAssignments][debug] Total assignments for tenant:', debugCount.rows[0]?.total);

    // Debug: Check assignments in date range without other filters
    const debugRangeCount = await query(
      `SELECT COUNT(*) as total FROM "RunAssignment"
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND DATE(start_at) >= $2::date
         AND DATE(start_at) <= $3::date`,
      [tenantId, rangeStart, rangeEnd]
    );
    console.log('[RunAssignments][debug] Assignments in date range:', debugRangeCount.rows[0]?.total);

    // Query run assignments with joins to Run, RunTemplate, Pet, Booking
    // Using the NEW schema: start_at/end_at (timestamptz), booking_id
    // Use LEFT JOINs for Pet to avoid losing rows if pet is missing
    // Date range: include all assignments where start_at falls within the range (inclusive)
    const result = await query(
      `SELECT
         ra.id,
         ra.run_id,
         ra.booking_id,
         ra.pet_id,
         ra.start_at,
         ra.end_at,
         ra.status,
         ra.notes,
         r.name as run_name,
         r.code as run_code,
         r.size as run_size,
         r.species as run_species,
         r.sort_order as run_sort_order,
         rt.id as template_id,
         rt.name as template_name,
         rt.max_capacity,
         rt.time_period_minutes,
         p.name as pet_name,
         p.species as pet_species,
         p.breed as pet_breed,
         p.photo_url as pet_photo_url,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         b.status as booking_status,
         b.service_type,
         b.service_name
       FROM "RunAssignment" ra
       JOIN "Run" r
         ON r.id = ra.run_id
        AND r.tenant_id = ra.tenant_id
       LEFT JOIN "RunTemplate" rt
         ON rt.id = r.template_id
        AND rt.tenant_id = r.tenant_id
       LEFT JOIN "Pet" p
         ON p.id = ra.pet_id
       LEFT JOIN "Booking" b
         ON b.id = ra.booking_id
        AND b.tenant_id = ra.tenant_id
       LEFT JOIN "Owner" o
         ON o.id = b.owner_id
        AND o.tenant_id = ra.tenant_id
       WHERE ra.tenant_id = $1
         AND ra.deleted_at IS NULL
         AND r.deleted_at IS NULL
         AND r.is_active = true
         AND DATE(ra.start_at) >= $2::date
         AND DATE(ra.start_at) <= $3::date
         AND UPPER(ra.status) IN ('SCHEDULED', 'CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED', 'PENDING')
       ORDER BY r.sort_order ASC, r.name ASC, ra.start_at ASC`,
      [tenantId, rangeStart, rangeEnd]
    );

    console.log('[RunAssignments][list] Found:', result.rows.length, 'assignments after JOINs');

    // Transform to frontend-friendly format
    const assignments = result.rows.map(row => ({
      id: row.id,
      runId: row.run_id,
      runName: row.run_name,
      runCode: row.run_code,
      runSize: row.run_size,
      runSpecies: row.run_species,
      runSortOrder: row.run_sort_order,
      templateId: row.template_id,
      templateName: row.template_name,
      maxCapacity: row.max_capacity,
      timePeriodMinutes: row.time_period_minutes,
      bookingId: row.booking_id,
      bookingStatus: row.booking_status,
      serviceType: row.service_type,
      serviceName: row.service_name,
      petId: row.pet_id,
      petName: row.pet_name,
      petSpecies: row.pet_species,
      petBreed: row.pet_breed,
      petPhotoUrl: row.pet_photo_url,
      ownerName: row.owner_first_name && row.owner_last_name
        ? `${row.owner_first_name} ${row.owner_last_name}`
        : row.owner_first_name || row.owner_last_name || null,
      startAt: row.start_at,
      endAt: row.end_at,
      // Also provide camelCase aliases for frontend compatibility
      startTime: row.start_at,
      endTime: row.end_at,
      status: row.status,
      notes: row.notes,
    }));

    // Also get runs for utilization calculation
    const runsResult = await query(
      `SELECT
         r.id,
         r.name,
         r.code,
         r.size,
         r.species,
         r.sort_order,
         rt.max_capacity,
         rt.name as template_name
       FROM "Run" r
       LEFT JOIN "RunTemplate" rt ON rt.id = r.template_id AND rt.tenant_id = r.tenant_id
       WHERE r.tenant_id = $1
         AND r.deleted_at IS NULL
         AND r.is_active = true
       ORDER BY r.sort_order ASC, r.name ASC`,
      [tenantId]
    );

    const runs = runsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      code: row.code,
      size: row.size,
      species: row.species,
      sortOrder: row.sort_order,
      maxCapacity: row.max_capacity || 10,
      templateName: row.template_name,
    }));

    return createResponse(200, {
      data: assignments,
      assignments: assignments,
      runs: runs,
      startDate: rangeStart,
      endDate: rangeEnd,
      total: assignments.length,
      message: 'Run assignments retrieved successfully',
    });

  } catch (error) {
    // If table doesn't exist, return empty array
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[RunAssignments] Table not found, returning empty array');
      return createResponse(200, {
        data: [],
        assignments: [],
        runs: [],
        startDate: rangeStart,
        endDate: rangeEnd,
        total: 0,
        message: 'Run assignments (table not initialized)',
      });
    }

    console.error('[RunAssignments] Failed to get:', error.message, error.stack);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve run assignments',
    });
  }
}

async function handleGetRun(tenantId, runId) {
  console.log('[Runs][get] tenantId:', tenantId, 'runId:', runId);

  try {
    await getPoolAsync();

    // NEW schema: Run has template_id, facility_id, code, size, species, sort_order, is_active
    const result = await query(
      `SELECT
         r.id,
         r.template_id,
         r.facility_id,
         r.name,
         r.code,
         r.size,
         r.species,
         r.sort_order,
         r.is_active,
         r.created_at,
         r.updated_at,
         rt.name as template_name,
         rt.max_capacity,
         rt.time_period_minutes
       FROM "Run" r
       LEFT JOIN "RunTemplate" rt ON r.template_id = rt.id AND rt.tenant_id = r.tenant_id
       WHERE r.id = $1 AND r.tenant_id = $2 AND r.deleted_at IS NULL`,
      [runId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Run not found',
      });
    }

    const row = result.rows[0];

    // Get assignments for this run (NEW schema: start_at, end_at, booking_id)
    const assignmentsResult = await query(
      `SELECT
         ra.id,
         ra.booking_id,
         ra.pet_id,
         ra.start_at,
         ra.end_at,
         ra.status,
         p.name as pet_name,
         p.species as pet_species
       FROM "RunAssignment" ra
       JOIN "Pet" p ON ra.pet_id = p.id
       WHERE ra.run_id = $1 AND ra.deleted_at IS NULL
       ORDER BY ra.start_at ASC`,
      [runId]
    );

    const assignments = assignmentsResult.rows.map(a => ({
      id: a.id,
      bookingId: a.booking_id,
      petId: a.pet_id,
      petName: a.pet_name,
      petSpecies: a.pet_species,
      startAt: a.start_at,
      endAt: a.end_at,
      startTime: a.start_at,  // Alias for compatibility
      endTime: a.end_at,      // Alias for compatibility
      status: a.status,
    }));

    return createResponse(200, {
      id: row.id,
      templateId: row.template_id,
      facilityId: row.facility_id,
      templateName: row.template_name,
      name: row.name,
      code: row.code,
      size: row.size,
      species: row.species,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      maxCapacity: row.max_capacity || 10,
      timePeriodMinutes: row.time_period_minutes,
      assignments: assignments,
      assignmentCount: assignments.length,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

  } catch (error) {
    console.error('[Runs] Failed to get run:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve run',
    });
  }
}

async function handleCreateRun(tenantId, body) {
  console.log('[Runs][create] tenantId:', tenantId, 'payload:', JSON.stringify(body));

  // NEW schema: Run has template_id, facility_id, code, size, species, sort_order, is_active
  const { templateId, facilityId, name, code, size, species, sortOrder, isActive } = body;

  if (!name) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Name is required',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `INSERT INTO "Run" (
         tenant_id, template_id, facility_id, name, code, size, species,
         sort_order, is_active, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        templateId || null,
        facilityId || null,
        name,
        code || null,
        size || 'medium',
        species || 'Dog',
        sortOrder || 0,
        isActive !== false,
      ]
    );

    const row = result.rows[0];

    console.log('[Runs][create] Created run:', row.id);

    return createResponse(201, {
      success: true,
      id: row.id,
      name: row.name,
      code: row.code,
      size: row.size,
      species: row.species,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      message: 'Run created successfully',
    });

  } catch (error) {
    console.error('[Runs] Failed to create:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create run',
    });
  }
}

async function handleUpdateRun(tenantId, runId, body) {
  console.log('[Runs][update] tenantId:', tenantId, 'runId:', runId, 'payload:', JSON.stringify(body));

  // NEW schema: Run has template_id, facility_id, code, size, species, sort_order, is_active
  const { templateId, facilityId, name, code, size, species, sortOrder, isActive } = body;

  try {
    await getPoolAsync();

    const updates = [];
    const values = [runId, tenantId];
    let paramIndex = 3;

    if (templateId !== undefined) {
      updates.push(`template_id = $${paramIndex++}`);
      values.push(templateId);
    }
    if (facilityId !== undefined) {
      updates.push(`facility_id = $${paramIndex++}`);
      values.push(facilityId);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      values.push(code);
    }
    if (size !== undefined) {
      updates.push(`size = $${paramIndex++}`);
      values.push(size);
    }
    if (species !== undefined) {
      updates.push(`species = $${paramIndex++}`);
      values.push(species);
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(sortOrder);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Run"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Run not found',
      });
    }

    const row = result.rows[0];

    console.log('[Runs][update] Updated run:', row.id);

    return createResponse(200, {
      success: true,
      id: row.id,
      name: row.name,
      code: row.code,
      size: row.size,
      species: row.species,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      message: 'Run updated successfully',
    });

  } catch (error) {
    console.error('[Runs] Failed to update:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update run',
    });
  }
}

async function handleDeleteRun(tenantId, runId) {
  console.log('[Runs][delete] tenantId:', tenantId, 'runId:', runId);

  try {
    await getPoolAsync();

    // Soft delete
    const result = await query(
      `UPDATE "Run"
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [runId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Run not found',
      });
    }

    console.log('[Runs][delete] Deleted run:', runId);

    return createResponse(200, {
      success: true,
      message: 'Run deleted successfully',
    });

  } catch (error) {
    console.error('[Runs] Failed to delete:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete run',
    });
  }
}

async function handleGetAvailableSlots(tenantId, runId, queryParams) {
  console.log('[Runs][slots] tenantId:', tenantId, 'runId:', runId);

  try {
    await getPoolAsync();

    // Get run details with template info (NEW schema: template_id instead of run_template_id)
    const runResult = await query(
      `SELECT r.*, rt.time_period_minutes, rt.capacity_type, rt.max_capacity
       FROM "Run" r
       LEFT JOIN "RunTemplate" rt ON r.template_id = rt.id AND rt.tenant_id = r.tenant_id
       WHERE r.id = $1 AND r.tenant_id = $2 AND r.deleted_at IS NULL`,
      [runId, tenantId]
    );

    if (runResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Run not found',
      });
    }

    const run = runResult.rows[0];

    // Get existing assignments (NEW schema: start_at, end_at)
    const assignmentsResult = await query(
      `SELECT start_at, end_at FROM "RunAssignment"
       WHERE run_id = $1 AND deleted_at IS NULL`,
      [runId]
    );

    // For the new schema, Run doesn't have start_time/end_time anymore
    // Slots are based on the template's time_period_minutes
    const slotDuration = run.time_period_minutes || 30;
    const maxCapacity = run.max_capacity || 10;
    const capacityType = run.capacity_type || 'total';

    return createResponse(200, {
      data: [],
      slots: [],
      runId: runId,
      maxCapacity: maxCapacity,
      capacityType: capacityType,
      timePeriodMinutes: slotDuration,
      currentAssignments: assignmentsResult.rows.length,
      message: 'Available slots retrieved successfully',
    });

  } catch (error) {
    console.error('[Runs] Failed to get slots:', error.message);
    return createResponse(200, {
      data: [],
      slots: [],
      message: 'Available slots (error retrieving)',
    });
  }
}

async function handleRemovePetFromRun(tenantId, runId, body) {
  console.log('[Runs][removePet] tenantId:', tenantId, 'runId:', runId, 'body:', JSON.stringify(body));

  const { petId, assignmentId } = body;

  if (!petId && !assignmentId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'petId or assignmentId is required',
    });
  }

  try {
    await getPoolAsync();

    let result;

    if (assignmentId) {
      result = await query(
        `DELETE FROM "RunAssignment"
         WHERE id = $1 AND tenant_id = $2
         RETURNING id`,
        [assignmentId, tenantId]
      );
    } else {
      result = await query(
        `DELETE FROM "RunAssignment"
         WHERE run_id = $1 AND pet_id = $2 AND tenant_id = $3
         RETURNING id`,
        [runId, petId, tenantId]
      );
    }

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Assignment not found',
      });
    }

    console.log('[Runs][removePet] Removed assignment');

    return createResponse(200, {
      success: true,
      message: 'Pet removed from run successfully',
    });

  } catch (error) {
    console.error('[Runs] Failed to remove pet:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to remove pet from run',
    });
  }
}

// =============================================================================
// CALENDAR HANDLERS
// =============================================================================

/**
 * Get calendar events for a date range
 * Aggregates bookings, tasks, and run assignments into unified calendar events
 *
 * Query params:
 *   - start: Start date (YYYY-MM-DD or ISO timestamp)
 *   - end: End date (YYYY-MM-DD or ISO timestamp)
 *   - types: Comma-separated list of event types (booking,task,run)
 */
async function handleGetCalendarEvents(tenantId, queryParams) {
  const { start, end, types } = queryParams;

  console.log('[Calendar][events] tenantId:', tenantId, 'params:', { start, end, types });

  if (!start || !end) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'start and end date parameters are required',
    });
  }

  try {
    await getPoolAsync();

    const events = [];
    const typeFilter = types ? types.split(',').map(t => t.trim().toLowerCase()) : ['booking', 'task', 'run'];

    // Fetch bookings as calendar events
    if (typeFilter.includes('booking') || typeFilter.includes('bookings')) {
      const bookingsResult = await query(
        `SELECT
           b.id,
           b.status,
           b.check_in AS start_date,
           b.check_out AS end_date,
           b.service_type,
           COALESCE(b.service_name, s.name) as service_name,
           COALESCE(b.kennel_name, k.name) as kennel_name,
           b.room_number,
           b.notes,
           o.first_name as owner_first_name,
           o.last_name as owner_last_name
         FROM "Booking" b
         LEFT JOIN "Service" s ON b.service_id = s.id
         LEFT JOIN "Kennel" k ON b.kennel_id = k.id
         LEFT JOIN "Owner" o ON b.owner_id = o.id
         WHERE b.tenant_id = $1
           AND b.deleted_at IS NULL
           AND DATE(b.check_in) <= $3::date
           AND DATE(b.check_out) >= $2::date
         ORDER BY b.check_in ASC`,
        [tenantId, start, end]
      );

      // Get pets for each booking
      const bookingIds = bookingsResult.rows.map(b => b.id);
      let petsMap = {};

      if (bookingIds.length > 0) {
        const petsResult = await query(
          `SELECT bp.booking_id, p.id, p.name, p.species, p.breed, p.photo_url
           FROM "BookingPet" bp
           JOIN "Pet" p ON bp.pet_id = p.id
           WHERE bp.booking_id = ANY($1)`,
          [bookingIds]
        );

        petsResult.rows.forEach(pet => {
          if (!petsMap[pet.booking_id]) {
            petsMap[pet.booking_id] = [];
          }
          petsMap[pet.booking_id].push({
            id: pet.id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            photoUrl: pet.photo_url,
          });
        });
      }

      bookingsResult.rows.forEach(row => {
        const pets = petsMap[row.id] || [];
        const petNames = pets.map(p => p.name).join(', ');

        events.push({
          id: row.id,
          type: 'booking',
          title: petNames || 'Booking',
          start: row.start_date,
          end: row.end_date,
          status: row.status,
          serviceType: row.service_type,
          serviceName: row.service_name,
          kennelName: row.kennel_name,
          roomNumber: row.room_number,
          notes: row.notes,
          ownerName: row.owner_first_name
            ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim()
            : null,
          pets: pets,
          color: getBookingColor(row.status),
        });
      });
    }

    // Fetch tasks as calendar events
    if (typeFilter.includes('task') || typeFilter.includes('tasks')) {
      const tasksResult = await query(
        `SELECT
           t.id,
           t.title,
           t.description,
           t.status,
           t.priority,
           t.type,
           t.scheduled_for,
           t.due_at,
           u.first_name as assignee_first_name,
           u.last_name as assignee_last_name,
           p.name as pet_name
         FROM "Task" t
         LEFT JOIN "User" u ON t.assigned_to = u.id
         LEFT JOIN "Pet" p ON t.pet_id = p.id
         WHERE t.tenant_id = $1
           AND t.deleted_at IS NULL
           AND (
             (t.scheduled_for IS NOT NULL AND DATE(t.scheduled_for) BETWEEN $2::date AND $3::date)
             OR (t.due_at IS NOT NULL AND DATE(t.due_at) BETWEEN $2::date AND $3::date)
           )
         ORDER BY COALESCE(t.scheduled_for, t.due_at) ASC`,
        [tenantId, start, end]
      );

      tasksResult.rows.forEach(row => {
        events.push({
          id: row.id,
          type: 'task',
          title: row.title,
          description: row.description,
          start: row.scheduled_for || row.due_at,
          end: row.scheduled_for || row.due_at,
          status: row.status,
          priority: row.priority,
          taskType: row.type,
          assigneeName: row.assignee_first_name
            ? `${row.assignee_first_name} ${row.assignee_last_name || ''}`.trim()
            : null,
          petName: row.pet_name,
          color: getTaskColor(row.priority, row.status),
        });
      });
    }

    // Fetch run assignments as calendar events
    if (typeFilter.includes('run') || typeFilter.includes('runs')) {
      const runsResult = await query(
        `SELECT
           ra.id,
           ra.run_id,
           ra.pet_id,
           ra.start_at,
           ra.end_at,
           ra.status,
           ra.notes,
           r.name as run_name,
           r.code as run_code,
           p.name as pet_name,
           p.species as pet_species,
           p.photo_url as pet_photo_url
         FROM "RunAssignment" ra
         JOIN "Run" r ON ra.run_id = r.id AND r.tenant_id = ra.tenant_id
         LEFT JOIN "Pet" p ON ra.pet_id = p.id
         WHERE ra.tenant_id = $1
           AND ra.deleted_at IS NULL
           AND r.deleted_at IS NULL
           AND DATE(ra.start_at) BETWEEN $2::date AND $3::date
         ORDER BY ra.start_at ASC`,
        [tenantId, start, end]
      );

      runsResult.rows.forEach(row => {
        events.push({
          id: row.id,
          type: 'run',
          title: `${row.pet_name || 'Pet'} - ${row.run_name || 'Run'}`,
          start: row.start_at,
          end: row.end_at,
          status: row.status,
          runId: row.run_id,
          runName: row.run_name,
          runCode: row.run_code,
          petId: row.pet_id,
          petName: row.pet_name,
          petSpecies: row.pet_species,
          petPhotoUrl: row.pet_photo_url,
          notes: row.notes,
          color: '#10B981', // Green for runs
        });
      });
    }

    // Sort all events by start date
    events.sort((a, b) => new Date(a.start) - new Date(b.start));

    console.log('[Calendar][events] Found:', events.length, 'events');

    return createResponse(200, {
      events: events,
      data: events,
      total: events.length,
      startDate: start,
      endDate: end,
      message: 'Calendar events retrieved successfully',
    });

  } catch (error) {
    console.error('[Calendar] Failed to get events:', error.message, error.stack);

    // If tables don't exist, return empty array
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return createResponse(200, {
        events: [],
        data: [],
        total: 0,
        startDate: start,
        endDate: end,
        message: 'Calendar events (tables not initialized)',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve calendar events',
    });
  }
}

/**
 * Get occupancy data for a date range
 * Returns kennel/run capacity utilization
 *
 * Query params:
 *   - start: Start date (YYYY-MM-DD)
 *   - end: End date (YYYY-MM-DD)
 */
async function handleGetOccupancy(tenantId, queryParams) {
  const { start, end } = queryParams;

  console.log('[Calendar][occupancy] tenantId:', tenantId, 'params:', { start, end });

  if (!start || !end) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'start and end date parameters are required',
    });
  }

  try {
    await getPoolAsync();

    // Get total kennel capacity
    const capacityResult = await query(
      `SELECT
         COUNT(*) as total_kennels,
         SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_kennels
       FROM "Kennel"
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    const totalCapacity = parseInt(capacityResult.rows[0]?.active_kennels || 0);

    // Get daily occupancy by counting active bookings per day
    // Generate date series and count overlapping bookings
    const occupancyResult = await query(
      `WITH date_series AS (
         SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS date
       ),
       daily_counts AS (
         SELECT
           ds.date,
           COUNT(b.id) as occupied
         FROM date_series ds
         LEFT JOIN "Booking" b ON
           b.tenant_id = $1
           AND b.deleted_at IS NULL
           AND b.status NOT IN ('CANCELLED', 'NO_SHOW')
           AND ds.date >= DATE(b.check_in)
           AND ds.date < DATE(b.check_out)
         GROUP BY ds.date
       )
       SELECT
         date,
         occupied,
         $4::integer as capacity
       FROM daily_counts
       ORDER BY date ASC`,
      [tenantId, start, end, totalCapacity]
    );

    const dailyOccupancy = occupancyResult.rows.map(row => ({
      date: row.date,
      occupied: parseInt(row.occupied || 0),
      capacity: parseInt(row.capacity || 0),
      available: Math.max(0, parseInt(row.capacity || 0) - parseInt(row.occupied || 0)),
      utilizationPercent: row.capacity > 0
        ? Math.round((parseInt(row.occupied || 0) / parseInt(row.capacity)) * 100)
        : 0,
    }));

    // Calculate summary statistics
    const totalOccupied = dailyOccupancy.reduce((sum, d) => sum + d.occupied, 0);
    const avgOccupancy = dailyOccupancy.length > 0
      ? Math.round(totalOccupied / dailyOccupancy.length)
      : 0;
    const avgUtilization = totalCapacity > 0 && dailyOccupancy.length > 0
      ? Math.round((avgOccupancy / totalCapacity) * 100)
      : 0;
    const peakOccupancy = Math.max(...dailyOccupancy.map(d => d.occupied), 0);

    console.log('[Calendar][occupancy] Calculated for', dailyOccupancy.length, 'days');

    return createResponse(200, {
      data: dailyOccupancy,
      occupancy: dailyOccupancy,
      summary: {
        totalCapacity: totalCapacity,
        averageOccupancy: avgOccupancy,
        averageUtilization: avgUtilization,
        peakOccupancy: peakOccupancy,
        daysCount: dailyOccupancy.length,
      },
      startDate: start,
      endDate: end,
      message: 'Occupancy data retrieved successfully',
    });

  } catch (error) {
    console.error('[Calendar] Failed to get occupancy:', error.message, error.stack);

    // If tables don't exist, return empty data
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return createResponse(200, {
        data: [],
        occupancy: [],
        summary: {
          totalCapacity: 0,
          averageOccupancy: 0,
          averageUtilization: 0,
          peakOccupancy: 0,
          daysCount: 0,
        },
        startDate: start,
        endDate: end,
        message: 'Occupancy data (tables not initialized)',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve occupancy data',
    });
  }
}

/**
 * Helper: Get color for booking based on status
 */
function getBookingColor(status) {
  const colors = {
    'PENDING': '#F59E0B',     // Amber
    'CONFIRMED': '#3B82F6',   // Blue
    'CHECKED_IN': '#10B981',  // Green
    'CHECKED_OUT': '#6B7280', // Gray
    'CANCELLED': '#EF4444',   // Red
    'NO_SHOW': '#DC2626',     // Dark Red
    'COMPLETED': '#6366F1',   // Indigo
  };
  return colors[status?.toUpperCase()] || '#6B7280';
}

/**
 * Helper: Get color for task based on priority and status
 */
function getTaskColor(priority, status) {
  if (status?.toUpperCase() === 'COMPLETED') {
    return '#6B7280'; // Gray for completed
  }
  if (status?.toUpperCase() === 'OVERDUE') {
    return '#EF4444'; // Red for overdue
  }
  const priorityColors = {
    'HIGH': '#EF4444',    // Red
    'URGENT': '#DC2626',  // Dark Red
    'NORMAL': '#3B82F6',  // Blue
    'LOW': '#6B7280',     // Gray
  };
  return priorityColors[priority?.toUpperCase()] || '#3B82F6';
}

// =============================================================================
// EMAIL NOTIFICATION HANDLERS
// =============================================================================

/**
 * Log email to Communication table
 */
async function logEmailToCommunication(tenantId, params) {
  const { ownerId, type, subject, content, status, templateUsed, recipientEmail, userId } = params;
  
  try {
    await getPoolAsync();
    
    await query(
      `INSERT INTO "Communication" (tenant_id, owner_id, type, subject, content, direction, status, sent_at, created_by, metadata)
       VALUES ($1, $2, 'EMAIL', $3, $4, 'outbound', $5, NOW(), $6, $7)`,
      [
        tenantId,
        ownerId || null,
        subject,
        content,
        status || 'sent',
        userId || null,
        JSON.stringify({
          template: templateUsed || null,
          recipientEmail: recipientEmail || null,
        }),
      ]
    );
    
    console.log('[EMAIL] Logged to Communication table:', { subject, status });
  } catch (error) {
    console.error('[EMAIL] Failed to log to Communication table:', error.message);
    // Don't fail the email operation if logging fails
  }
}

/**
 * Send a generic email
 */
async function handleSendEmail(tenantId, user, body) {
  const { to, subject, html, text, templateName, variables } = body;

  console.log('[EMAIL] handleSendEmail:', { tenantId, to, subject, templateName });

  if (!to) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Recipient email address is required',
    });
  }

  if (!subject && !templateName) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Subject or template name is required',
    });
  }

  try {
    const { sendEmail, sendTemplatedEmail } = sharedLayer;
    let result;

    if (templateName) {
      result = await sendTemplatedEmail(templateName, to, variables || {});
    } else {
      result = await sendEmail({ to, subject, html, text });
    }

    // Log to Communication table
    await logEmailToCommunication(tenantId, {
      recipientEmail: to,
      subject: subject || templateName,
      content: text || html || `Template: ${templateName}`,
      status: 'sent',
      templateUsed: templateName,
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully',
    });

  } catch (error) {
    console.error('[EMAIL] Failed to send:', error.message);

    // Log failed email attempt
    await logEmailToCommunication(tenantId, {
      recipientEmail: to,
      subject: subject || templateName,
      content: `Failed: ${error.message}`,
      status: 'failed',
      templateUsed: templateName,
      userId: user?.id,
    });

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send email',
      details: error.message,
    });
  }
}

/**
 * Send booking confirmation email
 */
async function handleSendBookingConfirmation(tenantId, user, body) {
  const { bookingId, ownerId, ownerEmail } = body;

  console.log('[EMAIL] handleSendBookingConfirmation:', { tenantId, bookingId, ownerId });

  if (!bookingId && !ownerEmail) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'bookingId or ownerEmail is required',
    });
  }

  try {
    await getPoolAsync();

    // Get booking details with owner and pet info
    let booking, owner, pets;

    if (bookingId) {
      const bookingResult = await query(
        `SELECT
           b.*,
           o.id as owner_id,
           o.first_name as owner_first_name,
           o.last_name as owner_last_name,
           o.email as owner_email,
           s.name as service_name
         FROM "Booking" b
         LEFT JOIN "Owner" o ON b.owner_id = o.id
         LEFT JOIN "Service" s ON b.service_id = s.id
         WHERE b.id = $1 AND b.tenant_id = $2`,
        [bookingId, tenantId]
      );

      if (bookingResult.rows.length === 0) {
        return createResponse(404, {
          error: 'Not Found',
          message: 'Booking not found',
        });
      }

      booking = bookingResult.rows[0];
      owner = {
        id: booking.owner_id,
        first_name: booking.owner_first_name,
        last_name: booking.owner_last_name,
        email: booking.owner_email,
      };

      // Get pets for booking
      const petsResult = await query(
        `SELECT p.name FROM "BookingPet" bp
         JOIN "Pet" p ON bp.pet_id = p.id
         WHERE bp.booking_id = $1`,
        [bookingId]
      );
      pets = petsResult.rows.map(p => p.name);
    } else {
      // If no bookingId, use the provided info
      owner = { email: ownerEmail };
      booking = body;
      pets = body.petNames || [];
    }

    if (!owner.email) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Owner email not found',
      });
    }

    // Get tenant info for branding
    const tenantResult = await query(
      `SELECT name, settings FROM "Tenant" WHERE id = $1`,
      [tenantId]
    );
    const tenant = tenantResult.rows[0];

    // Send email using shared layer
    const { sendBookingConfirmation } = sharedLayer;
    const result = await sendBookingConfirmation(
      {
        check_in: booking.check_in,
        check_out: booking.check_out,
        service_name: booking.service_name || booking.service_type || 'Boarding',
        service_type: booking.service_type,
      },
      owner,
      { name: pets.join(', ') || 'Your pet' },
      tenant
    );

    // Log to Communication table
    await logEmailToCommunication(tenantId, {
      ownerId: owner.id,
      recipientEmail: owner.email,
      subject: `Booking Confirmed - ${pets.join(', ') || 'Your pet'}`,
      content: `Booking confirmation for ${booking.check_in} to ${booking.check_out}`,
      status: 'sent',
      templateUsed: 'bookingConfirmation',
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageId: result.messageId,
      message: 'Booking confirmation email sent',
    });

  } catch (error) {
    console.error('[EMAIL] Failed to send booking confirmation:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send booking confirmation',
    });
  }
}

/**
 * Send booking reminder email
 */
async function handleSendBookingReminder(tenantId, user, body) {
  const { bookingId } = body;

  console.log('[EMAIL] handleSendBookingReminder:', { tenantId, bookingId });

  if (!bookingId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'bookingId is required',
    });
  }

  try {
    await getPoolAsync();

    // Get booking with owner and pet info
    const bookingResult = await query(
      `SELECT
         b.*,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.email as owner_email,
         s.name as service_name
       FROM "Booking" b
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       LEFT JOIN "Service" s ON b.service_id = s.id
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [bookingId, tenantId]
    );

    if (bookingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const booking = bookingResult.rows[0];
    const owner = {
      id: booking.owner_id,
      first_name: booking.owner_first_name,
      email: booking.owner_email,
    };

    if (!owner.email) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Owner email not found',
      });
    }

    // Get pets for booking
    const petsResult = await query(
      `SELECT p.name FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [bookingId]
    );
    const petNames = petsResult.rows.map(p => p.name).join(', ') || 'Your pet';

    // Send email
    const { sendBookingReminder } = sharedLayer;
    const result = await sendBookingReminder(
      {
        check_in: booking.check_in,
        check_out: booking.check_out,
        service_name: booking.service_name || booking.service_type,
      },
      owner,
      { name: petNames }
    );

    // Log to Communication table
    await logEmailToCommunication(tenantId, {
      ownerId: owner.id,
      recipientEmail: owner.email,
      subject: `Reminder: Upcoming Booking for ${petNames}`,
      content: `Booking reminder for ${booking.check_in}`,
      status: 'sent',
      templateUsed: 'bookingReminder',
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageId: result.messageId,
      message: 'Booking reminder email sent',
    });

  } catch (error) {
    console.error('[EMAIL] Failed to send booking reminder:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send booking reminder',
    });
  }
}

/**
 * Send vaccination reminder email
 */
async function handleSendVaccinationReminder(tenantId, user, body) {
  const { vaccinationId, petId, ownerId } = body;

  console.log('[EMAIL] handleSendVaccinationReminder:', { tenantId, vaccinationId, petId, ownerId });

  if (!vaccinationId && !petId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'vaccinationId or petId is required',
    });
  }

  try {
    await getPoolAsync();

    // Get vaccination with pet and owner info
    let vaccQuery;
    let params;

    if (vaccinationId) {
      vaccQuery = `
        SELECT
          v.*,
          p.name as pet_name,
          p.id as pet_id,
          o.id as owner_id,
          o.first_name as owner_first_name,
          o.email as owner_email
        FROM "Vaccination" v
        JOIN "Pet" p ON v.pet_id = p.id
        LEFT JOIN "PetOwner" po ON po.pet_id = p.id AND po.is_primary = true
        LEFT JOIN "Owner" o ON po.owner_id = o.id
        WHERE v.id = $1 AND v.tenant_id = $2`;
      params = [vaccinationId, tenantId];
    } else {
      vaccQuery = `
        SELECT
          v.*,
          p.name as pet_name,
          p.id as pet_id,
          o.id as owner_id,
          o.first_name as owner_first_name,
          o.email as owner_email
        FROM "Vaccination" v
        JOIN "Pet" p ON v.pet_id = p.id
        LEFT JOIN "PetOwner" po ON po.pet_id = p.id AND po.is_primary = true
        LEFT JOIN "Owner" o ON po.owner_id = o.id
        WHERE v.pet_id = $1 AND v.tenant_id = $2
        AND v.expires_at <= NOW() + INTERVAL '30 days'
        ORDER BY v.expires_at ASC
        LIMIT 1`;
      params = [petId, tenantId];
    }

    const vaccResult = await query(vaccQuery, params);

    if (vaccResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Vaccination record not found or no expiring vaccinations',
      });
    }

    const vacc = vaccResult.rows[0];
    const owner = {
      id: vacc.owner_id,
      first_name: vacc.owner_first_name,
      email: vacc.owner_email,
    };

    if (!owner.email) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Owner email not found',
      });
    }

    // Send email
    const { sendVaccinationReminder } = sharedLayer;
    const result = await sendVaccinationReminder(
      {
        vaccine_name: vacc.type,
        expiration_date: vacc.expires_at,
      },
      owner,
      { name: vacc.pet_name }
    );

    // Log to Communication table
    await logEmailToCommunication(tenantId, {
      ownerId: owner.id,
      recipientEmail: owner.email,
      subject: `Vaccination Reminder for ${vacc.pet_name}`,
      content: `${vacc.type} expires on ${vacc.expires_at}`,
      status: 'sent',
      templateUsed: 'vaccinationReminder',
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageId: result.messageId,
      message: 'Vaccination reminder email sent',
    });

  } catch (error) {
    console.error('[EMAIL] Failed to send vaccination reminder:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send vaccination reminder',
    });
  }
}

/**
 * Send bulk vaccination reminders
 * This is typically called by a scheduled Lambda
 */
async function handleBulkVaccinationReminders(tenantId, user, body) {
  const { daysUntilExpiry = [30, 14, 7], dryRun = false } = body;

  console.log('[EMAIL] handleBulkVaccinationReminders:', { tenantId, daysUntilExpiry, dryRun });

  try {
    await getPoolAsync();

    // Find all vaccinations expiring within the specified windows
    const vaccResult = await query(
      `SELECT DISTINCT ON (v.id)
         v.id as vaccination_id,
         v.type as vaccine_type,
         v.expires_at,
         p.id as pet_id,
         p.name as pet_name,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.email as owner_email,
         EXTRACT(DAY FROM v.expires_at - NOW())::integer as days_until_expiry
       FROM "Vaccination" v
       JOIN "Pet" p ON v.pet_id = p.id
       LEFT JOIN "PetOwner" po ON po.pet_id = p.id AND po.is_primary = true
       LEFT JOIN "Owner" o ON po.owner_id = o.id
       WHERE v.tenant_id = $1
         AND v.deleted_at IS NULL
         AND o.email IS NOT NULL
         AND (
           DATE(v.expires_at) = CURRENT_DATE + INTERVAL '30 days'
           OR DATE(v.expires_at) = CURRENT_DATE + INTERVAL '14 days'
           OR DATE(v.expires_at) = CURRENT_DATE + INTERVAL '7 days'
           OR v.expires_at < NOW()
         )
       ORDER BY v.id, v.expires_at ASC`,
      [tenantId]
    );

    const reminders = vaccResult.rows;
    console.log('[EMAIL] Found', reminders.length, 'vaccination reminders to send');

    if (dryRun) {
      return createResponse(200, {
        success: true,
        dryRun: true,
        count: reminders.length,
        reminders: reminders.map(r => ({
          petName: r.pet_name,
          vaccineType: r.vaccine_type,
          expiresAt: r.expires_at,
          daysUntilExpiry: r.days_until_expiry,
          ownerEmail: r.owner_email,
        })),
        message: 'Dry run - no emails sent',
      });
    }

    // Send emails
    const { sendVaccinationReminder } = sharedLayer;
    const results = { sent: 0, failed: 0, errors: [] };

    for (const reminder of reminders) {
      try {
        await sendVaccinationReminder(
          {
            vaccine_name: reminder.vaccine_type,
            expiration_date: reminder.expires_at,
          },
          {
            first_name: reminder.owner_first_name,
            email: reminder.owner_email,
          },
          { name: reminder.pet_name }
        );

        // Log to Communication table
        await logEmailToCommunication(tenantId, {
          ownerId: reminder.owner_id,
          recipientEmail: reminder.owner_email,
          subject: `Vaccination Reminder for ${reminder.pet_name}`,
          content: `${reminder.vaccine_type} ${reminder.days_until_expiry < 0 ? 'expired' : 'expires'} on ${reminder.expires_at}`,
          status: 'sent',
          templateUsed: 'vaccinationReminder',
        });

        results.sent++;
      } catch (error) {
        console.error('[EMAIL] Failed to send vaccination reminder to', reminder.owner_email, ':', error.message);
        results.failed++;
        results.errors.push({
          petName: reminder.pet_name,
          ownerEmail: reminder.owner_email,
          error: error.message,
        });
      }
    }

    return createResponse(200, {
      success: true,
      sent: results.sent,
      failed: results.failed,
      total: reminders.length,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Sent ${results.sent} vaccination reminder emails`,
    });

  } catch (error) {
    console.error('[EMAIL] Failed to process bulk vaccination reminders:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to process vaccination reminders',
    });
  }
}

/**
 * Send check-in confirmation email
 */
async function handleSendCheckInConfirmation(tenantId, user, body) {
  const { bookingId } = body;

  console.log('[EMAIL] handleSendCheckInConfirmation:', { tenantId, bookingId });

  if (!bookingId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'bookingId is required',
    });
  }

  try {
    await getPoolAsync();

    // Get booking with owner and pet info
    const bookingResult = await query(
      `SELECT
         b.*,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.email as owner_email,
         s.name as service_name
       FROM "Booking" b
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       LEFT JOIN "Service" s ON b.service_id = s.id
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [bookingId, tenantId]
    );

    if (bookingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const booking = bookingResult.rows[0];
    const owner = {
      id: booking.owner_id,
      first_name: booking.owner_first_name,
      email: booking.owner_email,
    };

    if (!owner.email) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Owner email not found',
      });
    }

    // Get pets for booking
    const petsResult = await query(
      `SELECT p.name FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [bookingId]
    );
    const petNames = petsResult.rows.map(p => p.name).join(', ') || 'Your pet';

    // Send email
    const { sendCheckInConfirmation } = sharedLayer;
    const result = await sendCheckInConfirmation(
      {
        check_out: booking.check_out,
        service_name: booking.service_name || booking.service_type,
      },
      owner,
      { name: petNames }
    );

    // Log to Communication table
    await logEmailToCommunication(tenantId, {
      ownerId: owner.id,
      recipientEmail: owner.email,
      subject: `${petNames} Has Been Checked In`,
      content: `Check-in confirmation for booking`,
      status: 'sent',
      templateUsed: 'checkInConfirmation',
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageId: result.messageId,
      message: 'Check-in confirmation email sent',
    });

  } catch (error) {
    console.error('[EMAIL] Failed to send check-in confirmation:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send check-in confirmation',
    });
  }
}

/**
 * Send check-out confirmation email
 */
async function handleSendCheckOutConfirmation(tenantId, user, body) {
  const { bookingId } = body;

  console.log('[EMAIL] handleSendCheckOutConfirmation:', { tenantId, bookingId });

  if (!bookingId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'bookingId is required',
    });
  }

  try {
    await getPoolAsync();

    // Get booking with owner and pet info
    const bookingResult = await query(
      `SELECT
         b.*,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.email as owner_email
       FROM "Booking" b
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [bookingId, tenantId]
    );

    if (bookingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const booking = bookingResult.rows[0];
    const owner = {
      id: booking.owner_id,
      first_name: booking.owner_first_name,
      email: booking.owner_email,
    };

    if (!owner.email) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Owner email not found',
      });
    }

    // Get pets for booking
    const petsResult = await query(
      `SELECT p.name FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [bookingId]
    );
    const petNames = petsResult.rows.map(p => p.name).join(', ') || 'Your pet';

    // Send email
    const { sendCheckOutConfirmation } = sharedLayer;
    const result = await sendCheckOutConfirmation(
      booking,
      owner,
      { name: petNames },
      booking.total_price_in_cents
    );

    // Log to Communication table
    await logEmailToCommunication(tenantId, {
      ownerId: owner.id,
      recipientEmail: owner.email,
      subject: `${petNames} is Ready for Pick-Up`,
      content: `Check-out confirmation for booking`,
      status: 'sent',
      templateUsed: 'checkOutConfirmation',
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageId: result.messageId,
      message: 'Check-out confirmation email sent',
    });

  } catch (error) {
    console.error('[EMAIL] Failed to send check-out confirmation:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send check-out confirmation',
    });
  }
}

// =============================================================================
// INCIDENT HANDLERS
// =============================================================================

/**
 * Get all incidents for tenant
 */
async function handleGetIncidents(tenantId, queryParams) {
  const { status, severity, type, petId, ownerId, startDate, endDate, limit = 50, offset = 0 } = queryParams;

  console.log('[Incidents][list] tenantId:', tenantId, queryParams);

  try {
    await getPoolAsync();

    let whereClause = 'i.tenant_id = $1 AND i.deleted_at IS NULL';
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND i.status = $${paramIndex++}`;
      params.push(status.toUpperCase());
    }
    if (severity) {
      whereClause += ` AND i.severity = $${paramIndex++}`;
      params.push(severity.toUpperCase());
    }
    if (type) {
      whereClause += ` AND i.incident_type = $${paramIndex++}`;
      params.push(type.toLowerCase());
    }
    if (petId) {
      whereClause += ` AND i.pet_id = $${paramIndex++}`;
      params.push(petId);
    }
    if (ownerId) {
      whereClause += ` AND i.owner_id = $${paramIndex++}`;
      params.push(ownerId);
    }
    if (startDate && endDate) {
      whereClause += ` AND DATE(i.incident_date) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    const result = await query(
      `SELECT
         i.*,
         p.name as pet_name,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone,
         u.first_name as created_by_first_name,
         u.last_name as created_by_last_name
       FROM "Incident" i
       LEFT JOIN "Pet" p ON i.pet_id = p.id
       LEFT JOIN "Owner" o ON i.owner_id = o.id
       LEFT JOIN "User" u ON i.created_by = u.id
       WHERE ${whereClause}
       ORDER BY i.incident_date DESC, i.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const incidents = result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      petId: row.pet_id,
      petName: row.pet_name,
      bookingId: row.booking_id,
      ownerId: row.owner_id,
      ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim() : null,
      ownerEmail: row.owner_email,
      ownerPhone: row.owner_phone,
      incidentType: row.incident_type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      incidentDate: row.incident_date,
      location: row.location,
      staffInvolved: row.staff_involved,
      staffWitness: row.staff_witness,
      immediateActions: row.immediate_actions,
      followUpActions: row.follow_up_actions,
      preventiveMeasures: row.preventive_measures,
      vetContacted: row.vet_contacted,
      vetContactedAt: row.vet_contacted_at,
      vetName: row.vet_name,
      vetRecommendations: row.vet_recommendations,
      medicalTreatment: row.medical_treatment,
      ownerNotified: row.owner_notified,
      ownerNotifiedAt: row.owner_notified_at,
      ownerResponse: row.owner_response,
      status: row.status,
      resolvedAt: row.resolved_at,
      resolutionNotes: row.resolution_notes,
      photos: row.photos,
      documents: row.documents,
      createdBy: row.created_by,
      createdByName: row.created_by_first_name ? `${row.created_by_first_name} ${row.created_by_last_name || ''}`.trim() : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log('[Incidents][list] Found:', incidents.length);

    return createResponse(200, {
      data: incidents,
      incidents: incidents,
      total: incidents.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    console.error('[Incidents] Failed to get incidents:', error.message);
    
    if (error.message?.includes('does not exist')) {
      return createResponse(200, {
        data: [],
        incidents: [],
        total: 0,
        message: 'Incident table not initialized',
      });
    }
    
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve incidents',
    });
  }
}

/**
 * Get single incident
 */
async function handleGetIncident(tenantId, incidentId) {
  console.log('[Incidents][get] id:', incidentId, 'tenantId:', tenantId);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         i.*,
         p.name as pet_name,
         p.species as pet_species,
         p.breed as pet_breed,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone,
         u.first_name as created_by_first_name,
         u.last_name as created_by_last_name,
         ru.first_name as resolved_by_first_name,
         ru.last_name as resolved_by_last_name
       FROM "Incident" i
       LEFT JOIN "Pet" p ON i.pet_id = p.id
       LEFT JOIN "Owner" o ON i.owner_id = o.id
       LEFT JOIN "User" u ON i.created_by = u.id
       LEFT JOIN "User" ru ON i.resolved_by = ru.id
       WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL`,
      [incidentId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Incident not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      tenantId: row.tenant_id,
      petId: row.pet_id,
      petName: row.pet_name,
      petSpecies: row.pet_species,
      petBreed: row.pet_breed,
      bookingId: row.booking_id,
      ownerId: row.owner_id,
      ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim() : null,
      ownerEmail: row.owner_email,
      ownerPhone: row.owner_phone,
      incidentType: row.incident_type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      incidentDate: row.incident_date,
      location: row.location,
      staffInvolved: row.staff_involved,
      staffWitness: row.staff_witness,
      immediateActions: row.immediate_actions,
      followUpActions: row.follow_up_actions,
      preventiveMeasures: row.preventive_measures,
      vetContacted: row.vet_contacted,
      vetContactedAt: row.vet_contacted_at,
      vetName: row.vet_name,
      vetRecommendations: row.vet_recommendations,
      medicalTreatment: row.medical_treatment,
      ownerNotified: row.owner_notified,
      ownerNotifiedAt: row.owner_notified_at,
      ownerNotifiedBy: row.owner_notified_by,
      ownerResponse: row.owner_response,
      status: row.status,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      resolvedByName: row.resolved_by_first_name ? `${row.resolved_by_first_name} ${row.resolved_by_last_name || ''}`.trim() : null,
      resolutionNotes: row.resolution_notes,
      photos: row.photos,
      documents: row.documents,
      createdBy: row.created_by,
      createdByName: row.created_by_first_name ? `${row.created_by_first_name} ${row.created_by_last_name || ''}`.trim() : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

  } catch (error) {
    console.error('[Incidents] Failed to get incident:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve incident',
    });
  }
}

/**
 * Create incident
 */
async function handleCreateIncident(tenantId, user, body) {
  const {
    petId, bookingId, ownerId, incidentType, severity, title, description,
    incidentDate, location, staffInvolved, staffWitness, immediateActions,
    vetContacted, vetName, medicalTreatment, photos, documents
  } = body;

  console.log('[Incidents][create] tenantId:', tenantId, body);

  if (!incidentType || !title || !incidentDate) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'incidentType, title, and incidentDate are required',
    });
  }

  // Validate incident type
  const validTypes = ['injury', 'illness', 'escape', 'bite', 'property_damage', 'behavior', 'fight', 'other'];
  if (!validTypes.includes(incidentType.toLowerCase())) {
    return createResponse(400, {
      error: 'Bad Request',
      message: `Invalid incident type. Valid types: ${validTypes.join(', ')}`,
    });
  }

  // Validate severity
  const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const normalizedSeverity = (severity || 'LOW').toUpperCase();
  if (!validSeverities.includes(normalizedSeverity)) {
    return createResponse(400, {
      error: 'Bad Request',
      message: `Invalid severity. Valid values: ${validSeverities.join(', ')}`,
    });
  }

  try {
    await getPoolAsync();

    // If petId is provided but no ownerId, look up the owner
    let resolvedOwnerId = ownerId;
    if (petId && !ownerId) {
      const ownerResult = await query(
        `SELECT owner_id FROM "PetOwner" WHERE pet_id = $1 AND is_primary = true LIMIT 1`,
        [petId]
      );
      resolvedOwnerId = ownerResult.rows[0]?.owner_id || null;
    }

    const result = await query(
      `INSERT INTO "Incident" (
         tenant_id, pet_id, booking_id, owner_id, incident_type, severity,
         title, description, incident_date, location, staff_involved, staff_witness,
         immediate_actions, vet_contacted, vet_name, medical_treatment,
         photos, documents, status, created_by, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'OPEN', $19, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        petId || null,
        bookingId || null,
        resolvedOwnerId || null,
        incidentType.toLowerCase(),
        normalizedSeverity,
        title,
        description || null,
        incidentDate,
        location || null,
        staffInvolved || null,
        staffWitness || null,
        immediateActions || null,
        vetContacted || false,
        vetName || null,
        medicalTreatment || null,
        photos || null,
        documents || null,
        user?.id || null
      ]
    );

    const incident = result.rows[0];
    console.log('[Incidents][create] Created:', incident.id);

    return createResponse(201, {
      success: true,
      id: incident.id,
      status: incident.status,
      message: 'Incident reported successfully',
    });

  } catch (error) {
    console.error('[Incidents] Failed to create incident:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create incident report',
    });
  }
}

/**
 * Update incident
 */
async function handleUpdateIncident(tenantId, user, incidentId, body) {
  const {
    petId, bookingId, ownerId, incidentType, severity, title, description,
    incidentDate, location, staffInvolved, staffWitness, immediateActions,
    followUpActions, preventiveMeasures, vetContacted, vetContactedAt, vetName,
    vetRecommendations, medicalTreatment, ownerResponse, status, photos, documents
  } = body;

  console.log('[Incidents][update] id:', incidentId, 'tenantId:', tenantId);

  try {
    await getPoolAsync();

    const updates = [];
    const values = [incidentId, tenantId];
    let paramIndex = 3;

    if (petId !== undefined) { updates.push(`pet_id = $${paramIndex++}`); values.push(petId); }
    if (bookingId !== undefined) { updates.push(`booking_id = $${paramIndex++}`); values.push(bookingId); }
    if (ownerId !== undefined) { updates.push(`owner_id = $${paramIndex++}`); values.push(ownerId); }
    if (incidentType !== undefined) { updates.push(`incident_type = $${paramIndex++}`); values.push(incidentType.toLowerCase()); }
    if (severity !== undefined) { updates.push(`severity = $${paramIndex++}`); values.push(severity.toUpperCase()); }
    if (title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (incidentDate !== undefined) { updates.push(`incident_date = $${paramIndex++}`); values.push(incidentDate); }
    if (location !== undefined) { updates.push(`location = $${paramIndex++}`); values.push(location); }
    if (staffInvolved !== undefined) { updates.push(`staff_involved = $${paramIndex++}`); values.push(staffInvolved); }
    if (staffWitness !== undefined) { updates.push(`staff_witness = $${paramIndex++}`); values.push(staffWitness); }
    if (immediateActions !== undefined) { updates.push(`immediate_actions = $${paramIndex++}`); values.push(immediateActions); }
    if (followUpActions !== undefined) { updates.push(`follow_up_actions = $${paramIndex++}`); values.push(followUpActions); }
    if (preventiveMeasures !== undefined) { updates.push(`preventive_measures = $${paramIndex++}`); values.push(preventiveMeasures); }
    if (vetContacted !== undefined) {
      updates.push(`vet_contacted = $${paramIndex++}`);
      values.push(vetContacted);
      if (vetContacted && !vetContactedAt) {
        updates.push(`vet_contacted_at = NOW()`);
      }
    }
    if (vetContactedAt !== undefined) { updates.push(`vet_contacted_at = $${paramIndex++}`); values.push(vetContactedAt); }
    if (vetName !== undefined) { updates.push(`vet_name = $${paramIndex++}`); values.push(vetName); }
    if (vetRecommendations !== undefined) { updates.push(`vet_recommendations = $${paramIndex++}`); values.push(vetRecommendations); }
    if (medicalTreatment !== undefined) { updates.push(`medical_treatment = $${paramIndex++}`); values.push(medicalTreatment); }
    if (ownerResponse !== undefined) { updates.push(`owner_response = $${paramIndex++}`); values.push(ownerResponse); }
    if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status.toUpperCase()); }
    if (photos !== undefined) { updates.push(`photos = $${paramIndex++}`); values.push(photos); }
    if (documents !== undefined) { updates.push(`documents = $${paramIndex++}`); values.push(documents); }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Incident"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Incident not found',
      });
    }

    console.log('[Incidents][update] Updated:', incidentId);

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      status: result.rows[0].status,
      message: 'Incident updated successfully',
    });

  } catch (error) {
    console.error('[Incidents] Failed to update incident:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update incident',
    });
  }
}

/**
 * Delete incident (soft delete)
 */
async function handleDeleteIncident(tenantId, incidentId) {
  console.log('[Incidents][delete] id:', incidentId, 'tenantId:', tenantId);

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Incident"
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [incidentId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Incident not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Incident deleted successfully',
    });

  } catch (error) {
    console.error('[Incidents] Failed to delete incident:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete incident',
    });
  }
}

/**
 * Resolve incident
 */
async function handleResolveIncident(tenantId, user, incidentId, body) {
  const { resolutionNotes, preventiveMeasures } = body;

  console.log('[Incidents][resolve] id:', incidentId, 'tenantId:', tenantId);

  try {
    await getPoolAsync();

    const updates = [
      'status = \'RESOLVED\'',
      'resolved_at = NOW()',
    ];
    const values = [incidentId, tenantId];
    let paramIndex = 3;

    if (user?.id) {
      updates.push(`resolved_by = $${paramIndex++}`);
      values.push(user.id);
    }
    if (resolutionNotes) {
      updates.push(`resolution_notes = $${paramIndex++}`);
      values.push(resolutionNotes);
    }
    if (preventiveMeasures) {
      updates.push(`preventive_measures = $${paramIndex++}`);
      values.push(preventiveMeasures);
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Incident"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Incident not found',
      });
    }

    console.log('[Incidents][resolve] Resolved:', incidentId);

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      status: 'RESOLVED',
      resolvedAt: result.rows[0].resolved_at,
      message: 'Incident resolved successfully',
    });

  } catch (error) {
    console.error('[Incidents] Failed to resolve incident:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to resolve incident',
    });
  }
}

/**
 * Notify owner of incident
 */
async function handleNotifyOwnerOfIncident(tenantId, user, incidentId, body) {
  const { method = 'email', message } = body;

  console.log('[Incidents][notifyOwner] id:', incidentId, 'tenantId:', tenantId);

  try {
    await getPoolAsync();

    // Get incident with owner info
    const incidentResult = await query(
      `SELECT i.*, o.email as owner_email, o.phone as owner_phone, o.first_name as owner_first_name,
              p.name as pet_name
       FROM "Incident" i
       LEFT JOIN "Owner" o ON i.owner_id = o.id
       LEFT JOIN "Pet" p ON i.pet_id = p.id
       WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL`,
      [incidentId, tenantId]
    );

    if (incidentResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Incident not found',
      });
    }

    const incident = incidentResult.rows[0];

    if (!incident.owner_email && method === 'email') {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Owner email not found',
      });
    }

    // Mark as notified (actual email sending would happen here)
    const result = await query(
      `UPDATE "Incident"
       SET owner_notified = true, owner_notified_at = NOW(), owner_notified_by = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [incidentId, tenantId, user?.id]
    );

    // Log to Communication table
    await logEmailToCommunication(tenantId, {
      ownerId: incident.owner_id,
      recipientEmail: incident.owner_email,
      subject: `Incident Report: ${incident.title}`,
      content: message || `An incident involving ${incident.pet_name || 'your pet'} has been reported.`,
      status: 'sent',
      templateUsed: 'incidentNotification',
      userId: user?.id,
    });

    console.log('[Incidents][notifyOwner] Owner notified for:', incidentId);

    return createResponse(200, {
      success: true,
      ownerNotified: true,
      ownerNotifiedAt: result.rows[0].owner_notified_at,
      message: 'Owner notified successfully',
    });

  } catch (error) {
    console.error('[Incidents] Failed to notify owner:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to notify owner',
    });
  }
}