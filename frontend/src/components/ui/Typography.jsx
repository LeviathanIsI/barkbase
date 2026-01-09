/**
 * Typography Components
 * Semantic typography components using design tokens for consistent text styling.
 *
 * Components:
 * - PageTitle: Main page heading (h1)
 * - SectionTitle: Card/section headers (h2)
 * - SubsectionTitle: Subsection headers (h3)
 * - Text: Body text with variants
 * - Label: Uppercase label text
 * - Metric: Large numbers/stats
 * - Link: Styled anchor/button links
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageTitle - Main page heading (H1)
 * Used for page titles like "Today", "Pet Owners", "Vaccinations"
 */
export const PageTitle = React.forwardRef(({
  as: Component = 'h1',
  children,
  className,
  ...props
}, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-[var(--bb-heading-page-size)] font-[var(--bb-heading-page-weight)]',
      'leading-[var(--bb-heading-page-leading)] tracking-[var(--bb-heading-page-tracking)]',
      'text-[color:var(--bb-color-text-primary)]',
      className
    )}
    {...props}
  >
    {children}
  </Component>
));
PageTitle.displayName = 'PageTitle';

/**
 * SectionTitle - Card/section headers (H2)
 * Used for card headers like "Today's Arrivals", "Overdue Tasks"
 */
export const SectionTitle = React.forwardRef(({
  as: Component = 'h2',
  children,
  className,
  ...props
}, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-[var(--bb-heading-section-size)] font-[var(--bb-heading-section-weight)]',
      'leading-[var(--bb-heading-section-leading)] tracking-[var(--bb-heading-section-tracking)]',
      'text-[color:var(--bb-color-text-primary)]',
      className
    )}
    {...props}
  >
    {children}
  </Component>
));
SectionTitle.displayName = 'SectionTitle';

/**
 * SubsectionTitle - Subsection headers (H3)
 * Used for form sections, nested content headers
 */
export const SubsectionTitle = React.forwardRef(({
  as: Component = 'h3',
  children,
  className,
  ...props
}, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-[var(--bb-heading-sub-size)] font-[var(--bb-heading-sub-weight)]',
      'leading-[var(--bb-heading-sub-leading)] tracking-[var(--bb-heading-sub-tracking)]',
      'text-[color:var(--bb-color-text-primary)]',
      className
    )}
    {...props}
  >
    {children}
  </Component>
));
SubsectionTitle.displayName = 'SubsectionTitle';

/**
 * Text - Body text with variants
 * @param {string} variant - 'default' | 'muted' | 'subtle' | 'accent' | 'error' | 'success' | 'warning'
 * @param {string} size - 'xs' | 'sm' | 'base' | 'lg'
 * @param {string} weight - 'regular' | 'medium' | 'semibold' | 'bold'
 * @param {boolean} truncate - Whether to truncate with ellipsis
 */
export const Text = React.forwardRef(({
  as: Component = 'p',
  variant = 'default',
  size = 'sm',
  weight = 'regular',
  truncate = false,
  children,
  className,
  ...props
}, ref) => {
  const sizeStyles = {
    xs: 'text-[var(--bb-text-xs)]',
    sm: 'text-[var(--bb-text-sm)]',
    base: 'text-[var(--bb-text-base)]',
    lg: 'text-[var(--bb-text-lg)]',
  };

  const weightStyles = {
    regular: 'font-[var(--bb-font-weight-regular)]',
    medium: 'font-[var(--bb-font-weight-medium)]',
    semibold: 'font-[var(--bb-font-weight-semibold)]',
    bold: 'font-[var(--bb-font-weight-bold)]',
  };

  const variantStyles = {
    default: 'text-[color:var(--bb-color-text-primary)]',
    muted: 'text-[color:var(--bb-color-text-muted)]',
    subtle: 'text-[color:var(--bb-color-text-subtle)]',
    accent: 'text-[color:var(--bb-color-accent-text)]',
    error: 'text-[color:var(--bb-color-status-negative-text)]',
    success: 'text-[color:var(--bb-color-status-positive-text)]',
    warning: 'text-[color:var(--bb-color-status-warning-text)]',
  };

  return (
    <Component
      ref={ref}
      className={cn(
        sizeStyles[size],
        weightStyles[weight],
        variantStyles[variant],
        'leading-[var(--bb-leading-normal)]',
        truncate && 'truncate',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
Text.displayName = 'Text';

/**
 * Label - Uppercase label text
 * Used for table headers, section labels, form labels
 * @param {boolean} uppercase - Whether to uppercase (default: true)
 */
export const Label = React.forwardRef(({
  as: Component = 'span',
  uppercase = true,
  children,
  className,
  ...props
}, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-[var(--bb-label-size)] font-[var(--bb-label-weight)]',
      'leading-[var(--bb-label-leading)] tracking-[var(--bb-label-tracking)]',
      'text-[color:var(--bb-color-text-muted)]',
      uppercase && 'uppercase',
      className
    )}
    {...props}
  >
    {children}
  </Component>
));
Label.displayName = 'Label';

/**
 * Metric - Large numbers/stats display
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} variant - 'default' | 'accent' | 'success' | 'warning' | 'danger'
 */
export const Metric = React.forwardRef(({
  as: Component = 'span',
  size = 'md',
  variant = 'default',
  children,
  className,
  ...props
}, ref) => {
  const sizeStyles = {
    sm: 'text-[var(--bb-text-xl)]',
    md: 'text-[var(--bb-text-2xl)]',
    lg: 'text-[var(--bb-metric-size)]',
    xl: 'text-[var(--bb-metric-lg-size)]',
  };

  const variantStyles = {
    default: 'text-[color:var(--bb-color-text-primary)]',
    accent: 'text-[color:var(--bb-color-accent)]',
    success: 'text-[color:var(--bb-color-status-positive)]',
    warning: 'text-[color:var(--bb-color-status-warning)]',
    danger: 'text-[color:var(--bb-color-status-negative)]',
  };

  return (
    <Component
      ref={ref}
      className={cn(
        sizeStyles[size],
        variantStyles[variant],
        'font-[var(--bb-font-weight-bold)]',
        'leading-[var(--bb-leading-none)]',
        'tracking-[var(--bb-tracking-tighter)]',
        'tabular-nums',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
Metric.displayName = 'Metric';

/**
 * Link - Styled anchor/button text
 * @param {string} variant - 'default' | 'muted' | 'underline'
 * @param {boolean} external - Whether link opens in new tab
 */
export const TextLink = React.forwardRef(({
  as,
  href,
  variant = 'default',
  external = false,
  children,
  className,
  ...props
}, ref) => {
  const Component = as || (href ? 'a' : 'button');

  const variantStyles = {
    default: [
      'text-[color:var(--bb-color-accent-text)]',
      'hover:text-[color:var(--bb-color-accent)]',
      'hover:underline',
    ],
    muted: [
      'text-[color:var(--bb-color-text-muted)]',
      'hover:text-[color:var(--bb-color-text-primary)]',
    ],
    underline: [
      'text-[color:var(--bb-color-accent-text)]',
      'underline underline-offset-2',
      'hover:text-[color:var(--bb-color-accent)]',
    ],
  };

  return (
    <Component
      ref={ref}
      href={href}
      className={cn(
        'transition-colors duration-150 cursor-pointer',
        ...variantStyles[variant],
        className
      )}
      {...(external && href && {
        target: '_blank',
        rel: 'noopener noreferrer',
      })}
      {...props}
    >
      {children}
    </Component>
  );
});
TextLink.displayName = 'TextLink';

/**
 * PageDescription - Subtitle text below page titles
 */
export const PageDescription = React.forwardRef(({
  as: Component = 'p',
  children,
  className,
  ...props
}, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-[var(--bb-text-sm)] font-[var(--bb-font-weight-regular)]',
      'leading-[var(--bb-leading-normal)]',
      'text-[color:var(--bb-color-text-muted)]',
      'mt-1',
      className
    )}
    {...props}
  >
    {children}
  </Component>
));
PageDescription.displayName = 'PageDescription';

/**
 * TableHeader - Table column header text
 */
export const TableHeader = React.forwardRef(({
  as: Component = 'th',
  sortable = false,
  children,
  className,
  ...props
}, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-[var(--bb-text-xs)] font-[var(--bb-font-weight-semibold)]',
      'leading-[var(--bb-leading-tight)] tracking-[var(--bb-tracking-wider)]',
      'text-[color:var(--bb-color-text-muted)] uppercase whitespace-nowrap',
      sortable && 'cursor-pointer hover:text-[color:var(--bb-color-text-primary)] transition-colors',
      className
    )}
    {...props}
  >
    {children}
  </Component>
));
TableHeader.displayName = 'TableHeader';

/**
 * TruncatedText - Text that truncates with optional tooltip
 */
export const TruncatedText = React.forwardRef(({
  as: Component = 'span',
  children,
  className,
  title,
  ...props
}, ref) => (
  <Component
    ref={ref}
    className={cn(
      'block truncate',
      className
    )}
    title={title || (typeof children === 'string' ? children : undefined)}
    {...props}
  >
    {children}
  </Component>
));
TruncatedText.displayName = 'TruncatedText';

export default {
  PageTitle,
  SectionTitle,
  SubsectionTitle,
  Text,
  Label,
  Metric,
  TextLink,
  PageDescription,
  TableHeader,
  TruncatedText,
};
