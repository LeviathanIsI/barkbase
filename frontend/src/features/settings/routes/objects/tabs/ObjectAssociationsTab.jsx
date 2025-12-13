import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Tag, Plus, Search, MoreVertical,
  Trash2, Edit, Loader2, X, Users, ChevronDown
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { OBJECT_TYPES } from '../objectConfig';
import {
  useAssociationLabels,
  useCreateAssociationLabel,
  useUpdateAssociationLabel,
  useDeleteAssociationLabel
} from '@/features/settings/api/objectSettingsApi';

// Define which object pairs can have association labels
const ASSOCIATION_PAIRS = {
  owners: ['pets', 'bookings', 'owners'], // Owner can have labels with Pets, Bookings, and other Owners
  pets: ['owners', 'bookings', 'pets'], // Pet can have labels with Owners, Bookings, and other Pets
  bookings: ['owners', 'pets', 'services'],
  services: ['bookings', 'packages'],
  facilities: ['bookings'],
  packages: ['owners', 'services'],
  invoices: ['owners', 'bookings', 'payments'],
  payments: ['owners', 'invoices'],
  tickets: ['owners', 'pets', 'bookings'],
};

const ObjectAssociationsTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPair, setSelectedPair] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch association labels from API
  const { data: labels = [], isLoading } = useAssociationLabels(objectType);
  const createLabel = useCreateAssociationLabel(objectType);
  const updateLabel = useUpdateAssociationLabel(objectType);
  const deleteLabel = useDeleteAssociationLabel(objectType);

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      targetObject: '',
      label: '',
      inverseLabel: '',
      maxAssociations: null,
      description: '',
    }
  });

  // Get available pairs for this object type
  const availablePairs = useMemo(() => {
    return ASSOCIATION_PAIRS[objectType] || [];
  }, [objectType]);

  // Filter labels
  const filteredLabels = useMemo(() => {
    return labels.filter((label) => {
      const matchesSearch = !searchQuery ||
        label.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        label.inverseLabel?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPair = selectedPair === 'all' || label.targetObject === selectedPair;

      return matchesSearch && matchesPair;
    });
  }, [labels, searchQuery, selectedPair]);

  // Group labels by target object for display
  const labelsByPair = useMemo(() => {
    const grouped = {};
    filteredLabels.forEach(label => {
      const key = label.targetObject;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(label);
    });
    return grouped;
  }, [filteredLabels]);

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  const handleCreateSubmit = async (data) => {
    try {
      await createLabel.mutateAsync(data);
      toast.success('Association label created');
      setShowCreateModal(false);
      reset();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create label');
    }
  };

  const handleUpdateSubmit = async (data) => {
    try {
      await updateLabel.mutateAsync({ id: editingLabel.id, ...data });
      toast.success('Association label updated');
      setEditingLabel(null);
      reset();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update label');
    }
  };

  const handleDelete = async (labelId) => {
    try {
      await deleteLabel.mutateAsync(labelId);
      toast.success('Association label deleted');
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete label');
    }
  };

  const openEditModal = (label) => {
    setEditingLabel(label);
    reset({
      targetObject: label.targetObject,
      label: label.label || '',
      inverseLabel: label.inverseLabel || '',
      maxAssociations: label.maxAssociations,
      description: label.description || '',
    });
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    reset({
      targetObject: availablePairs[0] || '',
      label: '',
      inverseLabel: '',
      maxAssociations: null,
      description: '',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header description */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Create labels to describe the nature of relationships between {config.labelPlural} and other objects.
            Labels help categorize connections like "Primary Caretaker", "Emergency Contact", or "Authorized Pickup".
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <div className="flex gap-3">
          <Tag className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-text mb-1">About Association Labels</h3>
            <p className="text-sm text-muted">
              {config.labelPlural} can already be linked to other objects like {availablePairs.slice(0, 3).map(p => OBJECT_TYPES[p]?.labelPlural || p).join(', ')}.
              Labels let you describe <em>how</em> they're related. For example, an Owner linked to a Pet could be labeled as "Primary Caretaker" vs "Emergency Contact".
            </p>
          </div>
        </div>
      </Card>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search labels"
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Filter by:</span>
          <Select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            options={[
              { value: 'all', label: 'All associations' },
              ...availablePairs.map(p => ({
                value: p,
                label: `${config.labelPlural} ↔ ${OBJECT_TYPES[p]?.labelPlural || p}`
              }))
            ]}
            className="w-56"
          />
        </div>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onClick={openCreateModal}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Create label
        </Button>
      </div>

      {/* Labels Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Label
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Association
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Inverse Label
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Limit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLabels.map((label) => {
                const targetConfig = OBJECT_TYPES[label.targetObject];
                const TargetIcon = targetConfig?.icon || Users;

                return (
                  <tr key={label.id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        <span className="text-sm text-primary font-medium">
                          {label.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <config.icon className="w-3.5 h-3.5" />
                        <span>{config.labelPlural}</span>
                        <span>↔</span>
                        <TargetIcon className="w-3.5 h-3.5" />
                        <span>{targetConfig?.labelPlural || label.targetObject}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text">
                        {label.inverseLabel || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text">
                        {label.maxAssociations ? `Max ${label.maxAssociations}` : 'Unlimited'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-primary font-medium">
                        {label.usageCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(label)}
                          className="p-1.5 rounded hover:bg-surface-secondary"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-muted" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(label)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredLabels.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Tag className="w-8 h-8 text-muted mx-auto mb-2" />
                    <p className="text-sm text-text mb-1">No association labels yet</p>
                    <p className="text-xs text-muted mb-3">
                      Create labels to describe how {config.labelPlural.toLowerCase()} relate to other objects
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCreateModal}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Create your first label
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Suggested Labels */}
      {filteredLabels.length === 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-text mb-3">Suggested Labels</h3>
          <p className="text-xs text-muted mb-4">
            Here are some common labels you might want to create:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getSuggestedLabels(objectType).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setShowCreateModal(true);
                  reset({
                    targetObject: suggestion.targetObject,
                    label: suggestion.label,
                    inverseLabel: suggestion.inverseLabel || '',
                    maxAssociations: suggestion.maxAssociations || null,
                    description: '',
                  });
                }}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-left transition-colors"
              >
                <Tag className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-text">{suggestion.label}</div>
                  <div className="text-xs text-muted">
                    {config.labelPlural} ↔ {OBJECT_TYPES[suggestion.targetObject]?.labelPlural || suggestion.targetObject}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Create/Edit Label Modal */}
      {(showCreateModal || editingLabel) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">
                {editingLabel ? 'Edit Label' : 'Create Association Label'}
              </h3>
              <button
                onClick={() => { setShowCreateModal(false); setEditingLabel(null); }}
                className="p-1 rounded hover:bg-surface-secondary"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit(editingLabel ? handleUpdateSubmit : handleCreateSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Association Type</label>
                <Select
                  {...register('targetObject', { required: true })}
                  disabled={!!editingLabel}
                  options={availablePairs.map(p => ({
                    value: p,
                    label: `${config.labelPlural} ↔ ${OBJECT_TYPES[p]?.labelPlural || p}`
                  }))}
                />
                <p className="text-[10px] text-muted">
                  Which objects does this label apply to?
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Label Name</label>
                <Input
                  {...register('label', { required: true })}
                  placeholder="e.g., Primary Caretaker"
                />
                <p className="text-[10px] text-muted">
                  How the {config.labelSingular.toLowerCase()} is related (from {config.labelSingular.toLowerCase()}'s perspective)
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Inverse Label (Optional)</label>
                <Input
                  {...register('inverseLabel')}
                  placeholder="e.g., Primary Pet"
                />
                <p className="text-[10px] text-muted">
                  How the related object sees this relationship (optional, for paired labels)
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Limit (Optional)</label>
                <Input
                  type="number"
                  min="1"
                  {...register('maxAssociations', { valueAsNumber: true })}
                  placeholder="Unlimited"
                />
                <p className="text-[10px] text-muted">
                  Maximum number of {config.labelPlural.toLowerCase()} that can have this label per related object
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowCreateModal(false); setEditingLabel(null); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createLabel.isPending || updateLabel.isPending}
                >
                  {(createLabel.isPending || updateLabel.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingLabel ? 'Save Changes' : 'Create Label'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold text-text mb-2">Delete Label</h3>
            <p className="text-sm text-muted mb-4">
              Are you sure you want to delete the "{deleteConfirm.label}" label?
              {deleteConfirm.usageCount > 0 && (
                <span className="block mt-2 text-amber-500">
                  This label is used on {deleteConfirm.usageCount} associations.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={deleteLabel.isPending}
              >
                {deleteLabel.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Get suggested labels based on object type
function getSuggestedLabels(objectType) {
  const suggestions = {
    owners: [
      { targetObject: 'pets', label: 'Primary Caretaker', inverseLabel: 'Primary Owner', maxAssociations: 1 },
      { targetObject: 'pets', label: 'Emergency Contact', inverseLabel: 'Emergency Contact For' },
      { targetObject: 'pets', label: 'Authorized Pickup', inverseLabel: 'Can Be Picked Up By' },
      { targetObject: 'owners', label: 'Spouse/Partner', inverseLabel: 'Spouse/Partner' },
      { targetObject: 'owners', label: 'Referred By', inverseLabel: 'Referred' },
      { targetObject: 'bookings', label: 'Booked By', inverseLabel: 'Booking For', maxAssociations: 1 },
    ],
    pets: [
      { targetObject: 'owners', label: 'Primary Owner', inverseLabel: 'Primary Caretaker', maxAssociations: 1 },
      { targetObject: 'pets', label: 'Sibling', inverseLabel: 'Sibling' },
      { targetObject: 'pets', label: 'Same Household', inverseLabel: 'Same Household' },
      { targetObject: 'bookings', label: 'Primary Pet', inverseLabel: 'Primary Booking For', maxAssociations: 1 },
    ],
    bookings: [
      { targetObject: 'owners', label: 'Paying Party', inverseLabel: 'Paying For', maxAssociations: 1 },
      { targetObject: 'owners', label: 'Pickup Contact', inverseLabel: 'Picking Up' },
      { targetObject: 'owners', label: 'Dropoff Contact', inverseLabel: 'Dropping Off' },
      { targetObject: 'pets', label: 'Primary Pet', inverseLabel: 'Primary Booking', maxAssociations: 1 },
    ],
    services: [
      { targetObject: 'packages', label: 'Included In', inverseLabel: 'Includes' },
    ],
    facilities: [
      { targetObject: 'bookings', label: 'Assigned To', inverseLabel: 'Uses Facility' },
    ],
    packages: [
      { targetObject: 'owners', label: 'Purchased By', inverseLabel: 'Purchased Package', maxAssociations: 1 },
      { targetObject: 'services', label: 'Includes', inverseLabel: 'Included In' },
    ],
    invoices: [
      { targetObject: 'owners', label: 'Bill To', inverseLabel: 'Billed For', maxAssociations: 1 },
      { targetObject: 'bookings', label: 'For Booking', inverseLabel: 'Invoice' },
    ],
    payments: [
      { targetObject: 'owners', label: 'Paid By', inverseLabel: 'Made Payment', maxAssociations: 1 },
      { targetObject: 'invoices', label: 'Applied To', inverseLabel: 'Payment' },
    ],
    tickets: [
      { targetObject: 'owners', label: 'Reported By', inverseLabel: 'Reported Issue', maxAssociations: 1 },
      { targetObject: 'pets', label: 'Regarding', inverseLabel: 'Has Ticket' },
      { targetObject: 'bookings', label: 'Related To', inverseLabel: 'Has Ticket' },
    ],
  };

  return suggestions[objectType] || [];
}

export default ObjectAssociationsTab;
