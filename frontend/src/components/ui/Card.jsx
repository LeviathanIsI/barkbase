/**
 * Professional Card Component
 * Clean, minimal container for content grouping
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, children, title, description, ...props }, ref) => {
  const hasTitle = title || description;
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
      {hasTitle && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      {hasTitle ? (
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
 * Consistent page header with title, description, and actions
 * Fully token-driven for light/dark theme consistency
 */
const PageHeader = React.forwardRef(({ 
  title, 
  description, 
  actions,
  className,
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'mb-[var(--bb-space-6,1.5rem)] flex flex-col gap-[var(--bb-space-4,1rem)] sm:flex-row sm:items-center sm:justify-between',
      className,
    )}
    {...props}
  >
    <div className="min-w-0 flex-1">
      {title && (
        <h1 className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] leading-[var(--bb-leading-tight,1.15)] text-[color:var(--bb-color-text-primary)]">
          {title}
        </h1>
      )}
      {description && (
        <p className="mt-1 text-[color:var(--bb-color-text-muted)] text-[var(--bb-font-size-sm,0.875rem)] leading-[var(--bb-leading-normal,1.35)]">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-[var(--bb-space-3,0.75rem)] flex-wrap">{actions}</div>}
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
