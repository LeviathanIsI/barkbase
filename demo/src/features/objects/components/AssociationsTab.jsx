import { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import AssociationLabelModal from '@/features/settings/components/AssociationLabelModal';
import {
  useAssociationsQuery,
  useDeleteAssociationMutation,
} from '@/features/settings/api/associations';
import toast from 'react-hot-toast';

const OBJECT_TYPE_LABELS = {
  pet: 'Pets',
  owner: 'Owners',
  booking: 'Bookings',
  invoice: 'Invoices',
  payment: 'Payments',
  ticket: 'Tickets',
  facility: 'Facilities',
  service: 'Services',
  package: 'Packages',
};

const AssociationsTab = ({ objectType }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState(null);
  const [selectedToObjectType, setSelectedToObjectType] = useState('');

  // Get all associations
  const associationsQuery = useAssociationsQuery({});
  const deleteMutation = useDeleteAssociationMutation();

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

  // Filter associations
  const filteredAssociations = useMemo(() => {
    const associations = associationsQuery.data || [];

    // Filter by current object type
    let filtered = associations.filter(
      (assoc) =>
        assoc.fromObjectType === objectType || assoc.toObjectType === objectType
    );

    // Filter by target object type if selected
    if (selectedToObjectType) {
      filtered = filtered.filter(
        (assoc) =>
          assoc.fromObjectType === selectedToObjectType ||
          assoc.toObjectType === selectedToObjectType
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (assoc) =>
          assoc.label.toLowerCase().includes(query) ||
          assoc.fromObjectType.toLowerCase().includes(query) ||
          assoc.toObjectType.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [associationsQuery.data, searchQuery, objectType, selectedToObjectType]);

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

  const getObjectTypeLabel = (type) => {
    return OBJECT_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1) + 's';
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text mb-2">
          Association Labels for {getObjectTypeLabel(objectType)}
        </h2>
        <p className="text-sm text-muted">
          Define how {getObjectTypeLabel(objectType).toLowerCase()} relate to other records in your
          BarkBase account. Association labels help you organize and understand relationships
          between different types of records.
        </p>
      </div>

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search associations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-border bg-white dark:bg-surface-primary py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filter by target object */}
          <div className="min-w-[180px]">
            <StyledSelect
              options={[
                { value: '', label: 'All associated objects' },
                ...Object.entries(OBJECT_TYPE_LABELS).map(([value, label]) => ({ value, label }))
              ]}
              value={selectedToObjectType}
              onChange={(opt) => setSelectedToObjectType(opt?.value || '')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        <Button onClick={handleCreateAssociation} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Association
        </Button>
      </div>

      {/* Associations List */}
      {associationsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-sm text-muted">Loading associations...</p>
          </div>
        </div>
      ) : filteredAssociations.length === 0 ? (
        <div className="rounded-lg border border-border bg-white dark:bg-surface-primary p-12 text-center">
          <ExternalLink className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">No associations found</h3>
          <p className="text-sm text-muted mb-4">
            {searchQuery
              ? 'No associations match your search criteria'
              : `Create association labels to define how ${getObjectTypeLabel(objectType).toLowerCase()} relate to other records`}
          </p>
          {!searchQuery && (
            <Button onClick={handleCreateAssociation}>Create Association</Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white dark:bg-surface-primary overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-gray-50 dark:bg-surface-secondary">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  To
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
              {filteredAssociations.map((association) => (
                <tr
                  key={association.recordId}
                  className={`hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors ${
                    association.archived ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">
                        {association.label}
                      </span>
                      {association.archived && (
                        <span className="px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-text-secondary bg-gray-100 dark:bg-surface-secondary rounded">
                          Archived
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                    {getObjectTypeLabel(association.fromObjectType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                    {getObjectTypeLabel(association.toObjectType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 dark:text-text-primary bg-gray-100 dark:bg-surface-secondary rounded">
                      {formatLimitType(association.limitType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                    {association.usageCount} {association.usageCount === 1 ? 'use' : 'uses'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {association.isSystemDefined ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-surface-primary rounded">
                        System
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-surface-primary rounded">
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
                          onClick={() => handleDeleteAssociation(association.recordId)}
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

export default AssociationsTab;
