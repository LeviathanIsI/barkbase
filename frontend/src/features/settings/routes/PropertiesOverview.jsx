import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, ChevronDown, BarChart3, Download, Upload, Settings, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyStateOnboarding from './components/EmptyStateOnboarding';
import PropertyTemplatesModal from './components/PropertyTemplatesModal';
import EnhancedCreatePropertyModal from './components/EnhancedCreatePropertyModal';
import PopulatedPropertiesView from './components/PopulatedPropertiesView';
import ConditionalLogicTab from './components/ConditionalLogicTab';
import GroupsTab from './components/GroupsTab';
import UsageAnalytics from './components/UsageAnalytics';
import BulkActions from './components/BulkActions';
import ImportExportModal from './components/ImportExportModal';

const OBJECT_TYPES = [
  { recordId: 'pets', label: 'Pets' },
  { recordId: 'owners', label: 'Owners' },
  { recordId: 'bookings', label: 'Bookings' },
  { recordId: 'invoices', label: 'Invoices' },
  { recordId: 'payments', label: 'Payments' },
  { recordId: 'tickets', label: 'Tickets' },
];

const FIELD_TYPES = [
  { value: 'string', label: 'Single-line text' },
  { value: 'text', label: 'Multi-line text' },
  { value: 'phone', label: 'Phone number' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'boolean', label: 'Single checkbox' },
  { value: 'enum', label: 'Dropdown select' },
  { value: 'multi_enum', label: 'Multiple checkboxes' },
  { value: 'radio', label: 'Radio select' },
  { value: 'date', label: 'Date picker' },
  { value: 'datetime', label: 'Date and time picker' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'calculation', label: 'Calculation' },
  { value: 'rollup', label: 'Rollup' },
  { value: 'score', label: 'Score' },
  { value: 'sync', label: 'Property sync' },
  { value: 'file', label: 'File' },
  { value: 'user', label: 'User' },
  { value: 'rich_text', label: 'Rich text' },
];

const PropertiesOverview = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [selectedObject, setSelectedObject] = useState(
    tabParam && OBJECT_TYPES.find(t => t.recordId === tabParam) ? tabParam : 'pets'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState({});
  const [selectedView, setSelectedView] = useState('properties');
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

  // Mock data for demonstration
  const mockProperties = {
    pets: {
      groups: [
        {
          name: 'Basic Information',
          properties: [
            {
              recordId: 'dietary_restrictions',
              name: 'dietary_restrictions',
              label: 'Dietary Restrictions',
              type: 'multi_enum',
              description: 'Track food allergies and special feeding requirements',
              required: true,
              options: ['None / No restrictions', 'Grain-free diet', 'Chicken allergy', 'Beef allergy'],
              usageCount: 127,
              usagePercentage: 43,
              group: 'Basic Information'
            },
            {
              recordId: 'behavioral_flags',
              name: 'behavioral_flags',
              label: 'Behavioral Flags',
              type: 'multi_enum',
              description: 'Important temperament and handling notes',
              required: false,
              options: ['Dog-reactive', 'Cat-reactive', 'Food aggressive', 'Escape artist', 'Fear aggressive'],
              usageCount: 64,
              usagePercentage: 22,
              group: 'Basic Information'
            },
            {
              recordId: 'daycare_group',
              name: 'daycare_group',
              label: 'Daycare Group',
              type: 'enum',
              description: 'Which play group the pet belongs to',
              required: true,
              options: ['Small dogs (<25 lbs)', 'Large dogs (25+ lbs)', 'Puppies (<6 months)', 'Shy/timid', 'Seniors'],
              usageCount: 213,
              usagePercentage: 72,
              group: 'Basic Information',
              missingCount: 83
            },
            {
              recordId: 'preferred_run',
              name: 'preferred_run',
              label: 'Preferred Run Location',
              type: 'enum',
              description: 'Customer preferences for accommodation',
              required: false,
              options: ['No preference', 'Quiet area', 'Near window', 'Indoor only', 'Outdoor preferred'],
              usageCount: 89,
              usagePercentage: 30,
              group: 'Basic Information'
            },
            {
              recordId: 'vaccination_exception',
              name: 'vaccination_exception',
              label: 'Vaccination Exception Reason',
              type: 'text',
              description: 'Document why pet doesn\'t have standard vaccines',
              required: false,
              usageCount: 15,
              usagePercentage: 5,
              group: 'Medical & Health'
            },
            {
              recordId: 'emergency_contact',
              name: 'emergency_contact',
              label: 'Emergency Contact Priority',
              type: 'string',
              description: 'Backup contacts when owner unavailable',
              required: false,
              usageCount: 45,
              usagePercentage: 15,
              group: 'Emergency Contacts'
            },
            {
              recordId: 'grooming_preferences',
              name: 'grooming_preferences',
              label: 'Grooming Preferences',
              type: 'enum',
              description: 'Preferred grooming services and styles',
              required: false,
              options: ['Full groom', 'Bath only', 'Nail trim', 'Brush out', 'No grooming'],
              usageCount: 23,
              usagePercentage: 8,
              group: 'Services'
            },
            {
              recordId: 'room_preference',
              name: 'room_preference',
              label: 'Preferred Run/Room Type',
              type: 'enum',
              description: 'Customer accommodation preferences',
              required: false,
              options: ['Standard', 'Suite', 'Outdoor', 'Quiet area', 'Premium suite'],
              usageCount: 156,
              usagePercentage: 53,
              group: 'Accommodations'
            }
          ]
        }
      ],
      total_properties: 8,
      total_pets: 295
    }
  };

  // Set document title
  useEffect(() => {
    document.title = 'Properties | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  // Initialize mock data
  useEffect(() => {
    if (!properties[selectedObject]) {
      setProperties(prev => ({ ...prev, [selectedObject]: mockProperties[selectedObject] || { groups: [], total_properties: 0 } }));
    }
  }, [selectedObject]);

  const handleBrowseTemplates = () => {
    setIsTemplatesModalOpen(true);
  };

  const handleCreateProperty = () => {
    setIsCreateModalOpen(true);
  };

  const handleImportExport = () => {
    setIsImportExportModalOpen(true);
  };

  const handleWatchTutorial = () => {
    // TODO: Open tutorial video
    console.log('Watch tutorial');
  };

  // Flatten and filter properties
  const { filteredProperties, availableGroups } = useMemo(() => {
    const currentData = properties[selectedObject];
    if (!currentData || !currentData.groups) {
      return { filteredProperties: [], availableGroups: [] };
    }

    // Flatten all properties from groups
    const allProperties = currentData.groups.flatMap((group) => group.properties || []);

    // Get unique groups
    const groups = [...new Set(allProperties.map((p) => p.group))].sort();

    // Apply filters
    let filtered = allProperties;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (prop) =>
          prop.label.toLowerCase().includes(query) ||
          prop.name.toLowerCase().includes(query) ||
          prop.description?.toLowerCase().includes(query)
      );
    }

    // Group filter
    if (selectedGroup !== 'all') {
      filtered = filtered.filter((prop) => prop.group === selectedGroup);
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((prop) => prop.type === selectedType);
    }

    return {
      filteredProperties: filtered,
      availableGroups: groups,
    };
  }, [properties, selectedObject, searchQuery, selectedGroup, selectedType]);

  const currentData = properties[selectedObject];
  const isLoading = loading[selectedObject];
  const hasProperties = currentData && currentData.total_properties > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="mt-1 text-gray-600">
            Custom fields to track specific information about pets, customers, and bookings
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleImportExport}>
            <Settings className="w-4 h-4 mr-2" />
            Advanced
          </Button>
          <Button onClick={handleCreateProperty} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Property
          </Button>
        </div>
      </div>

      {/* Usage Analytics */}
      {hasProperties && <UsageAnalytics data={currentData} />}

      {/* Object Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {OBJECT_TYPES.map((type) => (
            <button
              key={type.recordId}
              onClick={() => setSelectedObject(type.recordId)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                selectedObject === type.recordId
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {type.label} {selectedObject === type.recordId && currentData && `(${currentData.total_properties || 0})`}
            </button>
          ))}
        </nav>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          <button
            onClick={() => setSelectedView('properties')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedView === 'properties'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setSelectedView('conditional-logic')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedView === 'conditional-logic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Conditional Logic
          </button>
          <button
            onClick={() => setSelectedView('groups')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedView === 'groups'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Groups
          </button>
        </nav>
      </div>

      {/* Content based on view and state */}
      {selectedView === 'properties' && !hasProperties && (
        <EmptyStateOnboarding
          objectType={selectedObject}
          onBrowseTemplates={handleBrowseTemplates}
          onCreateProperty={handleCreateProperty}
          onWatchTutorial={handleWatchTutorial}
        />
      )}

      {selectedView === 'properties' && hasProperties && (
        <>
          {/* Filters and Bulk Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Filter dropdowns */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All groups</option>
                  {availableGroups.map((group) => (
                    <option key={group} value={group}>
                      {group.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All field types</option>
                  {FIELD_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Property count */}
              <div className="ml-auto text-sm text-gray-500">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedProperties.length > 0 && (
              <BulkActions
                selectedCount={selectedProperties.length}
                onClearSelection={() => setSelectedProperties([])}
              />
            )}
          </div>

          {/* Properties View */}
          <PopulatedPropertiesView
            properties={filteredProperties}
            selectedProperties={selectedProperties}
            onSelectProperty={(propertyId) => {
              setSelectedProperties(prev =>
                prev.includes(propertyId)
                  ? prev.filter(id => id !== propertyId)
                  : [...prev, propertyId]
              );
            }}
            onSelectAll={(selected) => {
              setSelectedProperties(selected ? filteredProperties.map(p => p.recordId) : []);
            }}
          />
        </>
      )}

      {selectedView === 'conditional-logic' && (
        <ConditionalLogicTab />
      )}

      {selectedView === 'groups' && (
        <GroupsTab />
      )}

      {/* Modals */}
      <PropertyTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        objectType={selectedObject}
        onImportTemplates={(templates) => {
          console.log('Importing templates:', templates);
          setIsTemplatesModalOpen(false);
        }}
      />

      <EnhancedCreatePropertyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        objectType={selectedObject}
        existingProperty={editingProperty}
        onSubmit={(propertyData) => {
          console.log('Creating property:', propertyData);
          setIsCreateModalOpen(false);
        }}
      />

      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
      />
    </div>
  );
};

export default PropertiesOverview;
