import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * ProgressiveFormSection Component
 * Implements progressive disclosure pattern for forms
 * Shows advanced/optional fields only when needed
 * Phase 3: Enhancement features
 *
 * Usage:
 * <ProgressiveFormSection title="Advanced Options" defaultOpen={false}>
 *   <Input label="Optional Field" />
 * </ProgressiveFormSection>
 */
const ProgressiveFormSection = ({
  title,
  description,
  children,
  defaultOpen = false,
  icon: Icon,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border border-gray-200 dark:border-surface-border rounded-lg', className)}>
      {/* Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-surface-secondary transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3 text-left">
          {Icon && <Icon className="w-5 h-5 text-gray-500 dark:text-text-secondary" />}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-text-primary">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 dark:text-text-secondary mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500 dark:text-text-secondary" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 dark:text-text-secondary" />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="px-4 py-4 border-t border-gray-200 dark:border-surface-border">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * ProgressiveFormGroup Component
 * Groups multiple progressive sections
 */
export const ProgressiveFormGroup = ({ children, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  );
};

/**
 * ConditionalFormField Component
 * Shows field only when condition is met
 */
export const ConditionalFormField = ({ condition, children, fadeIn = true }) => {
  if (!condition) return null;

  return (
    <div
      className={cn(
        fadeIn && 'animate-in fade-in-0 slide-in-from-top-2 duration-200'
      )}
    >
      {children}
    </div>
  );
};

export default ProgressiveFormSection;
