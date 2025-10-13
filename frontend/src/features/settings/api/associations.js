import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useAssociationsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  const { fromObjectType, toObjectType, includeArchived } = params;

  const queryString = new URLSearchParams({
    ...(fromObjectType && { fromObjectType }),
    ...(toObjectType && { toObjectType }),
    ...(includeArchived !== undefined && { includeArchived: includeArchived.toString() }),
  }).toString();

  return useQuery({
    queryKey: ['associations', tenantKey, params],
    queryFn: () => apiClient(`/api/v1/settings/associations${queryString ? `?${queryString}` : ''}`),
  });
};

export const useAssociationQuery = (associationId) => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['associations', tenantKey, associationId],
    queryFn: () => apiClient(`/api/v1/settings/associations/${associationId}`),
    enabled: !!associationId,
  });
};

export const useAssociationsForObjectPairQuery = (fromObjectType, toObjectType) => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['associations', tenantKey, 'pair', fromObjectType, toObjectType],
    queryFn: () => apiClient(`/api/v1/settings/associations/pair/${fromObjectType}/${toObjectType}`),
    enabled: !!fromObjectType && !!toObjectType,
  });
};

export const useCreateAssociationMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (data) => apiClient('/api/v1/settings/associations', {
      method: 'POST',
      body: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations', tenantKey] });
    },
  });
};

export const useUpdateAssociationMutation = (associationId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (data) => apiClient(`/api/v1/settings/associations/${associationId}`, {
      method: 'PUT',
      body: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations', tenantKey] });
    },
  });
};

export const useDeleteAssociationMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (associationId) => apiClient(`/api/v1/settings/associations/${associationId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations', tenantKey] });
    },
  });
};

export const useSeedSystemAssociationsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: () => apiClient('/api/v1/settings/associations/seed/system', {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations', tenantKey] });
    },
  });
};
