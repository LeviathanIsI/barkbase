import { CreditCard, Calendar, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { useSubscriptionQuery, usePaymentMethodsQuery } from '@/features/settings/api';
import { usePaymentSummaryQuery } from '@/features/payments/api';

export default function FinancialDashboard() {
  // Fetch real billing data from financial-service
  const { data: subscriptionData, isLoading: subLoading } = useSubscriptionQuery();
  const { data: paymentMethodsData, isLoading: pmLoading } = usePaymentMethodsQuery();
  const { data: paymentSummary, isLoading: summaryLoading } = usePaymentSummaryQuery();

  const isLoading = subLoading || pmLoading || summaryLoading;

  // Extract data
  const currentPlan = subscriptionData?.currentPlan;
  const primaryMethod = paymentMethodsData?.primaryMethod;
  const balance = paymentSummary?.currentBalance || 0;
  const lastPayment = paymentSummary?.lastPaymentAmount || 0;
  const lastPaymentDate = paymentSummary?.lastPaymentDate;

  // Calculate next billing date (end of current month for free plan)
  const getNextBillingDate = () => {
    if (!currentPlan) return 'N/A';
    if (currentPlan.plan === 'FREE') return 'N/A (Free Plan)';
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card className="bg-primary-50 dark:bg-surface-primary border-blue-200 dark:border-blue-900/30">
        <div className="p-6 flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading billing overview...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-primary-50 dark:bg-surface-primary border-blue-200 dark:border-blue-900/30">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Billing Overview
          </h2>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              View Invoices
            </Button>
            <Button variant="outline" size="sm">
              <DollarSign className="w-4 h-4 mr-2" />
              Payment History
            </Button>
          </div>
        </div>

        {/* Main Billing Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-gray-200 dark:border-surface-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Current Plan</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-text-primary">
                  {currentPlan?.planName || currentPlan?.plan || 'FREE'}
                </p>
              </div>
              <Badge variant={currentPlan?.plan === 'FREE' ? 'neutral' : 'success'} className="text-xs">
                {currentPlan?.plan || 'Free'}
              </Badge>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-gray-200 dark:border-surface-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Outstanding Balance</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-text-primary">
                  {formatCurrency(Math.round(balance * 100))}
                </p>
                {lastPaymentDate && (
                  <p className="text-xs text-gray-500 dark:text-text-secondary">
                    Last payment: {formatCurrency(Math.round(lastPayment * 100))}
                  </p>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-gray-200 dark:border-surface-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Payment Method</p>
                {primaryMethod ? (
                  <>
                    <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">
                      ●●●● {primaryMethod.last4 || '****'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-text-secondary">
                      {primaryMethod.type || 'Card'} {primaryMethod.processor ? `via ${primaryMethod.processor}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-semibold text-gray-500 dark:text-text-secondary">
                    No payment method
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm">
                {primaryMethod ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </div>

        {/* Usage Summary */}
        {currentPlan?.usage && (
          <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-gray-200 dark:border-surface-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">This Month's Usage</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {currentPlan.usage.bookings?.used || 0}
                  <span className="text-sm text-gray-500">
                    /{currentPlan.usage.bookings?.limit === -1 ? '∞' : currentPlan.usage.bookings?.limit || 150}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">Bookings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">
                  {currentPlan.usage.activePets || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">Active Pets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-orange-600">
                  {currentPlan.usage.seats?.used || 0}
                  <span className="text-sm text-gray-500">
                    /{currentPlan.usage.seats?.limit === -1 ? '∞' : currentPlan.usage.seats?.limit || 2}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">Team Seats</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
