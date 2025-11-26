import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useUserProfileQuery } from '@/features/settings/api-user';
import TodayHeroCard from '@/features/today/components/TodayHeroCard';
import TodayArrivalsList from '@/features/today/components/TodayArrivalsList';
import TodayDeparturesList from '@/features/today/components/TodayDeparturesList';
import TodayBatchCheckInModal from '@/features/today/components/TodayBatchCheckInModal';
import TodayBatchCheckOutModal from '@/features/today/components/TodayBatchCheckOutModal';
import useTodayBookingsSnapshot, { getTodayBookingsSnapshotKey } from '@/features/today/hooks/useTodayBookingsSnapshot';
import { PageLoader } from '@/components/PageLoader';
import { cn } from '@/lib/cn';

/**
 * TodayCommandCenter Component
 * Simplified operational view focused on arrivals and departures
 * Provides calm, focused interface for daily operations
 */
const TodayCommandCenter = () => {
  const queryClient = useQueryClient();
  const [showBatchCheckIn, setShowBatchCheckIn] = useState(false);
  const [showBatchCheckOut, setShowBatchCheckOut] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

  // Fetch today's data
  const today = new Date().toISOString().split('T')[0];
  
  // Get kennel name from user profile or settings
  const { data: userProfile = {} } = useUserProfileQuery();
  
  const kennelName = userProfile?.propertyName || userProfile?.businessName || '';

  const todaySnapshot = useTodayBookingsSnapshot(today);
  const snapshotQueryKey = getTodayBookingsSnapshotKey(today);
  const arrivals = todaySnapshot.data?.arrivalsToday ?? [];
  const departures = todaySnapshot.data?.departuresToday ?? [];
  const inFacility = todaySnapshot.data?.inFacility ?? [];
  // Show skeleton only on initial load when there's no cached data
  const loadingSnapshot = todaySnapshot.isLoading && !todaySnapshot.data;
  // Track background updates for subtle indicators
  const isUpdatingSnapshot = todaySnapshot.isFetching && !todaySnapshot.isLoading && !!todaySnapshot.data;
  
  // Fade-in animation state
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!loadingSnapshot && todaySnapshot.data && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [loadingSnapshot, todaySnapshot.data, hasLoaded]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: snapshotQueryKey });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    queryClient.invalidateQueries({ queryKey: ['attention', 'items'] });
    setLastRefreshed(new Date());
  }, [queryClient, snapshotQueryKey]);

  const dashboardStatsQuery = useQuery({
    queryKey: ['dashboard', 'stats', today],
    queryFn: async () => {
      try {
        const response = await apiClient.get(canonicalEndpoints.reports.dashboardStats);
        return response?.data || {};
      } catch (e) {
        console.warn('[dashboard-stats] Error:', e?.message || e);
        return {};
      }
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 60000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const dashboardStats = dashboardStatsQuery.data || {};

  const attentionItemsQuery = useQuery({
    queryKey: ['attention', 'items', today],
    queryFn: async () => {
      try {
        // Check for bookings with issues
        const unpaidResponse = await apiClient.get(canonicalEndpoints.bookings.list, { params: { status: 'UNPAID' } });
        const unpaidBookings = Array.isArray(unpaidResponse?.data) ? unpaidResponse.data : unpaidResponse?.data?.data || [];
        
        // Check arrivals for vaccination issues
        const vaccinationIssues = arrivals.filter(b => b.hasExpiringVaccinations).length;
        
        return unpaidBookings.length + vaccinationIssues;
      } catch (error) {
        return 0;
      }
    },
    enabled: arrivals.length > 0,
    refetchInterval: 60000,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
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

  // Page-level loading state
  if (loadingSnapshot) {
    return <PageLoader label="Loading today's schedule…" />;
  }

  return (
    <div className={cn(
      "space-y-[var(--bb-space-6,1.5rem)] transition-opacity duration-200",
      hasLoaded ? "opacity-100" : "opacity-0"
    )}>
      {/* 12-column grid layout */}
      <div className="grid gap-[var(--bb-space-6,1.5rem)] lg:grid-cols-12">
        {/* Hero card spans full width */}
        <div className="lg:col-span-12">
          <TodayHeroCard
            kennelName={kennelName}
            formattedDate={formattedDate}
            stats={stats}
            isLoading={false}
            isUpdating={isUpdatingSnapshot}
            onRefresh={handleRefresh}
            lastRefreshed={lastRefreshed}
          />
        </div>

        {/* Arrivals & Departures side-by-side on large screens */}
        <div className="lg:col-span-6">
          <TodayArrivalsList
            arrivals={arrivals}
            isLoading={false}
            hasError={todaySnapshot.isError}
            onBatchCheckIn={() => setShowBatchCheckIn(true)}
          />
        </div>
        <div className="lg:col-span-6">
          <TodayDeparturesList
            departures={departures}
            isLoading={false}
            hasError={todaySnapshot.isError}
            onBatchCheckOut={() => setShowBatchCheckOut(true)}
          />
        </div>
      </div>

      <TodayBatchCheckInModal
        open={showBatchCheckIn}
        onClose={() => setShowBatchCheckIn(false)}
      />
      <TodayBatchCheckOutModal
        open={showBatchCheckOut}
        onClose={() => setShowBatchCheckOut(false)}
        departures={departures}
        snapshotQueryKey={snapshotQueryKey}
      />
    </div>
  );
};

export default TodayCommandCenter;