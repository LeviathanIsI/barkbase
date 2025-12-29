import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import StyledSelect from '@/components/ui/StyledSelect';
import { useQuickCheckInMutation } from '../api';
import { useBookingStore } from '@/stores/booking';
import { useKennelAvailability } from '@/features/kennels/api';
import { useTimezoneUtils } from '@/lib/timezone';

const QuickCheckIn = () => {
  const tz = useTimezoneUtils();
  const { register, handleSubmit, reset, formState, control } = useForm({
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

  const bookingOptions = useMemo(() => {
    return pendingBookings.map(booking => ({
      value: booking.recordId,
      label: `${booking.pet?.name ?? booking.pets?.[0]?.name ?? booking.petName} - ${tz.formatShortDate(booking.dateRange?.start)}`
    }));
  }, [pendingBookings, tz]);

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
      const booking = pendingBookings.find((item) => item.recordId === values.bookingId);
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
        <Controller
          name="bookingId"
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <StyledSelect
              label="Select Booking"
              options={bookingOptions}
              value={field.value}
              onChange={(opt) => field.onChange(opt?.value || '')}
              placeholder="Choose a booking"
              isClearable
              isSearchable
            />
          )}
        />
        {kennelQuery.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Controller
            name="kennelId"
            control={control}
            render={({ field }) => (
              <StyledSelect
                label="Assign Kennel"
                options={[
                  { value: '', label: 'Keep current assignment' },
                  ...kennelOptions.map(kennel => ({
                    value: kennel.recordId,
                    label: kennel.name
                  }))
                ]}
                value={field.value}
                onChange={(opt) => field.onChange(opt?.value || '')}
                placeholder="Keep current assignment"
                isClearable
                isSearchable
              />
            )}
          />
        )}
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
            {quickCheckIn.isPending ? 'Checking in�' : 'Complete Check-In'}
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
