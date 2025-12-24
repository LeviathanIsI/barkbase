/**
 * Subtle indicator shown during background data refetches
 * Use this instead of showing full skeletons when data already exists
 */
export function UpdateIndicator({ isFetching, className = '' }) {
  if (!isFetching) return null;
  
  return (
    <span 
      className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse ${className}`}
    >
      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-ping" />
      Updating…
    </span>
  );
}

/**
 * Hook helper to determine loading state vs background refetch
 * Returns { showSkeleton, showUpdating }
 */
export function useLoadingState(query) {
  const { isLoading, isFetching, data } = query;
  
  // Show skeleton only on initial load when there's no cached data
  const showSkeleton = isLoading && !data;
  
  // Show subtle updating indicator during background refetch when we have data
  const showUpdating = isFetching && !isLoading && !!data;
  
  return { showSkeleton, showUpdating };
}

export default UpdateIndicator;

