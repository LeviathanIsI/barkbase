// This file is the last major API file with custom logic.
// All hooks here point to custom endpoints under '/api/v1/settings'
// and require dedicated Lambdas. I will disable all of them.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');
const disabledQuery = () => Promise.resolve(null);

// Associations API
export const useObjectAssociations = (objectType, objectId) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { objectType, objectId }),
    queryFn: disabledQuery,
    enabled: false,
  });
};

export const useAvailableAssociations = (objectType, objectId) => {
    // ... disabled
};

export const useCreateAssociationMutation = () => {
    // ... disabled
};

export const useDeleteAssociationMutation = () => {
    // ... disabled
};

export const useAssociationsForObjectPairQuery = (objectType1, objectType2) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { objectType1, objectType2 }),
    queryFn: disabledQuery,
    enabled: false,
  });
};
