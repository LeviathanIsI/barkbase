import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyStateOnboarding from './components/EmptyStateOnboarding';
import PropertyTemplatesModal from './components/PropertyTemplatesModal';
import EnhancedCreatePropertyModal from './components/EnhancedCreatePropertyModal';
import EnterprisePropertiesTable from '../components/EnterprisePropertiesTable';
import DependencyGraphViewer from '../components/DependencyGraphViewer';
import ImpactAnalysisModal from '../components/ImpactAnalysisModal';
import PropertyDeletionWizard from '../components/PropertyDeletionWizard';
import ConditionalLogicTab from './components/ConditionalLogicTab';
import GroupsTab from './components/GroupsTab';
import ArchivedTab from './components/ArchivedTab';
import {
  usePropertiesV2Query,
  useArchivePropertyMutation,
  useRestorePropertyMutation,
  useDependencyGraphQuery,
  useImpactAnalysisMutation,
  useEntityDefinitionsQuery,
} from '../api';

// Fallback entity types for loading state or API failure
const FALLBACK_ENTITY_TYPES = [
  { recordId: 'pet', label: 'Pet properties' },
  { recordId: 'owner', label: 'Owner properties' },
  { recordId: 'booking', label: 'Booking properties' },
  { recordId: 'kennel', label: 'Kennel properties' },
  { recordId: 'service', label: 'Service properties' },
  { recordId: 'staff', label: 'Staff properties' },
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
  const [selectedObject, setSelectedObject] = useState('pet');
  const [selectedTab, setSelectedTab] = useState('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAccess, setSelectedAccess] = useState('all');
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [selectedPropertyForGraph, setSelectedPropertyForGraph] = useState(null);
  const [propertyForDeletion, setPropertyForDeletion] = useState(null);
  const [impactAnalysisData, setImpactAnalysisData] = useState(null);
  const [showImpactModal, setShowImpactModal] = useState(false);

  // Fetch entity definitions from API (v2)
  const { data: entityDefinitionsData, isLoading: entitiesLoading } = useEntityDefinitionsQuery();

  // Derive entity types from API data with fallback
  const entityTypes = useMemo(() => {
    if (entityDefinitionsData?.entityDefinitions?.length > 0) {
      return entityDefinitionsData.entityDefinitions
        .filter((ed) => ed.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ed) => ({
          recordId: ed.internalName,
          label: `${ed.singularName} properties`,
          isSystem: ed.isSystem,
          icon: ed.icon,
          color: ed.color,
        }));
    }
    return FALLBACK_ENTITY_TYPES;
  }, [entityDefinitionsData]);

  // Enterprise API v2 - full switch
  const { data: propertiesDataV2, isLoading: propertiesLoading } = usePropertiesV2Query(
    selectedObject,
    { includeUsage: true, includeDependencies: false }
  );
  const { data: archivedData } = usePropertiesV2Query(selectedObject, { includeArchived: true, enabled: selectedTab === 'archived' });

  // Mutations
  const archiveMutation = useArchivePropertyMutation();
  const restoreMutation = useRestorePropertyMutation();
  const impactMutation = useImpactAnalysisMutation();

  // Dependency graph query (only when property selected)
  const { data: dependencyGraph } = useDependencyGraphQuery(selectedPropertyForGraph?.propertyId, {
    enabled: !!selectedPropertyForGraph,
  });

  // Use v2 data
  const propertiesData = propertiesDataV2?.properties;

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
    const groups = [...new Set(allProperties.map((p) => p.propertyGroup || p.group || 'General'))].sort();

    // Apply filters
    let filtered = allProperties;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (prop) =>
          prop.displayLabel?.toLowerCase().includes(query) ||
          prop.label?.toLowerCase().includes(query) ||
          prop.propertyName?.toLowerCase().includes(query) ||
          prop.name?.toLowerCase().includes(query) ||
          prop.description?.toLowerCase().includes(query)
      );
    }

    // Group filter
    if (selectedGroup !== 'all') {
      filtered = filtered.filter((prop) => (prop.propertyGroup || prop.group || 'General') === selectedGroup);
    }

    // Type filter (data type for v2, type for v1)
    if (selectedType !== 'all') {
      filtered = filtered.filter((prop) => prop.dataType === selectedType || prop.type === selectedType);
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

  const currentObjectLabel = entityTypes.find(t => t.recordId === selectedObject)?.label || 'Properties';
  const archivedCount = archivedData?.length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-text-primary">Properties</h1>
          <p className="mt-1 text-gray-600 dark:text-text-secondary">
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
        <label className="text-sm font-medium text-gray-700 dark:text-text-primary">Select an object:</label>
        <div className="relative">
          <select
            value={selectedObject}
            onChange={(e) => {
              setSelectedObject(e.target.value);
              setSelectedProperties([]);
            }}
            disabled={entitiesLoading}
            className="appearance-none rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary pl-4 pr-10 py-2.5 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[250px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {entityTypes.map((type) => (
              <option key={type.recordId} value={type.recordId}>
                {type.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-text-tertiary pointer-events-none" />
        </div>
        {entitiesLoading && (
          <span className="text-sm text-gray-500 dark:text-text-secondary">Loading entity types...</span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-surface-border">
        <nav className="flex gap-6">
          <button
            onClick={() => setSelectedTab('properties')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              selectedTab === 'properties'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary hover:border-gray-300 dark:hover:border-surface-border'
            }`}
          >
            Properties {hasProperties && `(${propertiesData?.length || 0})`}
          </button>
          <button
            onClick={() => setSelectedTab('conditional-logic')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              selectedTab === 'conditional-logic'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary hover:border-gray-300 dark:hover:border-surface-border'
            }`}
          >
            Conditional logic
          </button>
          <button
            onClick={() => setSelectedTab('groups')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              selectedTab === 'groups'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary hover:border-gray-300 dark:hover:border-surface-border'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setSelectedTab('archived')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              selectedTab === 'archived'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary hover:border-gray-300 dark:hover:border-surface-border'
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
        />
      )}

      {selectedTab === 'properties' && hasProperties && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-4">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary pl-3 pr-8 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary pl-3 pr-8 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary pl-3 pr-8 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ACCESS_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-tertiary" />
              <input
                type="text"
                placeholder="Search properties"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary py-2 pl-9 pr-4 text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Properties Count */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600 dark:text-text-secondary">
              {filteredProperties.length} properties
            </div>
          </div>

          {/* Enterprise Properties Table (v2 API) */}
          <EnterprisePropertiesTable
            properties={filteredProperties}
            onEditProperty={(property) => {
              setEditingProperty(property);
              setIsCreateModalOpen(true);
            }}
            onDeleteProperty={async (property) => {
              // Run impact analysis first
              const impact = await impactMutation.mutateAsync({
                propertyId: property.propertyId,
                modificationType: 'delete',
              });
              setImpactAnalysisData(impact);
              setPropertyForDeletion(property);
              setShowImpactModal(true);
            }}
            onViewDependencies={(property) => {
              setSelectedPropertyForGraph(property);
            }}
            onViewUsage={(property) => {
              alert(`Usage details for ${property.displayLabel}\n\nWorkflows: ${property.usage?.usedInWorkflows || 0}\nForms: ${property.usage?.usedInForms || 0}\nReports: ${property.usage?.usedInReports || 0}`);
            }}
            selectedProperties={selectedProperties}
            onSelectProperty={(propertyId) => {
              setSelectedProperties(prev =>
                prev.includes(propertyId)
                  ? prev.filter(id => id !== propertyId)
                  : [...prev, propertyId]
              );
            }}
            onSelectAll={(selected) => {
              setSelectedProperties(selected ? filteredProperties.filter(p => p.propertyType === 'custom').map(p => p.propertyId) : []);
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
          }}
          onDelete={(propertyId) => {
          }}
        />
      )}

      {/* Modals */}
      <PropertyTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        objectType={selectedObject}
        onImportTemplates={(templates) => {
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
          setIsCreateModalOpen(false);
          setEditingProperty(null);
        }}
      />

      {/* Dependency Graph Modal */}
      {selectedPropertyForGraph && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Dependency Graph: {selectedPropertyForGraph.displayLabel || selectedPropertyForGraph.label}
                </h2>
                <button
                  onClick={() => setSelectedPropertyForGraph(null)}
                  className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-secondary"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              <DependencyGraphViewer
                propertyId={selectedPropertyForGraph.propertyId}
                graphData={dependencyGraph}
              />
            </div>
          </div>
        </div>
      )}

      {/* Impact Analysis Modal */}
      <ImpactAnalysisModal
        open={showImpactModal}
        onClose={() => setShowImpactModal(false)}
        impactData={impactAnalysisData}
        modificationType="delete"
        onProceed={() => {
          setShowImpactModal(false);
          // Open deletion wizard
          // For now, just proceed with deletion
          if (propertyForDeletion) {
            archiveMutation.mutate({
              propertyId: propertyForDeletion.propertyId,
              reason: 'User-initiated deletion',
              confirmed: true,
            });
          }
        }}
        onCancel={() => {
          setShowImpactModal(false);
          setPropertyForDeletion(null);
          setImpactAnalysisData(null);
        }}
      />

      {/* Property Deletion Wizard */}
      <PropertyDeletionWizard
        open={!!propertyForDeletion && !showImpactModal}
        onClose={() => setPropertyForDeletion(null)}
        property={propertyForDeletion}
        impactData={impactAnalysisData}
        onDelete={async (deleteOptions) => {
          await archiveMutation.mutateAsync({
            propertyId: deleteOptions.propertyId,
            reason: deleteOptions.reason,
            confirmed: deleteOptions.confirmed,
            cascadeStrategy: deleteOptions.cascadeStrategy,
          });
          setPropertyForDeletion(null);
        }}
      />
    </div>
  );
};

export default PropertiesOverview;
