/**
 * Demo Bookings API
 * Provides mock data hooks for bookings management.
 * Replaces real API calls with static demo data.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import bookingsData from '@/data/bookings.json';
import petsData from '@/data/pets.json';
import ownersData from '@/data/owners.json';

// ============================================================================
// BOOKING STATUS ENUM
// ============================================================================

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
};

// Map from JSON status values to canonical status
const statusMap = {
  arriving: BOOKING_STATUS.CONFIRMED,
  confirmed: BOOKING_STATUS.CONFIRMED,
  pending: BOOKING_STATUS.PENDING,
  checked_in: BOOKING_STATUS.CHECKED_IN,
  departing: BOOKING_STATUS.CHECKED_IN, // Departing means they're still checked in
  checked_out: BOOKING_STATUS.CHECKED_OUT,
  cancelled: BOOKING_STATUS.CANCELLED,
};

// ============================================================================
// MOCK DATA HELPERS
// ============================================================================

/**
 * Normalize a booking from JSON data
 */
const normalizeBooking = (booking) => {
  if (!booking) return null;

  // Find related pet and owner data
  const pet = petsData.find((p) => p.id === booking.petId);
  const owner = ownersData.find((o) => o.id === booking.ownerId);

  const status = statusMap[booking.status?.toLowerCase()] || BOOKING_STATUS.PENDING;

  return {
    ...booking,
    recordId: booking.id,
    status,
    // Date fields
    checkIn: booking.checkInDate,
    checkOut: booking.checkOutDate,
    startDate: booking.checkInDate,
    endDate: booking.checkOutDate,
    checkInTime: booking.checkInTime,
    checkOutTime: booking.checkOutTime,
    // Pet info
    petId: booking.petId,
    petName: booking.petName || pet?.name,
    petBreed: pet?.breed,
    petPhotoUrl: pet?.photoUrl,
    petSpecies: pet?.species || 'dog',
    pet: pet || { id: booking.petId, name: booking.petName },
    // Owner info
    ownerId: booking.ownerId,
    ownerName: booking.ownerName || (owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown Owner'),
    ownerPhone: owner?.phone,
    ownerEmail: owner?.email,
    owner: owner || { id: booking.ownerId, name: booking.ownerName },
    // Service info
    serviceType: booking.serviceName?.toLowerCase().includes('daycare')
      ? 'daycare'
      : booking.serviceName?.toLowerCase().includes('groom')
      ? 'grooming'
      : 'boarding',
    serviceName: booking.serviceName,
    service: { id: booking.serviceId, name: booking.serviceName },
    // Flags
    hasExpiringVaccinations: pet?.vaccinationStatus === 'expiring' || pet?.vaccinationStatus === 'expired',
    hasNotes: !!booking.notes,
    notes: booking.notes,
    // Pricing
    totalCents: Math.round((booking.subtotal || 0) * 100),
    amountPaidCents: 0,
  };
};

/**
 * Get all bookings normalized
 */
const getAllBookings = () => {
  return bookingsData.map(normalizeBooking);
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all bookings
 */
export const useBookingsQuery = (params = {}) => {
  return useQuery({
    queryKey: ['demo', 'bookings', params],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));

      let bookings = getAllBookings();

      // Apply filters
      if (params.status) {
        bookings = bookings.filter((b) => b.status === params.status);
      }

      if (params.date) {
        bookings = bookings.filter(
          (b) => b.checkIn === params.date || b.checkOut === params.date
        );
      }

      return bookings;
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Fetch a single booking by ID
 */
export const useBookingDetailQuery = (bookingId, options = {}) => {
  return useQuery({
    queryKey: ['demo', 'bookings', bookingId],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 100));
      const bookings = getAllBookings();
      return bookings.find((b) => b.id === bookingId || b.recordId === bookingId) || null;
    },
    enabled: !!bookingId && (options.enabled !== false),
    ...options,
  });
};

// Alias
export const useBookingQuery = useBookingDetailQuery;

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new booking (demo - just simulates success)
 */
export const useCreateBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      await new Promise((r) => setTimeout(r, 800));
      return {
        id: `booking-new-${Date.now()}`,
        ...payload,
        status: BOOKING_STATUS.CONFIRMED,
        createdAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['demo', 'today-bookings'] });
    },
  });
};

/**
 * Update a booking (demo - just simulates success)
 */
export const useUpdateBookingMutation = (bookingId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      await new Promise((r) => setTimeout(r, 500));
      return { id: bookingId, ...payload };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
    },
  });
};

/**
 * Delete a booking (demo - just simulates success)
 */
export const useDeleteBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId) => {
      await new Promise((r) => setTimeout(r, 300));
      return bookingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
    },
  });
};

/**
 * Check in a booking
 */
export const useBookingCheckInMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, payload = {} }) => {
      await new Promise((r) => setTimeout(r, 600));
      return {
        id: bookingId,
        status: BOOKING_STATUS.CHECKED_IN,
        actualCheckIn: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['demo', 'today-bookings'] });
    },
  });
};

/**
 * Check out a booking
 */
export const useBookingCheckOutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, payload = {} }) => {
      await new Promise((r) => setTimeout(r, 600));
      return {
        id: bookingId,
        status: BOOKING_STATUS.CHECKED_OUT,
        actualCheckOut: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['demo', 'today-bookings'] });
    },
  });
};

/**
 * Assign a kennel to a booking
 */
export const useAssignKennelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, kennelId }) => {
      await new Promise((r) => setTimeout(r, 400));
      return { id: bookingId, kennelId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
    },
  });
};

/**
 * Check for booking conflicts
 */
export const useBookingConflictsQuery = (params = {}) => {
  const { kennelId, startDate, endDate } = params;
  const enabled = !!kennelId && !!startDate && !!endDate;

  return useQuery({
    queryKey: ['demo', 'booking-conflicts', params],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 100));
      // In demo mode, we never have conflicts
      return { conflicts: [], hasConflicts: false, count: 0 };
    },
    enabled,
    staleTime: 30 * 1000,
  });
};
