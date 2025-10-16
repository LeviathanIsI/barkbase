import { Edit, MoreVertical, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

const PopulatedPropertiesView = ({ properties, selectedProperties, onSelectProperty, onSelectAll }) => {
  const handleSelectAll = (e) => {
    onSelectAll(e.target.checked);
  };

  const getFieldTypeLabel = (type) => {
    const typeMap = {
      string: 'Single-line text',
      text: 'Multi-line text',
      enum: 'Dropdown select',
      multi_enum: 'Multi-select checkboxes',
      boolean: 'Yes/No toggle',
      date: 'Date picker',
      number: 'Number',
      file: 'File upload'
    };
    return typeMap[type] || type;
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Header */}
      {selectedProperties.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedProperties.length} properties selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Archive Selected
              </Button>
              <Button variant="outline" size="sm">
                Change Group
              </Button>
              <Button variant="outline" size="sm">
                Duplicate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Select All Checkbox */}
        <div className="col-span-full flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <input
            type="checkbox"
            checked={selectedProperties.length === properties.length && properties.length > 0}
            onChange={handleSelectAll}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">
            Select All ({properties.length})
          </span>
        </div>

        {properties.map((property) => (
          <div
            key={property.recordId}
            className={`border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow ${
              selectedProperties.includes(property.recordId) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
          >
            {/* Property Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedProperties.includes(property.recordId)}
                  onChange={() => onSelectProperty(property.recordId)}
                  className="mt-1 rounded border-gray-300"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-lg">{property.label}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">Type: {getFieldTypeLabel(property.type)}</span>
                    {property.required && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <p className="text-sm text-gray-600 mb-3">{property.description}</p>
            )}

            {/* Usage Stats */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Used in:</span>
                <span className="text-gray-900">
                  {property.group ? `${property.group}` : 'Profiles'}
                  {property.showOnBookingForm && ', Booking forms'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Used by:</span>
                <span className={`font-medium ${getUsageColor(property.usagePercentage || 0)}`}>
                  {property.usageCount || 0} pets ({property.usagePercentage || 0}%)
                </span>
              </div>

              {/* Missing assignments warning */}
              {property.missingCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{property.missingCount} pets don't have this assigned</span>
                </div>
              )}
            </div>

            {/* Options Preview (for select fields) */}
            {property.options && property.options.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="text-xs text-gray-500 mb-2">
                  Options ({property.options.length}):
                </div>
                <div className="flex flex-wrap gap-1">
                  {property.options.slice(0, 4).map((option, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                    >
                      {option}
                    </span>
                  ))}
                  {property.options.length > 4 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                      +{property.options.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show More */}
      {properties.length >= 8 && (
        <div className="text-center py-4">
          <Button variant="outline">
            Show 4 More Properties
          </Button>
        </div>
      )}
    </div>
  );
};

export default PopulatedPropertiesView;
