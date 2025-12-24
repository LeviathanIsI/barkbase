import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useFacilitySettingsQuery = () => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.facilitySettings(tenantKey),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/facility/settings');
        const data = res?.data;
        return Array.isArray(data) ? data[0] : data;
      } catch (e) {
        console.warn('[facilitySettings] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateFacilitySettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put('/api/v1/facility/settings', settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.facilitySettings(tenantKey) });
    },
  });
};



