/**
 * Professional Label Component
 * Form labels with consistent styling
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Label = React.forwardRef(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium text-gray-700 dark:text-text-primary leading-none',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="text-error-600 ml-1">*</span>}
  </label>
));

Label.displayName = 'Label';

export { Label };
export default Label;
