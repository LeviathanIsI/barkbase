import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/**
 * Get packages for an owner
 */
export const useOwnerPackagesQuery = (ownerId) => {
  return useQuery({
    queryKey: ['packages', 'owner', ownerId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/packages/owner/${ownerId}`);
      return response.data;
    },
    enabled: !!ownerId
  });
};

/**
 * Get all packages
 */
export const usePackagesQuery = (filters = {}) => {
  return useQuery({
    queryKey: ['packages', filters],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/packages', { params: filters });
      return response.data;
    }
  });
};

/**
 * Create a new package
 */
export const useCreatePackageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageData) => {
      const response = await apiClient.post('/api/v1/packages', packageData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    }
  });
};

/**
 * Apply package to booking
 */
export const useApplyPackageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, bookingId, creditsUsed }) => {
      const response = await apiClient.post(
        `/api/v1/packages/${packageId}/apply/${bookingId}`,
        { creditsUsed }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages', 'owner'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};

/**
 * Get package usage history
 */
export const usePackageUsageQuery = (packageId) => {
  return useQuery({
    queryKey: ['packages', packageId, 'usage'],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/packages/${packageId}/usage-history`);
      return response.data;
    },
    enabled: !!packageId
  });
};

