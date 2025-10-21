import { CreditCard, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import apiClient from '@/lib/apiClient';

export default function FinancialDashboard() {
  // Fetch real billing data
  const { data: billingOverview, isLoading } = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/billing/overview');
      return response.data;
    }
  });

  if (isLoading || !billingOverview) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <Skeleton className="h-64" />
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Billing Overview
          </h2>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              View Invoices
            </Button>
            <Button variant="outline" size="sm">
              <CreditCard className="w-4 h-4 mr-2" />
              Download Statements
            </Button>
            <Button variant="outline" size="sm">
              <DollarSign className="w-4 h-4 mr-2" />
              Payment History
            </Button>
          </div>
        </div>

        {/* Main Billing Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Plan</p>
                <p className="text-xl font-bold text-gray-900">{billingOverview.currentPlan}</p>
              </div>
              <Badge variant="neutral" className="text-xs">
                Free
              </Badge>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Next Billing</p>
                <p className="text-xl font-bold text-gray-900">{billingOverview.nextBilling}</p>
                <p className="text-xs text-gray-500">{billingOverview.daysUntilBilling} days</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="text-lg font-bold text-gray-900">●●●● 4242</p>
                <p className="text-xs text-gray-500">Visa ending in 4242</p>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(billingOverview.thisMonth.processed * 100)}
              </div>
              <div className="text-sm text-gray-600">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {billingOverview.thisMonth.bookings}
              </div>
              <div className="text-sm text-gray-600">Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(billingOverview.thisMonth.transactionFees * 100)}
              </div>
              <div className="text-sm text-gray-600">Transaction Fees</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
