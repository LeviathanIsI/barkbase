/**
 * Demo Dashboard API
 * Provides mock data hooks for dashboard statistics.
 * Replaces real API calls with static demo data.
 */

import { useQuery } from '@tanstack/react-query';
import dashboardData from '@/data/dashboard.json';

/**
 * Dashboard Stats Query (Mock)
 * Returns pre-defined dashboard statistics from mock data.
 */
export const useDashboardStatsQuery = (options = {}) => {
  return useQuery({
    queryKey: ['demo', 'dashboard', 'stats'],
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));

      const { quickStats, metrics } = dashboardData;

      return {
        totalPets: metrics.overview.totalActivePets || 15,
        totalOwners: metrics.overview.totalActiveClients || 10,
        activeBookings: quickStats.petsOnsite || 8,
        todayCheckins: quickStats.arrivalsToday || 4,
        todayCheckouts: quickStats.departuresToday || 2,
        occupancyRate: metrics.overview.averageOccupancyRate || 72,
        pendingTasks: quickStats.openTasks || 6,
        capacity: 30,
        alerts: dashboardData.today.alerts || [],
        occupancy: {
          current: quickStats.petsOnsite || 8,
          capacity: 30,
          rate: metrics.overview.averageOccupancyRate || 72,
        },
        revenue: {
          today: 0,
          thisWeek: 0,
          thisMonth: metrics.monthToDate.revenue || 24680,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useTodaysPetsQuery = (options = {}) => {
  return useQuery({
    queryKey: ['demo', 'dashboard', 'today-pets'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return dashboardData.today.arrivals || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useUpcomingArrivalsQuery = (days = 7, options = {}) => {
  return useQuery({
    queryKey: ['demo', 'dashboard', 'arrivals', days],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return dashboardData.today.arrivals || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useUpcomingDeparturesQuery = (days = 7, options = {}) => {
  return useQuery({
    queryKey: ['demo', 'dashboard', 'departures', days],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return dashboardData.today.departures || [];
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useOccupancyQuery = (options = {}) => {
  return useQuery({
    queryKey: ['demo', 'dashboard', 'occupancy'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      const { currentOccupancy } = dashboardData.today;

      return {
        current: currentOccupancy.boarding.occupied,
        total: currentOccupancy.boarding.capacity,
        percentage: currentOccupancy.boarding.percentage,
        availableSpots: currentOccupancy.boarding.capacity - currentOccupancy.boarding.occupied,
        byCategory: {
          boarding: currentOccupancy.boarding,
          daycare: currentOccupancy.daycare,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useRevenueMetricsQuery = (period = 'month', options = {}) => {
  return useQuery({
    queryKey: ['demo', 'dashboard', 'revenue', period],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      const { monthToDate, yearToDate } = dashboardData.metrics;

      return {
        total: period === 'month' ? monthToDate.revenue : yearToDate.revenue,
        collected: period === 'month' ? monthToDate.revenue : yearToDate.revenue,
        pending: 0,
        overdue: 0,
        transactionCount: monthToDate.bookings || 47,
        averageTransactionValue: Math.round(monthToDate.revenue / monthToDate.bookings),
        chartData: dashboardData.metrics.weeklyTrend || [],
      };
    },
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

export const useActivityFeedQuery = (limit = 20, options = {}) => {
  return useQuery({
    queryKey: ['demo', 'dashboard', 'activity', limit],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return dashboardData.recentActivity?.slice(0, limit) || [];
    },
    staleTime: 30 * 1000,
    ...options,
  });
};

// Alias exports for backwards compatibility
export const useDashboardStats = useDashboardStatsQuery;
export const useDashboardOccupancy = useOccupancyQuery;

export const useDashboardVaccinations = (options = {}) => {
  const { limit = 5 } = options;

  return useQuery({
    queryKey: ['demo', 'dashboard', 'vaccinations', limit],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));

      // Use alerts from dashboard data that are vaccine-related
      const vaccineAlerts = dashboardData.today.alerts
        .filter((a) => a.type.includes('vaccine'))
        .slice(0, limit)
        .map((alert) => ({
          recordId: alert.petId,
          petName: alert.message.split("'")[0] || 'Unknown',
          vaccine: alert.message.includes('Rabies') ? 'Rabies' : 'Bordetella',
          expiresAt: new Date(Date.now() + (alert.type === 'vaccine_expired' ? -1 : 2) * 24 * 60 * 60 * 1000).toISOString(),
          daysUntil: alert.type === 'vaccine_expired' ? -1 : 2,
          severity: alert.severity,
        }));

      return vaccineAlerts;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
