import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  useCreateAssociationMutation,
  useUpdateAssociationMutation,
} from '../api/associations';

const OBJECT_TYPES = [
  { value: 'pet', label: 'Pets' },
  { value: 'owner', label: 'Owners' },
  { value: 'booking', label: 'Bookings' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'payment', label: 'Payments' },
  { value: 'ticket', label: 'Tickets' },
];

const LIMIT_TYPES = [
  { value: 'ONE_TO_ONE', label: 'One to one', description: 'Each record can only be associated with one other record' },
  { value: 'ONE_TO_MANY', label: 'One to many', description: 'One record can be associated with multiple records' },
  { value: 'MANY_TO_MANY', label: 'Many to many', description: 'Multiple records can be associated with each other' },
];

const AssociationLabelModal = ({ open, onClose, association = null }) => {
  const [formData, setFormData] = useState({
    label: '',
    reverseLabel: '',
    isPaired: false,
    fromObjectType: 'pet',
    toObjectType: 'owner',
    limitType: 'MANY_TO_MANY',
  });

  const createMutation = useCreateAssociationMutation();
  const updateMutation = useUpdateAssociationMutation(association?.recordId);

  const isEditing = !!association;

  useEffect(() => {
    if (association) {
      setFormData({
        label: association.label,
        reverseLabel: association.reverseLabel || '',
        isPaired: association.isPaired || false,
        fromObjectType: association.fromObjectType,
        toObjectType: association.toObjectType,
        limitType: association.limitType,
      });
    } else {
      setFormData({
        label: '',
        reverseLabel: '',
        isPaired: false,
        fromObjectType: 'pet',
        toObjectType: 'owner',
        limitType: 'MANY_TO_MANY',
      });
    }
  }, [association, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.label.trim()) {
      toast.error('Label is required');
      return;
    }

    // Validate paired labels
    if (formData.isPaired && !formData.reverseLabel.trim()) {
      toast.error('Both labels are required for paired associations');
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          label: formData.label,
          reverseLabel: formData.isPaired ? formData.reverseLabel : null,
          isPaired: formData.isPaired,
          limitType: formData.limitType,
        });
        toast.success('Association label updated successfully');
      } else {
        await createMutation.mutateAsync({
          ...formData,
          reverseLabel: formData.isPaired ? formData.reverseLabel : null,
        });
        toast.success('Association label created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to save association label');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-primary px-6 py-4">
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? 'Edit Association Label' : 'Create Association Label'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white hover:bg-primary/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Label Type Selection */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                How many labels do you need?
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="labelType"
                    checked={!formData.isPaired}
                    onChange={() => handleChange('isPaired', false)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text">A single label</div>
                    <div className="text-xs text-muted">
                      The objects are related in the same way and can have the same label.
                    </div>
                    {!formData.isPaired && (
                      <input
                        type="text"
                        value={formData.label}
                        onChange={(e) => handleChange('label', e.target.value)}
                        placeholder="e.g., Colleague"
                        className="mt-2 w-full max-w-xs rounded-md border border-border bg-gray-50 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="labelType"
                    checked={formData.isPaired}
                    onChange={() => handleChange('isPaired', true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text">A pair of labels</div>
                    <div className="text-xs text-muted">
                      The objects are related in different ways and need their own labels.
                    </div>
                    {formData.isPaired && (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={formData.label}
                          onChange={(e) => handleChange('label', e.target.value)}
                          placeholder="e.g., Manager"
                          className="w-full max-w-xs rounded-md border border-border bg-gray-50 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          required
                        />
                        <input
                          type="text"
                          value={formData.reverseLabel}
                          onChange={(e) => handleChange('reverseLabel', e.target.value)}
                          placeholder="e.g., Employee"
                          className="w-full max-w-xs rounded-md border border-border bg-gray-50 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          required={formData.isPaired}
                        />
                        <p className="text-xs text-muted italic">
                          Paired with {formData.reverseLabel || 'label 2'}
                        </p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* From Object Type */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                From Object Type
              </label>
              <select
                value={formData.fromObjectType}
                onChange={(e) => handleChange('fromObjectType', e.target.value)}
                disabled={isEditing}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {OBJECT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* To Object Type */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                To Object Type
              </label>
              <select
                value={formData.toObjectType}
                onChange={(e) => handleChange('toObjectType', e.target.value)}
                disabled={isEditing}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {OBJECT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Limit Type */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Association Type
              </label>
              <div className="space-y-2">
                {LIMIT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="limitType"
                      value={type.value}
                      checked={formData.limitType === type.value}
                      onChange={(e) => handleChange('limitType', e.target.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text">{type.label}</div>
                      <div className="text-xs text-muted">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {isEditing && association?.isSystemDefined && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This is a system-defined association. You can only edit the label name and association type.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? 'Update' : 'Create'} Label
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssociationLabelModal;
