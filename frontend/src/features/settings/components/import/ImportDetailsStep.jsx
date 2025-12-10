import { useMemo } from 'react';
import {
  Check,
  AlertTriangle,
  AlertCircle,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ENTITY_TYPES, getUnmappedRequiredFields } from './importFieldDefinitions';

const ImportDetailsStep = ({
  selectedTypes,
  parsedData,
  mappings,
  importOptions,
  onImportOptionsChange,
}) => {
  // Calculate summary stats
  const stats = useMemo(() => {
    const mappedColumns = Object.entries(mappings).filter(([_, v]) => v);
    const skippedColumns = (parsedData?.headers?.length || 0) - mappedColumns.length;
    const unmappedRequired = [];

    selectedTypes.forEach(typeId => {
      unmappedRequired.push(...getUnmappedRequiredFields(mappings, typeId));
    });

    return {
      rowCount: parsedData?.rowCount || 0,
      mappedCount: mappedColumns.length,
      skippedCount: skippedColumns,
      unmappedRequired,
      hasErrors: unmappedRequired.length > 0,
    };
  }, [selectedTypes, parsedData, mappings]);

  // Group mapped fields by entity type
  const mappedByEntity = useMemo(() => {
    const grouped = {};
    selectedTypes.forEach(typeId => {
      const entity = ENTITY_TYPES[typeId];
      if (!entity) return;

      const entityMappings = Object.entries(mappings)
        .filter(([_, fieldKey]) => entity.fields.some(f => f.key === fieldKey))
        .map(([header, fieldKey]) => ({
          header,
          fieldKey,
          field: entity.fields.find(f => f.key === fieldKey),
        }));

      if (entityMappings.length > 0) {
        grouped[typeId] = {
          entity,
          mappings: entityMappings,
        };
      }
    });
    return grouped;
  }, [selectedTypes, mappings]);

  const handleOptionChange = (key, value) => {
    onImportOptionsChange({
      ...importOptions,
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">
          Review and confirm
        </h2>
        <p className="mt-2 text-sm text-[color:var(--bb-color-text-muted)]">
          Verify your import settings before starting
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Records */}
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">Records to import</p>
          <p className="text-2xl font-bold text-[color:var(--bb-color-text-primary)] mt-1">
            {stats.rowCount.toLocaleString()}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
            {selectedTypes.map(t => ENTITY_TYPES[t]?.label).join(', ')}
          </p>
        </div>

        {/* Mapped columns */}
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">Columns mapped</p>
          <p className="text-2xl font-bold text-[color:var(--bb-color-status-positive)] mt-1">
            {stats.mappedCount}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
            of {parsedData?.headers?.length || 0} total columns
          </p>
        </div>

        {/* Skipped columns */}
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">Columns skipped</p>
          <p className={cn(
            'text-2xl font-bold mt-1',
            stats.skippedCount > 0 ? 'text-[color:var(--bb-color-status-warning)]' : 'text-[color:var(--bb-color-text-primary)]'
          )}>
            {stats.skippedCount}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
            will not be imported
          </p>
        </div>
      </div>

      {/* Errors */}
      {stats.hasErrors && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--bb-color-status-negative-muted, rgba(239, 68, 68, 0.1))',
            borderColor: 'var(--bb-color-status-negative)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[color:var(--bb-color-status-negative)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[color:var(--bb-color-status-negative)]">
                Required fields are missing
              </p>
              <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                The following required fields have not been mapped:{' '}
                <span className="font-medium">{stats.unmappedRequired.map(f => f.label).join(', ')}</span>
              </p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-2">
                Please go back to the mapping step and map these fields before importing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Field mapping summary */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{
            backgroundColor: 'var(--bb-color-bg-elevated)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <h3 className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
            Field mappings
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {Object.entries(mappedByEntity).map(([typeId, { entity, mappings: entityMappings }]) => (
            <div key={typeId}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bb-color-text-muted)] mb-2">
                {entity.label}
              </p>
              <div className="space-y-1">
                {entityMappings.map(({ header, fieldKey, field }) => (
                  <div
                    key={header}
                    className="flex items-center gap-2 text-sm py-1"
                  >
                    <span className="text-[color:var(--bb-color-text-muted)]">{header}</span>
                    <ArrowRight className="w-3 h-3 text-[color:var(--bb-color-text-muted)]" />
                    <span className="text-[color:var(--bb-color-text-primary)] font-medium">
                      {field?.label || fieldKey}
                    </span>
                    {field?.required && (
                      <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-[color:var(--bb-color-status-positive-muted,rgba(34,197,94,0.1))] text-[color:var(--bb-color-status-positive)]">
                        Required
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(mappedByEntity).length === 0 && (
            <p className="text-sm text-[color:var(--bb-color-text-muted)] text-center py-4">
              No fields have been mapped
            </p>
          )}
        </div>
      </div>

      {/* Import options */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{
            backgroundColor: 'var(--bb-color-bg-elevated)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <h3 className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
            Import options
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Duplicate handling */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={importOptions.skipDuplicates}
              onChange={(e) => handleOptionChange('skipDuplicates', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[color:var(--bb-color-border-default)] text-[color:var(--bb-color-accent)]"
            />
            <div>
              <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                Skip duplicates
              </span>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5">
                Skip records that match existing entries (by email for owners, name + owner for pets)
              </p>
            </div>
          </label>

          {/* Update existing */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={importOptions.updateExisting}
              onChange={(e) => handleOptionChange('updateExisting', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[color:var(--bb-color-border-default)] text-[color:var(--bb-color-accent)]"
            />
            <div>
              <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                Update existing records
              </span>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5">
                When a match is found, update the existing record with new data
              </p>
            </div>
          </label>

          {/* Create new only */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={importOptions.createNewOnly}
              onChange={(e) => handleOptionChange('createNewOnly', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[color:var(--bb-color-border-default)] text-[color:var(--bb-color-accent)]"
            />
            <div>
              <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                Create new records only
              </span>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5">
                Only create records that don't already exist (ignore all matches)
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Ready to import */}
      {!stats.hasErrors && (
        <div
          className="p-4 rounded-xl border flex items-center gap-3"
          style={{
            backgroundColor: 'var(--bb-color-status-positive-muted, rgba(34, 197, 94, 0.1))',
            borderColor: 'var(--bb-color-status-positive)',
          }}
        >
          <Check className="w-5 h-5 text-[color:var(--bb-color-status-positive)]" />
          <div>
            <p className="text-sm font-medium text-[color:var(--bb-color-status-positive)]">
              Ready to import
            </p>
            <p className="text-xs text-[color:var(--bb-color-text-muted)]">
              Click "Start Import" to begin importing {stats.rowCount.toLocaleString()} records
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportDetailsStep;
