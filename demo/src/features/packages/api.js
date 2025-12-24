import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

const BASE_URL = '/api/v1/financial/packages';

/**
 * Get packages for an owner
 */
export const useOwnerPackagesQuery = (ownerId) => {
  return useQuery({
    queryKey: ['packages', 'owner', ownerId],
    queryFn: async () => {
      const { data } = await apiClient.get(`${BASE_URL}?ownerId=${ownerId}`);
      // Handle both array and { packages: [...] } response shapes
      return Array.isArray(data) ? data : (data?.packages || []);
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
      const params = new URLSearchParams();
      if (filters.ownerId) params.append('ownerId', filters.ownerId);
      if (filters.status) params.append('status', filters.status);
      if (filters.includeExpired) params.append('includeExpired', filters.includeExpired);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const queryString = params.toString();
      const { data } = await apiClient.get(`${BASE_URL}${queryString ? `?${queryString}` : ''}`);
      // Handle both array and { packages: [...] } response shapes
      return Array.isArray(data) ? data : (data?.packages || []);
    }
  });
};

/**
 * Get single package
 */
export const usePackageQuery = (packageId) => {
  return useQuery({
    queryKey: ['packages', packageId],
    queryFn: async () => {
      const response = await apiClient.get(`${BASE_URL}/${packageId}`);
      return response;
    },
    enabled: !!packageId
  });
};

/**
 * Create a new package
 */
export const useCreatePackageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageData) => {
      const response = await apiClient.post(BASE_URL, packageData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    }
  });
};

/**
 * Update a package
 */
export const useUpdatePackageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, data }) => {
      const response = await apiClient.put(`${BASE_URL}/${packageId}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages', variables.packageId] });
    }
  });
};

/**
 * Delete a package
 */
export const useDeletePackageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId) => {
      const response = await apiClient.delete(`${BASE_URL}/${packageId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    }
  });
};

/**
 * Use credits from a package
 */
export const useUsePackageCreditsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, creditsUsed, bookingId, notes }) => {
      const response = await apiClient.post(`${BASE_URL}/${packageId}/use`, {
        creditsUsed,
        bookingId,
        notes,
      });
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages', variables.packageId] });
      queryClient.invalidateQueries({ queryKey: ['packages', variables.packageId, 'usage'] });
      if (variables.bookingId) {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
      }
    }
  });
};

/**
 * Legacy alias for backward compatibility
 */
export const useApplyPackageMutation = () => {
  const mutation = useUsePackageCreditsMutation();
  
  return {
    ...mutation,
    mutationFn: async ({ packageId, bookingId, creditsUsed }) => {
      return mutation.mutateAsync({ packageId, bookingId, creditsUsed });
    }
  };
};

/**
 * Get package usage history
 */
export const usePackageUsageQuery = (packageId) => {
  return useQuery({
    queryKey: ['packages', packageId, 'usage'],
    queryFn: async () => {
      const { data } = await apiClient.get(`${BASE_URL}/${packageId}/usage`);
      // Handle both array and { usage: [...] } response shapes
      return Array.isArray(data) ? data : (data?.usage || []);
    },
    enabled: !!packageId
  });
};

// Direct API functions (non-hook)
export async function getPackages(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.ownerId) searchParams.append('ownerId', params.ownerId);
  if (params.status) searchParams.append('status', params.status);
  if (params.includeExpired) searchParams.append('includeExpired', params.includeExpired);
  
  const queryString = searchParams.toString();
  return apiClient.get(`${BASE_URL}${queryString ? `?${queryString}` : ''}`);
}

export async function getPackage(packageId) {
  return apiClient.get(`${BASE_URL}/${packageId}`);
}

export async function createPackage(data) {
  return apiClient.post(BASE_URL, data);
}

export async function updatePackage(packageId, data) {
  return apiClient.put(`${BASE_URL}/${packageId}`, data);
}

export async function deletePackage(packageId) {
  return apiClient.delete(`${BASE_URL}/${packageId}`);
}

export async function usePackageCredits(packageId, data) {
  return apiClient.post(`${BASE_URL}/${packageId}/use`, data);
}

export async function getPackageUsage(packageId) {
  return apiClient.get(`${BASE_URL}/${packageId}/usage`);
}

export default {
  getPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
  usePackageCredits,
  getPackageUsage,
};
