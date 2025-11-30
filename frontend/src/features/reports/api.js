import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Fetch main dashboard report metrics
 * Uses analytics service /api/v1/analytics/dashboard endpoint
 */
export const useReportDashboard = (params = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: queryKeys.reports.dashboard(tenantKey, params),
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.reports.dashboard);
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
