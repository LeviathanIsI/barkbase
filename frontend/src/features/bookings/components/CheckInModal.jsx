import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
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

const readFilesAsDataUrls = (fileList) =>
  Promise.all(
    Array.from(fileList).map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
    ),
  );

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

  const onSelectPhotos = async (event) => {
    if (!event.target.files?.length) return;
    try {
      setIsUploading(true);
      const dataUrls = await readFilesAsDataUrls(event.target.files);
      setPhotos((prev) => [...prev, ...dataUrls]);
      event.target.value = '';
    } catch (error) {
      toast.error('Failed to read photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const onSubmit = async (values) => {
    if (!booking?.id) return;
    const weight = values.weight ? Number(values.weight) : null;
    const conditionRating = values.conditionRating ? Number(values.conditionRating) : null;
    const combinedNotes = [checklistSummary, values.notes].filter(Boolean).join('\n');

    const payload = {
      time: new Date().toISOString(),
      weight: Number.isFinite(weight) ? weight : null,
      conditionRating: Number.isFinite(conditionRating) ? conditionRating : null,
      notes: combinedNotes,
      photos,
    };

    try {
      setIsSubmitting(true);
      await mutation.mutateAsync({ bookingId: booking.id, payload });
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
      <Modal open={open} onClose={onClose} title="Check In">
        <Skeleton className="h-48 w-full" />
      </Modal>
    );
  }

  const scheduledCheckIn = booking.checkIn ?? booking.dateRange?.start;
  const kennelName = booking.kennelName ?? booking.segments?.[0]?.kennel?.name;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Check In ${booking.pet?.name ?? booking.petName ?? ''}`.trim()}
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
      <div className="rounded-xl border border-border/60 bg-surface/60 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="info">Scheduled {scheduledCheckIn ? format(new Date(scheduledCheckIn), 'PPpp') : 'n/a'}</Badge>
          {kennelName ? <Badge variant="neutral">Assigned to {kennelName}</Badge> : null}
          <Badge variant="neutral">Booking #{booking.id?.slice(0, 8)}</Badge>
        </div>
      </div>
      <form className="mt-4 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Weight (lbs)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Enter current weight"
            {...register('weight')}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Overall Condition</label>
          <input type="range" min="1" max="5" {...register('conditionRating')} />
          <p className="text-xs text-muted">1 = fragile, 5 = excellent.</p>
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-medium">Pre-Check Checklist</span>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4" {...register('vaccinationsVerified')} /> Vaccinations current
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4" {...register('medsPacked')} /> Medication bag packed
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4" {...register('behaviorFlagged')} /> Reviewed behavior flags
          </label>
          <p className="text-xs text-muted">Summary: {checklistSummary}</p>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            rows={3}
            placeholder="Feeding adjustments, comfort items, recent behaviors"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            {...register('notes')}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Arrival Photos</label>
          <input type="file" accept="image/*" multiple onChange={onSelectPhotos} />
          {isUploading ? <Skeleton className="h-20 w-full" /> : null}
          {photos.length ? (
            <div className="flex flex-wrap gap-3">
              {photos.map((src, index) => (
                <div key={index} className="relative">
                  <img src={src} alt={`Check-in ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">Optional but helps document drop-off condition.</p>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default CheckInModal;
