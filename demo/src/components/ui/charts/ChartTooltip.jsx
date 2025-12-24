/**
 * ChartTooltip - Custom tooltip component for Recharts
 * Uses token-based styling for consistent theming
 */

import { cn } from '@/lib/cn';

const ChartTooltip = ({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  className,
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)]',
        'bg-[var(--bb-color-bg-surface)]',
        'shadow-[var(--bb-elevation-card)]',
        'p-[var(--bb-space-3)]',
        'min-w-[120px]',
        className
      )}
    >
      {label && (
        <p className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-[var(--bb-space-1)]">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-[var(--bb-space-3)]">
            <div className="flex items-center gap-[var(--bb-space-2)]">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                {entry.name || entry.dataKey}
              </span>
            </div>
            <span className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
              {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Tooltip style object for Recharts contentStyle prop
export const tooltipContentStyle = {
  backgroundColor: 'var(--bb-color-bg-surface)',
  border: '1px solid var(--bb-color-border-subtle)',
  borderRadius: 'var(--bb-radius-lg)',
  boxShadow: 'var(--bb-elevation-card)',
  padding: 'var(--bb-space-3)',
};

export default ChartTooltip;

