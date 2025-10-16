import { useState, createContext, useContext } from 'react';
import { cn } from '@/lib/cn';

const TabsContext = createContext();

const Tabs = ({ defaultValue, value, onValueChange, children, className }) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');

  const currentValue = value !== undefined ? value : internalValue;
  const setValue = (newValue) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ className, children }) => (
  <div className={cn('inline-flex h-10 items-center justify-center rounded-lg bg-[#F5F6FA] p-1 text-[#64748B]', className)}>
    {children}
  </div>
);

const TabsTrigger = ({ value, className, children }) => {
  const { value: currentValue, setValue } = useContext(TabsContext);
  const isActive = currentValue === value;

  return (
    <button
      onClick={() => setValue(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-white text-[#263238] shadow-sm'
          : 'text-[#64748B] hover:text-[#263238]',
        className
      )}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, className, children }) => {
  const { value: currentValue } = useContext(TabsContext);

  if (currentValue !== value) return null;

  return (
    <div className={cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}>
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
export default Tabs;
