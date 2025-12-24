// Object Settings API
// Backend: config-service handles /api/v1/settings/objects/* routes

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// =============================================================================
// OBJECT SETTINGS (Setup Tab)
// =============================================================================

/**
 * Get object settings for a specific object type
 * GET /api/v1/settings/objects/:objectType
 */
export const useObjectSettings = (objectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.objectSettings(tenantKey, objectType),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}`);
      return res.data;
    },
    enabled: !!objectType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Update object settings
 * PUT /api/v1/settings/objects/:objectType
 */
export const useUpdateObjectSettings = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectSettings(tenantKey, objectType) });
    },
  });
};

// =============================================================================
// ASSOCIATION LABELS (Associations Tab - describes relationship types)
// =============================================================================

/**
 * Get association labels for an object type
 * GET /api/v1/settings/objects/:objectType/association-labels
 */
export const useAssociationLabels = (objectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.objectAssociations(tenantKey, objectType),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}/association-labels`);
      return res.data?.labels || [];
    },
    enabled: !!objectType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a new association label
 * POST /api/v1/settings/objects/:objectType/association-labels
 */
export const useCreateAssociationLabel = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(`/api/v1/settings/objects/${objectType}/association-labels`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectAssociations(tenantKey, objectType) });
    },
  });
};

/**
 * Update an association label
 * PUT /api/v1/settings/objects/:objectType/association-labels/:id
 */
export const useUpdateAssociationLabel = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/association-labels/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectAssociations(tenantKey, objectType) });
    },
  });
};

/**
 * Delete an association label
 * DELETE /api/v1/settings/objects/:objectType/association-labels/:id
 */
export const useDeleteAssociationLabel = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/api/v1/settings/objects/${objectType}/association-labels/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectAssociations(tenantKey, objectType) });
    },
  });
};

// =============================================================================
// OBJECT PIPELINES (Pipelines Tab - for pipeline objects)
// =============================================================================

/**
 * Get pipelines for an object type
 * GET /api/v1/settings/objects/:objectType/pipelines
 */
export const useObjectPipelines = (objectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.objectPipelines(tenantKey, objectType),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}/pipelines`);
      return res.data?.pipelines || [];
    },
    enabled: !!objectType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a new pipeline
 * POST /api/v1/settings/objects/:objectType/pipelines
 */
export const useCreatePipeline = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(`/api/v1/settings/objects/${objectType}/pipelines`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectPipelines(tenantKey, objectType) });
    },
  });
};

/**
 * Update a pipeline
 * PUT /api/v1/settings/objects/:objectType/pipelines/:id
 */
export const useUpdatePipeline = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/pipelines/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectPipelines(tenantKey, objectType) });
    },
  });
};

/**
 * Delete a pipeline
 * DELETE /api/v1/settings/objects/:objectType/pipelines/:id
 */
export const useDeletePipeline = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/api/v1/settings/objects/${objectType}/pipelines/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectPipelines(tenantKey, objectType) });
    },
  });
};

// =============================================================================
// PIPELINE STAGES
// =============================================================================

/**
 * Get stages for a pipeline
 * GET /api/v1/settings/objects/:objectType/pipelines/:pipelineId/stages
 */
export const usePipelineStages = (objectType, pipelineId) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.pipelineStages(tenantKey, objectType, pipelineId),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}/pipelines/${pipelineId}/stages`);
      return res.data?.stages || [];
    },
    enabled: !!objectType && !!pipelineId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a new stage
 * POST /api/v1/settings/objects/:objectType/pipelines/:pipelineId/stages
 */
export const useCreatePipelineStage = (objectType, pipelineId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(`/api/v1/settings/objects/${objectType}/pipelines/${pipelineId}/stages`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineStages(tenantKey, objectType, pipelineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectPipelines(tenantKey, objectType) });
    },
  });
};

/**
 * Update a stage
 * PUT /api/v1/settings/objects/:objectType/pipelines/:pipelineId/stages/:stageId
 */
export const useUpdatePipelineStage = (objectType, pipelineId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/pipelines/${pipelineId}/stages/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineStages(tenantKey, objectType, pipelineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectPipelines(tenantKey, objectType) });
    },
  });
};

/**
 * Delete a stage
 * DELETE /api/v1/settings/objects/:objectType/pipelines/:pipelineId/stages/:stageId
 */
export const useDeletePipelineStage = (objectType, pipelineId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (stageId) => {
      const res = await apiClient.delete(`/api/v1/settings/objects/${objectType}/pipelines/${pipelineId}/stages/${stageId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineStages(tenantKey, objectType, pipelineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectPipelines(tenantKey, objectType) });
    },
  });
};

/**
 * Reorder stages
 * PUT /api/v1/settings/objects/:objectType/pipelines/:pipelineId/stages/reorder
 */
export const useReorderPipelineStages = (objectType, pipelineId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (stageIds) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/pipelines/${pipelineId}/stages/reorder`, { stageIds });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelineStages(tenantKey, objectType, pipelineId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectPipelines(tenantKey, objectType) });
    },
  });
};

// =============================================================================
// OBJECT STATUSES (Lifecycle Tab - for non-pipeline objects)
// =============================================================================

/**
 * Get statuses for an object type
 * GET /api/v1/settings/objects/:objectType/statuses
 */
export const useObjectStatuses = (objectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.objectStatuses(tenantKey, objectType),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}/statuses`);
      return res.data?.statuses || [];
    },
    enabled: !!objectType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a new status
 * POST /api/v1/settings/objects/:objectType/statuses
 */
export const useCreateObjectStatus = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(`/api/v1/settings/objects/${objectType}/statuses`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectStatuses(tenantKey, objectType) });
    },
  });
};

/**
 * Update a status
 * PUT /api/v1/settings/objects/:objectType/statuses/:id
 */
export const useUpdateObjectStatus = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/statuses/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectStatuses(tenantKey, objectType) });
    },
  });
};

/**
 * Delete a status
 * DELETE /api/v1/settings/objects/:objectType/statuses/:id
 */
export const useDeleteObjectStatus = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/api/v1/settings/objects/${objectType}/statuses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectStatuses(tenantKey, objectType) });
    },
  });
};

/**
 * Reorder statuses
 * PUT /api/v1/settings/objects/:objectType/statuses/reorder
 */
export const useReorderObjectStatuses = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (statusIds) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/statuses/reorder`, { statusIds });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectStatuses(tenantKey, objectType) });
    },
  });
};

// =============================================================================
// RECORD LAYOUTS (Record Customization Tab)
// =============================================================================

/**
 * Get record layouts for an object type
 * GET /api/v1/settings/objects/:objectType/record-layout
 */
export const useRecordLayouts = (objectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.recordLayouts(tenantKey, objectType),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}/record-layout`);
      return res.data?.layouts || [];
    },
    enabled: !!objectType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a record layout
 * POST /api/v1/settings/objects/:objectType/record-layout
 */
export const useCreateRecordLayout = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(`/api/v1/settings/objects/${objectType}/record-layout`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recordLayouts(tenantKey, objectType) });
    },
  });
};

/**
 * Update a record layout
 * PUT /api/v1/settings/objects/:objectType/record-layout
 */
export const useUpdateRecordLayout = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/record-layout`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recordLayouts(tenantKey, objectType) });
    },
  });
};

/**
 * Reset record layout to default
 * POST /api/v1/settings/objects/:objectType/record-layout/reset
 */
export const useResetRecordLayout = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/api/v1/settings/objects/${objectType}/record-layout/reset`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recordLayouts(tenantKey, objectType) });
    },
  });
};

/**
 * Delete a record layout
 * DELETE /api/v1/settings/objects/:objectType/record-layout/:id
 */
export const useDeleteRecordLayout = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/api/v1/settings/objects/${objectType}/record-layout/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recordLayouts(tenantKey, objectType) });
    },
  });
};

/**
 * Set a record layout as default
 * PUT /api/v1/settings/objects/:objectType/record-layout/:id/set-default
 */
export const useSetDefaultRecordLayout = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/record-layout/${id}/set-default`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recordLayouts(tenantKey, objectType) });
    },
  });
};

// =============================================================================
// PREVIEW LAYOUTS (Preview Customization Tab)
// =============================================================================

/**
 * Get preview layouts for an object type
 * GET /api/v1/settings/objects/:objectType/preview-layout
 */
export const usePreviewLayouts = (objectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.previewLayouts(tenantKey, objectType),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}/preview-layout`);
      return res.data?.layouts || [];
    },
    enabled: !!objectType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Update preview layout
 * PUT /api/v1/settings/objects/:objectType/preview-layout
 */
export const useUpdatePreviewLayout = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/preview-layout`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.previewLayouts(tenantKey, objectType) });
    },
  });
};

/**
 * Create preview layout
 * POST /api/v1/settings/objects/:objectType/preview-layout
 */
export const useCreatePreviewLayout = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(`/api/v1/settings/objects/${objectType}/preview-layout`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.previewLayouts(tenantKey, objectType) });
    },
  });
};

/**
 * Delete preview layout
 * DELETE /api/v1/settings/objects/:objectType/preview-layout/:id
 */
export const useDeletePreviewLayout = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/api/v1/settings/objects/${objectType}/preview-layout/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.previewLayouts(tenantKey, objectType) });
    },
  });
};

/**
 * Set preview layout as default
 * PUT /api/v1/settings/objects/:objectType/preview-layout/:id/set-default
 */
export const useSetDefaultPreviewLayout = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/preview-layout/${id}/set-default`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.previewLayouts(tenantKey, objectType) });
    },
  });
};

// =============================================================================
// INDEX SETTINGS (Index Customization Tab)
// =============================================================================

/**
 * Get index settings for an object type
 * GET /api/v1/settings/objects/:objectType/index-settings
 */
export const useIndexSettings = (objectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.indexSettings(tenantKey, objectType),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}/index-settings`);
      return res.data;
    },
    enabled: !!objectType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Update index settings
 * PUT /api/v1/settings/objects/:objectType/index-settings
 */
export const useUpdateIndexSettings = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/index-settings`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.indexSettings(tenantKey, objectType) });
    },
  });
};

// =============================================================================
// SAVED VIEWS
// =============================================================================

/**
 * Get saved views for an object type
 * GET /api/v1/settings/objects/:objectType/saved-views
 */
export const useSavedViews = (objectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.savedViews(tenantKey, objectType),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}/saved-views`);
      return res.data?.views || [];
    },
    enabled: !!objectType,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a saved view
 * POST /api/v1/settings/objects/:objectType/saved-views
 */
export const useCreateSavedView = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(`/api/v1/settings/objects/${objectType}/saved-views`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedViews(tenantKey, objectType) });
    },
  });
};

/**
 * Update a saved view
 * PUT /api/v1/settings/objects/:objectType/saved-views/:id
 */
export const useUpdateSavedView = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/saved-views/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedViews(tenantKey, objectType) });
    },
  });
};

/**
 * Delete a saved view
 * DELETE /api/v1/settings/objects/:objectType/saved-views/:id
 */
export const useDeleteSavedView = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/api/v1/settings/objects/${objectType}/saved-views/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedViews(tenantKey, objectType) });
    },
  });
};

/**
 * Set a view as default
 * PUT /api/v1/settings/objects/:objectType/saved-views/:id/set-default
 */
export const useSetDefaultView = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (viewId) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/saved-views/${viewId}/set-default`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedViews(tenantKey, objectType) });
    },
  });
};

/**
 * Promote a view (admin)
 * PUT /api/v1/settings/objects/:objectType/saved-views/:id/promote
 */
export const usePromoteSavedView = (objectType) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (viewId) => {
      const res = await apiClient.put(`/api/v1/settings/objects/${objectType}/saved-views/${viewId}/promote`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedViews(tenantKey, objectType) });
    },
  });
};

// =============================================================================
// OBJECT PROPERTIES
// =============================================================================

/**
 * Get available properties for an object type
 * GET /api/v1/settings/objects/:objectType/properties
 */
export const useObjectProperties = (objectType) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.objectProperties(tenantKey, objectType),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/settings/objects/${objectType}/properties`);
      return res.data;
    },
    enabled: !!objectType,
    staleTime: 5 * 60 * 1000,
  });
};
