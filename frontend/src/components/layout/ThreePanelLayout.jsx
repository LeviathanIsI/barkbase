import React from 'react';
import { cn } from '@/lib/utils';

/**
 * HubSpot-inspired three-panel layout for operational interfaces
 *
 * Layout structure:
 * - Left Panel: Filters, navigation, saved views (optional, collapsible)
 * - Center Panel: Main content (list, table, board view)
 * - Right Panel: Context sidebar, details, quick actions (optional, appears on selection)
 *
 * @example
 * <ThreePanelLayout
 *   left={<FilterPanel />}
 *   center={<PetTable />}
 *   right={<PetDetailsPreview />}
 * />
 */
export function ThreePanelLayout({
  left,
  center,
  right,
  leftWidth = 'w-64',      // 256px default
  rightWidth = 'w-96',     // 384px default
  showLeftPanel = true,
  showRightPanel = true,
  className,
  children  // Alternative to left/center/right props
}) {
  return (
    <div className={cn("flex h-full min-h-0", className)}>
      {/* Left Panel - Filters/Navigation */}
      {showLeftPanel && left && (
        <aside
          className={cn(
            leftWidth,
            "flex-shrink-0 border-r overflow-y-auto",
            "border-gray-200 dark:border-[var(--border-light)]",
            "bg-white dark:bg-[var(--surface-primary)]"
          )}
        >
          {left}
        </aside>
      )}

      {/* Center Panel - Main Content (always visible) */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-[var(--bg-primary)]">
        {center || children}
      </main>

      {/* Right Panel - Context/Details */}
      {showRightPanel && right && (
        <aside
          className={cn(
            rightWidth,
            "flex-shrink-0 border-l overflow-y-auto",
            "border-gray-200 dark:border-[var(--border-light)]",
            "bg-white dark:bg-[var(--surface-primary)]"
          )}
        >
          {right}
        </aside>
      )}
    </div>
  );
}

ThreePanelLayout.displayName = 'ThreePanelLayout';
