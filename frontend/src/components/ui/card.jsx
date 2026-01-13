/**
 * Standardized Card Component System
 *
 * Provides consistent card styling across the application with:
 * - Three variants: elevated, outlined, filled
 * - Consistent border-radius (12px for cards, 8px for inner elements)
 * - Consistent padding scale (16px, 20px, 24px based on size)
 * - Surface hierarchy support
 * - Interactive states for clickable cards
 * - Card sections with dividers
 * - Empty state component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';

// ============================================
// CARD VARIANTS - Using CVA for consistency
// ============================================

const cardVariants = cva(
  // Base styles - consistent across all variants
  'relative overflow-hidden transition-all duration-200',
  {
    variants: {
      variant: {
        // Elevated - subtle shadow, no visible border
        elevated: 'shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
        // Outlined - visible border, no shadow
        outlined: 'border',
        // Filled - solid background, subtle border
        filled: 'border',
        // Ghost - minimal styling, used for grouping
        ghost: '',
        // Glass - AGGRESSIVE premium glassmorphism effect
        glass: [
          'border',
          'backdrop-blur-[20px]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.12),_inset_0_0_0_1px_rgba(255,255,255,0.1)]',
          'hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),_inset_0_0_0_1px_rgba(255,255,255,0.15)]',
        ],
        // Feature - premium feature card with enhanced styling
        feature: 'border shadow-sm hover:shadow-lg hover:-translate-y-0.5',
      },
      size: {
        sm: 'rounded-[var(--radius-md,0.5rem)] p-[var(--bb-space-4,1rem)]',
        md: 'rounded-[var(--radius-lg,0.75rem)] p-[var(--bb-space-5,1.25rem)]',
        lg: 'rounded-[var(--radius-lg,0.75rem)] p-[var(--bb-space-6,1.5rem)]',
      },
      interactive: {
        true: 'cursor-pointer',
        false: '',
      },
    },
    compoundVariants: [
      // Interactive elevated cards
      {
        variant: 'elevated',
        interactive: true,
        className: 'hover:shadow-[var(--shadow-lg)] active:shadow-[var(--shadow-sm)]',
      },
      // Interactive outlined cards
      {
        variant: 'outlined',
        interactive: true,
        className: 'hover:border-[var(--bb-color-accent)] hover:shadow-[0_0_0_1px_var(--bb-color-accent)]',
      },
    ],
    defaultVariants: {
      variant: 'outlined',
      size: 'md',
      interactive: false,
    },
  }
);

// ============================================
// MAIN CARD COMPONENT
// ============================================

const Card = React.forwardRef(({
  className,
  children,
  variant = 'outlined',
  size = 'md',
  interactive = false,
  noPadding = false,
  as: Component = 'div',
  onClick,
  // Legacy props for backward compatibility
  title,
  description,
  icon: Icon,
  headerAction,
  ...props
}, ref) => {
  const isClickable = interactive || !!onClick;
  const hasLegacyHeader = title || description || Icon || headerAction;
  const isIconComponent = typeof Icon === 'function' || (Icon && Icon.$$typeof === Symbol.for('react.forward_ref'));

  return (
    <Component
      ref={ref}
      className={cn(
        cardVariants({ variant, size, interactive: isClickable }),
        noPadding && '!p-0',
        className,
      )}
      style={{
        backgroundColor: variant === 'ghost'
          ? 'transparent'
          : variant === 'glass'
          ? 'var(--bb-glass-bg)'
          : 'var(--bb-color-bg-surface)',
        borderColor: variant === 'ghost'
          ? 'transparent'
          : variant === 'glass'
          ? 'var(--bb-glass-border)'
          : 'var(--bb-color-border-subtle)',
        color: 'var(--bb-color-text-primary)',
      }}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      } : undefined}
      {...props}
    >
      {/* Legacy header support for backward compatibility */}
      {hasLegacyHeader && (
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: 'var(--bb-color-accent-soft)',
                  }}
                >
                  {isIconComponent ? (
                    <Icon className="h-5 w-5" style={{ color: 'var(--bb-color-accent)' }} />
                  ) : (
                    Icon
                  )}
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
      {hasLegacyHeader ? (
        <CardContent>{children}</CardContent>
      ) : (
        children
      )}
    </Component>
  );
});
Card.displayName = 'Card';

// ============================================
// CARD HEADER
// ============================================

const CardHeader = React.forwardRef(({
  className,
  children,
  icon: Icon,
  title,
  description,
  badge,
  actions,
  divider = false,
  ...props
}, ref) => {
  // If using structured props
  if (title || Icon || badge || actions) {
    const isIconComponent = typeof Icon === 'function' || (Icon && Icon.$$typeof === Symbol.for('react.forward_ref'));

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start justify-between gap-4',
          divider && 'pb-[var(--bb-space-4,1rem)] mb-[var(--bb-space-4,1rem)] border-b',
          !divider && 'pb-[var(--bb-space-4,1rem)]',
          className,
        )}
        style={divider ? { borderColor: 'var(--bb-color-border-subtle)' } : undefined}
        {...props}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {Icon && (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: 'var(--bb-color-accent-soft)',
              }}
            >
              {isIconComponent ? (
                <Icon className="h-5 w-5" style={{ color: 'var(--bb-color-accent)' }} />
              ) : (
                Icon
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {title && (
                <h3 className="text-[var(--bb-font-size-lg,1.125rem)] font-semibold leading-tight text-[color:var(--bb-color-text-primary)] truncate">
                  {title}
                </h3>
              )}
              {badge}
            </div>
            {description && (
              <p className="mt-0.5 text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)] leading-normal">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    );
  }

  // Simple children passthrough
  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-1.5',
        divider && 'pb-[var(--bb-space-4,1rem)] mb-[var(--bb-space-4,1rem)] border-b',
        !divider && 'pb-[var(--bb-space-4,1rem)]',
        className,
      )}
      style={divider ? { borderColor: 'var(--bb-color-border-subtle)' } : undefined}
      {...props}
    >
      {children}
    </div>
  );
});
CardHeader.displayName = 'CardHeader';

// ============================================
// CARD TITLE
// ============================================

const CardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-[var(--bb-heading-section-size)] font-[var(--bb-heading-section-weight)]',
      'leading-[var(--bb-heading-section-leading)] tracking-[var(--bb-heading-section-tracking)]',
      'text-[color:var(--bb-color-text-primary)]',
      className,
    )}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

// ============================================
// CARD DESCRIPTION
// ============================================

const CardDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-[var(--bb-body-size)] font-[var(--bb-body-weight)]',
      'leading-[var(--bb-body-leading)]',
      'text-[color:var(--bb-color-text-muted)]',
      className,
    )}
    {...props}
  >
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

// ============================================
// CARD CONTENT
// ============================================

const CardContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn(className)} {...props}>
    {children}
  </div>
));
CardContent.displayName = 'CardContent';

// ============================================
// CARD SECTION - For multiple sections with dividers
// ============================================

const CardSection = React.forwardRef(({
  className,
  children,
  title,
  description,
  actions,
  noPadding = false,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'border-t first:border-t-0',
      !noPadding && 'py-[var(--bb-space-4,1rem)]',
      className,
    )}
    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    {...props}
  >
    {(title || actions) && (
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          {title && (
            <h4 className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </div>
));
CardSection.displayName = 'CardSection';

// ============================================
// CARD FOOTER
// ============================================

const CardFooter = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center border-t pt-[var(--bb-space-4,1rem)] mt-[var(--bb-space-4,1rem)]',
      className,
    )}
    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    {...props}
  >
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';

// ============================================
// CARD EMPTY STATE
// ============================================

const CardEmptyState = React.forwardRef(({
  className,
  icon: Icon,
  title,
  description,
  action,
  ...props
}, ref) => {
  const isIconComponent = typeof Icon === 'function' || (Icon && Icon.$$typeof === Symbol.for('react.forward_ref'));

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center py-8 px-4 text-center',
        className,
      )}
      {...props}
    >
      {Icon && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
          style={{
            backgroundColor: 'var(--bb-color-bg-elevated)',
          }}
        >
          {isIconComponent ? (
            <Icon className="h-6 w-6" style={{ color: 'var(--bb-color-text-muted)' }} />
          ) : (
            Icon
          )}
        </div>
      )}
      {title && (
        <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1">
          {title}
        </p>
      )}
      {description && (
        <p className="text-sm text-[color:var(--bb-color-text-muted)] max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
});
CardEmptyState.displayName = 'CardEmptyState';

// ============================================
// STAT CARD - For dashboard statistics
// ============================================

const statCardVariants = cva(
  'relative overflow-hidden transition-all duration-200 rounded-[var(--radius-lg,0.75rem)] border',
  {
    variants: {
      variant: {
        default: '',
        success: '',
        warning: '',
        danger: '',
        info: '',
        accent: '',
      },
      size: {
        sm: 'p-[var(--bb-space-4,1rem)]',
        md: 'p-[var(--bb-space-5,1.25rem)]',
        lg: 'p-[var(--bb-space-6,1.5rem)]',
      },
      interactive: {
        true: 'cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      interactive: false,
    },
  }
);

const StatCard = React.forwardRef(({
  className,
  icon: Icon,
  title,
  value,
  subtitle,
  change,
  trend = 'neutral',
  variant = 'default',
  size = 'md',
  interactive = false,
  onClick,
  ...props
}, ref) => {
  const isClickable = interactive || !!onClick;
  const isIconComponent = typeof Icon === 'function' || (Icon && Icon.$$typeof === Symbol.for('react.forward_ref'));

  // Variant-specific styling
  const variantStyles = {
    default: {
      bg: 'var(--bb-color-bg-surface)',
      border: 'var(--bb-color-border-subtle)',
      iconBg: 'var(--bb-color-bg-elevated)',
      iconColor: 'var(--bb-color-text-muted)',
    },
    success: {
      bg: 'var(--bb-color-bg-surface)',
      border: 'var(--bb-color-status-positive)',
      iconBg: 'var(--bb-color-status-positive-soft)',
      iconColor: 'var(--bb-color-status-positive)',
    },
    warning: {
      bg: 'var(--bb-color-bg-surface)',
      border: 'var(--bb-color-status-warning)',
      iconBg: 'var(--bb-color-status-warning-soft)',
      iconColor: 'var(--bb-color-status-warning)',
    },
    danger: {
      bg: 'var(--bb-color-bg-surface)',
      border: 'var(--bb-color-status-negative)',
      iconBg: 'var(--bb-color-status-negative-soft)',
      iconColor: 'var(--bb-color-status-negative)',
    },
    info: {
      bg: 'var(--bb-color-bg-surface)',
      border: 'var(--bb-color-status-info)',
      iconBg: 'var(--bb-color-status-info-soft)',
      iconColor: 'var(--bb-color-status-info)',
    },
    accent: {
      bg: 'var(--bb-color-bg-surface)',
      border: 'var(--bb-color-accent)',
      iconBg: 'var(--bb-color-accent-soft)',
      iconColor: 'var(--bb-color-accent)',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      ref={ref}
      className={cn(
        statCardVariants({ variant, size, interactive: isClickable }),
        isClickable && 'hover:shadow-md',
        className,
      )}
      style={{
        backgroundColor: styles.bg,
        borderColor: styles.border,
        color: 'var(--bb-color-text-primary)',
      }}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-[var(--bb-label-size)] font-[var(--bb-label-weight)] uppercase tracking-[var(--bb-label-tracking)] text-[color:var(--bb-color-text-muted)] mb-1">
              {title}
            </p>
          )}
          {value !== undefined && (
            <p className="text-[var(--bb-text-2xl)] font-[var(--bb-font-weight-semibold)] text-[color:var(--bb-color-text-primary)] leading-[var(--bb-leading-tight)] tabular-nums">
              {value}
            </p>
          )}
          {subtitle && (
            <p className="text-[var(--bb-small-size)] text-[color:var(--bb-color-text-muted)] mt-1">
              {subtitle}
            </p>
          )}
          {change && (
            <p
              className="text-[var(--bb-small-size)] font-[var(--bb-font-weight-medium)] mt-2"
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
        {Icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: styles.iconBg,
            }}
          >
            {isIconComponent ? (
              <Icon className="h-5 w-5" style={{ color: styles.iconColor }} />
            ) : (
              Icon
            )}
          </div>
        )}
      </div>
    </div>
  );
});
StatCard.displayName = 'StatCard';

// ============================================
// METRIC CARD - Compact metric display
// ============================================

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
}, ref) => {
  const isIconComponent = typeof Icon === 'function' || (Icon && Icon.$$typeof === Symbol.for('react.forward_ref'));

  return (
    <Card ref={ref} className={cn('', className)} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: iconBg || 'var(--bb-color-accent-soft)',
              }}
            >
              {isIconComponent ? (
                <Icon
                  className="h-5 w-5"
                  style={{ color: iconColor || 'var(--bb-color-accent)' }}
                />
              ) : (
                Icon
              )}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[var(--bb-label-size)] font-[var(--bb-label-weight)] uppercase tracking-[var(--bb-label-tracking)] text-[color:var(--bb-color-text-muted)]">
              {title}
            </p>
            <p className="mt-0.5 text-[var(--bb-text-xl)] font-[var(--bb-font-weight-semibold)] text-[color:var(--bb-color-text-primary)] leading-[var(--bb-leading-tight)] tabular-nums">
              {value}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-[var(--bb-small-size)] leading-[var(--bb-small-leading)] text-[color:var(--bb-color-text-muted)]">
                {subtitle}
              </p>
            )}
            {change && (
              <p
                className="mt-1 text-[var(--bb-small-size)] font-[var(--bb-font-weight-medium)]"
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
  );
});
MetricCard.displayName = 'MetricCard';

// ============================================
// PAGE HEADER - Consistent page header
// ============================================

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
          <h1 className="text-[var(--bb-heading-page-size)] font-[var(--bb-heading-page-weight)] leading-[var(--bb-heading-page-leading)] tracking-[var(--bb-heading-page-tracking)] text-[color:var(--bb-color-text-primary)]">
            {title}
          </h1>
        )}
        {description && (
          <p className="mt-[var(--bb-space-1)] text-[var(--bb-body-size)] leading-[var(--bb-body-leading)] text-[color:var(--bb-color-text-muted)]">
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

// ============================================
// EXPORTS
// ============================================

export default Card;
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardSection,
  CardEmptyState,
  StatCard,
  MetricCard,
  PageHeader,
  cardVariants,
};
