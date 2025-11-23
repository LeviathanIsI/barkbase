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
      <div className="text-center py-12 text-gray-500">
        <UserCheck className="w-16 h-16 mx-auto mb-3 opacity-20 text-success-600" />
        <p className="text-lg">{emptyMessage}</p>
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
      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-surface-tertiary transition-colors"
    >
      <PetAvatar
        pet={booking.pet || { name: booking.petName }}
        size="md"
        showStatus={false}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <p className="font-semibold text-base truncate">
            {booking.petName || booking.pet?.name}
          </p>
          <Badge variant="success" className="text-sm">
            {formatTime(time)}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 dark:text-text-secondary truncate">
          {booking.ownerName || booking.owner?.name || 'Owner'}
        </p>
        {booking.service && (
          <p className="text-xs text-gray-500 mt-1">
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

