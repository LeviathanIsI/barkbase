// Associations API
// Backend: config-service handles /api/v1/associations routes

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * List associations for a specific object instance
 * GET /api/v1/associations?fromObjectType=pet&toObjectType=owner
 */
export const useObjectAssociations = (objectType, objectId) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { objectType, objectId }),
    queryFn: async () => {
      const params = {};
      if (objectType) params.fromObjectType = objectType;
      const res = await apiClient.get('/api/v1/associations', { params });
      return res.data || [];
    },
    enabled: !!objectType,
  });
};

/**
 * Get available association labels for an object type pair
 */
export const useAvailableAssociations = (fromObjectType, toObjectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { fromObjectType, toObjectType, available: true }),
    queryFn: async () => {
      const params = { fromObjectType, toObjectType };
      const res = await apiClient.get('/api/v1/associations', { params });
      return res.data || [];
    },
    enabled: !!fromObjectType && !!toObjectType,
  });
};

/**
 * Create a new association label
 * POST /api/v1/associations
 */
export const useCreateAssociationMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post('/api/v1/associations', data);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate all association queries for this tenant
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'associations'] });
    },
  });
};

/**
 * List all association labels
 * GET /api/v1/associations?includeArchived=false
 */
export const useAssociationsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const { includeArchived = false, fromObjectType, toObjectType } = options;

  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { listAll: true, includeArchived, fromObjectType, toObjectType }),
    queryFn: async () => {
      const params = {};
      if (includeArchived) params.includeArchived = 'true';
      if (fromObjectType) params.fromObjectType = fromObjectType;
      if (toObjectType) params.toObjectType = toObjectType;
      
      const res = await apiClient.get('/api/v1/associations', { params });
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Seed system associations (development only)
 * POST /api/v1/associations/seed
 */
export const useSeedSystemAssociationsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/v1/associations/seed');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'associations'] });
    },
  });
};

/**
 * Update an association label
 * PUT /api/v1/associations/{id}
 */
export const useUpdateAssociationMutation = (associationId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.put(`/api/v1/associations/${associationId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'associations'] });
    },
  });
};

/**
 * Delete (archive) an association
 * DELETE /api/v1/associations/{id}
 */
export const useDeleteAssociationMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (associationId) => {
      const res = await apiClient.delete(`/api/v1/associations/${associationId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'associations'] });
    },
  });
};

/**
 * Query associations between two object types
 */
export const useAssociationsForObjectPairQuery = (objectType1, objectType2) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { objectType1, objectType2 }),
    queryFn: async () => {
      const params = { fromObjectType: objectType1, toObjectType: objectType2 };
      const res = await apiClient.get('/api/v1/associations', { params });
      return res.data || [];
    },
    enabled: !!objectType1 && !!objectType2,
  });
};
