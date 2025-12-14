import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

// Query keys
const runTemplateKeys = {
  all: (tenantKey) => ['run-templates', tenantKey],
  detail: (tenantKey, id) => ['run-template', tenantKey, id],
};

/**
 * Get all run templates
 *
 * Backend returns: { data: [...], runTemplates: [...], total: N }
 * Each template: { id, name, description, capacity, startTime, endTime, daysOfWeek, isActive, status }
 */
export const useRunTemplatesQuery = () => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: runTemplateKeys.all(tenantKey),
    enabled: isTenantReady,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/run-templates');
      const data = res?.data?.data || res?.data?.runTemplates || (Array.isArray(res?.data) ? res.data : []);
      return data;
    },
    staleTime: 5 * 60 * 1000,
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

/**
 * Get available time slots for a run
 *
 * Backend returns: { data: [...], slots: [...] }
 */
export const useAvailableSlotsQuery = (runId, date) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['run-available-slots', tenantKey, runId, date],
    enabled: isTenantReady && Boolean(runId && date),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/runs/${runId}/available-slots`, {
        params: { date },
      });
      const slots = res.data?.data || res.data?.slots || res.data || [];
      return slots;
    },
  });
};
