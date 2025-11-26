import { AlertCircle, PawPrint, Sparkles, UserCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import TodayCard from './TodayCard';
import TodaySection from './TodaySection';
import { TodayListSkeleton } from './TodaySkeleton';

const TodayArrivalsList = ({ arrivals, onBatchCheckIn, isLoading, hasError }) => {
  if (isLoading) {
    return (
      <TodayCard className="h-full">
        <TodayListSkeleton />
      </TodayCard>
    );
  }

  return (
    <TodayCard className="h-full" id="arrivals-section">
      <TodaySection
        title="Today's Arrivals"
        icon={UserCheck}
        iconClassName="text-emerald-600 dark:text-emerald-400"
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
        <ListBody items={arrivals} hasError={hasError} />
      </TodaySection>
    </TodayCard>
  );
};

const ListBody = ({ items, hasError }) => {
  if (hasError) {
    return (
      <div
        className="rounded-xl border p-[var(--bb-space-4,1rem)] text-center"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          color: 'var(--bb-color-status-negative)',
        }}
      >
        <AlertCircle className="mx-auto mb-2 h-6 w-6" />
        <p className="font-medium">Unable to load arrivals</p>
        <p className="text-sm opacity-80">Please refresh the page</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="py-[var(--bb-space-10,2.5rem)] text-center">
        <div className="relative mx-auto mb-4 h-16 w-16">
          <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30" />
          <PawPrint className="absolute inset-0 m-auto h-8 w-8 text-emerald-500 dark:text-emerald-400" />
          <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-400" />
        </div>
        <p className="text-[var(--bb-font-size-base,1rem)] font-semibold text-[color:var(--bb-color-text-primary)]">
          No pets arriving today
        </p>
        <p className="mt-1 text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">
          Chill day ahead! 🌴
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--bb-space-2,0.5rem)]">
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
      className="flex items-center gap-[var(--bb-space-3,0.75rem)] rounded-xl p-[var(--bb-space-3,0.75rem)] transition-all hover:shadow-sm cursor-pointer"
      style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
    >
      <PetAvatar
        pet={booking.pet || { name: booking.petName }}
        size="md"
        showStatus={false}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
          <p className="truncate text-[var(--bb-font-size-sm,0.875rem)] font-semibold text-[color:var(--bb-color-text-primary)]">
            {booking.petName || booking.pet?.name}
          </p>
          <Badge variant="success" className="shrink-0 text-xs">
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
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" title="Expiring vaccinations" />
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
