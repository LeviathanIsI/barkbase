import { AlertCircle, Clock, Home, Plus, RefreshCw, UserCheck, UserX } from 'lucide-react';
import Button from '@/components/ui/Button';
import TodayCard from './TodayCard';
import { UpdateChip } from '@/components/PageLoader';
import { cn } from '@/lib/utils';
import { useTimezoneUtils } from '@/lib/timezone';

const TodayHeroCard = ({
  kennelName,
  formattedDate,
  stats,
  isUpdating,
  onRefresh,
  lastRefreshed,
  onNewBooking,
}) => {
  const tz = useTimezoneUtils();

  const formatLastRefreshed = () => {
    if (!lastRefreshed) return null;
    return tz.formatTime(lastRefreshed);
  };

  return (
    <TodayCard className="p-[var(--bb-space-6,1.5rem)]">
      <div className="flex flex-col gap-[var(--bb-space-5,1.25rem)]">
        {/* Header row: title + date + primary CTA */}
        <div className="flex flex-col gap-[var(--bb-space-3,0.75rem)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-bold,700)] leading-tight text-[color:var(--bb-color-text-primary)]">
              Today{kennelName ? ` at ${kennelName}` : ''}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[color:var(--bb-color-text-muted)] text-[var(--bb-font-size-sm,0.875rem)]">
                {formattedDate}
              </p>
              {isUpdating ? (
                <UpdateChip />
              ) : lastRefreshed ? (
                <div className="flex items-center gap-1.5 text-[0.75rem] text-[color:var(--bb-color-text-muted)]">
                  <Clock className="h-3 w-3" />
                  <span>Last refreshed at {formatLastRefreshed()}</span>
                  {onRefresh && (
                    <button
                      type="button"
                      onClick={onRefresh}
                      className="ml-1 p-0.5 rounded hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                      aria-label="Refresh data"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            className="self-start sm:self-auto gap-2"
            onClick={onNewBooking}
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>

        {/* Metrics row - Responsive flex container */}
        <div className="grid gap-[var(--bb-space-3,0.75rem)] sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={UserCheck}
            label="Arriving"
            value={stats.arrivals}
            variant="success"
            emptyMessage="No arrivals today"
          />
          <StatCard
            icon={UserX}
            label="Departing"
            value={stats.departures}
            variant="warning"
            emptyMessage="No departures today"
          />
          <StatCard
            icon={Home}
            label="In Facility"
            value={stats.inFacility}
            variant="primary"
            emptyMessage="Facility is empty"
          />
          {stats.attentionItems > 0 && (
            <StatCard
              icon={AlertCircle}
              label="Needs Attention"
              value={stats.attentionItems}
              variant="error"
            />
          )}
        </div>
      </div>
    </TodayCard>
  );
};

const variantStyles = {
  success: {
    icon: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
  },
  warning: {
    icon: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/40',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
  },
  primary: {
    icon: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/50',
    hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/40',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
  },
  error: {
    icon: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/50',
    hoverBg: 'hover:bg-red-100 dark:hover:bg-red-900/40',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
  },
};

const StatCard = ({ icon: Icon, label, value, variant = 'primary', emptyMessage }) => {
  const styles = variantStyles[variant] || variantStyles.primary;
  const isEmpty = value === 0;

  return (
    <div
      data-testid="stat-card"
      className={cn(
        'flex items-center gap-[var(--bb-space-3,0.75rem)] rounded-xl border p-[var(--bb-space-4,1rem)]',
        styles.bg,
        styles.border
      )}
      aria-label={`${label}: ${value}`}
    >
      {/* Icon container */}
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
        <Icon className={cn('h-6 w-6', styles.icon)} />
      </div>

      {/* Content */}
      <div className="min-w-0 text-left">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
          {label}
        </p>
        {isEmpty && emptyMessage ? (
          <p className="text-[0.8125rem] text-[color:var(--bb-color-text-muted)] mt-0.5">
            {emptyMessage}
          </p>
        ) : (
          <p className="text-[var(--bb-font-size-2xl,2rem)] font-bold leading-none text-[color:var(--bb-color-text-primary)] mt-0.5">
            {value}
          </p>
        )}
      </div>
    </div>
  );
};

export default TodayHeroCard;
