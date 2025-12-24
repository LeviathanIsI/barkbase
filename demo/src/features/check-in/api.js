/**
 * Demo Check-In API
 * Provides hooks for today's arrivals and departures.
 * Data is derived from bookings with dynamic current-day filtering.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBookingsQuery, useBookingCheckInMutation, useBookingCheckOutMutation, BOOKING_STATUS } from '@/features/bookings/api';
import { useMemo } from 'react';

// ============================================================================
// DATE HELPERS
// ============================================================================

const formatDateString = (date) => {
  return date.toISOString().split('T')[0];
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const today = formatDateString(new Date());
  const checkDate = dateStr.split('T')[0];
  return today === checkDate;
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get today's arrivals (bookings with checkIn = today, status CONFIRMED or PENDING)
 */
export const useTodayArrivalsQuery = () => {
  const { data: bookings = [], isLoading, error, refetch } = useBookingsQuery();

  const arrivals = useMemo(() => {
    return bookings.filter((booking) => {
      const isArrivalToday = isToday(booking.checkIn);
      const isPendingArrival =
        booking.status === BOOKING_STATUS.CONFIRMED ||
        booking.status === BOOKING_STATUS.PENDING;
      return isArrivalToday && isPendingArrival;
    }).map((booking) => ({
      ...booking,
      arrivalTime: `${booking.checkIn}T${booking.checkInTime || '10:00'}`,
    }));
  }, [bookings]);

  return {
    data: arrivals,
    isLoading,
    error,
    refetch,
    hasError: !!error,
  };
};

/**
 * Get today's departures (bookings with checkOut = today, status CHECKED_IN)
 */
export const useTodayDeparturesQuery = () => {
  const { data: bookings = [], isLoading, error, refetch } = useBookingsQuery();

  const departures = useMemo(() => {
    return bookings.filter((booking) => {
      const isDepartureToday = isToday(booking.checkOut);
      const isReadyForCheckout = booking.status === BOOKING_STATUS.CHECKED_IN;
      return isDepartureToday && isReadyForCheckout;
    }).map((booking) => ({
      ...booking,
      departureTime: `${booking.checkOut}T${booking.checkOutTime || '16:00'}`,
    }));
  }, [bookings]);

  return {
    data: departures,
    isLoading,
    error,
    refetch,
    hasError: !!error,
  };
};

/**
 * Get currently checked-in pets (all bookings with CHECKED_IN status)
 */
export const useCurrentlyCheckedInQuery = () => {
  const { data: bookings = [], isLoading, error, refetch } = useBookingsQuery();

  const checkedIn = useMemo(() => {
    return bookings.filter((booking) => booking.status === BOOKING_STATUS.CHECKED_IN);
  }, [bookings]);

  return {
    data: checkedIn,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Get today's stats
 */
export const useTodayStatsQuery = () => {
  const { data: bookings = [], isLoading } = useBookingsQuery();

  const stats = useMemo(() => {
    const today = formatDateString(new Date());

    const arrivals = bookings.filter((b) => {
      const checkIn = b.checkIn?.split('T')[0];
      return checkIn === today && (b.status === BOOKING_STATUS.CONFIRMED || b.status === BOOKING_STATUS.PENDING);
    });

    const departures = bookings.filter((b) => {
      const checkOut = b.checkOut?.split('T')[0];
      return checkOut === today && b.status === BOOKING_STATUS.CHECKED_IN;
    });

    const currentlyIn = bookings.filter((b) => b.status === BOOKING_STATUS.CHECKED_IN);

    return {
      arrivalsCount: arrivals.length,
      departuresCount: departures.length,
      currentlyInCount: currentlyIn.length,
      totalBookingsToday: arrivals.length + departures.length,
    };
  }, [bookings]);

  return {
    data: stats,
    isLoading,
  };
};

// ============================================================================
// RE-EXPORT MUTATIONS FROM BOOKINGS
// ============================================================================

// Re-export the check-in/out mutations for convenience
export { useBookingCheckInMutation, useBookingCheckOutMutation, BOOKING_STATUS };
