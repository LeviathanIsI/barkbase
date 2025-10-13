import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import AssociationLabelModal from '../components/AssociationLabelModal';
import { usePageView } from '@/hooks/useTelemetry';
import {
  useAssociationsQuery,
  useDeleteAssociationMutation,
  useSeedSystemAssociationsMutation,
} from '../api/associations';
import toast from 'react-hot-toast';

const OBJECT_TYPES = [
  { value: 'all', label: 'All objects' },
  { value: 'pet', label: 'Pets' },
  { value: 'owner', label: 'Owners' },
  { value: 'booking', label: 'Bookings' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'payment', label: 'Payments' },
  { value: 'ticket', label: 'Tickets' },
];

const AssociationsSettings = () => {
  usePageView('settings-associations');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObjectType, setSelectedObjectType] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState(null);
  const [includeArchived, setIncludeArchived] = useState(false);

  const associationsQuery = useAssociationsQuery({ includeArchived });
  const deleteMutation = useDeleteAssociationMutation();
  const seedMutation = useSeedSystemAssociationsMutation();

  // Set document title
  useEffect(() => {
    document.title = 'Associations | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  const handleCreateAssociation = () => {
    setEditingAssociation(null);
    setIsCreateModalOpen(true);
  };

  const handleEditAssociation = (association) => {
    setEditingAssociation(association);
    setIsCreateModalOpen(true);
  };

  const handleDeleteAssociation = async (associationId) => {
    if (!confirm('Are you sure you want to delete this association? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(associationId);
      toast.success('Association deleted successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete association');
    }
  };

  const handleSeedSystemAssociations = async () => {
    try {
      await seedMutation.mutateAsync();
      toast.success('System associations seeded successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to seed system associations');
    }
  };

  // Filter and group associations
  const { filteredAssociations, groupedAssociations } = useMemo(() => {
    const associations = associationsQuery.data || [];

    // Apply filters
    let filtered = associations;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (assoc) =>
          assoc.label.toLowerCase().includes(query) ||
          assoc.fromObjectType.toLowerCase().includes(query) ||
          assoc.toObjectType.toLowerCase().includes(query)
      );
    }

    // Object type filter
    if (selectedObjectType !== 'all') {
      filtered = filtered.filter(
        (assoc) =>
          assoc.fromObjectType === selectedObjectType ||
          assoc.toObjectType === selectedObjectType
      );
    }

    // Group by object type pair
    const grouped = filtered.reduce((acc, assoc) => {
      const key = `${assoc.fromObjectType}-${assoc.toObjectType}`;
      if (!acc[key]) {
        acc[key] = {
          fromObjectType: assoc.fromObjectType,
          toObjectType: assoc.toObjectType,
          associations: [],
        };
      }
      acc[key].associations.push(assoc);
      return acc;
    }, {});

    return {
      filteredAssociations: filtered,
      groupedAssociations: Object.values(grouped),
    };
  }, [associationsQuery.data, searchQuery, selectedObjectType]);

  const formatObjectType = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1) + 's';
  };

  const formatLimitType = (limitType) => {
    switch (limitType) {
      case 'ONE_TO_ONE':
        return 'One to one';
      case 'ONE_TO_MANY':
        return 'One to many';
      case 'MANY_TO_MANY':
        return 'Many to many';
      default:
        return limitType;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Associations</h1>
          <p className="mt-1 text-sm text-muted">
            Define how your records relate to each other across different object types
          </p>
        </div>
        <div className="flex items-center gap-2">
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outline"
              onClick={handleSeedSystemAssociations}
              disabled={seedMutation.isPending}
              className="text-sm"
            >
              Seed System Associations
            </Button>
          )}
          <Button onClick={handleCreateAssociation} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Association
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Object type filter */}
        <select
          value={selectedObjectType}
          onChange={(e) => setSelectedObjectType(e.target.value)}
          className="rounded-lg border border-border bg-surface pl-3 pr-8 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {OBJECT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {/* Include archived checkbox */}
        <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          Include archived
        </label>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search associations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Association count */}
        <div className="ml-auto text-sm text-muted">
          {filteredAssociations.length}{' '}
          {filteredAssociations.length === 1 ? 'association' : 'associations'}
        </div>
      </div>

      {/* Associations List */}
      {associationsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-sm text-muted">Loading associations...</p>
          </div>
        </div>
      ) : groupedAssociations.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-sm text-muted">
            {searchQuery || selectedObjectType !== 'all'
              ? 'No associations found matching your filters'
              : 'No associations defined yet'}
          </p>
          {!searchQuery && selectedObjectType === 'all' && (
            <Button onClick={handleCreateAssociation} className="mt-4">
              Create your first association
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedAssociations.map((group) => (
            <div key={`${group.fromObjectType}-${group.toObjectType}`} className="rounded-lg border border-border bg-white overflow-hidden">
              {/* Group Header */}
              <div className="bg-gray-50 border-b border-border px-6 py-3">
                <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                  {formatObjectType(group.fromObjectType)}
                  <ExternalLink className="h-3.5 w-3.5 text-muted" />
                  {formatObjectType(group.toObjectType)}
                </h3>
              </div>

              {/* Associations Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Label
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.associations.map((association) => (
                      <tr
                        key={association.id}
                        className={`hover:bg-gray-50/50 transition-colors ${
                          association.archived ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text">
                              {association.label}
                            </span>
                            {association.archived && (
                              <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                                Archived
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                            {formatLimitType(association.limitType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                          {association.usageCount} {association.usageCount === 1 ? 'use' : 'uses'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {association.isSystemDefined ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded">
                              System
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded">
                              Custom
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditAssociation(association)}
                              className="p-1 text-muted hover:text-primary transition-colors"
                              title="Edit association"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {!association.isSystemDefined && (
                              <button
                                onClick={() => handleDeleteAssociation(association.id)}
                                className="p-1 text-muted hover:text-red-600 transition-colors"
                                title="Delete association"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Association Modal */}
      <AssociationLabelModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingAssociation(null);
        }}
        association={editingAssociation}
      />
    </div>
  );
};

export default AssociationsSettings;
