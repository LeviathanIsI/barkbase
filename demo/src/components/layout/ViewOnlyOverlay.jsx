/**
 * ViewOnlyOverlay - Disables interactions on view-only pages
 *
 * Covers the main content area with an invisible overlay that blocks
 * all pointer events (clicks, hovers, etc.) while still allowing
 * scrolling and viewing.
 */
import { useDemoMode } from '@/contexts/DemoModeContext';

export default function ViewOnlyOverlay({ children }) {
  const { isViewOnly } = useDemoMode();

  if (!isViewOnly) {
    return children;
  }

  return (
    <div className="relative">
      {children}
      {/* Invisible overlay that blocks all interactions */}
      <div
        className="absolute inset-0 z-50"
        style={{
          pointerEvents: 'all',
          cursor: 'not-allowed',
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
}
