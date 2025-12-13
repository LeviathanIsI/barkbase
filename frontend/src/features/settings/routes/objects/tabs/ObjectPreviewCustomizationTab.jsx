import { useState } from 'react';
import {
  Eye, Plus, GripVertical, Trash2, RotateCcw, Search,
  MoreVertical, Layout, Info
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { OBJECT_TYPES } from '../objectConfig';

const ObjectPreviewCustomizationTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];

  const defaultProperties = [
    { id: 'name', label: 'Name', enabled: true },
    { id: 'email', label: 'Email', enabled: true },
    { id: 'phone', label: 'Phone', enabled: true },
    { id: 'status', label: 'Status', enabled: true },
    { id: 'createdAt', label: 'Created Date', enabled: true },
    { id: 'owner', label: 'Record Owner', enabled: false },
    { id: 'lastModified', label: 'Last Modified', enabled: false },
    { id: 'notes', label: 'Notes', enabled: false },
  ];

  const [selectedProperties, setSelectedProperties] = useState(
    defaultProperties.filter((p) => p.enabled)
  );
  const [availableProperties, setAvailableProperties] = useState(
    defaultProperties.filter((p) => !p.enabled)
  );
  const [showSections, setShowSections] = useState({
    quickInfo: true,
    quickActions: true,
    recentActivity: false,
  });

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  const handleAddProperty = (property) => {
    if (selectedProperties.length >= 10) {
      alert('Maximum 10 properties allowed');
      return;
    }
    setSelectedProperties([...selectedProperties, property]);
    setAvailableProperties((prev) => prev.filter((p) => p.id !== property.id));
  };

  const handleRemoveProperty = (property) => {
    setSelectedProperties((prev) => prev.filter((p) => p.id !== property.id));
    setAvailableProperties([...availableProperties, property]);
  };

  const handleResetToDefault = () => {
    setSelectedProperties(defaultProperties.filter((p) => p.enabled));
    setAvailableProperties(defaultProperties.filter((p) => !p.enabled));
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
              />
            </div>
            <Button size="sm">
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
                <input type="checkbox" className="rounded border-border" />
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
            <tr className="hover:bg-surface-secondary/50">
              <td className="px-4 py-3">
                <input type="checkbox" className="rounded border-border" />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                    <Eye className="w-3 h-3 text-primary" />
                  </div>
                  <a href="#" className="text-sm text-primary hover:underline font-medium">
                    Default view
                  </a>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-muted">All unassigned teams and users</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-text">Dec 12, 2024 3:45 PM</span>
              </td>
              <td className="px-4 py-3 text-right">
                <button className="p-1.5 rounded hover:bg-surface-secondary">
                  <MoreVertical className="w-4 h-4 text-muted" />
                </button>
              </td>
            </tr>
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
                  className="flex items-center gap-2 px-3 py-2 border border-border rounded hover:bg-surface-secondary/50 group"
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
                  Add property
                </button>
              )}
            </div>

            <p className="text-xs text-muted mt-3">
              Drag to reorder properties. First property will be the most prominent.
            </p>
          </Card>

          {/* Available Properties */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Available Properties</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableProperties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => handleAddProperty(property)}
                  className="flex items-center gap-2 px-3 py-2 border border-border rounded text-sm text-text hover:bg-surface-secondary/50 hover:border-primary/50 text-left"
                >
                  <Plus className="w-3.5 h-3.5 text-muted" />
                  {property.label}
                </button>
              ))}
            </div>
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
                  onChange={(e) => setShowSections((prev) => ({ ...prev, quickInfo: e.target.checked }))}
                  className="rounded border-border"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-text">Quick Actions</span>
                <input
                  type="checkbox"
                  checked={showSections.quickActions}
                  onChange={(e) => setShowSections((prev) => ({ ...prev, quickActions: e.target.checked }))}
                  className="rounded border-border"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-text">Recent Activity</span>
                <input
                  type="checkbox"
                  checked={showSections.recentActivity}
                  onChange={(e) => setShowSections((prev) => ({ ...prev, recentActivity: e.target.checked }))}
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
          <Button className="w-full">
            Save Preview Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ObjectPreviewCustomizationTab;
