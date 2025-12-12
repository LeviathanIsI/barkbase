import { cn } from '@/lib/cn';

/**
 * SettingsCard - Consistent card styling for settings sections
 */
const SettingsCard = ({
  title,
  description,
  icon: Icon,
  children,
  className,
  noPadding = false,
}) => (
  <div className={cn(
    'bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden',
    className
  )}>
    {(title || description) && (
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted" />}
          {title && (
            <h3 className="text-sm font-semibold text-text">{title}</h3>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted">{description}</p>
        )}
      </div>
    )}
    <div className={cn(!noPadding && 'p-5')}>{children}</div>
  </div>
);

export default SettingsCard;
