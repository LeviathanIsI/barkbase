import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Table, Plus, GripVertical, Trash2, RotateCcw, Search, Filter,
  MoreVertical, Star, Copy, Edit, Eye, ChevronDown, Settings,
  Loader2, AlertCircle, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { OBJECT_TYPES } from '../objectConfig';
import { useTimezoneUtils } from '@/lib/timezone';
import {
  useIndexSettings,
  useUpdateIndexSettings,
  useSavedViews,
  useCreateSavedView,
  useUpdateSavedView,
  useDeleteSavedView,
  useSetDefaultView,
  useObjectProperties,
} from '@/features/settings/api/objectSettingsApi';

const ObjectIndexCustomizationTab = ({ objectType }) => {
  const tz = useTimezoneUtils();
  const config = OBJECT_TYPES[objectType];
  const menuRef = useRef(null);

  // API hooks
  const { data: indexSettings, isLoading: settingsLoading, error: settingsError } = useIndexSettings(objectType);
  const { data: savedViews = [], isLoading: viewsLoading } = useSavedViews(objectType);
  const { data: propertiesData, isLoading: propertiesLoading } = useObjectProperties(objectType);
  const updateIndexSettings = useUpdateIndexSettings(objectType);
  const createSavedView = useCreateSavedView(objectType);
  const updateSavedView = useUpdateSavedView(objectType);
  const deleteSavedView = useDeleteSavedView(objectType);
  const setDefaultView = useSetDefaultView(objectType);

  // Get all available properties/columns from the API
  const allColumns = useMemo(() => {
    if (!propertiesData?.properties) return [];
    return propertiesData.properties.map(p => ({
      id: p.name,
      label: p.label,
      width: 150, // default width
      sortable: ['string', 'number', 'date'].includes(p.type),
      type: p.type,
    }));
  }, [propertiesData]);

  // Local state for editing
  const [columns, setColumns] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [enableBulkActions, setEnableBulkActions] = useState(true);
  const [enableInlineEditing, setEnableInlineEditing] = useState(false);
  const [enableRowSelection, setEnableRowSelection] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewSearchQuery, setViewSearchQuery] = useState('');
  const [showCreateViewModal, setShowCreateViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [selectedViewId, setSelectedViewId] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Initialize from API data when it loads
  useEffect(() => {
    if (indexSettings && allColumns.length > 0) {
      // Parse columns from JSONB
      const savedColumns = Array.isArray(indexSettings.default_columns)
        ? indexSettings.default_columns
        : [];

      if (savedColumns.length > 0) {
        // Map saved column IDs to full column objects
        const cols = savedColumns
          .map(col => {
            const fullCol = allColumns.find(c => c.id === (col.id || col));
            return fullCol ? { ...fullCol, width: col.width || fullCol.width } : null;
          })
          .filter(Boolean);
        setColumns(cols);
      } else {
        // Use defaults
        const defaultCols = getDefaultColumns();
        setColumns(defaultCols);
      }

      setSortColumn(indexSettings.default_sort_column || 'created_at');
      setSortDirection(indexSettings.default_sort_direction || 'desc');
      setRowsPerPage(indexSettings.rows_per_page || 25);
      setEnableBulkActions(indexSettings.enable_bulk_actions ?? true);
      setEnableInlineEditing(indexSettings.enable_inline_editing ?? false);
      setEnableRowSelection(indexSettings.enable_row_selection ?? true);
      setHasChanges(false);
    } else if (allColumns.length > 0 && !settingsLoading) {
      // No settings exist, use defaults
      setColumns(getDefaultColumns());
    }
  }, [indexSettings, allColumns, settingsLoading]);

  // Update available columns when columns change
  useEffect(() => {
    const columnIds = new Set(columns.map(c => c.id));
    setAvailableColumns(allColumns.filter(c => !columnIds.has(c.id)));
  }, [columns, allColumns]);

  // Get default columns based on object type
  const getDefaultColumns = () => {
    const defaults = ['name', 'status', 'email', 'phone', 'created_at'];
    return defaults
      .map(id => allColumns.find(c => c.id === id))
      .filter(Boolean);
  };

  // Filter saved views by search
  const filteredSavedViews = useMemo(() => {
    if (!viewSearchQuery.trim()) return savedViews;
    const query = viewSearchQuery.toLowerCase();
    return savedViews.filter(v => v.name.toLowerCase().includes(query));
  }, [savedViews, viewSearchQuery]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  const isLoading = settingsLoading || viewsLoading || propertiesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted">Loading index configuration...</span>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500">Failed to load index settings</p>
        <p className="text-sm text-muted mt-1">{settingsError.message}</p>
      </div>
    );
  }

  const handleAddColumn = (column) => {
    setColumns([...columns, column]);
    setHasChanges(true);
  };

  const handleRemoveColumn = (column) => {
    setColumns((prev) => prev.filter((c) => c.id !== column.id));
    setHasChanges(true);
  };

  const handleResetColumns = () => {
    setColumns(getDefaultColumns());
    setHasChanges(true);
  };

  const handleSettingChange = (setter) => (value) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      await updateIndexSettings.mutateAsync({
        default_columns: columns.map(c => ({ id: c.id, width: c.width })),
        default_sort_column: sortColumn,
        default_sort_direction: sortDirection,
        rows_per_page: rowsPerPage,
        enable_bulk_actions: enableBulkActions,
        enable_inline_editing: enableInlineEditing,
        enable_row_selection: enableRowSelection,
      });
      setHasChanges(false);
      toast.success('Index configuration saved');
    } catch (error) {
      toast.error('Failed to save index settings');
    }
  };

  const handleCreateView = async () => {
    if (!newViewName.trim()) return;
    try {
      await createSavedView.mutateAsync({
        name: newViewName.trim(),
        columns: columns.map(c => ({ id: c.id, width: c.width })),
        sort_column: sortColumn,
        sort_direction: sortDirection,
        filters: {},
      });
      setShowCreateViewModal(false);
      setNewViewName('');
      toast.success('View created');
    } catch (error) {
      toast.error('Failed to create view');
    }
  };

  const handleDeleteView = async (viewId) => {
    const view = savedViews.find(v => v.id === viewId);
    if (!window.confirm(`Delete "${view?.name}"? This cannot be undone.`)) return;
    try {
      await deleteSavedView.mutateAsync(viewId);
      setActionMenuOpen(null);
      toast.success('View deleted');
    } catch (error) {
      toast.error('Failed to delete view');
    }
  };

  const handleSetDefaultView = async (viewId) => {
    try {
      await setDefaultView.mutateAsync(viewId);
      setActionMenuOpen(null);
      toast.success('Default view updated');
    } catch (error) {
      toast.error('Failed to set default view');
    }
  };

  const handleEditView = async (viewId) => {
    const view = savedViews.find(v => v.id === viewId);
    const newName = prompt('Enter new name:', view?.name);
    if (!newName || newName === view?.name) {
      setActionMenuOpen(null);
      return;
    }
    try {
      await updateSavedView.mutateAsync({ id: viewId, name: newName });
      setActionMenuOpen(null);
      toast.success('View renamed');
    } catch (error) {
      toast.error('Failed to rename view');
    }
  };

  const handleDuplicateView = async (viewId) => {
    const view = savedViews.find(v => v.id === viewId);
    if (!view) return;
    try {
      await createSavedView.mutateAsync({
        name: `${view.name} (Copy)`,
        columns: view.columns || [],
        sort_column: view.sort_column,
        sort_direction: view.sort_direction,
        filters: view.filters || {},
      });
      setActionMenuOpen(null);
      toast.success('View duplicated');
    } catch (error) {
      toast.error('Failed to duplicate view');
    }
  };

  // Drag and drop handlers for columns
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('dragIndex', index.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    if (dragIndex === dropIndex) return;

    const newColumns = [...columns];
    const [removed] = newColumns.splice(dragIndex, 1);
    newColumns.splice(dropIndex, 0, removed);
    setColumns(newColumns);
    setHasChanges(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Control the layout and content of your {config.labelSingular} index page.
          </p>
        </div>
      </div>

      {/* Customize Index Page Section */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text mb-2">Customize Index Page</h3>
        <a href="#" className="text-sm text-primary hover:underline">
          All Views
        </a>
        <p className="text-xs text-muted mt-1">
          See and take action on all of your views in one place.
        </p>
      </Card>

      {/* Saved Views Table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <Input
                placeholder="Search views"
                className="pl-9 w-48 h-8 text-sm"
                value={viewSearchQuery}
                onChange={(e) => setViewSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreateViewModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create View
          </Button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-2.5 text-left">
                <input type="checkbox" className="rounded border-border" disabled />
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                View Name
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredSavedViews.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  {viewSearchQuery ? 'No views match your search' : 'No saved views yet. Create one to get started.'}
                </td>
              </tr>
            ) : (
              filteredSavedViews.map((view) => (
                <tr key={view.id} className="hover:bg-surface-secondary/50">
                  <td className="px-4 py-2.5">
                    <input type="checkbox" className="rounded border-border" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {view.is_default && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <a href="#" className="text-sm text-primary hover:underline font-medium">
                        {view.name}
                      </a>
                      {view.is_admin_promoted && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">
                          Promoted
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-text">
                      {Array.isArray(view.assigned_to) && view.assigned_to.length > 0
                        ? `${view.assigned_to.length} users/teams`
                        : 'All users'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-text">
                      {view.updated_at
                        ? tz.formatDate(new Date(view.updated_at), {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="relative" ref={actionMenuOpen === view.id ? menuRef : null}>
                      <button
                        className="p-1.5 rounded hover:bg-surface-secondary"
                        onClick={() => setActionMenuOpen(actionMenuOpen === view.id ? null : view.id)}
                      >
                        <MoreVertical className="w-4 h-4 text-muted" />
                      </button>
                      {actionMenuOpen === view.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-10">
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-secondary flex items-center gap-2"
                            onClick={() => handleEditView(view.id)}
                          >
                            <Edit className="w-4 h-4" />
                            Rename
                          </button>
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-secondary flex items-center gap-2"
                            onClick={() => handleDuplicateView(view.id)}
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                          {!view.is_default && (
                            <button
                              className="w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-secondary flex items-center gap-2"
                              onClick={() => handleSetDefaultView(view.id)}
                            >
                              <Star className="w-4 h-4" />
                              Set as default
                            </button>
                          )}
                          <div className="border-t border-border my-1" />
                          <button
                            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-surface-secondary flex items-center gap-2"
                            onClick={() => handleDeleteView(view.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredSavedViews.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-2">
            <button className="px-2 py-1 text-xs text-muted hover:text-text">&lt; Prev</button>
            <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">1</span>
            <button className="px-2 py-1 text-xs text-muted hover:text-text">Next &gt;</button>
          </div>
        )}
      </Card>

      {/* Two-column layout for settings */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - Column Configuration */}
        <div className="lg:col-span-3 space-y-4">
          {/* Default Columns */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-text">Default Columns</h3>
              </div>
              <button
                onClick={handleResetColumns}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <div className="space-y-1">
              {columns.map((column, idx) => (
                <div
                  key={column.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  className="flex items-center gap-2 px-3 py-2 border border-border rounded hover:bg-surface-secondary/50 group cursor-move"
                >
                  <GripVertical className="w-4 h-4 text-muted cursor-grab" />
                  <span className="flex-1 text-sm text-text">{column.label}</span>
                  <span className="text-xs text-muted">{column.width}px</span>
                  <button
                    onClick={() => handleRemoveColumn(column)}
                    className="p-1 rounded hover:bg-surface-secondary opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted hover:text-red-500" />
                  </button>
                </div>
              ))}

              <button
                className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded text-sm text-muted hover:bg-surface-secondary/50 hover:border-primary/50 hover:text-primary"
              >
                <Plus className="w-4 h-4" />
                Add column
              </button>
            </div>
          </Card>

          {/* Available Columns */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Available Columns</h3>
            {availableColumns.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">All columns are selected</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableColumns.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => handleAddColumn(column)}
                    className="flex items-center gap-2 px-3 py-2 border border-border rounded text-sm text-text hover:bg-surface-secondary/50 hover:border-primary/50 text-left"
                  >
                    <Plus className="w-3.5 h-3.5 text-muted" />
                    {column.label}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Default Settings */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Default Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Default Sort Column</label>
                <Select
                  value={sortColumn}
                  onChange={(e) => handleSettingChange(setSortColumn)(e.target.value)}
                  options={columns.filter((c) => c.sortable).map((c) => ({
                    value: c.id,
                    label: c.label,
                  }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Sort Direction</label>
                <Select
                  value={sortDirection}
                  onChange={(e) => handleSettingChange(setSortDirection)(e.target.value)}
                  options={[
                    { value: 'asc', label: 'Ascending' },
                    { value: 'desc', label: 'Descending' },
                  ]}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Rows Per Page</label>
                <Select
                  value={rowsPerPage}
                  onChange={(e) => handleSettingChange(setRowsPerPage)(Number(e.target.value))}
                  options={[
                    { value: 10, label: '10 rows' },
                    { value: 25, label: '25 rows' },
                    { value: 50, label: '50 rows' },
                    { value: 100, label: '100 rows' },
                  ]}
                  className="text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Table Features */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Table Features</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm text-text">Enable bulk actions</span>
                  <p className="text-xs text-muted">Allow selecting multiple records for bulk operations</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableBulkActions}
                  onChange={(e) => handleSettingChange(setEnableBulkActions)(e.target.checked)}
                  className="rounded border-border"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm text-text">Enable inline editing</span>
                  <p className="text-xs text-muted">Allow editing values directly in the table</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableInlineEditing}
                  onChange={(e) => handleSettingChange(setEnableInlineEditing)(e.target.checked)}
                  className="rounded border-border"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm text-text">Enable row selection</span>
                  <p className="text-xs text-muted">Show checkboxes for selecting rows</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableRowSelection}
                  onChange={(e) => handleSettingChange(setEnableRowSelection)(e.target.checked)}
                  className="rounded border-border"
                />
              </label>
            </div>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Table Preview */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Table Preview</h3>

            <div className="border border-border rounded-lg overflow-hidden text-xs">
              {/* Header */}
              <div className="flex bg-surface-secondary border-b border-border">
                {enableRowSelection && (
                  <div className="w-8 px-2 py-2 flex items-center">
                    <input type="checkbox" className="w-3 h-3 rounded border-border" />
                  </div>
                )}
                {columns.slice(0, 3).map((col) => (
                  <div
                    key={col.id}
                    className="flex-1 px-2 py-2 font-semibold text-muted uppercase tracking-wider truncate"
                  >
                    {col.label}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex border-b border-border last:border-0 hover:bg-surface-secondary/50">
                  {enableRowSelection && (
                    <div className="w-8 px-2 py-2 flex items-center">
                      <input type="checkbox" className="w-3 h-3 rounded border-border" />
                    </div>
                  )}
                  {columns.slice(0, 3).map((col) => (
                    <div key={col.id} className="flex-1 px-2 py-2 text-text truncate">
                      {col.id === 'status' ? (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">
                          Active
                        </span>
                      ) : (
                        `Sample ${col.label}`
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted mt-3 text-center">
              Preview shows first 3 columns
            </p>
          </Card>

          {/* Quick Stats */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Configuration Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Columns</span>
                <span className="text-text font-medium">{columns.length}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Sort By</span>
                <span className="text-text font-medium">
                  {columns.find((c) => c.id === sortColumn)?.label || sortColumn} ({sortDirection})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Rows Per Page</span>
                <span className="text-text font-medium">{rowsPerPage}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted">Saved Views</span>
                <span className="text-text font-medium">{savedViews.length}</span>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <Button
            className="w-full"
            onClick={handleSaveSettings}
            disabled={!hasChanges || updateIndexSettings.isPending}
          >
            {updateIndexSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : hasChanges ? (
              'Save Index Configuration'
            ) : (
              'No Changes to Save'
            )}
          </Button>

          {updateIndexSettings.isError && (
            <p className="text-xs text-red-500 text-center">
              Failed to save: {updateIndexSettings.error.message}
            </p>
          )}
        </div>
      </div>

      {/* Create View Modal */}
      {showCreateViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Create New View</h3>
              <button
                onClick={() => setShowCreateViewModal(false)}
                className="p-1 rounded hover:bg-surface-secondary"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">View Name</label>
                <Input
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="e.g., Active Records, My Assignments"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted">
                This view will use your current column and sort settings.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateViewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateView}
                  disabled={!newViewName.trim() || createSavedView.isPending}
                >
                  {createSavedView.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create View'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectIndexCustomizationTab;
