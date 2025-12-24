import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import Select from 'react-select';
import { cn } from '@/lib/cn';
import Button from './Button';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--bb-color-accent)' : 'none',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menuList: (base) => ({ ...base, padding: '4px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--bb-color-accent)' : state.isFocused ? 'var(--bb-color-bg-muted)' : 'transparent',
    color: state.isSelected ? 'white' : 'var(--bb-color-text-primary)',
    cursor: 'pointer',
    borderRadius: '0.375rem',
    padding: '8px 12px',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  input: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  placeholder: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bb-color-overlay-scrim)] backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-surface)] shadow-[var(--bb-elevation-card)] border border-[var(--bb-color-border-subtle)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-accent)] px-[var(--bb-space-6)] py-[var(--bb-space-4)] rounded-t-[var(--bb-radius-lg)]">
          <h2 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-white">{title}</h2>
          <button
            onClick={handleClose}
            className="rounded-[var(--bb-radius-md)] p-[var(--bb-space-1)] text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--bb-color-border-subtle)]">
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              'flex-1 px-[var(--bb-space-6)] py-[var(--bb-space-3)] text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] transition-colors',
              activeTab === 'create'
                ? 'border-b-2 border-[var(--bb-color-accent)] bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-accent)]'
                : 'text-[var(--bb-color-text-muted)] hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]'
            )}
          >
            Create new
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={cn(
              'flex-1 px-[var(--bb-space-6)] py-[var(--bb-space-3)] text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] transition-colors',
              activeTab === 'existing'
                ? 'border-b-2 border-[var(--bb-color-accent)] bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-accent)]'
                : 'text-[var(--bb-color-text-muted)] hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]'
            )}
          >
            Add existing
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-[var(--bb-space-6)]">
          {activeTab === 'create' ? (
            // Create new form
            <div>
              {createForm || (
                <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  No create form provided for this object type.
                </p>
              )}
            </div>
          ) : (
            // Add existing - Searchable checkbox list
            <div className="space-y-[var(--bb-space-4)]">
              {availableRecords.length === 0 && !isLoading ? (
                <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  No {objectType}s available. Create a new {objectType} first.
                </p>
              ) : isLoading && availableRecords.length === 0 ? (
                <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Loading {objectType}s...</p>
              ) : (
                <>
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-[var(--bb-space-3)] top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bb-color-text-muted)]" />
                    <input
                      type="text"
                      placeholder={`Search ${objectType}s...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-[var(--bb-radius-md)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] py-[var(--bb-space-2)] pl-9 pr-[var(--bb-space-3)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)] placeholder:text-[var(--bb-color-text-muted)] focus:border-[var(--bb-color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--bb-color-accent)]"
                    />
                  </div>

                  {/* Results count */}
                  <div className="flex items-center justify-between text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                    <span>
                      {filteredRecords.length} {objectType}
                      {filteredRecords.length !== 1 ? 's' : ''} found
                    </span>
                    {selectedCount > 0 && (
                      <span className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-accent)]">
                        {selectedCount} selected
                      </span>
                    )}
                  </div>

                  {/* Checkbox list */}
                  <div className="space-y-[var(--bb-space-2)] rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)] p-[var(--bb-space-3)]">
                    {filteredRecords.length === 0 ? (
                      <p className="py-[var(--bb-space-4)] text-center text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                        No {objectType}s match your search
                      </p>
                    ) : (
                      filteredRecords.map((record) => {
                        const isAlreadyAssociated = currentAssociations.includes(record.recordId);
                        const isSelected = selectedRecords[record.id] || false;
                        const isChecked = isAlreadyAssociated || isSelected;

                        return (
                          <div key={record.recordId} className="space-y-[var(--bb-space-2)]">
                            <div
                              className={cn(
                                'flex items-center gap-[var(--bb-space-3)] rounded-[var(--bb-radius-md)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] p-[var(--bb-space-3)] transition-colors',
                                isAlreadyAssociated
                                  ? 'bg-[var(--bb-color-bg-elevated)] cursor-not-allowed opacity-60'
                                  : 'cursor-pointer hover:border-[var(--bb-color-accent)] hover:bg-[var(--bb-color-accent-soft)]'
                              )}
                              onClick={() => handleToggleRecord(record.recordId)}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleRecord(record.recordId)}
                                disabled={isAlreadyAssociated}
                                className="h-4 w-4 rounded border-[var(--bb-color-border-subtle)] text-[var(--bb-color-accent)] focus:ring-[var(--bb-color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <p className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                                  {formatRecordDisplay(record)}
                                </p>
                                {isAlreadyAssociated && (
                                  <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                                    Already associated
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Association label dropdown for selected records */}
                            {isSelected && associationLabels.length > 0 && (
                              <div className="ml-7 rounded-[var(--bb-radius-md)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] p-[var(--bb-space-3)]" onClick={(e) => e.stopPropagation()}>
                                <label className="mb-[var(--bb-space-1)] block text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-muted)]">
                                  Association label
                                </label>
                                <Select
                                  options={associationLabels}
                                  value={associationLabels.find(o => o.value === (recordLabels[record.id] || associationLabels[0]?.value)) || null}
                                  onChange={(opt) => handleLabelChange(record.recordId, opt?.value || '')}
                                  isClearable={false}
                                  isSearchable
                                  styles={selectStyles}
                                  menuPortalTarget={document.body}
                                />
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
        <div className="flex justify-end gap-[var(--bb-space-2)] border-t border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)] px-[var(--bb-space-6)] py-[var(--bb-space-4)] rounded-b-[var(--bb-radius-lg)]">
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
