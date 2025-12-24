/**
 * Today Bookings Snapshot Hook
 * 
 * Provides a unified snapshot of today's arrivals, departures, and in-facility pets.
 * Uses the refactored bookings API for consistent data shapes.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { BOOKING_STATUS } from '@/features/bookings/api';

/**
 * Normalize booking from API response for Today view
 * Ensures consistent field names regardless of backend variations
 */
const normalizeBookingForToday = (booking) => {
  if (!booking) return null;

  const status = (booking.status || booking.bookingStatus || '').toUpperCase();

  // Extract first pet from pets array if available
  const firstPet = Array.isArray(booking.pets) && booking.pets.length > 0 ? booking.pets[0] : null;

  return {
    ...booking,
    recordId: booking.recordId || booking.id,
    status,
    // Normalize date fields - backend might use different names
    checkIn: booking.checkIn || booking.startDate || booking.checkInDate,
    checkOut: booking.checkOut || booking.endDate || booking.checkOutDate,
    // Pet info - check pets array first (from backend), then pet object, then direct fields
    petId: booking.petId || firstPet?.id || booking.pet?.recordId,
    petName: booking.petName || firstPet?.name || booking.pet?.name || 'Unknown Pet',
    petBreed: booking.petBreed || firstPet?.breed || booking.pet?.breed,
    petPhotoUrl: booking.petPhotoUrl || firstPet?.photoUrl || booking.pet?.photoUrl,
    petSpecies: booking.petSpecies || firstPet?.species || booking.pet?.species,
    // Owner info
    ownerId: booking.ownerId || booking.owner?.recordId || booking.owner?.id,
    ownerName: booking.ownerName ||
      (booking.owner ? `${booking.owner.firstName || ''} ${booking.owner.lastName || ''}`.trim() : null) ||
      booking.owner?.name,
    ownerPhone: booking.ownerPhone || booking.owner?.phone,
    ownerEmail: booking.ownerEmail || booking.owner?.email,
    // Service info
    serviceType: booking.serviceType || booking.service?.type || 'boarding',
    serviceName: booking.serviceName || booking.service?.name,
    // Flags
    hasExpiringVaccinations: booking.hasExpiringVaccinations || false,
    hasNotes: !!(booking.notes || booking.specialRequirements),
    notes: booking.notes || booking.specialRequirements,
  };
};

/**
 * Normalize array of bookings from API response
 */
const normalizeBookings = (response) => {
  if (!response) return [];
  
  let bookings = [];
  if (Array.isArray(response?.data)) {
    bookings = response.data;
  } else if (Array.isArray(response?.data?.data)) {
    bookings = response.data.data;
  } else if (Array.isArray(response?.data?.items)) {
    bookings = response.data.items;
  } else if (Array.isArray(response?.data?.bookings)) {
    bookings = response.data.bookings;
  }
  
  return bookings.map(normalizeBookingForToday).filter(Boolean);
};

/**
 * Generate query key for today's bookings snapshot
 * @param {string} date - ISO date string (YYYY-MM-DD)
 */
export const getTodayBookingsSnapshotKey = (date) => ['today-bookings-snapshot', date];

/**
 * Hook to fetch today's arrivals, departures, and in-facility pets
 * 
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {UseQueryResult} Query result with { arrivalsToday, departuresToday, inFacility }
 */
const useTodayBookingsSnapshot = (date) => {
  return useQuery({
    queryKey: getTodayBookingsSnapshotKey(date),
    queryFn: async () => {
      try {
        // Fetch bookings for today's date and all checked-in bookings
        const [dateResponse, checkedInResponse] = await Promise.all([
          apiClient.get(canonicalEndpoints.bookings.list, { params: { date } }),
          apiClient.get(canonicalEndpoints.bookings.list, { params: { status: BOOKING_STATUS.CHECKED_IN } }),
        ]);

        const dateBookings = normalizeBookings(dateResponse);
        const checkedInBookings = normalizeBookings(checkedInResponse);

        // Filter arrivals: bookings starting today that are PENDING or CONFIRMED
        const arrivalsToday = dateBookings.filter((b) => {
          const isPendingOrConfirmed = 
            b.status === BOOKING_STATUS.PENDING || 
            b.status === BOOKING_STATUS.CONFIRMED;
          
          if (!b.checkIn) return false;
          const startDate = new Date(b.checkIn).toISOString().split('T')[0];
          return isPendingOrConfirmed && startDate === date;
        });

        // Filter departures: checked-in bookings ending today
        const departuresToday = checkedInBookings.filter((b) => {
          if (!b.checkOut) return false;
          const endDate = new Date(b.checkOut).toISOString().split('T')[0];
          return endDate === date;
        });

        return {
          arrivalsToday,
          departuresToday,
          inFacility: checkedInBookings,
        };
      } catch (e) {
        console.warn('[today-snapshot] Error:', e?.message || e);
        return { arrivalsToday: [], departuresToday: [], inFacility: [] };
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export default useTodayBookingsSnapshot;
