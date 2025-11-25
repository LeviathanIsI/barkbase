/**
 * Kennel Form - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { FormActions, FormSection, FormGrid } from '@/components/ui/FormField';
import { useCreateKennel, useUpdateKennel } from '../api';
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
  const updateMutation = useUpdateKennel(kennel?.recordId);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'KENNEL',
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
        type: kennel.type || 'KENNEL',
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
    <Modal open onClose={onClose} className="max-w-2xl">
      <div className="flex justify-between items-center mb-[var(--bb-space-6,1.5rem)]">
        <h2
          className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {kennel ? `Edit ${terminology.kennel}` : `Add New ${terminology.kennel}`}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

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
            <Select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              required
            >
              <option value="KENNEL">{terminology.kennel || 'Kennel'}</option>
              <option value="SUITE">{terminology.suite || 'Suite'}</option>
              <option value="CABIN">{terminology.cabin || 'Cabin'}</option>
              <option value="DAYCARE">{terminology.daycare || 'Daycare'}</option>
              <option value="MEDICAL">{terminology.medical || 'Medical'}</option>
            </Select>
          </FormGrid>

          <FormGrid cols={2}>
            <Select
              label="Size Restriction"
              value={formData.size}
              onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
              helpText="Optional - limit to specific pet sizes"
            >
              <option value="">Any Size</option>
              <option value="SMALL">Small (up to 25 lbs)</option>
              <option value="MEDIUM">Medium (26-60 lbs)</option>
              <option value="LARGE">Large (61-100 lbs)</option>
              <option value="XLARGE">Extra Large (100+ lbs)</option>
            </Select>
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
    </Modal>
  );
};

export default KennelForm;
