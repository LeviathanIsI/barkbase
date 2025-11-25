/**
 * PageActions Component
 * Token-based container for page-level action buttons
 */

import React from 'react';
import { cn } from '@/lib/cn';

const PageActions = React.forwardRef(({ 
  children, 
  actions,
  className, 
  ...props 
}, ref) => {
  const content = children || actions;
  
  if (!content) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-[var(--bb-space-3)] flex-wrap',
        className
      )}
      {...props}
    >
      {content}
    </div>
  );
});

PageActions.displayName = 'PageActions';

export { PageActions };
export default PageActions;

