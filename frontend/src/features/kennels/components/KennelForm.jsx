/**
 * Kennel Form - Phase 9 Enterprise Form System
 * Uses SlideoutPanel for edit/create flows per Phase 15 standards.
 * Token-based styling for consistent theming.
 */

import { useState, useEffect, useCallback } from 'react';
import SlideoutPanel from '@/components/SlideoutPanel';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import CreatableSelect from '@/components/ui/CreatableSelect';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { FormActions, FormSection, FormGrid } from '@/components/ui/FormField';
import { useCreateKennel, useUpdateKennel, useKennelTypes, useAddKennelType } from '../api';
import toast from 'react-hot-toast';

const AMENITY_OPTIONS = [
  'Climate Controlled',
  'Outdoor Access', 
  'Webcam',
  'TV',
  'Music',
  'Raised Bed',
  'Soft Bedding',
  'Natural Light',
  'Private Patio',
  'Double Size',
  'Water Feature',
  'Play Area Access'
];

const KennelForm = ({ kennel, onClose, onSuccess, terminology }) => {
  const createMutation = useCreateKennel();
  const updateMutation = useUpdateKennel(kennel?.id || kennel?.recordId);
  const { data: kennelTypes, isLoading: typesLoading } = useKennelTypes();
  const addKennelType = useAddKennelType();

  // Convert kennel types array to options format for Select
  const typeOptions = (kennelTypes || []).map(t => ({ value: t, label: t }));

  // Handle creating a new kennel type
  const handleCreateType = useCallback(async (newTypeName) => {
    const result = await addKennelType.mutateAsync(newTypeName);
    return result; // Returns { value, label } for immediate selection
  }, [addKennelType]);
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    size: '',
    capacity: 1,
    location: '',
    building: '',
    zone: '',
    amenities: [],
    hourlyRate: '',
    dailyRate: '',
    weeklyRate: '',
    notes: '',
    isActive: true
  });

  const [customAmenity, setCustomAmenity] = useState('');

  useEffect(() => {
    if (kennel) {
      const amenities = kennel.amenities ? 
        (typeof kennel.amenities === 'string' ? JSON.parse(kennel.amenities) : kennel.amenities) : 
        [];
      
      setFormData({
        name: kennel.name || '',
        type: kennel.type || '',
        size: kennel.size || '',
        capacity: kennel.capacity || 1,
        location: kennel.location || '',
        building: kennel.building || '',
        zone: kennel.zone || '',
        amenities: Array.isArray(amenities) ? amenities : [],
        hourlyRate: kennel.hourlyRate || '',
        dailyRate: kennel.dailyRate || '',
        weeklyRate: kennel.weeklyRate || '',
        notes: kennel.notes || '',
        isActive: kennel.isActive ?? true
      });
    }
  }, [kennel]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        capacity: parseInt(formData.capacity) || 1,
        hourlyRate: formData.hourlyRate ? parseInt(formData.hourlyRate) : null,
        dailyRate: formData.dailyRate ? parseInt(formData.dailyRate) : null,
        weeklyRate: formData.weeklyRate ? parseInt(formData.weeklyRate) : null,
        amenities: formData.amenities
      };

      if (kennel) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
      
      onSuccess();
    } catch (error) {
      toast.error(error.message || `Failed to ${kennel ? 'update' : 'create'} ${terminology.kennel.toLowerCase()}`);
    }
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const addCustomAmenity = () => {
    if (customAmenity && !formData.amenities.includes(customAmenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, customAmenity]
      }));
      setCustomAmenity('');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <SlideoutPanel
      isOpen
      onClose={onClose}
      title={kennel ? `Edit ${terminology.kennel}` : `Add New ${terminology.kennel}`}
      description={kennel ? `Update ${terminology.kennel.toLowerCase()} details and settings.` : `Create a new ${terminology.kennel.toLowerCase()} for your facility.`}
      widthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-[var(--bb-space-6,1.5rem)]">
        {/* Basic Information */}
        <FormSection title="Basic Information">
          <FormGrid cols={2}>
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={`${terminology.kennel} 1`}
              required
            />
            <CreatableSelect
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              onCreate={handleCreateType}
              options={typeOptions}
              placeholder="Select or add type..."
              isLoading={typesLoading}
              menuPortalTarget={document.body}
              required
            />
          </FormGrid>

          <FormGrid cols={2}>
            <Select
              label="Size Restriction"
              value={formData.size}
              onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
              helpText="Optional - limit to specific pet sizes"
              options={[
                { value: '', label: 'Any Size' },
                { value: 'SMALL', label: 'Small (up to 25 lbs)' },
                { value: 'MEDIUM', label: 'Medium (26-60 lbs)' },
                { value: 'LARGE', label: 'Large (61-100 lbs)' },
                { value: 'XLARGE', label: 'Extra Large (100+ lbs)' },
              ]}
              placeholder="Any Size"
              menuPortalTarget={document.body}
            />
            <Input
              label="Capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
              helpText="Number of pets that can stay"
              required
            />
          </FormGrid>
        </FormSection>

        {/* Location */}
        <FormSection title="Location">
          <FormGrid cols={3}>
            <Input
              label="Building"
              value={formData.building}
              onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
              placeholder="Main Building"
            />
            <Input
              label="Zone/Area"
              value={formData.zone}
              onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value }))}
              placeholder="North Wing"
            />
            <Input
              label="Location Details"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Near entrance"
            />
          </FormGrid>
        </FormSection>

        {/* Pricing */}
        <FormSection title="Pricing">
          <FormGrid cols={3}>
            <Input
              label="Hourly Rate"
              type="number"
              min="0"
              value={formData.hourlyRate}
              onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
              placeholder="0"
              leftText="$"
              rightText=".00"
            />
            <Input
              label="Daily Rate"
              type="number"
              min="0"
              value={formData.dailyRate}
              onChange={(e) => setFormData(prev => ({ ...prev, dailyRate: e.target.value }))}
              placeholder="0"
              leftText="$"
              rightText=".00"
            />
            <Input
              label="Weekly Rate"
              type="number"
              min="0"
              value={formData.weeklyRate}
              onChange={(e) => setFormData(prev => ({ ...prev, weeklyRate: e.target.value }))}
              placeholder="0"
              leftText="$"
              rightText=".00"
            />
          </FormGrid>
        </FormSection>

        {/* Amenities */}
        <FormSection title="Amenities">
          <div className="flex flex-wrap gap-[var(--bb-space-2,0.5rem)] mb-[var(--bb-space-3,0.75rem)]">
            {AMENITY_OPTIONS.map((amenity) => (
              <Badge
                key={amenity}
                variant={formData.amenities.includes(amenity) ? 'primary' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleAmenity(amenity)}
              >
                {amenity}
              </Badge>
            ))}
          </div>
          <div className="flex gap-[var(--bb-space-2,0.5rem)]">
            <Input
              placeholder="Add custom amenity"
              value={customAmenity}
              onChange={(e) => setCustomAmenity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
            />
            <Button type="button" onClick={addCustomAmenity} variant="secondary">
              Add
            </Button>
          </div>
          {formData.amenities.length > 0 && !AMENITY_OPTIONS.some(a => formData.amenities.includes(a)) && (
            <div className="flex flex-wrap gap-[var(--bb-space-2,0.5rem)] mt-[var(--bb-space-2,0.5rem)]">
              {formData.amenities.filter(a => !AMENITY_OPTIONS.includes(a)).map((amenity) => (
                <Badge
                  key={amenity}
                  variant="primary"
                  className="cursor-pointer"
                  onClick={() => toggleAmenity(amenity)}
                >
                  {amenity} ×
                </Badge>
              ))}
            </div>
          )}
        </FormSection>

        {/* Notes */}
        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any special notes about this accommodation"
          rows={3}
        />

        {/* Status */}
        <label className="flex items-center gap-[var(--bb-space-2,0.5rem)] cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 rounded"
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              accentColor: 'var(--bb-color-accent)',
            }}
          />
          <span
            className="text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Active (available for bookings)
          </span>
        </label>

        {/* Actions */}
        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {kennel ? 'Update' : 'Create'} {terminology.kennel}
          </Button>
        </FormActions>
      </form>
    </SlideoutPanel>
  );
};

export default KennelForm;
