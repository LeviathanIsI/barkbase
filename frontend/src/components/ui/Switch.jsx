import { useState } from 'react';
import { cn } from '@/lib/cn';

const Switch = ({ checked, onCheckedChange, disabled = false, className, ...props }) => {
  const [internalChecked, setInternalChecked] = useState(checked || false);

  const isChecked = checked !== undefined ? checked : internalChecked;

  const handleClick = () => {
    if (disabled) return;

    const newChecked = !isChecked;
    setInternalChecked(newChecked);
    onCheckedChange?.(newChecked);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        isChecked ? 'bg-[#4B5DD3]' : 'bg-[#E0E0E0]',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          isChecked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
};

export { Switch };
export default Switch;
