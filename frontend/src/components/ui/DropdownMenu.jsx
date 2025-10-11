import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';

const DropdownMenu = ({ trigger, children, align = 'right' }) => {
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
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-56 rounded-lg border border-border bg-surface shadow-lg ring-1 ring-black/5',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div
            className="py-1"
            role="menu"
            onClick={() => setIsOpen(false)}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const DropdownMenuItem = ({ onClick, icon: Icon, children, variant = 'default' }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
        variant === 'danger'
          ? 'text-red-600 hover:bg-red-50'
          : 'text-text hover:bg-surface/50'
      )}
      role="menuitem"
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
};

const DropdownMenuSeparator = () => {
  return <div className="my-1 h-px bg-border" role="separator" />;
};

export { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator };
export default DropdownMenu;
