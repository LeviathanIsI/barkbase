import { AlertCircle, Home, UserCheck, UserX } from 'lucide-react';
import Button from '@/components/ui/Button';
import TodayCard from './TodayCard';
import { TodayHeroSkeleton } from './TodaySkeleton';

const TodayHeroCard = ({ kennelName, formattedDate, stats, isLoading }) => {
  if (isLoading) {
    return (
      <TodayCard>
        <TodayHeroSkeleton />
      </TodayCard>
    );
  }

  return (
    <TodayCard className="p-[var(--bb-space-6,1.5rem)]">
      <div className="flex flex-col gap-[var(--bb-space-4,1rem)]">
        {/* Header row: title + date + primary CTA */}
        <div className="flex flex-col gap-[var(--bb-space-3,0.75rem)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[var(--bb-font-size-lg,1.25rem)] font-[var(--bb-font-weight-semibold,600)] leading-[var(--bb-leading-tight,1.15)] text-[color:var(--bb-color-text-primary)]">
              Today{kennelName ? ` at ${kennelName}` : ''}
            </h1>
            <p className="mt-0.5 text-[color:var(--bb-color-text-muted)] text-[var(--bb-font-size-sm,0.875rem)]">
              {formattedDate}
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            className="self-start sm:self-auto"
          >
            New Booking
          </Button>
        </div>

        {/* Metrics row */}
        <div className="grid gap-[var(--bb-space-4,1rem)] sm:grid-cols-3 lg:grid-cols-4">
          <StatCard
            icon={UserCheck}
            label="Arriving"
            value={stats.arrivals}
            variant="success"
          />
          <StatCard
            icon={UserX}
            label="Departing"
            value={stats.departures}
            variant="warning"
          />
          <StatCard
            icon={Home}
            label="In Facility"
            value={stats.inFacility}
            variant="primary"
          />
          {stats.attentionItems > 0 && (
            <StatCard
              icon={AlertCircle}
              label="Attention"
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
    icon: 'text-[color:var(--bb-color-status-positive)]',
    bg: 'rgba(34, 197, 94, 0.08)',
    border: 'rgba(34, 197, 94, 0.15)',
  },
  warning: {
    icon: 'text-amber-500',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.15)',
  },
  primary: {
    icon: 'text-[color:var(--bb-color-accent)]',
    bg: 'var(--bb-color-accent-soft)',
    border: 'rgba(96, 165, 250, 0.15)',
  },
  error: {
    icon: 'text-[color:var(--bb-color-status-negative)]',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.15)',
  },
};

const StatCard = ({ icon: Icon, label, value, variant = 'primary' }) => {
  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <div
      className="flex items-center gap-[var(--bb-space-3,0.75rem)] rounded-lg border p-[var(--bb-space-4,1rem)] transition-colors"
      style={{
        backgroundColor: styles.bg,
        borderColor: styles.border,
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}
      >
        <Icon className={`h-5 w-5 ${styles.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">
          {label}
        </p>
        <p className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] leading-tight text-[color:var(--bb-color-text-primary)]">
          {value}
        </p>
      </div>
    </div>
  );
};

export default TodayHeroCard;

