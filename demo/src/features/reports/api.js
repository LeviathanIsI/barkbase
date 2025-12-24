import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// =============================================================================
// ANALYTICS DASHBOARD HOOKS
// =============================================================================

/**
 * Fetch KPI summary data
 * Uses analytics service /api/v1/analytics/dashboard/kpis endpoint
 */
export const useKPIsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'analytics', 'kpis'],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.reports.dashboardKpis);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Fetch dashboard summary (combined metrics)
 */
export const useDashboardSummaryQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'analytics', 'dashboard-summary'],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.reports.dashboardSummary);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch service analytics (breakdown by service type)
 */
export const useServiceAnalyticsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'analytics', 'services'],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.reports.petServices);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch customer analytics
 */
export const useCustomerAnalyticsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'analytics', 'customers'],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.reports.customers);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch current occupancy
 */
export const useCurrentOccupancyQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'analytics', 'occupancy-current'],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.reports.occupancyCurrent);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // 1 minute for real-time data
    ...options,
  });
};

/**
 * Fetch live/today analytics data
 * Used for the Live Analytics tab - pulls today's metrics
 */
export const useLiveAnalyticsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  // Get today's date range
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [tenantKey, 'analytics', 'live', today],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.reports.dashboard, {
        params: { startDate: today, endDate: today }
      });
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds for live data
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    ...options,
  });
};

/**
 * Fetch recent activity/events for live feed
 */
export const useRecentActivityQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'analytics', 'recent-activity'],
    queryFn: async () => {
      // Fetch recent bookings and payments to build activity feed
      const [bookingsRes, paymentsRes] = await Promise.all([
        apiClient.get(canonicalEndpoints.bookings.list, { params: { limit: 10 } }).catch(() => ({ data: { bookings: [] } })),
        apiClient.get(canonicalEndpoints.payments.list, { params: { limit: 10 } }).catch(() => ({ data: { payments: [] } })),
      ]);

      const bookings = bookingsRes.data?.bookings || bookingsRes.data || [];
      const payments = paymentsRes.data?.payments || paymentsRes.data || [];

      // Build activity feed from bookings and payments
      const activities = [];

      bookings.forEach(b => {
        // Get pet name from pets array or pet object
        const petName = b.pets?.[0]?.name || b.pet?.name || b.petName || 'Unknown pet';
        // Get service name from service object
        const serviceName = b.service?.name || b.serviceName || b.serviceType || 'Service';
        // Get owner name
        const ownerName = b.owner ? `${b.owner.firstName || ''} ${b.owner.lastName || ''}`.trim() : '';

        if (b.status === 'CHECKED_IN') {
          activities.push({
            type: 'checkin',
            event: `${petName} checked in for ${serviceName}${ownerName ? ` (${ownerName})` : ''}`,
            time: b.updatedAt || b.updated_at || b.createdAt || b.created_at,
          });
        } else if (b.status === 'CHECKED_OUT') {
          activities.push({
            type: 'checkout',
            event: `${petName} checked out${ownerName ? ` (${ownerName})` : ''}`,
            time: b.updatedAt || b.updated_at || b.createdAt || b.created_at,
          });
        } else if (b.status === 'CONFIRMED' || b.status === 'PENDING') {
          activities.push({
            type: 'booking',
            event: `New booking: ${petName} - ${serviceName}${ownerName ? ` (${ownerName})` : ''}`,
            time: b.createdAt || b.created_at,
          });
        }
      });

      payments.forEach(p => {
        if (p.status === 'SUCCEEDED' || p.status === 'CAPTURED') {
          const amount = (p.amount_cents || p.amount || 0) / 100;
          activities.push({
            type: 'payment',
            event: `Payment received - $${amount.toFixed(2)}`,
            time: p.processed_at || p.created_at,
          });
        }
      });

      // Sort by time (most recent first) and take top 10
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      return activities.slice(0, 10);
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
};

/**
 * Fetch daily revenue data
 */
export const useDailyRevenueQuery = (params = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'analytics', 'revenue-daily', params],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.reports.revenueDaily, { params });
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch main dashboard report metrics
 * Uses analytics service /api/v1/analytics/dashboard endpoint
 * @param {object} params - Query parameters including startDate, endDate, compareStartDate, compareEndDate
 */
export const useReportDashboard = (params = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: queryKeys.reports.dashboard(tenantKey, params),
    queryFn: async () => {
      // Build query params for date filtering
      const queryParams = {};
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.compareStartDate) queryParams.compareStartDate = params.compareStartDate;
      if (params.compareEndDate) queryParams.compareEndDate = params.compareEndDate;

      const response = await apiClient.get(canonicalEndpoints.reports.dashboard, { params: queryParams });
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch revenue report data
 */
export const useRevenueReport = ({ startDate, endDate } = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'reports', 'revenue', { startDate, endDate }],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get(canonicalEndpoints.reports.revenue, { params });
      return response.data || [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch occupancy report data
 */
export const useOccupancyReport = ({ startDate, endDate } = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'reports', 'occupancy', { startDate, endDate }],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get(canonicalEndpoints.reports.occupancy, { params });
      return response.data || [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch arrivals report
 */
export const useArrivalsReport = (days = 7, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'reports', 'arrivals', days],
    queryFn: async () => {
      // Use bookings list with pending status filter
      const response = await apiClient.get(canonicalEndpoints.bookings.list, { params: { status: 'PENDING', days } });
      return response.data?.bookings || response.data || [];
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch departures report
 */
export const useDeparturesReport = (days = 7, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'reports', 'departures', days],
    queryFn: async () => {
      // Use bookings list with checked_in status filter
      const response = await apiClient.get(canonicalEndpoints.bookings.list, { params: { status: 'CHECKED_IN', days } });
      return response.data?.bookings || response.data || [];
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

/**
 * Export report types
 */
export const EXPORT_TYPES = {
  REVENUE: 'revenue',
  BOOKINGS: 'bookings',
  CUSTOMERS: 'customers',
  OCCUPANCY: 'occupancy',
  PETS: 'pets',
  VACCINATIONS: 'vaccinations',
};

/**
 * Export formats
 */
export const EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json',
};

/**
 * Get export endpoint for a report type
 */
const getExportEndpoint = (reportType) => {
  const endpoints = {
    [EXPORT_TYPES.REVENUE]: canonicalEndpoints.reports.exportRevenue,
    [EXPORT_TYPES.BOOKINGS]: canonicalEndpoints.reports.exportBookings,
    [EXPORT_TYPES.CUSTOMERS]: canonicalEndpoints.reports.exportCustomers,
    [EXPORT_TYPES.OCCUPANCY]: canonicalEndpoints.reports.exportOccupancy,
    [EXPORT_TYPES.PETS]: canonicalEndpoints.reports.exportPets,
    [EXPORT_TYPES.VACCINATIONS]: canonicalEndpoints.reports.exportVaccinations,
  };
  return endpoints[reportType] || `/api/v1/analytics/export/${reportType}`;
};

/**
 * Download a report export
 * @param {string} reportType - Type of report (revenue, bookings, etc.)
 * @param {object} params - Query parameters (startDate, endDate, format, etc.)
 * @returns {Promise<void>}
 */
export const downloadReportExport = async (reportType, params = {}) => {
  const format = params.format || EXPORT_FORMATS.CSV;
  const queryString = new URLSearchParams({
    ...params,
    format,
  }).toString();
  
  const baseEndpoint = getExportEndpoint(reportType);
  const endpoint = `${baseEndpoint}?${queryString}`;
  
  try {
    const response = await apiClient.get(endpoint, {
      responseType: format === 'csv' ? 'blob' : 'json',
    });
    
    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `${reportType}_report_${date}.${format}`;
    
    // Create download link
    let blob;
    if (format === 'csv') {
      blob = new Blob([response.data], { type: 'text/csv' });
    } else {
      const jsonString = JSON.stringify(response.data, null, 2);
      blob = new Blob([jsonString], { type: 'application/json' });
    }
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return { success: true, filename };
  } catch (error) {
    console.error('[Export] Download failed:', error);
    throw error;
  }
};

/**
 * Get export preview (JSON format for display)
 * @param {string} reportType - Type of report
 * @param {object} params - Query parameters
 * @returns {Promise<object>}
 */
export const getExportPreview = async (reportType, params = {}) => {
  const queryString = new URLSearchParams({
    ...params,
    format: 'json',
  }).toString();
  
  const endpoint = `/api/v1/analytics/export/${reportType}?${queryString}`;
  const response = await apiClient.get(endpoint);
  return response.data;
};
