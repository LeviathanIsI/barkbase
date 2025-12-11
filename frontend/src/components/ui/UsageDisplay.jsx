import { useFeatureAccess } from '@/lib/featureGuard';
import { cn } from '@/lib/cn';

/**
 * UsageBar - Shows usage progress for a limit-based feature
 */
const UsageBar = ({ label, current, limit, className }) => {
  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--bb-color-text-primary)' }}>{label}</span>
        <span style={{ color: 'var(--bb-color-text-muted)' }}>
          {current.toLocaleString()} / {isUnlimited ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: isUnlimited ? '0%' : `${percentage}%`,
            backgroundColor: isAtLimit
              ? 'var(--bb-color-status-negative)'
              : isNearLimit
                ? 'var(--bb-color-status-warning)'
                : 'var(--bb-color-status-positive)',
          }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>
          Limit reached - upgrade to add more
        </p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs" style={{ color: 'var(--bb-color-status-warning)' }}>
          Approaching limit
        </p>
      )}
    </div>
  );
};

/**
 * UsageDisplay - Shows usage stats for all limit-based features
 *
 * @param {string} className - Optional className
 */
const UsageDisplay = ({ className }) => {
  const { tier, usage, getLimit, getCurrentUsage } = useFeatureAccess();

  // Define the usage items to display
  const usageItems = [
    {
      key: 'seats',
      label: 'Team Members',
      current: usage?.users?.current ?? 0,
      limit: getLimit('seats'),
    },
    {
      key: 'locations',
      label: 'Locations',
      current: usage?.locations?.current ?? 0,
      limit: getLimit('locations'),
    },
    {
      key: 'activePets',
      label: 'Active Pets',
      current: usage?.pets?.current ?? 0,
      limit: getLimit('activePets'),
    },
    {
      key: 'bookingsPerMonth',
      label: 'Monthly Bookings',
      current: usage?.bookings?.current ?? 0,
      limit: getLimit('bookingsPerMonth'),
    },
    {
      key: 'storageMb',
      label: 'Storage (MB)',
      current: usage?.storage?.current ?? 0,
      limit: getLimit('storageMb'),
    },
  ];

  // Filter out items where limit is null (unlimited) unless there's actual usage
  const displayItems = usageItems.filter(
    item => item.limit !== null || item.current > 0
  );

  if (displayItems.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
          All limits are unlimited on the {tier} plan.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {displayItems.map((item) => (
        <UsageBar
          key={item.key}
          label={item.label}
          current={item.current}
          limit={item.limit}
        />
      ))}
    </div>
  );
};

/**
 * UsageSummary - Compact usage summary for dashboard or sidebar
 */
export const UsageSummary = ({ className }) => {
  const { tier, usage, getLimit } = useFeatureAccess();

  const seatsLimit = getLimit('seats');
  const seatsCurrent = usage?.users?.current ?? 0;
  const seatsPercentage = seatsLimit ? Math.round((seatsCurrent / seatsLimit) * 100) : 0;

  const bookingsLimit = getLimit('bookingsPerMonth');
  const bookingsCurrent = usage?.bookings?.current ?? 0;
  const bookingsPercentage = bookingsLimit ? Math.round((bookingsCurrent / bookingsLimit) * 100) : 0;

  const highestUsage = Math.max(seatsPercentage, bookingsPercentage);
  const isNearLimit = highestUsage >= 80;

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        className
      )}
      style={{
        borderColor: isNearLimit ? 'var(--bb-color-status-warning)' : 'var(--bb-color-border-subtle)',
        backgroundColor: isNearLimit ? 'var(--bb-color-status-warning-soft)' : 'var(--bb-color-bg-surface)',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--bb-color-text-muted)' }}>
            {tier} Plan
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
            {seatsLimit ? `${seatsCurrent}/${seatsLimit} users` : `${seatsCurrent} users`}
          </p>
        </div>
        {isNearLimit && (
          <span
            className="text-xs font-medium px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--bb-color-status-warning)',
              color: 'white',
            }}
          >
            Near Limit
          </span>
        )}
      </div>
    </div>
  );
};

export { UsageBar };
export default UsageDisplay;
