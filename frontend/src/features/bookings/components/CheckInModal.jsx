/**
 * Check-In Modal - Phase 15 Slideout Pattern
 * Uses SlideoutPanel for action flows.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import SlideoutPanel from '@/components/SlideoutPanel';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { useBookingCheckInMutation } from '../api';

const defaultValues = {
  weight: '',
  conditionRating: 3,
  notes: '',
  vaccinationsVerified: true,
  medsPacked: true,
  behaviorFlagged: false,
};

const renderChecklistSummary = (values) => {
  const entries = [
    values.vaccinationsVerified ? 'Vaccinations verified' : 'Vaccination follow-up required',
    values.medsPacked ? 'Medication bag packed' : 'Medication pending',
    values.behaviorFlagged ? 'Behavior flags reviewed' : 'Behavior flags clear',
  ];
  return entries.join(' • ');
};

/**
 * Creates object URLs for files instead of DataURLs to save memory.
 * Object URLs are references, not base64-encoded data.
 * @param {FileList} fileList - Files to create URLs for
 * @returns {Array<{file: File, url: string}>} Array of file objects with URLs
 */
const createFileObjectUrls = (fileList) => {
  return Array.from(fileList).map((file) => ({
    file,
    url: URL.createObjectURL(file),
  }));
};

const CheckInModal = ({ booking, open, onClose }) => {
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mutation = useBookingCheckInMutation();
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues });

  const checklistValues = watch(['vaccinationsVerified', 'medsPacked', 'behaviorFlagged']);
  const checklistSummary = renderChecklistSummary({
    vaccinationsVerified: checklistValues?.[0],
    medsPacked: checklistValues?.[1],
    behaviorFlagged: checklistValues?.[2],
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setPhotos([]);
    }
  }, [open, reset]);

  // Cleanup object URLs when component unmounts or photos change
  useEffect(() => {
    return () => {
      photos.forEach((photo) => {
        if (photo.url) {
          URL.revokeObjectURL(photo.url);
        }
      });
    };
  }, [photos]);

  const onSelectPhotos = (event) => {
    if (!event.target.files?.length) return;
    try {
      setIsUploading(true);
      const newPhotos = createFileObjectUrls(event.target.files);
      setPhotos((prev) => [...prev, ...newPhotos]);
      event.target.value = '';
    } catch (error) {
      toast.error('Failed to read photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const photoToRemove = prev[index];
      // Revoke object URL to free memory
      if (photoToRemove?.url) {
        URL.revokeObjectURL(photoToRemove.url);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const onSubmit = async (values) => {
    if (!booking?.recordId) return;
    const weight = values.weight ? Number(values.weight) : null;
    const conditionRating = values.conditionRating ? Number(values.conditionRating) : null;
    const combinedNotes = [checklistSummary, values.notes].filter(Boolean).join('\n');

    // Convert files to DataURLs only at submit time to save memory
    const convertFilesToDataUrls = async () => {
      return Promise.all(
        photos.map(
          ({ file }) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            }),
        ),
      );
    };

    try {
      setIsSubmitting(true);
      const photoDataUrls = photos.length > 0 ? await convertFilesToDataUrls() : [];

      const payload = {
        time: new Date().toISOString(),
        weight: Number.isFinite(weight) ? weight : null,
        conditionRating: Number.isFinite(conditionRating) ? conditionRating : null,
        notes: combinedNotes,
        photos: photoDataUrls,
      };

      await mutation.mutateAsync({ bookingId: booking.recordId, payload });
      toast.success(`Checked in ${booking?.pet?.name ?? 'pet'} successfully.`);
      onClose?.();
    } catch (error) {
      toast.error(error?.message ?? 'Unable to complete check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) {
    return (
      <SlideoutPanel isOpen={open} onClose={onClose} title="Check In" widthClass="max-w-lg">
        <Skeleton className="h-48 w-full" />
      </SlideoutPanel>
    );
  }

  const scheduledCheckIn = booking.checkIn ?? booking.dateRange?.start;
  const kennelName = booking.kennelName ?? booking.segments?.[0]?.kennel?.name;

  return (
    <SlideoutPanel
      isOpen={open}
      onClose={onClose}
      title={`Check In ${booking.pet?.name ?? booking.pets?.[0]?.name ?? booking.petName ?? ''}`.trim()}
      description="Complete the check-in process for this booking."
      widthClass="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || isUploading}>
            {isSubmitting ? 'Checking in…' : 'Complete Check-In'}
          </Button>
        </>
      }
    >
      {/* Booking Info Banner */}
      <div className="rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)] p-[var(--bb-space-4)] text-[var(--bb-font-size-sm)]">
        <div className="flex flex-wrap items-center gap-[var(--bb-space-3)]">
          <Badge variant="info">Scheduled {scheduledCheckIn ? format(new Date(scheduledCheckIn), 'PPpp') : 'n/a'}</Badge>
          {kennelName ? <Badge variant="neutral">Assigned to {kennelName}</Badge> : null}
          <Badge variant="neutral">Booking #{booking.id?.slice(0, 8)}</Badge>
        </div>
      </div>

      {/* Form */}
      <form className="mt-[var(--bb-space-4)] space-y-[var(--bb-space-4)]" onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Weight (lbs)">
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder="Enter current weight"
            {...register('weight')}
          />
        </FormField>

        <FormField label="Overall Condition" description="1 = fragile, 5 = excellent.">
          <input 
            type="range" 
            min="1" 
            max="5" 
            {...register('conditionRating')} 
            className="w-full accent-[var(--bb-color-accent)]"
          />
        </FormField>

        <div className="space-y-[var(--bb-space-2)]">
          <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
            Pre-Check Checklist
          </span>
          <label className="flex items-center gap-[var(--bb-space-2)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
            <input 
              type="checkbox" 
              className="h-4 w-4 rounded border-[var(--bb-color-border-subtle)] text-[var(--bb-color-accent)] focus:ring-[var(--bb-color-accent)]" 
              {...register('vaccinationsVerified')} 
            /> 
            Vaccinations current
          </label>
          <label className="flex items-center gap-[var(--bb-space-2)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
            <input 
              type="checkbox" 
              className="h-4 w-4 rounded border-[var(--bb-color-border-subtle)] text-[var(--bb-color-accent)] focus:ring-[var(--bb-color-accent)]" 
              {...register('medsPacked')} 
            /> 
            Medication bag packed
          </label>
          <label className="flex items-center gap-[var(--bb-space-2)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
            <input 
              type="checkbox" 
              className="h-4 w-4 rounded border-[var(--bb-color-border-subtle)] text-[var(--bb-color-accent)] focus:ring-[var(--bb-color-accent)]" 
              {...register('behaviorFlagged')} 
            /> 
            Reviewed behavior flags
          </label>
          <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">Summary: {checklistSummary}</p>
        </div>

        <FormField label="Notes">
          <Textarea
            rows={3}
            placeholder="Feeding adjustments, comfort items, recent behaviors"
            {...register('notes')}
          />
        </FormField>

        <div className="space-y-[var(--bb-space-2)]">
          <label className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
            Arrival Photos
          </label>
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={onSelectPhotos}
            className="block w-full text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] file:mr-[var(--bb-space-4)] file:py-[var(--bb-space-2)] file:px-[var(--bb-space-4)] file:rounded-[var(--bb-radius-md)] file:border-0 file:text-[var(--bb-font-size-sm)] file:font-[var(--bb-font-weight-medium)] file:bg-[var(--bb-color-accent-soft)] file:text-[var(--bb-color-accent)] hover:file:bg-[var(--bb-color-accent)]/20"
          />
          {isUploading ? <Skeleton className="h-20 w-full" /> : null}
          {photos.length ? (
            <div className="flex flex-wrap gap-[var(--bb-space-3)]">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo.url}
                    alt={`Check-in ${index + 1}`}
                    className="h-20 w-20 rounded-[var(--bb-radius-lg)] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute right-[var(--bb-space-1)] top-[var(--bb-space-1)] rounded-[var(--bb-radius-md)] bg-black/60 px-[var(--bb-space-2)] py-[var(--bb-space-1)] text-[var(--bb-font-size-xs)] text-white"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
              Optional but helps document drop-off condition.
            </p>
          )}
        </div>
      </form>
    </SlideoutPanel>
  );
};

export default CheckInModal;
