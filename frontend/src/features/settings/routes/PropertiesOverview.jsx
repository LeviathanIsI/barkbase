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
import { usePropertiesQuery } from '../api';

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
  const [selectedView, setSelectedView] = useState('properties');
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

  // Real API data
  const { data: propertiesData, isLoading: propertiesLoading } = usePropertiesQuery(selectedObject);

  // Set document title
  useEffect(() => {
    document.title = 'Properties | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

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

  // Process API data and filter properties
  const { filteredProperties, availableGroups, currentData, hasProperties } = useMemo(() => {
    if (!propertiesData || propertiesLoading) {
      return {
        filteredProperties: [],
        availableGroups: [],
        currentData: null,
        hasProperties: false
      };
    }

    // The API returns a flat array of properties, not grouped
    // We'll need to group them by some logic or just work with flat array
    const allProperties = propertiesData || [];

    // Get unique groups (if properties have a group field)
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

    return {
      filteredProperties: filtered,
      availableGroups: groups,
      currentData: {
        total_properties: allProperties.length,
        groups: groups.map(group => ({
          name: group,
          properties: allProperties.filter(p => (p.group || 'General') === group)
        }))
      },
      hasProperties: allProperties.length > 0,
    };
  }, [propertiesData, propertiesLoading, selectedObject, searchQuery, selectedGroup, selectedType]);

  const isLoading = propertiesLoading;

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
