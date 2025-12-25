import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Check,
  AlertTriangle,
  Search,
  ChevronDown,
  Filter,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import StyledSelect from '@/components/ui/StyledSelect';
import {
  ENTITY_TYPES,
  REQUIRED_FIELDS,
  getUnmappedRequiredFields,
  getImportAsOptions,
  getAssociationPropertyOptions,
  getPropertyOptions,
} from './importFieldDefinitions';

/**
 * enterprise Import Mapping Step
 *
 * Each column gets TWO dropdowns:
 * 1. "Import As" - Choose: [Entity] properties, Association, or Don't import
 * 2. "BarkBase Property" - Either entity field OR association identifier
 *
 * KEY INSIGHT: When importing Pets with owner_email column:
 * - Import As: "Association"
 * - Property: "Email (Owners)"
 * This does NOT require First Name/Last Name because we're FINDING an owner, not CREATING one.
 */
const ImportMapStep = ({
  selectedTypes,
  parsedData,
  mappings,
  onMappingsChange,
  overwriteSettings,
  onOverwriteSettingsChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDropdown, setExpandedDropdown] = useState(null); // 'importAs-{header}' or 'property-{header}'
  const dropdownRef = useRef(null);

  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'mapped', 'unmapped', 'associations'

  const primaryType = selectedTypes[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setExpandedDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get "Import As" options based on selected types
  const importAsOptions = useMemo(() => {
    return getImportAsOptions(selectedTypes, primaryType);
  }, [selectedTypes, primaryType]);

  // Get association property options (unique identifiers of associable objects)
  const associationOptions = useMemo(() => {
    return getAssociationPropertyOptions(primaryType);
  }, [primaryType]);

  // Get property options for each entity type
  const propertyOptionsByType = useMemo(() => {
    const result = {};
    selectedTypes.forEach(type => {
      result[type] = getPropertyOptions(type);
    });
    return result;
  }, [selectedTypes]);

  // Required fields for primary type only
  const unmappedRequired = useMemo(() => {
    return getUnmappedRequiredFields(mappings, selectedTypes);
  }, [mappings, selectedTypes]);

  // Filter headers by search and status
  const filteredHeaders = useMemo(() => {
    if (!parsedData?.headers) return [];

    let headers = parsedData.headers;

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      headers = headers.filter(h => {
        const mapping = mappings[h];
        const lowerHeader = h.toLowerCase();
        if (lowerHeader.includes(q)) return true;
        if (mapping?.property?.toLowerCase().includes(q)) return true;
        if (mapping?.importAs?.toLowerCase().includes(q)) return true;
        return false;
      });
    }

    // Filter by mapping status
    if (statusFilter === 'mapped') {
      headers = headers.filter(h => {
        const m = mappings[h];
        return m && m.importAs && m.importAs !== 'skip' && m.property;
      });
    } else if (statusFilter === 'unmapped') {
      headers = headers.filter(h => {
        const m = mappings[h];
        return !m || !m.importAs || m.importAs === 'skip' || !m.property;
      });
    } else if (statusFilter === 'associations') {
      headers = headers.filter(h => mappings[h]?.importAs === 'association');
    }

    return headers;
  }, [parsedData?.headers, searchQuery, mappings, statusFilter]);

  // Count statistics
  const stats = useMemo(() => {
    const total = parsedData?.headers?.length || 0;
    let mapped = 0;
    let associations = 0;
    let skipped = 0;

    Object.values(mappings).forEach(m => {
      if (!m || m.importAs === 'skip') {
        skipped++;
      } else if (m.importAs === 'association' && m.property) {
        associations++;
        mapped++;
      } else if (m.property) {
        mapped++;
      }
    });

    return { total, mapped, associations, skipped };
  }, [parsedData?.headers, mappings]);

  // Handle "Import As" change
  const handleImportAsChange = (header, value) => {
    const currentMapping = mappings[header] || {};

    // If changing to 'skip', clear everything
    if (value === 'skip') {
      onMappingsChange({
        ...mappings,
        [header]: { importAs: 'skip', property: null, entityType: null, field: null },
      });
    }
    // If changing to 'association', clear property (user must select new one)
    else if (value === 'association') {
      onMappingsChange({
        ...mappings,
        [header]: { importAs: 'association', property: null, entityType: null, field: null },
      });
    }
    // If changing to entity properties, clear property if it was an association
    else {
      const entityType = value.replace('_properties', '');
      onMappingsChange({
        ...mappings,
        [header]: {
          importAs: value,
          property: currentMapping.importAs === value ? currentMapping.property : null,
          entityType: currentMapping.importAs === value ? currentMapping.entityType : entityType,
          field: currentMapping.importAs === value ? currentMapping.field : null,
        },
      });
    }

    setExpandedDropdown(null);
  };

  // Handle property selection
  const handlePropertyChange = (header, option) => {
    const currentMapping = mappings[header] || {};

    onMappingsChange({
      ...mappings,
      [header]: {
        ...currentMapping,
        property: option.value,
        entityType: option.entityType,
        field: option.field,
      },
    });

    setExpandedDropdown(null);
  };

  const handleOverwriteChange = (header, value) => {
    onOverwriteSettingsChange({
      ...overwriteSettings,
      [header]: value,
    });
  };

  const getSampleValues = (header) => {
    if (!parsedData?.sampleRows) return [];
    return parsedData.sampleRows
      .map((row) => row[header])
      .filter((v) => v !== undefined && v !== null && v !== '')
      .slice(0, 3);
  };

  // Get display label for current import as selection
  const getImportAsLabel = (mapping) => {
    if (!mapping?.importAs || mapping.importAs === 'skip') {
      return "Don't import column";
    }
    if (mapping.importAs === 'association') {
      return 'Association';
    }
    const option = importAsOptions.find(o => o.value === mapping.importAs);
    return option?.label || mapping.importAs;
  };

  // Get display label for current property selection
  const getPropertyLabel = (mapping) => {
    if (!mapping?.property) return 'Select a property';

    if (mapping.importAs === 'association') {
      const option = associationOptions.find(o => o.value === mapping.property);
      return option?.label || mapping.property;
    }

    const entityType = mapping.importAs?.replace('_properties', '');
    const options = propertyOptionsByType[entityType] || [];
    const option = options.find(o => o.value === mapping.property);
    return option?.label || mapping.property;
  };

  // Get property options based on current import as selection
  const getPropertyOptionsForMapping = (mapping) => {
    if (!mapping?.importAs || mapping.importAs === 'skip') {
      return [];
    }

    if (mapping.importAs === 'association') {
      return associationOptions;
    }

    const entityType = mapping.importAs.replace('_properties', '');
    return propertyOptionsByType[entityType] || [];
  };

  // Check if a column is fully mapped
  const isMapped = (mapping) => {
    if (!mapping || mapping.importAs === 'skip') return false;
    return !!mapping.property;
  };

  return (
    <div className="space-y-6" ref={dropdownRef}>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">
          Map your columns to BarkBase fields
        </h2>
        <p className="mt-2 text-sm text-[color:var(--bb-color-text-muted)]">
          For each column, select what type of data it contains and which BarkBase property it maps to
        </p>
      </div>

      {/* Summary bar */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        <div className="flex items-center gap-6">
          <div className="text-sm">
            <span className="font-semibold text-[color:var(--bb-color-status-positive)]">
              {stats.mapped}
            </span>
            <span className="text-[color:var(--bb-color-text-muted)]">
              {' '}of {stats.total} columns mapped
            </span>
          </div>

          {stats.associations > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-[color:var(--bb-color-accent)]">
              <Link2 className="w-4 h-4" />
              <span>{stats.associations} association{stats.associations !== 1 ? 's' : ''}</span>
            </div>
          )}

          {unmappedRequired.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-[color:var(--bb-color-status-warning)]">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {unmappedRequired.length} required field
                {unmappedRequired.length !== 1 ? 's' : ''} unmapped
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[color:var(--bb-color-text-muted)]" />
            <div className="min-w-[160px]">
              <StyledSelect
                options={[
                  { value: 'all', label: 'All columns' },
                  { value: 'mapped', label: 'Mapped only' },
                  { value: 'unmapped', label: 'Unmapped only' },
                  { value: 'associations', label: 'Associations only' },
                ]}
                value={statusFilter}
                onChange={(opt) => setStatusFilter(opt?.value || 'all')}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--bb-color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search columns..."
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)]"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            />
          </div>
        </div>
      </div>

      {/* Required fields warning - ONLY for primary type */}
      {unmappedRequired.length > 0 && (
        <div
          className="p-4 rounded-xl border flex items-start gap-3"
          style={{
            backgroundColor:
              'var(--bb-color-status-warning-muted, rgba(234, 179, 8, 0.1))',
            borderColor: 'var(--bb-color-status-warning)',
          }}
        >
          <AlertTriangle className="w-5 h-5 text-[color:var(--bb-color-status-warning)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[color:var(--bb-color-status-warning)]">
              Required {ENTITY_TYPES[primaryType]?.labelSingular || primaryType} fields need mapping
            </p>
            <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
              Map the following required fields to import {ENTITY_TYPES[primaryType]?.label || primaryType}:{' '}
              <span className="font-medium">
                {unmappedRequired.map((f) => f.label).join(', ')}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                <th
                  className="px-4 py-3 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  Column Header From File
                </th>
                <th
                  className="px-4 py-3 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  Preview Information
                </th>
                <th
                  className="px-4 py-3 text-center font-medium text-[color:var(--bb-color-text-muted)] border-b w-20"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  Mapped
                </th>
                <th
                  className="px-4 py-3 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b min-w-[180px]"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  Import As
                </th>
                <th
                  className="px-4 py-3 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b min-w-[200px]"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  BarkBase Property
                </th>
                <th
                  className="px-4 py-3 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b min-w-[140px]"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  Overwrite
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHeaders.map((header, idx) => {
                const currentMapping = mappings[header] || {};
                const columnIsMapped = isMapped(currentMapping);
                const sampleValues = getSampleValues(header);
                const isAssociation = currentMapping.importAs === 'association';
                const propertyOptions = getPropertyOptionsForMapping(currentMapping);

                return (
                  <tr
                    key={header}
                    className="transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]"
                    style={{
                      backgroundColor:
                        idx % 2 !== 0
                          ? 'var(--bb-color-bg-elevated)'
                          : 'var(--bb-color-bg-surface)',
                    }}
                  >
                    {/* Column Header */}
                    <td
                      className="px-4 py-3 border-b"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      <span className="font-medium text-[color:var(--bb-color-text-primary)]">
                        {header}
                      </span>
                    </td>

                    {/* Preview - 3 sample values stacked vertically */}
                    <td
                      className="px-4 py-3 border-b max-w-[200px]"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      <div className="flex flex-col gap-1">
                        {sampleValues.length > 0 ? (
                          sampleValues.map((val, i) => (
                            <span
                              key={i}
                              className="inline-block px-2 py-0.5 rounded text-xs truncate"
                              style={{
                                backgroundColor: 'var(--bb-color-bg-surface)',
                                color: 'var(--bb-color-text-muted)',
                                maxWidth: '180px',
                              }}
                              title={String(val)}
                            >
                              {String(val)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[color:var(--bb-color-text-muted)]">
                            No sample values
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Mapped indicator */}
                    <td
                      className="px-4 py-3 border-b text-center"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      {columnIsMapped ? (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center mx-auto"
                          style={{
                            backgroundColor: isAssociation
                              ? 'var(--bb-color-accent)'
                              : 'var(--bb-color-status-positive)',
                          }}
                        >
                          {isAssociation ? (
                            <Link2 className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full border-2 mx-auto"
                          style={{ borderColor: 'var(--bb-color-border-default)' }}
                        />
                      )}
                    </td>

                    {/* Import As dropdown */}
                    <td
                      className="px-4 py-3 border-b"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDropdown(
                              expandedDropdown === `importAs-${header}` ? null : `importAs-${header}`
                            )
                          }
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left transition-colors',
                            isAssociation
                              ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft,rgba(59,130,246,0.1))]'
                              : currentMapping.importAs && currentMapping.importAs !== 'skip'
                              ? 'border-[color:var(--bb-color-border-default)] bg-[color:var(--bb-color-bg-surface)]'
                              : 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]'
                          )}
                        >
                          <span
                            className={
                              currentMapping.importAs && currentMapping.importAs !== 'skip'
                                ? 'text-[color:var(--bb-color-text-primary)]'
                                : 'text-[color:var(--bb-color-text-muted)]'
                            }
                          >
                            {getImportAsLabel(currentMapping)}
                          </span>
                          <ChevronDown
                            className={cn(
                              'w-4 h-4 ml-2 flex-shrink-0 transition-transform',
                              expandedDropdown === `importAs-${header}` && 'rotate-180'
                            )}
                          />
                        </button>

                        {expandedDropdown === `importAs-${header}` && (
                          <div
                            className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg border shadow-lg max-h-64 overflow-y-auto"
                            style={{
                              backgroundColor: 'var(--bb-color-bg-surface)',
                              borderColor: 'var(--bb-color-border-subtle)',
                            }}
                          >
                            {importAsOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleImportAsChange(header, option.value)}
                                className={cn(
                                  'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]',
                                  currentMapping.importAs === option.value &&
                                    'bg-[color:var(--bb-color-accent-soft)]'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {option.isAssociation && (
                                      <Link2 className="w-4 h-4 text-[color:var(--bb-color-accent)]" />
                                    )}
                                    <span
                                      className={
                                        option.isSkip
                                          ? 'text-[color:var(--bb-color-text-muted)]'
                                          : 'text-[color:var(--bb-color-text-primary)]'
                                      }
                                    >
                                      {option.label}
                                    </span>
                                  </div>
                                  {currentMapping.importAs === option.value && (
                                    <Check className="w-4 h-4 text-[color:var(--bb-color-accent)]" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Property dropdown */}
                    <td
                      className="px-4 py-3 border-b"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      {currentMapping.importAs && currentMapping.importAs !== 'skip' && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDropdown(
                                expandedDropdown === `property-${header}` ? null : `property-${header}`
                              )
                            }
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left transition-colors',
                              currentMapping.property
                                ? 'border-[color:var(--bb-color-status-positive)] bg-[color:var(--bb-color-status-positive-muted,rgba(34,197,94,0.1))]'
                                : 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]'
                            )}
                          >
                            <span
                              className={
                                currentMapping.property
                                  ? 'text-[color:var(--bb-color-text-primary)]'
                                  : 'text-[color:var(--bb-color-text-muted)]'
                              }
                            >
                              {getPropertyLabel(currentMapping)}
                            </span>
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 ml-2 flex-shrink-0 transition-transform',
                                expandedDropdown === `property-${header}` && 'rotate-180'
                              )}
                            />
                          </button>

                          {expandedDropdown === `property-${header}` && (
                            <div
                              className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg border shadow-lg max-h-64 overflow-y-auto"
                              style={{
                                backgroundColor: 'var(--bb-color-bg-surface)',
                                borderColor: 'var(--bb-color-border-subtle)',
                              }}
                            >
                              {propertyOptions.length > 0 ? (
                                propertyOptions.map((option) => {
                                  const isRequired = REQUIRED_FIELDS[primaryType]?.includes(option.field);
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handlePropertyChange(header, option)}
                                      className={cn(
                                        'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]',
                                        currentMapping.property === option.value &&
                                          'bg-[color:var(--bb-color-accent-soft)]'
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[color:var(--bb-color-text-primary)]">
                                            {option.label}
                                          </span>
                                          {isRequired && (
                                            <span className="text-[color:var(--bb-color-status-negative)]">
                                              *
                                            </span>
                                          )}
                                        </div>
                                        {currentMapping.property === option.value && (
                                          <Check className="w-4 h-4 text-[color:var(--bb-color-accent)]" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-sm text-[color:var(--bb-color-text-muted)]">
                                  No properties available
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Overwrite setting */}
                    <td
                      className="px-4 py-3 border-b"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      {columnIsMapped && !isAssociation && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={overwriteSettings[header] === 'skip'}
                            onChange={(e) =>
                              handleOverwriteChange(
                                header,
                                e.target.checked ? 'skip' : 'overwrite'
                              )
                            }
                            className="w-4 h-4 rounded border-[color:var(--bb-color-border-default)] text-[color:var(--bb-color-accent)]"
                          />
                          <span className="text-sm text-[color:var(--bb-color-text-primary)]">
                            Don't overwrite
                          </span>
                        </label>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* No results */}
      {filteredHeaders.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">
            {searchQuery
              ? `No columns match "${searchQuery}"`
              : statusFilter === 'mapped'
              ? 'No mapped columns'
              : statusFilter === 'unmapped'
              ? 'All columns are mapped'
              : statusFilter === 'associations'
              ? 'No association columns'
              : 'No columns found'}
          </p>
        </div>
      )}

      {/* Association info */}
      {stats.associations > 0 && (
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'var(--bb-color-accent-soft, rgba(59,130,246,0.1))',
            borderColor: 'var(--bb-color-accent)',
          }}
        >
          <div className="flex items-start gap-3">
            <Link2 className="w-5 h-5 text-[color:var(--bb-color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[color:var(--bb-color-accent)]">
                {stats.associations} association column{stats.associations !== 1 ? 's' : ''} detected
              </p>
              <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                These columns will be used to link {ENTITY_TYPES[primaryType]?.label} to existing records.
                If a matching record is not found, an error will be logged but the import will continue.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportMapStep;
