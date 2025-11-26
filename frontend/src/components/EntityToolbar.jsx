import { Search } from 'lucide-react';

/**
 * EntityToolbar - Shared toolbar row for entity list pages
 * 
 * Replaces the duplicated "search + filters + actions" flex row.
 * Does NOT include the sticky wrapper, filter tags, or bulk actions.
 * 
 * @example
 * <EntityToolbar
 *   searchValue={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   searchPlaceholder="Search pets..."
 *   leftContent={<FiltersAndViews />}
 *   rightContent={<ActionButtons />}
 * />
 */
export default function EntityToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchWidth = 'w-full lg:w-72',
  leftContent,
  rightContent,
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Left: Filters, Views, etc. */}
      <div className="flex flex-wrap items-center gap-2">
        {leftContent}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Search + Actions */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        {onSearchChange && (
          <div className={`relative ${searchWidth}`}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--bb-color-text-muted)]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 rounded-lg border pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
              style={{
                backgroundColor: 'var(--bb-color-bg-body)',
                borderColor: 'var(--bb-color-border-subtle)',
                color: 'var(--bb-color-text-primary)',
              }}
            />
          </div>
        )}

        {/* Right-side actions */}
        {rightContent}
      </div>
    </div>
  );
}

