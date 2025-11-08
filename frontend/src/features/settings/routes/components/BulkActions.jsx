import { Archive, FolderOpen, Copy, Trash2, Download, Settings } from 'lucide-react';
import Button from '@/components/ui/Button';

const BulkActions = ({ selectedCount, onClearSelection }) => {
  const actions = [
    {
      icon: Archive,
      label: 'Archive Selected',
      description: 'Hide from active use',
      variant: 'outline'
    },
    {
      icon: FolderOpen,
      label: 'Change Group',
      description: 'Move to different group',
      variant: 'outline'
    },
    {
      icon: Copy,
      label: 'Duplicate',
      description: 'Create copies',
      variant: 'outline'
    },
    {
      icon: Download,
      label: 'Export Selected',
      description: 'Download definitions',
      variant: 'outline'
    },
    {
      icon: Settings,
      label: 'Bulk Edit',
      description: 'Change settings',
      variant: 'outline'
    }
  ];

  return (
    <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-900 dark:text-text-primary">
          {selectedCount} properties selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-sm text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"
        >
          Clear selection
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button key={index} variant={action.variant} size="sm" className="flex items-center gap-1">
              <Icon className="w-3 h-3" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default BulkActions;