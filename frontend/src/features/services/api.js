import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

/**
 * Get all services
 */
export const useServicesQuery = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/services');
      return response.data;
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
      const response = await apiClient.post('/api/v1/services', serviceData);
      return response.data;
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
      const response = await apiClient.put(`/api/v1/services/${serviceId}`, updates);
      return response.data;
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
      const response = await apiClient.delete(`/api/v1/services/${serviceId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
};

