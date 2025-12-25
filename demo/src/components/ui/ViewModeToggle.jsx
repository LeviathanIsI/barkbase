import React from 'react';
import { Table, LayoutGrid, SplitSquareVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * enterprise view mode toggle
 * Allows switching between table, board, and split views
 *
 * @param {string} mode - Current mode ('table' | 'board' | 'split')
 * @param {function} onChange - Callback when mode changes
 * @param {Array<string>} availableModes - Which modes to show (default: all)
 *
 * @example
 * <ViewModeToggle
 *   mode={viewMode}
 *   onChange={setViewMode}
 *   availableModes={['table', 'board', 'split']}
 * />
 */
export function ViewModeToggle({
  mode,
  onChange,
  availableModes = ['table', 'board', 'split'],
  className
}) {
  const allModes = [
    { value: 'table', icon: Table, label: 'Table', description: 'Spreadsheet view' },
    { value: 'board', icon: LayoutGrid, label: 'Board', description: 'Pipeline view' },
    { value: 'split', icon: SplitSquareVertical, label: 'Split', description: 'List + details' },
  ];

  const modes = allModes.filter(m => availableModes.includes(m.value));

  return (
    <div className={cn(
      "inline-flex items-center rounded-lg border p-1",
      "border-gray-200 dark:border-[var(--border-light)]",
      "bg-white dark:bg-[var(--surface-primary)]",
      className
    )}>
      {modes.map(({ value, icon: Icon, label, description }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          title={description}
          className={cn(
            "px-3 py-2 rounded-md text-sm font-medium transition-colors",
            "flex items-center gap-2",
            mode === value
              ? "bg-primary-600 text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-secondary)]"
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

ViewModeToggle.displayName = 'ViewModeToggle';
