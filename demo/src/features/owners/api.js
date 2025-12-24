/**
 * Owners API - Demo Version
 * Uses mock data instead of real API calls.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ownersData from '@/data/owners.json';
import petsData from '@/data/pets.json';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const ownerKeys = {
  all: ['demo', 'owners'],
  lists: () => [...ownerKeys.all, 'list'],
  list: (filters) => [...ownerKeys.lists(), filters],
  details: () => [...ownerKeys.all, 'detail'],
  detail: (id) => [...ownerKeys.details(), id],
};

// ============================================================================
// MOCK DATA STORE (in-memory for mutations)
// ============================================================================

let mockOwners = [...ownersData];
let nextOwnerId = mockOwners.length + 1;

// Helper to get pets for an owner
const getPetsForOwner = (ownerId) => {
  return petsData.filter((pet) => pet.ownerId === ownerId);
};

// Helper to enrich owner with pets
const enrichOwner = (owner) => {
  if (!owner) return null;
  const pets = getPetsForOwner(owner.id);
  return {
    ...owner,
    recordId: owner.id,
    name: `${owner.firstName} ${owner.lastName}`,
    pets,
    petCount: pets.length,
  };
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all owners with optional filtering and pagination
 */
export const useOwnersQuery = (options = {}) => {
  const { search = '', status = '', page = 1, limit = 25 } = options;

  return useQuery({
    queryKey: ownerKeys.list({ search, status, page, limit }),
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));

      let filtered = [...mockOwners];

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (owner) =>
            owner.firstName?.toLowerCase().includes(searchLower) ||
            owner.lastName?.toLowerCase().includes(searchLower) ||
            owner.email?.toLowerCase().includes(searchLower) ||
            owner.phone?.includes(search)
        );
      }

      // Apply status filter
      if (status && status !== 'all') {
        filtered = filtered.filter((owner) => owner.status === status);
      }

      // Enrich with pets
      const enriched = filtered.map(enrichOwner);

      // Pagination
      const total = enriched.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedData = enriched.slice(start, end);

      return {
        data: paginatedData,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
      };
    },
    staleTime: 30000,
  });
};

/**
 * Fetch a single owner by ID
 */
export const useOwnerQuery = (ownerId, options = {}) => {
  return useQuery({
    queryKey: ownerKeys.detail(ownerId),
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 200));

      const owner = mockOwners.find(
        (o) => o.id === ownerId || o.id === parseInt(ownerId, 10)
      );

      if (!owner) {
        throw new Error('Owner not found');
      }

      return enrichOwner(owner);
    },
    enabled: !!ownerId && options.enabled !== false,
    staleTime: 30000,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new owner
 */
export const useCreateOwnerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 500));

      const newOwner = {
        id: nextOwnerId++,
        ...data,
        status: 'active',
        createdAt: new Date().toISOString(),
        totalSpent: 0,
        visitCount: 0,
      };

      mockOwners.push(newOwner);
      return enrichOwner(newOwner);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.lists() });
      toast.success(`Owner "${data.name}" created successfully!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create owner');
    },
  });
};

/**
 * Update an existing owner
 */
export const useUpdateOwnerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ownerId, data }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));

      const index = mockOwners.findIndex(
        (o) => o.id === ownerId || o.id === parseInt(ownerId, 10)
      );

      if (index === -1) {
        throw new Error('Owner not found');
      }

      mockOwners[index] = {
        ...mockOwners[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      return enrichOwner(mockOwners[index]);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ownerKeys.detail(data.id) });
      toast.success('Owner updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update owner');
    },
  });
};

/**
 * Delete an owner
 */
export const useDeleteOwnerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ownerId }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));

      const index = mockOwners.findIndex(
        (o) => o.id === ownerId || o.id === parseInt(ownerId, 10)
      );

      if (index === -1) {
        throw new Error('Owner not found');
      }

      const deleted = mockOwners[index];
      mockOwners.splice(index, 1);
      return deleted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.lists() });
      toast.success('Owner deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete owner');
    },
  });
};

/**
 * Add a pet to an owner (association)
 */
export const useAddPetToOwnerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ownerId, petId }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));

      // In demo mode, we just show success
      // Real implementation would update the pet's ownerId
      return { ownerId, petId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.detail(variables.ownerId) });
      toast.success('Pet added to owner!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add pet');
    },
  });
};

/**
 * Remove a pet from an owner (disassociation)
 */
export const useRemovePetFromOwnerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ownerId, petId }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));

      // In demo mode, we just show success
      return { ownerId, petId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.detail(variables.ownerId) });
      toast.success('Pet removed from owner!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove pet');
    },
  });
};

/**
 * Update owner status (activate, deactivate, flag, etc.)
 */
export const useUpdateOwnerStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ownerIds, status, notes }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));

      // Update each owner's status in the mock store
      ownerIds.forEach((ownerId) => {
        const index = mockOwners.findIndex(
          (o) => o.id === ownerId || o.id === parseInt(ownerId, 10)
        );
        if (index !== -1) {
          mockOwners[index] = {
            ...mockOwners[index],
            status,
            statusNotes: notes,
            updatedAt: new Date().toISOString(),
          };
        }
      });

      return { ownerIds, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.lists() });
      data.ownerIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ownerKeys.detail(id) });
      });
      const statusLabel = data.status === 'ACTIVE' ? 'activated' : data.status === 'INACTIVE' ? 'deactivated' : 'updated';
      toast.success(`Owner${data.ownerIds.length > 1 ? 's' : ''} ${statusLabel} successfully!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update owner status');
    },
  });
};

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { mockOwners, getPetsForOwner };
