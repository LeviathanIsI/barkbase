import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/**
 * Commission Tracking API
 * Manages staff commission rates and records
 */

// Query Keys
const COMMISSION_KEYS = {
  rates: (filters) => ['commissions', 'rates', filters],
  rate: (id) => ['commissions', 'rate', id],
  ledger: (filters) => ['commissions', 'ledger', filters],
  record: (id) => ['commissions', 'record', id],
  staffSummary: (staffId, filters) => ['commissions', 'staff', staffId, filters],
};

// =============================================================================
// COMMISSION RATES
// =============================================================================

/**
 * Get commission rates
 */
export const useCommissionRatesQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: COMMISSION_KEYS.rates(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.staffId) params.append('staffId', filters.staffId);
      if (filters.serviceId) params.append('serviceId', filters.serviceId);
      if (filters.active !== undefined) params.append('active', String(filters.active));
      
      const response = await apiClient.get(`/api/v1/financial/commissions/rates?${params}`);
      return response.data?.rates || response.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get single commission rate
 */
export const useCommissionRateQuery = (rateId, options = {}) => {
  return useQuery({
    queryKey: COMMISSION_KEYS.rate(rateId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/financial/commissions/rates/${rateId}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(rateId),
    ...options,
  });
};

/**
 * Create commission rate
 */
export const useCreateCommissionRateMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/api/v1/financial/commissions/rates', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', 'rates'] });
    },
  });
};

/**
 * Update commission rate
 */
export const useUpdateCommissionRateMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await apiClient.put(`/api/v1/financial/commissions/rates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', 'rates'] });
    },
  });
};

/**
 * Delete commission rate
 */
export const useDeleteCommissionRateMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/api/v1/financial/commissions/rates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', 'rates'] });
    },
  });
};

// =============================================================================
// COMMISSION LEDGER
// =============================================================================

/**
 * Get commission records
 */
export const useCommissionsQuery = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: COMMISSION_KEYS.ledger(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.staffId) params.append('staffId', filters.staffId);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', String(filters.limit));
      
      const response = await apiClient.get(`/api/v1/financial/commissions?${params}`);
      return response.data?.commissions || response.data?.data || [];
    },
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Get single commission record
 */
export const useCommissionQuery = (commissionId, options = {}) => {
  return useQuery({
    queryKey: COMMISSION_KEYS.record(commissionId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/financial/commissions/${commissionId}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(commissionId),
    ...options,
  });
};

/**
 * Approve commission
 */
export const useApproveCommissionMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (commissionId) => {
      const response = await apiClient.post(`/api/v1/financial/commissions/${commissionId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
};

/**
 * Mark commission as paid
 */
export const useMarkCommissionPaidMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ commissionId, paymentReference }) => {
      const response = await apiClient.post(`/api/v1/financial/commissions/${commissionId}/paid`, {
        paymentReference,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
};

// =============================================================================
// STAFF SUMMARY
// =============================================================================

/**
 * Get staff commission summary
 */
export const useStaffCommissionSummaryQuery = (staffId, filters = {}, options = {}) => {
  return useQuery({
    queryKey: COMMISSION_KEYS.staffSummary(staffId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await apiClient.get(`/api/v1/financial/commissions/staff/${staffId}?${params}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(staffId),
    staleTime: 60 * 1000,
    ...options,
  });
};

/**
 * Calculate commission for a booking
 */
export const useCalculateCommissionMutation = () => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/api/v1/financial/commissions/calculate', data);
      return response.data?.data || response.data;
    },
  });
};

