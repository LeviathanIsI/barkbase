/**
 * Auth API Hooks
 * 
 * Authentication and session management hooks using the shared API client.
 * All hooks follow consistent error handling patterns.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const authQueryKeys = {
  sessions: ['auth', 'sessions'],
};

// ============================================================================
// SESSION QUERIES
// ============================================================================

/**
 * Fetch all active sessions for the current user
 * 
 * @returns {UseQueryResult} React Query result with sessions array
 */
export const useAuthSessionsQuery = () => {
  return useQuery({
    queryKey: authQueryKeys.sessions,
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/auth/sessions');
        // Backend returns { sessions: [...] }, extract the array
        const data = res?.data;
        return Array.isArray(data) ? data : (data?.sessions || []);
      } catch (e) {
        console.warn('[auth/sessions] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

// ============================================================================
// SESSION MUTATIONS
// ============================================================================

/**
 * Revoke a specific session by ID
 * Cannot revoke the current session
 * 
 * @returns {UseMutationResult} React Query mutation
 */
export const useRevokeSessionMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId) => {
      const res = await apiClient.delete(`/api/v1/auth/sessions/${sessionId}`);
      return res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.sessions });
    },
  });
};

/**
 * Revoke all sessions except the current one
 * 
 * @returns {UseMutationResult} React Query mutation
 */
export const useRevokeAllOtherSessionsMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete('/api/v1/auth/sessions/all');
      return res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.sessions });
    },
  });
};

// ============================================================================
// PASSWORD MUTATIONS
// ============================================================================

/**
 * Change the current user's password
 * 
 * @returns {UseMutationResult} React Query mutation
 */
export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const res = await apiClient.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return res?.data;
    },
  });
};

// ============================================================================
// EMAIL VERIFICATION MUTATIONS
// ============================================================================

/**
 * Resend email verification to the current user
 * 
 * @returns {UseMutationResult} React Query mutation
 */
export const useResendVerificationMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/v1/auth/resend-verification', {});
      return res?.data;
    },
  });
};

