import { Edit, MoreVertical, Lock, Shield, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';

const ACCESS_LEVEL_LABELS = {
  everyone_edit: 'Everyone can view and edit',
  everyone_view: 'Everyone can view',
  assigned_only: 'Assigned to users and teams',
  admin_only: 'Admins only',
};

const PopulatedPropertiesView = ({ properties, selectedProperties, onSelectProperty, onSelectAll, onEditProperty }) => {
  const handleSelectAll = (e) => {
    onSelectAll(e.target.checked);
  };

  const getFieldTypeLabel = (type) => {
    const typeMap = {
      string: 'Single-line text',
      text: 'Multi-line text',
      phone: 'Phone number',
      email: 'Email',
      url: 'URL',
      enum: 'Dropdown select',
      multi_enum: 'Multi-select checkboxes',
      radio: 'Radio select',
      boolean: 'Yes/No toggle',
      date: 'Date picker',
      datetime: 'Date and time',
      number: 'Number',
      currency: 'Currency',
      calculation: 'Calculation',
      rollup: 'Rollup',
      score: 'Score',
      file: 'File upload',
      user: 'User reference',
      json: 'JSON data',
      rich_text: 'Rich text editor',
    };
    return typeMap[type] || type;
  };

  const getFillRateColor = (fillRate) => {
    if (fillRate >= 70) return 'text-green-600';
    if (fillRate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-surface-border">
        <thead className="bg-gray-50 dark:bg-surface-secondary">
          <tr>
            <th scope="col" className="w-8 px-3 py-3">
              <input
                type="checkbox"
                checked={selectedProperties.length === properties.filter(p => !p.isSystem).length && properties.filter(p => !p.isSystem).length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 dark:border-surface-border"
              />
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Property Access
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Group
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider">
              Created By
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider text-right">
              Used In
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wider text-right">
              Fill Rate
            </th>
            <th scope="col" className="w-16 px-3 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-surface-primary divide-y divide-gray-200 dark:divide-surface-border">
          {properties.map((property) => (
            <tr key={property.recordId} className="hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors">
              {/* Checkbox */}
              <td className="px-3 py-4">
                {property.isSystem ? (
                  <div className="w-5 h-5 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : (
                  <input
                    type="checkbox"
                    checked={selectedProperties.includes(property.recordId)}
                    onChange={() => onSelectProperty(property.recordId)}
                    className="rounded border-gray-300 dark:border-surface-border"
                  />
                )}
              </td>

              {/* Name */}
              <td className="px-6 py-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditProperty && onEditProperty(property)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-200 text-left"
                      >
                        {property.label}
                      </button>
                      {property.isRequired && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-text-secondary mt-1">
                      <span className="font-mono text-xs">{property.name}</span> · {getFieldTypeLabel(property.type)}
                    </div>
                  </div>
                </div>
              </td>

              {/* Property Access */}
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-text-primary">
                {ACCESS_LEVEL_LABELS[property.accessLevel || 'everyone_edit']}
              </td>

              {/* Group */}
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-text-primary">
                {property.group || 'General'}
              </td>

              {/* Created By */}
              <td className="px-6 py-4 text-sm text-gray-700 dark:text-text-primary">
                {property.isSystem ? 'BarkBase' : property.createdBy || 'Unknown'}
              </td>

              {/* Used In */}
              <td className="px-6 py-4 text-sm text-right">
                {property.usageCount !== undefined ? (
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-200 hover:underline inline-flex items-center gap-1">
                    {property.usageCount}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-gray-400 dark:text-text-tertiary">-</span>
                )}
              </td>

              {/* Fill Rate */}
              <td className="px-6 py-4 text-sm text-right">
                {property.fillRate !== undefined ? (
                  <span className={`font-medium ${getFillRateColor(property.fillRate)}`}>
                    {property.fillRate}%
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-text-tertiary">-</span>
                )}
              </td>

              {/* Actions */}
              <td className="px-3 py-4">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditProperty && onEditProperty(property)}
                    title={property.isSystem ? "System properties have limited editing" : "Edit property"}
                  >
                    {property.isSystem ? <Lock className="w-4 h-4 text-gray-400 dark:text-text-tertiary" /> : <Edit className="w-4 h-4" />}
                  </Button>
                  {!property.isSystem && (
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {properties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-text-secondary">No properties found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default PopulatedPropertiesView;
