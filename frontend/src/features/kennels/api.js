import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// TODO: Refactor to a dedicated Lambda for availability logic
// export const useKennelAvailability = (params = {}) => { ... };

export const useKennels = (filters = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: ['kennels', tenantKey, filters],
    queryFn: async () => {
      let query = from('kennels').select('*');
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          query = query.eq(key, value);
        }
      });
      const { data, error } = await query.get();
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });
};

export const useKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: ['kennels', tenantKey, kennelId],
    queryFn: async () => {
      const { data, error } = await from('kennels').select('*').eq('id', kennelId).get();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: isAuthenticated && !!kennelId,
  });
};

export const useCreateKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await from('kennels').insert(payload);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
    },
  });
};

export const useUpdateKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await from('kennels').update(payload).eq('id', kennelId);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey, kennelId] });
    },
  });
};

export const useDeleteKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kennelId) => {
      const { error } = await from('kennels').delete().eq('id', kennelId);
      if (error) throw new Error(error.message);
      return kennelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
    },
  });
};

// TODO: Refactor to a dedicated Lambda for availability logic
// export const useCheckKennelAvailability = (kennelId) => { ... };
