import { AlertCircle, UserX } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import TodayCard from './TodayCard';
import TodaySection from './TodaySection';
import { TodayListSkeleton } from './TodaySkeleton';

const TodayDeparturesList = ({ departures, onBatchCheckOut, isLoading, hasError }) => {
  if (isLoading) {
    return (
      <TodayCard className="h-full">
        <TodayListSkeleton />
      </TodayCard>
    );
  }

  return (
    <TodayCard className="h-full">
      <TodaySection
        title="Today's Departures"
        icon={UserX}
        iconClassName="text-amber-500"
        badge={<Badge variant="warning">{departures.length}</Badge>}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={onBatchCheckOut}
            disabled={departures.length === 0}
          >
            Batch Check-out
          </Button>
        }
      >
        <ListBody
          items={departures}
          emptyMessage="No departures scheduled today."
          hasError={hasError}
        />
      </TodaySection>
    </TodayCard>
  );
};

const ListBody = ({ items, emptyMessage, hasError }) => {
  if (hasError) {
    return (
      <div
        className="rounded-lg border p-[var(--bb-space-4,1rem)]"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          color: 'var(--bb-color-status-negative)',
        }}
      >
        Unable to load departures.
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="py-[var(--bb-space-12,3rem)] text-center">
        <UserX className="mx-auto mb-3 h-12 w-12 text-amber-500 opacity-20" />
        <p className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] text-[color:var(--bb-color-text-muted)]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--bb-space-2,0.5rem)]">
      {items.map((booking, idx) => (
        <DepartureRow key={booking.id || idx} booking={booking} />
      ))}
    </div>
  );
};

const DepartureRow = ({ booking }) => {
  const time = booking.arrivalTime || booking.departureTime || booking.startDate;

  return (
    <div
      className="flex items-center gap-[var(--bb-space-3,0.75rem)] rounded-lg p-[var(--bb-space-3,0.75rem)] transition-colors"
      style={{
        backgroundColor: 'var(--bb-color-bg-elevated)',
      }}
    >
      <PetAvatar
        pet={booking.pet || { name: booking.petName }}
        size="md"
        showStatus={false}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
          <p className="truncate text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)]">
            {booking.petName || booking.pet?.name}
          </p>
          <Badge variant="warning" className="shrink-0 text-xs">
            {formatTime(time)}
          </Badge>
        </div>
        <p className="truncate text-[var(--bb-font-size-xs,0.75rem)] text-[color:var(--bb-color-text-muted)]">
          {booking.ownerName || booking.owner?.name || 'Owner'}
        </p>
        {booking.service && (
          <p className="mt-0.5 truncate text-[var(--bb-font-size-xs,0.75rem)] text-[color:var(--bb-color-text-subtle)]">
            {booking.service}
          </p>
        )}
      </div>
      {booking.hasExpiringVaccinations && (
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
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

export default TodayDeparturesList;

