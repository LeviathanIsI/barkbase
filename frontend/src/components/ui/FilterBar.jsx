/**
 * FilterBar Component System
 * Consistent, accessible filter and search controls for list pages
 *
 * Features:
 * - Enhanced search input with clear button and keyboard shortcuts
 * - View switcher as segmented control
 * - Active filter chips with individual removal
 * - Grouped action buttons with tooltips
 * - Responsive behavior
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, X, ChevronDown, Check, SlidersHorizontal,
  LayoutGrid, List, Columns, Download, RefreshCw, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

// =============================================================================
// SEARCH INPUT
// =============================================================================

/**
 * Enhanced search input with icon, clear button, and focus glow
 */
export const SearchInput = ({
  value = '',
  onChange,
  placeholder = 'Search...',
  className,
  shortcutHint = '/',
  showShortcut = true,
  autoFocus = false,
  size = 'default',
  ...props
}) => {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Focus on "/" key when not in an input
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Clear on Escape when focused
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onChange?.('');
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  const sizeStyles = {
    sm: 'h-9 text-sm pl-9 pr-8',
    default: 'h-11 text-sm pl-10 pr-10',
    lg: 'h-12 text-base pl-11 pr-11',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={cn('relative group', className)}>
      {/* Search Icon */}
      <Search
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-150',
          iconSizes[size],
          isFocused
            ? 'text-[color:var(--bb-color-accent)]'
            : 'text-[color:var(--bb-color-text-muted)]'
        )}
      />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full rounded-lg border transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)] focus:ring-offset-1',
          'focus:border-[var(--bb-color-accent)]',
          'placeholder:text-[color:var(--bb-color-text-muted)]',
          sizeStyles[size]
        )}
        style={{
          backgroundColor: 'var(--bb-color-bg-body)',
          borderColor: isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
          color: 'var(--bb-color-text-primary)',
        }}
        {...props}
      />

      {/* Clear Button (when has value) */}
      {value && (
        <button
          type="button"
          onClick={() => onChange?.('')}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors',
            'text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]',
            'hover:bg-[color:var(--bb-color-bg-elevated)]'
          )}
          title="Clear search"
        >
          <X className={iconSizes[size]} />
        </button>
      )}

      {/* Keyboard Shortcut Hint (when empty and not focused) */}
      {!value && !isFocused && showShortcut && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] border-[color:var(--bb-color-border-subtle)]">
            {shortcutHint}
          </kbd>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// VIEW SWITCHER (Segmented Control)
// =============================================================================

/**
 * Segmented control for switching between views
 */
export const ViewSwitcher = ({
  views = [],
  activeView,
  onChange,
  size = 'default',
  showCounts = false,
  className,
}) => {
  const sizeStyles = {
    sm: 'h-8 text-xs gap-0.5 p-0.5',
    default: 'h-10 text-sm gap-1 p-1',
    lg: 'h-11 text-sm gap-1 p-1',
  };

  const buttonSizes = {
    sm: 'px-2.5 py-1',
    default: 'px-3 py-1.5',
    lg: 'px-4 py-2',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border',
        'bg-[color:var(--bb-color-bg-elevated)] border-[color:var(--bb-color-border-subtle)]',
        sizeStyles[size],
        className
      )}
      role="tablist"
    >
      {views.map((view) => {
        const isActive = activeView === view.id;
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(view.id)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]',
              buttonSizes[size],
              isActive
                ? 'bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)] shadow-sm'
                : 'text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
            )}
          >
            {view.icon && <view.icon className="h-3.5 w-3.5" />}
            <span>{view.label}</span>
            {showCounts && view.count !== undefined && (
              <span
                className={cn(
                  'ml-0.5 min-w-[1.25rem] px-1 py-0.5 text-[10px] font-semibold rounded-full',
                  isActive
                    ? 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]'
                    : 'bg-[color:var(--bb-color-bg-body)] text-[color:var(--bb-color-text-muted)]'
                )}
              >
                {view.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// =============================================================================
// FILTER CHIP
// =============================================================================

/**
 * Individual filter chip with label and remove button
 */
export const FilterChip = ({
  label,
  value,
  onRemove,
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: {
      bg: 'bg-[color:var(--bb-color-accent-soft)]',
      text: 'text-[color:var(--bb-color-accent)]',
      hover: 'hover:bg-[color:var(--bb-color-accent)]/20',
    },
    neutral: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      hover: 'hover:bg-slate-200 dark:hover:bg-slate-700',
    },
    success: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/50',
    },
    warning: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      hover: 'hover:bg-amber-200 dark:hover:bg-amber-900/50',
    },
    danger: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      hover: 'hover:bg-red-200 dark:hover:bg-red-900/50',
    },
  };

  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        styles.bg,
        styles.text,
        className
      )}
    >
      {label && (
        <span className="opacity-70">{label}:</span>
      )}
      <span className="font-semibold">{value}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'ml-0.5 p-0.5 rounded-full transition-colors',
            styles.hover
          )}
          title={`Remove ${label || value} filter`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

// =============================================================================
// ACTIVE FILTERS BAR
// =============================================================================

/**
 * Bar showing all active filters with clear all option
 */
export const ActiveFiltersBar = ({
  filters = [],
  onRemoveFilter,
  onClearAll,
  className,
}) => {
  if (!filters.length) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 py-2',
        className
      )}
    >
      <span className="text-xs font-medium text-[color:var(--bb-color-text-muted)]">
        Active filters:
      </span>
      {filters.map((filter, index) => (
        <FilterChip
          key={filter.id || index}
          label={filter.label}
          value={filter.value}
          variant={filter.variant}
          onRemove={() => onRemoveFilter?.(filter)}
        />
      ))}
      {filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-1 text-xs font-medium text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] underline underline-offset-2 transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

// =============================================================================
// FILTER BUTTON
// =============================================================================

/**
 * Filter button with optional count badge
 */
export const FilterButton = ({
  onClick,
  isOpen = false,
  activeCount = 0,
  label = 'Filters',
  className,
}) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        'gap-2 h-10',
        isOpen && 'ring-2 ring-[var(--bb-color-accent)] ring-offset-1',
        className
      )}
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span>{label}</span>
      {activeCount > 0 && (
        <span className="min-w-[1.25rem] h-5 px-1.5 text-[11px] font-semibold rounded-full bg-[color:var(--bb-color-accent)] text-white flex items-center justify-center">
          {activeCount}
        </span>
      )}
      <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
    </Button>
  );
};

// =============================================================================
// ACTION GROUP
// =============================================================================

/**
 * Group of icon action buttons
 */
export const ActionGroup = ({
  actions = [],
  size = 'default',
  className,
}) => {
  const buttonSizes = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-11 w-11',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            title={action.tooltip || action.label}
            className={cn(
              'inline-flex items-center justify-center rounded-lg border transition-all duration-150',
              'bg-[color:var(--bb-color-bg-surface)] border-[color:var(--bb-color-border-subtle)]',
              'text-[color:var(--bb-color-text-muted)]',
              'hover:bg-[color:var(--bb-color-bg-elevated)] hover:text-[color:var(--bb-color-text-primary)]',
              'hover:border-[color:var(--bb-color-border)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]',
              'disabled:opacity-50 disabled:pointer-events-none',
              buttonSizes[size],
              action.active && 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)] border-[color:var(--bb-color-accent)]/30'
            )}
          >
            {action.loading ? (
              <RefreshCw className={cn(iconSizes[size], 'animate-spin')} />
            ) : Icon ? (
              <Icon className={iconSizes[size]} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

// =============================================================================
// FILTER BAR CONTAINER
// =============================================================================

/**
 * Main filter bar container with visual grouping
 */
export const FilterBar = ({
  children,
  sticky = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'border-b bg-[color:var(--bb-color-bg-surface)]',
        'border-[color:var(--bb-color-border-subtle)]',
        sticky && 'sticky top-0 z-20',
        className
      )}
    >
      <div className="px-4 lg:px-6 py-3">
        {children}
      </div>
    </div>
  );
};

/**
 * Filter bar section for grouping related controls
 */
export const FilterBarSection = ({
  children,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      {children}
    </div>
  );
};

/**
 * Filter bar row for horizontal layout
 */
export const FilterBarRow = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between min-w-0',
        className
      )}
    >
      {children}
    </div>
  );
};

// =============================================================================
// SORT DROPDOWN
// =============================================================================

/**
 * Sort dropdown with consistent styling
 */
export const SortDropdown = ({
  options = [],
  value,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'gap-2 h-10 min-w-[140px] justify-between',
          isOpen && 'ring-2 ring-[var(--bb-color-accent)] ring-offset-1'
        )}
      >
        <span className="text-[color:var(--bb-color-text-muted)]">Sort:</span>
        <span className="font-medium">{selectedOption?.label || 'Select'}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform ml-auto', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full mt-1 z-50 min-w-[180px] py-1 rounded-lg border shadow-lg',
            'bg-[color:var(--bb-color-bg-surface)] border-[color:var(--bb-color-border-subtle)]',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
        >
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange?.(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                  'focus:outline-none focus:bg-[color:var(--bb-color-bg-elevated)]',
                  isSelected
                    ? 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]'
                    : 'text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)]'
                )}
              >
                <span className={cn('w-4', !isSelected && 'invisible')}>
                  {isSelected && <Check className="h-4 w-4" />}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// VIEWS DROPDOWN
// =============================================================================

/**
 * Saved views dropdown with consistent styling
 */
export const ViewsDropdown = ({
  views = [],
  activeView,
  onChange,
  onManageViews,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedView = views.find((v) => v.id === activeView);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'gap-2 h-10',
          isOpen && 'ring-2 ring-[var(--bb-color-accent)] ring-offset-1'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span>{selectedView?.name || 'All'}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full mt-1 z-50 min-w-[200px] py-1 rounded-lg border shadow-lg',
            'bg-[color:var(--bb-color-bg-surface)] border-[color:var(--bb-color-border-subtle)]',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
        >
          {views.map((view) => {
            const isSelected = activeView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => {
                  onChange?.(view.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                  'focus:outline-none focus:bg-[color:var(--bb-color-bg-elevated)]',
                  isSelected
                    ? 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]'
                    : 'text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)]'
                )}
              >
                <span className={cn('w-4', !isSelected && 'invisible')}>
                  {isSelected && <Check className="h-4 w-4" />}
                </span>
                <span>{view.name}</span>
                {view.count !== undefined && (
                  <span className="ml-auto text-xs text-[color:var(--bb-color-text-muted)]">
                    {view.count}
                  </span>
                )}
              </button>
            );
          })}
          {onManageViews && (
            <>
              <div className="my-1 border-t border-[color:var(--bb-color-border-subtle)]" />
              <button
                type="button"
                onClick={() => {
                  onManageViews();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Manage Views</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Default export for convenience
export default {
  SearchInput,
  ViewSwitcher,
  FilterChip,
  ActiveFiltersBar,
  FilterButton,
  ActionGroup,
  FilterBar,
  FilterBarSection,
  FilterBarRow,
  SortDropdown,
  ViewsDropdown,
};
