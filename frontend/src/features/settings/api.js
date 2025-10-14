import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useMembersQuery = () => {
  const tenantId = useTenantKey();
  return useQuery({
    queryKey: queryKeys.members(tenantId),
    queryFn: () => apiClient(`/api/v1/tenants/${tenantId}/members`),
  });
};

export const useInviteMemberMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantKey();
  return useMutation({
    mutationFn: ({ email, role }) =>
      apiClient(`/api/v1/tenants/${tenantId}/invites`, {
        method: 'POST',
        body: { email, role },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(tenantId) });
    },
  });
};

export const useUpdateMemberRoleMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantKey();
  return useMutation({
    mutationFn: ({ membershipId, role }) =>
      apiClient(`/api/v1/memberships/${membershipId}`, {
        method: 'PATCH',
        body: { role },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(tenantId) });
    },
  });
};

export const useRemoveMemberMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantKey();
  return useMutation({
    mutationFn: (membershipId) =>
      apiClient(`/api/v1/memberships/${membershipId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(tenantId) });
    },
  });
};
