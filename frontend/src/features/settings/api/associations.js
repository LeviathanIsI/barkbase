// This file is the last major API file with custom logic.
// All hooks here point to custom endpoints under '/api/v1/settings'
// and require dedicated Lambdas. Keep them disabled with safe stubs for now.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');
const disabledQuery = () => Promise.resolve(null);

// Associations API (disabled)

// List associations for an object
export const useObjectAssociations = (objectType, objectId) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { objectType, objectId }),
    queryFn: disabledQuery,
    enabled: false,
  });
};

// Available associations (disabled stub)
export const useAvailableAssociations = (_objectType, _objectId) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { _objectType, _objectId, available: true }),
    queryFn: disabledQuery,
    enabled: false,
  });
};

// Create association label (disabled stub)
export const useCreateAssociationMutation = () => {
  return {
    isPending: false,
    mutateAsync: async () => {
      throw new Error('Associations API not implemented');
    },
  };
};

// List all association labels (disabled stub)
export const useAssociationsQuery = (_options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { listAll: true, ..._options }),
    queryFn: disabledQuery,
    enabled: false,
  });
};

// Seed system associations (disabled stub)
export const useSeedSystemAssociationsMutation = () => {
  return {
    isPending: false,
    mutateAsync: async () => {
      throw new Error('Associations API not implemented');
    },
  };
};

// Update association label (disabled stub)
export const useUpdateAssociationMutation = () => {
  return {
    isPending: false,
    mutateAsync: async () => {
      throw new Error('Associations API not implemented');
    },
  };
};

// Delete association (disabled stub)
export const useDeleteAssociationMutation = () => {
  return {
    isPending: false,
    mutateAsync: async () => {
      throw new Error('Associations API not implemented');
    },
  };
};

// Query associations for a pair (disabled stub)
export const useAssociationsForObjectPairQuery = (objectType1, objectType2) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.associations(tenantKey, { objectType1, objectType2 }),
    queryFn: disabledQuery,
    enabled: false,
  });
};
