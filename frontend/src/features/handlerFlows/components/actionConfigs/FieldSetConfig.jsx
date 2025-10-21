import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';
import apiClient from '@/lib/apiClient';

const FieldSetConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [object, setObject] = useState(config?.object || 'owners');
  const [field, setField] = useState(config?.field || '');
  const [valueMode, setValueMode] = useState(config?.valueMode || 'static'); // 'static', 'property', 'actionDate', 'clear'
  const [staticValue, setStaticValue] = useState(config?.value || '');
  const [propertyValue, setPropertyValue] = useState(config?.propertyValue || '');
  const [dateValue, setDateValue] = useState(config?.dateValue || '');
  const [errors, setErrors] = useState([]);

  // Property fetching
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  // Selected field metadata
  const [selectedFieldMeta, setSelectedFieldMeta] = useState(null);

  // Fetch properties when object changes
  useEffect(() => {
    const fetchProperties = async () => {
      if (!object) return;

      setLoadingProperties(true);
      try {
        const response = await apiClient(`/api/v1/settings/properties?object=${object}`);
        console.log('[FieldSetConfig] Properties response:', response);

        // Flatten properties from groups
        const allProps = [];
        if (response?.groups) {
          response.groups.forEach(group => {
            if (group.properties) {
              allProps.push(...group.properties);
            }
          });
        }

        console.log('[FieldSetConfig] Total properties loaded:', allProps.length);
        setProperties(allProps);
      } catch (error) {
        console.error('[FieldSetConfig] Failed to fetch properties:', error);
        setProperties([]);
      } finally {
        setLoadingProperties(false);
      }
    };

    fetchProperties();
  }, [object]);

  // Update selected field metadata when field changes
  useEffect(() => {
    if (field && properties.length > 0) {
      const fieldMeta = properties.find(p => p.name === field);
      setSelectedFieldMeta(fieldMeta);
    } else {
      setSelectedFieldMeta(null);
    }
  }, [field, properties]);

  const handleObjectChange = (newObject) => {
    setObject(newObject);
    setField(''); // Reset field when object changes
    setSelectedFieldMeta(null);
    setFieldSearchQuery(''); // Clear search
    setShowFieldDropdown(false); // Close dropdown
  };

  const handleFieldSelect = (property) => {
    setField(property.name);
    setSelectedFieldMeta(property);
    setShowFieldDropdown(false);
    setFieldSearchQuery(''); // Clear search when closing
  };

  // Immutable system fields that should not be editable
  const IMMUTABLE_FIELDS = ['id', 'created_at', 'updated_at'];

  const filteredProperties = properties.filter(prop => {
    // Filter out immutable system fields
    if (IMMUTABLE_FIELDS.includes(prop.name)) {
      return false;
    }

    // Apply search filter
    const searchLower = fieldSearchQuery.toLowerCase();
    return (
      prop.label.toLowerCase().includes(searchLower) ||
      prop.name.toLowerCase().includes(searchLower) ||
      (prop.description && prop.description.toLowerCase().includes(searchLower))
    );
  });

  // Debug logging
  useEffect(() => {
    console.log('[FieldSetConfig] State:', {
      showFieldDropdown,
      loadingProperties,
      propertiesCount: properties.length,
      filteredCount: filteredProperties.length,
      fieldSearchQuery,
    });
  }, [showFieldDropdown, loadingProperties, properties, filteredProperties, fieldSearchQuery]);

  const handleSave = () => {
    let value;

    if (valueMode === 'clear') {
      value = null;
    } else if (valueMode === 'property') {
      value = { type: 'property', value: propertyValue };
    } else if (valueMode === 'actionDate') {
      value = { type: 'actionDate' };
    } else if (valueMode === 'static') {
      // For enums, use the staticValue directly
      // For other types, parse appropriately
      if (selectedFieldMeta?.type === 'enum') {
        value = staticValue;
      } else if (selectedFieldMeta?.type === 'date' || selectedFieldMeta?.type === 'datetime') {
        value = dateValue || staticValue;
      } else {
        value = staticValue;
      }
    }

    const newConfig = {
      object,
      field,
      valueMode,
      value,
      ...(valueMode === 'property' && { propertyValue }),
      ...(valueMode === 'static' && selectedFieldMeta?.type === 'date' && { dateValue }),
    };

    const validationErrors = validateActionConfig('field.set', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'field.set',
      config: newConfig,
      label: `Set ${selectedFieldMeta?.label || field}`,
    });
  };

  // Render value input based on field type
  const renderValueInput = () => {
    if (!selectedFieldMeta) {
      return (
        <div className="text-xs text-muted p-3 bg-background border border-border rounded">
          Select a field to configure its value
        </div>
      );
    }

    const fieldType = selectedFieldMeta.type;

    // Date/DateTime fields
    if (fieldType === 'date' || fieldType === 'datetime') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="actionDate"
              name="dateMode"
              checked={valueMode === 'actionDate'}
              onChange={() => setValueMode('actionDate')}
              className="w-4 h-4"
            />
            <label htmlFor="actionDate" className="text-xs text-text">
              Use action completion date
            </label>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="radio"
              id="specificDate"
              name="dateMode"
              checked={valueMode === 'static'}
              onChange={() => setValueMode('static')}
              className="w-4 h-4 mt-1.5"
            />
            <div className="flex-1">
              <label htmlFor="specificDate" className="text-xs text-text block mb-1">
                Choose date
              </label>
              <input
                type={fieldType === 'datetime' ? 'datetime-local' : 'date'}
                value={dateValue}
                onChange={(e) => {
                  setDateValue(e.target.value);
                  setValueMode('static');
                }}
                disabled={valueMode !== 'static'}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="radio"
              id="propertyDate"
              name="dateMode"
              checked={valueMode === 'property'}
              onChange={() => setValueMode('property')}
              className="w-4 h-4 mt-1.5"
            />
            <div className="flex-1">
              <label htmlFor="propertyDate" className="text-xs text-text block mb-1">
                Use property value
              </label>
              <select
                value={propertyValue}
                onChange={(e) => {
                  setPropertyValue(e.target.value);
                  setValueMode('property');
                }}
                disabled={valueMode !== 'property'}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text disabled:opacity-50"
              >
                <option value="">Select property...</option>
                {properties
                  .filter(p => p.type === 'date' || p.type === 'datetime')
                  .map(p => (
                    <option key={p.name} value={p.name}>{p.label}</option>
                  ))
                }
              </select>
            </div>
          </div>
        </div>
      );
    }

    // Enum fields
    if (fieldType === 'enum') {
      const choices = selectedFieldMeta.options?.choices || [];
      return (
        <div>
          <select
            value={staticValue}
            onChange={(e) => {
              setStaticValue(e.target.value);
              setValueMode('static');
            }}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          >
            <option value="">Select value...</option>
            {choices.map(choice => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        </div>
      );
    }

    // Number/Currency fields
    if (fieldType === 'number' || fieldType === 'currency') {
      return (
        <div>
          <input
            type="number"
            value={staticValue}
            onChange={(e) => {
              setStaticValue(e.target.value);
              setValueMode('static');
            }}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            placeholder={fieldType === 'currency' ? 'Amount in cents' : 'Enter number'}
          />
          {fieldType === 'currency' && (
            <div className="text-xs text-muted mt-1">Enter amount in cents (e.g., 1000 = $10.00)</div>
          )}
        </div>
      );
    }

    // Boolean fields
    if (fieldType === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={staticValue === 'true' || staticValue === true}
            onChange={(e) => {
              setStaticValue(e.target.checked ? 'true' : 'false');
              setValueMode('static');
            }}
            className="w-4 h-4"
          />
          <label className="text-xs text-text">Set to true</label>
        </div>
      );
    }

    // Text/String fields (default)
    return (
      <div>
        <input
          type="text"
          value={staticValue}
          onChange={(e) => {
            setStaticValue(e.target.value);
            setValueMode('static');
          }}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder={`Enter ${fieldType} value`}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Set Field Value Configuration</h3>

        <div className="space-y-3">
          {/* Object Selector */}
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Object *</label>
            <select
              value={object}
              onChange={(e) => handleObjectChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="owners">Owner</option>
              <option value="pets">Pet</option>
              <option value="bookings">Booking</option>
              <option value="invoices">Invoice</option>
              <option value="payments">Payment</option>
              <option value="tickets">Ticket</option>
            </select>
          </div>

          {/* Field Name Searchable Dropdown */}
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Field Name *</label>
            <div className="relative">
              {/* Dropdown Button */}
              <button
                type="button"
                onClick={() => setShowFieldDropdown(!showFieldDropdown)}
                disabled={loadingProperties}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text text-left flex items-center justify-between hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <span className={selectedFieldMeta ? 'text-text' : 'text-muted'}>
                  {loadingProperties ? 'Loading properties...' : selectedFieldMeta ? selectedFieldMeta.label : 'Select a property...'}
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Panel */}
              {showFieldDropdown && !loadingProperties && properties.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg">
                  {/* Search box inside dropdown */}
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="text"
                        value={fieldSearchQuery}
                        onChange={(e) => setFieldSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Property list */}
                  <div className="max-h-64 overflow-y-auto">
                    {filteredProperties.length > 0 ? (
                      filteredProperties.map((property) => (
                        <button
                          key={property.recordId}
                          type="button"
                          onClick={() => handleFieldSelect(property)}
                          className="w-full text-left px-3 py-2 hover:bg-primary/10 transition-colors border-b border-border last:border-b-0"
                        >
                          <div className="text-sm font-medium text-text">{property.label}</div>
                          <div className="text-xs text-muted">
                            {property.name} • {property.type}
                            {property.system && <span className="ml-1 text-blue-400">(system)</span>}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted">No properties found</div>
                    )}
                  </div>
                </div>
              )}

              {/* Click outside to close */}
              {showFieldDropdown && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowFieldDropdown(false);
                    setFieldSearchQuery('');
                  }}
                />
              )}
            </div>
            {selectedFieldMeta && (
              <div className="text-xs text-muted mt-1">
                {selectedFieldMeta.description}
              </div>
            )}
          </div>

          {/* Value Input (type-specific) */}
          {field && (
            <div>
              <label className="text-xs font-medium text-text mb-1 block">Value *</label>
              {renderValueInput()}
            </div>
          )}

          {/* Clear Property Checkbox */}
          {field && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="clearValue"
                  checked={valueMode === 'clear'}
                  onChange={(e) => setValueMode(e.target.checked ? 'clear' : 'static')}
                  className="w-4 h-4"
                />
                <label htmlFor="clearValue" className="text-xs text-text">
                  Clear existing property value
                </label>
              </div>
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
            <div className="text-xs font-medium text-red-400 mb-1">Validation Errors:</div>
            <ul className="text-xs text-red-300 list-disc list-inside">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border">
        <Button onClick={handleSave} variant="primary" size="sm" className="w-full">
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export default FieldSetConfig;
