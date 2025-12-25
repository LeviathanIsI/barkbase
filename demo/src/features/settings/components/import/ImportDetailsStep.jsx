import { useMemo, useState } from 'react';
import {
  Check,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import StyledSelect from '@/components/ui/StyledSelect';
import {
  ENTITY_TYPES,
  REQUIRED_FIELDS,
  getUnmappedRequiredFields,
  getMappingStats,
} from './importFieldDefinitions';

/**
 * enterprise Import Details/Review Step
 *
 * Shows summary of what will be imported:
 * - Records count
 * - Mapped columns (properties + associations)
 * - Required field validation (ONLY for primary type)
 * - Import options
 */
const ImportDetailsStep = ({
  selectedTypes,
  parsedData,
  mappings,
  importOptions,
  onImportOptionsChange,
  importModes,
}) => {
  const [showMappingDetails, setShowMappingDetails] = useState(false);

  const primaryType = selectedTypes[0];

  // Calculate summary stats using new mapping structure
  const stats = useMemo(() => {
    const mappingStats = getMappingStats(mappings, selectedTypes);
    const unmappedRequired = getUnmappedRequiredFields(mappings, selectedTypes);

    return {
      rowCount: parsedData?.rowCount || 0,
      mappedCount: mappingStats.propertyCount + mappingStats.associationCount,
      propertyCount: mappingStats.propertyCount,
      associationCount: mappingStats.associationCount,
      skippedCount: mappingStats.skippedCount,
      unmappedRequired,
      hasErrors: unmappedRequired.length > 0,
    };
  }, [selectedTypes, parsedData, mappings]);

  // Group mapped fields by entity type and associations
  const mappedByCategory = useMemo(() => {
    const result = {
      properties: {},
      associations: [],
    };

    // Group property mappings by entity type
    selectedTypes.forEach((typeId) => {
      result.properties[typeId] = [];
    });

    Object.entries(mappings).forEach(([header, mapping]) => {
      if (!mapping || mapping.importAs === 'skip') return;

      if (mapping.importAs === 'association') {
        result.associations.push({
          header,
          ...mapping,
        });
      } else {
        // Property mapping
        const entityType = mapping.entityType || mapping.importAs?.replace('_properties', '');
        if (entityType && result.properties[entityType]) {
          result.properties[entityType].push({
            header,
            ...mapping,
          });
        }
      }
    });

    return result;
  }, [selectedTypes, mappings]);

  const handleOptionChange = (key, value) => {
    onImportOptionsChange({
      ...importOptions,
      [key]: value,
    });
  };

  // Get unique fields for duplicate matching
  const uniqueFields = useMemo(() => {
    const fields = [];
    selectedTypes.forEach((typeId) => {
      const entity = ENTITY_TYPES[typeId];
      // Use email/id/name as default unique identifiers
      const possibleUnique = entity?.fields?.filter(f =>
        ['email', 'id', 'name'].includes(f.key)
      );
      possibleUnique?.forEach(f => {
        fields.push({
          entityType: typeId,
          entityLabel: entity.label,
          fieldKey: f.key,
          fieldLabel: f.label,
        });
      });
    });
    return fields;
  }, [selectedTypes]);

  // Get label for a field
  const getFieldLabel = (entityType, fieldKey) => {
    const entity = ENTITY_TYPES[entityType];
    const field = entity?.fields?.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Records */}
        <div
          className="p-5 rounded-xl border"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">
            Records to import
          </p>
          <p className="text-3xl font-bold text-[color:var(--bb-color-accent)] mt-2">
            {stats.rowCount.toLocaleString()}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
            {ENTITY_TYPES[primaryType]?.label || primaryType}
          </p>
        </div>

        {/* Properties mapped */}
        <div
          className="p-5 rounded-xl border"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">
            Properties mapped
          </p>
          <p className="text-3xl font-bold text-[color:var(--bb-color-status-positive)] mt-2">
            {stats.propertyCount}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
            fields to update
          </p>
        </div>

        {/* Associations */}
        <div
          className="p-5 rounded-xl border"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">
            Associations
          </p>
          <p className={cn(
            'text-3xl font-bold mt-2',
            stats.associationCount > 0
              ? 'text-[color:var(--bb-color-accent)]'
              : 'text-[color:var(--bb-color-text-muted)]'
          )}>
            {stats.associationCount}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
            links to create
          </p>
        </div>

        {/* Skipped columns */}
        <div
          className="p-5 rounded-xl border"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">
            Columns skipped
          </p>
          <p
            className={cn(
              'text-3xl font-bold mt-2',
              stats.skippedCount > 0
                ? 'text-[color:var(--bb-color-status-warning)]'
                : 'text-[color:var(--bb-color-text-primary)]'
            )}
          >
            {stats.skippedCount}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
            will not be imported
          </p>
        </div>
      </div>

      {/* Errors - Can't import (only for primary type) */}
      {stats.hasErrors && (
        <div
          className="p-5 rounded-xl border"
          style={{
            backgroundColor:
              'var(--bb-color-status-negative-muted, rgba(239, 68, 68, 0.1))',
            borderColor: 'var(--bb-color-status-negative)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[color:var(--bb-color-status-negative)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[color:var(--bb-color-status-negative)]">
                Cannot import - Required {ENTITY_TYPES[primaryType]?.labelSingular || primaryType} fields not mapped
              </p>
              <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                The following required fields have not been mapped:{' '}
                <span className="font-medium">
                  {stats.unmappedRequired.map((f) => f.label).join(', ')}
                </span>
              </p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-2">
                Please go back to the mapping step and map these fields before importing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Field mapping summary - collapsible */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <button
          type="button"
          onClick={() => setShowMappingDetails(!showMappingDetails)}
          className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}
        >
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
            Field mappings
          </h3>
          {showMappingDetails ? (
            <ChevronUp className="w-5 h-5 text-[color:var(--bb-color-text-muted)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[color:var(--bb-color-text-muted)]" />
          )}
        </button>

        {showMappingDetails && (
          <div
            className="p-5 border-t space-y-5"
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              backgroundColor: 'var(--bb-color-bg-elevated)',
            }}
          >
            {/* Property mappings by entity type */}
            {Object.entries(mappedByCategory.properties).map(([typeId, typeMappings]) => {
              if (typeMappings.length === 0) return null;
              const entity = ENTITY_TYPES[typeId];

              return (
                <div key={typeId}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bb-color-text-muted)] mb-3">
                    {entity?.label || typeId} Properties
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {typeMappings.map(({ header, field }) => {
                      const isRequired = REQUIRED_FIELDS[typeId]?.includes(field);
                      return (
                        <div
                          key={header}
                          className="flex items-center gap-2 text-sm p-2 rounded-lg"
                          style={{
                            backgroundColor: 'var(--bb-color-bg-surface)',
                          }}
                        >
                          <span className="text-[color:var(--bb-color-text-muted)] truncate flex-1">
                            {header}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-[color:var(--bb-color-text-muted)] flex-shrink-0" />
                          <span className="text-[color:var(--bb-color-text-primary)] font-medium truncate flex-1">
                            {getFieldLabel(typeId, field)}
                          </span>
                          {isRequired && (
                            <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-[color:var(--bb-color-status-positive-muted,rgba(34,197,94,0.1))] text-[color:var(--bb-color-status-positive)] flex-shrink-0">
                              Required
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Association mappings */}
            {mappedByCategory.associations.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bb-color-accent)] mb-3 flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5" />
                  Associations
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mappedByCategory.associations.map(({ header, entityType, field }) => (
                    <div
                      key={header}
                      className="flex items-center gap-2 text-sm p-2 rounded-lg"
                      style={{
                        backgroundColor: 'var(--bb-color-accent-soft, rgba(59,130,246,0.1))',
                      }}
                    >
                      <span className="text-[color:var(--bb-color-text-muted)] truncate flex-1">
                        {header}
                      </span>
                      <Link2 className="w-3.5 h-3.5 text-[color:var(--bb-color-accent)] flex-shrink-0" />
                      <span className="text-[color:var(--bb-color-accent)] font-medium truncate flex-1">
                        {getFieldLabel(entityType, field)} ({ENTITY_TYPES[entityType]?.labelSingular || entityType})
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-2">
                  Associations will link {ENTITY_TYPES[primaryType]?.label} to existing records.
                  If a matching record is not found, an error will be logged.
                </p>
              </div>
            )}

            {Object.values(mappedByCategory.properties).every(arr => arr.length === 0) &&
             mappedByCategory.associations.length === 0 && (
              <p className="text-sm text-[color:var(--bb-color-text-muted)] text-center py-4">
                No fields have been mapped
              </p>
            )}
          </div>
        )}
      </div>

      {/* Import options */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
            Import options
          </h3>
        </div>
        <div
          className="p-5 space-y-5"
          style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
        >
          {/* Skip duplicates with unique field selector */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={importOptions.skipDuplicates}
                onChange={(e) =>
                  handleOptionChange('skipDuplicates', e.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-[color:var(--bb-color-border-default)] text-[color:var(--bb-color-accent)]"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                  Skip duplicate records
                </span>
                <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5">
                  Skip records that match existing entries
                </p>
              </div>
            </label>

            {importOptions.skipDuplicates && uniqueFields.length > 0 && (
              <div className="ml-7 flex items-center gap-2">
                <span className="text-sm text-[color:var(--bb-color-text-muted)]">
                  Match by:
                </span>
                <div className="min-w-[180px]">
                  <StyledSelect
                    options={uniqueFields.map((f) => ({
                      value: f.fieldKey,
                      label: `${f.fieldLabel} (${f.entityLabel})`,
                    }))}
                    value={importOptions.uniqueIdentifier || uniqueFields[0]?.fieldKey}
                    onChange={(opt) =>
                      handleOptionChange('uniqueIdentifier', opt?.value || uniqueFields[0]?.fieldKey)
                    }
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Update existing */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={importOptions.updateExisting}
              onChange={(e) =>
                handleOptionChange('updateExisting', e.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-[color:var(--bb-color-border-default)] text-[color:var(--bb-color-accent)]"
            />
            <div>
              <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                Update existing records if found
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
              onChange={(e) =>
                handleOptionChange('createNewOnly', e.target.checked)
              }
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

      {/* Ready indicator */}
      {!stats.hasErrors ? (
        <div
          className="p-5 rounded-xl border flex items-center gap-4"
          style={{
            backgroundColor:
              'var(--bb-color-status-positive-muted, rgba(34, 197, 94, 0.1))',
            borderColor: 'var(--bb-color-status-positive)',
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--bb-color-status-positive)' }}
          >
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--bb-color-status-positive)]">
              Ready to import
            </p>
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              Click "Start Import" to begin importing{' '}
              {stats.rowCount.toLocaleString()} {ENTITY_TYPES[primaryType]?.label || 'records'}
              {stats.associationCount > 0 && ` with ${stats.associationCount} association${stats.associationCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="p-5 rounded-xl border flex items-center gap-4"
          style={{
            backgroundColor:
              'var(--bb-color-status-warning-muted, rgba(234, 179, 8, 0.1))',
            borderColor: 'var(--bb-color-status-warning)',
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--bb-color-status-warning)' }}
          >
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--bb-color-status-warning)]">
              Review warnings above before importing
            </p>
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              Required fields must be mapped to proceed
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportDetailsStep;
