/**
 * Demo Today Bookings Snapshot Hook
 *
 * Provides a unified snapshot of today's arrivals, departures, and in-facility pets.
 * Uses mock data instead of real API calls.
 */

import { useQuery } from '@tanstack/react-query';
import bookingsData from '@/data/bookings.json';
import petsData from '@/data/pets.json';
import ownersData from '@/data/owners.json';
import { BOOKING_STATUS } from '@/features/bookings/api';

/**
 * Normalize booking from JSON data for Today view
 */
const normalizeBookingForToday = (booking) => {
  if (!booking) return null;

  // Find related pet and owner data
  const pet = petsData.find((p) => p.id === booking.petId);
  const owner = ownersData.find((o) => o.id === booking.ownerId);

  // Map status
  const statusMap = {
    arriving: BOOKING_STATUS.CONFIRMED,
    confirmed: BOOKING_STATUS.CONFIRMED,
    pending: BOOKING_STATUS.PENDING,
    checked_in: BOOKING_STATUS.CHECKED_IN,
    departing: BOOKING_STATUS.CHECKED_IN,
    checked_out: BOOKING_STATUS.CHECKED_OUT,
  };

  const status = statusMap[booking.status?.toLowerCase()] || BOOKING_STATUS.PENDING;

  return {
    ...booking,
    id: booking.id,
    recordId: booking.id,
    status,
    // Normalize date fields
    checkIn: booking.checkInDate,
    checkOut: booking.checkOutDate,
    startDate: booking.checkInDate,
    endDate: booking.checkOutDate,
    arrivalTime: booking.checkInTime
      ? `${booking.checkInDate}T${booking.checkInTime}:00`
      : booking.checkInDate,
    departureTime: booking.checkOutTime
      ? `${booking.checkOutDate}T${booking.checkOutTime}:00`
      : booking.checkOutDate,
    // Pet info
    petId: booking.petId,
    petName: booking.petName || pet?.name || 'Unknown Pet',
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
  };
};

/**
 * Generate query key for today's bookings snapshot
 */
export const getTodayBookingsSnapshotKey = (date) => ['demo', 'today-bookings-snapshot', date];

/**
 * Hook to fetch today's arrivals, departures, and in-facility pets
 */
const useTodayBookingsSnapshot = (date) => {
  return useQuery({
    queryKey: getTodayBookingsSnapshotKey(date),
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));

      const allBookings = bookingsData.map(normalizeBookingForToday);

      // Filter arrivals: bookings with status 'arriving' or 'confirmed' for today
      const arrivalsToday = allBookings.filter((b) => {
        const isArriving = b.status === BOOKING_STATUS.CONFIRMED || b.status === BOOKING_STATUS.PENDING;
        return isArriving && b.checkIn === date;
      });

      // Filter departures: checked-in bookings ending today
      const departuresToday = allBookings.filter((b) => {
        const isCheckedIn = b.status === BOOKING_STATUS.CHECKED_IN;
        return isCheckedIn && b.checkOut === date;
      });

      // In-facility: all checked-in bookings
      const inFacility = allBookings.filter((b) => b.status === BOOKING_STATUS.CHECKED_IN);

      return {
        arrivalsToday,
        departuresToday,
        inFacility,
      };
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export default useTodayBookingsSnapshot;
