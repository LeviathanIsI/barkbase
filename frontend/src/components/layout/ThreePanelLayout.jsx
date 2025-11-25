import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Enterprise three-panel layout for detail pages
 * Uses BarkBase design tokens for consistent theming.
 *
 * Layout structure:
 * - Left Panel: Properties, filters, navigation (optional, collapsible)
 * - Center Panel: Main content (tabs, details)
 * - Right Panel: Context sidebar, quick actions (optional)
 *
 * @example
 * <ThreePanelLayout
 *   left={<PropertyPanel />}
 *   center={<TabContent />}
 *   right={<QuickActions />}
 * />
 */
export function ThreePanelLayout({
  left,
  center,
  right,
  leftWidth = 'w-80',      // 320px default
  rightWidth = 'w-80',     // 320px default
  showLeftPanel = true,
  showRightPanel = true,
  className,
  children  // Alternative to left/center/right props
}) {
  return (
    <div className={cn("flex h-full min-h-0", className)}>
      {/* Left Panel - Properties/Navigation */}
      {showLeftPanel && left && (
        <aside
          className={cn(
            leftWidth,
            "flex-shrink-0 border-r overflow-y-auto"
          )}
          style={{
            borderColor: 'var(--bb-color-border-subtle)',
            backgroundColor: 'var(--bb-color-bg-surface)',
          }}
        >
          {left}
        </aside>
      )}

      {/* Center Panel - Main Content (always visible) */}
      <main
        className="flex-1 min-w-0 overflow-y-auto"
        style={{
          backgroundColor: 'var(--bb-color-bg-body)',
        }}
      >
        {center || children}
      </main>

      {/* Right Panel - Context/Quick Actions */}
      {showRightPanel && right && (
        <aside
          className={cn(
            rightWidth,
            "flex-shrink-0 border-l overflow-y-auto"
          )}
          style={{
            borderColor: 'var(--bb-color-border-subtle)',
            backgroundColor: 'var(--bb-color-bg-surface)',
          }}
        >
          {right}
        </aside>
      )}
    </div>
  );
}

ThreePanelLayout.displayName = 'ThreePanelLayout';
