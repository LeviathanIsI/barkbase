import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/**
 * useHoverDataFetch Hook
 * Fetches data on hover with 5-minute caching
 * Phase 3: Backend Integration
 *
 * @param {string} resourceType - 'pet' or 'owner'
 * @param {string|number} resourceId - ID of the resource
 * @param {boolean} enabled - Whether to fetch
 */
export const useHoverDataFetch = (resourceType, resourceId, enabled = false) => {
  const [shouldFetch, setShouldFetch] = useState(enabled);
  const hoverTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

  // Query for fetching the data
  const { data, isLoading } = useQuery({
    queryKey: [resourceType, resourceId, 'hover'],
    queryFn: async () => {
      // Fetch full resource data
      const response = await apiClient.get(`/api/v1/${resourceType}s/${resourceId}`);
      return response?.data || response;
    },
    enabled: shouldFetch && !!resourceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Start fetching on hover
  const onMouseEnter = useCallback(() => {
    // Delay fetch slightly to avoid fetching on quick mouse-overs
    hoverTimeoutRef.current = setTimeout(() => {
      setShouldFetch(true);
    }, 200);
  }, []);

  // Cancel fetch if mouse leaves quickly
  const onMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  // Check if data is in cache
  const cachedData = queryClient.getQueryData([resourceType, resourceId, 'hover']);
  const hasCache = !!cachedData;

  return {
    data: data || cachedData,
    isLoading: isLoading && !hasCache,
    hasCache,
    onMouseEnter,
    onMouseLeave,
  };
};

/**
 * usePetHoverData Hook
 * Specialized hook for fetching pet data on hover
 */
export const usePetHoverData = (petId, enabled = false) => {
  return useHoverDataFetch('pet', petId, enabled);
};

/**
 * useOwnerHoverData Hook
 * Specialized hook for fetching owner data on hover
 */
export const useOwnerHoverData = (ownerId, enabled = false) => {
  return useHoverDataFetch('owner', ownerId, enabled);
};
