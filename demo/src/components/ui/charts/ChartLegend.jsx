/**
 * ChartLegend - Reusable legend component for charts
 * Provides consistent styling for chart legends
 */

import { cn } from '@/lib/cn';

const ChartLegend = ({
  items,
  layout = 'horizontal', // 'horizontal' | 'vertical'
  className,
}) => {
  return (
    <div
      className={cn(
        'flex gap-[var(--bb-space-4)]',
        layout === 'vertical' && 'flex-col gap-[var(--bb-space-2)]',
        layout === 'horizontal' && 'flex-wrap',
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.key || index}
          className="flex items-center gap-[var(--bb-space-2)]"
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
            {item.label}
          </span>
          {item.value !== undefined && (
            <span className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
              {item.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// Individual legend item component
export const LegendItem = ({ color, label, value, className }) => (
  <div className={cn('flex items-center gap-[var(--bb-space-2)]', className)}>
    <span
      className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
    <span className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
      {label}
    </span>
    {value !== undefined && (
      <span className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
        {value}
      </span>
    )}
  </div>
);

export default ChartLegend;

