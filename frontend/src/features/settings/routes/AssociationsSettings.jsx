/**
 * Associations Settings - Phase 8 Enterprise Table System
 * Token-based styling for consistent theming.
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import AssociationLabelModal from '../components/AssociationLabelModal';
import { usePageView } from '@/hooks/useTelemetry';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table';
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
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-bold,700)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Associations
          </h1>
          <p
            className="mt-[var(--bb-space-1,0.25rem)] text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            Define how your records relate to each other across different object types
          </p>
        </div>
        <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outline"
              onClick={handleSeedSystemAssociations}
              disabled={seedMutation.isPending}
              className="text-[var(--bb-font-size-sm,0.875rem)]"
            >
              Seed System Associations
            </Button>
          )}
          <Button onClick={handleCreateAssociation} className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
            <Plus className="h-4 w-4" />
            Create Association
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-[var(--bb-space-4,1rem)] flex-wrap">
        {/* Object type filter */}
        <div className="min-w-[150px]">
          <StyledSelect
            options={OBJECT_TYPES}
            value={selectedObjectType}
            onChange={(opt) => setSelectedObjectType(opt?.value || 'all')}
            isClearable={false}
            isSearchable={false}
          />
        </div>

        {/* Include archived checkbox */}
        <label
          className="flex items-center gap-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] cursor-pointer"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded"
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              accentColor: 'var(--bb-color-accent)',
            }}
          />
          Include archived
        </label>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-[var(--bb-space-3,0.75rem)] top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--bb-color-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search associations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border py-[var(--bb-space-2,0.5rem)] pl-9 pr-[var(--bb-space-4,1rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              backgroundColor: 'var(--bb-color-bg-elevated)',
              color: 'var(--bb-color-text-primary)',
            }}
          />
        </div>

        {/* Association count */}
        <div
          className="ml-auto text-[var(--bb-font-size-sm,0.875rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {filteredAssociations.length}{' '}
          {filteredAssociations.length === 1 ? 'association' : 'associations'}
        </div>
      </div>

      {/* Associations List */}
      {associationsQuery.isLoading ? (
        <div className="flex items-center justify-center py-[var(--bb-space-12,3rem)]">
          <div className="text-center">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent"
              style={{ borderColor: 'var(--bb-color-accent)', borderRightColor: 'transparent' }}
            />
            <p
              className="mt-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              Loading associations...
            </p>
          </div>
        </div>
      ) : groupedAssociations.length === 0 ? (
        <div
          className="rounded-lg border p-[var(--bb-space-12,3rem)] text-center"
          style={{
            borderColor: 'var(--bb-color-border-subtle)',
            backgroundColor: 'var(--bb-color-bg-surface)',
          }}
        >
          <p
            className="text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {searchQuery || selectedObjectType !== 'all'
              ? 'No associations found matching your filters'
              : 'No associations defined yet'}
          </p>
          {!searchQuery && selectedObjectType === 'all' && (
            <Button onClick={handleCreateAssociation} className="mt-[var(--bb-space-4,1rem)]">
              Create your first association
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-[var(--bb-space-6,1.5rem)]">
          {groupedAssociations.map((group) => (
            <div
              key={`${group.fromObjectType}-${group.toObjectType}`}
              className="rounded-lg border overflow-hidden"
              style={{
                borderColor: 'var(--bb-color-border-subtle)',
                backgroundColor: 'var(--bb-color-bg-surface)',
              }}
            >
              {/* Group Header */}
              <div
                className="border-b px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-3,0.75rem)]"
                style={{
                  borderColor: 'var(--bb-color-border-subtle)',
                  backgroundColor: 'var(--bb-color-bg-elevated)',
                }}
              >
                <h3
                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] flex items-center gap-[var(--bb-space-2,0.5rem)]"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {formatObjectType(group.fromObjectType)}
                  <ExternalLink className="h-3.5 w-3.5" style={{ color: 'var(--bb-color-text-muted)' }} />
                  {formatObjectType(group.toObjectType)}
                </h3>
              </div>

              {/* Associations Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.associations.map((association) => (
                    <TableRow
                      key={association.recordId}
                      className={association.archived ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
                          <span
                            className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                            style={{ color: 'var(--bb-color-text-primary)' }}
                          >
                            {association.label}
                          </span>
                          {association.archived && (
                            <span
                              className="px-[var(--bb-space-2,0.5rem)] py-0.5 text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] rounded"
                              style={{
                                backgroundColor: 'var(--bb-color-bg-elevated)',
                                color: 'var(--bb-color-text-muted)',
                              }}
                            >
                              Archived
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-[var(--bb-space-2,0.5rem)] py-[var(--bb-space-1,0.25rem)] text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] rounded"
                          style={{
                            backgroundColor: 'var(--bb-color-bg-elevated)',
                            color: 'var(--bb-color-text-primary)',
                          }}
                        >
                          {formatLimitType(association.limitType)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-[var(--bb-font-size-sm,0.875rem)]"
                          style={{ color: 'var(--bb-color-text-muted)' }}
                        >
                          {association.usageCount} {association.usageCount === 1 ? 'use' : 'uses'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {association.isSystemDefined ? (
                          <span
                            className="inline-flex items-center px-[var(--bb-space-2,0.5rem)] py-[var(--bb-space-1,0.25rem)] text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] rounded"
                            style={{
                              backgroundColor: 'var(--bb-color-accent-soft)',
                              color: 'var(--bb-color-accent)',
                            }}
                          >
                            System
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-[var(--bb-space-2,0.5rem)] py-[var(--bb-space-1,0.25rem)] text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] rounded"
                            style={{
                              backgroundColor: 'rgba(147, 51, 234, 0.15)',
                              color: '#9333EA',
                            }}
                          >
                            Custom
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-[var(--bb-space-2,0.5rem)]">
                          <button
                            onClick={() => handleEditAssociation(association)}
                            className="p-[var(--bb-space-1,0.25rem)] transition-colors"
                            style={{ color: 'var(--bb-color-text-muted)' }}
                            title="Edit association"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {!association.isSystemDefined && (
                            <button
                              onClick={() => handleDeleteAssociation(association.recordId)}
                              className="p-[var(--bb-space-1,0.25rem)] transition-colors"
                              style={{ color: 'var(--bb-color-text-muted)' }}
                              title="Delete association"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
