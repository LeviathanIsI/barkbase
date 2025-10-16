import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Check } from 'lucide-react';

const Checkbox = ({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  ...props
}) => {
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
      role="checkbox"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-[#E0E0E0] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B5DD3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        isChecked ? 'bg-[#4B5DD3] text-white border-[#4B5DD3]' : 'bg-white',
        className
      )}
      {...props}
    >
      {isChecked && (
        <Check className="h-3 w-3" />
      )}
    </button>
  );
};

export { Checkbox };
export default Checkbox;
