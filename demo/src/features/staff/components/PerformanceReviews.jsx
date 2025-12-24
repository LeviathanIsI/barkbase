import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PerformanceReviews = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary">Performance Reviews</h2>
          <p className="text-gray-600 dark:text-text-secondary">Track and improve team performance</p>
        </div>
        <Button variant="outline">Schedule Review</Button>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Reviews</h3>
        <div className="text-sm text-gray-600 dark:text-text-secondary">No review data yet. Once the reviews endpoint is available, we will display schedules and current reviews here.</div>
      </Card>
    </div>
  );
};

export default PerformanceReviews;
