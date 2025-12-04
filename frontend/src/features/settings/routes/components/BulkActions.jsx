import { Archive, FolderOpen, Copy, Trash2, Download, Settings, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useState } from 'react';

const BulkActions = ({
  selectedCount,
  selectedIds = [],
  onClearSelection,
  onArchive,
  onChangeGroup,
  onDuplicate,
  onExport,
  onBulkEdit,
  onDelete,
  entityType = 'item',
  isLoading = false,
}) => {
  const [loadingAction, setLoadingAction] = useState(null);

  const handleAction = async (actionName, handler) => {
    if (!handler || loadingAction) return;
    setLoadingAction(actionName);
    try {
      await handler(selectedIds);
    } finally {
      setLoadingAction(null);
    }
  };

  const actions = [
    {
      id: 'archive',
      icon: Archive,
      label: 'Archive Selected',
      description: 'Hide from active use',
      variant: 'outline',
      handler: onArchive,
    },
    {
      id: 'group',
      icon: FolderOpen,
      label: 'Change Group',
      description: 'Move to different group',
      variant: 'outline',
      handler: onChangeGroup,
    },
    {
      id: 'duplicate',
      icon: Copy,
      label: 'Duplicate',
      description: 'Create copies',
      variant: 'outline',
      handler: onDuplicate,
    },
    {
      id: 'export',
      icon: Download,
      label: 'Export Selected',
      description: 'Download definitions',
      variant: 'outline',
      handler: onExport,
    },
    {
      id: 'edit',
      icon: Settings,
      label: 'Bulk Edit',
      description: 'Change settings',
      variant: 'outline',
      handler: onBulkEdit,
    },
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      description: 'Remove permanently',
      variant: 'outline',
      handler: onDelete,
      className: 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
    },
  ];

  // Only show actions that have handlers
  const availableActions = actions.filter(action => action.handler);

  if (availableActions.length === 0) {
    // No handlers provided, show default non-functional buttons
    return (
      <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900 dark:text-text-primary">
            {selectedCount} {entityType}{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"
          >
            Clear selection
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant}
                size="sm"
                className={`flex items-center gap-1 ${action.className || ''}`}
                disabled
                title="Feature not configured"
              >
                <Icon className="w-3 h-3" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-900 dark:text-text-primary">
          {selectedCount} {entityType}{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-sm text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"
        >
          Clear selection
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableActions.map((action) => {
          const Icon = action.icon;
          const isActionLoading = loadingAction === action.id || isLoading;

          return (
            <Button
              key={action.id}
              variant={action.variant}
              size="sm"
              className={`flex items-center gap-1 ${action.className || ''}`}
              onClick={() => handleAction(action.id, action.handler)}
              disabled={isActionLoading}
            >
              {loadingAction === action.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default BulkActions;
