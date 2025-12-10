import { useState, useMemo } from 'react';
import {
  Check,
  AlertTriangle,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ENTITY_TYPES, getUnmappedRequiredFields } from './importFieldDefinitions';

const ImportMapStep = ({
  selectedTypes,
  parsedData,
  mappings,
  onMappingsChange,
  overwriteSettings,
  onOverwriteSettingsChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDropdown, setExpandedDropdown] = useState(null);

  // Get all available fields from selected entity types
  const availableFields = useMemo(() => {
    const fields = [];
    selectedTypes.forEach(typeId => {
      const entity = ENTITY_TYPES[typeId];
      if (entity) {
        entity.fields.forEach(field => {
          if (!fields.find(f => f.key === field.key)) {
            fields.push({
              ...field,
              entityType: typeId,
              entityLabel: entity.label,
            });
          }
        });
      }
    });
    return fields;
  }, [selectedTypes]);

  // Get required fields status
  const unmappedRequired = useMemo(() => {
    const all = [];
    selectedTypes.forEach(typeId => {
      all.push(...getUnmappedRequiredFields(mappings, typeId));
    });
    return all;
  }, [selectedTypes, mappings]);

  // Filter headers by search
  const filteredHeaders = useMemo(() => {
    if (!parsedData?.headers) return [];
    if (!searchQuery) return parsedData.headers;
    const q = searchQuery.toLowerCase();
    return parsedData.headers.filter(h =>
      h.toLowerCase().includes(q) ||
      mappings[h]?.toLowerCase().includes(q)
    );
  }, [parsedData?.headers, searchQuery, mappings]);

  // Count mapped columns
  const mappedCount = Object.values(mappings).filter(Boolean).length;
  const totalColumns = parsedData?.headers?.length || 0;

  const handleMappingChange = (header, fieldKey) => {
    onMappingsChange({
      ...mappings,
      [header]: fieldKey,
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
      .map(row => row[header])
      .filter(v => v !== undefined && v !== null && v !== '')
      .slice(0, 3);
  };

  const getFieldLabel = (fieldKey) => {
    const field = availableFields.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  };

  const isFieldRequired = (fieldKey) => {
    return availableFields.find(f => f.key === fieldKey)?.required || false;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">
          Map your columns to BarkBase fields
        </h2>
        <p className="mt-2 text-sm text-[color:var(--bb-color-text-muted)]">
          Match each column from your file to the corresponding BarkBase field
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-medium text-[color:var(--bb-color-text-primary)]">{mappedCount}</span>
            <span className="text-[color:var(--bb-color-text-muted)]"> of {totalColumns} columns mapped</span>
          </div>

          {unmappedRequired.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-[color:var(--bb-color-status-warning)]">
              <AlertTriangle className="w-4 h-4" />
              <span>{unmappedRequired.length} required field{unmappedRequired.length !== 1 ? 's' : ''} unmapped</span>
            </div>
          )}
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

      {/* Required fields warning */}
      {unmappedRequired.length > 0 && (
        <div
          className="p-3 rounded-lg border flex items-start gap-3"
          style={{
            backgroundColor: 'var(--bb-color-status-warning-muted, rgba(234, 179, 8, 0.1))',
            borderColor: 'var(--bb-color-status-warning)',
          }}
        >
          <AlertTriangle className="w-5 h-5 text-[color:var(--bb-color-status-warning)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[color:var(--bb-color-status-warning)]">
              Required fields need mapping
            </p>
            <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
              {unmappedRequired.map(f => f.label).join(', ')}
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
                <th className="px-4 py-3 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                  Column Header
                </th>
                <th className="px-4 py-3 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                  Preview
                </th>
                <th className="px-4 py-3 text-center font-medium text-[color:var(--bb-color-text-muted)] border-b w-16" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                  Mapped
                </th>
                <th className="px-4 py-3 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b min-w-[200px]" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                  Import As
                </th>
                <th className="px-4 py-3 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b min-w-[180px]" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                  If Exists
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHeaders.map((header, idx) => {
                const currentMapping = mappings[header];
                const isMapped = !!currentMapping;
                const sampleValues = getSampleValues(header);

                return (
                  <tr
                    key={header}
                    className={cn(
                      'transition-colors',
                      idx % 2 === 0 ? 'bg-[color:var(--bb-color-bg-surface)]' : ''
                    )}
                    style={{ backgroundColor: idx % 2 !== 0 ? 'var(--bb-color-bg-elevated)' : undefined }}
                  >
                    {/* Column Header */}
                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                      <span className="font-medium text-[color:var(--bb-color-text-primary)]">
                        {header}
                      </span>
                    </td>

                    {/* Preview */}
                    <td className="px-4 py-3 border-b max-w-[200px]" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                      <div className="flex flex-wrap gap-1">
                        {sampleValues.length > 0 ? (
                          sampleValues.map((val, i) => (
                            <span
                              key={i}
                              className="inline-block px-2 py-0.5 rounded text-xs truncate max-w-[100px]"
                              style={{
                                backgroundColor: 'var(--bb-color-bg-elevated)',
                                color: 'var(--bb-color-text-muted)',
                              }}
                              title={val}
                            >
                              {val}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[color:var(--bb-color-text-muted)]">No values</span>
                        )}
                      </div>
                    </td>

                    {/* Mapped indicator */}
                    <td className="px-4 py-3 border-b text-center" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                      {isMapped ? (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center mx-auto"
                          style={{ backgroundColor: 'var(--bb-color-status-positive)' }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full border-2 mx-auto"
                          style={{ borderColor: 'var(--bb-color-border-default)' }}
                        />
                      )}
                    </td>

                    {/* Field dropdown */}
                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setExpandedDropdown(expandedDropdown === header ? null : header)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left transition-colors',
                            isMapped
                              ? 'border-[color:var(--bb-color-status-positive)] bg-[color:var(--bb-color-status-positive-muted,rgba(34,197,94,0.1))]'
                              : 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]'
                          )}
                        >
                          <span className={isMapped ? 'text-[color:var(--bb-color-text-primary)]' : 'text-[color:var(--bb-color-text-muted)]'}>
                            {isMapped ? getFieldLabel(currentMapping) : 'Select field...'}
                          </span>
                          <ChevronDown className={cn(
                            'w-4 h-4 transition-transform',
                            expandedDropdown === header && 'rotate-180'
                          )} />
                        </button>

                        {expandedDropdown === header && (
                          <div
                            className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto"
                            style={{
                              backgroundColor: 'var(--bb-color-bg-surface)',
                              borderColor: 'var(--bb-color-border-subtle)',
                            }}
                          >
                            {/* Don't import option */}
                            <button
                              type="button"
                              onClick={() => handleMappingChange(header, '')}
                              className={cn(
                                'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]',
                                !currentMapping && 'bg-[color:var(--bb-color-bg-elevated)]'
                              )}
                            >
                              <span className="text-[color:var(--bb-color-text-muted)]">Don't import this column</span>
                            </button>

                            <div className="border-t my-1" style={{ borderColor: 'var(--bb-color-border-subtle)' }} />

                            {/* Available fields */}
                            {availableFields.map((field) => (
                              <button
                                key={field.key}
                                type="button"
                                onClick={() => handleMappingChange(header, field.key)}
                                className={cn(
                                  'w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]',
                                  currentMapping === field.key && 'bg-[color:var(--bb-color-accent-soft)]'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-[color:var(--bb-color-text-primary)]">{field.label}</span>
                                    {field.required && (
                                      <span className="ml-1 text-[color:var(--bb-color-status-negative)]">*</span>
                                    )}
                                  </div>
                                  {currentMapping === field.key && (
                                    <Check className="w-4 h-4 text-[color:var(--bb-color-accent)]" />
                                  )}
                                </div>
                                <p className="text-xs text-[color:var(--bb-color-text-muted)]">{field.entityLabel}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Overwrite setting */}
                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                      {isMapped && (
                        <select
                          value={overwriteSettings[header] || 'skip'}
                          onChange={(e) => handleOverwriteChange(header, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border text-sm bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)]"
                          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                        >
                          <option value="skip">Don't overwrite</option>
                          <option value="overwrite">Overwrite existing</option>
                        </select>
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
      {filteredHeaders.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">
            No columns match "{searchQuery}"
          </p>
        </div>
      )}
    </div>
  );
};

export default ImportMapStep;
