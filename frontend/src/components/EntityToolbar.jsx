import { SearchInput } from '@/components/ui/FilterBar';

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
  showSearchShortcut = true,
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between min-w-0">
      {/* Left: Filters, Views, etc. */}
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        {leftContent}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right: Search + Actions */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Enhanced Search Input */}
        {onSearchChange && (
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            showShortcut={showSearchShortcut}
            className={searchWidth}
          />
        )}

        {/* Right-side actions */}
        {rightContent}
      </div>
    </div>
  );
}

