import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import toast from 'react-hot-toast';

export const saveTenantTheme = (payload) =>
  apiClient.put(canonicalEndpoints.settings.tenantTheme, payload);

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useOnboardingStatus = () => {
  const tenantId = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.onboarding(tenantId),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/config/tenant/onboarding');
        return res?.data ?? { hasOnboardingCompleted: false };
      } catch (e) {
        console.warn('[onboarding] Error fetching status:', e?.message);
        return { hasOnboardingCompleted: false };
      }
    },
    staleTime: 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
  });
};

export const useOnboardingDismissMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantKey();
  return useMutation({
    mutationFn: async (dismissed) => {
      const res = await apiClient.patch('/api/v1/config/tenant/onboarding', { dismissed });
      return res?.data;
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKeys.onboarding(tenantId), payload);
    },
    onError: (error) => {
      console.warn('[onboarding] Error dismissing:', error?.message);
    },
  });
};

export const useTenantQuery = (slug) => {
  return useQuery({
    queryKey: queryKeys.tenants(slug),
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.tenants.list, { params: { slug } });
      return res?.data ?? null;
    },
    enabled: !!slug,
  });
};

/**
 * Update tenant mutation
 *
 * Backend: PUT /api/v1/profile/tenant (or /api/v1/entity/tenants/:id)
 * Updates tenant settings with real DB persistence
 */
export const useUpdateTenantMutation = (tenantId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      // Use profile service endpoint for tenant updates
      const res = await apiClient.put('/api/v1/profile/tenant', payload);
      return res.data?.data || res.data;
    },
    onSuccess: (data) => {
      // Update local tenant store
      const { setTenant } = useTenantStore.getState();
      if (data?.tenant || data) {
        setTenant(data?.tenant || data);
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tenantConfig });
      if (data?.slug) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tenants(data.slug) });
      }
      toast.success('Tenant settings updated');
    },
    onError: (error) => {
      console.error('[tenant] Update failed:', error?.message);
      toast.error(error?.response?.data?.message || 'Failed to update tenant settings');
    },
  });
};

/**
 * Create tenant mutation
 *
 * Backend: POST /api/v1/entity/tenants
 * Creates a new tenant with real DB persistence
 */
export const useCreateTenantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post(canonicalEndpoints.tenants.list, payload);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created successfully');
    },
    onError: (error) => {
      console.error('[tenant] Create failed:', error?.message);
      toast.error(error?.response?.data?.message || 'Failed to create tenant');
    },
  });
};
