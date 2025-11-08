import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from './Button';

/**
 * Universal Association Modal Component
 * Used for associating any object type with another (pets with owners, owners with bookings, etc.)
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {string} props.title - Modal title (e.g., "Associate Pet", "Associate Owner")
 * @param {string} props.objectType - Type of object being associated (e.g., "pet", "owner")
 * @param {Array} props.availableRecords - Array of ALL records (not filtered by association status)
 * @param {Array} props.currentAssociations - Array of IDs of already-associated records
 * @param {Function} props.onAssociate - Callback when associating records ([{ recordId, label }])
 * @param {Function} props.onCreateNew - Callback when creating new record (formData)
 * @param {React.ReactNode} props.createForm - Form component for creating new record
 * @param {Array} props.associationLabels - Array of label options (e.g., [{ value: "primary", label: "Primary owner" }])
 * @param {Function} props.formatRecordDisplay - Function to format record for display (record => string)
 * @param {boolean} props.isLoading - Whether operation is in progress
 */
const AssociationModal = ({
  open,
  onClose,
  title = 'Associate Record',
  objectType = 'record',
  availableRecords = [],
  currentAssociations = [],
  onAssociate,
  onCreateNew,
  createForm,
  associationLabels = [],
  formatRecordDisplay = (record) => record.name || record.recordId,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecords, setSelectedRecords] = useState({});
  const [recordLabels, setRecordLabels] = useState({});

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return availableRecords;

    const query = searchQuery.toLowerCase();
    return availableRecords.filter((record) => {
      const displayText = formatRecordDisplay(record).toLowerCase();
      return displayText.includes(query);
    });
  }, [availableRecords, searchQuery, formatRecordDisplay]);

  const handleToggleRecord = (recordId) => {
    // Don't allow toggling already-associated records
    if (currentAssociations.includes(recordId)) return;

    setSelectedRecords((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  const handleLabelChange = (recordId, label) => {
    setRecordLabels((prev) => ({
      ...prev,
      [recordId]: label,
    }));
  };

  const handleAssociate = async () => {
    if (activeTab === 'existing') {
      // Build array of associations from selected records
      const associations = Object.keys(selectedRecords)
        .filter((recordId) => selectedRecords[recordId])
        .map((recordId) => ({
          recordId,
          label: recordLabels[recordId] || (associationLabels[0]?.value ?? ''),
        }));

      // Call the onAssociate handler
      if (associations.length > 0) {
        await onAssociate(associations);
      }
    } else {
      // Create new handled by the form
    }
  };

  const handleReset = () => {
    setActiveTab('existing');
    setSearchQuery('');
    setSelectedRecords({});
    setRecordLabels({});
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const selectedCount = Object.values(selectedRecords).filter(Boolean).length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-surface-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-primary px-6 py-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-white hover:bg-primary/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              'flex-1 px-6 py-3 text-sm font-medium transition-colors',
              activeTab === 'create'
                ? 'border-b-2 border-primary bg-gray-50 dark:bg-surface-secondary text-primary'
                : 'text-muted hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary'
            )}
          >
            Create new
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={cn(
              'flex-1 px-6 py-3 text-sm font-medium transition-colors',
              activeTab === 'existing'
                ? 'border-b-2 border-primary bg-gray-50 dark:bg-surface-secondary text-primary'
                : 'text-muted hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary'
            )}
          >
            Add existing
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {activeTab === 'create' ? (
            // Create new form
            <div>
              {createForm || (
                <p className="text-sm text-muted">
                  No create form provided for this object type.
                </p>
              )}
            </div>
          ) : (
            // Add existing - Searchable checkbox list
            <div className="space-y-4">
              {availableRecords.length === 0 && !isLoading ? (
                <p className="text-sm text-muted">
                  No {objectType}s available. Create a new {objectType} first.
                </p>
              ) : isLoading && availableRecords.length === 0 ? (
                <p className="text-sm text-muted">Loading {objectType}s...</p>
              ) : (
                <>
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder={`Search ${objectType}s...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-border bg-white dark:bg-surface-primary py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Results count */}
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      {filteredRecords.length} {objectType}
                      {filteredRecords.length !== 1 ? 's' : ''} found
                    </span>
                    {selectedCount > 0 && (
                      <span className="font-medium text-primary">
                        {selectedCount} selected
                      </span>
                    )}
                  </div>

                  {/* Checkbox list */}
                  <div className="space-y-2 rounded-lg border border-border bg-gray-50 dark:bg-surface-secondary p-3">
                    {filteredRecords.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted">
                        No {objectType}s match your search
                      </p>
                    ) : (
                      filteredRecords.map((record) => {
                        const isAlreadyAssociated = currentAssociations.includes(record.recordId);
                        const isSelected = selectedRecords[record.id] || false;
                        const isChecked = isAlreadyAssociated || isSelected;

                        return (
                          <div key={record.recordId} className="space-y-2">
                            <div
                              className={cn(
                                'flex items-center gap-3 rounded-md border border-border bg-white dark:bg-surface-primary p-3 transition-colors',
                                isAlreadyAssociated
                                  ? 'bg-gray-100 dark:bg-surface-secondary cursor-not-allowed'
                                  : 'cursor-pointer hover:border-primary hover:bg-blue-50 dark:bg-surface-primary'
                              )}
                              onClick={() => handleToggleRecord(record.recordId)}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleRecord(record.recordId)}
                                disabled={isAlreadyAssociated}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text">
                                  {formatRecordDisplay(record)}
                                </p>
                                {isAlreadyAssociated && (
                                  <p className="text-xs text-muted">
                                    Already associated
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Association label dropdown for selected records */}
                            {isSelected && associationLabels.length > 0 && (
                              <div className="ml-7 rounded-md border border-border bg-white dark:bg-surface-primary p-3">
                                <label className="mb-1 block text-xs font-medium text-muted">
                                  Association label
                                </label>
                                <select
                                  value={recordLabels[record.id] || associationLabels[0]?.value || ''}
                                  onChange={(e) => handleLabelChange(record.recordId, e.target.value)}
                                  className="w-full rounded-md border border-border bg-white dark:bg-surface-primary px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {associationLabels.map((label) => (
                                    <option key={label.value} value={label.value}>
                                      {label.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border bg-gray-50 dark:bg-surface-secondary px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          {activeTab === 'create' ? (
            <Button onClick={onCreateNew} disabled={isLoading}>
              Create {objectType}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={async () => {
                  await handleAssociate();
                  handleReset();
                }}
                disabled={isLoading || selectedCount === 0}
              >
                Associate ({selectedCount})
              </Button>
              <Button
                onClick={async () => {
                  await handleAssociate();
                  handleClose();
                }}
                disabled={isLoading || selectedCount === 0}
              >
                Associate and close
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssociationModal;
