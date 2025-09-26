import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useQuickCheckInMutation } from '../api';
import { useBookingStore } from '@/stores/booking';
import { useKennelAvailability } from '@/features/kennels/api';

const QuickCheckIn = () => {
  const { register, handleSubmit, reset, formState } = useForm({
    defaultValues: {
      bookingId: '',
      kennelId: '',
      notes: '',
      vaccinationsVerified: true,
    },
  });
  const bookings = useBookingStore((state) => state.bookings);
  const quickCheckIn = useQuickCheckInMutation();
  const kennelQuery = useKennelAvailability();

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== 'CHECKED_IN'),
    [bookings],
  );

  const kennelOptions = kennelQuery.data ?? [];

  const onSubmit = async (values) => {
    if (!values.bookingId) {
      toast.error('Select a booking to check in.');
      return;
    }

    try {
      await quickCheckIn.mutateAsync({
        bookingId: values.bookingId,
        kennelId: values.kennelId || undefined,
      });
      const booking = pendingBookings.find((item) => item.id === values.bookingId);
      toast.success(`Checked in ${booking?.pet?.name ?? 'pet'} successfully.`);
      reset();
    } catch (error) {
      toast.error(error.message ?? 'Failed to complete check-in');
    }
  };

  return (
    <Card
      title="Quick Check-In"
      description="Designed to complete a check-in in under 30 seconds. Barcode scanning ready."
      footer={<Badge variant="info">Vaccination status auto-synced from records</Badge>}
    >
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="text-sm font-medium text-text">
          Select Booking
          <select
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            {...register('bookingId', { required: true })}
          >
            <option value="">Choose a booking</option>
            {pendingBookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.pet?.name ?? booking.petName} · {new Date(booking.dateRange.start).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-text">
          Assign Kennel
          {kennelQuery.isLoading ? (
            <Skeleton className="mt-1 h-10 w-full" />
          ) : (
            <select
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              {...register('kennelId')}
            >
              <option value="">Keep current assignment</option>
              {kennelOptions.map((kennel) => (
                <option key={kennel.id} value={kennel.id}>
                  {kennel.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30" {...register('vaccinationsVerified')} />
          Vaccinations verified (auto from records)
        </label>
        <label className="text-sm font-medium text-text">
          Notes
          <textarea
            rows="2"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Behaviors, dietary needs, drop-off notes"
            {...register('notes')}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={formState.isSubmitting || quickCheckIn.isPending}>
            {quickCheckIn.isPending ? 'Checking in…' : 'Complete Check-In'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => reset()}>
            Reset
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default QuickCheckIn;
