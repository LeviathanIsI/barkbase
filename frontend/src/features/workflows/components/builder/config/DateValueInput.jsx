/**
 * DateValueInput
 * Renders date input with support for exact dates, relative dates, and "today"
 * Used by PropertyValueInput for date/datetime property types
 */
import { cn } from '@/lib/cn';

// Date type options
const DATE_TYPE_OPTIONS = [
  { value: 'exact', label: 'Specific date' },
  { value: 'today', label: 'Today' },
  { value: 'relative', label: 'Relative date' },
];

// Relative date unit options
const UNIT_OPTIONS = [
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
  { value: 'months', label: 'months' },
  { value: 'years', label: 'years' },
];

// Relative date direction options
const DIRECTION_OPTIONS = [
  { value: 'ago', label: 'ago' },
  { value: 'from_now', label: 'from now' },
];

export default function DateValueInput({
  value,
  onChange,
  className = '',
}) {
  // Determine the date type from value
  const getDateType = () => {
    if (!value || typeof value === 'string') return 'exact';
    if (value.type) return value.type;
    return 'exact';
  };

  const dateType = getDateType();

  // Handle type change
  const handleTypeChange = (newType) => {
    if (newType === 'today') {
      onChange({ type: 'today' });
    } else if (newType === 'exact') {
      onChange({ type: 'exact', date: '' });
    } else if (newType === 'relative') {
      onChange({ type: 'relative', amount: 7, unit: 'days', direction: 'ago' });
    }
  };

  // Handle exact date change
  const handleDateChange = (date) => {
    onChange({ type: 'exact', date });
  };

  // Handle relative amount change
  const handleAmountChange = (amount) => {
    onChange({
      ...value,
      type: 'relative',
      amount: parseInt(amount) || 1,
    });
  };

  // Handle relative unit change
  const handleUnitChange = (unit) => {
    onChange({
      ...value,
      type: 'relative',
      unit,
    });
  };

  // Handle relative direction change
  const handleDirectionChange = (direction) => {
    onChange({
      ...value,
      type: 'relative',
      direction,
    });
  };

  // Get current values
  const exactDate = value?.date || (typeof value === 'string' ? value : '');
  const relativeAmount = value?.amount || 7;
  const relativeUnit = value?.unit || 'days';
  const relativeDirection = value?.direction || 'ago';

  return (
    <div className={cn('space-y-2', className)}>
      {/* Date type selector */}
      <select
        value={dateType}
        onChange={(e) => handleTypeChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 rounded-md',
          'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
          'text-sm text-[var(--bb-color-text-primary)]',
          'focus:outline-none focus:border-[var(--bb-color-accent)]'
        )}
      >
        {DATE_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Specific date picker */}
      {dateType === 'exact' && (
        <input
          type="date"
          value={exactDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2 rounded-md',
            'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
            'text-sm text-[var(--bb-color-text-primary)]',
            'focus:outline-none focus:border-[var(--bb-color-accent)]'
          )}
        />
      )}

      {/* Relative date inputs */}
      {dateType === 'relative' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={relativeAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={cn(
              'w-20 px-3 py-2 rounded-md',
              'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
              'text-sm text-[var(--bb-color-text-primary)]',
              'focus:outline-none focus:border-[var(--bb-color-accent)]'
            )}
          />
          <select
            value={relativeUnit}
            onChange={(e) => handleUnitChange(e.target.value)}
            className={cn(
              'w-24 px-3 py-2 rounded-md',
              'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
              'text-sm text-[var(--bb-color-text-primary)]',
              'focus:outline-none focus:border-[var(--bb-color-accent)]'
            )}
          >
            {UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={relativeDirection}
            onChange={(e) => handleDirectionChange(e.target.value)}
            className={cn(
              'w-28 px-3 py-2 rounded-md',
              'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
              'text-sm text-[var(--bb-color-text-primary)]',
              'focus:outline-none focus:border-[var(--bb-color-accent)]'
            )}
          >
            {DIRECTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Today confirmation text */}
      {dateType === 'today' && (
        <p className="text-xs text-[var(--bb-color-text-tertiary)]">
          Matches the current date when the workflow runs
        </p>
      )}
    </div>
  );
}

/**
 * DaysInput - Simple number input for "is X days ago" operators
 * Used when operator already implies the direction (ago/from now)
 */
export function DaysInput({ value, onChange, className = '' }) {
  const numValue = typeof value === 'number' ? value : parseInt(value) || 7;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="number"
        min="1"
        value={numValue}
        onChange={(e) => onChange(parseInt(e.target.value) || 1)}
        className={cn(
          'w-20 px-3 py-2 rounded-md',
          'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
          'text-sm text-[var(--bb-color-text-primary)]',
          'focus:outline-none focus:border-[var(--bb-color-accent)]'
        )}
      />
      <span className="text-sm text-[var(--bb-color-text-tertiary)]">days</span>
    </div>
  );
}

/**
 * DateRangeInput - Two date inputs for "is between" operator
 */
export function DateRangeInput({ value, onChange, className = '' }) {
  const from = value?.from || { type: 'exact', date: '' };
  const to = value?.to || { type: 'exact', date: '' };

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1">
          From
        </label>
        <DateValueInput
          value={from}
          onChange={(newFrom) => onChange({ ...value, from: newFrom })}
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1">
          To
        </label>
        <DateValueInput
          value={to}
          onChange={(newTo) => onChange({ ...value, to: newTo })}
        />
      </div>
    </div>
  );
}
