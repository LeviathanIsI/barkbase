/**
 * Shared React Query configuration
 * 
 * Use these defaults to prevent skeleton flashing on background refetches:
 * - staleTime: Data is fresh for a reasonable time
 * - refetchOnWindowFocus: false - Don't refetch when user switches tabs
 * - retry: 1 - Don't hammer the API on errors
 */

// Default options for list queries (pets, owners, bookings, etc.)
export const listQueryDefaults = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: 1,
  retryDelay: 1000,
};

// Default options for detail queries (single pet, owner, booking, etc.)
export const detailQueryDefaults = {
  staleTime: 60 * 1000, // 1 minute
  gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: 1,
  retryDelay: 1000,
};

// Default options for dashboard/stats queries (refresh more often)
export const dashboardQueryDefaults = {
  staleTime: 60 * 1000, // 1 minute
  gcTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true, // Dashboard should refresh on reconnect
  retry: 1,
  retryDelay: 2000,
};

// Default options for search queries (short-lived)
export const searchQueryDefaults = {
  staleTime: 30 * 1000, // 30 seconds
  gcTime: 60 * 1000, // 1 minute
  refetchOnWindowFocus: false,
  retry: 0, // Don't retry search queries
};

/**
 * Helper to merge defaults with custom options
 * Ensures stable query keys by serializing params objects
 */
export const withDefaults = (defaults, options = {}) => ({
  ...defaults,
  ...options,
});

/**
 * Create a stable query key from params
 * Prevents unnecessary refetches due to object reference changes
 */
export const stableKey = (base, params = {}) => {
  // Only include non-empty params in the key
  const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
  
  // Return just the base if no params
  if (Object.keys(filteredParams).length === 0) {
    return Array.isArray(base) ? base : [base];
  }
  
  // Serialize params for stable key
  const paramKey = JSON.stringify(filteredParams);
  return Array.isArray(base) ? [...base, paramKey] : [base, paramKey];
};

