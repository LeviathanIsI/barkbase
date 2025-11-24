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
        'rounded-lg border p-6 border-[color:var(--bb-color-border-subtle,#e4e4e7)] bg-[color:var(--bb-color-bg-surface,#ffffff)] text-[color:var(--bb-color-text-primary,#0f172a)] dark:border-dark-border dark:bg-dark-bg-secondary dark:text-dark-text-primary',
        className,
      )}
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
      'flex flex-col space-y-1.5 p-[var(--bb-space-6,1.5rem)] pb-[var(--bb-space-4,1rem)]',
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
      'text-[var(--bb-font-size-lg,1.25rem)] font-[var(--bb-font-weight-semibold,600)] leading-[var(--bb-leading-tight,1.15)] tracking-tight',
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
      'text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-sm,1rem)] font-[var(--bb-font-weight-regular,400)] leading-[var(--bb-leading-normal,1.35)] dark:text-dark-text-secondary',
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
      'flex items-center border-t border-[color:var(--bb-color-border-subtle,#e4e4e7)] pt-[var(--bb-space-4,1rem)] dark:border-dark-border',
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';

/**
 * MetricCard Component
 * Display key metrics with icon, value, and optional change indicator
 * Professional color system only (no gradients)
 */
const MetricCard = React.forwardRef(({ 
  icon: Icon, 
  title, 
  value, 
  subtitle,
  change, 
  trend = 'neutral',
  className,
  ...props 
}, ref) => (
  <Card ref={ref} className={cn('p-[var(--bb-space-6,1.5rem)]', className)} {...props}>
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-[var(--color-primary-light)]">
            <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400 stroke-1.5" />
          </div>
        )}
          <div>
            <p className="text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-sm,1rem)] font-[var(--bb-font-weight-medium,500)] dark:text-dark-text-secondary">
              {title}
            </p>
            <p className="mt-0.5 text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary,#0f172a)] dark:text-dark-text-primary leading-[var(--bb-leading-tight,1.15)]">
              {value}
            </p>
          {subtitle && (
              <p className="mt-0.5 text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-xs,0.875rem)] leading-[var(--bb-leading-normal,1.35)] dark:text-dark-text-secondary">
                {subtitle}
              </p>
          )}
          {change && (
            <p className={cn(
              'mt-1 text-[var(--bb-font-size-xs,0.875rem)] font-[var(--bb-font-weight-medium,500)]',
              trend === 'up' && 'text-success-600',
              trend === 'down' && 'text-error-600',
              trend === 'neutral' && 'text-[color:var(--bb-color-text-muted,#52525b)] dark:text-dark-text-secondary'
            )}>
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
        <h1 className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] leading-[var(--bb-leading-tight,1.15)] text-[color:var(--bb-color-text-primary,#0f172a)] dark:text-dark-text-primary">
          {title}
        </h1>
      )}
      {description && (
        <p className="mt-1.5 text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-sm,1rem)] leading-[var(--bb-leading-normal,1.35)] dark:text-dark-text-secondary">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
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
