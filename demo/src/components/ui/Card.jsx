/**
 * Professional Card Component
 * Clean, minimal container for content grouping
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, children, title, description, icon: Icon, headerAction, ...props }, ref) => {
  const hasHeader = title || description || Icon || headerAction;
  // Determine if icon is a component (function) or already a rendered element
  const isIconComponent = typeof Icon === 'function' || (Icon && Icon.$$typeof === Symbol.for('react.forward_ref'));
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border p-[var(--bb-space-6,1.5rem)]',
        className,
      )}
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
        color: 'var(--bb-color-text-primary)',
      }}
      {...props}
    >
      {hasHeader && (
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  {isIconComponent ? <Icon className="h-5 w-5" /> : Icon}
                </div>
              )}
              <div>
                {title && <CardTitle>{title}</CardTitle>}
                {description && <CardDescription>{description}</CardDescription>}
              </div>
            </div>
            {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
          </div>
        </CardHeader>
      )}
      {hasHeader ? (
        <CardContent>{children}</CardContent>
      ) : (
        children
      )}
    </div>
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-1.5 pb-[var(--bb-space-4,1rem)]',
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-[var(--bb-font-size-lg,1.25rem)] font-[var(--bb-font-weight-semibold,600)] leading-[var(--bb-leading-tight,1.15)] tracking-tight text-[color:var(--bb-color-text-primary)]',
      className,
    )}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-[color:var(--bb-color-text-muted)] text-[var(--bb-font-size-sm,0.875rem)] leading-[var(--bb-leading-normal,1.35)]',
      className,
    )}
    {...props}
  >
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn(className)} {...props}>
    {children}
  </div>
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center border-t pt-[var(--bb-space-4,1rem)]',
      className,
    )}
    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    {...props}
  >
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';

/**
 * MetricCard Component
 * Display key metrics with icon, value, and optional change indicator
 * Fully token-driven for light/dark theme consistency
 */
const MetricCard = React.forwardRef(({ 
  icon: Icon, 
  title, 
  value, 
  subtitle,
  change, 
  trend = 'neutral',
  iconBg,
  iconColor,
  className,
  ...props 
}, ref) => (
  <Card ref={ref} className={cn('', className)} {...props}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
        {Icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: iconBg || 'var(--bb-color-accent-soft)',
            }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: iconColor || 'var(--bb-color-accent)' }}
            />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[color:var(--bb-color-text-muted)] text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-0.5 text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-[color:var(--bb-color-text-muted)] text-[var(--bb-font-size-xs,0.75rem)] leading-[var(--bb-leading-normal,1.35)]">
              {subtitle}
            </p>
          )}
          {change && (
            <p
              className="mt-1 text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{
                color:
                  trend === 'up'
                    ? 'var(--bb-color-status-positive)'
                    : trend === 'down'
                    ? 'var(--bb-color-status-negative)'
                    : 'var(--bb-color-text-muted)',
              }}
            >
              {change}
            </p>
          )}
        </div>
      </div>
    </div>
  </Card>
));
MetricCard.displayName = 'MetricCard';

/**
 * PageHeader Component
 * Consistent page header with breadcrumbs, title, description, and actions
 * Fully token-driven for light/dark theme consistency
 */
const PageHeader = React.forwardRef(({ 
  title, 
  description, 
  actions,
  breadcrumbs,
  className,
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'mb-[var(--bb-space-6)] space-y-[var(--bb-space-2)]',
      className,
    )}
    {...props}
  >
    {/* Breadcrumbs */}
    {breadcrumbs && breadcrumbs.length > 0 && (
      <nav aria-label="Breadcrumb" className="flex items-center">
        <ol className="flex items-center gap-[var(--bb-space-1)] flex-wrap">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const isFirst = index === 0;
            
            return (
              <React.Fragment key={item.href || item.label}>
                <li 
                  className={cn(
                    'flex items-center',
                    !isFirst && !isLast && 'hidden sm:flex'
                  )}
                >
                  <span
                    className={cn(
                      "text-xs max-w-[200px] truncate",
                      isLast
                        ? "font-medium text-[color:var(--bb-color-text-primary)]"
                        : "text-[color:var(--bb-color-text-muted)]"
                    )}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                </li>
                {!isLast && (
                  <li 
                    className={cn(
                      'flex items-center text-[var(--bb-color-text-muted)]',
                      index > 0 && index < breadcrumbs.length - 2 && 'hidden sm:flex'
                    )}
                    aria-hidden="true"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </li>
                )}
                {isFirst && breadcrumbs.length > 2 && (
                  <li className="flex items-center sm:hidden text-[color:var(--bb-color-text-muted)]">
                    <span className="text-xs px-1">...</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </li>
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    )}

    {/* Title and Actions Row */}
    <div className="flex flex-col gap-[var(--bb-space-4)] sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        {title && (
          <h1 className="text-[var(--bb-font-size-xl)] font-[var(--bb-font-weight-semibold)] leading-[var(--bb-leading-tight,1.15)] text-[var(--bb-color-text-primary)]">
            {title}
          </h1>
        )}
        {description && (
          <p className="mt-[var(--bb-space-1)] text-[var(--bb-color-text-muted)] text-[var(--bb-font-size-sm)] leading-[var(--bb-leading-normal,1.35)]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-[var(--bb-space-3)] flex-wrap">
          {actions}
        </div>
      )}
    </div>
  </div>
));
PageHeader.displayName = 'PageHeader';

export default Card;
export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  MetricCard,
  PageHeader
};
