import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/stores/auth';

/**
 * Get tenant key for query caching
 */
const useTenantKey = () => {
  const tenantId = useAuthStore((s) => s.tenantId);
  return tenantId || 'default';
};

/**
 * Fetch staff roles from TenantSettings
 */
export const useStaffRoles = () => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['staffRoles', tenantKey],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/config/staff-roles');
      return data?.staffRoles || ['Manager', 'Kennel Tech', 'Groomer', 'Trainer'];
    },
  });
};

/**
 * Add a new staff role to TenantSettings
 */
export const useAddStaffRole = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newRole) => {
      // Get current roles from cache
      const currentRoles = queryClient.getQueryData(['staffRoles', tenantKey]) || [];

      // Check if role already exists (case-insensitive)
      const exists = currentRoles.some(
        r => r.toLowerCase() === newRole.toLowerCase()
      );
      if (exists) {
        throw new Error(`Role "${newRole}" already exists`);
      }

      // Add new role and update via API
      const updatedRoles = [...currentRoles, newRole];
      await apiClient.put('/api/v1/config/staff-roles', { staffRoles: updatedRoles });

      // Return the new option for immediate selection
      return { value: newRole, label: newRole };
    },
    onSuccess: (_, newRole) => {
      // Update the cache with the new role
      queryClient.setQueryData(['staffRoles', tenantKey], (oldRoles = []) => {
        if (oldRoles.includes(newRole)) return oldRoles;
        return [...oldRoles, newRole];
      });
    },
    onError: (error) => {
      console.error('[staffRoles] Add failed:', error?.message);
    },
  });
};
