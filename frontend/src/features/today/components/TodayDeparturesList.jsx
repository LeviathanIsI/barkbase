import { AlertCircle, UserX } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import TodayCard from './TodayCard';
import TodaySection from './TodaySection';

// TODO (Today Cleanup B:3): This component will be visually redesigned in the next phase.
const TodayDeparturesList = ({ departures, onBatchCheckOut, isLoading }) => {
  if (isLoading) {
    return (
      <TodayCard>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-surface-secondary rounded" />
          <div className="space-y-2">
            <div className="h-20 bg-gray-200 dark:bg-surface-secondary rounded" />
            <div className="h-20 bg-gray-200 dark:bg-surface-secondary rounded" />
          </div>
        </div>
      </TodayCard>
    );
  }

  return (
    <TodayCard>
      <TodaySection
        title="Today's Departures"
        icon={UserX}
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
        <div className="space-y-3">
          {departures.length === 0 ? (
            <EmptyState />
          ) : (
            departures.map((booking, idx) => (
              <DepartureRow key={booking.id || idx} booking={booking} />
            ))
          )}
        </div>
      </TodaySection>
    </TodayCard>
  );
};

const EmptyState = () => (
  <div className="text-center py-12 text-gray-500">
    <UserX className="w-16 h-16 mx-auto mb-3 opacity-20 text-warning-600" />
    <p className="text-lg">No departures scheduled today</p>
  </div>
);

const DepartureRow = ({ booking }) => {
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
          <Badge variant="warning" className="text-sm">
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

export default TodayDeparturesList;

