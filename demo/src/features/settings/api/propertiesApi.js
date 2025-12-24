/**
 * Properties API Hooks
 * React Query hooks for managing object properties, groups, logic rules, and templates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys, useTenantKey } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';

// ============================================================================
// PROPERTIES
// ============================================================================

/**
 * Fetch all properties for an entity type
 * Includes both system and custom properties
 */
export const useProperties = (entityType, options = {}) => {
  const tenantKey = useTenantKey();
  const { includeArchived = false, includeUsage = false, includeSystem = true } = options;

  return useQuery({
    queryKey: ['properties', tenantKey, entityType, { includeArchived, includeUsage, includeSystem }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) params.set('objectType', entityType);
      if (includeArchived) params.set('includeArchived', 'true');
      if (includeUsage) params.set('includeUsage', 'true');
      if (!includeSystem) params.set('includeSystem', 'false');

      const url = `${canonicalEndpoints.properties.list}?${params.toString()}`;
      const res = await apiClient.get(url);
      return res.data?.properties || [];
    },
    enabled: !!entityType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch a single property by ID
 */
export const useProperty = (propertyId) => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['property', tenantKey, propertyId],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.properties.detail(propertyId));
      return res.data?.property;
    },
    enabled: !!propertyId,
  });
};

/**
 * Create a new custom property
 */
export const useCreateProperty = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(canonicalEndpoints.properties.create, {
        ...data,
        entityType,
      });
      return res.data?.property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', tenantKey, entityType] });
    },
  });
};

/**
 * Update a property
 */
export const useUpdateProperty = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(canonicalEndpoints.properties.update(id), data);
      return res.data?.property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', tenantKey, entityType] });
    },
  });
};

/**
 * Delete (soft) a property
 */
export const useDeleteProperty = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (propertyId) => {
      const res = await apiClient.delete(canonicalEndpoints.properties.delete(propertyId));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', tenantKey, entityType] });
    },
  });
};

/**
 * Archive a property with cascade options
 */
export const useArchiveProperty = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ propertyId, reason, cascadeStrategy }) => {
      const res = await apiClient.post(canonicalEndpoints.properties.archive(propertyId), {
        reason,
        cascadeStrategy,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', tenantKey, entityType] });
    },
  });
};

/**
 * Restore an archived property
 */
export const useRestoreProperty = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (propertyId) => {
      const res = await apiClient.post(canonicalEndpoints.properties.restore(propertyId));
      return res.data?.property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', tenantKey, entityType] });
    },
  });
};

// ============================================================================
// PROPERTY GROUPS
// ============================================================================

/**
 * Fetch all property groups for an entity type
 */
export const usePropertyGroups = (entityType) => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['propertyGroups', tenantKey, entityType],
    queryFn: async () => {
      const params = entityType ? `?objectType=${entityType}` : '';
      const res = await apiClient.get(`${canonicalEndpoints.propertyGroups.list}${params}`);
      return res.data?.groups || [];
    },
    enabled: !!entityType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a property group
 */
export const useCreatePropertyGroup = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(canonicalEndpoints.propertyGroups.create, {
        ...data,
        entityType,
      });
      return res.data?.group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyGroups', tenantKey, entityType] });
    },
  });
};

/**
 * Update a property group
 */
export const useUpdatePropertyGroup = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(canonicalEndpoints.propertyGroups.update(id), data);
      return res.data?.group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyGroups', tenantKey, entityType] });
    },
  });
};

/**
 * Delete a property group
 */
export const useDeletePropertyGroup = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (groupId) => {
      const res = await apiClient.delete(canonicalEndpoints.propertyGroups.delete(groupId));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyGroups', tenantKey, entityType] });
    },
  });
};

// ============================================================================
// PROPERTY LOGIC RULES
// ============================================================================

/**
 * Fetch all logic rules for an entity type
 */
export const usePropertyLogicRules = (entityType) => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['propertyLogic', tenantKey, entityType],
    queryFn: async () => {
      const params = entityType ? `?objectType=${entityType}` : '';
      const res = await apiClient.get(`${canonicalEndpoints.propertyLogic.list}${params}`);
      return res.data?.rules || [];
    },
    enabled: !!entityType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a logic rule
 */
export const useCreatePropertyLogicRule = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(canonicalEndpoints.propertyLogic.create, {
        ...data,
        entityType,
      });
      return res.data?.rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyLogic', tenantKey, entityType] });
    },
  });
};

/**
 * Update a logic rule
 */
export const useUpdatePropertyLogicRule = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(canonicalEndpoints.propertyLogic.update(id), data);
      return res.data?.rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyLogic', tenantKey, entityType] });
    },
  });
};

/**
 * Delete a logic rule
 */
export const useDeletePropertyLogicRule = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (ruleId) => {
      const res = await apiClient.delete(canonicalEndpoints.propertyLogic.delete(ruleId));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyLogic', tenantKey, entityType] });
    },
  });
};

// ============================================================================
// PROPERTY TEMPLATES (Quick-Add)
// ============================================================================

/**
 * Fetch property templates for quick-add
 */
export const usePropertyTemplates = (entityType) => {
  return useQuery({
    queryKey: ['propertyTemplates', entityType],
    queryFn: async () => {
      const params = entityType ? `?objectType=${entityType}` : '';
      const res = await apiClient.get(`${canonicalEndpoints.propertyTemplates.list}${params}`);
      return res.data?.templates || [];
    },
    enabled: !!entityType,
    staleTime: 10 * 60 * 1000, // Templates are static, cache longer
  });
};

/**
 * Create a property from a template
 */
export const useCreatePropertyFromTemplate = (entityType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (template) => {
      // Create property using template data
      const res = await apiClient.post(canonicalEndpoints.properties.create, {
        name: template.name,
        label: template.label,
        description: template.description,
        fieldType: template.fieldType,
        options: template.options,
        entityType,
        propertyGroup: template.propertyGroup || 'Custom',
        showInForm: true,
        showInList: false,
      });
      return res.data?.property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', tenantKey, entityType] });
    },
  });
};
