/**
 * InspectorField - Label + value display row for inspector panels
 * Supports various layouts and handles empty states
 */

import { cn } from '@/lib/cn';

const InspectorField = ({
  label,
  value,
  layout = 'inline', // 'inline' | 'stacked' | 'grid'
  multiline = false,
  icon: Icon,
  className,
  children,
}) => {
  // Handle empty/null values
  const displayValue = value !== undefined && value !== null && value !== '' 
    ? value 
    : '—';
  
  const isEmpty = displayValue === '—';

  if (layout === 'stacked') {
    return (
      <div className={cn('space-y-[var(--bb-space-1)]', className)}>
        <dt className="flex items-center gap-[var(--bb-space-1)] text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)] uppercase tracking-wide">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </dt>
        <dd className={cn(
          'text-[var(--bb-font-size-sm)]',
          isEmpty ? 'text-[var(--bb-color-text-subtle)]' : 'text-[var(--bb-color-text-primary)]',
          multiline && 'whitespace-pre-wrap'
        )}>
          {children || displayValue}
        </dd>
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 gap-[var(--bb-space-2)]', className)}>
        <dt className="flex items-center gap-[var(--bb-space-1)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
          {Icon && <Icon className="h-4 w-4" />}
          {label}
        </dt>
        <dd className={cn(
          'text-[var(--bb-font-size-sm)] text-right',
          isEmpty ? 'text-[var(--bb-color-text-subtle)]' : 'text-[var(--bb-color-text-primary)]',
          multiline && 'whitespace-pre-wrap'
        )}>
          {children || displayValue}
        </dd>
      </div>
    );
  }

  // Default: inline layout
  return (
    <div className={cn(
      'flex items-start justify-between gap-[var(--bb-space-4)]',
      className
    )}>
      <dt className="flex items-center gap-[var(--bb-space-1)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] flex-shrink-0">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </dt>
      <dd className={cn(
        'text-[var(--bb-font-size-sm)] text-right',
        isEmpty ? 'text-[var(--bb-color-text-subtle)]' : 'text-[var(--bb-color-text-primary)]',
        multiline && 'whitespace-pre-wrap text-left flex-1'
      )}>
        {children || displayValue}
      </dd>
    </div>
  );
};

export default InspectorField;

