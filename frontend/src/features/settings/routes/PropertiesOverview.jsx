/**
 * PropertiesOverview - Properties Settings Page
 * Full-width layout showing system and custom properties for each object type
 */

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Search, Plus, ChevronDown, Dog, Users, Calendar, Home, Tag, UserCog,
  Sparkles, GitBranch, FolderOpen, Archive, RefreshCw, Settings, Edit,
  Trash2, RotateCcw, Loader2, GripVertical, X, AlertCircle, FileText,
  DollarSign, CreditCard, Ticket, Package
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Switch from '@/components/ui/Switch';
import { useTimezoneUtils } from '@/lib/timezone';
import {
  useProperties,
  useCreateProperty,
  useUpdateProperty,
  useArchiveProperty,
  useRestoreProperty,
  usePropertyGroups,
  useCreatePropertyGroup,
  useUpdatePropertyGroup,
  useDeletePropertyGroup,
  usePropertyLogicRules,
  useCreatePropertyLogicRule,
  useDeletePropertyLogicRule,
  usePropertyTemplates,
  useCreatePropertyFromTemplate,
} from '../api/propertiesApi';
import { cn } from '@/lib/cn';

// Entity type configuration
const ENTITY_TYPES = [
  { id: 'pet', label: 'Pets', icon: Dog, color: 'blue' },
  { id: 'owner', label: 'Owners', icon: Users, color: 'emerald' },
  { id: 'booking', label: 'Bookings', icon: Calendar, color: 'purple' },
  { id: 'service', label: 'Services', icon: Tag, color: 'pink' },
  { id: 'kennel', label: 'Kennels', icon: Home, color: 'amber' },
  { id: 'staff', label: 'Staff', icon: UserCog, color: 'cyan' },
  { id: 'invoice', label: 'Invoices', icon: FileText, color: 'indigo' },
  { id: 'payment', label: 'Payments', icon: DollarSign, color: 'green' },
];

// Field type configuration
const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'textarea', label: 'Long Text', icon: '📄' },
  { value: 'number', label: 'Number', icon: '#' },
  { value: 'currency', label: 'Currency', icon: '$' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'datetime', label: 'Date & Time', icon: '🕐' },
  { value: 'boolean', label: 'Checkbox', icon: '☑' },
  { value: 'enum', label: 'Dropdown', icon: '▼' },
  { value: 'multi_enum', label: 'Multi-select', icon: '☑' },
  { value: 'email', label: 'Email', icon: '✉' },
  { value: 'phone', label: 'Phone', icon: '📞' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'file', label: 'File', icon: '📎' },
  { value: 'image', label: 'Image', icon: '🖼' },
  { value: 'relation', label: 'Relation', icon: '🔗' },
  { value: 'user', label: 'User', icon: '👤' },
];

// Condition operators for logic rules
const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
  { value: 'is_true', label: 'Is checked' },
  { value: 'is_false', label: 'Is not checked' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
];

const PropertiesOverview = () => {
  const tz = useTimezoneUtils();
  const [selectedEntity, setSelectedEntity] = useState('pet');
  const [activeTab, setActiveTab] = useState('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showLogicModal, setShowLogicModal] = useState(false);

  // API hooks
  const { data: properties = [], isLoading, refetch } = useProperties(selectedEntity, { includeArchived: activeTab === 'archived' });
  const { data: propertyGroups = [] } = usePropertyGroups(selectedEntity);
  const { data: logicRules = [] } = usePropertyLogicRules(selectedEntity);
  const { data: templates = [] } = usePropertyTemplates(selectedEntity);

  const createProperty = useCreateProperty(selectedEntity);
  const updateProperty = useUpdateProperty(selectedEntity);
  const archiveProperty = useArchiveProperty(selectedEntity);
  const restoreProperty = useRestoreProperty(selectedEntity);
  const createPropertyFromTemplate = useCreatePropertyFromTemplate(selectedEntity);

  const createGroup = useCreatePropertyGroup(selectedEntity);
  const updateGroup = useUpdatePropertyGroup(selectedEntity);
  const deleteGroup = useDeletePropertyGroup(selectedEntity);

  const createLogicRule = useCreatePropertyLogicRule(selectedEntity);
  const deleteLogicRule = useDeletePropertyLogicRule(selectedEntity);

  // Current entity config
  const currentEntity = ENTITY_TYPES.find(e => e.id === selectedEntity) || ENTITY_TYPES[0];
  const EntityIcon = currentEntity.icon;

  // Filter properties
  const filteredProperties = useMemo(() => {
    let filtered = [...properties];

    // Filter out archived unless on archived tab
    if (activeTab !== 'archived') {
      filtered = filtered.filter(p => !p.archivedAt);
    } else {
      filtered = filtered.filter(p => p.archivedAt);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.displayLabel?.toLowerCase().includes(q) ||
        p.propertyName?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    if (groupFilter !== 'all') {
      filtered = filtered.filter(p => p.propertyGroup === groupFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.dataType === typeFilter);
    }

    // Sort: system properties first, then by sortOrder
    return filtered.sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }, [properties, searchQuery, groupFilter, typeFilter, activeTab]);

  // Get unique groups from properties
  const availableGroups = useMemo(() => {
    const groups = new Set(properties.map(p => p.propertyGroup).filter(Boolean));
    return Array.from(groups).sort();
  }, [properties]);

  // Counts for tabs
  const activeCount = properties.filter(p => !p.archivedAt).length;
  const archivedCount = properties.filter(p => p.archivedAt).length;
  const systemCount = properties.filter(p => p.isSystem).length;
  const customCount = properties.filter(p => !p.isSystem && !p.archivedAt).length;

  // Handlers
  const handleArchiveProperty = async (propertyId) => {
    if (!confirm('Archive this property? It will no longer appear in forms.')) return;
    try {
      await archiveProperty.mutateAsync({ propertyId, cascadeStrategy: 'keep' });
      toast.success('Property archived');
    } catch (err) {
      toast.error('Failed to archive property');
    }
  };

  const handleRestoreProperty = async (propertyId) => {
    try {
      await restoreProperty.mutateAsync(propertyId);
      toast.success('Property restored');
    } catch (err) {
      toast.error('Failed to restore property');
    }
  };

  const handleCreateFromTemplate = async (template) => {
    // Check if already exists
    const exists = properties.some(p =>
      p.propertyName === template.name || p.displayLabel?.toLowerCase() === template.label?.toLowerCase()
    );
    if (exists) {
      toast.error('This property already exists');
      return;
    }

    try {
      await createPropertyFromTemplate.mutateAsync(template);
      toast.success(`${template.label} added`);
    } catch (err) {
      toast.error('Failed to add property');
    }
  };

  const handleDeleteLogicRule = async (ruleId) => {
    if (!confirm('Delete this logic rule?')) return;
    try {
      await deleteLogicRule.mutateAsync(ruleId);
      toast.success('Rule deleted');
    } catch (err) {
      toast.error('Failed to delete rule');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const group = propertyGroups.find(g => g.id === groupId);
    if (group?.isSystem) {
      toast.error('Cannot delete system groups');
      return;
    }
    if (!confirm(`Delete "${group?.name}"? Properties in this group will need to be reassigned.`)) return;
    try {
      await deleteGroup.mutateAsync(groupId);
      toast.success('Group deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete group');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${currentEntity.color}-500/10`}>
              <EntityIcon className={`w-6 h-6 text-${currentEntity.color}-500`} />
            </div>
            {currentEntity.label} Properties
          </h1>
          <p className="mt-1 text-muted">
            Manage all properties for your {currentEntity.label.toLowerCase()} — {systemCount} system fields, {customCount} custom fields
          </p>
        </div>
        <Button onClick={() => { setEditingProperty(null); setShowCreateModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Property
        </Button>
      </div>

      {/* Entity Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TYPES.map(entity => {
          const Icon = entity.icon;
          const isSelected = selectedEntity === entity.id;
          return (
            <button
              key={entity.id}
              onClick={() => setSelectedEntity(entity.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all",
                isSelected
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50 text-muted hover:text-text"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{entity.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1.5 bg-surface rounded-xl border border-border w-fit">
        {[
          { id: 'properties', label: 'Properties', icon: Settings, count: activeCount },
          { id: 'quickadd', label: 'Quick Add', icon: Sparkles, count: templates.length },
          { id: 'groups', label: 'Groups', icon: FolderOpen, count: propertyGroups.length },
          { id: 'logic', label: 'Logic', icon: GitBranch, count: logicRules.length },
          { id: 'archived', label: 'Archived', icon: Archive, count: archivedCount },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-white shadow-md"
                : "text-muted hover:text-text hover:bg-surface-secondary"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <Badge variant={activeTab === tab.id ? "neutral" : "secondary"} className="ml-1">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Groups' },
                  ...availableGroups.map(g => ({ value: g, label: g }))
                ]}
              />
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Types' },
                  ...FIELD_TYPES.map(t => ({ value: t.value, label: `${t.icon} ${t.label}` }))
                ]}
              />
              <Button variant="ghost" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </Card>

          {/* Properties Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Property Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Label</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Field Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Group</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Required</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted" />
                      </td>
                    </tr>
                  ) : filteredProperties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted">
                        {searchQuery || groupFilter !== 'all' || typeFilter !== 'all'
                          ? 'No properties match your filters'
                          : 'No properties found. Create one or use Quick Add templates.'}
                      </td>
                    </tr>
                  ) : (
                    filteredProperties.map(prop => {
                      const fieldType = FIELD_TYPES.find(f => f.value === prop.dataType);
                      return (
                        <tr key={prop.id} className="hover:bg-surface-secondary/50">
                          <td className="px-4 py-3">
                            <code className="text-sm text-muted bg-surface-secondary px-1.5 py-0.5 rounded">
                              {prop.propertyName}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-text">{prop.displayLabel}</span>
                            {prop.description && (
                              <p className="text-xs text-muted mt-0.5 line-clamp-1">{prop.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-text flex items-center gap-1.5">
                              <span>{fieldType?.icon}</span>
                              {fieldType?.label || prop.dataType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted">{prop.propertyGroup || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {prop.isRequired && (
                              <Badge variant="warning" className="text-xs">Required</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={prop.isSystem ? "secondary" : "primary"} className="text-xs">
                              {prop.isSystem ? 'System' : 'Custom'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingProperty(prop); setShowCreateModal(true); }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {!prop.isSystem && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => handleArchiveProperty(prop.id)}
                                >
                                  <Archive className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Quick Add Tab */}
      {activeTab === 'quickadd' && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-text">Quick Add Templates</h3>
            <p className="text-sm text-muted">Common properties for {currentEntity.label.toLowerCase()} - click to add instantly</p>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <p className="text-muted">No templates available for {currentEntity.label.toLowerCase()} yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => {
                const alreadyExists = properties.some(p =>
                  p.propertyName === template.name || p.displayLabel?.toLowerCase() === template.label?.toLowerCase()
                );
                const fieldType = FIELD_TYPES.find(f => f.value === template.fieldType);

                return (
                  <button
                    key={template.id}
                    onClick={() => !alreadyExists && handleCreateFromTemplate(template)}
                    disabled={alreadyExists || createPropertyFromTemplate.isPending}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      alreadyExists
                        ? "border-green-500/30 bg-green-500/5 cursor-default"
                        : "border-border hover:border-primary hover:shadow-md bg-surface"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-2xl">{fieldType?.icon}</div>
                      {alreadyExists && <Badge variant="success">Added</Badge>}
                    </div>
                    <h4 className="font-medium text-text">{template.label}</h4>
                    <p className="text-xs text-muted mt-1 line-clamp-2">{template.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="neutral">{fieldType?.label || template.fieldType}</Badge>
                      <span className="text-xs text-muted">{template.propertyGroup}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-text">Property Groups</h3>
              <p className="text-sm text-muted">Organize properties into sections on forms</p>
            </div>
            <Button onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>

          {propertyGroups.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <p className="text-muted">No custom groups created yet</p>
              <p className="text-sm text-muted mt-1">System groups are created automatically from property assignments</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {propertyGroups.map(group => {
                const propsInGroup = properties.filter(p => p.propertyGroup === group.name);
                return (
                  <div
                    key={group.id}
                    className="p-4 rounded-lg border border-border bg-surface hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-text">{group.name}</h4>
                        {group.description && (
                          <p className="text-xs text-muted mt-0.5">{group.description}</p>
                        )}
                      </div>
                      {group.isSystem && <Badge variant="secondary">System</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{propsInGroup.length} properties</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingGroup(group); setShowGroupModal(true); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!group.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Logic Tab */}
      {activeTab === 'logic' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-text">Conditional Logic</h3>
              <p className="text-sm text-muted">Show or hide properties based on other field values</p>
            </div>
            <Button onClick={() => setShowLogicModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </div>

          {logicRules.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-text mb-2">Smart Field Logic</h4>
              <p className="text-muted max-w-md mx-auto mb-6">
                Create rules to show fields only when relevant. For example, show "Insulin Dosage" only when "Diabetic" is checked.
              </p>
              <div className="bg-surface-secondary rounded-lg p-4 max-w-lg mx-auto text-left mb-6">
                <p className="text-sm font-medium text-text mb-3">Example Rules:</p>
                <ul className="space-y-2 text-sm text-muted">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">-</span>
                    Show "Insulin Schedule" only if "Diabetic" is checked
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">-</span>
                    Show "Medication Instructions" only if "Has Medication" is true
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {logicRules.map(rule => (
                <div key={rule.id} className="p-4 rounded-lg border border-border bg-surface">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-text">
                        When <code className="bg-surface-secondary px-1.5 py-0.5 rounded">{rule.triggerProperty}</code>
                        {' '}{rule.conditionOperator.replace('_', ' ')}{' '}
                        {rule.conditionValue && <code className="bg-surface-secondary px-1.5 py-0.5 rounded">{rule.conditionValue}</code>}
                      </p>
                      <p className="text-sm text-muted mt-1">
                        <span className="capitalize">{rule.action}</span>: {rule.affectedProperties?.join(', ')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleDeleteLogicRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Archived Tab */}
      {activeTab === 'archived' && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-text">Archived Properties</h3>
            <p className="text-sm text-muted">Properties that are no longer active - restore them anytime</p>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-text mb-2">No Archived Properties</h4>
              <p className="text-muted">Properties you archive will appear here. You can restore them anytime.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProperties.map(prop => {
                const fieldType = FIELD_TYPES.find(f => f.value === prop.dataType);
                return (
                  <div key={prop.id} className="p-4 rounded-lg border border-border bg-surface-secondary/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{fieldType?.icon}</span>
                        <span className="font-medium text-text">{prop.displayLabel}</span>
                        <code className="text-xs text-muted bg-surface px-1.5 py-0.5 rounded">{prop.propertyName}</code>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Archived {prop.archivedAt ? tz.formatShortDate(prop.archivedAt) : 'recently'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreProperty(prop.id)}
                        disabled={restoreProperty.isPending}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Create/Edit Property Modal */}
      <PropertyModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingProperty(null); }}
        property={editingProperty}
        entityType={selectedEntity}
        groups={availableGroups}
        onSave={async (data) => {
          try {
            if (editingProperty) {
              await updateProperty.mutateAsync({ id: editingProperty.id, ...data });
              toast.success('Property updated');
            } else {
              await createProperty.mutateAsync(data);
              toast.success('Property created');
            }
            setShowCreateModal(false);
            setEditingProperty(null);
          } catch (err) {
            toast.error(err.message || 'Failed to save property');
          }
        }}
        isSaving={createProperty.isPending || updateProperty.isPending}
      />

      {/* Create/Edit Group Modal */}
      <GroupModal
        isOpen={showGroupModal}
        onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
        group={editingGroup}
        entityType={selectedEntity}
        onSave={async (data) => {
          try {
            if (editingGroup) {
              await updateGroup.mutateAsync({ id: editingGroup.id, ...data });
              toast.success('Group updated');
            } else {
              await createGroup.mutateAsync(data);
              toast.success('Group created');
            }
            setShowGroupModal(false);
            setEditingGroup(null);
          } catch (err) {
            toast.error(err.message || 'Failed to save group');
          }
        }}
        isSaving={createGroup.isPending || updateGroup.isPending}
      />

      {/* Create Logic Rule Modal */}
      <LogicRuleModal
        isOpen={showLogicModal}
        onClose={() => setShowLogicModal(false)}
        properties={properties.filter(p => !p.archivedAt)}
        entityType={selectedEntity}
        onSave={async (data) => {
          try {
            await createLogicRule.mutateAsync(data);
            toast.success('Rule created');
            setShowLogicModal(false);
          } catch (err) {
            toast.error(err.message || 'Failed to create rule');
          }
        }}
        isSaving={createLogicRule.isPending}
      />
    </div>
  );
};

// Property Modal Component
const PropertyModal = ({ isOpen, onClose, property, entityType, groups, onSave, isSaving }) => {
  const [form, setForm] = useState({
    label: '',
    name: '',
    description: '',
    fieldType: 'text',
    propertyGroup: 'General',
    required: false,
    showInForm: true,
    showInList: false,
    showInSearch: false,
    options: [],
  });
  const [newOption, setNewOption] = useState('');

  // Reset form when property changes
  useState(() => {
    if (property) {
      setForm({
        label: property.displayLabel || '',
        name: property.propertyName || '',
        description: property.description || '',
        fieldType: property.dataType || 'text',
        propertyGroup: property.propertyGroup || 'General',
        required: property.isRequired || false,
        showInForm: property.showInForm !== false,
        showInList: property.showInList || false,
        showInSearch: property.showInSearch || false,
        options: property.options || [],
      });
    } else {
      setForm({
        label: '',
        name: '',
        description: '',
        fieldType: 'text',
        propertyGroup: 'General',
        required: false,
        showInForm: true,
        showInList: false,
        showInSearch: false,
        options: [],
      });
    }
  }, [property]);

  const isSystemProperty = property?.isSystem;
  const needsOptions = form.fieldType === 'enum' || form.fieldType === 'multi_enum';

  const handleAddOption = () => {
    if (newOption.trim()) {
      setForm(prev => ({
        ...prev,
        options: [...(prev.options || []), newOption.trim()],
      }));
      setNewOption('');
    }
  };

  const handleRemoveOption = (index) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.label.trim()) return;

    onSave({
      label: form.label,
      name: form.name || form.label.toLowerCase().replace(/\s+/g, '_'),
      description: form.description,
      fieldType: form.fieldType,
      propertyGroup: form.propertyGroup,
      required: form.required,
      showInForm: form.showInForm,
      showInList: form.showInList,
      showInSearch: form.showInSearch,
      options: needsOptions ? form.options : undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={property ? 'Edit Property' : 'Create Property'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {isSystemProperty && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-700">
            This is a system property. Only label, description, and visibility settings can be changed.
          </div>
        )}

        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Display Label *</label>
          <Input
            value={form.label}
            onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
            placeholder="e.g., Dietary Restrictions"
            required
          />
        </div>

        {/* Internal Name */}
        {!property && (
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Internal Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Auto-generated from label"
            />
            <p className="text-xs text-muted mt-1">Used in API and exports. Leave blank to auto-generate.</p>
          </div>
        )}

        {/* Field Type */}
        {!isSystemProperty && (
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Field Type</label>
            <Select
              value={form.fieldType}
              onChange={(e) => setForm(prev => ({ ...prev, fieldType: e.target.value, options: [] }))}
              options={FIELD_TYPES.map(t => ({ value: t.value, label: `${t.icon} ${t.label}` }))}
            />
          </div>
        )}

        {/* Options for enum/multi_enum */}
        {needsOptions && !isSystemProperty && (
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Options</label>
            <div className="space-y-2">
              {form.options?.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface-secondary rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-text">{opt}</span>
                  <button type="button" onClick={() => handleRemoveOption(idx)} className="text-muted hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add an option..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddOption}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Description</label>
          <Input
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Help text shown to users"
          />
        </div>

        {/* Group */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Property Group</label>
          <Select
            value={form.propertyGroup}
            onChange={(e) => setForm(prev => ({ ...prev, propertyGroup: e.target.value }))}
            options={[
              { value: 'General', label: 'General' },
              { value: 'Basic Info', label: 'Basic Info' },
              { value: 'Contact', label: 'Contact' },
              { value: 'Address', label: 'Address' },
              { value: 'Medical & Health', label: 'Medical & Health' },
              { value: 'Behavior', label: 'Behavior' },
              { value: 'Food & Diet', label: 'Food & Diet' },
              { value: 'Preferences', label: 'Preferences' },
              { value: 'Emergency', label: 'Emergency' },
              { value: 'Financial', label: 'Financial' },
              { value: 'Custom', label: 'Custom' },
              ...groups.filter(g => !['General', 'Basic Info', 'Contact', 'Address', 'Medical & Health', 'Behavior', 'Food & Diet', 'Preferences', 'Emergency', 'Financial', 'Custom'].includes(g)).map(g => ({ value: g, label: g })),
            ]}
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2">
          {!isSystemProperty && (
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-text">Required Field</p>
                <p className="text-xs text-muted">Users must fill this out</p>
              </div>
              <Switch
                checked={form.required}
                onChange={(checked) => setForm(prev => ({ ...prev, required: checked }))}
              />
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-text">Show in Forms</p>
              <p className="text-xs text-muted">Display on create/edit forms</p>
            </div>
            <Switch
              checked={form.showInForm}
              onChange={(checked) => setForm(prev => ({ ...prev, showInForm: checked }))}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-text">Show in Lists</p>
              <p className="text-xs text-muted">Display as a column in tables</p>
            </div>
            <Switch
              checked={form.showInList}
              onChange={(checked) => setForm(prev => ({ ...prev, showInList: checked }))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || !form.label.trim()} className="flex-1">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {property ? 'Save Changes' : 'Create Property'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Group Modal Component
const GroupModal = ({ isOpen, onClose, group, entityType, onSave, isSaving }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    displayOrder: 0,
    isCollapsedDefault: false,
  });

  useState(() => {
    if (group) {
      setForm({
        name: group.name || '',
        description: group.description || '',
        displayOrder: group.displayOrder || 0,
        isCollapsedDefault: group.isCollapsedDefault || false,
      });
    } else {
      setForm({
        name: '',
        description: '',
        displayOrder: 0,
        isCollapsedDefault: false,
      });
    }
  }, [group]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={group ? 'Edit Group' : 'Create Group'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Group Name *</label>
          <Input
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Medical Information"
            required
            disabled={group?.isSystem}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Description</label>
          <Input
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Display Order</label>
          <Input
            type="number"
            value={form.displayOrder}
            onChange={(e) => setForm(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
          />
          <p className="text-xs text-muted mt-1">Lower numbers appear first</p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-text">Collapsed by Default</p>
            <p className="text-xs text-muted">Start with this section collapsed on forms</p>
          </div>
          <Switch
            checked={form.isCollapsedDefault}
            onChange={(checked) => setForm(prev => ({ ...prev, isCollapsedDefault: checked }))}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || !form.name.trim()} className="flex-1">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {group ? 'Save Changes' : 'Create Group'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Logic Rule Modal Component
const LogicRuleModal = ({ isOpen, onClose, properties, entityType, onSave, isSaving }) => {
  const [form, setForm] = useState({
    name: '',
    triggerProperty: '',
    conditionOperator: 'equals',
    conditionValue: '',
    affectedProperties: [],
    action: 'show',
  });

  const handleToggleAffected = (propName) => {
    setForm(prev => ({
      ...prev,
      affectedProperties: prev.affectedProperties.includes(propName)
        ? prev.affectedProperties.filter(p => p !== propName)
        : [...prev.affectedProperties, propName],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.triggerProperty || form.affectedProperties.length === 0) return;
    onSave(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Logic Rule">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Rule Name</label>
          <Input
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Show medication fields"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">When this property...</label>
          <Select
            value={form.triggerProperty}
            onChange={(e) => setForm(prev => ({ ...prev, triggerProperty: e.target.value }))}
            options={[
              { value: '', label: 'Select a property' },
              ...properties.map(p => ({ value: p.propertyName, label: p.displayLabel })),
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Condition</label>
          <Select
            value={form.conditionOperator}
            onChange={(e) => setForm(prev => ({ ...prev, conditionOperator: e.target.value }))}
            options={CONDITION_OPERATORS}
          />
        </div>

        {!['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(form.conditionOperator) && (
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Value</label>
            <Input
              value={form.conditionValue}
              onChange={(e) => setForm(prev => ({ ...prev, conditionValue: e.target.value }))}
              placeholder="Enter value"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Action</label>
          <Select
            value={form.action}
            onChange={(e) => setForm(prev => ({ ...prev, action: e.target.value }))}
            options={[
              { value: 'show', label: 'Show properties' },
              { value: 'hide', label: 'Hide properties' },
              { value: 'require', label: 'Make required' },
              { value: 'disable', label: 'Disable properties' },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Affected Properties</label>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
            {properties.filter(p => p.propertyName !== form.triggerProperty).map(prop => (
              <label key={prop.id} className="flex items-center gap-2 p-2 rounded hover:bg-surface-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.affectedProperties.includes(prop.propertyName)}
                  onChange={() => handleToggleAffected(prop.propertyName)}
                  className="rounded"
                />
                <span className="text-sm text-text">{prop.displayLabel}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || !form.triggerProperty || form.affectedProperties.length === 0} className="flex-1">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Rule
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PropertiesOverview;
