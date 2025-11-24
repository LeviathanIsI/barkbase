import { AlertCircle, Home, UserCheck, UserX } from 'lucide-react';
import Button from '@/components/ui/Button';
import TodayCard from './TodayCard';
import { TodayHeroSkeleton } from './TodaySkeleton';

// TODO (Today Cleanup B:3): This component will be visually redesigned in the next phase.
const TodayHeroCard = ({ kennelName, formattedDate, stats, isLoading }) => {
  if (isLoading) {
    return (
      <TodayCard>
        <TodayHeroSkeleton />
      </TodayCard>
    );
  }

  return (
    <TodayCard>
      <div className="flex flex-col gap-[var(--bb-space-4,1rem)] md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] leading-[var(--bb-leading-tight,1.15)] text-[color:var(--bb-color-text-primary,#0f172a)] dark:text-dark-text-primary">
            Today{kennelName ? ` at ${kennelName}` : ''}
          </h1>
          <p className="mt-1 text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-sm,1rem)] dark:text-dark-text-secondary">
            {formattedDate}
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          className="self-start px-[var(--bb-space-4,1rem)] py-[var(--bb-space-2,0.5rem)] font-[var(--bb-font-weight-medium,500)] md:self-auto"
        >
          New Booking
        </Button>
      </div>

      <div className="mt-[var(--bb-space-4,1rem)] grid grid-cols-2 gap-[var(--bb-space-4,1rem)] md:grid-cols-4">
        <StatCard
          icon={UserCheck}
          label="Arriving"
          value={stats.arrivals}
          iconClassName="text-success-600 dark:text-success-500"
        />
        <StatCard
          icon={UserX}
          label="Departing"
          value={stats.departures}
          iconClassName="text-warning-600 dark:text-warning-500"
        />
        <StatCard
          icon={Home}
          label="In Facility"
          value={stats.inFacility}
          iconClassName="text-primary-600 dark:text-primary-500"
        />
        {stats.attentionItems > 0 && (
          <StatCard
            icon={AlertCircle}
            label="Attention"
            value={stats.attentionItems}
            iconClassName="text-error-600 dark:text-error-500"
          />
        )}
      </div>
    </TodayCard>
  );
};

const StatCard = ({ icon: Icon, label, value, iconClassName }) => (
  <div className="rounded-lg border border-[color:var(--bb-color-border-subtle,#e4e4e7)] bg-[color:var(--bb-color-bg-elevated,#f5f5f4)] p-[var(--bb-space-4,1rem)] dark:border-dark-border dark:bg-dark-bg-tertiary">
    <div className="mb-1 flex items-center gap-[var(--bb-space-2,0.5rem)]">
      <Icon className={iconClassName} />
      <span className="text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-xs,0.875rem)] dark:text-dark-text-secondary">
        {label}
      </span>
    </div>
    <p className="text-[var(--bb-font-size-lg,1.25rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary,#0f172a)] dark:text-dark-text-primary">
      {value}
    </p>
  </div>
);

export default TodayHeroCard;

