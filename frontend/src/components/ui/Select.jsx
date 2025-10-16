import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/cn';
import { ChevronDown } from 'lucide-react';

// Context for Select state
const SelectContext = createContext();

const Select = ({ children, value, onValueChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  const selectRef = useRef(null);

  const currentValue = value !== undefined ? value : internalValue;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (newValue) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <SelectContext.Provider value={{ isOpen, setIsOpen, value: currentValue, onSelect: handleSelect }}>
      <div ref={selectRef} className={cn('relative', className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = ({ children, className, ...props }) => {
  const { isOpen, setIsOpen } = useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#4B5DD3] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
};

const SelectValue = ({ placeholder }) => {
  const { value } = useContext(SelectContext);

  if (!value) {
    return <span className="text-[#64748B]">{placeholder}</span>;
  }

  return <span>{value}</span>;
};

const SelectContent = ({ children, className }) => {
  const { isOpen } = useContext(SelectContext);

  if (!isOpen) return null;

  return (
    <div className={cn('absolute top-full z-50 mt-1 max-h-60 min-w-[8rem] overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-lg', className)}>
      <div className="overflow-auto p-1">
        {children}
      </div>
    </div>
  );
};

const SelectItem = ({ children, value, className }) => {
  const { onSelect, value: selectedValue } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-[#F5F6FA] focus:text-[#263238]',
        isSelected && 'bg-[#F5F6FA] text-[#263238]',
        className
      )}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-[#4B5DD3]" />
        </span>
      )}
      {children}
    </button>
  );
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
export default Select;
