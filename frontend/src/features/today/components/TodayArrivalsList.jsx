import { AlertCircle, UserCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import TodayCard from './TodayCard';
import TodaySection from './TodaySection';
import { TodayListSkeleton } from './TodaySkeleton';

// TODO (Today Cleanup B:3): This component will be visually redesigned in the next phase.
const TodayArrivalsList = ({ arrivals, onBatchCheckIn, isLoading, hasError }) => {
  if (isLoading) {
    return (
      <TodayCard>
        <TodayListSkeleton />
      </TodayCard>
    );
  }

  return (
    <TodayCard>
      <TodaySection
        title="Today's Arrivals"
        icon={UserCheck}
        badge={<Badge variant="success">{arrivals.length}</Badge>}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={onBatchCheckIn}
            disabled={arrivals.length === 0}
          >
            Batch Check-in
          </Button>
        }
      >
        <ListBody
          items={arrivals}
          emptyMessage="No arrivals scheduled today."
          hasError={hasError}
        />
      </TodaySection>
    </TodayCard>
  );
};

const ListBody = ({ items, emptyMessage, hasError }) => {
  if (hasError) {
    return (
      <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-100">
        Unable to load arrivals.
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="py-[var(--bb-space-12,3rem)] text-center text-[color:var(--bb-color-text-muted,#52525b)]">
        <UserCheck className="mx-auto mb-3 h-16 w-16 text-success-600 opacity-20" />
        <p className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-medium,500)]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((booking, idx) => (
        <ArrivalRow key={booking.id || idx} booking={booking} />
      ))}
    </div>
  );
};

const ArrivalRow = ({ booking }) => {
  const time = booking.arrivalTime || booking.departureTime || booking.startDate;

  return (
    <div
      className="flex items-center gap-[var(--bb-space-4,1rem)] rounded-lg bg-[color:var(--bb-color-bg-elevated,#f5f5f4)] p-[var(--bb-space-4,1rem)] transition-colors hover:bg-[color:var(--bb-color-bg-surface,#ffffff)] dark:bg-surface-secondary dark:hover:bg-surface-tertiary"
    >
      <PetAvatar
        pet={booking.pet || { name: booking.petName }}
        size="md"
        showStatus={false}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
          <p className="truncate text-[var(--bb-font-size-sm,1rem)] font-[var(--bb-font-weight-semibold,600)]">
            {booking.petName || booking.pet?.name}
          </p>
          <Badge variant="success" className="text-sm">
            {formatTime(time)}
          </Badge>
        </div>
        <p className="truncate text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-sm,1rem)] dark:text-text-secondary">
          {booking.ownerName || booking.owner?.name || 'Owner'}
        </p>
        {booking.service && (
          <p className="mt-1 text-[color:var(--bb-color-text-subtle,#a1a1aa)] text-[var(--bb-font-size-xs,0.875rem)]">
            {booking.service}
          </p>
        )}
      </div>
      {booking.hasExpiringVaccinations && (
        <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0" />
      )}
    </div>
  );
};

const formatTime = (dateString) => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default TodayArrivalsList;

