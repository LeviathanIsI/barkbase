/**
 * PageTitle Component
 * Token-based page title with consistent typography
 */

import React from 'react';
import { cn } from '@/lib/cn';

const PageTitle = React.forwardRef(({ 
  children, 
  title,
  className, 
  as: Component = 'h1',
  ...props 
}, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-[var(--bb-font-size-xl)] font-[var(--bb-font-weight-semibold)]',
      'leading-[var(--bb-leading-tight,1.15)]',
      'text-[var(--bb-color-text-primary)]',
      className
    )}
    {...props}
  >
    {children || title}
  </Component>
));

PageTitle.displayName = 'PageTitle';

export { PageTitle };
export default PageTitle;

