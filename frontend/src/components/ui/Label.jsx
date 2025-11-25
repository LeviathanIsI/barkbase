/**
 * Label Component - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Label = React.forwardRef(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] leading-none',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    style={{ color: 'var(--bb-color-text-primary)' }}
    {...props}
  >
    {children}
    {required && (
      <span style={{ color: 'var(--bb-color-status-negative)' }} className="ml-1">*</span>
    )}
  </label>
));

Label.displayName = 'Label';

export { Label };
export default Label;
