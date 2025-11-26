import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * EntityListLayout - Shared layout wrapper for entity list pages
 * 
 * Provides consistent structure for Pets, Owners, Staff, Bookings, etc.
 * Each page retains its own domain logic, columns, and data handling.
 * 
 * @example
 * <EntityListLayout
 *   title="Pets Directory"
 *   subtitle="Manage all registered pets and their records"
 *   stats={<StatBadges />}
 *   searchValue={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   searchPlaceholder="Search pets..."
 *   toolbarLeft={<FiltersAndViews />}
 *   toolbarRight={<ColumnControls />}
 *   pagination={<PaginationControls />}
 *   isLoading={isLoading}
 *   hasLoaded={hasLoaded}
 * >
 *   <DataTable ... />
 * </EntityListLayout>
 */
export default function EntityListLayout({
  // Header
  title,
  subtitle,
  stats,
  headerActions,
  
  // Search
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchWidth = 'w-full lg:w-72',
  
  // Toolbar slots
  toolbarLeft,
  toolbarRight,
  
  // Content
  children,
  
  // Pagination
  pagination,
  
  // Loading states
  isLoading = false,
  hasLoaded = true,
  
  // Custom class names
  className,
  contentClassName,
}) {
  return (
    <div
      className={cn(
        'flex flex-col flex-grow w-full min-h-[calc(100vh-180px)] transition-opacity duration-200',
        hasLoaded ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {/* Header Section */}
      <div
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[color:var(--bb-color-text-muted)]">
              {subtitle}
            </p>
          )}
        </div>

        {/* Stats + Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {stats}
          {headerActions}
        </div>
      </div>

      {/* Sticky Toolbar */}
      <div
        className="sticky top-0 z-20 py-3 border-b shadow-sm mt-0"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Filters, Views, etc. */}
          <div className="flex flex-wrap items-center gap-2">
            {toolbarLeft}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Search + Actions */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            {onSearchChange && (
              <div className={cn('relative', searchWidth)}>
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

            {/* Right-side actions (columns, export, etc.) */}
            {toolbarRight}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn('flex-1 mt-4', contentClassName)}>
        {children}
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div
          className="sticky bottom-0 py-3 border-t mt-4"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          {pagination}
        </div>
      )}
    </div>
  );
}

/**
 * StatBadge - Reusable stat pill for header area
 */
export function StatBadge({ icon: Icon, value, label, variant = 'default' }) {
  const variantStyles = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    danger: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
        variantStyles[variant] || variantStyles.default
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span className="font-semibold">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}

/**
 * ResultsCount - Shows filtered results count with optional updating indicator
 */
export function ResultsCount({ count, singular, plural, isFiltered = false, isUpdating = false }) {
  const label = count === 1 ? (singular || 'item') : (plural || 'items');
  
  return (
    <span className="text-sm text-[color:var(--bb-color-text-muted)]">
      {count} {label}
      {isFiltered && ' filtered'}
      {isUpdating && (
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-[color:var(--bb-color-accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--bb-color-accent)] animate-pulse" />
          Updating...
        </span>
      )}
    </span>
  );
}

/**
 * ClearFiltersButton - Button to clear all active filters
 */
export function ClearFiltersButton({ onClick, show = true }) {
  if (!show) return null;
  
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-[color:var(--bb-color-accent)] hover:underline"
    >
      <span className="text-xs">✕</span>
      Clear all
    </button>
  );
}

