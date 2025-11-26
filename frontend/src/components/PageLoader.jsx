/**
 * PageLoader - A clean, centered loading state for page-level initial loads
 * 
 * Use this instead of skeleton grids for a calmer loading experience.
 * Props:
 *   - label: string (optional) - Text to display, defaults to "Loading…"
 */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[280px]">
      <div className="flex items-center text-muted-foreground">
        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin mr-3" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

/**
 * Inline spinner for "Updating…" indicators during background refetches
 */
export function InlineSpinner({ className = '' }) {
  return (
    <span 
      className={`inline-block h-3 w-3 rounded-full border border-current border-t-transparent animate-spin ${className}`}
    />
  );
}

/**
 * UpdateChip - Subtle indicator shown during background data refetches
 * Use this instead of full skeletons when data is being refreshed
 */
export function UpdateChip({ label = 'Updating…', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <InlineSpinner />
      {label}
    </span>
  );
}

export default PageLoader;

