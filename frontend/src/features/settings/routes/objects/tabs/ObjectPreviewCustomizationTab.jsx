import { useState, useEffect, useMemo } from 'react';
import {
  Eye, Plus, GripVertical, Trash2, RotateCcw, Search,
  MoreVertical, Layout, Info, Loader2, AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { OBJECT_TYPES } from '../objectConfig';
import {
  usePreviewLayouts,
  useUpdatePreviewLayout,
  useObjectProperties,
} from '@/features/settings/api/objectSettingsApi';

const ObjectPreviewCustomizationTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];

  // API hooks
  const { data: layouts = [], isLoading: layoutsLoading, error: layoutsError } = usePreviewLayouts(objectType);
  const { data: propertiesData, isLoading: propertiesLoading } = useObjectProperties(objectType);
  const updatePreviewLayout = useUpdatePreviewLayout(objectType);

  // Get the default layout (or first one)
  const defaultLayout = useMemo(() => {
    return layouts.find(l => l.is_default) || layouts[0] || null;
  }, [layouts]);

  // Get all available properties from the API
  const allProperties = useMemo(() => {
    if (!propertiesData?.properties) return [];
    return propertiesData.properties.map(p => ({
      id: p.name,
      label: p.label,
      type: p.type,
    }));
  }, [propertiesData]);

  // Local state for editing
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [showSections, setShowSections] = useState({
    quickInfo: true,
    quickActions: true,
    recentActivity: false,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize from API data when it loads
  useEffect(() => {
    if (defaultLayout) {
      // Parse properties from JSONB
      const layoutProperties = Array.isArray(defaultLayout.properties)
        ? defaultLayout.properties
        : [];

      // Map to display format
      const props = layoutProperties.map(p => {
        // Find the full property info
        const fullProp = allProperties.find(ap => ap.id === (p.id || p));
        return fullProp || { id: p.id || p, label: p.label || p.id || p };
      });

      setSelectedProperties(props.length > 0 ? props : getDefaultProperties());
      setShowSections({
        quickInfo: defaultLayout.show_quick_info ?? true,
        quickActions: defaultLayout.show_quick_actions ?? true,
        recentActivity: defaultLayout.show_recent_activity ?? false,
      });
      setHasChanges(false);
    } else if (allProperties.length > 0) {
      // No layout exists, use defaults
      setSelectedProperties(getDefaultProperties());
    }
  }, [defaultLayout, allProperties]);

  // Get default properties based on object type
  const getDefaultProperties = () => {
    const defaults = ['name', 'status', 'email', 'phone', 'created_at'];
    return defaults
      .map(id => allProperties.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 5);
  };

  // Calculate available properties (not selected)
  const availableProperties = useMemo(() => {
    const selectedIds = new Set(selectedProperties.map(p => p.id));
    return allProperties.filter(p => !selectedIds.has(p.id));
  }, [allProperties, selectedProperties]);

  // Filter available properties by search
  const filteredAvailableProperties = useMemo(() => {
    if (!searchQuery.trim()) return availableProperties;
    const query = searchQuery.toLowerCase();
    return availableProperties.filter(p =>
      p.label.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)
    );
  }, [availableProperties, searchQuery]);

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  if (layoutsLoading || propertiesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted">Loading preview configuration...</span>
      </div>
    );
  }

  if (layoutsError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500">Failed to load preview layout</p>
        <p className="text-sm text-muted mt-1">{layoutsError.message}</p>
      </div>
    );
  }

  const handleAddProperty = (property) => {
    if (selectedProperties.length >= 10) {
      return;
    }
    setSelectedProperties([...selectedProperties, property]);
    setHasChanges(true);
  };

  const handleRemoveProperty = (property) => {
    setSelectedProperties((prev) => prev.filter((p) => p.id !== property.id));
    setHasChanges(true);
  };

  const handleSectionToggle = (section, checked) => {
    setShowSections(prev => ({ ...prev, [section]: checked }));
    setHasChanges(true);
  };

  const handleResetToDefault = () => {
    setSelectedProperties(getDefaultProperties());
    setShowSections({
      quickInfo: true,
      quickActions: true,
      recentActivity: false,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updatePreviewLayout.mutateAsync({
        id: defaultLayout?.id,
        name: defaultLayout?.name || 'Default view',
        properties: selectedProperties.map(p => ({ id: p.id, label: p.label })),
        show_quick_info: showSections.quickInfo,
        show_quick_actions: showSections.quickActions,
        show_recent_activity: showSections.recentActivity,
        is_default: true,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save preview layout:', error);
    }
  };

  // Drag and drop handlers for reordering
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

    const newProps = [...selectedProperties];
    const [removed] = newProps.splice(dragIndex, 1);
    newProps.splice(dropIndex, 0, removed);
    setSelectedProperties(newProps);
    setHasChanges(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Customize the preview panel for {config.labelSingular} records. You can also{' '}
            <a href="#" className="text-primary hover:underline">update preview cards</a>{' '}
            that appear outside of the CRM.
            <button className="ml-1 inline-flex">
              <Info className="w-3.5 h-3.5 text-muted" />
            </button>
          </p>
        </div>
      </div>

      {/* View Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <Input
                placeholder="Search by view name"
                className="pl-9 w-64"
                disabled
              />
            </div>
            <Button size="sm" disabled>
              Create team view
            </Button>
          </div>
        </div>
      </Card>

      {/* Views Table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-3 text-left">
                <input type="checkbox" className="rounded border-border" disabled />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                View Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {layouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No preview layouts configured. Using default settings.
                </td>
              </tr>
            ) : (
              layouts.map((layout) => (
                <tr key={layout.id} className="hover:bg-surface-secondary/50">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-border" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                        <Eye className="w-3 h-3 text-primary" />
                      </div>
                      <a href="#" className="text-sm text-primary hover:underline font-medium">
                        {layout.name}
                      </a>
                      {layout.is_default && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted">
                      {Array.isArray(layout.assigned_to) && layout.assigned_to.length > 0
                        ? `${layout.assigned_to.length} users/teams`
                        : 'All unassigned teams and users'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text">
                      {layout.updated_at
                        ? new Date(layout.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 rounded hover:bg-surface-secondary">
                      <MoreVertical className="w-4 h-4 text-muted" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Two-column layout for editor */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - Property Selector */}
        <div className="lg:col-span-3 space-y-4">
          {/* Selected Properties */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-text">
                  Properties to Display ({selectedProperties.length}/10)
                </h3>
              </div>
              <button
                onClick={handleResetToDefault}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Default
              </button>
            </div>

            <div className="space-y-1">
              {selectedProperties.map((property, idx) => (
                <div
                  key={property.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  className="flex items-center gap-2 px-3 py-2 border border-border rounded hover:bg-surface-secondary/50 group cursor-move"
                >
                  <GripVertical className="w-4 h-4 text-muted cursor-grab" />
                  <span className="text-xs text-muted w-5">{idx + 1}.</span>
                  <span className="flex-1 text-sm text-text">{property.label}</span>
                  <button
                    onClick={() => handleRemoveProperty(property)}
                    className="p-1 rounded hover:bg-surface-secondary opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted hover:text-red-500" />
                  </button>
                </div>
              ))}

              {selectedProperties.length < 10 && (
                <button className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded text-sm text-muted hover:bg-surface-secondary/50 hover:border-primary/50 hover:text-primary">
                  <Plus className="w-4 h-4" />
                  Add property from below
                </button>
              )}
            </div>

            <p className="text-xs text-muted mt-3">
              Drag to reorder properties. First property will be the most prominent.
            </p>
          </Card>

          {/* Available Properties */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Available Properties</h3>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <Input
                  placeholder="Search properties"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-7 text-xs w-40"
                />
              </div>
            </div>
            {filteredAvailableProperties.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">
                {searchQuery ? 'No properties match your search' : 'All properties are selected'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredAvailableProperties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handleAddProperty(property)}
                    disabled={selectedProperties.length >= 10}
                    className="flex items-center gap-2 px-3 py-2 border border-border rounded text-sm text-text hover:bg-surface-secondary/50 hover:border-primary/50 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5 text-muted" />
                    {property.label}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Section Toggles */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Sections to Show</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-text">Quick Info</span>
                <input
                  type="checkbox"
                  checked={showSections.quickInfo}
                  onChange={(e) => handleSectionToggle('quickInfo', e.target.checked)}
                  className="rounded border-border"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-text">Quick Actions</span>
                <input
                  type="checkbox"
                  checked={showSections.quickActions}
                  onChange={(e) => handleSectionToggle('quickActions', e.target.checked)}
                  className="rounded border-border"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-text">Recent Activity</span>
                <input
                  type="checkbox"
                  checked={showSections.recentActivity}
                  onChange={(e) => handleSectionToggle('recentActivity', e.target.checked)}
                  className="rounded border-border"
                />
              </label>
            </div>
          </Card>
        </div>

        {/* Right Column - Live Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Live Preview</h3>

            {/* Preview Card */}
            <div className="border border-border rounded-lg overflow-hidden bg-surface">
              {/* Preview Header */}
              <div className="px-4 py-3 border-b border-border bg-surface-secondary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <config.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text">
                      Sample {config.labelSingular}
                    </div>
                    <div className="text-xs text-muted">Preview only</div>
                  </div>
                </div>
              </div>

              {/* Quick Info Section */}
              {showSections.quickInfo && (
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-[10px] font-semibold text-muted uppercase mb-2">
                    Quick Info
                  </div>
                  <div className="space-y-2">
                    {selectedProperties.slice(0, 5).map((property) => (
                      <div key={property.id} className="flex justify-between">
                        <span className="text-xs text-muted">{property.label}</span>
                        <span className="text-xs text-text">Sample value</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions Section */}
              {showSections.quickActions && (
                <div className="px-4 py-3 border-b border-border">
                  <div className="text-[10px] font-semibold text-muted uppercase mb-2">
                    Quick Actions
                  </div>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 text-xs bg-primary text-white rounded">
                      Edit
                    </button>
                    <button className="px-2 py-1 text-xs border border-border rounded text-text">
                      View
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Activity Section */}
              {showSections.recentActivity && (
                <div className="px-4 py-3">
                  <div className="text-[10px] font-semibold text-muted uppercase mb-2">
                    Recent Activity
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <div>
                        <div className="text-xs text-text">Status changed</div>
                        <div className="text-[10px] text-muted">2 hours ago</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
                      <div>
                        <div className="text-xs text-text">Note added</div>
                        <div className="text-[10px] text-muted">Yesterday</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-muted mt-3 text-center">
              This is how the preview card will appear on hover
            </p>
          </Card>

          {/* Save Button */}
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!hasChanges || updatePreviewLayout.isPending}
          >
            {updatePreviewLayout.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : hasChanges ? (
              'Save Preview Configuration'
            ) : (
              'No Changes to Save'
            )}
          </Button>

          {updatePreviewLayout.isError && (
            <p className="text-xs text-red-500 text-center">
              Failed to save: {updatePreviewLayout.error.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectPreviewCustomizationTab;
