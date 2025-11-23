import { AlertCircle, Home, UserCheck, UserX } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// TODO (Today Cleanup B:3): This component will be visually redesigned in the next phase.
const TodayHeroCard = ({ kennelName, formattedDate, stats }) => {
  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary">
            Today{kennelName ? ` at ${kennelName}` : ''}
          </h1>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
            {formattedDate}
          </p>
        </div>

        <Button variant="primary" size="md" className="font-medium">
          New Booking
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-gray-50 dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-success-600 dark:text-success-500" />
            <span className="text-xs text-gray-600 dark:text-dark-text-secondary">Arriving</span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            {stats.arrivals}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserX className="w-4 h-4 text-warning-600 dark:text-warning-500" />
            <span className="text-xs text-gray-600 dark:text-dark-text-secondary">Departing</span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            {stats.departures}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-primary-600 dark:text-primary-500" />
            <span className="text-xs text-gray-600 dark:text-dark-text-secondary">In Facility</span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            {stats.inFacility}
          </p>
        </div>

        {stats.attentionItems > 0 && (
          <div className="bg-gray-50 dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-error-600 dark:text-error-500" />
              <span className="text-xs text-gray-600 dark:text-dark-text-secondary">Attention</span>
            </div>
            <p className="text-xl font-semibold text-error-600 dark:text-error-500">
              {stats.attentionItems}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TodayHeroCard;

