import { RotateCcw, Trash2 } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from '@/components/ui/Button';
import { usePropertiesQuery } from '../../api';

const ACCESS_LEVEL_LABELS = {
  everyone_edit: 'Everyone can view and edit',
  everyone_view: 'Everyone can view',
  assigned_only: 'Assigned to users and teams',
  admin_only: 'Admins only',
};

const ArchivedTab = ({ objectType, onRestore, onDelete }) => {
  const tz = useTimezoneUtils();
  const { data: properties = [], isLoading } = usePropertiesQuery(objectType, {
    queryParams: { onlyArchived: true }
  });

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
    };
    return typeMap[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-text-secondary">Loading archived properties...</div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-12 text-center">
        <p className="text-gray-500 dark:text-text-secondary text-lg mb-2">No archived properties</p>
        <p className="text-gray-400 dark:text-text-tertiary text-sm">
          Custom properties you archive will appear here. System properties cannot be archived.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4 flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm text-yellow-800">
            <strong>Archived properties</strong> are hidden from active views but data is preserved. You can restore them at any time.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-surface-border">
          <thead className="bg-gray-50 dark:bg-surface-secondary">
            <tr>
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
                Archived At
              </th>
              <th scope="col" className="w-32 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-surface-primary divide-y divide-gray-200 dark:divide-surface-border">
            {properties.map((property) => (
              <tr key={property.recordId} className="hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-text-primary">{property.label}</div>
                  <div className="text-sm text-gray-500 dark:text-text-secondary">
                    <span className="font-mono text-xs">{property.name}</span> · {getFieldTypeLabel(property.type)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-text-primary">
                  {ACCESS_LEVEL_LABELS[property.accessLevel || 'everyone_edit']}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-text-primary">
                  {property.group || 'General'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-text-secondary">
                  {property.archivedAt ? tz.formatShortDate(property.archivedAt) : '-'}
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRestore && onRestore(property.recordId)}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete && onDelete(property.recordId)}
                      className="text-red-600 hover:text-red-800 dark:text-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ArchivedTab;

