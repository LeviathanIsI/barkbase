/**
 * Shared API Hook Factory System
 * 
 * Creates standardized React Query hooks for list queries, detail queries, and mutations.
 * All hooks are tenant-aware and follow consistent patterns for:
 * - Error handling
 * - Response normalization
 * - Cache invalidation
 * - Optimistic updates
 * 
 * Usage:
 * ```js
 * import { createListQuery, createDetailQuery, createMutation } from '@/lib/createApiHooks';
 * 
 * export const usePetsQuery = createListQuery({
 *   key: 'pets',
 *   url: '/api/v1/pets',
 * });
 * 
 * export const usePetDetailsQuery = createDetailQuery({
 *   key: 'pets',
 *   url: '/api/v1/pets/:id',
 * });
 * 
 * export const useCreatePetMutation = createMutation({
 *   url: '/api/v1/pets',
 *   method: 'POST',
 *   invalidate: ['pets'],
 * });
 * ```
 * 
 * TODO: Migrate these features to use the factory:
 * - bookings
 * - staff
 * - tasks
 * - kennels
 * - daycare
 * - reports
 * - services
 * - incidents
 * - payments
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';
import { listQueryDefaults, detailQueryDefaults, searchQueryDefaults } from '@/lib/queryConfig';
import toast from 'react-hot-toast';

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Extract user-friendly error message from API error
 * @param {Error} error - Error object from mutation
 * @returns {string} User-friendly error message
 */
export const extractErrorMessage = (error) => {
  // API response error message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  // Standard error message
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

/**
 * Default onError handler for mutations
 * Shows toast notification with error message
 * @param {string} context - Context for error logging (e.g., 'owners', 'pets')
 * @returns {function} Error handler function
 */
export const createMutationErrorHandler = (context) => (error) => {
  const message = extractErrorMessage(error);
  toast.error(message);
  console.error(`[${context}] Mutation failed:`, message);
};

// ============================================================================
// TENANT HELPERS
// ============================================================================

/**
 * Get current tenant key for query key namespacing
 */
const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Build a tenant-aware query key
 * @param {string} baseKey - Base key name (e.g., 'pets')
 * @param {string} tenantKey - Tenant identifier
 * @param {object} params - Optional params to include in key
 */
const buildQueryKey = (baseKey, tenantKey, params = {}) => {
  const key = [tenantKey, baseKey];
  if (Object.keys(params).length > 0) {
    key.push(params);
  }
  return key;
};

// ============================================================================
// RESPONSE NORMALIZERS
// ============================================================================

/**
 * Ensure each item has a recordId field
 * Standardizes on recordId as the primary identifier
 * @param {object} item - Item to normalize
 * @returns {object} Item with recordId guaranteed
 */
const ensureRecordId = (item) => {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    recordId: item.recordId || item.id,
  };
};

/**
 * Normalize list response to consistent shape
 * Handles: array, { items: [] }, { data: [] }, { [key]: [] }
 * Also ensures all items have recordId field
 *
 * @param {any} data - Raw API response data
 * @param {string} itemsKey - Key to look for in response (e.g., 'pets')
 * @returns {{ items: Array, total: number, raw: any }}
 */
export const normalizeListResponse = (data, itemsKey = 'items') => {
  // Direct array
  if (Array.isArray(data)) {
    const items = data.map(ensureRecordId);
    return { items, total: items.length, raw: data };
  }

  // Object with various array keys
  if (data && typeof data === 'object') {
    // Check for standard patterns
    const rawItems = data.items || data.data || data[itemsKey] || [];
    if (Array.isArray(rawItems)) {
      const items = rawItems.map(ensureRecordId);
      return { items, total: data.total ?? items.length, raw: data };
    }
  }

  // Fallback
  return { items: [], total: 0, raw: data ?? null };
};

/**
 * Normalize detail response
 * Also ensures recordId is present
 * @param {any} data - Raw API response data
 * @returns {object|null}
 */
export const normalizeDetailResponse = (data) => {
  if (!data) return null;
  // If it's an object with a data wrapper, unwrap it
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return ensureRecordId(data.data);
  }
  return ensureRecordId(data);
};

// ============================================================================
// LIST QUERY FACTORY
// ============================================================================

/**
 * Create a list query hook
 * 
 * @param {object} config
 * @param {string} config.key - Base query key (e.g., 'pets')
 * @param {string} config.url - API endpoint URL
 * @param {string} config.itemsKey - Key to extract items from response (default: 'items')
 * @param {object} config.defaultParams - Default query params
 * @param {object} config.queryOptions - Additional React Query options
 * 
 * @returns {function} Hook that returns useQuery result with normalized data
 * 
 * @example
 * const usePetsQuery = createListQuery({ key: 'pets', url: '/api/v1/pets' });
 * const { data, isLoading } = usePetsQuery({ status: 'active' });
 * // data = { items: [...], total: 10, raw: {...} }
 */
export const createListQuery = ({
  key,
  url,
  itemsKey = 'items',
  defaultParams = {},
  queryOptions = {},
}) => {
  return (params = {}, options = {}) => {
    const tenantKey = useTenantKey();
    const mergedParams = { ...defaultParams, ...params };
    
    return useQuery({
      queryKey: buildQueryKey(key, tenantKey, mergedParams),
      queryFn: async () => {
        try {
          const res = await apiClient.get(url, { params: mergedParams });
          return normalizeListResponse(res?.data, itemsKey);
        } catch (e) {
          console.warn(`[${key}] API error, returning empty list:`, e?.message || e);
          return { items: [], total: 0, raw: null };
        }
      },
      ...listQueryDefaults,
      ...queryOptions,
      ...options,
    });
  };
};

// ============================================================================
// DETAIL QUERY FACTORY
// ============================================================================

/**
 * Create a detail query hook for fetching a single resource
 * 
 * @param {object} config
 * @param {string} config.key - Base query key (e.g., 'pets')
 * @param {string|function} config.url - URL template with :id or function(id) => url
 * @param {object} config.queryOptions - Additional React Query options
 * 
 * @returns {function} Hook that returns useQuery result
 * 
 * @example
 * const usePetDetailsQuery = createDetailQuery({ key: 'pets', url: '/api/v1/pets/:id' });
 * const { data, isLoading } = usePetDetailsQuery('pet-123');
 */
export const createDetailQuery = ({
  key,
  url,
  queryOptions = {},
}) => {
  return (id, options = {}) => {
    const tenantKey = useTenantKey();
    const { enabled = Boolean(id), ...restOptions } = options;
    
    // Build URL - support both string template and function
    const resolvedUrl = typeof url === 'function' 
      ? url(id) 
      : url.replace(':id', id);
    
    return useQuery({
      queryKey: buildQueryKey(key, tenantKey, { id }),
      queryFn: async () => {
        try {
          const res = await apiClient.get(resolvedUrl);
          return normalizeDetailResponse(res?.data);
        } catch (e) {
          console.warn(`[${key}/${id}] API error, returning null:`, e?.message || e);
          return null;
        }
      },
      enabled,
      ...detailQueryDefaults,
      ...queryOptions,
      ...restOptions,
    });
  };
};

// ============================================================================
// SEARCH QUERY FACTORY
// ============================================================================

/**
 * Create a search query hook with debounce-friendly defaults
 * 
 * @param {object} config
 * @param {string} config.key - Base query key (e.g., 'owners')
 * @param {string} config.url - API endpoint URL
 * @param {string} config.searchParam - Query param name for search term (default: 'search')
 * @param {number} config.minLength - Minimum search term length (default: 2)
 * @param {number} config.limit - Max results (default: 10)
 * 
 * @returns {function} Hook that returns useQuery result
 */
export const createSearchQuery = ({
  key,
  url,
  searchParam = 'search',
  minLength = 2,
  limit = 10,
  queryOptions = {},
}) => {
  return (searchTerm, options = {}) => {
    const tenantKey = useTenantKey();
    const { enabled = searchTerm?.length >= minLength, ...restOptions } = options;
    
    return useQuery({
      queryKey: buildQueryKey(key, tenantKey, { search: searchTerm }),
      queryFn: async () => {
        try {
          const res = await apiClient.get(url, {
            params: { [searchParam]: searchTerm, limit },
          });
          const normalized = normalizeListResponse(res?.data);
          return normalized.items;
        } catch (e) {
          console.warn(`[${key}/search] API error:`, e?.message || e);
          return [];
        }
      },
      enabled,
      ...searchQueryDefaults,
      ...queryOptions,
      ...restOptions,
    });
  };
};

// ============================================================================
// MUTATION FACTORY
// ============================================================================

/**
 * Create a mutation hook with automatic cache invalidation
 * 
 * @param {object} config
 * @param {string} config.url - API endpoint URL (can include :id placeholder)
 * @param {string} config.method - HTTP method (POST, PUT, PATCH, DELETE)
 * @param {string[]} config.invalidate - Query keys to invalidate on success
 * @param {boolean} config.optimistic - Enable optimistic updates (default: false)
 * @param {object} config.mutationOptions - Additional React Query mutation options
 * 
 * @returns {function} Hook that returns useMutation result
 * 
 * @example
 * const useCreatePetMutation = createMutation({
 *   url: '/api/v1/pets',
 *   method: 'POST',
 *   invalidate: ['pets'],
 * });
 */
export const createMutation = ({
  url,
  method = 'POST',
  invalidate = [],
  errorContext = 'API',
  mutationOptions = {},
}) => {
  return (idOrOptions = {}) => {
    const queryClient = useQueryClient();
    const tenantKey = useTenantKey();
    
    // Support both createMutation() and createMutation(id) patterns
    const isIdBased = typeof idOrOptions === 'string';
    const id = isIdBased ? idOrOptions : null;
    const options = isIdBased ? {} : idOrOptions;
    
    // Resolve URL with id if needed
    const resolveUrl = (payloadOrId) => {
      if (id) {
        return url.replace(':id', id);
      }
      // For DELETE, the payload might be the id
      if (method === 'DELETE' && typeof payloadOrId === 'string') {
        return url.replace(':id', payloadOrId);
      }
      return url;
    };
    
    return useMutation({
      mutationFn: async (payload) => {
        const resolvedUrl = resolveUrl(payload);
        
        switch (method.toUpperCase()) {
          case 'POST':
            return (await apiClient.post(resolvedUrl, payload)).data;
          case 'PUT':
            return (await apiClient.put(resolvedUrl, payload)).data;
          case 'PATCH':
            return (await apiClient.patch(resolvedUrl, payload)).data;
          case 'DELETE':
            await apiClient.delete(resolvedUrl);
            return typeof payload === 'string' ? payload : id;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      },
      onError: createMutationErrorHandler(errorContext),
      onSettled: () => {
        // Invalidate all specified query keys
        invalidate.forEach((queryKey) => {
          queryClient.invalidateQueries({
            queryKey: buildQueryKey(queryKey, tenantKey, {}),
          });
        });

        // Also invalidate detail query if we have an id
        if (id) {
          queryClient.invalidateQueries({
            queryKey: buildQueryKey(invalidate[0], tenantKey, { id }),
          });
        }
      },
      ...mutationOptions,
      ...options,
    });
  };
};

// ============================================================================
// CRUD FACTORY - Creates all CRUD hooks at once
// ============================================================================

/**
 * Create a complete set of CRUD hooks for a resource
 * 
 * @param {object} config
 * @param {string} config.key - Resource key (e.g., 'pets')
 * @param {string} config.listUrl - URL for list/create (e.g., '/api/v1/pets')
 * @param {string|function} config.detailUrl - URL for detail/update/delete
 * @param {string} config.itemsKey - Key for items in list response
 * 
 * @returns {object} Object with all CRUD hooks
 * 
 * @example
 * const petHooks = createCrudHooks({
 *   key: 'pets',
 *   listUrl: '/api/v1/pets',
 *   detailUrl: '/api/v1/pets/:id',
 * });
 * 
 * export const { useListQuery, useDetailQuery, useCreateMutation, useUpdateMutation, useDeleteMutation } = petHooks;
 */
export const createCrudHooks = ({
  key,
  listUrl,
  detailUrl,
  itemsKey = 'items',
}) => {
  // Resolve detail URL
  const resolveDetailUrl = typeof detailUrl === 'function'
    ? detailUrl
    : (id) => detailUrl.replace(':id', id);

  return {
    useListQuery: createListQuery({ key, url: listUrl, itemsKey }),
    
    useDetailQuery: createDetailQuery({ key, url: resolveDetailUrl }),
    
    useSearchQuery: createSearchQuery({ key, url: listUrl }),
    
    useCreateMutation: () => createMutation({
      url: listUrl,
      method: 'POST',
      invalidate: [key],
    })(),
    
    useUpdateMutation: (id) => createMutation({
      url: detailUrl,
      method: 'PUT',
      invalidate: [key],
    })(id),
    
    useDeleteMutation: () => createMutation({
      url: detailUrl,
      method: 'DELETE',
      invalidate: [key],
    })(),
  };
};

export default {
  createListQuery,
  createDetailQuery,
  createSearchQuery,
  createMutation,
  createCrudHooks,
  normalizeListResponse,
  normalizeDetailResponse,
};

