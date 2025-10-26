import { useMemo } from 'react';
import { format } from 'date-fns';
import { useBookingsQuery } from '@/features/bookings/api';
import { useKennels } from '@/features/kennels/api';

/**
 * Hook to calculate today's booking statistics
 */
export function useTodayStats(date = new Date()) {
  const today = format(date, 'yyyy-MM-dd');
  
  // Fetch bookings for today
  const { data: bookingsData, isLoading: bookingsLoading } = useBookingsQuery({
    from: today,
    to: today
  });
  
  // Fetch kennels for capacity calculation
  const { data: kennelsData, isLoading: kennelsLoading } = useKennels();
  
  const stats = useMemo(() => {
    if (bookingsLoading || kennelsLoading) {
      return {
        petsToday: 0,
        checkIns: 0,
        checkOuts: 0,
        occupancyPct: 0,
        totalBookings: 0,
        checkInsCompleted: 0,
        checkInsPending: 0,
        availableSpots: 0,
        totalCapacity: 0,
        isLoading: true
      };
    }
    
    const bookings = bookingsData || [];
    const kennels = kennelsData || [];
    const totalCapacity = kennels.length;
    
    // Count pets staying today (checked in or confirmed)
    const petsToday = bookings.filter(b => 
      ['CHECKED_IN', 'CONFIRMED'].includes(b.status)
    ).length;
    
    // Count check-ins scheduled for today
    const checkInToday = format(new Date(date), 'yyyy-MM-dd');
    const checkInsToday = bookings.filter(b => {
      const checkInDate = format(new Date(b.checkIn), 'yyyy-MM-dd');
      return checkInDate === checkInToday;
    });
    
    const checkInsCompleted = checkInsToday.filter(b => b.status === 'CHECKED_IN').length;
    const checkInsPending = checkInsToday.filter(b => b.status !== 'CHECKED_IN').length;
    
    // Count check-outs scheduled for today
    const checkOutsToday = bookings.filter(b => {
      const checkOutDate = format(new Date(b.checkOut), 'yyyy-MM-dd');
      return checkOutDate === checkInToday;
    }).length;
    
    // Calculate occupancy
    const occupancyPct = totalCapacity > 0 ? (petsToday / totalCapacity) * 100 : 0;
    const availableSpots = Math.max(0, totalCapacity - petsToday);
    
    return {
      petsToday,
      checkIns: checkInsToday.length,
      checkOuts: checkOutsToday,
      occupancyPct,
      totalBookings: bookings.length,
      checkInsCompleted,
      checkInsPending,
      availableSpots,
      totalCapacity,
      isLoading: false
    };
  }, [bookingsData, kennelsData, bookingsLoading, kennelsLoading, date]);
  
  return stats;
}

