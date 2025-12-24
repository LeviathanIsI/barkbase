/**
 * Enterprise Table System - Phase 8
 * Unified table primitives with token-based styling for consistent theming.
 * 
 * Usage:
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Column</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>Data</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table container - wraps the entire table
 */
const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-[var(--bb-font-size-sm,0.875rem)]', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

/**
 * Table header section
 */
const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('[&_tr]:border-b', className)}
    style={{
      borderColor: 'var(--bb-color-border-subtle)',
    }}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

/**
 * Table body section
 */
const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

/**
 * Table footer section
 */
const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t font-[var(--bb-font-weight-medium,500)]',
      className
    )}
    style={{
      borderColor: 'var(--bb-color-border-subtle)',
      backgroundColor: 'var(--bb-color-bg-elevated)',
      color: 'var(--bb-color-text-primary)',
    }}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

/**
 * Table row
 */
const TableRow = React.forwardRef(({ className, clickable = false, selected = false, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors',
      clickable && 'cursor-pointer',
      className
    )}
    style={{
      borderColor: 'var(--bb-color-border-subtle)',
      backgroundColor: selected
        ? 'var(--bb-color-sidebar-item-active-bg)'
        : 'transparent',
      '--hover-bg': 'var(--bb-color-sidebar-item-hover-bg)',
    }}
    onMouseEnter={(e) => {
      if (!selected) {
        e.currentTarget.style.backgroundColor = 'var(--bb-color-sidebar-item-hover-bg)';
      }
    }}
    onMouseLeave={(e) => {
      if (!selected) {
        e.currentTarget.style.backgroundColor = 'transparent';
      }
    }}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

/**
 * Table head cell (th)
 */
const TableHead = React.forwardRef(({ className, sortable = false, sorted = false, sortDirection = 'asc', ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-[var(--bb-space-4,1rem)] text-left align-middle text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide',
      sortable && 'cursor-pointer select-none',
      className
    )}
    style={{
      color: 'var(--bb-color-text-muted)',
      backgroundColor: 'var(--bb-color-bg-elevated)',
    }}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

/**
 * Table data cell (td)
 */
const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-[var(--bb-space-4,1rem)] py-[var(--bb-space-3,0.75rem)] align-middle min-h-[3rem]',
      className
    )}
    style={{
      color: 'var(--bb-color-text-primary)',
    }}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

/**
 * Table caption
 */
const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      'mt-[var(--bb-space-4,1rem)] text-[var(--bb-font-size-sm,0.875rem)]',
      className
    )}
    style={{
      color: 'var(--bb-color-text-muted)',
    }}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

/**
 * Table empty state - shown when no data
 */
const TableEmpty = React.forwardRef(({ 
  className, 
  icon: Icon, 
  message = 'No records found',
  colSpan = 1,
  ...props 
}, ref) => (
  <tr ref={ref} {...props}>
    <td colSpan={colSpan} className="px-[var(--bb-space-4,1rem)] py-[var(--bb-space-12,3rem)]">
      <div className={cn('flex flex-col items-center justify-center text-center', className)}>
        {Icon && (
          <Icon
            className="h-8 w-8 mb-[var(--bb-space-4,1rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          />
        )}
        <p
          className="text-[var(--bb-font-size-sm,0.875rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {message}
        </p>
      </div>
    </td>
  </tr>
));
TableEmpty.displayName = 'TableEmpty';

/**
 * Sticky table header wrapper for scrollable tables
 */
const StickyTableHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'sticky top-0 z-10 backdrop-blur-sm [&_tr]:border-b',
      className
    )}
    style={{
      backgroundColor: 'var(--bb-color-bg-elevated)',
      borderColor: 'var(--bb-color-border-subtle)',
    }}
    {...props}
  >
    {children}
  </thead>
));
StickyTableHeader.displayName = 'StickyTableHeader';

/**
 * Mobile table card - responsive fallback for small screens
 */
const MobileTableCard = React.forwardRef(({ 
  className, 
  primary,
  secondary,
  status,
  onClick,
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border p-[var(--bb-space-4,1rem)] transition-colors',
      onClick && 'cursor-pointer',
      className
    )}
    style={{
      borderColor: 'var(--bb-color-border-subtle)',
      backgroundColor: 'var(--bb-color-bg-surface)',
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = 'var(--bb-color-sidebar-item-hover-bg)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'var(--bb-color-bg-surface)';
    }}
    {...props}
  >
    <div className="flex items-center justify-between gap-[var(--bb-space-3,0.75rem)]">
      <div className="min-w-0 flex-1">
        {primary && (
          <p
            className="font-[var(--bb-font-weight-medium,500)] truncate"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {primary}
          </p>
        )}
        {secondary && (
          <p
            className="text-[var(--bb-font-size-sm,0.875rem)] truncate"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {secondary}
          </p>
        )}
      </div>
      {status && <div>{status}</div>}
    </div>
  </div>
));
MobileTableCard.displayName = 'MobileTableCard';

/**
 * Responsive table wrapper - shows table on desktop, cards on mobile
 */
const ResponsiveTable = React.forwardRef(({ 
  className,
  children,
  mobileCards,
  ...props 
}, ref) => (
  <div ref={ref} className={className} {...props}>
    {/* Desktop table */}
    <div className="hidden sm:block">
      {children}
    </div>
    {/* Mobile cards */}
    {mobileCards && (
      <div className="sm:hidden space-y-[var(--bb-space-2,0.5rem)]">
        {mobileCards}
      </div>
    )}
  </div>
));
ResponsiveTable.displayName = 'ResponsiveTable';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableEmpty,
  StickyTableHeader,
  MobileTableCard,
  ResponsiveTable,
};

