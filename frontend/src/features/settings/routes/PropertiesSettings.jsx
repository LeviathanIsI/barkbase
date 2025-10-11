import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import PropertyTable from '../components/PropertyTable';
import CreatePropertyModal from '../components/CreatePropertyModal';
import DeletePropertyDialog from '../components/DeletePropertyDialog';
import ArchivePropertyDialog from '../components/ArchivePropertyDialog';
import { usePageView } from '@/hooks/useTelemetry';
import apiClient from '@/lib/apiClient';

const OBJECT_TYPES = [
  { id: 'pets', label: 'Pets' },
  { id: 'owners', label: 'Owners' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'payments', label: 'Payments' },
  { id: 'tickets', label: 'Tickets' },
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

const PropertiesSettings = () => {
  usePageView('settings-properties');

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [selectedObject, setSelectedObject] = useState(
    tabParam && OBJECT_TYPES.find(t => t.id === tabParam) ? tabParam : 'pets'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState({});
  const [selectedView, setSelectedView] = useState('properties');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [archivingProperty, setArchivingProperty] = useState(null);
  const [archivedCount, setArchivedCount] = useState(0);

  // Set document title
  useEffect(() => {
    document.title = 'Properties | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  // Fetch properties for selected object type
  useEffect(() => {
    if (!properties[selectedObject] && !loading[selectedObject]) {
      fetchProperties(selectedObject);
    }
  }, [selectedObject]);

  // Refetch when view changes
  useEffect(() => {
    if (selectedView === 'archived' || selectedView === 'properties') {
      fetchProperties(selectedObject);
    }
  }, [selectedView]);

  const fetchProperties = async (objectType) => {
    setLoading((prev) => ({ ...prev, [objectType]: true }));
    try {
      const includeArchived = selectedView === 'archived';
      const data = await apiClient(`/api/v1/settings/properties?object=${objectType}&includeArchived=${includeArchived}`);

      // Validate response structure
      if (!data || !Array.isArray(data.groups)) {
        console.error('Invalid properties data structure:', data);
        setProperties((prev) => ({ ...prev, [objectType]: { groups: [], total_properties: 0 } }));
        return;
      }

      setProperties((prev) => ({ ...prev, [objectType]: data }));

      // Fetch archived count
      const countData = await apiClient(`/api/v1/settings/properties/archived/count?object=${objectType}`);
      setArchivedCount(countData.count || 0);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      // Set empty state on error to prevent undefined access
      setProperties((prev) => ({ ...prev, [objectType]: { groups: [], total_properties: 0 } }));
    } finally {
      setLoading((prev) => ({ ...prev, [objectType]: false }));
    }
  };

  const handleCreateProperty = async (propertyData) => {
    try {
      await apiClient('/api/v1/settings/properties', {
        method: 'POST',
        body: propertyData,
      });

      await fetchProperties(selectedObject);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create property:', error);
      throw error;
    }
  };

  const handleEditProperty = async (propertyId, updates) => {
    try {
      await apiClient(`/api/v1/settings/properties/${propertyId}`, {
        method: 'PATCH',
        body: updates,
      });

      await fetchProperties(selectedObject);
      setEditingProperty(null);
    } catch (error) {
      console.error('Failed to update property:', error);
      throw error;
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    try {
      await apiClient(`/api/v1/settings/properties/${propertyId}`, {
        method: 'DELETE',
      });

      await fetchProperties(selectedObject);
      setDeletingProperty(null);
    } catch (error) {
      console.error('Failed to delete property:', error);
      throw error;
    }
  };

  const handleArchiveProperty = async (propertyId) => {
    try {
      await apiClient(`/api/v1/settings/properties/${propertyId}/archive`, {
        method: 'POST',
      });

      await fetchProperties(selectedObject);
      setArchivingProperty(null);
    } catch (error) {
      console.error('Failed to archive property:', error);
      throw error;
    }
  };

  const openEditModal = (property) => {
    setEditingProperty(property);
    setIsCreateModalOpen(true);
  };

  const openDeleteDialog = (property) => {
    setDeletingProperty(property);
  };

  const openArchiveDialog = (property) => {
    setArchivingProperty(property);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setEditingProperty(null);
    setDeletingProperty(null);
    setArchivingProperty(null);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Properties</h1>
          <p className="mt-1 text-sm text-muted">
            Manage custom fields and data structure for your BarkBase objects
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Property
        </Button>
      </div>

      {/* Object Type Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {OBJECT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedObject(type.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                selectedObject === type.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-text hover:border-border'
              }`}
            >
              {type.label}
            </button>
          ))}
        </nav>
      </div>

      {/* View Tabs */}
      <div className="border-b border-border -mt-6">
        <nav className="flex gap-1">
          <button
            onClick={() => setSelectedView('properties')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedView === 'properties'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text hover:border-border'
            }`}
          >
            Properties ({currentData?.total_properties || 0})
          </button>
          <button
            onClick={() => setSelectedView('conditional-logic')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedView === 'conditional-logic'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text hover:border-border'
            }`}
          >
            Conditional logic
          </button>
          <button
            onClick={() => setSelectedView('groups')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedView === 'groups'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text hover:border-border'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setSelectedView('archived')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedView === 'archived'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text hover:border-border'
            }`}
          >
            Archived ({archivedCount})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Filter dropdowns */}
        <div className="flex items-center gap-3">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="rounded-lg border border-border bg-surface pl-3 pr-8 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
            className="rounded-lg border border-border bg-surface pl-3 pr-8 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Property count */}
        <div className="ml-auto text-sm text-muted">
          {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}
        </div>
      </div>

      {/* Property Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-sm text-muted">Loading properties...</p>
          </div>
        </div>
      ) : (
        <PropertyTable
          properties={filteredProperties}
          objectType={selectedObject}
          onEdit={openEditModal}
          onDelete={openDeleteDialog}
          onArchive={openArchiveDialog}
        />
      )}

      {/* Create/Edit Property Modal */}
      <CreatePropertyModal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        onSubmit={editingProperty ? handleEditProperty : handleCreateProperty}
        objectType={selectedObject}
        existingProperty={editingProperty}
      />

      {/* Delete Confirmation Dialog */}
      <DeletePropertyDialog
        isOpen={!!deletingProperty}
        property={deletingProperty}
        onClose={closeModals}
        onConfirm={() => handleDeleteProperty(deletingProperty.id)}
      />

      {/* Archive Confirmation Dialog */}
      <ArchivePropertyDialog
        isOpen={!!archivingProperty}
        property={archivingProperty}
        onClose={closeModals}
        onConfirm={() => handleArchiveProperty(archivingProperty.id)}
      />
    </div>
  );
};

export default PropertiesSettings;
