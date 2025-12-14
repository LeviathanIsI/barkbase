import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import StyledSelect from '@/components/ui/StyledSelect';
import { cn } from '@/lib/cn';

const OBJECT_TYPE_LABELS = {
  pets: 'Pet',
  owners: 'Owner',
  bookings: 'Booking',
  invoices: 'Invoice',
  payments: 'Payment',
  tickets: 'Ticket',
};

const GROUP_LABELS = {
  basic_info: 'Basic Information',
  contact_info: 'Contact Information',
  identification: 'Identification',
  medical: 'Medical Information',
  financial: 'Financial',
  status: 'Status',
  notes: 'Notes',
  custom_fields: 'Custom Fields',
};

/**
 * PropertySelector - Reusable component for selecting properties
 * Used in workflows, filters, forms, and anywhere properties need to be referenced
 */
const PropertySelector = ({
  objectType,
  selectedProperty,
  onSelect,
  allowedTypes = null, // Filter by property types (e.g., ['string', 'number'])
  allowedGroups = null, // Filter by groups
  showSearch = true,
  showObjectSelector = false,
  placeholder = 'Select a property...',
  className = '',
}) => {
  const { fetchProperties, getPropertiesGrouped, loading } = useProperties();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentObjectType, setCurrentObjectType] = useState(objectType);

  // Fetch properties on mount
  useEffect(() => {
    if (currentObjectType) {
      fetchProperties(currentObjectType);
    }
  }, [currentObjectType, fetchProperties]);

  // Get and filter properties
  const filteredGroups = useMemo(() => {
    const groups = getPropertiesGrouped(currentObjectType);
    if (!groups || groups.length === 0) return [];

    let filtered = groups;

    // Filter by allowed groups
    if (allowedGroups) {
      filtered = filtered.filter((group) => allowedGroups.includes(group.recordId));
    }

    // Filter by search and allowed types
    filtered = filtered
      .map((group) => {
        let properties = group.properties || [];

        // Filter by allowed types
        if (allowedTypes) {
          properties = properties.filter((prop) => allowedTypes.includes(prop.type));
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          properties = properties.filter(
            (prop) =>
              prop.label.toLowerCase().includes(query) ||
              prop.name.toLowerCase().includes(query) ||
              prop.description?.toLowerCase().includes(query)
          );
        }

        return {
          ...group,
          properties,
        };
      })
      .filter((group) => group.properties.length > 0);

    return filtered;
  }, [getPropertiesGrouped, currentObjectType, allowedGroups, allowedTypes, searchQuery]);

  const isLoading = loading[currentObjectType];

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Object Type Selector */}
      {showObjectSelector && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            Filtering on
          </label>
          <StyledSelect
            options={Object.entries(OBJECT_TYPE_LABELS).map(([value, label]) => ({
              value,
              label: `${label} (Current Object)`,
            }))}
            value={currentObjectType}
            onChange={(opt) => setCurrentObjectType(opt?.value || currentObjectType)}
            isClearable={false}
            isSearchable={false}
          />
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Property Groups */}
      <div className="flex-1 overflow-y-auto max-h-96 border border-border rounded-lg bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-2 text-xs text-muted">Loading properties...</p>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">
            {searchQuery ? 'No properties match your search' : 'No properties available'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGroups.map((group) => (
              <div key={group.recordId} className="p-2">
                {/* Group Header */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider">
                  {GROUP_LABELS[group.id] || group.label}
                </div>

                {/* Properties */}
                <div className="space-y-0.5">
                  {group.properties.map((property) => (
                    <button
                      key={property.recordId}
                      onClick={() => onSelect(property)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                        selectedProperty?.recordId === property.recordId
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-text hover:bg-surface/80'
                      )}
                    >
                      <div className="font-medium">{property.label}</div>
                      {property.description && (
                        <div className="text-xs text-muted mt-0.5">
                          {property.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertySelector;
