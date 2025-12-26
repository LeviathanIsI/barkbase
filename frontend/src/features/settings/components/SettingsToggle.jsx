import { cn } from '@/lib/cn';

/**
 * SettingsToggle - Consistent toggle row styling
 * Label left, toggle right, optional description below
 */
const SettingsToggle = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className,
}) => (
  <div className={cn('flex items-start justify-between gap-4 py-3', className)}>
    <div className="flex-1 min-w-0">
      <span className={cn(
        'text-sm font-medium',
        disabled ? 'text-muted' : 'text-text'
      )}>
        {label}
      </span>
      {description && (
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
        checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-1'
        )}
      />
    </button>
  </div>
);

export default SettingsToggle;
