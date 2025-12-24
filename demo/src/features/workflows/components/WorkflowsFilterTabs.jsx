/**
 * WorkflowsFilterTabs - Filter tabs for the workflows dashboard
 * Shows All, Active, Paused, Draft tabs with counts
 */
import { cn } from '@/lib/cn';

const TABS = [
  { id: null, label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'draft', label: 'Draft' },
];

export default function WorkflowsFilterTabs({
  activeTab = null,
  onTabChange,
  counts = {},
}) {
  return (
    <div className="flex items-center gap-1 px-6 py-2 border-b border-[var(--bb-color-border-subtle)]">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = tab.id ? counts[tab.id] : counts.total;

        return (
          <button
            key={tab.id || 'all'}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium",
              "transition-colors duration-150",
              isActive
                ? "bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]"
                : "text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-surface)] hover:text-[var(--bb-color-text-primary)]"
            )}
          >
            {tab.label}
            {typeof count === 'number' && (
              <span className={cn(
                "ml-2 px-1.5 py-0.5 rounded text-xs",
                isActive
                  ? "bg-[var(--bb-color-accent)] text-white"
                  : "bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-tertiary)]"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
