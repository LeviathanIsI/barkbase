import {
  Users,
  PawPrint,
  Calendar,
  Scissors,
  BadgeCheck,
  Receipt,
  Syringe,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ENTITY_TYPES } from './importFieldDefinitions';

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
  const toggleType = (typeId) => {
    if (selectedTypes.includes(typeId)) {
      onTypesChange(selectedTypes.filter(t => t !== typeId));
    } else {
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
          Select the type of records you're importing. You can select multiple if your file contains different types.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entityList.map((entity) => {
          const Icon = ICON_MAP[entity.icon] || Users;
          const isSelected = selectedTypes.includes(entity.id);

          return (
            <button
              key={entity.id}
              type="button"
              onClick={() => toggleType(entity.id)}
              className={cn(
                'relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all',
                'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                isSelected
                  ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] shadow-sm'
                  : 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] hover:border-[color:var(--bb-color-border-default)]'
              )}
              style={{
                '--tw-ring-color': 'var(--bb-color-accent)',
              }}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div
                  className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bb-color-accent)' }}
                >
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                  isSelected
                    ? 'bg-[color:var(--bb-color-accent)]'
                    : 'bg-[color:var(--bb-color-bg-elevated)]'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5',
                    isSelected
                      ? 'text-white'
                      : 'text-[color:var(--bb-color-text-muted)]'
                  )}
                />
              </div>

              {/* Label */}
              <h3 className={cn(
                'text-sm font-semibold',
                isSelected
                  ? 'text-[color:var(--bb-color-accent)]'
                  : 'text-[color:var(--bb-color-text-primary)]'
              )}>
                {entity.label}
              </h3>

              {/* Description */}
              <p className="mt-1 text-xs text-[color:var(--bb-color-text-muted)] line-clamp-2">
                {entity.description}
              </p>

              {/* Field count */}
              <p className="mt-2 text-[0.65rem] text-[color:var(--bb-color-text-muted)]">
                {entity.fields.filter(f => f.required).length} required, {entity.fields.length} total fields
              </p>
            </button>
          );
        })}
      </div>

      {selectedTypes.length > 0 && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--bb-color-accent-soft)',
            color: 'var(--bb-color-accent)'
          }}
        >
          <span className="font-medium">Selected:</span>{' '}
          {selectedTypes.map(t => ENTITY_TYPES[t]?.label).join(', ')}
        </div>
      )}
    </div>
  );
};

export default ImportTypeStep;
