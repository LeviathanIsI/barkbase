/**
 * PageMeta Component
 * Token-based page description/metadata
 */

import React from 'react';
import { cn } from '@/lib/cn';

const PageMeta = React.forwardRef(({ 
  children, 
  description,
  className, 
  ...props 
}, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]',
      'leading-[var(--bb-leading-normal,1.35)]',
      'mt-[var(--bb-space-1)]',
      className
    )}
    {...props}
  >
    {children || description}
  </p>
));

PageMeta.displayName = 'PageMeta';

export { PageMeta };
export default PageMeta;

