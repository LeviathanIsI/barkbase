import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, ChevronDown, Dog, Users, Calendar, Home, Tag, UserCog,
  Sparkles, GitBranch, FolderOpen, Archive, RefreshCw, Settings, Filter,
  Heart, Stethoscope, Utensils, Phone, Star, Bone, PawPrint, X, Trash2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Switch from '@/components/ui/Switch';
import {
  usePropertiesV2Query,
  useArchivePropertyMutation,
  useRestorePropertyMutation,
  useEntityDefinitionsQuery,
  useCreatePropertyMutation,
} from '../api';
import { cn } from '@/lib/cn';

// Default system entity types (fallback if API not loaded)
const DEFAULT_ENTITY_TYPES = [
  { id: 'pet', label: 'Pet', icon: Dog, iconClass: 'text-blue-500', bgClass: 'bg-blue-500/10', description: 'Track pet details, preferences, and health', isSystem: true },
  { id: 'owner', label: 'Owner', icon: Users, iconClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10', description: 'Customer info and preferences', isSystem: true },
  { id: 'booking', label: 'Booking', icon: Calendar, iconClass: 'text-purple-500', bgClass: 'bg-purple-500/10', description: 'Reservation details and requests', isSystem: true },
  { id: 'kennel', label: 'Kennel', icon: Home, iconClass: 'text-amber-500', bgClass: 'bg-amber-500/10', description: 'Run and suite attributes', isSystem: true },
  { id: 'service', label: 'Service', icon: Tag, iconClass: 'text-pink-500', bgClass: 'bg-pink-500/10', description: 'Service options and add-ons', isSystem: true },
  { id: 'staff', label: 'Staff', icon: UserCog, iconClass: 'text-cyan-500', bgClass: 'bg-cyan-500/10', description: 'Employee details and certifications', isSystem: true },
];

// Icon mapping for dynamic entity types
const ICON_MAP = {
  Dog: Dog,
  User: Users,
  Users: Users,
  Calendar: Calendar,
  Home: Home,
  Briefcase: Tag,
  Scissors: Sparkles,
  GraduationCap: Star,
  default: Tag,
};

// Color class mapping
const COLOR_MAP = {
  '#8B5CF6': { icon: 'text-violet-500', bg: 'bg-violet-500/10' },
  '#3B82F6': { icon: 'text-blue-500', bg: 'bg-blue-500/10' },
  '#10B981': { icon: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  '#F59E0B': { icon: 'text-amber-500', bg: 'bg-amber-500/10' },
  '#EC4899': { icon: 'text-pink-500', bg: 'bg-pink-500/10' },
  '#6366F1': { icon: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  '#F472B6': { icon: 'text-pink-400', bg: 'bg-pink-400/10' },
  default: { icon: 'text-gray-500', bg: 'bg-gray-500/10' },
};

const FIELD_TYPES = [
  { value: 'string', label: 'Text', icon: '📝' },
  { value: 'text', label: 'Long Text', icon: '📄' },
  { value: 'boolean', label: 'Yes/No', icon: '✓' },
  { value: 'enum', label: 'Dropdown', icon: '▼' },
  { value: 'multi_enum', label: 'Multi-select', icon: '☑' },
  { value: 'number', label: 'Number', icon: '#' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'currency', label: 'Currency', icon: '$' },
];

// Kennel-specific property templates
const PROPERTY_TEMPLATES = {
  pet: [
    { name: 'Dietary Restrictions', type: 'multi_enum', icon: Utensils, options: ['Grain-free', 'Limited ingredient', 'Raw diet', 'Prescription food', 'Food allergies'], description: 'Special feeding requirements' },
    { name: 'Behavioral Notes', type: 'multi_enum', icon: Heart, options: ['Reactive to dogs', 'Shy/nervous', 'High energy', 'Escape artist', 'Resource guarder', 'Separation anxiety'], description: 'Important behavior flags' },
    { name: 'Medical Conditions', type: 'multi_enum', icon: Stethoscope, options: ['Diabetes', 'Seizures', 'Heart condition', 'Arthritis', 'Allergies', 'Incontinence'], description: 'Health conditions to monitor' },
    { name: 'Preferred Run Type', type: 'enum', icon: Home, options: ['Indoor only', 'Outdoor with shelter', 'Suite', 'Quiet area', 'Near office'], description: 'Accommodation preferences' },
    { name: 'Daycare Group', type: 'enum', icon: PawPrint, options: ['Small dogs', 'Large dogs', 'Senior/calm', 'Puppies', 'Solo play only'], description: 'Play group assignment' },
    { name: 'Favorite Toys', type: 'text', icon: Bone, description: 'Toys and enrichment preferences' },
  ],
  owner: [
    { name: 'VIP Status', type: 'enum', icon: Star, options: ['Regular', 'Silver', 'Gold', 'Platinum'], description: 'Loyalty tier' },
    { name: 'Contact Preference', type: 'enum', icon: Phone, options: ['Call', 'Text', 'Email', 'App notification'], description: 'How they prefer updates' },
    { name: 'Update Frequency', type: 'enum', icon: Calendar, options: ['Daily photos', 'Every other day', 'Only if needed', 'End of stay summary'], description: 'How often to send updates' },
    { name: 'Referral Source', type: 'enum', icon: Users, options: ['Google', 'Vet referral', 'Friend/family', 'Facebook', 'Yelp', 'Drive-by'], description: 'How they found you' },
  ],
  booking: [
    { name: 'Special Requests', type: 'text', icon: Sparkles, description: 'Customer notes and requests' },
    { name: 'Pickup Authorization', type: 'text', icon: Users, description: 'Who can pick up the pet' },
    { name: 'Add-on Services', type: 'multi_enum', icon: Tag, options: ['Bath', 'Nail trim', 'Teeth brushing', 'Extra playtime', 'Training session', 'Cuddle time'], description: 'Selected extras' },
  ],
};

// Suggested property groups for kennels
const SUGGESTED_GROUPS = [
  { name: 'Basic Info', icon: Dog, iconClass: 'text-blue-500', bgClass: 'bg-blue-500/10', description: 'Name, breed, age, weight', fields: ['name', 'breed', 'age', 'weight', 'color'] },
  { name: 'Medical & Health', icon: Stethoscope, iconClass: 'text-rose-500', bgClass: 'bg-rose-500/10', description: 'Medications, conditions, vet info', fields: ['medications', 'conditions', 'vet_name', 'vet_phone'] },
  { name: 'Behavior', icon: Heart, iconClass: 'text-pink-500', bgClass: 'bg-pink-500/10', description: 'Temperament, flags, training', fields: ['behavioral_notes', 'training_level', 'play_style'] },
  { name: 'Food & Diet', icon: Utensils, iconClass: 'text-amber-500', bgClass: 'bg-amber-500/10', description: 'Feeding schedule, restrictions', fields: ['food_brand', 'feeding_schedule', 'dietary_restrictions'] },
  { name: 'Emergency', icon: Phone, iconClass: 'text-purple-500', bgClass: 'bg-purple-500/10', description: 'Backup contacts, authorization', fields: ['emergency_contact', 'emergency_phone', 'vet_authorization'] },
  { name: 'Preferences', icon: Star, iconClass: 'text-yellow-500', bgClass: 'bg-yellow-500/10', description: 'Run type, group, special requests', fields: ['preferred_run', 'daycare_group', 'special_requests'] },
];

const PropertiesOverview = () => {
  const [selectedEntity, setSelectedEntity] = useState('pet');
  const [activeTab, setActiveTab] = useState('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(null);

  // API queries
  const { data: propertiesData, isLoading, refetch } = usePropertiesV2Query(selectedEntity, { includeUsage: true });
  const { data: entityDefsData } = useEntityDefinitionsQuery();
  const createMutation = useCreatePropertyMutation();
  const archiveMutation = useArchivePropertyMutation();

  // propertiesData is already the array (API hook extracts it)
  const properties = Array.isArray(propertiesData) ? propertiesData : (propertiesData?.properties || []);
  const hasProperties = properties.length > 0;

  // Build entity types list from API (with fallback to defaults)
  const entityTypes = useMemo(() => {
    const apiEntities = entityDefsData?.entities || [];
    
    if (apiEntities.length === 0) {
      return DEFAULT_ENTITY_TYPES;
    }

    // Map API entities to our format
    return apiEntities.map(entity => {
      // Find matching default for icon/colors, or use API values
      const defaultEntity = DEFAULT_ENTITY_TYPES.find(d => d.id === entity.internalName);
      const iconComponent = ICON_MAP[entity.icon] || ICON_MAP.default;
      const colors = COLOR_MAP[entity.color] || COLOR_MAP.default;

      return {
        id: entity.internalName,
        label: entity.singularName,
        pluralLabel: entity.pluralName,
        icon: defaultEntity?.icon || iconComponent,
        iconClass: defaultEntity?.iconClass || colors.icon,
        bgClass: defaultEntity?.bgClass || colors.bg,
        description: entity.description || `Manage ${entity.pluralName?.toLowerCase() || 'items'}`,
        isSystem: entity.isSystem,
        color: entity.color,
      };
    }).sort((a, b) => {
      // System entities first, then custom
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return 0;
    });
  }, [entityDefsData]);

  // Separate system and custom entities for display
  const systemEntities = entityTypes.filter(e => e.isSystem);
  const customEntities = entityTypes.filter(e => !e.isSystem);

  // Filter properties
  const filteredProperties = useMemo(() => {
    let filtered = [...properties];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.displayLabel?.toLowerCase().includes(q) ||
        p.propertyName?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(p => p.propertyGroup === selectedGroup);
    }
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.dataType === selectedType);
    }
    
    return filtered;
  }, [properties, searchQuery, selectedGroup, selectedType]);

  const availableGroups = [...new Set(properties.map(p => p.propertyGroup || 'General'))].sort();

  const currentEntity = entityTypes.find(e => e.id === selectedEntity) || entityTypes[0] || DEFAULT_ENTITY_TYPES[0];
  const EntityIcon = currentEntity.icon;

  const handleCreateFromTemplate = async (template) => {
    setCreatingFromTemplate(template.name);
    try {
      await createMutation.mutateAsync({
        propertyName: template.name.toLowerCase().replace(/\s+/g, '_'),
        displayLabel: template.name,
        entityType: selectedEntity,
        dataType: template.type,
        description: template.description,
        options: template.options ? template.options.map(o => ({ label: o, value: o.toLowerCase().replace(/\s+/g, '_') })) : undefined,
      });
      refetch();
    } catch (err) {
      console.error('Failed to create property:', err);
    } finally {
      setCreatingFromTemplate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", currentEntity.bgClass)}>
              <EntityIcon className={cn("w-6 h-6", currentEntity.iconClass)} />
            </div>
            {currentEntity.label}
          </h1>
          <p className="mt-1 text-muted">
            Manage all properties for your {selectedEntity}s — system fields and custom fields
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Property
        </Button>
      </div>

      {/* Entity Type Selector - Visual Cards */}
      <div className="space-y-4">
        {/* System Objects */}
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">System Objects</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {systemEntities.map(entity => {
              const Icon = entity.icon;
              const isSelected = selectedEntity === entity.id;
              return (
                <button
                  key={entity.id}
                  onClick={() => setSelectedEntity(entity.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 bg-surface"
                  )}
                >
                  <Icon className={cn("w-6 h-6 mb-2", isSelected ? "text-primary" : "text-muted")} />
                  <p className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-text")}>
                    {entity.label}
                  </p>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">{entity.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Objects */}
        {customEntities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Custom Objects</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {customEntities.map(entity => {
                const Icon = entity.icon;
                const isSelected = selectedEntity === entity.id;
                return (
                  <button
                    key={entity.id}
                    onClick={() => setSelectedEntity(entity.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-dashed border-border hover:border-primary/50 bg-surface"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted")} />
                      <Badge variant="neutral" className="text-[10px]">Custom</Badge>
                    </div>
                    <p className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-text")}>
                      {entity.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">{entity.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1.5 bg-surface rounded-xl border border-border w-fit">
        {[
          { id: 'properties', label: 'Properties', icon: Settings, count: properties.length },
          { id: 'templates', label: 'Quick Add', icon: Sparkles },
          { id: 'groups', label: 'Groups', icon: FolderOpen },
          { id: 'conditional', label: 'Logic', icon: GitBranch },
          { id: 'archived', label: 'Archived', icon: Archive },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary text-white border-2 border-primary shadow-md"
                : "text-muted hover:text-text hover:bg-surface-secondary border-2 border-transparent"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Badge variant="neutral" className="ml-1">{tab.count}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <>
          {!hasProperties ? (
            <EmptyPropertiesState 
              entityType={selectedEntity}
              entityInfo={currentEntity}
              onCreateProperty={() => setShowCreateModal(true)}
              onShowTemplates={() => setActiveTab('templates')}
            />
          ) : (
            <>
              {/* Filters */}
              <Card>
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
                  <Select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                    <option value="all">All Groups</option>
                    {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </Select>
                  <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                    <option value="all">All Types</option>
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </Select>
                  <Button variant="ghost" onClick={() => refetch()} disabled={isLoading}>
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  </Button>
                </div>
              </Card>

              {/* Properties List */}
              <Card>
                <div className="space-y-2">
                  {filteredProperties.map(prop => (
                    <PropertyRow key={prop.propertyId || prop.id} property={prop} onArchive={archiveMutation.mutate} />
                  ))}
                  {filteredProperties.length === 0 && (
                    <p className="text-center text-muted py-8">No properties match your filters</p>
                  )}
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* Templates Tab - Quick Add */}
      {activeTab === 'templates' && (
        <Card title="Quick Add Properties" description={`Common properties for ${selectedEntity}s - click to add instantly`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(PROPERTY_TEMPLATES[selectedEntity] || []).map(template => {
              const Icon = template.icon;
              const isCreating = creatingFromTemplate === template.name;
              const alreadyExists = properties.some(p => 
                p.displayLabel?.toLowerCase() === template.name.toLowerCase()
              );
              
              return (
                <button
                  key={template.name}
                  onClick={() => !alreadyExists && handleCreateFromTemplate(template)}
                  disabled={isCreating || alreadyExists}
                  className={cn(
                    "p-4 rounded-lg border text-left transition-all",
                    alreadyExists
                      ? "border-success/30 bg-success/5 cursor-default"
                      : "border-border hover:border-primary hover:shadow-md bg-surface"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    {alreadyExists && (
                      <Badge variant="success">Added</Badge>
                    )}
                    {isCreating && (
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                  <h4 className="font-medium text-text">{template.name}</h4>
                  <p className="text-xs text-muted mt-1">{template.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="neutral">{FIELD_TYPES.find(f => f.value === template.type)?.label || template.type}</Badge>
                    {template.options && (
                      <span className="text-xs text-muted">{template.options.length} options</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {(!PROPERTY_TEMPLATES[selectedEntity] || PROPERTY_TEMPLATES[selectedEntity].length === 0) && (
            <p className="text-center text-muted py-8">No templates available for {selectedEntity} properties yet</p>
          )}
        </Card>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <Card title="Property Groups" description="Organize properties into logical sections">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUGGESTED_GROUPS.map(group => {
              const Icon = group.icon;
              return (
                <div
                  key={group.name}
                  className="p-4 rounded-lg border border-border bg-surface hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("p-2 rounded-lg", group.bgClass)}>
                      <Icon className={cn("w-5 h-5", group.iconClass)} />
                    </div>
                    <div>
                      <h4 className="font-medium text-text">{group.name}</h4>
                      <p className="text-xs text-muted">{group.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.fields.slice(0, 4).map(field => (
                      <Badge key={field} variant="neutral" className="text-xs">{field}</Badge>
                    ))}
                    {group.fields.length > 4 && (
                      <Badge variant="neutral" className="text-xs">+{group.fields.length - 4}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-6 border-t border-border flex justify-center">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Custom Group
            </Button>
          </div>
        </Card>
      )}

      {/* Conditional Logic Tab */}
      {activeTab === 'conditional' && (
        <Card title="Conditional Logic" description="Show or hide fields based on other selections">
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 text-muted/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">Smart Field Logic</h3>
            <p className="text-muted max-w-md mx-auto mb-6">
              Create rules to show fields only when relevant. For example, show "Medication Instructions" only when "Requires Medication" is checked.
            </p>
            <div className="bg-surface-secondary rounded-lg p-4 max-w-lg mx-auto text-left mb-6">
              <p className="text-sm font-medium text-text mb-3">Example Rules:</p>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Show "Insulin Schedule" only if "Diabetic" is checked
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Show "Anxiety Medication" only if behavior includes "Separation Anxiety"
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Show "Suite Preference" only for Boarding bookings
                </li>
              </ul>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Conditional Rule
            </Button>
          </div>
        </Card>
      )}

      {/* Archived Tab */}
      {activeTab === 'archived' && (
        <Card title="Archived Properties" description="Properties that are no longer active">
          <div className="text-center py-12">
            <Archive className="w-12 h-12 text-muted/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">No Archived Properties</h3>
            <p className="text-muted">Properties you archive will appear here. You can restore them anytime.</p>
          </div>
        </Card>
      )}

      {/* Create Property Modal */}
      <CreatePropertyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        entityType={selectedEntity}
        onSuccess={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />
    </div>
  );
};

// Empty state component
const EmptyPropertiesState = ({ entityType, entityInfo, onCreateProperty, onShowTemplates }) => {
  const entity = entityInfo || DEFAULT_ENTITY_TYPES.find(e => e.id === entityType) || DEFAULT_ENTITY_TYPES[0];
  const Icon = entity.icon || Tag;
  const templates = PROPERTY_TEMPLATES[entityType] || [];

  return (
    <Card>
      <div className="text-center py-12">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Icon className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-text mb-2">
          No {entityType} properties configured
        </h2>
        <p className="text-muted max-w-md mx-auto mb-8">
          Add custom properties to track specific information about your {entityType}s. System fields will appear here once you add custom ones.
        </p>

        {templates.length > 0 && (
          <div className="bg-surface-secondary rounded-xl p-6 max-w-lg mx-auto mb-8">
            <p className="text-sm font-semibold text-primary mb-4">POPULAR FOR KENNELS:</p>
            <div className="space-y-2">
              {templates.slice(0, 4).map(t => (
                <div key={t.name} className="flex items-center gap-3 text-left">
                  <t.icon className="w-4 h-4 text-muted" />
                  <span className="text-sm text-text">{t.name}</span>
                  <span className="text-xs text-muted">— {t.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {templates.length > 0 && (
            <Button onClick={onShowTemplates}>
              <Sparkles className="w-4 h-4 mr-2" />
              Quick Add Templates
            </Button>
          )}
          <Button variant="outline" onClick={onCreateProperty}>
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Property
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Property row component
const PropertyRow = ({ property, onArchive }) => {
  const fieldType = FIELD_TYPES.find(f => f.value === property.dataType);
  const isSystem = property.isSystem === true;
  
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border transition-colors group",
      isSystem 
        ? "border-border/30 bg-surface-secondary/50" 
        : "border-border/50 bg-surface hover:border-primary/50"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
          isSystem ? "bg-muted/10" : "bg-primary/10"
        )}>
          {fieldType?.icon || '📝'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("font-medium", isSystem ? "text-muted" : "text-text")}>
              {property.displayLabel || property.label}
            </span>
            {property.isRequired && <Badge variant="warning" className="text-xs">Required</Badge>}
            {isSystem && <Badge variant="neutral" className="text-xs">System</Badge>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
            <span>{fieldType?.label || property.dataType}</span>
            {property.propertyGroup && (
              <>
                <span>•</span>
                <span>{property.propertyGroup}</span>
              </>
            )}
            {property.usageCount > 0 && (
              <>
                <span>•</span>
                <span>Used {property.usageCount}×</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isSystem && <Button variant="ghost" size="sm">Edit</Button>}
        {!isSystem && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-danger hover:text-danger"
            onClick={() => onArchive({ propertyId: property.propertyId || property.id })}
          >
            Archive
          </Button>
        )}
        {isSystem && <span className="text-xs text-muted px-2">Read-only</span>}
      </div>
    </div>
  );
};

// Create property modal component
const CreatePropertyModal = ({ isOpen, onClose, entityType, onSuccess }) => {
  const [form, setForm] = useState({
    displayLabel: '',
    dataType: 'string',
    description: '',
    isRequired: false,
    propertyGroup: 'General',
    options: [],
  });
  const [newOption, setNewOption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMutation = useCreatePropertyMutation();

  const needsOptions = form.dataType === 'enum' || form.dataType === 'multi_enum';

  const handleAddOption = () => {
    if (newOption.trim()) {
      setForm(prev => ({
        ...prev,
        options: [...prev.options, { label: newOption.trim(), value: newOption.trim().toLowerCase().replace(/\s+/g, '_') }],
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.displayLabel.trim()) return;

    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        propertyName: form.displayLabel.toLowerCase().replace(/\s+/g, '_'),
        displayLabel: form.displayLabel,
        entityType,
        dataType: form.dataType,
        description: form.description,
        isRequired: form.isRequired,
        propertyGroup: form.propertyGroup,
        options: needsOptions ? form.options : undefined,
      });
      onSuccess();
      setForm({
        displayLabel: '',
        dataType: 'string',
        description: '',
        isRequired: false,
        propertyGroup: 'General',
        options: [],
      });
    } catch (err) {
      console.error('Failed to create property:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const entity = DEFAULT_ENTITY_TYPES.find(e => e.id === entityType) || { label: entityType, id: entityType };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Create ${entity.label.replace(' Properties', '')} Property`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Property Name *</label>
          <Input
            value={form.displayLabel}
            onChange={(e) => setForm(prev => ({ ...prev, displayLabel: e.target.value }))}
            placeholder="e.g., Dietary Restrictions"
            required
          />
        </div>

        {/* Field Type */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Field Type</label>
          <div className="grid grid-cols-4 gap-2">
            {FIELD_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, dataType: type.value, options: [] }))}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  form.dataType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="text-xl mb-1">{type.icon}</div>
                <div className="text-xs font-medium text-text">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Options for enum/multi_enum */}
        {needsOptions && (
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Options {form.dataType === 'multi_enum' ? '(Multi-select)' : '(Dropdown)'}
            </label>
            <div className="space-y-2">
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface-secondary rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-text">{opt.label}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="text-muted hover:text-danger"
                  >
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
          >
            <option value="General">General</option>
            <option value="Basic Info">Basic Info</option>
            <option value="Medical & Health">Medical & Health</option>
            <option value="Behavior">Behavior</option>
            <option value="Food & Diet">Food & Diet</option>
            <option value="Preferences">Preferences</option>
            <option value="Emergency">Emergency</option>
          </Select>
        </div>

        {/* Required Toggle */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-text">Required Field</p>
            <p className="text-xs text-muted">Users must fill this out</p>
          </div>
          <Switch
            checked={form.isRequired}
            onChange={(checked) => setForm(prev => ({ ...prev, isRequired: checked }))}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !form.displayLabel.trim()} className="flex-1">
            {isSubmitting ? 'Creating...' : 'Create Property'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PropertiesOverview;
