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

const { getPoolAsync, query, softDelete, softDeleteBatch } = dbLayer;
const {
  authenticateRequest,
  createResponse,
  parseBody,
  checkPermission,
  PERMISSIONS,
  enforceLimit,
  getTenantPlan,
  createTierErrorResponse,
} = sharedLayer;

// =============================================================================
// INPUT VALIDATION HELPERS
// =============================================================================

/**
 * Validate booking dates
 * Returns array of error messages (empty if valid)
 */
function validateBookingDates(checkIn, checkOut) {
  const errors = [];
  const now = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2); // Max 2 years out

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  // Validate date formats
  if (isNaN(checkInDate.getTime())) {
    errors.push('startDate/checkIn is not a valid date');
  }
  if (isNaN(checkOutDate.getTime())) {
    errors.push('endDate/checkOut is not a valid date');
  }

  // Only validate relationships if both dates are valid
  if (errors.length === 0) {
    // Check-out must be after check-in
    if (checkOutDate <= checkInDate) {
      errors.push('endDate/checkOut must be after startDate/checkIn');
    }

    // Not too far in the past (allow 1 day grace for timezone issues)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (checkInDate < yesterday) {
      errors.push('startDate/checkIn cannot be in the past');
    }

    // Not too far in the future
    if (checkInDate > maxFutureDate) {
      errors.push('startDate/checkIn cannot be more than 2 years in the future');
    }

    // Reasonable stay duration (max 365 days)
    const stayDuration = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24);
    if (stayDuration > 365) {
      errors.push('Booking duration cannot exceed 365 days');
    }
  }

  return errors;
}

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
  // Handle admin path rewriting (Ops Center requests)
  const { handleAdminPathRewrite } = require('/opt/nodejs/index');
  handleAdminPathRewrite(event);

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

    // Booking bulk actions
    if (path === '/api/v1/operations/bookings/bulk/delete') {
      if (method === 'POST') {
        return handleBulkDeleteBookings(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/operations/bookings/bulk/update') {
      if (method === 'POST') {
        return handleBulkUpdateBookings(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/operations/bookings/bulk/export') {
      if (method === 'POST') {
        return handleBulkExportBookings(tenantId, user, parseBody(event));
      }
    }

    // Availability check endpoint - check capacity without creating booking
    if (path === '/api/v1/operations/bookings/availability' || path === '/operations/bookings/availability') {
      if (method === 'GET' || method === 'POST') {
        return handleCheckAvailability(tenantId, method === 'POST' ? parseBody(event) : event.queryStringParameters || {});
      }
    }

    // Booking conflicts endpoint - check for conflicting bookings
    if (path === '/api/v1/operations/bookings/conflicts' || path === '/operations/bookings/conflicts') {
      if (method === 'GET') {
        return handleGetBookingConflicts(tenantId, event.queryStringParameters || {});
      }
    }

    // ==========================================================================
    // Recurring Booking routes - /api/v1/recurring/* AND /api/v1/recurring-bookings/*
    // ==========================================================================
    if (path === '/api/v1/recurring' || path === '/api/v1/recurring-bookings' || path === '/recurring-bookings' || path === '/recurring') {
      if (method === 'GET') {
        return handleGetRecurringBookings(tenantId, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCreateRecurringBooking(tenantId, user, parseBody(event));
      }
    }

    // Recurring booking by ID - supports both /api/v1/recurring/:id and /api/v1/recurring-bookings/:id
    const recurringMatch = path.match(/\/api\/v1\/recurring(?:-bookings)?\/([a-f0-9-]+)(\/.*)?$/i);
    if (recurringMatch) {
      const recurringId = recurringMatch[1];
      const subPath = recurringMatch[2] || '';

      if (subPath === '/pause' && method === 'POST') {
        return handlePauseRecurringBooking(tenantId, recurringId, parseBody(event));
      }
      if (subPath === '/resume' && method === 'POST') {
        return handleResumeRecurringBooking(tenantId, recurringId);
      }
      if (subPath === '/generate' && method === 'POST') {
        return handleGenerateRecurringInstances(tenantId, recurringId, parseBody(event));
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetRecurringBooking(tenantId, recurringId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdateRecurringBooking(tenantId, user, recurringId, parseBody(event));
        }
        if (method === 'DELETE') {
          return handleDeleteRecurringBooking(tenantId, user, recurringId);
        }
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
          return handleDeleteTask(tenantId, user, taskId);
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
        return handleGetNotifications(tenantId, user.id, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCreateNotification(tenantId, parseBody(event));
      }
    }

    // Notification count endpoint (lightweight)
    if (path === '/api/v1/operations/notifications/count' || path === '/operations/notifications/count') {
      if (method === 'GET') {
        return handleGetNotificationCount(tenantId, user.id);
      }
    }

    // Mark all notifications as read
    if (path === '/api/v1/operations/notifications/read-all' || path === '/operations/notifications/read-all') {
      if (method === 'PATCH' || method === 'POST') {
        return handleMarkAllNotificationsRead(tenantId, user.id);
      }
    }

    // Single notification by ID routes
    const notificationMatch = path.match(/^\/(?:api\/v1\/)?operations\/notifications\/([a-f0-9-]+)$/i);
    if (notificationMatch) {
      const notificationId = notificationMatch[1];
      if (method === 'PATCH') {
        return handleMarkNotificationRead(tenantId, user.id, notificationId);
      }
    }

    // Mark single notification as read (alternate route)
    const notificationReadMatch = path.match(/^\/(?:api\/v1\/)?operations\/notifications\/([a-f0-9-]+)\/read$/i);
    if (notificationReadMatch) {
      const notificationId = notificationReadMatch[1];
      if (method === 'PATCH' || method === 'POST') {
        return handleMarkNotificationRead(tenantId, user.id, notificationId);
      }
    }

    // ==========================================================================
    // STAFF MANAGEMENT routes - /api/v1/staff/*
    // ==========================================================================
    if (path === '/api/v1/staff' || path === '/staff') {
      if (method === 'GET') {
        return handleGetStaffMembers(tenantId, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCreateStaffMember(tenantId, user, parseBody(event));
      }
    }

    // Staff by ID routes
    const staffMatch = path.match(/^\/api\/v1\/staff\/([a-f0-9-]+)$/i);
    if (staffMatch) {
      const staffId = staffMatch[1];
      if (method === 'GET') {
        return handleGetStaffMember(tenantId, staffId);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateStaffMember(tenantId, user, staffId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleDeleteStaffMember(tenantId, user, staffId);
      }
    }

    // ==========================================================================
    // Time Clock routes - /api/v1/time-entries/* AND /api/v1/staff/timeclock/*
    // ==========================================================================
    // Clock in/out via /api/v1/time-entries/clock-in (CDK route) or /api/v1/staff/clock-in (legacy)
    if (path === '/api/v1/time-entries/clock-in' || path === '/api/v1/staff/clock-in' || path === '/staff/clock-in') {
      if (method === 'POST') {
        return handleClockIn(tenantId, user, parseBody(event));
      }
    }
    if (path === '/api/v1/time-entries/clock-out' || path === '/api/v1/staff/clock-out' || path === '/staff/clock-out') {
      if (method === 'POST') {
        return handleClockOut(tenantId, user, parseBody(event));
      }
    }
    if (path === '/api/v1/staff/break/start' || path === '/staff/break/start') {
      if (method === 'POST') {
        return handleStartBreak(tenantId, user, parseBody(event));
      }
    }
    if (path === '/api/v1/staff/break/end' || path === '/staff/break/end') {
      if (method === 'POST') {
        return handleEndBreak(tenantId, user, parseBody(event));
      }
    }
    // Time entries list - supports both /api/v1/time-entries and /api/v1/staff/time-entries
    if (path === '/api/v1/time-entries' || path === '/api/v1/staff/time-entries' || path === '/staff/time-entries') {
      if (method === 'GET') {
        return handleGetTimeEntries(tenantId, event.queryStringParameters || {});
      }
    }
    // Get current active clock-in
    if (path === '/api/v1/time-entries/current' || path === '/api/v1/staff/time-status' || path === '/staff/time-status') {
      if (method === 'GET') {
        return handleGetTimeStatus(tenantId, user, event.queryStringParameters || {});
      }
    }
    // Time entry by ID routes - supports both /api/v1/time-entries/:id and /api/v1/staff/time-entries/:id
    const timeEntryMatch = path.match(/\/api\/v1\/(?:staff\/)?time-entries\/([a-f0-9-]+)(\/.*)?$/i);
    if (timeEntryMatch) {
      const entryId = timeEntryMatch[1];
      const subPath = timeEntryMatch[2] || '';

      if (subPath === '/approve' && method === 'POST') {
        return handleApproveTimeEntry(tenantId, user, entryId, parseBody(event));
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetTimeEntry(tenantId, entryId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdateTimeEntry(tenantId, user, entryId, parseBody(event));
        }
        if (method === 'DELETE') {
          return handleDeleteTimeEntry(tenantId, user, entryId);
        }
      }
    }

    // ==========================================================================
    // Shift/Schedule routes - /api/v1/shifts/*
    // ==========================================================================
    if (path === '/api/v1/shifts' || path === '/shifts') {
      if (method === 'GET') {
        return handleGetShifts(tenantId, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCreateShift(tenantId, user, parseBody(event));
      }
    }

    // Shift templates
    if (path === '/api/v1/shifts/templates' || path === '/shifts/templates') {
      if (method === 'GET') {
        return handleGetShiftTemplates(tenantId);
      }
      if (method === 'POST') {
        return handleCreateShiftTemplate(tenantId, user, parseBody(event));
      }
    }

    // Bulk shift operations
    if (path === '/api/v1/shifts/bulk' || path === '/shifts/bulk') {
      if (method === 'POST') {
        return handleBulkCreateShifts(tenantId, user, parseBody(event));
      }
    }

    // Weekly schedule view
    if (path === '/api/v1/shifts/week' || path === '/shifts/week') {
      if (method === 'GET') {
        return handleGetWeeklySchedule(tenantId, event.queryStringParameters || {});
      }
    }

    // Shift by ID routes
    const shiftMatch = path.match(/\/api\/v1\/shifts\/([a-f0-9-]+)(\/.*)?$/i);
    if (shiftMatch) {
      const shiftId = shiftMatch[1];
      const subPath = shiftMatch[2] || '';

      if (subPath === '/confirm' && method === 'POST') {
        return handleConfirmShift(tenantId, user, shiftId);
      }
      if (!subPath || subPath === '') {
        if (method === 'GET') {
          return handleGetShift(tenantId, shiftId);
        }
        if (method === 'PUT' || method === 'PATCH') {
          return handleUpdateShift(tenantId, user, shiftId, parseBody(event));
        }
        if (method === 'DELETE') {
          return handleDeleteShift(tenantId, user, shiftId);
        }
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
          return handleDeleteIncident(tenantId, user, incidentId);
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
    // SMS Notification routes - /api/v1/notifications/sms/*
    // ==========================================================================
    if (path === '/api/v1/notifications/sms' || path === '/notifications/sms') {
      if (method === 'POST') {
        return handleSendSMS(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/sms/booking-confirmation' || path === '/notifications/sms/booking-confirmation') {
      if (method === 'POST') {
        return handleSendBookingConfirmationSMS(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/sms/booking-reminder' || path === '/notifications/sms/booking-reminder') {
      if (method === 'POST') {
        return handleSendBookingReminderSMS(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/sms/check-in' || path === '/notifications/sms/check-in') {
      if (method === 'POST') {
        return handleSendCheckInSMS(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/sms/check-out' || path === '/notifications/sms/check-out') {
      if (method === 'POST') {
        return handleSendCheckOutSMS(tenantId, user, parseBody(event));
      }
    }

    if (path === '/api/v1/notifications/sms/config' || path === '/notifications/sms/config') {
      if (method === 'GET') {
        return handleGetSMSConfig(tenantId);
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
      if (method === 'POST') {
        return handleSaveRunAssignments(tenantId, parseBody(event), user);
      }
    }

    // Bulk update run assignments for a specific run
    const runAssignMatch = path.match(/\/api\/v1\/runs\/([a-f0-9-]+)\/assignments$/i);
    if (runAssignMatch) {
      const runId = runAssignMatch[1];
      if (method === 'GET') {
        return handleGetRunAssignmentsForRun(tenantId, runId, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleAssignPetsToRun(tenantId, runId, parseBody(event));
      }
      if (method === 'DELETE') {
        return handleClearRunAssignments(tenantId, runId, parseBody(event));
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

    // ==========================================================================
    // CUSTOMER SELF-SERVICE BOOKING ROUTES
    // ==========================================================================

    // Customer booking portal - check availability
    if (path === '/api/v1/customer/availability' || path === '/customer/availability') {
      if (method === 'GET') {
        return handleCustomerCheckAvailability(tenantId, event.queryStringParameters || {});
      }
    }

    // Customer booking portal - get services and pricing
    if (path === '/api/v1/customer/services' || path === '/customer/services') {
      if (method === 'GET') {
        return handleCustomerGetServices(tenantId);
      }
    }

    // Customer booking portal - get customer's own pets
    if (path === '/api/v1/customer/pets' || path === '/customer/pets') {
      if (method === 'GET') {
        return handleCustomerGetPets(tenantId, user);
      }
    }

    // Customer booking portal - get customer's own bookings
    if (path === '/api/v1/customer/bookings' || path === '/customer/bookings') {
      if (method === 'GET') {
        return handleCustomerGetBookings(tenantId, user, event.queryStringParameters || {});
      }
      if (method === 'POST') {
        return handleCustomerCreateBooking(tenantId, user, parseBody(event));
      }
    }

    // Customer booking by ID
    const customerBookingMatch = path.match(/\/api\/v1\/customer\/bookings\/([a-f0-9-]+)$/i);
    if (customerBookingMatch) {
      const bookingId = customerBookingMatch[1];
      if (method === 'GET') {
        return handleCustomerGetBooking(tenantId, user, bookingId);
      }
      if (method === 'DELETE') {
        return handleCustomerCancelBooking(tenantId, user, bookingId);
      }
    }

    // Customer profile (for self-service portal)
    if (path === '/api/v1/customer/profile' || path === '/customer/profile') {
      if (method === 'GET') {
        return handleCustomerGetProfile(tenantId, user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleCustomerUpdateProfile(tenantId, user, parseBody(event));
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

  try {
    await getPoolAsync();

    // Diagnostic: count for THIS tenant only (tenant-scoped for security)
    try {
      const diagCount = await query(
        `SELECT COUNT(*) as cnt FROM "Booking" WHERE tenant_id = $1 `,
        [tenantId]
      );
      console.log('[Bookings][diag] count for tenant', tenantId, ':', diagCount.rows[0]?.cnt || 0);
    } catch (diagErr) {
      console.warn('[Bookings][diag] count query failed:', diagErr.message);
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
      // Handle NULL check_out by treating it as far future (booking still active)
      whereClause += ` AND DATE(b.check_in) <= $${paramIndex} AND (b.check_out IS NULL OR DATE(b.check_out) >= $${paramIndex + 1})`;
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
      if (isNaN(daysInt) || daysInt < 1 || daysInt > 365) {
        return createResponse(400, {
          error: 'Bad Request',
          message: 'Invalid days parameter. Expected a positive integer between 1 and 365.',
        });
      }
      whereClause += ` AND b.check_in <= NOW() + INTERVAL '1 day' * $${paramIndex++}`;
      params.push(daysInt);
    }

    if (pet_id) {
      whereClause += ` AND bp.pet_id = $${paramIndex++}`;
      params.push(pet_id);
    }

    // Owner filter - for fetching bookings by owner
    if (owner_id) {
      whereClause += ` AND b.owner_id = $${paramIndex++}`;
      params.push(owner_id);
    }

    console.log('[Bookings][list] tenantId:', tenantId, 'status:', status, 'date:', date, 'startDate:', startDate, 'endDate:', endDate, 'owner_id:', owner_id);

    // Schema: check_in, check_out, total_price_cents, deposit_cents
    // Note: pet_id is NOT on Booking table - pets are linked via BookingPet join table
    // OPTIMIZED: Single query with JSON aggregation for pets (eliminates N+1 query pattern)
    const result = await query(
      `SELECT
         b.id,
         b.tenant_id,
         b.owner_id,
         b.status,
         b.check_in AS start_date,
         b.check_out AS end_date,
         b.checked_in_at,
         b.checked_out_at,
         b.total_price_cents,
         b.deposit_cents,
         b.notes,
         b.special_instructions,
         b.kennel_id,
         b.service_id,
         b.created_at,
         b.updated_at,
         k.name as kennel_name,
         s.name as service_name,
         o.id as resolved_owner_id,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone,
         COALESCE(
           (SELECT json_agg(json_build_object(
             'id', p.id,
             'name', p.name,
             'species', p.species,
             'breed', p.breed
           ))
           FROM "BookingPet" bp
           JOIN "Pet" p ON bp.pet_id = p.id
           WHERE bp.booking_id = b.id),
           '[]'::json
         ) as pets
       FROM "Booking" b
       LEFT JOIN "Kennel" k ON b.kennel_id = k.id
       LEFT JOIN "Service" s ON b.service_id = s.id
       LEFT JOIN "Owner" o ON b.owner_id = o.id
       LEFT JOIN "BookingPet" bp ON bp.booking_id = b.id
       WHERE ${whereClause}
       GROUP BY b.id, k.name, s.name, o.id, o.first_name, o.last_name, o.email, o.phone
       ORDER BY b.check_in DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

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
      pets: row.pets || [],
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
       WHERE b.id = $1 AND b.tenant_id = $2`,
      [bookingId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const booking = result.rows[0];

    // Get pets for this booking from BookingPet join table
    const petsResult = await query(
      `SELECT p.id, p.name, p.species, p.breed
       FROM "BookingPet" bp
       JOIN "Pet" p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [bookingId]
    );

    let pets = petsResult.rows;

    // Fallback: If no BookingPet entries but pet_id is set, lookup pet directly
    if (pets.length === 0 && booking.pet_id) {
      const directPetResult = await query(
        `SELECT id, name, species, breed FROM "Pet" WHERE id = $1`,
        [booking.pet_id]
      );
      if (directPetResult.rows.length > 0) {
        pets = directPetResult.rows;
      }
    }

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
      pets: pets,
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

  // Validate booking dates (format, range, and business rules)
  const dateValidationErrors = validateBookingDates(startDate, endDate);
  if (dateValidationErrors.length > 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Invalid booking dates',
      details: dateValidationErrors,
    });
  }

  try {
    await getPoolAsync();

    // ==========================================================================
    // TIER ENFORCEMENT - Check monthly booking limit
    // ==========================================================================
    const plan = user?.tenant?.plan || user?.plan || 'FREE';
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const bookingCountResult = await query(
      `SELECT COUNT(*) as count FROM "Booking"
       WHERE tenant_id = $1
       AND created_at >= $2 AND created_at < $3`,
      [tenantId, monthStart.toISOString(), monthEnd.toISOString()]
    );
    const currentBookingCount = parseInt(bookingCountResult.rows[0]?.count || '0', 10);

    try {
      enforceLimit(plan, 'bookingsPerMonth', currentBookingCount);
    } catch (tierError) {
      if (tierError.tierError) {
        console.warn('[Bookings][create] Tier limit exceeded:', tierError.tierError);
        return createTierErrorResponse(tierError.tierError);
      }
      throw tierError;
    }

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

    // ==========================================================================
    // FOREIGN KEY VALIDATION
    // Verify referenced entities exist before creating the booking
    // ==========================================================================
    const fkErrors = [];

    // Validate ownerId exists
    if (ownerId) {
      const ownerCheck = await query(
        `SELECT id FROM "Owner" WHERE id = $1 AND tenant_id = $2`,
        [ownerId, tenantId]
      );
      if (ownerCheck.rows.length === 0) {
        fkErrors.push(`Owner with ID ${ownerId} not found`);
      }
    }

    // Validate kennelId exists
    if (kennelId) {
      const kennelCheck = await query(
        `SELECT id FROM "Kennel" WHERE id = $1 AND tenant_id = $2`,
        [kennelId, tenantId]
      );
      if (kennelCheck.rows.length === 0) {
        fkErrors.push(`Kennel with ID ${kennelId} not found`);
      }
    }

    // Validate serviceId exists
    if (serviceId) {
      const serviceCheck = await query(
        `SELECT id FROM "Service" WHERE id = $1 AND tenant_id = $2`,
        [serviceId, tenantId]
      );
      if (serviceCheck.rows.length === 0) {
        fkErrors.push(`Service with ID ${serviceId} not found`);
      }
    }

    // Validate petIds exist
    const petsToValidate = petIds && petIds.length > 0 ? petIds : (petId ? [petId] : []);
    for (const pid of petsToValidate) {
      const petCheck = await query(
        `SELECT id FROM "Pet" WHERE id = $1 AND tenant_id = $2`,
        [pid, tenantId]
      );
      if (petCheck.rows.length === 0) {
        fkErrors.push(`Pet with ID ${pid} not found`);
      }
    }

    if (fkErrors.length > 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Referenced entities not found',
        details: fkErrors,
      });
    }

    // Calculate price in cents
    const priceInCents = totalPriceInCents || (totalPrice ? totalPrice * 100 : 0);

    // Create booking using correct schema columns
    // Note: Booking table does NOT have pet_id - pets are linked via BookingPet junction table
    const result = await query(
      `INSERT INTO "Booking" (tenant_id, owner_id, kennel_id, service_id, check_in, check_out,
                              notes, special_instructions, total_price_cents, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
       RETURNING *`,
      [tenantId, ownerId || null, kennelId || null, serviceId || null,
       startDate, endDate, notes || null, specialInstructions || null, priceInCents]
    );

    const booking = result.rows[0];

    // Link pets to booking via BookingPet junction table
    const petsToLink = petIds && petIds.length > 0 ? petIds : (petId ? [petId] : []);
    for (const pid of petsToLink) {
      await query(
        `INSERT INTO "BookingPet" (booking_id, pet_id, tenant_id) VALUES ($1, $2, $3)`,
        [booking.id, pid, tenantId]
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
         WHERE k.id = $1 AND k.tenant_id = $2 AND k.is_active = true`,
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
       WHERE k.tenant_id = $1 AND k.is_active = true`,
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
 * Handle booking conflicts check
 * GET /api/v1/operations/bookings/conflicts
 *
 * Returns conflicting bookings for a given kennel and date range
 */
async function handleGetBookingConflicts(tenantId, params) {
  const { kennelId, startDate, endDate, excludeBookingId } = params;

  console.log('[Bookings][conflicts] Checking:', { tenantId, kennelId, startDate, endDate, excludeBookingId });

  if (!kennelId || !startDate || !endDate) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'kennelId, startDate, and endDate are required',
    });
  }

  try {
    await getPoolAsync();

    // Build query to find overlapping bookings for this kennel
    let conflictsQuery = `
      SELECT
        b.id,
        b.status,
        b.check_in as "startDate",
        b.check_out as "endDate",
        b.notes,
        b.created_at as "createdAt",
        k.id as kennel_id,
        k.name as kennel_name,
        s.id as service_id,
        s.name as service_name,
        o.id as owner_id,
        o.first_name as owner_first_name,
        o.last_name as owner_last_name,
        o.email as owner_email
      FROM "Booking" b
      LEFT JOIN "Kennel" k ON b.kennel_id = k.id
      LEFT JOIN "Service" s ON b.service_id = s.id
      LEFT JOIN "Owner" o ON b.owner_id = o.id
      WHERE b.tenant_id = $1
        AND b.kennel_id = $2
        AND b.status NOT IN ('CANCELLED', 'NO_SHOW', 'CHECKED_OUT')
        AND b.check_in < $4::timestamptz
        AND b.check_out > $3::timestamptz
    `;

    const queryParams = [tenantId, kennelId, startDate, endDate];

    // Exclude a specific booking (for editing existing bookings)
    if (excludeBookingId) {
      conflictsQuery += ` AND b.id != $5`;
      queryParams.push(excludeBookingId);
    }

    conflictsQuery += ` ORDER BY b.check_in ASC`;

    const result = await query(conflictsQuery, queryParams);

    // Transform rows to full booking objects with nested entities
    const conflicts = await Promise.all(result.rows.map(async (row) => {
      // Get pets for this booking
      const petsResult = await query(
        `SELECT p.id, p.name, p.species, p.breed
         FROM "BookingPet" bp
         JOIN "Pet" p ON bp.pet_id = p.id
         WHERE bp.booking_id = $1`,
        [row.id]
      );

      return {
        id: row.id,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        notes: row.notes,
        createdAt: row.createdAt,
        kennel: row.kennel_id ? {
          id: row.kennel_id,
          name: row.kennel_name,
        } : null,
        service: row.service_id ? {
          id: row.service_id,
          name: row.service_name,
        } : null,
        owner: row.owner_id ? {
          id: row.owner_id,
          firstName: row.owner_first_name,
          lastName: row.owner_last_name,
          email: row.owner_email,
        } : null,
        pets: petsResult.rows,
      };
    }));

    console.log('[Bookings][conflicts] Found:', conflicts.length, 'conflicting bookings');

    return createResponse(200, {
      conflicts,
      hasConflicts: conflicts.length > 0,
      count: conflicts.length,
      kennelId,
      startDate,
      endDate,
    });

  } catch (error) {
    console.error('[Bookings][conflicts] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to check booking conflicts',
    });
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

  // Validate booking dates if both are being updated
  if (startDate && endDate) {
    const dateValidationErrors = validateBookingDates(startDate, endDate);
    if (dateValidationErrors.length > 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Invalid booking dates',
        details: dateValidationErrors,
      });
    }
  }

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
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
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
  const { sendConfirmation = true, userId } = body || {};

  try {
    await getPoolAsync();

    // Build the update query with optional user tracking fields
    const result = await query(
      `UPDATE "Booking"
       SET status = 'CHECKED_IN',
           checked_in_at = NOW(),
           checked_in_by = $3,
           updated_at = NOW(),
           updated_by = $3
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [bookingId, tenantId, userId || null]
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

    const booking = result.rows[0];
    return createResponse(200, {
      success: true,
      message: 'Check-in successful',
      checkInTime: booking.checked_in_at,
      // Return full booking data for UI update
      data: {
        id: booking.id,
        status: booking.status,
        checkedInAt: booking.checked_in_at,
        checkedInBy: booking.checked_in_by,
        updatedAt: booking.updated_at,
        updatedBy: booking.updated_by,
      },
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
  const { sendConfirmation = true, userId } = body || {};

  try {
    await getPoolAsync();

    // Build the update query with optional user tracking fields
    const result = await query(
      `UPDATE "Booking"
       SET status = 'CHECKED_OUT',
           checked_out_at = NOW(),
           checked_out_by = $3,
           updated_at = NOW(),
           updated_by = $3
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [bookingId, tenantId, userId || null]
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
      checkOutTime: booking.checked_out_at,
      // Return full booking data for UI update
      data: {
        id: booking.id,
        status: booking.status,
        checkedInAt: booking.checked_in_at,
        checkedOutAt: booking.checked_out_at,
        checkedOutBy: booking.checked_out_by,
        updatedAt: booking.updated_at,
        updatedBy: booking.updated_by,
      },
    });

  } catch (error) {
    console.error('[OPERATIONS-SERVICE] Failed to check out:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to check out',
    });
  }
}

// =============================================================================
// BOOKING BULK ACTIONS
// =============================================================================

/**
 * Bulk delete bookings (soft delete by setting status to CANCELLED)
 * Body: { ids: string[] }
 */
async function handleBulkDeleteBookings(tenantId, user, body) {
  // Check permission
  const permError = checkPermission(user, PERMISSIONS.BOOKINGS_DELETE, createResponse);
  if (permError) return permError;

  const { ids } = body;

  console.log('[Bookings][bulkDelete] tenantId:', tenantId, 'count:', ids?.length);

  if (!Array.isArray(ids) || ids.length === 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'ids array is required',
    });
  }

  if (ids.length > 100) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Maximum 100 items per bulk operation',
    });
  }

  try {
    await getPoolAsync();

    // First update status to CANCELLED for all bookings
    await query(
      `UPDATE "Booking"
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = ANY($1) AND tenant_id = $2`,
      [ids, tenantId]
    );

    // Then soft delete them using the new archive pattern
    const deletedCount = await softDeleteBatch('Booking', ids, tenantId, user.userId);

    console.log('[Bookings][bulkDelete] cancelled:', deletedCount);

    return createResponse(200, {
      success: true,
      deletedCount: deletedCount,
      deletedIds: ids.slice(0, deletedCount),
      message: `${deletedCount} booking(s) cancelled successfully`,
    });
  } catch (error) {
    console.error('[OPERATIONS-SERVICE] bulkDeleteBookings error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to cancel bookings',
    });
  }
}

/**
 * Bulk update bookings status
 * Body: { ids: string[], updates: { status?: string } }
 */
async function handleBulkUpdateBookings(tenantId, user, body) {
  // Check permission
  const permError = checkPermission(user, PERMISSIONS.BOOKINGS_EDIT, createResponse);
  if (permError) return permError;

  const { ids, updates } = body;

  console.log('[Bookings][bulkUpdate] tenantId:', tenantId, 'count:', ids?.length);

  if (!Array.isArray(ids) || ids.length === 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'ids array is required',
    });
  }

  if (!updates || typeof updates !== 'object') {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'updates object is required',
    });
  }

  if (ids.length > 100) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Maximum 100 items per bulk operation',
    });
  }

  try {
    await getPoolAsync();

    const setClauses = [];
    const values = [ids, tenantId];
    let paramIndex = 3;

    // Validate and apply status update
    if (updates.status !== undefined) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'COMPLETED'];
      const normalizedStatus = updates.status.toUpperCase();
      if (!validStatuses.includes(normalizedStatus)) {
        return createResponse(400, {
          error: 'Bad Request',
          message: `Invalid status: ${updates.status}. Valid values: ${validStatuses.join(', ')}`,
        });
      }
      setClauses.push(`status = $${paramIndex++}`);
      values.push(normalizedStatus);
    }

    if (setClauses.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid updates provided',
      });
    }

    setClauses.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Booking"
       SET ${setClauses.join(', ')}
       WHERE id = ANY($1) AND tenant_id = $2       RETURNING id`,
      values
    );

    console.log('[Bookings][bulkUpdate] updated:', result.rowCount);

    return createResponse(200, {
      success: true,
      updatedCount: result.rowCount,
      updatedIds: result.rows.map(r => r.id),
      message: `${result.rowCount} booking(s) updated successfully`,
    });
  } catch (error) {
    console.error('[OPERATIONS-SERVICE] bulkUpdateBookings error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update bookings',
    });
  }
}

/**
 * Bulk export bookings
 * Body: { ids?: string[] } - if empty/missing, exports all
 */
async function handleBulkExportBookings(tenantId, user, body) {
  // Check permission
  const permError = checkPermission(user, PERMISSIONS.BOOKINGS_VIEW, createResponse);
  if (permError) return permError;

  const { ids, startDate, endDate } = body;

  console.log('[Bookings][bulkExport] tenantId:', tenantId, 'count:', ids?.length || 'all');

  try {
    await getPoolAsync();

    let queryText = `
      SELECT
        b.id,
        b.status,
        b.check_in,
        b.check_out,
        b.total_price_in_cents,
        b.deposit_in_cents,
        b.notes,
        b.special_instructions,
        b.service_type,
        b.service_name,
        b.checked_in_at,
        b.checked_out_at,
        b.created_at,
        o.first_name as owner_first_name,
        o.last_name as owner_last_name,
        o.email as owner_email,
        o.phone as owner_phone,
        s.name as service_name_from_service
      FROM "Booking" b
      LEFT JOIN "Owner" o ON b.owner_id = o.id
      LEFT JOIN "Service" s ON b.service_id = s.id
      WHERE b.tenant_id = $1    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (Array.isArray(ids) && ids.length > 0) {
      queryText += ` AND b.id = ANY($${paramIndex++})`;
      params.push(ids);
    }

    if (startDate && endDate) {
      queryText += ` AND DATE(b.check_in) >= $${paramIndex}::date AND DATE(b.check_in) <= $${paramIndex + 1}::date`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    queryText += ` ORDER BY b.check_in DESC`;

    const result = await query(queryText, params);

    // Get pets for each booking
    const bookingIds = result.rows.map(b => b.id);
    let petsMap = {};

    if (bookingIds.length > 0) {
      const petsResult = await query(
        `SELECT bp.booking_id, p.name, p.species, p.breed
         FROM "BookingPet" bp
         JOIN "Pet" p ON bp.pet_id = p.id
         WHERE bp.booking_id = ANY($1)`,
        [bookingIds]
      );

      petsMap = petsResult.rows.reduce((acc, row) => {
        if (!acc[row.booking_id]) acc[row.booking_id] = [];
        acc[row.booking_id].push({
          name: row.name,
          species: row.species,
          breed: row.breed,
        });
        return acc;
      }, {});
    }

    // Merge pets into bookings
    const exportData = result.rows.map(booking => ({
      ...booking,
      totalPrice: booking.total_price_in_cents / 100,
      deposit: booking.deposit_in_cents / 100,
      ownerName: `${booking.owner_first_name || ''} ${booking.owner_last_name || ''}`.trim(),
      pets: petsMap[booking.id] || [],
    }));

    console.log('[Bookings][bulkExport] exported:', result.rows.length);

    return createResponse(200, {
      success: true,
      exportedCount: result.rows.length,
      data: exportData,
      exportDate: new Date().toISOString(),
      message: `${result.rows.length} booking(s) exported successfully`,
    });
  } catch (error) {
    console.error('[OPERATIONS-SERVICE] bulkExportBookings error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to export bookings',
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

    let whereClause = 't.tenant_id = $1';
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

    // Schema: id, tenant_id, pet_id, booking_id, assigned_to, task_type, status,
    //         priority, title, description, notes, due_at, completed_at, completed_by
    const result = await query(
      `SELECT
         t.id,
         t.tenant_id,
         t.task_type,
         t.title,
         t.description,
         t.notes,
         t.status,
         t.priority,
         t.due_at,
         t.completed_at,
         t.completed_by,
         t.assigned_to,
         t.booking_id,
         t.pet_id,
         t.created_at,
         t.updated_at,
         u.first_name as assignee_first_name,
         u.last_name as assignee_last_name,
         p.name as pet_name
       FROM "Task" t
       LEFT JOIN "User" u ON t.assigned_to = u.id
       LEFT JOIN "Pet" p ON t.pet_id = p.id
       WHERE ${whereClause}
       ORDER BY t.due_at ASC NULLS LAST, t.priority DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    console.log('[Tasks][diag] count:', result.rows.length);

    const tasks = result.rows.map(row => ({
      id: row.id,
      recordId: row.id,
      tenantId: row.tenant_id,
      type: row.task_type,  // Column is task_type, expose as type for frontend
      taskType: row.task_type,
      title: row.title,
      description: row.description,
      notes: row.notes,
      status: row.status,
      priority: row.priority,
      scheduledFor: row.due_at,  // Use due_at as scheduledFor for frontend compatibility
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
       WHERE t.id = $1 AND t.tenant_id = $2`,
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
      type: row.task_type,  // Column is task_type, expose as type for frontend
      taskType: row.task_type,
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
  const { title, description, priority, dueDate, dueAt, assignedTo, bookingId, petId, scheduledFor, type, taskType } = body;

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
    // Support both type (frontend) and taskType - column is task_type
    const taskTypeValue = taskType || type || 'OTHER';

    const result = await query(
      `INSERT INTO "Task" (tenant_id, title, description, priority, due_at, scheduled_for, task_type, assigned_to, booking_id, pet_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', NOW(), NOW())
       RETURNING *`,
      [tenantId, title, description, priority || 'NORMAL', dueDateValue, scheduledFor || null, taskTypeValue, assignedTo, bookingId, petId]
    );

    const task = result.rows[0];

    return createResponse(201, {
      success: true,
      task: {
        ...task,
        type: task.task_type,  // Alias for frontend
        taskType: task.task_type,
        dueDate: task.due_at,
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
 * Schema: due_at (not due_date), task_type (not type)
 */
async function handleUpdateTask(tenantId, taskId, body) {
  const { title, description, status, priority, dueDate, dueAt, assignedTo, scheduledFor, type, taskType } = body;

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
    // Support both type (frontend) and taskType - column is task_type
    if (type || taskType) {
      updates.push(`task_type = $${paramIndex++}`);
      values.push((taskType || type).toUpperCase());
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
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
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
        type: task.task_type,  // Alias for frontend
        taskType: task.task_type,
        dueDate: task.due_at,
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
async function handleDeleteTask(tenantId, user, taskId) {
  // Check permission
  const permError = checkPermission(user, PERMISSIONS.TASKS_DELETE, createResponse);
  if (permError) return permError;

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
 * Get notifications for user
 * Returns both notification list and unread count
 */
async function handleGetNotifications(tenantId, userId, queryParams = {}) {
  console.log('[Notifications][list] tenantId:', tenantId, 'userId:', userId);

  try {
    await getPoolAsync();

    const limit = Math.min(parseInt(queryParams.limit) || 50, 100);
    const offset = parseInt(queryParams.offset) || 0;
    const unreadOnly = queryParams.unreadOnly === 'true';

    // Build query with optional unread filter
    let whereClause = 'tenant_id = $1 AND (user_id = $2 OR user_id IS NULL)';
    const params = [tenantId, userId];

    if (unreadOnly) {
      whereClause += ' AND is_read = false';
    }

    // Get notifications
    const result = await query(
      `SELECT
         id,
         type,
         title,
         message,
         link,
         metadata,
         is_read,
         created_at
       FROM "Notification"
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    // Get unread count
    const countResult = await query(
      `SELECT COUNT(*) as count
       FROM "Notification"
       WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL) AND is_read = false`,
      [tenantId, userId]
    );

    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link,
      metadata: row.metadata,
      isRead: row.is_read,
      createdAt: row.created_at,
    }));

    return createResponse(200, {
      data: notifications,
      notifications,
      unreadCount: parseInt(countResult.rows[0]?.count || 0),
      total: notifications.length,
      limit,
      offset,
    });

  } catch (error) {
    // If table doesn't exist, return empty (graceful degradation)
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.log('[Notifications] Table not found, returning empty array');
      return createResponse(200, {
        data: [],
        notifications: [],
        unreadCount: 0,
        total: 0,
      });
    }

    console.error('[Notifications] Failed to get:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve notifications',
    });
  }
}

/**
 * Get unread notification count only (lightweight endpoint)
 */
async function handleGetNotificationCount(tenantId, userId) {
  console.log('[Notifications][count] tenantId:', tenantId, 'userId:', userId);

  try {
    await getPoolAsync();

    const countResult = await query(
      `SELECT COUNT(*) as count
       FROM "Notification"
       WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL) AND is_read = false`,
      [tenantId, userId]
    );

    return createResponse(200, {
      unreadCount: parseInt(countResult.rows[0]?.count || 0),
    });

  } catch (error) {
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return createResponse(200, { unreadCount: 0 });
    }

    console.error('[Notifications] Failed to get count:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve notification count',
    });
  }
}

/**
 * Mark a single notification as read
 */
async function handleMarkNotificationRead(tenantId, userId, notificationId) {
  console.log('[Notifications][markRead] tenantId:', tenantId, 'notificationId:', notificationId);

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Notification"
       SET is_read = true, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND (user_id = $3 OR user_id IS NULL)
       RETURNING id`,
      [notificationId, tenantId, userId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Notification not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Notification marked as read',
    });

  } catch (error) {
    console.error('[Notifications] Failed to mark read:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to mark notification as read',
    });
  }
}

/**
 * Mark all notifications as read for user
 */
async function handleMarkAllNotificationsRead(tenantId, userId) {
  console.log('[Notifications][markAllRead] tenantId:', tenantId, 'userId:', userId);

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Notification"
       SET is_read = true, updated_at = NOW()
       WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL) AND is_read = false
       RETURNING id`,
      [tenantId, userId]
    );

    return createResponse(200, {
      success: true,
      markedCount: result.rows.length,
      message: `${result.rows.length} notification(s) marked as read`,
    });

  } catch (error) {
    console.error('[Notifications] Failed to mark all read:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to mark notifications as read',
    });
  }
}

/**
 * Create a notification (internal use / admin)
 */
async function handleCreateNotification(tenantId, body) {
  console.log('[Notifications][create] tenantId:', tenantId, 'payload:', JSON.stringify(body));

  const { userId, type, title, message, link, metadata } = body;

  if (!type || !title) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Type and title are required',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `INSERT INTO "Notification" (
         tenant_id, user_id, type, title, message, link, metadata, is_read, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW())
       RETURNING id, type, title, message, link, metadata, is_read, created_at`,
      [tenantId, userId || null, type, title, message || null, link || null, metadata ? JSON.stringify(metadata) : null]
    );

    const notification = result.rows[0];

    return createResponse(201, {
      success: true,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        metadata: notification.metadata,
        isRead: notification.is_read,
        createdAt: notification.created_at,
      },
    });

  } catch (error) {
    console.error('[Notifications] Failed to create:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create notification',
    });
  }
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

    const result = await query(
      `SELECT
         rt.id,
         rt.name,
         rt.description,
         rt.capacity,
         rt.start_time,
         rt.end_time,
         rt.days_of_week,
         rt.run_type,
         rt.is_active,
         rt.created_at,
         rt.updated_at
       FROM "RunTemplate" rt
       WHERE rt.tenant_id = $1
       ORDER BY rt.name ASC`,
      [tenantId]
    );

    console.log('[RunTemplates][list] Found:', result.rows.length, 'templates');

    // Map to frontend expected shape
    const templates = result.rows.map(row => ({
      id: row.id,
      recordId: row.id,
      name: row.name,
      description: row.description,
      capacity: row.capacity,
      startTime: row.start_time,
      endTime: row.end_time,
      daysOfWeek: row.days_of_week || [1, 2, 3, 4, 5],
      runType: row.run_type,
      isActive: row.is_active,
      status: row.is_active ? 'active' : 'inactive',
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
         rt.capacity,
         rt.start_time,
         rt.end_time,
         rt.days_of_week,
         rt.run_type,
         rt.is_active,
         rt.created_at,
         rt.updated_at
       FROM "RunTemplate" rt
       WHERE rt.id = $1 AND rt.tenant_id = $2`,
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
      capacity: row.capacity,
      startTime: row.start_time,
      endTime: row.end_time,
      daysOfWeek: row.days_of_week || [1, 2, 3, 4, 5],
      runType: row.run_type,
      isActive: row.is_active,
      status: row.is_active ? 'active' : 'inactive',
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

  const { name, description, capacity, startTime, endTime, daysOfWeek, runType } = body;

  if (!name) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Name is required',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `INSERT INTO "RunTemplate" (
         tenant_id, name, description, capacity, start_time, end_time,
         days_of_week, run_type, is_active, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        name,
        description || null,
        capacity || 10,
        startTime || '08:00',
        endTime || '18:00',
        daysOfWeek || [1, 2, 3, 4, 5],
        runType || 'SOCIAL',
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
      capacity: row.capacity,
      startTime: row.start_time,
      endTime: row.end_time,
      daysOfWeek: row.days_of_week,
      runType: row.run_type,
      isActive: row.is_active,
      status: 'active',
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

  const { name, description, capacity, startTime, endTime, daysOfWeek, runType, isActive } = body;

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
    if (capacity !== undefined) {
      updates.push(`capacity = $${paramIndex++}`);
      values.push(capacity);
    }
    if (startTime !== undefined) {
      updates.push(`start_time = $${paramIndex++}`);
      values.push(startTime);
    }
    if (endTime !== undefined) {
      updates.push(`end_time = $${paramIndex++}`);
      values.push(endTime);
    }
    if (daysOfWeek !== undefined) {
      updates.push(`days_of_week = $${paramIndex++}`);
      values.push(daysOfWeek);
    }
    if (runType !== undefined) {
      updates.push(`run_type = $${paramIndex++}`);
      values.push(runType);
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
      `UPDATE "RunTemplate"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2
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
      capacity: row.capacity,
      startTime: row.start_time,
      endTime: row.end_time,
      daysOfWeek: row.days_of_week || [1, 2, 3, 4, 5],
      runType: row.run_type,
      isActive: row.is_active,
      status: row.is_active ? 'active' : 'inactive',
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
    // Soft delete using archive pattern
    const deletedRecord = await softDelete('RunTemplate', templateId, tenantId);

    if (!deletedRecord) {
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
 * Schema (Run table):
 *   id, tenant_id, name, description, capacity, run_type, is_active
 */
async function handleGetRuns(tenantId, queryParams) {
  const { isActive } = queryParams;
  console.log('[Runs][list] tenantId:', tenantId, 'isActive:', isActive);

  try {
    await getPoolAsync();

    let whereClause = 'r.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    // Filter by active status (default to active only)
    // Note: is_active may be boolean, string, or NULL - be lenient
    if (isActive !== undefined) {
      if (isActive === 'true' || isActive === true) {
        whereClause += ` AND (r.is_active = true OR r.is_active::text = 'true' OR r.is_active IS NULL)`;
      } else {
        whereClause += ` AND r.is_active = false`;
      }
    } else {
      // Default: show active runs (or runs where is_active is not explicitly false)
      whereClause += ` AND (r.is_active = true OR r.is_active::text = 'true' OR r.is_active IS NULL)`;
    }

    const result = await query(
      `SELECT
         r.id,
         r.name,
         r.description,
         r.capacity,
         r.run_type,
         r.is_active,
         (SELECT COUNT(*) FROM "RunAssignment" ra WHERE ra.run_id = r.id) as assignment_count
       FROM "Run" r
       WHERE ${whereClause}
       ORDER BY r.name ASC`,
      params
    );

    console.log('[Runs][list] Found:', result.rows.length, 'runs');

    const runs = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      capacity: row.capacity || 10,
      maxCapacity: row.capacity || 10,
      runType: row.run_type,
      isActive: row.is_active,
      assignmentCount: parseInt(row.assignment_count || 0),
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
      `SELECT COUNT(*) as total FROM "RunAssignment" WHERE tenant_id = $1`,
      [tenantId]
    );
    console.log('[RunAssignments][debug] Total assignments for tenant:', debugCount.rows[0]?.total);

    // Debug: Check assignments in date range without other filters
    // RunAssignment schema: id, tenant_id, run_id, booking_id, pet_id, assigned_date, start_time, end_time, is_individual
    const debugRangeCount = await query(
      `SELECT COUNT(*) as total FROM "RunAssignment"
       WHERE tenant_id = $1
         AND assigned_date >= $2::date
         AND assigned_date <= $3::date`,
      [tenantId, rangeStart, rangeEnd]
    );
    console.log('[RunAssignments][debug] Assignments in date range:', debugRangeCount.rows[0]?.total);

    // Query run assignments with joins to Run, Pet, Booking, Kennel
    // RunAssignment schema: id, tenant_id, run_id, booking_id, pet_id, assigned_date, start_time, end_time, is_individual
    // Run schema: id, tenant_id, name, description, capacity, run_type, is_active
    const result = await query(
      `SELECT
         ra.id,
         ra.run_id,
         ra.booking_id,
         ra.pet_id,
         ra.assigned_date,
         ra.start_time,
         ra.end_time,
         ra.is_individual,
         r.name as run_name,
         r.description as run_description,
         r.capacity as run_capacity,
         r.run_type,
         p.name as pet_name,
         p.species as pet_species,
         p.breed as pet_breed,
         p.photo_url as pet_photo_url,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.phone as owner_phone,
         b.status as booking_status,
         b.check_in as booking_check_in,
         b.check_out as booking_check_out,
         b.total_price_cents as booking_total_cents,
         b.kennel_id,
         k.name as kennel_name
       FROM "RunAssignment" ra
       JOIN "Run" r
         ON r.id = ra.run_id
        AND r.tenant_id = ra.tenant_id
       LEFT JOIN "Pet" p
         ON p.id = ra.pet_id
        AND p.tenant_id = ra.tenant_id
       LEFT JOIN "Booking" b
         ON b.id = ra.booking_id
        AND b.tenant_id = ra.tenant_id
       LEFT JOIN "Owner" o
         ON o.id = b.owner_id
        AND o.tenant_id = ra.tenant_id
       LEFT JOIN "Kennel" k
         ON k.id = b.kennel_id
        AND k.tenant_id = ra.tenant_id
       WHERE ra.tenant_id = $1
         AND (r.is_active = true OR r.is_active::text = 'true' OR r.is_active IS NULL)
         AND ra.assigned_date >= $2::date
         AND ra.assigned_date <= $3::date
       ORDER BY r.name ASC, ra.start_time ASC`,
      [tenantId, rangeStart, rangeEnd]
    );

    console.log('[RunAssignments][list] Found:', result.rows.length, 'assignments after JOINs');

    // Debug: log first row to see actual column values
    if (result.rows.length > 0) {
      console.log('[RunAssignments][DEBUG] First row keys:', Object.keys(result.rows[0]));
      console.log('[RunAssignments][DEBUG] First row pet data:', {
        pet_id: result.rows[0].pet_id,
        pet_name: result.rows[0].pet_name,
        pet_breed: result.rows[0].pet_breed,
        pet_species: result.rows[0].pet_species,
        kennel_id: result.rows[0].kennel_id,
        kennel_name: result.rows[0].kennel_name,
        booking_total_cents: result.rows[0].booking_total_cents,
      });
    }

    // Transform to frontend-friendly format
    const assignments = result.rows.map(row => {
      // Format assigned_date as YYYY-MM-DD string
      const dateStr = row.assigned_date instanceof Date
        ? row.assigned_date.toISOString().split('T')[0]
        : (typeof row.assigned_date === 'string' ? row.assigned_date.split('T')[0] : null);

      // Combine date + time for full datetime (frontend expects ISO strings)
      const startAt = dateStr && row.start_time
        ? `${dateStr}T${row.start_time}`
        : dateStr;
      const endAt = dateStr && row.end_time
        ? `${dateStr}T${row.end_time}`
        : dateStr;

      return {
        id: row.id,
        runId: row.run_id,
        runName: row.run_name,
        runDescription: row.run_description,
        runCapacity: row.run_capacity,
        runType: row.run_type,
        bookingId: row.booking_id,
        bookingStatus: row.booking_status,
        bookingCheckIn: row.booking_check_in,
        bookingCheckOut: row.booking_check_out,
        bookingTotalCents: row.booking_total_cents || 0,
        kennelId: row.kennel_id,
        kennelName: row.kennel_name,
        petId: row.pet_id,
        petName: row.pet_name,
        petSpecies: row.pet_species,
        petBreed: row.pet_breed,
        petPhotoUrl: row.pet_photo_url,
        ownerName: row.owner_first_name && row.owner_last_name
          ? `${row.owner_first_name} ${row.owner_last_name}`
          : row.owner_first_name || row.owner_last_name || null,
        ownerPhone: row.owner_phone,
        assignedDate: dateStr,
        startAt: startAt,
        endAt: endAt,
        startTime: row.start_time?.toString().slice(0, 5),  // Format as HH:MM
        endTime: row.end_time?.toString().slice(0, 5),      // Format as HH:MM
        isIndividual: row.is_individual,
      };
    });

    // Also get runs for utilization calculation
    // First, debug: get ALL runs for this tenant regardless of is_active
    const debugAllRuns = await query(
      `SELECT r.id, r.name, r.is_active, r.tenant_id FROM "Run" r WHERE r.tenant_id = $1`,
      [tenantId]
    );
    console.log('[RunAssignments][DEBUG] ALL runs for tenant:', tenantId, ':', debugAllRuns.rows.length, debugAllRuns.rows);

    // Also try without tenant filter to see if data exists at all
    const debugAnyRuns = await query(`SELECT r.id, r.name, r.tenant_id FROM "Run" r LIMIT 5`);
    console.log('[RunAssignments][DEBUG] ANY runs in table:', debugAnyRuns.rows);

    // Note: is_active may be boolean true, string 'true', or 1
    const runsResult = await query(
      `SELECT
         r.id,
         r.name,
         r.description,
         r.capacity,
         r.run_type,
         r.is_active
       FROM "Run" r
       WHERE r.tenant_id = $1
         AND (r.is_active = true OR r.is_active::text = 'true' OR r.is_active IS NULL)
       ORDER BY r.name ASC`,
      [tenantId]
    );

    console.log('[RunAssignments] Found runs:', runsResult.rows.length, runsResult.rows.map(r => ({ id: r.id, name: r.name, is_active: r.is_active })));

    const runs = runsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      capacity: row.capacity || 10,
      maxCapacity: row.capacity || 10,
      runType: row.run_type,
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

/**
 * Save run assignments - bulk create/update assignments for a date
 * Body: { date: string, assignments: { runId, petId, startTime, endTime }[] }
 */
async function handleSaveRunAssignments(tenantId, body, user) {
  const { date, assignments } = body;
  const userId = user?.userId || user?.id || null;

  console.log('[RunAssignments][save] tenantId:', tenantId, 'date:', date, 'count:', assignments?.length, 'userId:', userId);

  if (!date) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'date is required (YYYY-MM-DD format)',
    });
  }

  if (!Array.isArray(assignments)) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'assignments array is required',
    });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Invalid date format. Expected YYYY-MM-DD',
    });
  }

  try {
    await getPoolAsync();

    // Start transaction
    await query('BEGIN');

    try {
      // Delete existing assignments for this date for these specific pets (not all assignments)
      // This allows incremental updates without wiping all assignments for the day
      const petIds = assignments.map(a => a.petId).filter(Boolean);
      if (petIds.length > 0) {
        await query(
          `DELETE FROM "RunAssignment"
           WHERE tenant_id = $1
             AND assigned_date = $2::date
             AND pet_id = ANY($3::uuid[])`,
          [tenantId, date, petIds]
        );
      }

      const created = [];
      const errors = [];

      // Insert new assignments
      for (const assignment of assignments) {
        const { runId, petId, startTime, endTime, bookingId, notes } = assignment;

        if (!runId || !petId) {
          errors.push({ assignment, error: 'runId and petId are required' });
          continue;
        }

        // Schema uses: assigned_date (DATE), start_time (TIME), end_time (TIME)
        // booking_id is required in schema, so we need to handle that
        let finalBookingId = bookingId;

        // If no bookingId provided, try to find an active booking for this pet on this date
        // Booking uses BookingPet junction table, not direct pet_id
        if (!finalBookingId) {
          const bookingResult = await query(
            `SELECT b.id FROM "Booking" b
             JOIN "BookingPet" bp ON bp.booking_id = b.id
             WHERE b.tenant_id = $1
               AND bp.pet_id = $2
               AND b.status IN ('CONFIRMED', 'CHECKED_IN')
               AND DATE(b.check_in) <= $3::date
               AND (b.check_out IS NULL OR DATE(b.check_out) >= $3::date)
             LIMIT 1`,
            [tenantId, petId, date]
          );
          if (bookingResult.rows.length > 0) {
            finalBookingId = bookingResult.rows[0].id;
          }
        }

        if (!finalBookingId) {
          errors.push({ assignment, error: 'No active booking found for this pet on this date' });
          continue;
        }

        try {
          const result = await query(
            `INSERT INTO "RunAssignment" (tenant_id, run_id, pet_id, booking_id, assigned_date, start_time, end_time, notes, created_by)
             VALUES ($1, $2, $3, $4, $5::date, $6::time, $7::time, $8, $9)
             RETURNING id`,
            [tenantId, runId, petId, finalBookingId, date, startTime || null, endTime || null, notes || null, userId]
          );

          created.push({
            id: result.rows[0].id,
            runId,
            petId,
            bookingId: finalBookingId,
            assignedDate: date,
            startTime,
            endTime,
          });
        } catch (insertError) {
          console.error('[RunAssignments] Insert failed:', insertError.message);
          errors.push({ assignment, error: insertError.message });
        }
      }

      // Commit transaction
      await query('COMMIT');

      console.log('[RunAssignments][save] Created:', created.length, 'Errors:', errors.length);

      return createResponse(200, {
        success: true,
        createdCount: created.length,
        created: created,
        errors: errors.length > 0 ? errors : undefined,
        message: `${created.length} assignment(s) saved successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      });

    } catch (txError) {
      await query('ROLLBACK');
      throw txError;
    }

  } catch (error) {
    console.error('[RunAssignments] Save failed:', error.message, error.stack);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to save run assignments',
      details: error.message, // Include actual error for debugging
    });
  }
}

/**
 * Get assignments for a specific run
 */
async function handleGetRunAssignmentsForRun(tenantId, runId, queryParams) {
  const { date, startDate, endDate } = queryParams;
  let rangeStart = startDate || date || new Date().toISOString().split('T')[0];
  let rangeEnd = endDate || date || rangeStart;

  console.log('[RunAssignments][forRun] runId:', runId, 'date range:', rangeStart, '-', rangeEnd);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         ra.id,
         ra.booking_id,
         ra.pet_id,
         ra.assigned_date,
         ra.start_time,
         ra.end_time,
         ra.is_individual,
         p.name as pet_name,
         p.species as pet_species,
         p.breed as pet_breed
       FROM "RunAssignment" ra
       LEFT JOIN "Pet" p ON p.id = ra.pet_id
       WHERE ra.run_id = $1
         AND ra.tenant_id = $2
         AND ra.assigned_date >= $3::date
         AND ra.assigned_date <= $4::date
       ORDER BY ra.start_time ASC`,
      [runId, tenantId, rangeStart, rangeEnd]
    );

    const assignments = result.rows.map(row => {
      const dateStr = row.assigned_date instanceof Date
        ? row.assigned_date.toISOString().split('T')[0]
        : (typeof row.assigned_date === 'string' ? row.assigned_date.split('T')[0] : null);

      const startAt = dateStr && row.start_time
        ? `${dateStr}T${row.start_time}`
        : dateStr;
      const endAt = dateStr && row.end_time
        ? `${dateStr}T${row.end_time}`
        : dateStr;

      return {
        id: row.id,
        bookingId: row.booking_id,
        petId: row.pet_id,
        petName: row.pet_name,
        petSpecies: row.pet_species,
        petBreed: row.pet_breed,
        assignedDate: dateStr,
        startAt: startAt,
        endAt: endAt,
        startTime: row.start_time?.toString().slice(0, 5),
        endTime: row.end_time?.toString().slice(0, 5),
        isIndividual: row.is_individual,
      };
    });

    return createResponse(200, {
      data: assignments,
      runId: runId,
      startDate: rangeStart,
      endDate: rangeEnd,
      total: assignments.length,
    });

  } catch (error) {
    console.error('[RunAssignments][forRun] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to get run assignments',
    });
  }
}

/**
 * Assign pets to a specific run
 * Body: { date, petIds, startTime, endTime }
 */
async function handleAssignPetsToRun(tenantId, runId, body) {
  const { date, petIds, startTime, endTime, bookingIds } = body;

  console.log('[RunAssignments][assignToRun] runId:', runId, 'petIds:', petIds?.length);

  if (!date) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'date is required',
    });
  }

  if (!Array.isArray(petIds) || petIds.length === 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'petIds array is required',
    });
  }

  try {
    await getPoolAsync();

    // Verify run exists - check Run table first, then RunTemplate
    let actualRunId = runId;

    // First check Run table
    const runCheck = await query(
      `SELECT id, name FROM "Run" WHERE id = $1 AND tenant_id = $2`,
      [runId, tenantId]
    );

    if (runCheck.rows.length > 0) {
      console.log('[RunAssignments][assignToRun] Found Run:', runCheck.rows[0].name);
    } else {
      // If not found in Run, check RunTemplate and create a Run from it
      const templateCheck = await query(
        `SELECT id, name, description, capacity, run_type FROM "RunTemplate" WHERE id = $1 AND tenant_id = $2`,
        [runId, tenantId]
      );

      if (templateCheck.rows.length > 0) {
        const template = templateCheck.rows[0];
        console.log('[RunAssignments][assignToRun] Found RunTemplate:', template.name, '- creating Run record');

        // Create a Run record from the template (using same ID for consistency)
        const createRun = await query(
          `INSERT INTO "Run" (id, tenant_id, name, description, capacity, run_type, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [template.id, tenantId, template.name, template.description, template.capacity, template.run_type]
        );

        if (createRun.rows.length > 0) {
          console.log('[RunAssignments][assignToRun] Created Run from template:', createRun.rows[0].id);
        } else {
          console.log('[RunAssignments][assignToRun] Run already exists (created by concurrent request)');
        }
        actualRunId = template.id;
      } else {
        return createResponse(404, {
          error: 'Not Found',
          message: 'Run or RunTemplate not found',
        });
      }
    }

    // Parse times - schema uses TIME columns, not TIMESTAMPTZ
    const startTimeVal = startTime || '08:00';
    const endTimeVal = endTime || '18:00';

    const created = [];
    const errors = [];

    for (let i = 0; i < petIds.length; i++) {
      const petId = petIds[i];
      const bookingId = bookingIds?.[i] || null;

      try {
        // Schema: assigned_date (DATE), start_time (TIME), end_time (TIME)
        // Check if assignment already exists for this pet/run/date
        const existingCheck = await query(
          `SELECT id FROM "RunAssignment" WHERE run_id = $1 AND pet_id = $2 AND assigned_date = $3::date`,
          [actualRunId, petId, date]
        );

        let result;
        if (existingCheck.rows.length > 0) {
          // Update existing
          result = await query(
            `UPDATE "RunAssignment" SET start_time = $1::time, end_time = $2::time, booking_id = COALESCE($3, booking_id)
             WHERE run_id = $4 AND pet_id = $5 AND assigned_date = $6::date
             RETURNING id`,
            [startTimeVal, endTimeVal, bookingId, actualRunId, petId, date]
          );
        } else {
          // Insert new
          result = await query(
            `INSERT INTO "RunAssignment" (tenant_id, run_id, pet_id, booking_id, assigned_date, start_time, end_time)
             VALUES ($1, $2, $3, $4, $5::date, $6::time, $7::time)
             RETURNING id`,
            [tenantId, actualRunId, petId, bookingId, date, startTimeVal, endTimeVal]
          );
        }

        created.push({
          id: result.rows[0].id,
          petId,
          assignedDate: date,
          startTime: startTimeVal,
          endTime: endTimeVal,
        });
      } catch (insertError) {
        console.error('[RunAssignments][assignToRun] Insert error for pet', petId, ':', insertError.message);
        errors.push({ petId, error: insertError.message });
      }
    }

    return createResponse(200, {
      success: true,
      createdCount: created.length,
      created: created,
      errors: errors.length > 0 ? errors : undefined,
      message: `${created.length} pet(s) assigned to run`,
    });

  } catch (error) {
    console.error('[RunAssignments][assignToRun] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to assign pets to run',
    });
  }
}

/**
 * Clear/remove assignments from a run
 * Body: { date?, petIds? } - if empty, clears all
 */
async function handleClearRunAssignments(tenantId, runId, body) {
  const { date, petIds, assignmentIds } = body;

  console.log('[RunAssignments][clear] runId:', runId, 'date:', date, 'petIds:', petIds?.length, 'assignmentIds:', assignmentIds?.length);

  try {
    await getPoolAsync();

    // Build DELETE query with conditions
    // Schema: assigned_date (DATE), start_time (TIME), end_time (TIME)
    let deleteQuery = `
      DELETE FROM "RunAssignment"
      WHERE run_id = $1 AND tenant_id = $2`;
    const params = [runId, tenantId];
    let paramIndex = 3;

    if (date) {
      deleteQuery += ` AND assigned_date = $${paramIndex++}::date`;
      params.push(date);
    }

    if (Array.isArray(petIds) && petIds.length > 0) {
      deleteQuery += ` AND pet_id = ANY($${paramIndex++}::uuid[])`;
      params.push(petIds);
    }

    if (Array.isArray(assignmentIds) && assignmentIds.length > 0) {
      deleteQuery += ` AND id = ANY($${paramIndex++}::uuid[])`;
      params.push(assignmentIds);
    }

    deleteQuery += ' RETURNING id, pet_id';

    // Execute delete directly (no archiving to avoid schema issues)
    const result = await query(deleteQuery, params);
    const deletedCount = result.rows.length;

    console.log('[RunAssignments][clear] Cleared:', deletedCount, 'assignments');

    return createResponse(200, {
      success: true,
      clearedCount: deletedCount,
      deletedIds: result.rows.map(r => r.id),
      message: `${deletedCount} assignment(s) cleared`,
    });

  } catch (error) {
    console.error('[RunAssignments][clear] Error:', error.message, error.stack);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to clear run assignments',
      details: error.message,
    });
  }
}

async function handleGetRun(tenantId, runId) {
  console.log('[Runs][get] tenantId:', tenantId, 'runId:', runId);

  try {
    await getPoolAsync();

    // Schema: Run has id, tenant_id, name, description, capacity, run_type, is_active
    const result = await query(
      `SELECT
         r.id,
         r.name,
         r.description,
         r.capacity,
         r.run_type,
         r.is_active,
         r.created_at,
         r.updated_at
       FROM "Run" r
       WHERE r.id = $1 AND r.tenant_id = $2`,
      [runId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Run not found',
      });
    }

    const row = result.rows[0];

    // Get assignments for this run
    const assignmentsResult = await query(
      `SELECT
         ra.id,
         ra.booking_id,
         ra.pet_id,
         ra.assigned_date,
         ra.start_time,
         ra.end_time,
         ra.is_individual,
         p.name as pet_name,
         p.species as pet_species
       FROM "RunAssignment" ra
       LEFT JOIN "Pet" p ON ra.pet_id = p.id
       WHERE ra.run_id = $1
       ORDER BY ra.assigned_date ASC, ra.start_time ASC`,
      [runId]
    );

    const assignments = assignmentsResult.rows.map(a => {
      const dateStr = a.assigned_date instanceof Date
        ? a.assigned_date.toISOString().split('T')[0]
        : (typeof a.assigned_date === 'string' ? a.assigned_date.split('T')[0] : null);

      const startAt = dateStr && a.start_time
        ? `${dateStr}T${a.start_time}`
        : dateStr;
      const endAt = dateStr && a.end_time
        ? `${dateStr}T${a.end_time}`
        : dateStr;

      return {
        id: a.id,
        bookingId: a.booking_id,
        petId: a.pet_id,
        petName: a.pet_name,
        petSpecies: a.pet_species,
        assignedDate: dateStr,
        startAt: startAt,
        endAt: endAt,
        startTime: a.start_time?.toString().slice(0, 5),
        endTime: a.end_time?.toString().slice(0, 5),
        isIndividual: a.is_individual,
      };
    });

    return createResponse(200, {
      id: row.id,
      name: row.name,
      description: row.description,
      capacity: row.capacity || 10,
      maxCapacity: row.capacity || 10,
      runType: row.run_type,
      isActive: row.is_active,
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
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
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
    // Soft delete using archive pattern
    const deletedRecord = await softDelete('Run', runId, tenantId);

    if (!deletedRecord) {
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

    // Get run details - Run table has: id, tenant_id, name, description, capacity, run_type, is_active
    const runResult = await query(
      `SELECT r.id, r.name, r.description, r.capacity, r.run_type, r.is_active
       FROM "Run" r
       WHERE r.id = $1 AND r.tenant_id = $2`,
      [runId, tenantId]
    );

    if (runResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Run not found',
      });
    }

    const run = runResult.rows[0];

    // Get existing assignments
    const assignmentsResult = await query(
      `SELECT assigned_date, start_time, end_time FROM "RunAssignment"
       WHERE run_id = $1`,
      [runId]
    );

    // Use run's capacity directly
    const maxCapacity = run.capacity || 10;

    return createResponse(200, {
      data: [],
      slots: [],
      runId: runId,
      maxCapacity: maxCapacity,
      capacity: maxCapacity,
      runType: run.run_type,
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
    // Schema: task_type (not type)
    if (typeFilter.includes('task') || typeFilter.includes('tasks')) {
      const tasksResult = await query(
        `SELECT
           t.id,
           t.title,
           t.description,
           t.status,
           t.priority,
           t.task_type,
           t.scheduled_for,
           t.due_at,
           u.first_name as assignee_first_name,
           u.last_name as assignee_last_name,
           p.name as pet_name
         FROM "Task" t
         LEFT JOIN "User" u ON t.assigned_to = u.id
         LEFT JOIN "Pet" p ON t.pet_id = p.id
         WHERE t.tenant_id = $1
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
          taskType: row.task_type,
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
           ra.assigned_date,
           ra.start_time,
           ra.end_time,
           ra.is_individual,
           r.name as run_name,
           r.description as run_description,
           r.run_type,
           p.name as pet_name,
           p.species as pet_species,
           p.photo_url as pet_photo_url
         FROM "RunAssignment" ra
         JOIN "Run" r ON ra.run_id = r.id AND r.tenant_id = ra.tenant_id
         LEFT JOIN "Pet" p ON ra.pet_id = p.id
         WHERE ra.tenant_id = $1
           AND ra.assigned_date BETWEEN $2::date AND $3::date
         ORDER BY ra.assigned_date ASC, ra.start_time ASC`,
        [tenantId, start, end]
      );

      runsResult.rows.forEach(row => {
        // Combine assigned_date with start_time/end_time for calendar display
        // assigned_date could be a Date object or ISO string
        const dateStr = row.assigned_date instanceof Date
          ? row.assigned_date.toISOString().split('T')[0]
          : (typeof row.assigned_date === 'string' ? row.assigned_date.split('T')[0] : null);

        const startDateTime = dateStr && row.start_time
          ? `${dateStr}T${row.start_time}`
          : dateStr;
        const endDateTime = dateStr && row.end_time
          ? `${dateStr}T${row.end_time}`
          : dateStr;

        events.push({
          id: row.id,
          type: 'run',
          title: `${row.pet_name || 'Pet'} - ${row.run_name || 'Run'}`,
          start: startDateTime,
          end: endDateTime,
          runId: row.run_id,
          runName: row.run_name,
          runDescription: row.run_description,
          runType: row.run_type,
          petId: row.pet_id,
          petName: row.pet_name,
          petSpecies: row.pet_species,
          petPhotoUrl: row.pet_photo_url,
          isIndividual: row.is_individual,
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
       WHERE tenant_id = $1 `,
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
// SMS NOTIFICATION HANDLERS (Twilio)
// =============================================================================

// Import SMS utils from shared layer
let smsUtils;
try {
  smsUtils = require('/opt/nodejs/sms-utils');
} catch (e) {
  // Local development fallback
  try {
    smsUtils = require('../../layers/shared-layer/nodejs/sms-utils');
  } catch (e2) {
    console.warn('[SMS] SMS utils not available');
    smsUtils = null;
  }
}

/**
 * Send a generic SMS
 */
async function handleSendSMS(tenantId, user, body) {
  const { to, message } = body;

  console.log('[SMS] handleSendSMS:', { tenantId, to: to?.substring(0, 6) + '...' });

  if (!to || !message) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Phone number and message are required',
    });
  }

  if (!smsUtils || !smsUtils.isSMSConfigured()) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'SMS service is not configured',
    });
  }

  try {
    const result = await smsUtils.sendSMS(to, message);

    // Log to Communication table
    await logSMSToCommunication(tenantId, {
      recipientPhone: to,
      content: message,
      status: 'sent',
      messageSid: result.sid,
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageSid: result.sid,
      message: 'SMS sent successfully',
    });

  } catch (error) {
    console.error('[SMS] Failed to send:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send SMS',
    });
  }
}

/**
 * Send booking confirmation SMS
 */
async function handleSendBookingConfirmationSMS(tenantId, user, body) {
  const { bookingId, phoneNumber } = body;

  console.log('[SMS] handleSendBookingConfirmationSMS:', { tenantId, bookingId });

  if (!bookingId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'bookingId is required',
    });
  }

  if (!smsUtils || !smsUtils.isSMSConfigured()) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'SMS service is not configured',
    });
  }

  try {
    await getPoolAsync();

    // Get booking with owner info
    const bookingResult = await query(
      `SELECT b.*, o.phone as owner_phone, o.first_name as owner_first_name
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
    const phone = phoneNumber || booking.owner_phone;

    if (!phone) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No phone number available for owner',
      });
    }

    // Get pet names
    const petsResult = await query(
      `SELECT p.name FROM "Pet" p WHERE p.id = ANY($1::uuid[])`,
      [booking.pet_ids || []]
    );
    const petNames = petsResult.rows.map(r => r.name).join(', ') || 'your pet';

    const result = await smsUtils.sendBookingConfirmationSMS(phone, {
      petNames,
      startDate: new Date(booking.start_date).toLocaleDateString(),
    });

    await logSMSToCommunication(tenantId, {
      recipientPhone: phone,
      content: 'Booking confirmation SMS',
      status: 'sent',
      messageSid: result.sid,
      templateUsed: 'bookingConfirmation',
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageSid: result.sid,
      message: 'Booking confirmation SMS sent',
    });

  } catch (error) {
    console.error('[SMS] Failed to send booking confirmation:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send booking confirmation SMS',
    });
  }
}

/**
 * Send booking reminder SMS
 */
async function handleSendBookingReminderSMS(tenantId, user, body) {
  const { bookingId, phoneNumber } = body;

  console.log('[SMS] handleSendBookingReminderSMS:', { tenantId, bookingId });

  if (!bookingId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'bookingId is required',
    });
  }

  if (!smsUtils || !smsUtils.isSMSConfigured()) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'SMS service is not configured',
    });
  }

  try {
    await getPoolAsync();

    const bookingResult = await query(
      `SELECT b.*, o.phone as owner_phone
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
    const phone = phoneNumber || booking.owner_phone;

    if (!phone) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No phone number available for owner',
      });
    }

    // Get pet names
    const petsResult = await query(
      `SELECT p.name FROM "Pet" p WHERE p.id = ANY($1::uuid[])`,
      [booking.pet_ids || []]
    );
    const petNames = petsResult.rows.map(r => r.name).join(', ') || 'Your pet';

    const result = await smsUtils.sendBookingReminderSMS(phone, {
      petNames,
      startDate: new Date(booking.start_date).toLocaleDateString(),
      checkInTime: '9:00 AM',
    });

    await logSMSToCommunication(tenantId, {
      recipientPhone: phone,
      content: 'Booking reminder SMS',
      status: 'sent',
      messageSid: result.sid,
      templateUsed: 'bookingReminder',
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageSid: result.sid,
      message: 'Booking reminder SMS sent',
    });

  } catch (error) {
    console.error('[SMS] Failed to send booking reminder:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send booking reminder SMS',
    });
  }
}

/**
 * Send check-in confirmation SMS
 */
async function handleSendCheckInSMS(tenantId, user, body) {
  const { bookingId, phoneNumber } = body;

  console.log('[SMS] handleSendCheckInSMS:', { tenantId, bookingId });

  if (!bookingId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'bookingId is required',
    });
  }

  if (!smsUtils || !smsUtils.isSMSConfigured()) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'SMS service is not configured',
    });
  }

  try {
    await getPoolAsync();

    const bookingResult = await query(
      `SELECT b.*, o.phone as owner_phone
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
    const phone = phoneNumber || booking.owner_phone;

    if (!phone) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No phone number available for owner',
      });
    }

    // Get pet names
    const petsResult = await query(
      `SELECT p.name FROM "Pet" p WHERE p.id = ANY($1::uuid[])`,
      [booking.pet_ids || []]
    );
    const petNames = petsResult.rows.map(r => r.name).join(', ') || 'Your pet';

    const result = await smsUtils.sendCheckInConfirmationSMS(phone, {
      petNames,
      endDate: new Date(booking.end_date).toLocaleDateString(),
    });

    await logSMSToCommunication(tenantId, {
      recipientPhone: phone,
      content: 'Check-in confirmation SMS',
      status: 'sent',
      messageSid: result.sid,
      templateUsed: 'checkInConfirmation',
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageSid: result.sid,
      message: 'Check-in confirmation SMS sent',
    });

  } catch (error) {
    console.error('[SMS] Failed to send check-in confirmation:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send check-in confirmation SMS',
    });
  }
}

/**
 * Send check-out confirmation SMS
 */
async function handleSendCheckOutSMS(tenantId, user, body) {
  const { bookingId, phoneNumber } = body;

  console.log('[SMS] handleSendCheckOutSMS:', { tenantId, bookingId });

  if (!bookingId) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'bookingId is required',
    });
  }

  if (!smsUtils || !smsUtils.isSMSConfigured()) {
    return createResponse(503, {
      error: 'Service Unavailable',
      message: 'SMS service is not configured',
    });
  }

  try {
    await getPoolAsync();

    const bookingResult = await query(
      `SELECT b.*, o.phone as owner_phone
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
    const phone = phoneNumber || booking.owner_phone;

    if (!phone) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No phone number available for owner',
      });
    }

    // Get pet names
    const petsResult = await query(
      `SELECT p.name FROM "Pet" p WHERE p.id = ANY($1::uuid[])`,
      [booking.pet_ids || []]
    );
    const petNames = petsResult.rows.map(r => r.name).join(', ') || 'Your pet';

    const result = await smsUtils.sendCheckOutConfirmationSMS(phone, {
      petNames,
    });

    await logSMSToCommunication(tenantId, {
      recipientPhone: phone,
      content: 'Check-out confirmation SMS',
      status: 'sent',
      messageSid: result.sid,
      templateUsed: 'checkOutConfirmation',
      userId: user?.id,
    });

    return createResponse(200, {
      success: true,
      messageSid: result.sid,
      message: 'Check-out confirmation SMS sent',
    });

  } catch (error) {
    console.error('[SMS] Failed to send check-out confirmation:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to send check-out confirmation SMS',
    });
  }
}

/**
 * Get SMS configuration status
 */
async function handleGetSMSConfig(tenantId) {
  const isConfigured = smsUtils && smsUtils.isSMSConfigured();

  return createResponse(200, {
    configured: isConfigured,
    provider: isConfigured ? 'twilio' : null,
    message: isConfigured ? 'SMS service is configured' : 'SMS service is not configured',
  });
}

/**
 * Log SMS to Communication table
 */
async function logSMSToCommunication(tenantId, { recipientPhone, content, status, messageSid, templateUsed, userId }) {
  try {
    await query(
      `INSERT INTO "Communication" (
         tenant_id, type, recipient_phone, content, status,
         external_id, template_used, sent_by, created_at
       ) VALUES ($1, 'sms', $2, $3, $4, $5, $6, $7, NOW())`,
      [tenantId, recipientPhone, content, status, messageSid || null, templateUsed || null, userId || null]
    );
  } catch (error) {
    // Log error but don't fail the operation
    console.warn('[SMS] Failed to log communication:', error.message);
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

    let whereClause = 'i.tenant_id = $1';
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

    // Incident table schema:
    // id, tenant_id, title, description, incident_type, severity, status,
    // incident_date, location, pet_id, booking_id, reported_by, witnesses,
    // immediate_actions, vet_contacted, medical_treatment, resolution_notes,
    // resolved_at, resolved_by, attachments, created_at, updated_at
    const result = await query(
      `SELECT
         i.id,
         i.tenant_id,
         i.title,
         i.description,
         i.incident_type,
         i.severity,
         i.status,
         i.incident_date,
         i.location,
         i.pet_id,
         i.booking_id,
         i.reported_by,
         i.witnesses,
         i.immediate_actions,
         i.vet_contacted,
         i.medical_treatment,
         i.resolution_notes,
         i.resolved_at,
         i.resolved_by,
         i.attachments,
         i.created_at,
         i.updated_at,
         p.name as pet_name,
         o.id as owner_id,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email,
         o.phone as owner_phone,
         u.first_name as reported_by_first_name,
         u.last_name as reported_by_last_name
       FROM "Incident" i
       LEFT JOIN "Pet" p ON i.pet_id = p.id
       LEFT JOIN "PetOwner" po ON p.id = po.pet_id AND po.is_primary = true
       LEFT JOIN "Owner" o ON po.owner_id = o.id
       LEFT JOIN "User" u ON i.reported_by = u.id
       WHERE ${whereClause}
       ORDER BY i.incident_date DESC, i.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const incidents = result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      incidentType: row.incident_type,
      severity: row.severity,
      status: row.status,
      incidentDate: row.incident_date,
      location: row.location,
      petId: row.pet_id,
      petName: row.pet_name,
      bookingId: row.booking_id,
      ownerId: row.owner_id,
      ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim() : null,
      ownerEmail: row.owner_email,
      ownerPhone: row.owner_phone,
      reportedBy: row.reported_by,
      reportedByName: row.reported_by_first_name ? `${row.reported_by_first_name} ${row.reported_by_last_name || ''}`.trim() : null,
      witnesses: row.witnesses,
      immediateActions: row.immediate_actions,
      vetContacted: row.vet_contacted,
      medicalTreatment: row.medical_treatment,
      resolutionNotes: row.resolution_notes,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      attachments: row.attachments,
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
       WHERE i.id = $1 AND i.tenant_id = $2`,
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
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
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
async function handleDeleteIncident(tenantId, user, incidentId) {
  console.log('[Incidents][delete] id:', incidentId, 'tenantId:', tenantId);

  // Check permission
  const permError = checkPermission(user, PERMISSIONS?.INCIDENTS_DELETE || 'incidents:delete', createResponse);
  if (permError) return permError;

  try {
    // Soft delete using archive pattern
    const deletedRecord = await softDelete('Incident', incidentId, tenantId, user.userId);

    if (!deletedRecord) {
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
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
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
       WHERE i.id = $1 AND i.tenant_id = $2`,
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
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
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

// =============================================================================
// TIME CLOCK HANDLERS
// =============================================================================

/**
 * Clock in - Start a time entry
 */
async function handleClockIn(tenantId, user, body) {
  const { notes, location } = body;
  const userId = user?.userId; // Use userId (database User.id), not id (cognitoSub)

  console.log('[TimeClock][clockIn] tenantId:', tenantId, 'userId:', userId);

  try {
    await getPoolAsync();

    if (!userId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'User ID is required',
      });
    }

    // Check if already clocked in (has active entry without clock_out)
    const activeResult = await query(
      `SELECT id, clock_in FROM "TimeEntry"
       WHERE tenant_id = $1 AND user_id = $2 AND clock_out IS NULL
       LIMIT 1`,
      [tenantId, userId]
    );

    if (activeResult.rows.length > 0) {
      const active = activeResult.rows[0];
      return createResponse(409, {
        error: 'Conflict',
        message: 'Already clocked in',
        activeEntry: {
          id: active.id,
          clockIn: active.clock_in,
        },
      });
    }

    // Create new time entry
    const result = await query(
      `INSERT INTO "TimeEntry" (tenant_id, user_id, clock_in, notes, location, status)
       VALUES ($1, $2, NOW(), $3, $4, 'ACTIVE')
       RETURNING *`,
      [tenantId, userId, notes || null, location || null]
    );

    const entry = result.rows[0];
    console.log('[TimeClock][clockIn] Created entry:', entry.id);

    return createResponse(201, {
      success: true,
      id: entry.id,
      userId: entry.user_id,
      clockIn: entry.clock_in,
      status: entry.status,
      message: 'Clocked in successfully',
    });

  } catch (error) {
    console.error('[TimeClock] Clock in failed:', error.message, error.stack);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to clock in',
      detail: error.message,
    });
  }
}

/**
 * Clock out - End a time entry
 */
async function handleClockOut(tenantId, user, body) {
  const { entryId, notes } = body;
  const userId = user?.userId; // Use userId (database User.id), not id (cognitoSub)

  console.log('[TimeClock][clockOut] tenantId:', tenantId, 'userId:', userId);

  try {
    await getPoolAsync();

    if (!userId && !entryId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'User ID or entry ID is required',
      });
    }

    // Find active entry
    let activeResult;
    if (entryId) {
      activeResult = await query(
        `SELECT * FROM "TimeEntry"
         WHERE id = $1 AND tenant_id = $2 AND clock_out IS NULL`,
        [entryId, tenantId]
      );
    } else {
      activeResult = await query(
        `SELECT * FROM "TimeEntry"
         WHERE tenant_id = $1 AND user_id = $2 AND clock_out IS NULL
         ORDER BY clock_in DESC LIMIT 1`,
        [tenantId, userId]
      );
    }

    if (activeResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'No active time entry found',
      });
    }

    const active = activeResult.rows[0];

    // End any active break
    let totalBreakMinutes = active.break_minutes || 0;
    if (active.is_on_break && active.break_start) {
      const breakDuration = Math.floor((new Date() - new Date(active.break_start)) / 60000);
      totalBreakMinutes += breakDuration;
    }

    // Update entry with clock out
    const result = await query(
      `UPDATE "TimeEntry"
       SET clock_out = NOW(),
           status = 'COMPLETED',
           notes = COALESCE($3, notes),
           break_minutes = $4,
           is_on_break = false,
           break_start = NULL,
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [active.id, tenantId, notes, totalBreakMinutes]
    );

    const entry = result.rows[0];
    const workedMinutes = Math.floor((new Date(entry.clock_out) - new Date(entry.clock_in)) / 60000) - totalBreakMinutes;

    console.log('[TimeClock][clockOut] Updated entry:', entry.id);

    return createResponse(200, {
      success: true,
      id: entry.id,
      clockIn: entry.clock_in,
      clockOut: entry.clock_out,
      breakMinutes: totalBreakMinutes,
      workedMinutes: workedMinutes,
      workedHours: (workedMinutes / 60).toFixed(2),
      status: entry.status,
      message: 'Clocked out successfully',
    });

  } catch (error) {
    console.error('[TimeClock] Clock out failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to clock out',
    });
  }
}

/**
 * Start break
 */
async function handleStartBreak(tenantId, user, body) {
  const { entryId } = body;
  const userId = user?.userId; // Use userId (database User.id), not id (cognitoSub)

  console.log('[TimeClock][startBreak] tenantId:', tenantId, 'userId:', userId);

  try {
    await getPoolAsync();

    // Find active entry
    let whereClause = 'tenant_id = $1 AND clock_out IS NULL';
    const params = [tenantId];

    if (entryId) {
      whereClause += ' AND id = $2';
      params.push(entryId);
    } else if (userId) {
      whereClause += ' AND user_id = $2';
      params.push(userId);
    }

    const activeResult = await query(
      `SELECT * FROM "TimeEntry" WHERE ${whereClause} LIMIT 1`,
      params
    );

    if (activeResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'No active time entry found',
      });
    }

    const active = activeResult.rows[0];

    if (active.is_on_break) {
      return createResponse(409, {
        error: 'Conflict',
        message: 'Already on break',
        breakStart: active.break_start,
      });
    }

    const result = await query(
      `UPDATE "TimeEntry"
       SET is_on_break = true, break_start = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [active.id, tenantId]
    );

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      breakStart: result.rows[0].break_start,
      message: 'Break started',
    });

  } catch (error) {
    console.error('[TimeClock] Start break failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to start break',
    });
  }
}

/**
 * End break
 */
async function handleEndBreak(tenantId, user, body) {
  const { entryId } = body;
  const userId = user?.userId; // Use userId (database User.id), not id (cognitoSub)

  console.log('[TimeClock][endBreak] tenantId:', tenantId, 'userId:', userId);

  try {
    await getPoolAsync();

    // Find active entry on break
    let whereClause = 'tenant_id = $1 AND clock_out IS NULL AND is_on_break = true';
    const params = [tenantId];

    if (entryId) {
      whereClause += ' AND id = $2';
      params.push(entryId);
    } else if (userId) {
      whereClause += ' AND user_id = $2';
      params.push(userId);
    }

    const activeResult = await query(
      `SELECT * FROM "TimeEntry" WHERE ${whereClause} LIMIT 1`,
      params
    );

    if (activeResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'No active break found',
      });
    }

    const active = activeResult.rows[0];
    const breakDuration = Math.floor((new Date() - new Date(active.break_start)) / 60000);
    const totalBreakMinutes = (active.break_minutes || 0) + breakDuration;

    const result = await query(
      `UPDATE "TimeEntry"
       SET is_on_break = false, break_start = NULL, break_minutes = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [active.id, tenantId, totalBreakMinutes]
    );

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      breakDurationMinutes: breakDuration,
      totalBreakMinutes: totalBreakMinutes,
      message: 'Break ended',
    });

  } catch (error) {
    console.error('[TimeClock] End break failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to end break',
    });
  }
}

/**
 * Get current time status for user
 * Includes: current status, today's total, week total, recent entries
 */
async function handleGetTimeStatus(tenantId, user, queryParams) {
  const userId = queryParams.userId || user?.userId; // Use userId (database User.id), not id (cognitoSub)

  console.log('[TimeClock][getStatus] tenantId:', tenantId, 'userId:', userId);

  try {
    await getPoolAsync();

    if (!userId) {
      return createResponse(200, {
        isClockedIn: false,
        isOnBreak: false,
        workedMinutes: 0,
        weekTotal: 0,
        recentEntries: [],
        message: 'No user ID',
      });
    }

    // Get active entry
    const activeResult = await query(
      `SELECT te.*, u.first_name, u.last_name
       FROM "TimeEntry" te
       JOIN "User" u ON te.user_id = u.id
       WHERE te.tenant_id = $1 AND te.user_id = $2 AND te.clock_out IS NULL
       LIMIT 1`,
      [tenantId, userId]
    );

    // Get week totals (completed entries this week, Monday to Sunday)
    const weekTotalResult = await query(
      `SELECT COALESCE(SUM(
         EXTRACT(EPOCH FROM (clock_out - clock_in)) / 60 - COALESCE(break_minutes, 0)
       ), 0) as total_minutes
       FROM "TimeEntry"
       WHERE tenant_id = $1 AND user_id = $2 AND clock_out IS NOT NULL
       AND clock_in >= DATE_TRUNC('week', CURRENT_DATE)`,
      [tenantId, userId]
    );
    const weekTotal = Math.round(weekTotalResult.rows[0]?.total_minutes || 0);

    // Get recent completed entries (last 5)
    const recentResult = await query(
      `SELECT id, DATE(clock_in) as date, clock_in, clock_out, break_minutes,
       ROUND(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600 - COALESCE(break_minutes, 0) / 60.0, 1) as worked_hours
       FROM "TimeEntry"
       WHERE tenant_id = $1 AND user_id = $2 AND clock_out IS NOT NULL
       ORDER BY clock_in DESC LIMIT 5`,
      [tenantId, userId]
    );
    const recentEntries = recentResult.rows.map(row => ({
      id: row.id,
      date: row.date,
      clockIn: row.clock_in,
      clockOut: row.clock_out,
      breakMinutes: row.break_minutes,
      workedHours: parseFloat(row.worked_hours) || 0,
    }));

    if (activeResult.rows.length === 0) {
      return createResponse(200, {
        isClockedIn: false,
        isOnBreak: false,
        userId: userId,
        workedMinutes: 0,
        weekTotal: weekTotal,
        recentEntries: recentEntries,
      });
    }

    const entry = activeResult.rows[0];
    const now = new Date();
    const clockInTime = new Date(entry.clock_in);
    const elapsedMinutes = Math.floor((now - clockInTime) / 60000);

    let currentBreakMinutes = entry.break_minutes || 0;
    if (entry.is_on_break && entry.break_start) {
      currentBreakMinutes += Math.floor((now - new Date(entry.break_start)) / 60000);
    }

    const workedMinutes = elapsedMinutes - currentBreakMinutes;

    return createResponse(200, {
      isClockedIn: true,
      isOnBreak: entry.is_on_break,
      entryId: entry.id,
      userId: userId,
      userName: `${entry.first_name} ${entry.last_name}`.trim(),
      clockIn: entry.clock_in,
      breakStart: entry.break_start,
      elapsedMinutes: elapsedMinutes,
      breakMinutes: currentBreakMinutes,
      workedMinutes: workedMinutes,
      workedHours: (workedMinutes / 60).toFixed(2),
      weekTotal: weekTotal + workedMinutes, // Include current session in week total
      recentEntries: recentEntries,
    });

  } catch (error) {
    console.error('[TimeClock] Get status failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to get time status',
    });
  }
}

/**
 * Get time entries
 */
async function handleGetTimeEntries(tenantId, queryParams) {
  const { userId, startDate, endDate, status, limit = 50, offset = 0 } = queryParams;

  console.log('[TimeClock][list] tenantId:', tenantId, queryParams);

  try {
    await getPoolAsync();

    let whereClause = 'te.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (userId) {
      whereClause += ` AND te.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    if (status) {
      whereClause += ` AND te.status = $${paramIndex++}`;
      params.push(status.toUpperCase());
    }
    if (startDate && endDate) {
      whereClause += ` AND DATE(te.clock_in) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    const result = await query(
      `SELECT
         te.*,
         u.first_name, u.last_name, u.email as user_email,
         approver.first_name as approved_by_first, approver.last_name as approved_by_last
       FROM "TimeEntry" te
       JOIN "User" u ON te.user_id = u.id
       LEFT JOIN "User" approver ON te.approved_by = approver.id
       WHERE ${whereClause}
       ORDER BY te.clock_in DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const entries = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: `${row.first_name} ${row.last_name}`.trim(),
      userEmail: row.user_email,
      clockIn: row.clock_in,
      clockOut: row.clock_out,
      breakMinutes: row.break_minutes,
      totalMinutes: row.total_minutes,
      totalHours: row.total_minutes ? (row.total_minutes / 60).toFixed(2) : null,
      status: row.status,
      notes: row.notes,
      location: row.location,
      isOnBreak: row.is_on_break,
      approvedBy: row.approved_by,
      approvedByName: row.approved_by_first ? `${row.approved_by_first} ${row.approved_by_last}`.trim() : null,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    }));

    console.log('[TimeClock][list] Found:', entries.length);

    return createResponse(200, {
      data: entries,
      entries: entries,
      total: entries.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    console.error('[TimeClock] Get entries failed:', error.message);

    if (error.message?.includes('does not exist')) {
      return createResponse(200, {
        data: [],
        entries: [],
        total: 0,
        message: 'TimeEntry table not initialized',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve time entries',
    });
  }
}

/**
 * Get single time entry
 */
async function handleGetTimeEntry(tenantId, entryId) {
  console.log('[TimeClock][get] id:', entryId);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         te.*,
         u.first_name, u.last_name, u.email as user_email
       FROM "TimeEntry" te
       JOIN "User" u ON te.user_id = u.id
       WHERE te.id = $1 AND te.tenant_id = $2`,
      [entryId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Time entry not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      userId: row.user_id,
      userName: `${row.first_name} ${row.last_name}`.trim(),
      clockIn: row.clock_in,
      clockOut: row.clock_out,
      breakMinutes: row.break_minutes,
      totalMinutes: row.total_minutes,
      status: row.status,
      notes: row.notes,
      location: row.location,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      editedBy: row.edited_by,
      editedAt: row.edited_at,
      editReason: row.edit_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

  } catch (error) {
    console.error('[TimeClock] Get entry failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve time entry',
    });
  }
}

/**
 * Update time entry (admin edit)
 */
async function handleUpdateTimeEntry(tenantId, user, entryId, body) {
  const { clockIn, clockOut, breakMinutes, notes, editReason } = body;

  console.log('[TimeClock][update] id:', entryId);

  try {
    await getPoolAsync();

    // Get current entry
    const currentResult = await query(
      `SELECT * FROM "TimeEntry" WHERE id = $1 AND tenant_id = $2 `,
      [entryId, tenantId]
    );

    if (currentResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Time entry not found',
      });
    }

    const current = currentResult.rows[0];

    const updates = ['status = \'EDITED\'', 'edited_by = $3', 'edited_at = NOW()', 'updated_at = NOW()'];
    const values = [entryId, tenantId, user?.id];
    let paramIndex = 4;

    // Store original values on first edit
    if (!current.original_clock_in) {
      updates.push(`original_clock_in = clock_in`);
      updates.push(`original_clock_out = clock_out`);
    }

    if (clockIn !== undefined) {
      updates.push(`clock_in = $${paramIndex++}`);
      values.push(clockIn);
    }
    if (clockOut !== undefined) {
      updates.push(`clock_out = $${paramIndex++}`);
      values.push(clockOut);
    }
    if (breakMinutes !== undefined) {
      updates.push(`break_minutes = $${paramIndex++}`);
      values.push(breakMinutes);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    if (editReason !== undefined) {
      updates.push(`edit_reason = $${paramIndex++}`);
      values.push(editReason);
    }

    const result = await query(
      `UPDATE "TimeEntry" SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      values
    );

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      message: 'Time entry updated',
    });

  } catch (error) {
    console.error('[TimeClock] Update failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update time entry',
    });
  }
}

/**
 * Delete time entry
 */
async function handleDeleteTimeEntry(tenantId, user, entryId) {
  // Check permission
  const permError = checkPermission(user, PERMISSIONS.TIMECLOCK_EDIT, createResponse);
  if (permError) return permError;

  console.log('[TimeClock][delete] id:', entryId);

  try {
    // Soft delete using archive pattern
    const deletedRecord = await softDelete('TimeEntry', entryId, tenantId, user.userId);

    if (!deletedRecord) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Time entry not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Time entry deleted',
    });

  } catch (error) {
    console.error('[TimeClock] Delete failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete time entry',
    });
  }
}

/**
 * Approve time entry
 */
async function handleApproveTimeEntry(tenantId, user, entryId, body) {
  const { approvalNotes } = body;

  console.log('[TimeClock][approve] id:', entryId);

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "TimeEntry"
       SET approved_by = $3, approved_at = NOW(), approval_notes = $4, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
      [entryId, tenantId, user?.id, approvalNotes || null]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Time entry not found',
      });
    }

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      approvedAt: result.rows[0].approved_at,
      message: 'Time entry approved',
    });

  } catch (error) {
    console.error('[TimeClock] Approve failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to approve time entry',
    });
  }
}

// =============================================================================
// SHIFT/SCHEDULE HANDLERS
// =============================================================================

/**
 * Get shifts
 */
async function handleGetShifts(tenantId, queryParams) {
  const { staffId, startDate, endDate, status, role, limit = 100, offset = 0 } = queryParams;

  console.log('[Shifts][list] tenantId:', tenantId, queryParams);

  try {
    await getPoolAsync();

    let whereClause = 'sh.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (staffId) {
      whereClause += ` AND sh.staff_id = $${paramIndex++}`;
      params.push(staffId);
    }
    if (status) {
      whereClause += ` AND sh.status = $${paramIndex++}`;
      params.push(status.toUpperCase());
    }
    if (role) {
      whereClause += ` AND sh.role = $${paramIndex++}`;
      params.push(role);
    }
    if (startDate && endDate) {
      whereClause += ` AND sh.start_time >= $${paramIndex} AND sh.start_time < $${paramIndex + 1}::date + interval '1 day'`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    const result = await query(
      `SELECT
         sh.*,
         s.first_name, s.last_name, s.email as staff_email, s.role as staff_role
       FROM "Shift" sh
       JOIN "Staff" s ON sh.staff_id = s.id
       WHERE ${whereClause}
       ORDER BY sh.start_time ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const shifts = result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      staffId: row.staff_id,
      staffName: `${row.first_name} ${row.last_name}`.trim(),
      staffEmail: row.staff_email,
      staffRole: row.staff_role,
      startTime: row.start_time,
      endTime: row.end_time,
      role: row.role,
      department: row.department,
      location: row.location,
      status: row.status,
      notes: row.notes,
      isRecurring: row.is_recurring,
      recurrencePattern: row.recurrence_pattern,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log('[Shifts][list] Found:', shifts.length);

    return createResponse(200, {
      data: shifts,
      shifts: shifts,
      total: shifts.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    console.error('[Shifts] Get shifts failed:', error.message);

    if (error.message?.includes('does not exist')) {
      return createResponse(200, {
        data: [],
        shifts: [],
        total: 0,
        message: 'Shift table not initialized',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve shifts',
    });
  }
}

/**
 * Get single shift
 */
async function handleGetShift(tenantId, shiftId) {
  console.log('[Shifts][get] id:', shiftId);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         sh.*,
         s.first_name, s.last_name, s.email as staff_email
       FROM "Shift" sh
       JOIN "Staff" s ON sh.staff_id = s.id
       WHERE sh.id = $1 AND sh.tenant_id = $2`,
      [shiftId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Shift not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      staffId: row.staff_id,
      staffName: `${row.first_name} ${row.last_name}`.trim(),
      startTime: row.start_time,
      endTime: row.end_time,
      role: row.role,
      department: row.department,
      location: row.location,
      status: row.status,
      notes: row.notes,
      isRecurring: row.is_recurring,
      recurrencePattern: row.recurrence_pattern,
      createdAt: row.created_at,
    });

  } catch (error) {
    console.error('[Shifts] Get shift failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve shift',
    });
  }
}

/**
 * Create shift
 */
async function handleCreateShift(tenantId, user, body) {
  const { staffId, startTime, endTime, role, department, location, notes, isRecurring, recurrencePattern, recurrenceEndDate } = body;

  console.log('[Shifts][create] tenantId:', tenantId);

  if (!staffId || !startTime || !endTime) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'staffId, startTime, and endTime are required',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `INSERT INTO "Shift" (
         tenant_id, staff_id, start_time, end_time, role, department, location,
         notes, is_recurring, recurrence_pattern, recurrence_end_date,
         status, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'SCHEDULED', $12)
       RETURNING *`,
      [
        tenantId, staffId, startTime, endTime,
        role || null, department || null, location || null,
        notes || null, isRecurring || false, recurrencePattern || null,
        recurrenceEndDate || null, user?.id
      ]
    );

    const shift = result.rows[0];
    console.log('[Shifts][create] Created:', shift.id);

    return createResponse(201, {
      success: true,
      id: shift.id,
      startTime: shift.start_time,
      endTime: shift.end_time,
      message: 'Shift created successfully',
    });

  } catch (error) {
    console.error('[Shifts] Create failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create shift',
    });
  }
}

/**
 * Update shift
 */
async function handleUpdateShift(tenantId, user, shiftId, body) {
  const { staffId, startTime, endTime, role, department, location, notes, status } = body;

  console.log('[Shifts][update] id:', shiftId);

  try {
    await getPoolAsync();

    const updates = [];
    const values = [shiftId, tenantId];
    let paramIndex = 3;

    if (staffId !== undefined) { updates.push(`staff_id = $${paramIndex++}`); values.push(staffId); }
    if (startTime !== undefined) { updates.push(`start_time = $${paramIndex++}`); values.push(startTime); }
    if (endTime !== undefined) { updates.push(`end_time = $${paramIndex++}`); values.push(endTime); }
    if (role !== undefined) { updates.push(`role = $${paramIndex++}`); values.push(role); }
    if (department !== undefined) { updates.push(`department = $${paramIndex++}`); values.push(department); }
    if (location !== undefined) { updates.push(`location = $${paramIndex++}`); values.push(location); }
    if (notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(notes); }
    if (status !== undefined) { updates.push(`status = $${paramIndex++}`); values.push(status.toUpperCase()); }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    updates.push(`updated_by = $${paramIndex++}`);
    values.push(user?.id);
    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Shift" SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2  RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Shift not found',
      });
    }

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      message: 'Shift updated',
    });

  } catch (error) {
    console.error('[Shifts] Update failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update shift',
    });
  }
}

/**
 * Delete shift
 */
async function handleDeleteShift(tenantId, user, shiftId) {
  console.log('[Shifts][delete] id:', shiftId);

  // Check permission
  const permError = checkPermission(user, PERMISSIONS?.SCHEDULE_DELETE || 'schedule:delete', createResponse);
  if (permError) return permError;

  try {
    // Soft delete using archive pattern
    const deletedRecord = await softDelete('Shift', shiftId, tenantId, user.userId);

    if (!deletedRecord) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Shift not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Shift deleted',
    });

  } catch (error) {
    console.error('[Shifts] Delete failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete shift',
    });
  }
}

/**
 * Confirm shift
 */
async function handleConfirmShift(tenantId, user, shiftId) {
  console.log('[Shifts][confirm] id:', shiftId);

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "Shift"
       SET status = 'CONFIRMED', updated_by = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
      [shiftId, tenantId, user?.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Shift not found',
      });
    }

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      status: 'CONFIRMED',
      message: 'Shift confirmed',
    });

  } catch (error) {
    console.error('[Shifts] Confirm failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to confirm shift',
    });
  }
}

/**
 * Bulk create shifts
 */
async function handleBulkCreateShifts(tenantId, user, body) {
  const { shifts } = body;

  console.log('[Shifts][bulk] tenantId:', tenantId, 'count:', shifts?.length);

  if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'shifts array is required',
    });
  }

  try {
    await getPoolAsync();

    const createdIds = [];
    const errors = [];

    for (const shift of shifts) {
      if (!shift.staffId || !shift.startTime || !shift.endTime) {
        errors.push({ shift, error: 'Missing required fields' });
        continue;
      }

      try {
        const result = await query(
          `INSERT INTO "Shift" (tenant_id, staff_id, start_time, end_time, role, notes, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED', $7)
           RETURNING id`,
          [tenantId, shift.staffId, shift.startTime, shift.endTime, shift.role || null, shift.notes || null, user?.id]
        );
        createdIds.push(result.rows[0].id);
      } catch (err) {
        errors.push({ shift, error: err.message });
      }
    }

    console.log('[Shifts][bulk] Created:', createdIds.length, 'Errors:', errors.length);

    return createResponse(201, {
      success: true,
      createdCount: createdIds.length,
      createdIds: createdIds,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Created ${createdIds.length} shifts`,
    });

  } catch (error) {
    console.error('[Shifts] Bulk create failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create shifts',
    });
  }
}

/**
 * Get weekly schedule
 */
async function handleGetWeeklySchedule(tenantId, queryParams) {
  const { weekStart } = queryParams;

  console.log('[Shifts][week] tenantId:', tenantId, 'weekStart:', weekStart);

  // Calculate week start/end
  const startDate = weekStart ? new Date(weekStart) : new Date();
  startDate.setHours(0, 0, 0, 0);
  
  // If not Monday, go back to previous Monday
  const dayOfWeek = startDate.getDay();
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  startDate.setDate(startDate.getDate() + diff);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  try {
    await getPoolAsync();

    // Get all shifts for the week
    const shiftsResult = await query(
      `SELECT
         sh.*,
         s.id as staff_id,
         s.first_name,
         s.last_name,
         s.role as staff_role
       FROM "Shift" sh
       JOIN "Staff" s ON sh.staff_id = s.id
       WHERE sh.tenant_id = $1
         AND sh.start_time >= $2
         AND sh.start_time < $3
               ORDER BY s.first_name, s.last_name, sh.start_time`,
      [tenantId, startDate.toISOString(), endDate.toISOString()]
    );

    // Get all staff for the tenant
    const staffResult = await query(
      `SELECT id, first_name, last_name, role, email
       FROM "Staff"
       WHERE tenant_id = $1  AND is_active = true
       ORDER BY first_name, last_name`,
      [tenantId]
    );

    // Organize shifts by staff and day
    const staffMap = new Map();
    for (const staff of staffResult.rows) {
      staffMap.set(staff.id, {
        id: staff.id,
        name: `${staff.first_name} ${staff.last_name}`.trim(),
        role: staff.role,
        email: staff.email,
        shifts: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      });
    }

    for (const row of shiftsResult.rows) {
      const staffData = staffMap.get(row.staff_id);
      if (staffData) {
        const shiftDate = new Date(row.start_time);
        const dayIndex = shiftDate.getDay();
        staffData.shifts[dayIndex].push({
          id: row.id,
          startTime: row.start_time,
          endTime: row.end_time,
          role: row.role,
          status: row.status,
          notes: row.notes,
        });
      }
    }

    const weeklySchedule = Array.from(staffMap.values());

    return createResponse(200, {
      weekStart: startDate.toISOString().split('T')[0],
      weekEnd: endDate.toISOString().split('T')[0],
      staff: weeklySchedule,
      totalShifts: shiftsResult.rows.length,
    });

  } catch (error) {
    console.error('[Shifts] Get weekly schedule failed:', error.message);

    if (error.message?.includes('does not exist')) {
      return createResponse(200, {
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        staff: [],
        totalShifts: 0,
        message: 'Shift table not initialized',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve weekly schedule',
    });
  }
}

/**
 * Get shift templates
 */
async function handleGetShiftTemplates(tenantId) {
  console.log('[Shifts][templates] tenantId:', tenantId);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT * FROM "ShiftTemplate"
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY name`,
      [tenantId]
    );

    const templates = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      role: row.role,
      department: row.department,
      daysOfWeek: row.days_of_week,
    }));

    return createResponse(200, {
      data: templates,
      templates: templates,
      total: templates.length,
    });

  } catch (error) {
    console.error('[Shifts] Get templates failed:', error.message);

    if (error.message?.includes('does not exist')) {
      return createResponse(200, {
        data: [],
        templates: [],
        total: 0,
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve shift templates',
    });
  }
}

/**
 * Create shift template
 */
async function handleCreateShiftTemplate(tenantId, user, body) {
  const { name, description, startTime, endTime, role, department, daysOfWeek } = body;

  console.log('[Shifts][createTemplate] tenantId:', tenantId);

  if (!name || !startTime || !endTime) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'name, startTime, and endTime are required',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `INSERT INTO "ShiftTemplate" (tenant_id, name, description, start_time, end_time, role, department, days_of_week)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [tenantId, name, description || null, startTime, endTime, role || null, department || null, daysOfWeek || null]
    );

    return createResponse(201, {
      success: true,
      id: result.rows[0].id,
      name: result.rows[0].name,
      message: 'Shift template created',
    });

  } catch (error) {
    console.error('[Shifts] Create template failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create shift template',
    });
  }
}

// =============================================================================
// RECURRING BOOKING HANDLERS
// =============================================================================

/**
 * Get recurring bookings
 */
async function handleGetRecurringBookings(tenantId, queryParams) {
  const { ownerId, isActive, limit = 50, offset = 0 } = queryParams;

  console.log('[RecurringBookings][list] tenantId:', tenantId);

  try {
    await getPoolAsync();

    let whereClause = 'rb.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (ownerId) {
      whereClause += ` AND rb.owner_id = $${paramIndex++}`;
      params.push(ownerId);
    }
    if (isActive !== undefined) {
      whereClause += ` AND rb.is_active = $${paramIndex++}`;
      params.push(isActive === 'true' || isActive === true);
    }

    const result = await query(
      `SELECT
         rb.*,
         o.first_name as owner_first_name,
         o.last_name as owner_last_name,
         o.email as owner_email
       FROM "RecurringBooking" rb
       LEFT JOIN "Owner" o ON rb.owner_id = o.id
       WHERE ${whereClause}
       ORDER BY rb.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const recurring = result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      ownerId: row.owner_id,
      ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim() : null,
      ownerEmail: row.owner_email,
      petIds: row.pet_ids,
      serviceId: row.service_id,
      serviceType: row.service_type,
      frequency: row.frequency,
      daysOfWeek: row.days_of_week,
      dayOfMonth: row.day_of_month,
      startTime: row.start_time,
      endTime: row.end_time,
      durationDays: row.duration_days,
      startDate: row.start_date,
      endDate: row.end_date,
      notes: row.notes,
      isActive: row.is_active,
      nextOccurrenceDate: row.next_occurrence_date,
      totalOccurrences: row.total_occurrences,
      createdAt: row.created_at,
    }));

    console.log('[RecurringBookings][list] Found:', recurring.length);

    return createResponse(200, {
      data: recurring,
      recurringBookings: recurring,
      total: recurring.length,
    });

  } catch (error) {
    console.error('[RecurringBookings] Get failed:', error.message);

    if (error.message?.includes('does not exist')) {
      return createResponse(200, {
        data: [],
        recurringBookings: [],
        total: 0,
        message: 'RecurringBooking table not initialized',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve recurring bookings',
    });
  }
}

/**
 * Get single recurring booking
 */
async function handleGetRecurringBooking(tenantId, recurringId) {
  console.log('[RecurringBookings][get] id:', recurringId);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT rb.*, o.first_name as owner_first_name, o.last_name as owner_last_name
       FROM "RecurringBooking" rb
       LEFT JOIN "Owner" o ON rb.owner_id = o.id
       WHERE rb.id = $1 AND rb.tenant_id = $2`,
      [recurringId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Recurring booking not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      ownerId: row.owner_id,
      ownerName: row.owner_first_name ? `${row.owner_first_name} ${row.owner_last_name || ''}`.trim() : null,
      petIds: row.pet_ids,
      serviceId: row.service_id,
      serviceType: row.service_type,
      frequency: row.frequency,
      daysOfWeek: row.days_of_week,
      dayOfMonth: row.day_of_month,
      startTime: row.start_time,
      endTime: row.end_time,
      durationDays: row.duration_days,
      startDate: row.start_date,
      endDate: row.end_date,
      preferredKennelId: row.preferred_kennel_id,
      notes: row.notes,
      specialInstructions: row.special_instructions,
      pricePerOccurrenceCents: row.price_per_occurrence_cents,
      usePackageCredits: row.use_package_credits,
      packageId: row.package_id,
      isActive: row.is_active,
      pausedAt: row.paused_at,
      pauseReason: row.pause_reason,
      lastGeneratedDate: row.last_generated_date,
      nextOccurrenceDate: row.next_occurrence_date,
      totalOccurrences: row.total_occurrences,
      createdAt: row.created_at,
    });

  } catch (error) {
    console.error('[RecurringBookings] Get failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve recurring booking',
    });
  }
}

/**
 * Create recurring booking
 */
async function handleCreateRecurringBooking(tenantId, user, body) {
  const {
    ownerId, petIds, serviceId, serviceType, frequency, daysOfWeek, dayOfMonth,
    startTime, endTime, durationDays, startDate, endDate, preferredKennelId,
    notes, specialInstructions, pricePerOccurrenceCents
  } = body;

  console.log('[RecurringBookings][create] tenantId:', tenantId);

  if (!ownerId || !petIds || !Array.isArray(petIds) || petIds.length === 0 || !frequency || !startDate) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'ownerId, petIds (array), frequency, and startDate are required',
    });
  }

  // Validate frequency
  const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly'];
  if (!validFrequencies.includes(frequency.toLowerCase())) {
    return createResponse(400, {
      error: 'Bad Request',
      message: `Invalid frequency. Valid values: ${validFrequencies.join(', ')}`,
    });
  }

  try {
    await getPoolAsync();

    // Calculate next occurrence
    const nextOccurrence = calculateNextOccurrence(startDate, frequency, daysOfWeek, dayOfMonth);

    const result = await query(
      `INSERT INTO "RecurringBooking" (
         tenant_id, owner_id, pet_ids, service_id, service_type, frequency,
         days_of_week, day_of_month, start_time, end_time, duration_days,
         start_date, end_date, preferred_kennel_id, notes, special_instructions,
         price_per_occurrence_cents, is_active, next_occurrence_date, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, $18, $19)
       RETURNING *`,
      [
        tenantId, ownerId, petIds, serviceId || null, serviceType || 'boarding',
        frequency.toLowerCase(), daysOfWeek || null, dayOfMonth || null,
        startTime || null, endTime || null, durationDays || 1,
        startDate, endDate || null, preferredKennelId || null,
        notes || null, specialInstructions || null, pricePerOccurrenceCents || null,
        nextOccurrence, user?.id
      ]
    );

    const recurring = result.rows[0];
    console.log('[RecurringBookings][create] Created:', recurring.id);

    return createResponse(201, {
      success: true,
      id: recurring.id,
      nextOccurrenceDate: recurring.next_occurrence_date,
      message: 'Recurring booking created successfully',
    });

  } catch (error) {
    console.error('[RecurringBookings] Create failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create recurring booking',
    });
  }
}

/**
 * Update recurring booking
 */
async function handleUpdateRecurringBooking(tenantId, user, recurringId, body) {
  const { petIds, serviceId, serviceType, frequency, daysOfWeek, dayOfMonth,
    startTime, endTime, durationDays, endDate, preferredKennelId,
    notes, specialInstructions, pricePerOccurrenceCents } = body;

  console.log('[RecurringBookings][update] id:', recurringId);

  try {
    await getPoolAsync();

    const updates = [];
    const values = [recurringId, tenantId];
    let paramIndex = 3;

    if (petIds !== undefined) { updates.push(`pet_ids = $${paramIndex++}`); values.push(petIds); }
    if (serviceId !== undefined) { updates.push(`service_id = $${paramIndex++}`); values.push(serviceId); }
    if (serviceType !== undefined) { updates.push(`service_type = $${paramIndex++}`); values.push(serviceType); }
    if (frequency !== undefined) { updates.push(`frequency = $${paramIndex++}`); values.push(frequency.toLowerCase()); }
    if (daysOfWeek !== undefined) { updates.push(`days_of_week = $${paramIndex++}`); values.push(daysOfWeek); }
    if (dayOfMonth !== undefined) { updates.push(`day_of_month = $${paramIndex++}`); values.push(dayOfMonth); }
    if (startTime !== undefined) { updates.push(`start_time = $${paramIndex++}`); values.push(startTime); }
    if (endTime !== undefined) { updates.push(`end_time = $${paramIndex++}`); values.push(endTime); }
    if (durationDays !== undefined) { updates.push(`duration_days = $${paramIndex++}`); values.push(durationDays); }
    if (endDate !== undefined) { updates.push(`end_date = $${paramIndex++}`); values.push(endDate); }
    if (preferredKennelId !== undefined) { updates.push(`preferred_kennel_id = $${paramIndex++}`); values.push(preferredKennelId); }
    if (notes !== undefined) { updates.push(`notes = $${paramIndex++}`); values.push(notes); }
    if (specialInstructions !== undefined) { updates.push(`special_instructions = $${paramIndex++}`); values.push(specialInstructions); }
    if (pricePerOccurrenceCents !== undefined) { updates.push(`price_per_occurrence_cents = $${paramIndex++}`); values.push(pricePerOccurrenceCents); }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "RecurringBooking" SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Recurring booking not found',
      });
    }

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      message: 'Recurring booking updated',
    });

  } catch (error) {
    console.error('[RecurringBookings] Update failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update recurring booking',
    });
  }
}

/**
 * Delete recurring booking
 */
async function handleDeleteRecurringBooking(tenantId, user, recurringId) {
  // Check permission
  const permError = checkPermission(user, PERMISSIONS.BOOKINGS_DELETE, createResponse);
  if (permError) return permError;

  console.log('[RecurringBookings][delete] id:', recurringId);

  try {
    await getPoolAsync();

    // First set is_active to false before archiving
    await query(
      `UPDATE "RecurringBooking" SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [recurringId, tenantId]
    );

    // Soft delete using archive pattern
    const deletedRecord = await softDelete('RecurringBooking', recurringId, tenantId, user.userId);

    if (!deletedRecord) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Recurring booking not found',
      });
    }

    return createResponse(200, {
      success: true,
      message: 'Recurring booking deleted',
    });

  } catch (error) {
    console.error('[RecurringBookings] Delete failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete recurring booking',
    });
  }
}

/**
 * Pause recurring booking
 */
async function handlePauseRecurringBooking(tenantId, recurringId, body) {
  const { reason } = body;

  console.log('[RecurringBookings][pause] id:', recurringId);

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "RecurringBooking"
       SET is_active = false, paused_at = NOW(), pause_reason = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2       RETURNING *`,
      [recurringId, tenantId, reason || null]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Recurring booking not found',
      });
    }

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      pausedAt: result.rows[0].paused_at,
      message: 'Recurring booking paused',
    });

  } catch (error) {
    console.error('[RecurringBookings] Pause failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to pause recurring booking',
    });
  }
}

/**
 * Resume recurring booking
 */
async function handleResumeRecurringBooking(tenantId, recurringId) {
  console.log('[RecurringBookings][resume] id:', recurringId);

  try {
    await getPoolAsync();

    // Get current recurring booking to recalculate next occurrence
    const current = await query(
      `SELECT * FROM "RecurringBooking" WHERE id = $1 AND tenant_id = $2 `,
      [recurringId, tenantId]
    );

    if (current.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Recurring booking not found',
      });
    }

    const rb = current.rows[0];
    const today = new Date().toISOString().split('T')[0];
    const nextOccurrence = calculateNextOccurrence(today, rb.frequency, rb.days_of_week, rb.day_of_month);

    const result = await query(
      `UPDATE "RecurringBooking"
       SET is_active = true, paused_at = NULL, pause_reason = NULL,
           next_occurrence_date = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [recurringId, tenantId, nextOccurrence]
    );

    return createResponse(200, {
      success: true,
      id: result.rows[0].id,
      nextOccurrenceDate: result.rows[0].next_occurrence_date,
      message: 'Recurring booking resumed',
    });

  } catch (error) {
    console.error('[RecurringBookings] Resume failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to resume recurring booking',
    });
  }
}

/**
 * Generate booking instances from recurring booking
 */
async function handleGenerateRecurringInstances(tenantId, recurringId, body) {
  const { daysAhead = 30 } = body;

  console.log('[RecurringBookings][generate] id:', recurringId, 'daysAhead:', daysAhead);

  try {
    await getPoolAsync();

    // Get recurring booking
    const rbResult = await query(
      `SELECT * FROM "RecurringBooking"
       WHERE id = $1 AND tenant_id = $2  AND is_active = true`,
      [recurringId, tenantId]
    );

    if (rbResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Active recurring booking not found',
      });
    }

    const rb = rbResult.rows[0];
    const generatedBookings = [];
    const errors = [];

    // Generate bookings for the specified period
    const endGenDate = new Date();
    endGenDate.setDate(endGenDate.getDate() + daysAhead);

    let currentDate = rb.next_occurrence_date ? new Date(rb.next_occurrence_date) : new Date(rb.start_date);

    while (currentDate <= endGenDate) {
      // Check if we've passed the end date
      if (rb.end_date && currentDate > new Date(rb.end_date)) break;

      const occurrenceDateStr = currentDate.toISOString().split('T')[0];

      // Check if already generated for this date
      const existingCheck = await query(
        `SELECT id FROM "RecurringBookingInstance"
         WHERE recurring_booking_id = $1 AND occurrence_date = $2`,
        [recurringId, occurrenceDateStr]
      );

      if (existingCheck.rows.length === 0) {
        // Create one booking for all pets (use BookingPet junction table)
        // Schema: Booking has NO pet_id column - use BookingPet junction
        try {
          const checkIn = rb.start_time
            ? `${occurrenceDateStr}T${rb.start_time}`
            : occurrenceDateStr;

          let checkOut;
          if (rb.service_type === 'daycare' && rb.end_time) {
            checkOut = `${occurrenceDateStr}T${rb.end_time}`;
          } else {
            const coDate = new Date(currentDate);
            coDate.setDate(coDate.getDate() + (rb.duration_days || 1));
            checkOut = coDate.toISOString().split('T')[0];
          }

          // Create single booking (Schema: total_price_cents not total_price_in_cents)
          const bookingResult = await query(
            `INSERT INTO "Booking" (
               tenant_id, owner_id, kennel_id, service_id, check_in, check_out,
               notes, special_instructions, total_price_cents, status
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
             RETURNING id`,
            [
              tenantId, rb.owner_id, rb.preferred_kennel_id,
              rb.service_id, checkIn, checkOut, rb.notes,
              rb.special_instructions, rb.price_per_occurrence_cents
            ]
          );

          const bookingId = bookingResult.rows[0].id;

          // Insert pets into BookingPet junction table
          for (const petId of rb.pet_ids) {
            await query(
              `INSERT INTO "BookingPet" (booking_id, pet_id, tenant_id, created_at)
               VALUES ($1, $2, $3, NOW())`,
              [bookingId, petId, tenantId]
            );
          }

          // Record instance
          await query(
            `INSERT INTO "RecurringBookingInstance" (recurring_booking_id, booking_id, occurrence_date)
             VALUES ($1, $2, $3)`,
            [recurringId, bookingId, occurrenceDateStr]
          );

          generatedBookings.push({
            bookingId: bookingId,
            petIds: rb.pet_ids,
            occurrenceDate: occurrenceDateStr,
          });

        } catch (err) {
          errors.push({ petIds: rb.pet_ids, date: occurrenceDateStr, error: err.message });
        }
      }

      // Move to next occurrence
      currentDate = getNextOccurrenceDate(currentDate, rb.frequency, rb.days_of_week, rb.day_of_month);
    }

    // Update recurring booking
    await query(
      `UPDATE "RecurringBooking"
       SET last_generated_date = $2,
           next_occurrence_date = $3,
           total_occurrences = total_occurrences + $4,
           updated_at = NOW()
       WHERE id = $1`,
      [
        recurringId,
        new Date().toISOString().split('T')[0],
        currentDate.toISOString().split('T')[0],
        generatedBookings.length
      ]
    );

    console.log('[RecurringBookings][generate] Generated:', generatedBookings.length, 'Errors:', errors.length);

    return createResponse(200, {
      success: true,
      generatedCount: generatedBookings.length,
      bookings: generatedBookings,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Generated ${generatedBookings.length} bookings`,
    });

  } catch (error) {
    console.error('[RecurringBookings] Generate failed:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to generate recurring instances',
    });
  }
}

/**
 * Helper: Calculate next occurrence date
 */
function calculateNextOccurrence(startDate, frequency, daysOfWeek, dayOfMonth) {
  const start = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = start >= today ? start : today;

  return getNextOccurrenceDate(next, frequency, daysOfWeek, dayOfMonth).toISOString().split('T')[0];
}

/**
 * Helper: Get next occurrence date from a given date
 */
function getNextOccurrenceDate(fromDate, frequency, daysOfWeek, dayOfMonth) {
  const date = new Date(fromDate);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next matching day of week
        do {
          date.setDate(date.getDate() + 1);
        } while (!daysOfWeek.includes(date.getDay()));
      } else {
        date.setDate(date.getDate() + 7);
      }
      break;

    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;

    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      if (dayOfMonth) {
        date.setDate(Math.min(dayOfMonth, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
      }
      break;

    default:
      date.setDate(date.getDate() + 1);
  }

  return date;
}

// =============================================================================
// CUSTOMER SELF-SERVICE BOOKING HANDLERS
// =============================================================================

/**
 * Customer: Check availability for a date range
 * Public-facing availability checker
 */
async function handleCustomerCheckAvailability(tenantId, queryParams) {
  const { startDate, endDate, serviceId, petCount = 1 } = queryParams;

  if (!startDate || !endDate) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Start date and end date are required',
    });
  }

  console.log('[Customer][availability] Check:', { tenantId, startDate, endDate, serviceId, petCount });

  try {
    await getPoolAsync();

    // Get total kennel capacity
    // Schema: Kennel has max_occupancy (not capacity)
    const capacityResult = await query(
      `SELECT
         COALESCE(SUM(max_occupancy), 0) as total_capacity,
         COUNT(*) as kennel_count
       FROM "Kennel"
       WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    const totalCapacity = parseInt(capacityResult.rows[0]?.total_capacity || 0);
    const kennelCount = parseInt(capacityResult.rows[0]?.kennel_count || 0);

    // Get current bookings in the date range
    // Schema: check_in, check_out (not start_date/end_date)
    // Count pets via BookingPet junction table
    const occupancyResult = await query(
      `SELECT
         COUNT(DISTINCT b.id) as active_bookings,
         COUNT(DISTINCT bp.pet_id) as pets_booked
       FROM "Booking" b
       LEFT JOIN "BookingPet" bp ON bp.booking_id = b.id
       WHERE b.tenant_id = $1
       AND b.status IN ('CONFIRMED', 'CHECKED_IN')
       AND b.check_in <= $3
       AND b.check_out >= $2`,
      [tenantId, startDate, endDate]
    );

    const petsBooked = parseInt(occupancyResult.rows[0]?.pets_booked || 0);
    const availableSlots = totalCapacity - petsBooked;

    // Get available kennels
    // Schema: Kennel has max_occupancy (not capacity), size (not kennel_type)
    const availableKennelsResult = await query(
      `SELECT k.id, k.name, k.max_occupancy, k.size, k.location
       FROM "Kennel" k
       WHERE k.tenant_id = $1
       AND k.is_active = true
       AND k.id NOT IN (
         SELECT DISTINCT b.kennel_id
         FROM "Booking" b
         WHERE b.tenant_id = $1
         AND b.status IN ('CONFIRMED', 'CHECKED_IN')
         AND b.check_in <= $3
         AND b.check_out >= $2
         AND b.kennel_id IS NOT NULL
       )
       ORDER BY k.name`,
      [tenantId, startDate, endDate]
    );

    const isAvailable = availableSlots >= parseInt(petCount);

    return createResponse(200, {
      available: isAvailable,
      totalCapacity,
      currentOccupancy: petsBooked,
      availableSlots,
      requestedSlots: parseInt(petCount),
      availableKennels: availableKennelsResult.rows.map(k => ({
        id: k.id,
        name: k.name,
        capacity: k.max_occupancy,
        maxOccupancy: k.max_occupancy,
        size: k.size,
        location: k.location,
      })),
      period: { startDate, endDate },
      message: isAvailable 
        ? 'Dates are available for booking'
        : 'Requested dates are not available',
    });

  } catch (error) {
    console.error('[Customer][availability] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to check availability',
    });
  }
}

/**
 * Customer: Get available services and pricing
 */
async function handleCustomerGetServices(tenantId) {
  console.log('[Customer][services] Get services for tenant:', tenantId);

  try {
    await getPoolAsync();

    // Schema: price_in_cents (not price)
    const result = await query(
      `SELECT
         s.id,
         s.name,
         s.description,
         s.service_type,
         s.duration_minutes,
         s.price_in_cents,
         s.is_active,
         s.requires_vaccination,
         s.max_pets_per_session
       FROM "Service" s
       WHERE s.tenant_id = $1
       AND s.is_active = true
       ORDER BY s.name`,
      [tenantId]
    );

    const services = result.rows.map(row => ({
      id: row.id,
      recordId: row.id,
      name: row.name,
      description: row.description,
      serviceType: row.service_type,
      durationMinutes: row.duration_minutes,
      price: row.price_in_cents ? row.price_in_cents / 100 : 0,
      priceInCents: row.price_in_cents,
      requiresVaccination: row.requires_vaccination,
      maxPetsPerSession: row.max_pets_per_session,
    }));

    return createResponse(200, {
      data: services,
      services,
      total: services.length,
      message: 'Services retrieved successfully',
    });

  } catch (error) {
    console.error('[Customer][services] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve services',
    });
  }
}

/**
 * Customer: Get their own pets
 */
async function handleCustomerGetPets(tenantId, user) {
  console.log('[Customer][pets] Get pets for user:', user.id);

  try {
    await getPoolAsync();

    // Find owner record for this user
    const ownerResult = await query(
      `SELECT id FROM "Owner" WHERE user_id = $1 AND tenant_id = $2 `,
      [user.id, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(200, {
        data: [],
        pets: [],
        total: 0,
        message: 'No pets found for this customer',
      });
    }

    const ownerId = ownerResult.rows[0].id;

    const result = await query(
      `SELECT 
         p.id,
         p.name,
         p.breed,
         p.species,
         p.weight,
         p.birth_date,
         p.gender,
         p.color,
         p.special_needs,
         p.dietary_requirements,
         p.is_neutered,
         p.created_at
       FROM "Pet" p
       WHERE p.owner_id = $1 AND p.tenant_id = $2       ORDER BY p.name`,
      [ownerId, tenantId]
    );

    const pets = result.rows.map(row => ({
      id: row.id,
      recordId: row.id,
      name: row.name,
      breed: row.breed,
      species: row.species || 'dog',
      weight: row.weight,
      birthDate: row.birth_date,
      gender: row.gender,
      color: row.color,
      specialNeeds: row.special_needs,
      dietaryRequirements: row.dietary_requirements,
      isNeutered: row.is_neutered,
      createdAt: row.created_at,
    }));

    return createResponse(200, {
      data: pets,
      pets,
      total: pets.length,
      message: 'Pets retrieved successfully',
    });

  } catch (error) {
    console.error('[Customer][pets] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve pets',
    });
  }
}

/**
 * Customer: Get their own bookings
 */
async function handleCustomerGetBookings(tenantId, user, queryParams) {
  const { status, upcoming = 'true' } = queryParams;

  console.log('[Customer][bookings] Get bookings for user:', user.id);

  try {
    await getPoolAsync();

    // Find owner record for this user
    const ownerResult = await query(
      `SELECT id FROM "Owner" WHERE user_id = $1 AND tenant_id = $2 `,
      [user.id, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(200, {
        data: [],
        bookings: [],
        total: 0,
        message: 'No bookings found for this customer',
      });
    }

    const ownerId = ownerResult.rows[0].id;

    let whereClause = 'b.owner_id = $1 AND b.tenant_id = $2';
    const params = [ownerId, tenantId];

    if (status) {
      whereClause += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    if (upcoming === 'true') {
      whereClause += ` AND b.check_out >= CURRENT_DATE`;
    }

    // Schema: check_in, check_out (not start_date/end_date), total_price_cents (not total_price)
    // Use BookingPet junction table instead of pet_ids array
    const result = await query(
      `SELECT
         b.id,
         b.check_in,
         b.check_out,
         b.status,
         b.total_price_cents,
         b.notes,
         b.created_at,
         b.checked_in_at,
         b.checked_out_at,
         s.name as service_name,
         s.service_type,
         k.name as kennel_name,
         COALESCE(array_agg(p.name) FILTER (WHERE p.name IS NOT NULL), ARRAY[]::text[]) as pet_names
       FROM "Booking" b
       LEFT JOIN "Service" s ON b.service_id = s.id
       LEFT JOIN "Kennel" k ON b.kennel_id = k.id
       LEFT JOIN "BookingPet" bp ON bp.booking_id = b.id
       LEFT JOIN "Pet" p ON p.id = bp.pet_id
       WHERE ${whereClause}
       GROUP BY b.id, s.id, k.id
       ORDER BY b.check_in DESC`,
      params
    );

    const bookings = result.rows.map(row => ({
      id: row.id,
      recordId: row.id,
      startDate: row.check_in,  // Alias for frontend
      endDate: row.check_out,   // Alias for frontend
      checkIn: row.check_in,
      checkOut: row.check_out,
      status: row.status,
      totalPrice: row.total_price_cents ? row.total_price_cents / 100 : 0,
      totalPriceCents: row.total_price_cents,
      notes: row.notes,
      createdAt: row.created_at,
      checkedInAt: row.checked_in_at,
      checkedOutAt: row.checked_out_at,
      serviceName: row.service_name,
      serviceType: row.service_type,
      kennelName: row.kennel_name,
      petNames: row.pet_names?.filter(Boolean) || [],
    }));

    return createResponse(200, {
      data: bookings,
      bookings,
      total: bookings.length,
      message: 'Bookings retrieved successfully',
    });

  } catch (error) {
    console.error('[Customer][bookings] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve bookings',
    });
  }
}

/**
 * Customer: Create a booking request
 */
async function handleCustomerCreateBooking(tenantId, user, body) {
  const { petIds, serviceId, startDate, endDate, kennelId, notes } = body;

  console.log('[Customer][createBooking] Creating booking:', { tenantId, userId: user.id, petIds, startDate, endDate });

  // Validation
  if (!petIds || petIds.length === 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'At least one pet is required',
    });
  }

  if (!startDate || !endDate) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Start date and end date are required',
    });
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'End date must be after start date',
    });
  }

  try {
    await getPoolAsync();

    // Find owner record for this user
    const ownerResult = await query(
      `SELECT id FROM "Owner" WHERE user_id = $1 AND tenant_id = $2 `,
      [user.id, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Customer profile not found. Please contact the facility.',
      });
    }

    const ownerId = ownerResult.rows[0].id;

    // Verify pets belong to this owner
    const petsResult = await query(
      `SELECT id FROM "Pet" WHERE id = ANY($1::uuid[]) AND owner_id = $2 AND tenant_id = $3 `,
      [petIds, ownerId, tenantId]
    );

    if (petsResult.rows.length !== petIds.length) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'One or more pets not found or do not belong to you',
      });
    }

    // Check availability
    const availabilityCheck = await handleCustomerCheckAvailability(tenantId, {
      startDate,
      endDate,
      petCount: petIds.length.toString(),
    });

    const availability = JSON.parse(availabilityCheck.body);
    if (!availability.available) {
      return createResponse(409, {
        error: 'Conflict',
        message: 'Selected dates are not available for the requested number of pets',
      });
    }

    // Calculate price if service is specified
    // Schema: price_in_cents (not price)
    let totalPriceCents = 0;
    if (serviceId) {
      const serviceResult = await query(
        `SELECT price_in_cents FROM "Service" WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
        [serviceId, tenantId]
      );

      if (serviceResult.rows.length > 0) {
        const pricePerDayCents = parseInt(serviceResult.rows[0].price_in_cents || 0);
        const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 1;
        totalPriceCents = pricePerDayCents * days * petIds.length;
      }
    }

    // Create booking with PENDING status (requires staff approval)
    // Schema: check_in, check_out (not start_date/end_date), total_price_cents (not total_price)
    // Use BookingPet junction table instead of pet_ids array
    const bookingResult = await query(
      `INSERT INTO "Booking" (
         tenant_id, owner_id, service_id, kennel_id,
         check_in, check_out, status, total_price_cents, notes,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        ownerId,
        serviceId || null,
        kennelId || null,
        startDate,
        endDate,
        totalPriceCents,
        notes || null,
      ]
    );

    const booking = bookingResult.rows[0];

    // Insert pets into BookingPet junction table
    for (const petId of petIds) {
      await query(
        `INSERT INTO "BookingPet" (booking_id, pet_id, tenant_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [booking.id, petId, tenantId]
      );
    }

    // Send confirmation email to customer
    try {
      const emailUtils = require('/opt/nodejs/email-utils');
      await emailUtils.sendBookingConfirmation(
        tenantId,
        booking.id,
        user.email,
        {
          firstName: user.firstName || user.first_name,
          startDate,
          endDate,
          status: 'PENDING',
        }
      );
    } catch (emailErr) {
      console.warn('[Customer][createBooking] Email failed:', emailErr.message);
    }

    console.log('[Customer][createBooking] Created booking:', booking.id);

    return createResponse(201, {
      success: true,
      data: {
        id: booking.id,
        recordId: booking.id,
        startDate: booking.check_in,   // Alias for frontend
        endDate: booking.check_out,    // Alias for frontend
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        status: booking.status,
        totalPrice: booking.total_price_cents ? booking.total_price_cents / 100 : 0,
        totalPriceCents: booking.total_price_cents,
        notes: booking.notes,
        createdAt: booking.created_at,
      },
      message: 'Booking request submitted successfully. You will receive a confirmation once approved.',
    });

  } catch (error) {
    console.error('[Customer][createBooking] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create booking',
    });
  }
}

/**
 * Customer: Get a specific booking
 */
async function handleCustomerGetBooking(tenantId, user, bookingId) {
  console.log('[Customer][getBooking]', { tenantId, userId: user.id, bookingId });

  try {
    await getPoolAsync();

    // Find owner record for this user
    const ownerResult = await query(
      `SELECT id FROM "Owner" WHERE user_id = $1 AND tenant_id = $2 `,
      [user.id, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const ownerId = ownerResult.rows[0].id;

    // Schema: check_in, check_out (not start_date/end_date), total_price_cents (not total_price)
    // Use BookingPet junction table instead of pet_ids array
    const result = await query(
      `SELECT
         b.id,
         b.check_in,
         b.check_out,
         b.status,
         b.total_price_cents,
         b.notes,
         b.created_at,
         b.checked_in_at,
         b.checked_out_at,
         s.name as service_name,
         s.service_type,
         s.description as service_description,
         k.name as kennel_name,
         COALESCE(array_agg(json_build_object('id', p.id, 'name', p.name, 'breed', p.breed)) FILTER (WHERE p.id IS NOT NULL), ARRAY[]::json[]) as pets
       FROM "Booking" b
       LEFT JOIN "Service" s ON b.service_id = s.id
       LEFT JOIN "Kennel" k ON b.kennel_id = k.id
       LEFT JOIN "BookingPet" bp ON bp.booking_id = b.id
       LEFT JOIN "Pet" p ON p.id = bp.pet_id
       WHERE b.id = $1 AND b.owner_id = $2 AND b.tenant_id = $3       GROUP BY b.id, s.id, k.id`,
      [bookingId, ownerId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      data: {
        id: row.id,
        recordId: row.id,
        startDate: row.check_in,   // Alias for frontend
        endDate: row.check_out,    // Alias for frontend
        checkIn: row.check_in,
        checkOut: row.check_out,
        status: row.status,
        totalPrice: row.total_price_cents ? row.total_price_cents / 100 : 0,
        totalPriceCents: row.total_price_cents,
        notes: row.notes,
        createdAt: row.created_at,
        checkedInAt: row.checked_in_at,
        checkedOutAt: row.checked_out_at,
        service: {
          name: row.service_name,
          type: row.service_type,
          description: row.service_description,
        },
        kennelName: row.kennel_name,
        pets: row.pets?.filter(Boolean) || [],
      },
      message: 'Booking retrieved successfully',
    });

  } catch (error) {
    console.error('[Customer][getBooking] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve booking',
    });
  }
}

/**
 * Customer: Cancel their own booking
 */
async function handleCustomerCancelBooking(tenantId, user, bookingId) {
  console.log('[Customer][cancelBooking]', { tenantId, userId: user.id, bookingId });

  try {
    await getPoolAsync();

    // Find owner record for this user
    const ownerResult = await query(
      `SELECT id FROM "Owner" WHERE user_id = $1 AND tenant_id = $2 `,
      [user.id, tenantId]
    );

    if (ownerResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const ownerId = ownerResult.rows[0].id;

    // Verify booking exists and belongs to this owner
    // Schema: check_in (not start_date)
    const bookingResult = await query(
      `SELECT id, status, check_in FROM "Booking"
       WHERE id = $1 AND owner_id = $2 AND tenant_id = $3`,
      [bookingId, ownerId, tenantId]
    );

    if (bookingResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Booking not found',
      });
    }

    const booking = bookingResult.rows[0];

    // Only allow cancellation of PENDING or CONFIRMED bookings
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Cannot cancel booking with status: ${booking.status}`,
      });
    }

    // Check cancellation policy (e.g., must be at least 24 hours before start)
    const hoursUntilStart = (new Date(booking.check_in) - new Date()) / (1000 * 60 * 60);
    if (hoursUntilStart < 24 && hoursUntilStart > 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Bookings cannot be cancelled less than 24 hours before the start date. Please contact the facility.',
      });
    }

    // Cancel the booking
    const result = await query(
      `UPDATE "Booking"
       SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );

    // Send cancellation notification
    try {
      const emailUtils = require('/opt/nodejs/email-utils');
      await emailUtils.sendBookingCancellation(
        tenantId,
        bookingId,
        user.email,
        {
          firstName: user.firstName || user.first_name,
          startDate: booking.check_in,  // Schema: check_in
        }
      );
    } catch (emailErr) {
      console.warn('[Customer][cancelBooking] Email failed:', emailErr.message);
    }

    return createResponse(200, {
      success: true,
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        cancelledAt: result.rows[0].cancelled_at,
      },
      message: 'Booking cancelled successfully',
    });

  } catch (error) {
    console.error('[Customer][cancelBooking] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to cancel booking',
    });
  }
}

/**
 * Customer: Get their profile
 */
async function handleCustomerGetProfile(tenantId, user) {
  console.log('[Customer][getProfile]', { tenantId, userId: user.id });

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT 
         o.id,
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
         o.notes,
         o.created_at,
         u.email as account_email
       FROM "Owner" o
       LEFT JOIN "User" u ON o.user_id = u.id
       WHERE o.user_id = $1 AND o.tenant_id = $2`,
      [user.id, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Customer profile not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      data: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email || row.account_email,
        phone: row.phone,
        address: row.address,
        city: row.city,
        state: row.state,
        zipCode: row.zip_code,
        emergencyContactName: row.emergency_contact_name,
        emergencyContactPhone: row.emergency_contact_phone,
        notes: row.notes,
        createdAt: row.created_at,
      },
      message: 'Profile retrieved successfully',
    });

  } catch (error) {
    console.error('[Customer][getProfile] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve profile',
    });
  }
}

/**
 * Customer: Update their profile
 */
async function handleCustomerUpdateProfile(tenantId, user, body) {
  const { phone, address, city, state, zipCode, emergencyContactName, emergencyContactPhone } = body;

  console.log('[Customer][updateProfile]', { tenantId, userId: user.id });

  try {
    await getPoolAsync();

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(city);
    }
    if (state !== undefined) {
      updates.push(`state = $${paramIndex++}`);
      values.push(state);
    }
    if (zipCode !== undefined) {
      updates.push(`zip_code = $${paramIndex++}`);
      values.push(zipCode);
    }
    if (emergencyContactName !== undefined) {
      updates.push(`emergency_contact_name = $${paramIndex++}`);
      values.push(emergencyContactName);
    }
    if (emergencyContactPhone !== undefined) {
      updates.push(`emergency_contact_phone = $${paramIndex++}`);
      values.push(emergencyContactPhone);
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    updates.push('updated_at = NOW()');
    values.push(user.id, tenantId);

    const result = await query(
      `UPDATE "Owner"
       SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex++} AND tenant_id = $${paramIndex}       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Customer profile not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      success: true,
      data: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        city: row.city,
        state: row.state,
        zipCode: row.zip_code,
        emergencyContactName: row.emergency_contact_name,
        emergencyContactPhone: row.emergency_contact_phone,
      },
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('[Customer][updateProfile] Error:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update profile',
    });
  }
}

// =============================================================================
// STAFF MANAGEMENT HANDLERS
// =============================================================================

/**
 * Get all staff members for tenant
 */
async function handleGetStaffMembers(tenantId, queryParams) {
  const { isActive, role, limit = 50, offset = 0 } = queryParams;

  console.log('[Staff][list] tenantId:', tenantId, queryParams);

  try {
    await getPoolAsync();

    let whereClause = 's.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (isActive !== undefined) {
      whereClause += ` AND s.is_active = $${paramIndex++}`;
      params.push(isActive === 'true' || isActive === true);
    }
    if (role) {
      whereClause += ` AND s.role = $${paramIndex++}`;
      params.push(role);
    }

    const result = await query(
      `SELECT
         s.id,
         s.tenant_id,
         s.user_id,
         s.title,
         s.role,
         s.hourly_rate,
         s.is_active,
         s.hire_date,
         s.created_at,
         s.updated_at,
         u.first_name,
         u.last_name,
         u.email,
         u.phone
       FROM "Staff" s
       LEFT JOIN "User" u ON s.user_id = u.id
       WHERE ${whereClause}
       ORDER BY u.last_name ASC, u.first_name ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const staff = result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      title: row.title,
      role: row.role,
      hourlyRate: row.hourly_rate,
      isActive: row.is_active,
      hireDate: row.hire_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log('[Staff][list] Found:', staff.length);

    return createResponse(200, {
      data: staff,
      staff: staff,
      total: staff.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (error) {
    console.error('[Staff] Failed to get staff members:', error.message);

    if (error.message?.includes('does not exist')) {
      return createResponse(200, {
        data: [],
        staff: [],
        total: 0,
        message: 'Staff table not initialized',
      });
    }

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve staff members',
    });
  }
}

/**
 * Get single staff member
 */
async function handleGetStaffMember(tenantId, staffId) {
  console.log('[Staff][get] id:', staffId, 'tenantId:', tenantId);

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT
         s.*,
         u.first_name,
         u.last_name,
         u.email,
         u.phone
       FROM "Staff" s
       LEFT JOIN "User" u ON s.user_id = u.id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [staffId, tenantId]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Staff member not found',
      });
    }

    const row = result.rows[0];

    return createResponse(200, {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      title: row.title,
      role: row.role,
      hourlyRate: row.hourly_rate,
      isActive: row.is_active,
      hireDate: row.hire_date,
      emergencyContact: row.emergency_contact,
      emergencyPhone: row.emergency_phone,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

  } catch (error) {
    console.error('[Staff] Failed to get staff member:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve staff member',
    });
  }
}

/**
 * Create staff member
 */
async function handleCreateStaffMember(tenantId, user, body) {
  const { userId, firstName, lastName, email, phone, title, role, hourlyRate, hireDate, notes } = body;

  console.log('[Staff][create] tenantId:', tenantId, body);

  // Permission check - require ADMIN or OWNER role
  const permCheck = checkPermission(user, PERMISSIONS.MANAGE_STAFF);
  if (!permCheck.allowed) {
    return createResponse(403, {
      error: 'Forbidden',
      message: permCheck.message || 'You do not have permission to create staff members',
    });
  }

  if (!userId && (!firstName || !lastName)) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Either userId or firstName and lastName are required',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `INSERT INTO "Staff" (tenant_id, user_id, title, role, hourly_rate, hire_date, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [tenantId, userId || null, title || null, role || 'STAFF', hourlyRate || null, hireDate || null, notes || null]
    );

    const staff = result.rows[0];

    console.log('[Staff][create] Created:', staff.id);

    return createResponse(201, {
      success: true,
      id: staff.id,
      tenantId: staff.tenant_id,
      userId: staff.user_id,
      title: staff.title,
      role: staff.role,
      hourlyRate: staff.hourly_rate,
      isActive: staff.is_active,
      hireDate: staff.hire_date,
      message: 'Staff member created successfully',
    });

  } catch (error) {
    console.error('[Staff] Failed to create staff member:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to create staff member',
    });
  }
}

/**
 * Update staff member
 */
async function handleUpdateStaffMember(tenantId, user, staffId, body) {
  const { title, role, hourlyRate, isActive, hireDate, notes, emergencyContact, emergencyPhone } = body;

  console.log('[Staff][update] id:', staffId, 'tenantId:', tenantId, body);

  // Permission check - require ADMIN or OWNER role
  const permCheck = checkPermission(user, PERMISSIONS.MANAGE_STAFF);
  if (!permCheck.allowed) {
    return createResponse(403, {
      error: 'Forbidden',
      message: permCheck.message || 'You do not have permission to update staff members',
    });
  }

  try {
    await getPoolAsync();

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (hourlyRate !== undefined) {
      updates.push(`hourly_rate = $${paramIndex++}`);
      values.push(hourlyRate);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }
    if (hireDate !== undefined) {
      updates.push(`hire_date = $${paramIndex++}`);
      values.push(hireDate);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    if (emergencyContact !== undefined) {
      updates.push(`emergency_contact = $${paramIndex++}`);
      values.push(emergencyContact);
    }
    if (emergencyPhone !== undefined) {
      updates.push(`emergency_phone = $${paramIndex++}`);
      values.push(emergencyPhone);
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    updates.push('updated_at = NOW()');
    values.push(staffId, tenantId);

    const result = await query(
      `UPDATE "Staff"
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Staff member not found',
      });
    }

    const staff = result.rows[0];

    console.log('[Staff][update] Updated:', staff.id);

    return createResponse(200, {
      success: true,
      id: staff.id,
      title: staff.title,
      role: staff.role,
      hourlyRate: staff.hourly_rate,
      isActive: staff.is_active,
      message: 'Staff member updated successfully',
    });

  } catch (error) {
    console.error('[Staff] Failed to update staff member:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update staff member',
    });
  }
}

/**
 * Delete staff member (soft delete)
 */
async function handleDeleteStaffMember(tenantId, user, staffId) {
  console.log('[Staff][delete] id:', staffId, 'tenantId:', tenantId);

  // Permission check - require ADMIN or OWNER role
  const permCheck = checkPermission(user, PERMISSIONS.MANAGE_STAFF);
  if (!permCheck.allowed) {
    return createResponse(403, {
      error: 'Forbidden',
      message: permCheck.message || 'You do not have permission to delete staff members',
    });
  }

  try {
    await getPoolAsync();

    // First set is_active to false before archiving
    await query(
      `UPDATE "Staff" SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [staffId, tenantId]
    );

    // Soft delete using archive pattern
    const deletedRecord = await softDelete('Staff', staffId, tenantId, user.userId);

    if (!deletedRecord) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Staff member not found',
      });
    }

    console.log('[Staff][delete] Soft deleted:', staffId);

    return createResponse(200, {
      success: true,
      message: 'Staff member deleted successfully',
    });

  } catch (error) {
    console.error('[Staff] Failed to delete staff member:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to delete staff member',
    });
  }
}