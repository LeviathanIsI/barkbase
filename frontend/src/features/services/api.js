import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/lib/apiClient';

/**
 * Get all services
 */
export const useServicesQuery = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await from('services').select('*').get();
      if (error) throw new Error(error.message);
      return data;
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
      const { data, error } = await from('services').insert(serviceData);
      if (error) throw new Error(error.message);
      return data;
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
      const { data, error } = await from('services').update(updates).eq('id', serviceId);
      if (error) throw new Error(error.message);
      return data;
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
      const { error } = await from('services').delete().eq('id', serviceId);
      if (error) throw new Error(error.message);
      return serviceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    }
  });
};

