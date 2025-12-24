import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/**
 * Get all services
 */
export const useServicesQuery = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/services');
      return res.data;
    }
  });
};

/**
 * Create a service
 */
export const useCreateServiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceData) => {
      const res = await apiClient.post('/api/v1/services', serviceData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
};

/**
 * Update a service
 */
export const useUpdateServiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, updates }) => {
      const res = await apiClient.put(`/api/v1/services/${serviceId}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
};

/**
 * Delete a service
 */
export const useDeleteServiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId) => {
      await apiClient.delete(`/api/v1/services/${serviceId}`);
      return serviceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
};

