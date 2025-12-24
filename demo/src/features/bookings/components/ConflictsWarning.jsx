import { AlertTriangle, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { useBookingConflictsQuery } from '../api';

/**
 * ConflictsWarning - Displays conflicts for a kennel/date range
 *
 * @param {object} props
 * @param {string} props.kennelId - Kennel ID to check conflicts for
 * @param {string} props.startDate - Start date (ISO string)
 * @param {string} props.endDate - End date (ISO string)
 * @param {string} [props.excludeBookingId] - Booking ID to exclude (for edits)
 * @param {function} [props.onViewConflicts] - Callback when user clicks "View Conflicts"
 */
const ConflictsWarning = ({
  kennelId,
  startDate,
  endDate,
  excludeBookingId,
  onViewConflicts,
}) => {
  const { data, isLoading } = useBookingConflictsQuery({
    kennelId,
    startDate,
    endDate,
    excludeBookingId,
  });

  // Don't show anything if no params, loading, or no conflicts
  if (!kennelId || !startDate || !endDate || isLoading || !data?.hasConflicts) {
    return null;
  }

  const { conflicts, count } = data;

  return (
    <Alert variant="warning" icon={AlertTriangle} title={`${count} Booking Conflict${count > 1 ? 's' : ''} Detected`}>
      <p className="text-sm mb-3">
        The selected kennel already has {count === 1 ? 'a booking' : 'bookings'} during this time period:
      </p>
      <div className="space-y-2 mb-3">
        {conflicts.slice(0, 3).map((conflict) => (
          <div
            key={conflict.id}
            className="flex items-center gap-3 text-sm p-2 bg-amber-50 dark:bg-amber-900/30 rounded"
          >
            <Calendar className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">
                {format(new Date(conflict.startDate), 'MMM d')} - {format(new Date(conflict.endDate), 'MMM d')}
              </span>
              {conflict.owner && (
                <span className="text-muted ml-2 flex items-center gap-1 inline-flex">
                  <User className="h-3 w-3" />
                  {conflict.owner.firstName} {conflict.owner.lastName}
                </span>
              )}
            </div>
          </div>
        ))}
        {conflicts.length > 3 && (
          <p className="text-xs text-muted">+ {conflicts.length - 3} more conflicts</p>
        )}
      </div>
      {onViewConflicts && (
        <Button size="sm" variant="outline" onClick={() => onViewConflicts(conflicts)}>
          View All Conflicts
        </Button>
      )}
    </Alert>
  );
};

export default ConflictsWarning;
