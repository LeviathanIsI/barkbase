import { apiClient } from '@/lib/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Get current user profile
 */
export const useUserProfileQuery = () => {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const response = await apiClient.get('/users/profile');
      return response; // apiClient returns data directly, not wrapped in .data
    },
  });
};

/**
 * Update user profile
 */
export const useUpdateUserProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.patch('/users/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'profile'], data);
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};

/**
 * Update password
 */
export const useUpdatePasswordMutation = () => {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const response = await apiClient.post('/users/password', {
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

  return useMutation({
    mutationFn: async (avatarUrl) => {
      const response = await apiClient.patch('/users/avatar', { avatarUrl });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user', 'profile'], data);
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};
