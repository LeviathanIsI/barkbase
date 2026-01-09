/**
 * TableRowActions Component System
 * Consistent, accessible row actions for data tables
 *
 * Features:
 * - Primary action always visible, secondary actions on hover
 * - Overflow menu for 3+ actions
 * - Destructive action styling
 * - Keyboard accessible
 * - Tooltips for icon-only buttons
 * - Smooth transitions
 */

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

/**
 * Action button sizes for consistency
 */
const ACTION_SIZES = {
  sm: {
    button: 'h-7 px-2 text-xs gap-1',
    icon: 'h-3 w-3',
    iconOnly: 'h-7 w-7 p-0',
  },
  md: {
    button: 'h-8 px-2.5 text-sm gap-1.5',
    icon: 'h-3.5 w-3.5',
    iconOnly: 'h-8 w-8 p-0',
  },
};

/**
 * Individual action button - ghost style for tables
 */
export const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  size = 'sm',
  iconOnly = false,
  loading = false,
  disabled = false,
  tooltip,
  className,
  ...props
}) => {
  const sizeConfig = ACTION_SIZES[size] || ACTION_SIZES.sm;

  const variantStyles = {
    default: 'text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)]',
    primary: 'text-[color:var(--bb-color-accent)] hover:text-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-accent-soft)]',
    success: 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    warning: 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20',
    danger: 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20',
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && !loading) {
      onClick?.(e);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      title={tooltip || (iconOnly ? label : undefined)}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)] focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none',
        iconOnly ? sizeConfig.iconOnly : sizeConfig.button,
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(sizeConfig.icon, 'animate-spin')} />
      ) : Icon ? (
        <Icon className={sizeConfig.icon} />
      ) : null}
      {!iconOnly && !loading && <span>{label}</span>}
    </button>
  );
};

/**
 * Quick action button - optimized for single primary action (like "Done")
 */
export const QuickAction = ({
  icon: Icon = Check,
  label = 'Done',
  onClick,
  variant = 'success',
  size = 'sm',
  loading = false,
  disabled = false,
  pulse = false,
  className,
  ...props
}) => {
  const sizeConfig = ACTION_SIZES[size] || ACTION_SIZES.sm;

  const variantStyles = {
    success: {
      base: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-700',
      active: 'active:bg-emerald-200 dark:active:bg-emerald-900/40',
    },
    warning: {
      base: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700',
      active: 'active:bg-amber-200 dark:active:bg-amber-900/40',
    },
    primary: {
      base: 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)] border-[color:var(--bb-color-accent)]/20',
      hover: 'hover:bg-[color:var(--bb-color-accent)]/20 hover:border-[color:var(--bb-color-accent)]/30',
      active: 'active:bg-[color:var(--bb-color-accent)]/30',
    },
  };

  const styles = variantStyles[variant] || variantStyles.success;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && !loading) {
      onClick?.(e);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)] focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none',
        sizeConfig.button,
        styles.base,
        styles.hover,
        styles.active,
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(sizeConfig.icon, 'animate-spin')} />
      ) : (
        <Icon className={sizeConfig.icon} />
      )}
      <span>{label}</span>
    </button>
  );
};

/**
 * Overflow menu for additional actions
 */
export const ActionMenu = ({
  actions = [],
  size = 'sm',
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const sizeConfig = ACTION_SIZES[size] || ACTION_SIZES.sm;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleActionClick = (action, e) => {
    e.stopPropagation();
    setIsOpen(false);
    action.onClick?.(e);
  };

  if (!actions.length) return null;

  return (
    <div className={cn('relative', className)} {...props}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-all duration-150',
          'text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]',
          'hover:bg-[color:var(--bb-color-bg-elevated)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]',
          sizeConfig.iconOnly
        )}
        aria-label="More actions"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MoreHorizontal className={sizeConfig.icon} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            'absolute right-0 top-full mt-1 z-50 min-w-[160px] py-1 rounded-lg border shadow-lg',
            'bg-[color:var(--bb-color-bg-surface)] border-[color:var(--bb-color-border-subtle)]',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
          role="menu"
        >
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isDanger = action.variant === 'danger';

            return (
              <button
                key={index}
                type="button"
                onClick={(e) => handleActionClick(action, e)}
                disabled={action.disabled || action.loading}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                  'focus:outline-none focus:bg-[color:var(--bb-color-bg-elevated)]',
                  'disabled:opacity-50 disabled:pointer-events-none',
                  isDanger
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)]'
                )}
                role="menuitem"
              >
                {action.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : Icon ? (
                  <Icon className="h-4 w-4" />
                ) : null}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * TableRowActions - Main component for row actions
 *
 * @param {Object} props
 * @param {Object} props.primary - Primary action (always visible)
 * @param {Array} props.secondary - Secondary actions (visible on hover)
 * @param {Array} props.overflow - Actions for overflow menu
 * @param {boolean} props.alwaysVisible - Force all actions visible
 * @param {string} props.size - Action button size
 */
const TableRowActions = ({
  primary,
  secondary = [],
  overflow = [],
  alwaysVisible = false,
  size = 'sm',
  className,
  ...props
}) => {
  // Determine if we should use overflow menu
  const totalSecondary = secondary.length;
  const shouldUseOverflow = totalSecondary > 2 || overflow.length > 0;

  // If more than 2 secondary actions, put them all in overflow
  const visibleSecondary = shouldUseOverflow && totalSecondary > 2 ? [] : secondary;
  const overflowActions = shouldUseOverflow && totalSecondary > 2
    ? [...secondary, ...overflow]
    : overflow;

  return (
    <div
      className={cn(
        'flex items-center justify-end gap-0.5',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {/* Secondary actions - hidden until hover (unless alwaysVisible) */}
      {visibleSecondary.length > 0 && (
        <div className={cn(
          'flex items-center gap-0.5 transition-opacity duration-150',
          !alwaysVisible && 'opacity-0 group-hover:opacity-100'
        )}>
          {visibleSecondary.map((action, index) => (
            <ActionButton
              key={index}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size={size}
              iconOnly={action.iconOnly}
              loading={action.loading}
              disabled={action.disabled}
              tooltip={action.tooltip || action.label}
            />
          ))}
        </div>
      )}

      {/* Primary action - always visible */}
      {primary && (
        <ActionButton
          icon={primary.icon}
          label={primary.label}
          onClick={primary.onClick}
          variant={primary.variant || 'primary'}
          size={size}
          iconOnly={primary.iconOnly}
          loading={primary.loading}
          disabled={primary.disabled}
          tooltip={primary.tooltip || primary.label}
        />
      )}

      {/* Overflow menu */}
      {overflowActions.length > 0 && (
        <ActionMenu
          actions={overflowActions}
          size={size}
          className={cn(
            'transition-opacity duration-150',
            !alwaysVisible && 'opacity-0 group-hover:opacity-100'
          )}
        />
      )}
    </div>
  );
};

/**
 * Preset configurations for common patterns
 */
export const ActionPresets = {
  // CRUD actions for entities
  crud: (handlers, options = {}) => ({
    primary: options.hidePrimary ? null : {
      icon: options.primaryIcon || null,
      label: options.primaryLabel || 'Edit',
      onClick: handlers.onEdit,
      variant: 'default',
    },
    overflow: [
      { icon: null, label: 'Edit', onClick: handlers.onEdit },
      { icon: null, label: 'Duplicate', onClick: handlers.onDuplicate },
      { icon: null, label: 'Delete', onClick: handlers.onDelete, variant: 'danger' },
    ].filter(a => a.onClick),
  }),

  // Vaccination row actions
  vaccination: (handlers, options = {}) => ({
    primary: options.isArchived ? null : {
      icon: null,
      label: 'Renew',
      onClick: handlers.onRenew,
      variant: 'primary',
    },
    secondary: [
      { icon: null, label: 'Edit', onClick: handlers.onEdit, variant: 'default' },
    ],
    overflow: [
      { icon: null, label: 'View History', onClick: handlers.onViewHistory },
      { icon: null, label: 'Delete', onClick: handlers.onDelete, variant: 'danger' },
    ].filter(a => a.onClick),
  }),

  // Task actions with Done button
  task: (handlers, options = {}) => ({
    primary: options.isCompleted ? null : {
      icon: null,
      label: 'Done',
      onClick: handlers.onComplete,
      variant: 'success',
      loading: options.isCompleting,
    },
    secondary: [
      { icon: null, label: 'Edit', onClick: handlers.onEdit, variant: 'default', iconOnly: true },
    ],
    overflow: [
      { icon: null, label: 'Reassign', onClick: handlers.onReassign },
      { icon: null, label: 'Delete', onClick: handlers.onDelete, variant: 'danger' },
    ].filter(a => a.onClick),
  }),
};

export default TableRowActions;
