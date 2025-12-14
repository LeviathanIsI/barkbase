/**
 * Bookings API Hooks
 * 
 * Uses the shared API hook factory for standardized query/mutation patterns.
 * All hooks are tenant-aware and follow consistent error handling.
 * 
 * Booking mutations also invalidate calendar and dashboard queries to keep
 * all schedule-related views in sync.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { normalizeListResponse } from '@/lib/createApiHooks';
import { listQueryDefaults, detailQueryDefaults } from '@/lib/queryConfig';

// ============================================================================
// TENANT HELPERS
// ============================================================================

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Check if tenant is ready for API calls
 * Queries should be disabled until tenantId is available
 */
const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

// ============================================================================
// BOOKING STATUS ENUM (consistent with calendar events)
// ============================================================================

/**
 * Canonical booking status values
 * Used by both bookings and calendar features
 */
export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
};

// ============================================================================
// BOOKING NORMALIZERS
// ============================================================================

/**
 * Normalize a single booking record for consistent shape
 * Ensures fields match what calendar events expect
 *
 * Backend response shape (from operations-service):
 * {
 *   id, tenantId, status, startDate, endDate, checkInTime, checkOutTime,
 *   totalPrice, notes,
 *   kennel: { id, name },
 *   service: { id, name },
 *   owner: { id, firstName, lastName, email, phone },
 *   pets: [{ id, name, species, breed }],
 *   createdAt, updatedAt
 * }
 *
 * @param {object} booking - Raw booking from API
 * @returns {object} Normalized booking
 */
const normalizeBooking = (booking) => {
  if (!booking) return null;

  // Get first pet for display purposes (bookings can have multiple pets)
  const primaryPet = Array.isArray(booking.pets) ? booking.pets[0] : booking.pet;

  return {
    ...booking,
    // Ensure status is uppercase for consistency
    status: booking.status?.toUpperCase() || BOOKING_STATUS.PENDING,
    // Map backend field names to expected frontend names
    checkIn: booking.checkIn || booking.startDate || null,
    checkOut: booking.checkOut || booking.endDate || null,
    startDate: booking.startDate || booking.checkIn || null,
    endDate: booking.endDate || booking.checkOut || null,
    checkInTime: booking.checkInTime || null,
    checkOutTime: booking.checkOutTime || null,
    // Normalize service type
    serviceType: booking.serviceType || booking.service?.name || booking.service?.type || 'boarding',
    // Ensure nested objects exist with normalized shapes
    pet: primaryPet || null,
    pets: booking.pets || (booking.pet ? [booking.pet] : []),
    owner: booking.owner || null,
    kennel: booking.kennel || null,
    service: booking.service || null,
    // Computed fields for calendar compatibility
    title: booking.title ||
      (primaryPet?.name
        ? `${primaryPet.name} - ${booking.service?.name || 'Boarding'}`
        : 'Booking'),
    // Normalize pricing fields (backend uses various names)
    totalCents: booking.totalCents || booking.totalPriceCents || booking.totalPriceInCents || booking.total_price_cents || booking.total_price_in_cents || 0,
    amountPaidCents: booking.amountPaidCents || booking.amount_paid_cents || booking.depositCents || booking.deposit_cents || 0,
  };
};

/**
 * Normalize bookings list response
 * Handles various response shapes and normalizes each booking
 */
const normalizeBookingsResponse = (data) => {
  const normalized = normalizeListResponse(data, 'bookings');
  return normalized.items.map(normalizeBooking);
};

// ============================================================================
// INVALIDATION HELPERS
// ============================================================================

/**
 * Get all query keys that should be invalidated when bookings change
 * @param {string} tenantKey - Current tenant key
 * @returns {Array} Array of query keys to invalidate
 */
const getBookingInvalidationKeys = (tenantKey) => [
  queryKeys.bookings(tenantKey, {}),
  queryKeys.calendar(tenantKey, {}),
  queryKeys.dashboard(tenantKey),
  // Also invalidate schedule/occupancy as bookings affect capacity
  queryKeys.occupancy(tenantKey, {}),
];

// ============================================================================
// LIST QUERY
// ============================================================================

/**
 * Fetch all bookings for the current tenant
 * Supports filtering by date range, status, etc.
 * 
 * @param {object} params - Query params (from, to, status, petId, ownerId, etc.)
 * @returns {UseQueryResult} React Query result with bookings array
 */
export const useBookingsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.bookings(tenantKey, params),
    // Only fetch when tenant is ready (tenantId available for X-Tenant-Id header)
    enabled: isTenantReady,
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.bookings.list, { params });
        return normalizeBookingsResponse(res?.data);
      } catch (e) {
        console.warn('[bookings] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
  });
};

// ============================================================================
// DETAIL QUERY
// ============================================================================

/**
 * Fetch a single booking by ID
 * 
 * @param {string} bookingId - Booking record ID
 * @param {object} options - React Query options
 * @returns {UseQueryResult} React Query result with booking object
 */
export const useBookingDetailQuery = (bookingId, options = {}) => {
  const tenantKey = useTenantKey();
  const { enabled = Boolean(bookingId), ...queryOptions } = options;
  
  return useQuery({
    queryKey: [...queryKeys.bookings(tenantKey, {}), bookingId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.bookings.detail(bookingId));
        return normalizeBooking(res?.data);
      } catch (e) {
        console.warn('[booking] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    enabled,
    ...detailQueryDefaults,
    ...queryOptions,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new booking
 * Invalidates bookings, calendar, and dashboard queries
 *
 * Backend returns 409 Conflict if capacity is exceeded with details:
 * { error: 'Conflict', message: '...', details: { totalCapacity, currentOccupancy, availableSlots } }
 */
export const useCreateBookingMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (payload) => {
      try {
        const res = await apiClient.post(canonicalEndpoints.bookings.list, payload);
        return normalizeBooking(res.data);
      } catch (error) {
        // Extract capacity error details from 409 response
        if (error.response?.status === 409) {
          const capacityError = new Error(error.response.data?.message || 'No available capacity');
          capacityError.isCapacityError = true;
          capacityError.details = error.response.data?.details;
          throw capacityError;
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all booking-related queries
      getBookingInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};

/**
 * Update an existing booking
 * 
 * @param {string} bookingId - Booking to update
 */
export const useUpdateBookingMutation = (bookingId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(canonicalEndpoints.bookings.detail(bookingId), payload);
      return normalizeBooking(res.data);
    },
    onSuccess: () => {
      getBookingInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      // Also invalidate the specific booking detail
      queryClient.invalidateQueries({ 
        queryKey: [...queryKeys.bookings(tenantKey, {}), bookingId] 
      });
    },
  });
};

/**
 * Delete a booking
 */
export const useDeleteBookingMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (bookingId) => {
      await apiClient.delete(canonicalEndpoints.bookings.detail(bookingId));
      return bookingId;
    },
    onSuccess: () => {
      getBookingInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};

/**
 * Assign a kennel to a booking
 * Flexible mutation that accepts bookingId in the payload
 */
export const useAssignKennelMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ bookingId, kennelId }) => {
      const res = await apiClient.put(canonicalEndpoints.bookings.detail(bookingId), {
        kennelId,
      });
      return normalizeBooking(res.data);
    },
    onSuccess: () => {
      getBookingInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      // Also invalidate kennels to refresh occupancy
      queryClient.invalidateQueries({ queryKey: ['kennels'] });
    },
  });
};

// ============================================================================
// CHECK-IN / CHECK-OUT MUTATIONS
// ============================================================================

/**
 * Check in a booking
 * Updates status to CHECKED_IN
 */
export const useBookingCheckInMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async ({ bookingId, payload = {} }) => {
      const res = await apiClient.post(
        canonicalEndpoints.bookings.checkIn(bookingId), 
        payload
      );
      return normalizeBooking(res.data);
    },
    onSuccess: () => {
      getBookingInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};

/**
 * Check out a booking
 * Updates status to CHECKED_OUT
 * Also invalidates payments as checkout may generate invoice
 */
export const useBookingCheckOutMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async ({ bookingId, payload = {} }) => {
      const res = await apiClient.post(
        canonicalEndpoints.bookings.checkOut(bookingId), 
        payload
      );
      return normalizeBooking(res.data);
    },
    onSuccess: () => {
      getBookingInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      // Also invalidate payments as checkout may generate invoice
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(tenantKey, {}) });
    },
  });
};

// ============================================================================
// BOOKING CONFLICTS QUERY
// ============================================================================

/**
 * Query hook to check for booking conflicts
 * Returns conflicting bookings for a given kennel and date range
 *
 * @param {object} params - Query parameters
 * @param {string} params.kennelId - Kennel ID to check
 * @param {string} params.startDate - Start date (ISO string)
 * @param {string} params.endDate - End date (ISO string)
 * @param {string} [params.excludeBookingId] - Booking ID to exclude (for edits)
 */
export const useBookingConflictsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  const { kennelId, startDate, endDate, excludeBookingId } = params;
  const enabled = isTenantReady && !!kennelId && !!startDate && !!endDate;

  return useQuery({
    queryKey: queryKeys.bookingConflicts(tenantKey, { kennelId, startDate, endDate }),
    queryFn: async () => {
      if (!enabled) return { conflicts: [], hasConflicts: false };

      try {
        const queryParams = new URLSearchParams({
          kennelId,
          startDate,
          endDate,
        });
        if (excludeBookingId) {
          queryParams.append('excludeBookingId', excludeBookingId);
        }

        const res = await apiClient.get(
          `${canonicalEndpoints.bookings.list}/conflicts?${queryParams.toString()}`
        );

        const conflicts = res?.data?.conflicts || [];
        return {
          conflicts: conflicts.map(normalizeBooking),
          hasConflicts: conflicts.length > 0,
          count: conflicts.length,
        };
      } catch (e) {
        console.warn('[Bookings] Conflicts check failed:', e?.message || e);
        return { conflicts: [], hasConflicts: false, count: 0 };
      }
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - conflicts should be relatively fresh
    gcTime: 60 * 1000, // 1 minute
  });
};

// ============================================================================
// CONVENIENCE ALIASES
// ============================================================================

// Alias for consumers that expect this name
export const useBookingQuery = useBookingDetailQuery;

// TODO: Migrate related features (runs, daycare, tasks) to use createApiHooks for consistent booking-related data flows.
// TODO: Consider adding useBookingSearchQuery using createSearchQuery factory.
// TODO: Add optimistic updates to mutations using factory patterns.
