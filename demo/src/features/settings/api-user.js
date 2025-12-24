import apiClient from '@/lib/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

/**
 * Get current user profile
 */
export const useUserProfileQuery = () => {
  const tenantId = useTenantStore((state) => state.tenant?.recordId ?? 'unknown');
  const userId = useAuthStore((state) => state.user?.recordId ?? state.user?.id ?? state.user?.sub ?? 'unknown');

  return useQuery({
    queryKey: queryKeys.userProfile(userId, tenantId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/users/profile');
      return response.data;
    },
  });
};

/**
 * Update user profile
 */
export const useUpdateUserProfileMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((state) => state.tenant?.recordId ?? 'unknown');
  const userId = useAuthStore((state) => state.user?.recordId ?? state.user?.id ?? state.user?.sub ?? 'unknown');
  const profileKey = queryKeys.userProfile(userId, tenantId);

  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.patch('/api/v1/users/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey, data);
      queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });
};

/**
 * Update password
 */
export const useUpdatePasswordMutation = () => {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const response = await apiClient.post('/api/v1/users/password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    },
  });
};

/**
 * Update avatar
 */
export const useUpdateAvatarMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((state) => state.tenant?.recordId ?? 'unknown');
  const userId = useAuthStore((state) => state.user?.recordId ?? state.user?.id ?? state.user?.sub ?? 'unknown');
  const profileKey = queryKeys.userProfile(userId, tenantId);

  return useMutation({
    mutationFn: async (avatarUrl) => {
      const response = await apiClient.patch('/api/v1/users/avatar', { avatarUrl });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey, data);
      queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });
};
