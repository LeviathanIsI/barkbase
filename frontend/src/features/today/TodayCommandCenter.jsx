import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useUserProfileQuery } from '@/features/settings/api-user';
import TodayHeroCard from '@/features/today/components/TodayHeroCard';
import TodayArrivalsList from '@/features/today/components/TodayArrivalsList';
import TodayDeparturesList from '@/features/today/components/TodayDeparturesList';
import TodayBatchCheckInModal from '@/features/today/components/TodayBatchCheckInModal';
import TodayBatchCheckOutModal from '@/features/today/components/TodayBatchCheckOutModal';
import TodayGrid from '@/features/today/components/TodayGrid';

/**
 * TodayCommandCenter Component
 * Simplified operational view focused on arrivals and departures
 * Provides calm, focused interface for daily operations
 */
const TodayCommandCenter = () => {
  // TODO (Nav Cleanup B:4): Update nav labels + section grouping once Today page is finalized.
  // TODO (Today Refactor B:3): Visual cleanup + layout polish next.
  // TODO (B:6 Query Consolidation):
  // Many Today queries fetch overlapping booking data.
  // In the next phase we will consolidate these queries into a unified "TodaySnapshot" hook.
  const [showBatchCheckIn, setShowBatchCheckIn] = useState(false);
  const [showBatchCheckOut, setShowBatchCheckOut] = useState(false);

  // Fetch today's data
  const today = new Date().toISOString().split('T')[0];
  
  // Get kennel name from user profile or settings
  const { data: userProfile = {} } = useUserProfileQuery();
  
  const kennelName = userProfile?.propertyName || userProfile?.businessName || '';

  const arrivalsQuery = useQuery({
    queryKey: ['bookings', 'arrivals', today],
    queryFn: async () => {
      // Fetch all bookings for today and filter by status
      const response = await apiClient.get('/api/v1/bookings', { params: { date: today } });
      const bookings = Array.isArray(response?.data) ? response.data : response?.data?.data || [];

      // Filter to PENDING or CONFIRMED bookings starting today
      return bookings.filter(b => {
        const status = b.status || b.bookingStatus;
        const isPendingOrConfirmed = status === 'PENDING' || status === 'CONFIRMED';
        const startDate = new Date(b.startDate || b.checkInDate).toISOString().split('T')[0];
        return isPendingOrConfirmed && startDate === today;
      });
    },
    refetchInterval: 30000
  });

  const departuresQuery = useQuery({
    queryKey: ['bookings', 'departures', today],
    queryFn: async () => {
      // Fetch checked-in bookings ending today
      const response = await apiClient.get('/api/v1/bookings', { params: { status: 'CHECKED_IN' } });
      const bookings = Array.isArray(response?.data) ? response.data : response?.data?.data || [];

      // Filter to only those ending today
      return bookings.filter(b => {
        const endDate = new Date(b.endDate || b.checkOutDate).toISOString().split('T')[0];
        return endDate === today;
      });
    },
    refetchInterval: 30000
  });

  const occupancyQuery = useQuery({
    queryKey: ['bookings', 'checked-in', today],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/bookings', { params: { status: 'CHECKED_IN' } });
      return Array.isArray(response?.data) ? response.data : response?.data?.data || [];
    },
    refetchInterval: 30000
  });

  const arrivals = arrivalsQuery.data ?? [];
  const departures = departuresQuery.data ?? [];
  const inFacility = occupancyQuery.data ?? [];
  const loadingArrivals = arrivalsQuery.isLoading;
  const loadingDepartures = departuresQuery.isLoading;
  const loadingOccupancy = occupancyQuery.isLoading;

  const dashboardStatsQuery = useQuery({
    queryKey: ['dashboard', 'stats', today],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/dashboard/stats');
      return response?.data || {};
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const dashboardStats = dashboardStatsQuery.data || {};

  const attentionItemsQuery = useQuery({
    queryKey: ['attention', 'items', today],
    queryFn: async () => {
      try {
        // Check for bookings with issues
        const unpaidResponse = await apiClient.get('/api/v1/bookings', { params: { status: 'UNPAID' } });
        const unpaidBookings = Array.isArray(unpaidResponse?.data) ? unpaidResponse.data : unpaidResponse?.data?.data || [];
        
        // Check arrivals for vaccination issues
        const vaccinationIssues = arrivals.filter(b => b.hasExpiringVaccinations).length;
        
        return unpaidBookings.length + vaccinationIssues;
      } catch (error) {
        return 0;
      }
    },
    enabled: arrivals.length > 0,
    refetchInterval: 60000
  });

  const attentionItems = attentionItemsQuery.data ?? 0;

  // Calculate stats
  const stats = useMemo(() => {
    return {
      arrivals: arrivals.length,
      departures: departures.length,
      inFacility: inFacility.length,
      attentionItems
    };
  }, [arrivals, departures, inFacility, attentionItems]);

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formattedDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  // Loading state
  if (loadingArrivals || loadingDepartures || loadingOccupancy) {
    return (
      <div className="space-y-6 px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <TodayHeroCard
        kennelName={kennelName}
        formattedDate={formattedDate}
        stats={stats}
      />

      <TodayGrid>
        <TodayArrivalsList
          arrivals={arrivals}
          isLoading={loadingArrivals}
          onBatchCheckIn={() => setShowBatchCheckIn(true)}
        />
        <TodayDeparturesList
          departures={departures}
          isLoading={loadingDepartures}
          onBatchCheckOut={() => setShowBatchCheckOut(true)}
        />
      </TodayGrid>

      <TodayBatchCheckInModal
        open={showBatchCheckIn}
        onClose={() => setShowBatchCheckIn(false)}
      />
      <TodayBatchCheckOutModal
        open={showBatchCheckOut}
        onClose={() => setShowBatchCheckOut(false)}
        departures={departures}
      />
    </div>
  );
};

export default TodayCommandCenter;