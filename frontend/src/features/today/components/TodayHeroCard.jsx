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
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary">
            Today{kennelName ? ` at ${kennelName}` : ''}
          </h1>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
            {formattedDate}
          </p>
        </div>

        <Button variant="primary" size="md" className="font-medium self-start md:self-auto">
          New Booking
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
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
  <div className="bg-gray-50 dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border rounded-lg p-4">
    <div className="flex items-center gap-2 mb-1">
      <Icon className={iconClassName} />
      <span className="text-xs text-gray-600 dark:text-dark-text-secondary">{label}</span>
    </div>
    <p className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">{value}</p>
  </div>
);

export default TodayHeroCard;

