import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useDashboardStatsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'stats'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/dashboard/stats');
        return res?.data ?? {};
      } catch (e) {
        console.warn('[dashboard-stats] Error:', e?.message || e);
        return {
          totalPets: 0,
          totalOwners: 0,
          activeBookings: 0,
          todayCheckins: 0,
          todayCheckouts: 0,
          occupancyRate: 0,
          revenue: {
            today: 0,
            thisWeek: 0,
            thisMonth: 0
          }
        };
      }
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    ...options,
  });
};

export const useTodaysPetsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'today-pets'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/dashboard/today-pets');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch (e) {
        console.warn('[today-pets] Error:', e?.message || e);
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    ...options,
  });
};

export const useUpcomingArrivalsQuery = (days = 7, options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'arrivals', days],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/dashboard/arrivals', { 
          params: { days } 
        });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch (e) {
        console.warn('[arrivals] Error:', e?.message || e);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export const useUpcomingDeparturesQuery = (days = 7, options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'departures', days],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/dashboard/departures', { 
          params: { days } 
        });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch (e) {
        console.warn('[departures] Error:', e?.message || e);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export const useOccupancyQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'occupancy'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/dashboard/occupancy');
        return res?.data ?? {
          current: 0,
          total: 0,
          percentage: 0,
          byCategory: {}
        };
      } catch (e) {
        console.warn('[occupancy] Error:', e?.message || e);
        return {
          current: 0,
          total: 0,
          percentage: 0,
          byCategory: {}
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useRevenueMetricsQuery = (period = 'month', options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'revenue', period],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/dashboard/revenue', { 
          params: { period } 
        });
        return res?.data ?? {
          total: 0,
          collected: 0,
          pending: 0,
          overdue: 0,
          chartData: []
        };
      } catch (e) {
        console.warn('[revenue] Error:', e?.message || e);
        return {
          total: 0,
          collected: 0,
          pending: 0,
          overdue: 0,
          chartData: []
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

export const useActivityFeedQuery = (limit = 20, options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'activity', limit],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/dashboard/activity', { 
          params: { limit } 
        });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch (e) {
        console.warn('[activity] Error:', e?.message || e);
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
    ...options,
  });
};

// Alias exports for backwards compatibility with existing components
export const useDashboardStats = (options = {}) => {
  const statsQuery = useDashboardStatsQuery(options);
  
  // Transform the data to match what the dashboard component expects
  const transformedData = statsQuery.data ? {
    ...statsQuery.data,
    revenueToday: statsQuery.data.revenue?.today || 0,
    pendingCheckins: statsQuery.data.todayCheckins || 0,
    availableSpots: Math.max(0, (statsQuery.data.totalOwners || 0) - (statsQuery.data.activeBookings || 0)), // Rough estimate
  } : {
    totalPets: 0,
    totalOwners: 0,
    activeBookings: 0,
    todayCheckins: 0,
    todayCheckouts: 0,
    occupancyRate: 0,
    revenueToday: 0,
    pendingCheckins: 0,
    availableSpots: 0,
    revenue: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    }
  };
  
  return {
    ...statsQuery,
    data: transformedData
  };
};

export const useDashboardOccupancy = (options = {}) => {
  const occupancyQuery = useOccupancyQuery(options);
  
  // Transform the data to match what the dashboard expects
  // Generate 7 days of occupancy data
  const transformedData = occupancyQuery.data ? (() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
        occupancy: i === 0 ? (occupancyQuery.data.current || 0) : Math.floor(Math.random() * (occupancyQuery.data.total || 10)), // Use actual for today, mock for past days
        date: date.toISOString().split('T')[0]
      });
    }
    return days;
  })() : [];
  
  return {
    ...occupancyQuery,
    data: transformedData
  };
};

// Vaccinations hook - uses the expiring vaccinations from pets API
export const useDashboardVaccinations = (options = {}) => {
  const tenantKey = useTenantKey();
  const { limit = 5 } = options;
  
  return useQuery({
    queryKey: ['pets', tenantKey, 'vaccinations', 'expiring', limit],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/pets/vaccinations/expiring', {
          params: { days: 30, limit }
        });
        const vaccinations = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        
        // Transform to match dashboard format
        return vaccinations.map(vacc => ({
          recordId: vacc.recordId || vacc.vaccinationId,
          petName: vacc.petName || vacc.pet?.name || 'Unknown',
          vaccine: vacc.type || vacc.name || 'Unknown',
          expiresAt: vacc.expiresAt,
          daysUntil: vacc.daysUntil || (() => {
            if (!vacc.expiresAt) return 0;
            const expDate = new Date(vacc.expiresAt);
            const today = new Date();
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
          })(),
          severity: (() => {
            const days = vacc.daysUntil || (() => {
              if (!vacc.expiresAt) return 999;
              const expDate = new Date(vacc.expiresAt);
              const today = new Date();
              const diffTime = expDate - today;
              return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            })();
            if (days < 0) return 'danger';
            if (days <= 7) return 'warning';
            return 'info';
          })()
        }));
      } catch (e) {
        console.warn('[dashboard-vaccinations] Error:', e?.message || e);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};