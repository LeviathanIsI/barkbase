/**
 * SegmentSelect - Reusable segment dropdown for workflow actions
 * Fetches segments from API and displays with member counts
 */
import { cn } from '@/lib/cn';
import { useSegmentsForDropdown } from '../../../hooks';

export default function SegmentSelect({
  objectType,
  value,
  onChange,
  isMulti = false,
  placeholder = 'Select segment...',
  className = '',
}) {
  const { data: segments, isLoading, error } = useSegmentsForDropdown(objectType);

  // Handle single value change
  const handleChange = (e) => {
    const selectedValue = e.target.value;
    if (isMulti) {
      // For multi-select, toggle the value
      const currentValues = value || [];
      const newValues = currentValues.includes(selectedValue)
        ? currentValues.filter((v) => v !== selectedValue)
        : [...currentValues, selectedValue];
      onChange(newValues);
    } else {
      onChange(selectedValue || null);
    }
  };

  // Handle removing a value from multi-select
  const handleRemove = (valueToRemove) => {
    if (isMulti) {
      onChange((value || []).filter((v) => v !== valueToRemove));
    }
  };

  // Get segment label by ID
  const getSegmentLabel = (segmentId) => {
    const segment = (segments || []).find((s) => s.id === segmentId);
    return segment?.name || segmentId;
  };

  if (error) {
    return (
      <div className="text-sm text-[var(--bb-color-status-negative)]">
        Failed to load segments
      </div>
    );
  }

  // Multi-select UI
  if (isMulti) {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Selected tags */}
        {(value || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(value || []).map((segmentId) => (
              <span
                key={segmentId}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded',
                  'bg-[var(--bb-color-accent)] text-white text-xs'
                )}
              >
                {getSegmentLabel(segmentId)}
                <button
                  type="button"
                  onClick={() => handleRemove(segmentId)}
                  className="hover:text-white/80"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Dropdown */}
        <select
          value=""
          onChange={handleChange}
          disabled={isLoading}
          className={cn(
            'w-full px-3 py-2 rounded-md',
            'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
            'text-sm text-[var(--bb-color-text-primary)]',
            'focus:outline-none focus:border-[var(--bb-color-accent)]',
            'disabled:opacity-50'
          )}
        >
          <option value="">
            {isLoading ? 'Loading segments...' : placeholder}
          </option>
          {(segments || [])
            .filter((s) => !(value || []).includes(s.id))
            .map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
                {segment.member_count !== undefined && ` (${segment.member_count} members)`}
              </option>
            ))}
        </select>

        {!isLoading && (segments || []).length === 0 && (
          <div className="text-xs text-[var(--bb-color-text-tertiary)]">
            No segments found for this object type
          </div>
        )}
      </div>
    );
  }

  // Single-select UI
  return (
    <div className={className}>
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={isLoading}
        className={cn(
          'w-full px-3 py-2 rounded-md',
          'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
          'text-sm text-[var(--bb-color-text-primary)]',
          'focus:outline-none focus:border-[var(--bb-color-accent)]',
          'disabled:opacity-50'
        )}
      >
        <option value="">
          {isLoading ? 'Loading segments...' : placeholder}
        </option>
        {(segments || []).map((segment) => (
          <option key={segment.id} value={segment.id}>
            {segment.name}
            {segment.member_count !== undefined && ` (${segment.member_count} members)`}
          </option>
        ))}
      </select>

      {!isLoading && (segments || []).length === 0 && (
        <div className="mt-1 text-xs text-[var(--bb-color-text-tertiary)]">
          No segments found for this object type
        </div>
      )}
    </div>
  );
}
