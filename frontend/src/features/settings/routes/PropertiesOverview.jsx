import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyStateOnboarding from './components/EmptyStateOnboarding';
import PropertyTemplatesModal from './components/PropertyTemplatesModal';
import EnhancedCreatePropertyModal from './components/EnhancedCreatePropertyModal';
import PopulatedPropertiesView from './components/PopulatedPropertiesView';
import ConditionalLogicTab from './components/ConditionalLogicTab';
import GroupsTab from './components/GroupsTab';
import ArchivedTab from './components/ArchivedTab';
import { usePropertiesQuery } from '../api';

const OBJECT_TYPES = [
  { recordId: 'pets', label: 'Pet properties' },
  { recordId: 'owners', label: 'Owner properties' },
  { recordId: 'bookings', label: 'Booking properties' },
  { recordId: 'kennels', label: 'Kennel properties' },
  { recordId: 'services', label: 'Service properties' },
  { recordId: 'staff', label: 'Staff properties' },
  { recordId: 'invoices', label: 'Invoice properties' },
  { recordId: 'payments', label: 'Payment properties' },
  { recordId: 'vaccinations', label: 'Vaccination properties' },
  { recordId: 'check_ins', label: 'Check-in properties' },
  { recordId: 'check_outs', label: 'Check-out properties' },
  { recordId: 'incidents', label: 'Incident properties' },
  { recordId: 'communications', label: 'Communication properties' },
  { recordId: 'notes', label: 'Note properties' },
  { recordId: 'tasks', label: 'Task properties' },
  { recordId: 'runs', label: 'Run properties' },
  { recordId: 'run_templates', label: 'Run template properties' },
  { recordId: 'users', label: 'User properties' },
  { recordId: 'tenants', label: 'Tenant properties' },
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

const ACCESS_LEVELS = [
  { value: 'all', label: 'All access' },
  { value: 'everyone_edit', label: 'Everyone can view and edit' },
  { value: 'everyone_view', label: 'Everyone can view' },
  { value: 'assigned_only', label: 'Assigned to users and teams' },
  { value: 'admin_only', label: 'Admins only' },
];

const PropertiesOverview = () => {
  const [selectedObject, setSelectedObject] = useState('pets');
  const [selectedTab, setSelectedTab] = useState('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAccess, setSelectedAccess] = useState('all');
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [selectedProperties, setSelectedProperties] = useState([]);

  // Real API data
  const { data: propertiesData, isLoading: propertiesLoading } = usePropertiesQuery(selectedObject);
  const { data: archivedData } = usePropertiesQuery(selectedObject, { queryParams: { onlyArchived: true } });

  // Set document title
  useEffect(() => {
    document.title = 'Properties | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  const handleCreateProperty = () => {
    setEditingProperty(null);
    setIsCreateModalOpen(true);
  };

  // Process API data and filter properties
  const { filteredProperties, availableGroups, hasProperties } = useMemo(() => {
    if (!propertiesData || propertiesLoading) {
      return {
        filteredProperties: [],
        availableGroups: [],
        hasProperties: false
      };
    }

    const allProperties = propertiesData || [];
    const groups = [...new Set(allProperties.map((p) => p.group || 'General'))].sort();

    // Apply filters
    let filtered = allProperties;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (prop) =>
          prop.label?.toLowerCase().includes(query) ||
          prop.name?.toLowerCase().includes(query) ||
          prop.description?.toLowerCase().includes(query)
      );
    }

    // Group filter
    if (selectedGroup !== 'all') {
      filtered = filtered.filter((prop) => (prop.group || 'General') === selectedGroup);
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((prop) => prop.type === selectedType);
    }

    // Access level filter
    if (selectedAccess !== 'all') {
      filtered = filtered.filter((prop) => prop.accessLevel === selectedAccess);
    }

    return {
      filteredProperties: filtered,
      availableGroups: groups,
      hasProperties: allProperties.length > 0,
    };
  }, [propertiesData, propertiesLoading, searchQuery, selectedGroup, selectedType, selectedAccess]);

  const currentObjectLabel = OBJECT_TYPES.find(t => t.recordId === selectedObject)?.label || 'Properties';
  const archivedCount = archivedData?.length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="mt-1 text-gray-600">
            Properties are used to collect and store information about your records in BarkBase. For example, a contact might have properties like First Name or Lead Status.
          </p>
        </div>
        <Button onClick={handleCreateProperty} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create property
        </Button>
      </div>

      {/* Object Type Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Select an object:</label>
        <div className="relative">
          <select
            value={selectedObject}
            onChange={(e) => {
              setSelectedObject(e.target.value);
              setSelectedProperties([]);
            }}
            className="appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-10 py-2.5 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[250px]"
          >
            {OBJECT_TYPES.map((type) => (
              <option key={type.recordId} value={type.recordId}>
                {type.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setSelectedTab('properties')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              selectedTab === 'properties'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Properties {hasProperties && `(${propertiesData?.length || 0})`}
          </button>
          <button
            onClick={() => setSelectedTab('conditional-logic')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              selectedTab === 'conditional-logic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Conditional logic
          </button>
          <button
            onClick={() => setSelectedTab('groups')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              selectedTab === 'groups'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setSelectedTab('archived')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              selectedTab === 'archived'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Archived {archivedCount > 0 && `(${archivedCount})`}
          </button>
        </nav>
      </div>

      {/* Properties Tab Content */}
      {selectedTab === 'properties' && !hasProperties && (
        <EmptyStateOnboarding
          objectType={selectedObject}
          onBrowseTemplates={() => setIsTemplatesModalOpen(true)}
          onCreateProperty={handleCreateProperty}
          onWatchTutorial={() => console.log('Watch tutorial')}
        />
      )}

      {selectedTab === 'properties' && hasProperties && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All groups</option>
              {availableGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
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

            <select
              value={selectedAccess}
              onChange={(e) => setSelectedAccess(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ACCESS_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Properties Table */}
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
              setSelectedProperties(selected ? filteredProperties.filter(p => !p.isSystem).map(p => p.recordId) : []);
            }}
            onEditProperty={(property) => {
              setEditingProperty(property);
              setIsCreateModalOpen(true);
            }}
          />
        </>
      )}

      {/* Conditional Logic Tab */}
      {selectedTab === 'conditional-logic' && (
        <ConditionalLogicTab />
      )}

      {/* Groups Tab */}
      {selectedTab === 'groups' && (
        <GroupsTab />
      )}

      {/* Archived Tab */}
      {selectedTab === 'archived' && (
        <ArchivedTab
          objectType={selectedObject}
          onRestore={(propertyId) => {
            console.log('Restore property:', propertyId);
          }}
          onDelete={(propertyId) => {
            console.log('Delete property:', propertyId);
          }}
        />
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
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingProperty(null);
        }}
        objectType={selectedObject}
        existingProperty={editingProperty}
        onSubmit={(propertyData) => {
          console.log('Creating/updating property:', propertyData);
          setIsCreateModalOpen(false);
          setEditingProperty(null);
        }}
      />
    </div>
  );
};

export default PropertiesOverview;
