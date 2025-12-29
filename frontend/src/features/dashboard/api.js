import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { dashboardQueryDefaults, listQueryDefaults } from '@/lib/queryConfig';
import { useTimezoneUtils } from '@/lib/timezone';

/**
 * Get tenant key for query cache scoping
 */
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

/**
 * Dashboard Stats Query
 *
 * Backend response shape (from analytics-service /api/v1/analytics/dashboard):
 * {
 *   data: {
 *     occupancy: { current, capacity, rate },
 *     todayArrivals: number,
 *     todayDepartures: number,
 *     pendingTasks: number,
 *     totalCustomers: number,
 *     totalPets: number,
 *     alerts: [],
 *   }
 * }
 */
export const useDashboardStatsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'stats'],
    // Only fetch when tenant is ready (tenantId is available for X-Tenant-Id header)
    enabled: isTenantReady && (options.enabled !== false),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.reports.dashboard);
        const backendData = res?.data?.data || res?.data || {};

        // Normalize backend response to expected frontend shape
        return {
          // Backend field mappings
          totalPets: backendData.totalPets || 0,
          totalOwners: backendData.totalCustomers || 0,
          activeBookings: backendData.occupancy?.current || 0,
          todayCheckins: backendData.todayArrivals || 0,
          todayCheckouts: backendData.todayDepartures || 0,
          occupancyRate: backendData.occupancy?.rate || 0,
          pendingTasks: backendData.pendingTasks || 0,
          capacity: backendData.occupancy?.capacity || 0,
          alerts: backendData.alerts || [],
          // Preserve raw occupancy object for components that need it
          occupancy: backendData.occupancy || { current: 0, capacity: 0, rate: 0 },
          // Revenue placeholder (not in main dashboard endpoint)
          revenue: { today: 0, thisWeek: 0, thisMonth: 0 },
        };
      } catch (e) {
        console.warn('[dashboard-stats] Error:', e?.message || e);
        return {
          totalPets: 0,
          totalOwners: 0,
          activeBookings: 0,
          todayCheckins: 0,
          todayCheckouts: 0,
          occupancyRate: 0,
          pendingTasks: 0,
          capacity: 0,
          alerts: [],
          occupancy: { current: 0, capacity: 0, rate: 0 },
          revenue: { today: 0, thisWeek: 0, thisMonth: 0 },
        };
      }
    },
    ...dashboardQueryDefaults,
    ...options,
  });
};

export const useTodaysPetsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'today-pets'],
    enabled: isTenantReady && (options.enabled !== false),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.reports.dashboardSummary);
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch (e) {
        console.warn('[today-pets] Error:', e?.message || e);
        return [];
      }
    },
    ...dashboardQueryDefaults,
    ...options,
  });
};

export const useUpcomingArrivalsQuery = (days = 7, options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'arrivals', days],
    enabled: isTenantReady && (options.enabled !== false),
    queryFn: async () => {
      try {
        // Use operations service for booking-related data
        const res = await apiClient.get(canonicalEndpoints.bookings.list, { params: { status: 'PENDING', days } });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch (e) {
        console.warn('[arrivals] Error:', e?.message || e);
        return [];
      }
    },
    ...dashboardQueryDefaults,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useUpcomingDeparturesQuery = (days = 7, options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'departures', days],
    enabled: isTenantReady && (options.enabled !== false),
    queryFn: async () => {
      try {
        // Use operations service for booking-related data
        const res = await apiClient.get(canonicalEndpoints.bookings.list, { params: { status: 'CHECKED_IN', days } });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch (e) {
        console.warn('[departures] Error:', e?.message || e);
        return [];
      }
    },
    ...dashboardQueryDefaults,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Occupancy Query
 *
 * Backend response shape (from analytics-service /api/v1/analytics/occupancy/current):
 * {
 *   data: {
 *     currentOccupancy: number,
 *     totalCapacity: number,
 *     occupancyRate: number,
 *     availableSpots: number,
 *   }
 * }
 */
export const useOccupancyQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'occupancy'],
    enabled: isTenantReady && (options.enabled !== false),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.reports.occupancyCurrent);
        const backendData = res?.data?.data || res?.data || {};

        // Normalize backend response
        return {
          current: backendData.currentOccupancy || 0,
          total: backendData.totalCapacity || 0,
          percentage: backendData.occupancyRate || 0,
          availableSpots: backendData.availableSpots || 0,
          byCategory: {}, // Not provided by backend yet
        };
      } catch (e) {
        console.warn('[occupancy] Error:', e?.message || e);
        return { current: 0, total: 0, percentage: 0, availableSpots: 0, byCategory: {} };
      }
    },
    ...dashboardQueryDefaults,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Revenue Metrics Query
 *
 * Backend response shape (from analytics-service /api/v1/analytics/revenue):
 * {
 *   data: {
 *     totalRevenue: number,
 *     transactionCount: number,
 *     averageTransactionValue: number,
 *     period: { startDate, endDate },
 *   }
 * }
 */
export const useRevenueMetricsQuery = (period = 'month', options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'revenue', period],
    enabled: isTenantReady && (options.enabled !== false),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.reports.revenue, { params: { period } });
        const backendData = res?.data?.data || res?.data || {};

        // Normalize backend response
        return {
          total: backendData.totalRevenue || 0,
          collected: backendData.totalRevenue || 0, // Backend doesn't separate these
          pending: 0, // Not in current backend
          overdue: 0, // Not in current backend
          transactionCount: backendData.transactionCount || 0,
          averageTransactionValue: backendData.averageTransactionValue || 0,
          chartData: [], // Not in current backend
        };
      } catch (e) {
        console.warn('[revenue] Error:', e?.message || e);
        return { total: 0, collected: 0, pending: 0, overdue: 0, chartData: [] };
      }
    },
    ...dashboardQueryDefaults,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

export const useActivityFeedQuery = (limit = 20, options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.dashboard(tenantKey), 'activity', limit],
    enabled: isTenantReady && (options.enabled !== false),
    queryFn: async () => {
      try {
        // Activity feed is part of analytics dashboard
        const res = await apiClient.get(canonicalEndpoints.reports.dashboard, { params: { limit } });
        return Array.isArray(res.data?.activity) ? res.data.activity : [];
      } catch (e) {
        console.warn('[activity] Error:', e?.message || e);
        return [];
      }
    },
    ...dashboardQueryDefaults,
    staleTime: 30 * 1000,
    ...options,
  });
};

// Alias exports for backwards compatibility
export const useDashboardStats = (options = {}) => {
  const statsQuery = useDashboardStatsQuery(options);
  
  const transformedData = statsQuery.data ? {
    ...statsQuery.data,
    revenueToday: statsQuery.data.revenue?.today || 0,
    pendingCheckins: statsQuery.data.todayCheckins || 0,
    availableSpots: Math.max(0, (statsQuery.data.totalOwners || 0) - (statsQuery.data.activeBookings || 0)),
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
    revenue: { today: 0, thisWeek: 0, thisMonth: 0 }
  };
  
  return {
    ...statsQuery,
    data: transformedData
  };
};

export const useDashboardOccupancy = (options = {}) => {
  const occupancyQuery = useOccupancyQuery(options);
  const tz = useTimezoneUtils();

  const transformedData = occupancyQuery.data ? (() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({
        dayLabel: tz.formatDate(date, { weekday: 'short' }),
        occupancy: i === 0 ? (occupancyQuery.data.current || 0) : Math.floor(Math.random() * (occupancyQuery.data.total || 10)),
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

export const useDashboardVaccinations = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();
  const { limit = 5 } = options;

  return useQuery({
    queryKey: ['pets', tenantKey, 'vaccinations', 'expiring', limit],
    enabled: isTenantReady && (options.enabled !== false),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.pets.expiringVaccinations, {
          params: { days: 30, limit }
        });
        const vaccinations = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        
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
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          })(),
          severity: (() => {
            const days = vacc.daysUntil || (() => {
              if (!vacc.expiresAt) return 999;
              const expDate = new Date(vacc.expiresAt);
              const today = new Date();
              return Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
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
    ...dashboardQueryDefaults,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
