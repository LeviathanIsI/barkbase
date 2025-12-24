import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const FilterDropdown = ({ label, options = [], value, onChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onClear();
  };

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface/80',
          value && 'border-primary bg-primary/5 text-primary'
        )}
      >
        {selectedOption ? selectedOption.label : label}
        <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
        {value && (
          <button
            onClick={handleClear}
            className="ml-1 rounded p-0.5 hover:bg-primary/20"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-border bg-white dark:bg-surface-primary shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary',
                  value === option.value && 'bg-primary/5 text-primary font-medium'
                )}
              >
                <span>{option.label}</span>
                {value === option.value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
