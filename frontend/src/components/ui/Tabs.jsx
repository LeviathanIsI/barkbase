/**
 * Professional Tabs Component
 * Enterprise underline-style tabs (Linear/enterprise pattern)
 * NO pill/segment style - uses bottom border for active state
 */

import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext();

const Tabs = ({ value, onValueChange, defaultValue, className, children }) => {
  const [selectedTab, setSelectedTab] = useState(value || defaultValue);
  
  const currentValue = value !== undefined ? value : selectedTab;
  
  const handleValueChange = (newValue) => {
    setSelectedTab(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center border-b border-gray-200 dark:border-dark-border',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const context = useContext(TabsContext);
  const isSelected = context.value === value;

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap px-4 py-3',
        'text-sm font-medium transition-all',
        'border-b-2 -mb-[1px]', // Offset to overlap parent border
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
          : 'border-transparent text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary hover:border-gray-300 dark:hover:border-dark-border',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef(({ className, value, children, forceMount = false, ...props }, ref) => {
  const context = useContext(TabsContext);
  const isActive = context.value === value;

  // If not forceMount and not active, don't render (original behavior for non-form tabs)
  // But by default, keep mounted to preserve form state
  if (!forceMount && !isActive) {
    // Use hidden instead of null to preserve form field registrations
    return (
      <div ref={ref} className="hidden" {...props}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        !isActive && 'hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
export default Tabs;
