import { Users, Mail, Phone, PawPrint, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/utils';
import { useTimezoneUtils } from '@/lib/timezone';

const OwnerCard = ({
  owner,
  onClick,
  showMetrics = true,
  compact = false,
  className,
}) => {
  const tz = useTimezoneUtils();
  const pets = owner.pets || [];
  const totalBookings = owner.totalBookings || 0;
  const lifetimeValue = owner.lifetimeValue || 0;

  return (
    <div
      onClick={() => onClick?.(owner)}
      className={cn(
        'rounded-lg border border-border bg-surface transition-all',
        onClick && 'cursor-pointer hover:border-primary hover:shadow-md',
        className
      )}
    >
      <div className={cn('p-4', compact ? 'space-y-2' : 'space-y-3')}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-surface-secondary text-purple-600 dark:text-purple-400 flex-shrink-0">
            <Users className={cn(compact ? 'h-5 w-5' : 'h-6 w-6')} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn('font-semibold text-text truncate', compact ? 'text-sm' : 'text-base')}>
              {owner.name}
            </h3>
            {owner.email && (
              <div className="flex items-center gap-1.5 text-muted mt-0.5">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs truncate">{owner.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Info */}
        {!compact && owner.phone && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Phone className="h-3.5 w-3.5" />
            <span>{owner.phone}</span>
          </div>
        )}

        {/* Pets */}
        {pets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pets.slice(0, compact ? 2 : 3).map((pet, idx) => (
              <span
                key={pet.id || pet.recordId || idx}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-surface-primary px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
              >
                <PawPrint className="h-3 w-3" />
                {pet.name}
              </span>
            ))}
            {pets.length > (compact ? 2 : 3) && (
              <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-surface-secondary px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-text-primary">
                +{pets.length - (compact ? 2 : 3)} more
              </span>
            )}
          </div>
        )}

        {/* Metrics */}
        {showMetrics && (
          <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Calendar className="h-3.5 w-3.5" />
              <span>{totalBookings} {totalBookings === 1 ? 'booking' : 'bookings'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{formatCurrency(lifetimeValue)}</span>
            </div>
          </div>
        )}

        {/* Last Booking */}
        {!compact && owner.lastBooking && (
          <div className="text-xs text-muted">
            Last booking: {tz.formatShortDate(owner.lastBooking)}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerCard;
