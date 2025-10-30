/**
 * Professional Checkbox Component
 * Clean, accessible checkbox with label support
 */

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef(
  ({ className, label, description, checked, onChange, ...props }, ref) => {
    return (
      <div className="flex items-start gap-3">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={onChange}
            className={cn(
              'h-4 w-4 rounded border-gray-300 text-primary-600',
              'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'transition-colors cursor-pointer',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label className="text-sm font-medium text-gray-700 cursor-pointer">
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
