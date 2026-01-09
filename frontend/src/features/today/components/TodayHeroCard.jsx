import { AlertCircle, Clock, Home, Plus, RefreshCw, UserCheck, UserX } from 'lucide-react';
import Button from '@/components/ui/Button';
import TodayCard from './TodayCard';
import { UpdateChip } from '@/components/PageLoader';
import { cn } from '@/lib/utils';
import { useTimezoneUtils } from '@/lib/timezone';

/**
 * Premium Stat Card Variants
 * Each card type has unique semantic styling to communicate meaning at a glance
 */
const statCardVariants = {
  // Arriving - Cool blue/cyan accent (incoming)
  arriving: {
    gradient: 'from-blue-500/10 to-cyan-500/5',
    gradientDark: 'dark:from-blue-500/15 dark:to-cyan-500/10',
    border: 'border-blue-200/60 dark:border-blue-500/20',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-400/40',
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    iconShadow: 'shadow-lg shadow-blue-500/25 dark:shadow-blue-500/40',
    numberColor: 'text-blue-700 dark:text-blue-300',
  },
  // Departing - Warm purple/violet accent (outgoing)
  departing: {
    gradient: 'from-violet-500/10 to-purple-500/5',
    gradientDark: 'dark:from-violet-500/15 dark:to-purple-500/10',
    border: 'border-violet-200/60 dark:border-violet-500/20',
    hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-400/40',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    iconShadow: 'shadow-lg shadow-violet-500/25 dark:shadow-violet-500/40',
    numberColor: 'text-violet-700 dark:text-violet-300',
  },
  // In Facility - Calm emerald/green (stable, everything is fine)
  inFacility: {
    gradient: 'from-emerald-500/10 to-green-500/5',
    gradientDark: 'dark:from-emerald-500/15 dark:to-green-500/10',
    border: 'border-emerald-200/60 dark:border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-400/40',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
    iconShadow: 'shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/40',
    numberColor: 'text-emerald-700 dark:text-emerald-300',
  },
  // Needs Attention - URGENT orange/red with pulsing glow
  attention: {
    gradient: 'from-orange-500/15 to-red-500/10',
    gradientDark: 'dark:from-orange-500/20 dark:to-red-500/15',
    border: 'border-orange-300/80 dark:border-orange-500/40',
    hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-400/60',
    iconBg: 'bg-gradient-to-br from-orange-500 to-red-500',
    iconShadow: 'shadow-lg shadow-orange-500/40 dark:shadow-orange-500/50',
    numberColor: 'text-orange-600 dark:text-orange-400',
    // Special urgent styling
    ring: 'ring-2 ring-orange-400/30 dark:ring-orange-500/40',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)] dark:shadow-[0_0_30px_rgba(249,115,22,0.25)]',
    pulse: true,
  },
};

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

          {/* New Booking Button with glow effect */}
          <Button
            variant="primary"
            size="md"
            className={cn(
              'self-start sm:self-auto gap-2',
              'shadow-lg shadow-amber-500/20 dark:shadow-amber-500/30',
              'hover:shadow-xl hover:shadow-amber-500/30 dark:hover:shadow-amber-500/40',
              'transition-all duration-200'
            )}
            onClick={onNewBooking}
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>

        {/* Metrics row - Premium stat cards with visual hierarchy */}
        <div className="grid gap-[var(--bb-space-4,1rem)] sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={UserCheck}
            label="Arriving"
            value={stats.arrivals}
            variant="arriving"
            emptyMessage="No arrivals today"
          />
          <StatCard
            icon={UserX}
            label="Departing"
            value={stats.departures}
            variant="departing"
            emptyMessage="No departures today"
          />
          <StatCard
            icon={Home}
            label="In Facility"
            value={stats.inFacility}
            variant="inFacility"
            emptyMessage="Facility is empty"
          />
          {stats.attentionItems > 0 && (
            <StatCard
              icon={AlertCircle}
              label="Needs Attention"
              value={stats.attentionItems}
              variant="attention"
              isUrgent
            />
          )}
        </div>
      </div>
    </TodayCard>
  );
};

/**
 * Premium Stat Card Component
 * Features:
 * - Gradient backgrounds with semantic colors
 * - Large icons with colored circular backgrounds and shadows
 * - Strong typography hierarchy (large bold numbers, smaller muted labels)
 * - Special urgent treatment for attention cards with pulsing animation
 * - Subtle hover states for interactivity
 */
const StatCard = ({ icon: Icon, label, value, variant = 'inFacility', emptyMessage, isUrgent }) => {
  const styles = statCardVariants[variant] || statCardVariants.inFacility;
  const isEmpty = value === 0;

  return (
    <div
      data-testid="stat-card"
      className={cn(
        // Base card styling
        'relative flex items-center gap-[var(--bb-space-4,1rem)]',
        'rounded-2xl border p-[var(--bb-space-5,1.25rem)]',
        'transition-all duration-200 ease-out',
        'cursor-default',

        // Gradient background
        'bg-gradient-to-br',
        styles.gradient,
        styles.gradientDark,

        // Border styling
        styles.border,
        styles.hoverBorder,

        // Hover elevation
        'hover:translate-y-[-1px]',

        // Urgent styling for attention card
        isUrgent && styles.ring,
        isUrgent && styles.glow,
      )}
      aria-label={`${label}: ${value}`}
    >
      {/* Pulsing background for urgent cards */}
      {isUrgent && styles.pulse && (
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-red-500/5 animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Icon container - Large with gradient background and shadow */}
      <div className="relative">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
            styles.iconBg,
            styles.iconShadow,
            'transition-transform duration-200',
            'group-hover:scale-105',
            // Pulse animation for urgent icons
            isUrgent && 'animate-[pulse_2s_ease-in-out_infinite]'
          )}
        >
          <Icon className="h-7 w-7 text-white" strokeWidth={2} />
        </div>

        {/* Urgent indicator dot */}
        {isUrgent && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white dark:border-gray-900" />
          </span>
        )}
      </div>

      {/* Content - Strong typography hierarchy */}
      <div className="min-w-0 flex-1">
        {/* Label - Small, uppercase, muted */}
        <p className={cn(
          'text-[0.6875rem] font-semibold uppercase tracking-wider',
          'text-[color:var(--bb-color-text-muted)]',
          isUrgent && 'text-orange-600/80 dark:text-orange-400/80'
        )}>
          {label}
        </p>

        {/* Value or Empty Message */}
        {isEmpty && emptyMessage ? (
          <p className="text-[0.8125rem] text-[color:var(--bb-color-text-muted)] mt-1">
            {emptyMessage}
          </p>
        ) : (
          <p className={cn(
            // Large, bold number
            'text-[2.25rem] font-bold leading-none tracking-tight mt-0.5',
            styles.numberColor,
            // Extra emphasis for urgent numbers
            isUrgent && 'drop-shadow-sm'
          )}>
            {value}
          </p>
        )}
      </div>

      {/* Subtle corner accent for urgent cards */}
      {isUrgent && (
        <div
          className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-tr-2xl"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default TodayHeroCard;
