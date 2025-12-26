/**
 * Segment Builder - Create/Edit segment with filter groups
 * /segments/new and /segments/:id/edit
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Eye,
  Users,
  Loader2,
  X,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import StyledSelect from '@/components/ui/StyledSelect';
import toast from 'react-hot-toast';
import {
  useSegment,
  useCreateSegment,
  useUpdateSegment,
  useSegmentPreview,
  SEGMENT_FIELDS,
  OPERATORS,
  OBJECT_TYPES,
  SEGMENT_TYPES,
} from '../api';
import { cn } from '@/lib/cn';

// Generate unique IDs for filter groups and filters
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create an empty filter
const createEmptyFilter = () => ({
  id: generateId(),
  field: '',
  operator: '',
  value: '',
});

// Create an empty filter group
const createEmptyGroup = () => ({
  id: generateId(),
  logic: 'AND',
  filters: [createEmptyFilter()],
});

// Initial filter state
const createInitialFilters = () => ({
  groups: [createEmptyGroup()],
  groupLogic: 'OR',
});

export default function SegmentBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objectType, setObjectType] = useState('owners');
  const [segmentType, setSegmentType] = useState('active');
  const [filters, setFilters] = useState(createInitialFilters());
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // API hooks
  const { data: existingSegment, isLoading: isLoadingSegment } = useSegment(id);
  const createMutation = useCreateSegment();
  const updateMutation = useUpdateSegment();
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    isFetching: isFetchingPreview,
  } = useSegmentPreview(filters, objectType, showPreview && hasValidFilters(filters));

  // Load existing segment data
  useEffect(() => {
    if (existingSegment && isEdit) {
      setName(existingSegment.name || '');
      setDescription(existingSegment.description || '');
      setObjectType(existingSegment.object_type || existingSegment.objectType || 'owners');
      setSegmentType(existingSegment.segment_type || existingSegment.segmentType || 'active');
      if (existingSegment.filters) {
        setFilters(
          typeof existingSegment.filters === 'string'
            ? JSON.parse(existingSegment.filters)
            : existingSegment.filters
        );
      }
    }
  }, [existingSegment, isEdit]);

  // Get available fields for current object type
  const availableFields = useMemo(() => SEGMENT_FIELDS[objectType] || [], [objectType]);

  // Check if filters have any valid conditions
  function hasValidFilters(filters) {
    return filters.groups.some((group) =>
      group.filters.some((filter) => filter.field && filter.operator)
    );
  }

  // Add a new filter to a group
  const addFilter = (groupId) => {
    setFilters((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === groupId
          ? { ...group, filters: [...group.filters, createEmptyFilter()] }
          : group
      ),
    }));
  };

  // Remove a filter from a group
  const removeFilter = (groupId, filterId) => {
    setFilters((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === groupId
          ? { ...group, filters: group.filters.filter((f) => f.id !== filterId) }
          : group
      ),
    }));
  };

  // Update a filter
  const updateFilter = (groupId, filterId, updates) => {
    setFilters((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              filters: group.filters.map((f) =>
                f.id === filterId ? { ...f, ...updates } : f
              ),
            }
          : group
      ),
    }));
  };

  // Add a new filter group
  const addGroup = () => {
    setFilters((prev) => ({
      ...prev,
      groups: [...prev.groups, createEmptyGroup()],
    }));
  };

  // Remove a filter group
  const removeGroup = (groupId) => {
    setFilters((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== groupId),
    }));
  };

  // Toggle group logic (AND/OR)
  const toggleGroupLogic = (groupId) => {
    setFilters((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === groupId
          ? { ...group, logic: group.logic === 'AND' ? 'OR' : 'AND' }
          : group
      ),
    }));
  };

  // Handle save
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Segment name is required');
      return;
    }

    if (!hasValidFilters(filters)) {
      toast.error('Please add at least one filter condition');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        object_type: objectType,
        segment_type: segmentType,
        filters,
      };

      if (isEdit) {
        await updateMutation.mutateAsync({ segmentId: id, ...payload });
        toast.success('Segment updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Segment created successfully');
      }

      navigate('/segments');
    } catch (error) {
      console.error('Failed to save segment:', error);
      toast.error(error?.message || 'Failed to save segment');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEdit && isLoadingSegment) {
    return <LoadingState label="Loading segment..." />;
  }

  return (
    <div className="min-h-screen bg-[color:var(--bb-color-bg-body)]">
      {/* Header */}
      <div className="border-b border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/segments')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">
                  {isEdit ? 'Edit Segment' : 'Create Segment'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/segments')}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEdit ? 'Save Changes' : 'Create Segment'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Filter Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Segment Details */}
            <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] p-6">
              <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-4">
                Segment Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., VIP Customers"
                    className="w-full px-3 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-body)] text-[color:var(--bb-color-text-primary)] placeholder:text-[color:var(--bb-color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-body)] text-[color:var(--bb-color-text-primary)] placeholder:text-[color:var(--bb-color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1">
                      Object Type
                    </label>
                    {isEdit ? (
                      // LOCKED: Object type cannot be changed after creation
                      <div className="w-full px-3 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-primary)] cursor-not-allowed">
                        {OBJECT_TYPES.find((t) => t.value === objectType)?.label || objectType}
                        <span className="text-xs text-[color:var(--bb-color-text-muted)] ml-2">(locked)</span>
                      </div>
                    ) : (
                      <StyledSelect
                        options={OBJECT_TYPES}
                        value={objectType}
                        onChange={(opt) => {
                          setObjectType(opt?.value || 'owners');
                          // Reset filters when object type changes
                          setFilters(createInitialFilters());
                        }}
                        isClearable={false}
                        isSearchable={false}
                      />
                    )}
                    {isEdit && (
                      <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
                        Object type cannot be changed after creation
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1">
                      Segment Type
                    </label>
                    <StyledSelect
                      options={SEGMENT_TYPES}
                      value={segmentType}
                      onChange={(opt) => setSegmentType(opt?.value || 'active')}
                      isClearable={false}
                      isSearchable={false}
                    />
                    <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
                      {SEGMENT_TYPES.find((t) => t.value === segmentType)?.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Groups */}
            <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] p-6">
              <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-4">
                Filter Conditions
              </h2>
              <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">
                Define which records should be included in this segment
              </p>

              <div className="space-y-4">
                {filters.groups.map((group, groupIndex) => (
                  <div key={group.id}>
                    {/* Group logic separator */}
                    {groupIndex > 0 && (
                      <div className="flex items-center gap-2 my-4">
                        <div className="flex-1 h-px bg-[color:var(--bb-color-border-subtle)]" />
                        <button
                          type="button"
                          className="px-3 py-1 text-xs font-semibold rounded-full bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-accent)]/10 transition-colors"
                          onClick={() => {
                            setFilters((prev) => ({
                              ...prev,
                              groupLogic: prev.groupLogic === 'AND' ? 'OR' : 'AND',
                            }));
                          }}
                        >
                          {filters.groupLogic}
                        </button>
                        <div className="flex-1 h-px bg-[color:var(--bb-color-border-subtle)]" />
                      </div>
                    )}

                    {/* Filter Group */}
                    <FilterGroup
                      group={group}
                      availableFields={availableFields}
                      onAddFilter={() => addFilter(group.id)}
                      onRemoveFilter={(filterId) => removeFilter(group.id, filterId)}
                      onUpdateFilter={(filterId, updates) =>
                        updateFilter(group.id, filterId, updates)
                      }
                      onToggleLogic={() => toggleGroupLogic(group.id)}
                      onRemoveGroup={() => removeGroup(group.id)}
                      canRemove={filters.groups.length > 1}
                    />
                  </div>
                ))}
              </div>

              <Button variant="outline" className="mt-4" onClick={addGroup}>
                <Plus className="h-4 w-4 mr-2" />
                Add Filter Group (OR)
              </Button>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                  Preview
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                    showPreview
                      ? 'bg-primary'
                      : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      showPreview ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {showPreview ? (
                <>
                  {/* Count */}
                  <div className="p-4 rounded-lg bg-[color:var(--bb-color-bg-elevated)] mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--bb-color-accent)]/10">
                        <Users className="h-5 w-5 text-[color:var(--bb-color-accent)]" />
                      </div>
                      <div>
                        {isLoadingPreview || isFetchingPreview ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-[color:var(--bb-color-text-muted)]" />
                            <span className="text-sm text-[color:var(--bb-color-text-muted)]">
                              Calculating...
                            </span>
                          </div>
                        ) : (
                          <>
                            <p className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">
                              {previewData?.count?.toLocaleString() || 0}
                            </p>
                            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                              matching records
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sample Records */}
                  {previewData?.sample?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2">
                        Sample Records
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {previewData.sample.map((record, idx) => (
                          <div
                            key={record.id || record.recordId || idx}
                            className="p-2 rounded-md bg-[color:var(--bb-color-bg-elevated)] text-sm"
                          >
                            <p className="font-medium text-[color:var(--bb-color-text-primary)]">
                              {record.name ||
                                `${record.firstName || ''} ${record.lastName || ''}`.trim() ||
                                record.email ||
                                'Unknown'}
                            </p>
                            {record.email && (
                              <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                                {record.email}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasValidFilters(filters) && (
                    <p className="text-sm text-[color:var(--bb-color-text-muted)] text-center py-8">
                      Add filter conditions to see matching records
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[color:var(--bb-color-text-muted)] text-center py-8">
                  Preview is disabled. Toggle to see matching records.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter Group Component
const FilterGroup = ({
  group,
  availableFields,
  onAddFilter,
  onRemoveFilter,
  onUpdateFilter,
  onToggleLogic,
  onRemoveGroup,
  canRemove,
}) => {
  return (
    <div className="rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-[color:var(--bb-color-text-muted)]">
            Filter Group
          </span>
          <button
            type="button"
            className="px-2 py-0.5 text-xs font-semibold rounded bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-accent)]/10 transition-colors"
            onClick={onToggleLogic}
          >
            {group.logic}
          </button>
        </div>
        {canRemove && (
          <button
            type="button"
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 transition-colors"
            onClick={onRemoveGroup}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {group.filters.map((filter, filterIndex) => (
          <div key={filter.id}>
            {/* Filter row logic separator */}
            {filterIndex > 0 && (
              <div className="flex items-center gap-2 my-2">
                <span className="text-xs font-medium text-[color:var(--bb-color-accent)]">
                  {group.logic}
                </span>
                <div className="flex-1 h-px bg-[color:var(--bb-color-border-subtle)]" />
              </div>
            )}

            <FilterRow
              filter={filter}
              availableFields={availableFields}
              onUpdate={(updates) => onUpdateFilter(filter.id, updates)}
              onRemove={() => onRemoveFilter(filter.id)}
              canRemove={group.filters.length > 1}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-3 flex items-center gap-1 text-sm text-[color:var(--bb-color-accent)] hover:text-[color:var(--bb-color-accent)]/80 transition-colors"
        onClick={onAddFilter}
      >
        <Plus className="h-4 w-4" />
        Add filter ({group.logic})
      </button>
    </div>
  );
};

// Filter Row Component
const FilterRow = ({ filter, availableFields, onUpdate, onRemove, canRemove }) => {
  const selectedField = availableFields.find((f) => f.key === filter.field);
  const fieldType = selectedField?.type || 'text';
  const operators = OPERATORS[fieldType] || OPERATORS.text;
  const selectedOperator = operators.find((o) => o.value === filter.operator);

  // Determine if value input is needed
  const needsValue = !['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(
    filter.operator
  );
  const needsSecondValue = ['between', 'is_between'].includes(filter.operator);

  // Build options for field dropdown
  const fieldOptions = [
    { value: '', label: 'Select property...' },
    ...availableFields.map((field) => ({ value: field.key, label: field.label })),
  ];

  // Build options for operator dropdown
  const operatorOptions = [
    { value: '', label: 'Select operator...' },
    ...operators.map((op) => ({ value: op.value, label: op.label })),
  ];

  return (
    <div className="flex items-start gap-2">
      {/* Field Dropdown */}
      <div className="flex-1 min-w-0">
        <StyledSelect
          options={fieldOptions}
          value={filter.field}
          onChange={(opt) => onUpdate({ field: opt?.value || '', operator: '', value: '' })}
          isClearable={false}
          isSearchable={true}
          placeholder="Select property..."
        />
      </div>

      {/* Operator Dropdown */}
      {filter.field && (
        <div className="flex-1 min-w-0">
          <StyledSelect
            options={operatorOptions}
            value={filter.operator}
            onChange={(opt) => onUpdate({ operator: opt?.value || '' })}
            isClearable={false}
            isSearchable={false}
            placeholder="Select operator..."
          />
        </div>
      )}

      {/* Value Input */}
      {filter.field && filter.operator && needsValue && (
        <>
          {selectedField?.type === 'select' ? (
            <div className="flex-1 min-w-0">
              <StyledSelect
                options={[
                  { value: '', label: 'Select value...' },
                  ...(selectedField.options?.map((opt) => ({ value: opt, label: opt })) || []),
                ]}
                value={filter.value}
                onChange={(opt) => onUpdate({ value: opt?.value || '' })}
                isClearable={false}
                isSearchable={true}
                placeholder="Select value..."
              />
            </div>
          ) : selectedField?.type === 'boolean' ? null : selectedField?.type === 'date' &&
            ['in_last_days', 'more_than_days_ago'].includes(filter.operator) ? (
            <input
              type="number"
              value={filter.value}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="days"
              min="1"
              className="w-24 px-3 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50"
            />
          ) : selectedField?.type === 'date' ? (
            <input
              type="date"
              value={filter.value}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50"
            />
          ) : selectedField?.type === 'number' ? (
            <input
              type="number"
              value={filter.value}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="Enter value..."
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50"
            />
          ) : (
            <input
              type="text"
              value={filter.value}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="Enter value..."
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50"
            />
          )}

          {/* Second value for between operators */}
          {needsSecondValue && (
            <>
              <span className="text-sm text-[color:var(--bb-color-text-muted)] self-center">
                and
              </span>
              {selectedField?.type === 'date' ? (
                <input
                  type="date"
                  value={filter.value2 || ''}
                  onChange={(e) => onUpdate({ value2: e.target.value })}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50"
                />
              ) : (
                <input
                  type="number"
                  value={filter.value2 || ''}
                  onChange={(e) => onUpdate({ value2: e.target.value })}
                  placeholder="Max..."
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]/50"
                />
              )}
            </>
          )}
        </>
      )}

      {/* Remove Button */}
      {canRemove && (
        <button
          type="button"
          className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 transition-colors"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
