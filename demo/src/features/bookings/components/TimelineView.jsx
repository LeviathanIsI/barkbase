import { Card } from '@/components/ui/Card';

const TimelineView = ({ bookings, currentDate, onBookingClick }) => {
  return (
    <Card className="p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⏰</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Timeline View</h3>
        <p className="text-gray-600 dark:text-text-secondary">Continuous booking flow visualization coming soon...</p>
      </div>
    </Card>
  );
};

export default TimelineView;
