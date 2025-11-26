import { Card } from '@/components/ui/Card';

const PaymentAnalytics = () => {
  return (
    <Card className="p-6">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Payment Analytics</h3>
        <p className="text-gray-600 dark:text-text-secondary">Health scores, processing costs, and payment insights coming soon...</p>
      </div>
    </Card>
  );
};

export default PaymentAnalytics;
