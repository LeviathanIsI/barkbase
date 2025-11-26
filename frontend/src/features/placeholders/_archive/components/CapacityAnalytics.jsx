import { Card } from '@/components/ui/Card';

const CapacityAnalytics = ({ facilitiesData }) => {
  return (
    <Card className="p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Capacity Analytics</h3>
        <p className="text-gray-600 dark:text-text-secondary">Revenue insights and optimization recommendations coming soon...</p>
      </div>
    </Card>
  );
};

export default CapacityAnalytics;
