import { useState } from 'react';
import {
  Table, Plus, GripVertical, Trash2, RotateCcw, Search, Filter,
  MoreVertical, Star, Copy, Edit, Eye, ChevronDown, Settings
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { OBJECT_TYPES } from '../objectConfig';

const ObjectIndexCustomizationTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];

  const defaultColumns = [
    { id: 'name', label: 'Name', width: 200, enabled: true, sortable: true },
    { id: 'status', label: 'Status', width: 120, enabled: true, sortable: true },
    { id: 'email', label: 'Email', width: 200, enabled: true, sortable: true },
    { id: 'phone', label: 'Phone', width: 150, enabled: true, sortable: false },
    { id: 'createdAt', label: 'Created', width: 150, enabled: true, sortable: true },
    { id: 'updatedAt', label: 'Updated', width: 150, enabled: false, sortable: true },
    { id: 'owner', label: 'Owner', width: 150, enabled: false, sortable: true },
  ];

  const [columns, setColumns] = useState(defaultColumns.filter((c) => c.enabled));
  const [availableColumns, setAvailableColumns] = useState(defaultColumns.filter((c) => !c.enabled));
  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [savedViews, setSavedViews] = useState([
    { id: 'default', name: 'Default view', isDefault: true, assignedTo: 'All users', updatedAt: 'Dec 12, 2024' },
    { id: 'active', name: 'Active Records', isDefault: false, assignedTo: 'Sales Team', updatedAt: 'Dec 10, 2024' },
  ]);

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  const handleAddColumn = (column) => {
    setColumns([...columns, column]);
    setAvailableColumns((prev) => prev.filter((c) => c.id !== column.id));
  };

  const handleRemoveColumn = (column) => {
    setColumns((prev) => prev.filter((c) => c.id !== column.id));
    setAvailableColumns([...availableColumns, column]);
  };

  const handleResetColumns = () => {
    setColumns(defaultColumns.filter((c) => c.enabled));
    setAvailableColumns(defaultColumns.filter((c) => !c.enabled));
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
              <Input placeholder="Search views" className="pl-9 w-48 h-8 text-sm" />
            </div>
          </div>
          <Button size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create View
          </Button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-2.5 text-left">
                <input type="checkbox" className="rounded border-border" />
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
            {savedViews.map((view) => (
              <tr key={view.id} className="hover:bg-surface-secondary/50">
                <td className="px-4 py-2.5">
                  <input type="checkbox" className="rounded border-border" />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {view.isDefault && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <a href="#" className="text-sm text-primary hover:underline font-medium">
                      {view.name}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-sm text-text">{view.assignedTo}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-sm text-text">{view.updatedAt}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button className="p-1.5 rounded hover:bg-surface-secondary">
                    <MoreVertical className="w-4 h-4 text-muted" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-2">
          <button className="px-2 py-1 text-xs text-muted hover:text-text">&lt; Prev</button>
          <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">1</span>
          <button className="px-2 py-1 text-xs text-muted hover:text-text">Next &gt;</button>
        </div>
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
                  className="flex items-center gap-2 px-3 py-2 border border-border rounded hover:bg-surface-secondary/50 group"
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
          </Card>

          {/* Default Settings */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Default Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Default Sort Column</label>
                <Select
                  value={sortColumn}
                  onChange={(e) => setSortColumn(e.target.value)}
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
                  onChange={(e) => setSortDirection(e.target.value)}
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
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
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
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm text-text">Enable inline editing</span>
                  <p className="text-xs text-muted">Allow editing values directly in the table</p>
                </div>
                <input type="checkbox" className="rounded border-border" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm text-text">Enable row selection</span>
                  <p className="text-xs text-muted">Show checkboxes for selecting rows</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border" />
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
                <div className="w-8 px-2 py-2 flex items-center">
                  <input type="checkbox" className="w-3 h-3 rounded border-border" />
                </div>
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
                  <div className="w-8 px-2 py-2 flex items-center">
                    <input type="checkbox" className="w-3 h-3 rounded border-border" />
                  </div>
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
                  {columns.find((c) => c.id === sortColumn)?.label} ({sortDirection})
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
          <Button className="w-full">
            Save Index Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ObjectIndexCustomizationTab;
