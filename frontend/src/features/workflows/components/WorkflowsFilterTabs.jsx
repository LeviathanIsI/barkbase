/**
 * WorkflowsFilterTabs - Filter tabs for the workflows dashboard
 * Shows All, Active, Paused, Draft tabs with counts
 */
import { cn } from '@/lib/cn';

const TABS = [
  { id: null, label: 'All', description: 'All workflows' },
  { id: 'active', label: 'Active', description: 'Running automations', color: '#10B981' },
  { id: 'paused', label: 'Paused', description: 'Temporarily stopped', color: '#EF4444' },
  { id: 'draft', label: 'Draft', description: 'Not yet published', color: '#6B7280' },
];

export default function WorkflowsFilterTabs({
  activeTab = null,
  onTabChange,
  counts = {},
  hasWorkflows = false,
}) {
  // Don't render tabs if there are no workflows
  if (!hasWorkflows) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-6 py-3 border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)]/50">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = tab.id ? counts[tab.id] : counts.total;
        const hasItems = count > 0;

        return (
          <button
            key={tab.id || 'all'}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative px-4 py-2 rounded-lg text-sm font-medium",
              "transition-all duration-150",
              isActive
                ? "bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)] shadow-sm"
                : "text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]"
            )}
          >
            <span className="flex items-center gap-2">
              {/* Status indicator dot for non-All tabs */}
              {tab.id && tab.color && (
                <span
                  className={cn(
                    "w-2 h-2 rounded-full transition-opacity",
                    !hasItems && "opacity-30"
                  )}
                  style={{ backgroundColor: tab.color }}
                />
              )}

              {tab.label}

              {/* Count badge */}
              {typeof count === 'number' && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-xs font-semibold min-w-[20px] text-center",
                  isActive
                    ? "bg-[var(--bb-color-accent)] text-white"
                    : hasItems
                      ? "bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-secondary)]"
                      : "bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-muted)]"
                )}>
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
