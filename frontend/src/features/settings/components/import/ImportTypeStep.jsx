import { useMemo, useState } from 'react';
import {
  Users,
  PawPrint,
  Calendar,
  Scissors,
  BadgeCheck,
  Receipt,
  Syringe,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  ENTITY_TYPES,
  getAssociableEntities,
  getDisabledTooltip,
} from './importFieldDefinitions';

const ICON_MAP = {
  Users,
  PawPrint,
  Calendar,
  Scissors,
  BadgeCheck,
  Receipt,
  Syringe,
};

const ImportTypeStep = ({ selectedTypes, onTypesChange }) => {
  const [hoveredDisabled, setHoveredDisabled] = useState(null);

  // Get which entities are currently associable
  const associableEntities = useMemo(
    () => getAssociableEntities(selectedTypes),
    [selectedTypes]
  );

  const toggleType = (typeId) => {
    if (selectedTypes.includes(typeId)) {
      // Deselecting - allow it
      onTypesChange(selectedTypes.filter((t) => t !== typeId));
    } else {
      // Check if we can add this entity
      if (selectedTypes.length >= 2) {
        // Already at max
        return;
      }
      if (!associableEntities.includes(typeId)) {
        // Can't associate with current selection
        return;
      }
      onTypesChange([...selectedTypes, typeId]);
    }
  };

  const entityList = Object.values(ENTITY_TYPES);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">
          What kind of data is in your file?
        </h2>
        <p className="mt-2 text-sm text-[color:var(--bb-color-text-muted)]">
          Select the type of records you're importing
        </p>
      </div>

      {/* 5-column grid on desktop, 2 on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {entityList.map((entity) => {
          const Icon = ICON_MAP[entity.icon] || Users;
          const isSelected = selectedTypes.includes(entity.id);
          const isAssociable = associableEntities.includes(entity.id);
          const isDisabled = !isSelected && !isAssociable;
          const tooltipMessage = getDisabledTooltip(entity.id, selectedTypes);

          return (
            <div key={entity.id} className="relative">
              <button
                type="button"
                onClick={() => toggleType(entity.id)}
                onMouseEnter={() => isDisabled && setHoveredDisabled(entity.id)}
                onMouseLeave={() => setHoveredDisabled(null)}
                disabled={isDisabled}
                className={cn(
                  'relative w-full flex flex-col items-center p-4 rounded-xl border-2 text-center transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2',
                  isSelected
                    ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] shadow-md'
                    : isDisabled
                    ? 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] opacity-40 cursor-not-allowed'
                    : 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] hover:border-[color:var(--bb-color-border-default)] hover:shadow-sm cursor-pointer'
                )}
                style={{
                  '--tw-ring-color': 'var(--bb-color-accent)',
                }}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bb-color-accent)' }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                    isSelected
                      ? 'bg-[color:var(--bb-color-accent)]'
                      : isDisabled
                      ? 'bg-[color:var(--bb-color-bg-elevated)]'
                      : 'bg-[color:var(--bb-color-bg-elevated)]'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6',
                      isSelected
                        ? 'text-white'
                        : 'text-[color:var(--bb-color-text-muted)]'
                    )}
                  />
                </div>

                {/* Label */}
                <h3
                  className={cn(
                    'text-sm font-semibold',
                    isSelected
                      ? 'text-[color:var(--bb-color-accent)]'
                      : 'text-[color:var(--bb-color-text-primary)]'
                  )}
                >
                  {entity.label}
                </h3>

                {/* Description */}
                <p className="mt-1 text-[0.7rem] text-[color:var(--bb-color-text-muted)] line-clamp-2 leading-tight">
                  {entity.description}
                </p>
              </button>

              {/* Tooltip for disabled entities */}
              {hoveredDisabled === entity.id && tooltipMessage && (
                <div
                  className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 rounded-lg text-xs text-center whitespace-nowrap shadow-lg"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-elevated)',
                    border: '1px solid var(--bb-color-border-subtle)',
                    color: 'var(--bb-color-text-muted)',
                  }}
                >
                  {tooltipMessage}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                    style={{
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid var(--bb-color-border-subtle)',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection summary */}
      {selectedTypes.length > 0 && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--bb-color-accent-soft)',
            color: 'var(--bb-color-accent)',
          }}
        >
          <span className="font-medium">Selected:</span>{' '}
          {selectedTypes.map((t) => ENTITY_TYPES[t]?.label).join(' + ')}
        </div>
      )}

      {/* Max 2 warning */}
      {selectedTypes.length >= 2 && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg text-sm"
          style={{
            backgroundColor:
              'var(--bb-color-status-info-muted, rgba(59, 130, 246, 0.1))',
            color: 'var(--bb-color-status-info, #3b82f6)',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Maximum of 2 object types per import. To import more types, use
            separate files.
          </span>
        </div>
      )}
    </div>
  );
};

export default ImportTypeStep;
