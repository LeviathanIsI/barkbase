import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/**
 * Customer Self-Service Portal API
 * Allows customers to manage their own bookings
 */

// Query Keys
const CUSTOMER_KEYS = {
  availability: (params) => ['customer', 'availability', params],
  services: () => ['customer', 'services'],
  pets: () => ['customer', 'pets'],
  bookings: (params) => ['customer', 'bookings', params],
  booking: (id) => ['customer', 'booking', id],
  profile: () => ['customer', 'profile'],
};

/**
 * Check availability for a date range
 */
export const useAvailabilityQuery = (startDate, endDate, petCount = 1, options = {}) => {
  return useQuery({
    queryKey: CUSTOMER_KEYS.availability({ startDate, endDate, petCount }),
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        petCount: String(petCount),
      });
      const response = await apiClient.get(`/api/v1/customer/availability?${params}`);
      return response.data;
    },
    enabled: Boolean(startDate && endDate),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

/**
 * Get available services
 */
export const useCustomerServicesQuery = (options = {}) => {
  return useQuery({
    queryKey: CUSTOMER_KEYS.services(),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/customer/services');
      return response.data?.services || response.data?.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Get customer's pets
 */
export const useCustomerPetsQuery = (options = {}) => {
  return useQuery({
    queryKey: CUSTOMER_KEYS.pets(),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/customer/pets');
      return response.data?.pets || response.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Get customer's bookings
 */
export const useCustomerBookingsQuery = (params = {}, options = {}) => {
  const { status, upcoming = true } = params;
  
  return useQuery({
    queryKey: CUSTOMER_KEYS.bookings(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      queryParams.append('upcoming', String(upcoming));
      
      const response = await apiClient.get(`/api/v1/customer/bookings?${queryParams}`);
      return response.data?.bookings || response.data?.data || [];
    },
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Get a specific booking
 */
export const useCustomerBookingQuery = (bookingId, options = {}) => {
  return useQuery({
    queryKey: CUSTOMER_KEYS.booking(bookingId),
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/customer/bookings/${bookingId}`);
      return response.data?.data || response.data;
    },
    enabled: Boolean(bookingId),
    ...options,
  });
};

/**
 * Create a new booking
 */
export const useCreateCustomerBookingMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingData) => {
      const response = await apiClient.post('/api/v1/customer/bookings', bookingData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] });
    },
  });
};

/**
 * Cancel a booking
 */
export const useCancelCustomerBookingMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingId) => {
      const response = await apiClient.delete(`/api/v1/customer/bookings/${bookingId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] });
    },
  });
};

/**
 * Get customer profile
 */
export const useCustomerProfileQuery = (options = {}) => {
  return useQuery({
    queryKey: CUSTOMER_KEYS.profile(),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/customer/profile');
      return response.data?.data || response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update customer profile
 */
export const useUpdateCustomerProfileMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileData) => {
      const response = await apiClient.put('/api/v1/customer/profile', profileData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
    },
  });
};

