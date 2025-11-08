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
        'rounded-lg border border-gray-200 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary shadow-sm',
        className
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
    className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)}
    {...props}
  >
    {children}
  </div>
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-semibold leading-tight tracking-tight', className)}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600 dark:text-text-secondary', className)}
    {...props}
  >
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props}>
    {children}
  </div>
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
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
  <Card ref={ref} className={cn('p-6', className)} {...props}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-950/30">
            <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400 stroke-1.5" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-text-primary mt-0.5">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-text-secondary mt-0.5">{subtitle}</p>
          )}
          {change && (
            <p className={cn(
              'text-xs mt-1 font-medium',
              trend === 'up' && 'text-success-600',
              trend === 'down' && 'text-error-600',
              trend === 'neutral' && 'text-gray-500 dark:text-text-secondary'
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
    className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8', className)}
    {...props}
  >
    <div className="min-w-0 flex-1">
      {title && <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">{title}</h1>}
      {description && <p className="mt-1.5 text-sm text-gray-600 dark:text-text-secondary">{description}</p>}
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
