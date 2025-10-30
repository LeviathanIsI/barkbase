import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';

// Query keys
const runTemplateKeys = {
  all: (tenantKey) => ['run-templates', tenantKey],
  detail: (tenantKey, id) => ['run-template', tenantKey, id],
};

// Get all run templates
export const useRunTemplatesQuery = () => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  return useQuery({
    queryKey: runTemplateKeys.all(tenantKey),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/run-templates');
      return res.data;
    },
  });
};

// Create run template
export const useCreateRunTemplateMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  return useMutation({
    mutationFn: async (templateData) => {
      const res = await apiClient.post('/api/v1/run-templates', templateData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runTemplateKeys.all(tenantKey) });
    },
  });
};

// Update run template
export const useUpdateRunTemplateMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  return useMutation({
    mutationFn: async ({ id, ...templateData }) => {
      const res = await apiClient.put(`/api/v1/run-templates/${id}`, templateData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runTemplateKeys.all(tenantKey) });
    },
  });
};

// Delete (soft delete) run template
export const useDeleteRunTemplateMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/api/v1/run-templates/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: runTemplateKeys.all(tenantKey) });
    },
  });
};

// Get available time slots for a run
export const useAvailableSlotsQuery = (runId, date) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  return useQuery({
    queryKey: ['run-available-slots', tenantKey, runId, date],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/runs/${runId}/available-slots`, {
        params: { date },
      });
      return res.data;
    },
    enabled: Boolean(runId && date),
  });
};

