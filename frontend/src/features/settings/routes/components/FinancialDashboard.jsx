import { CreditCard, Calendar, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { useSubscriptionQuery, usePaymentMethodsQuery, useBillingUsageQuery } from '@/features/settings/api';
import { usePaymentSummaryQuery } from '@/features/payments/api';
import { useSearchParams } from 'react-router-dom';

export default function FinancialDashboard() {
  const [, setSearchParams] = useSearchParams();
  
  // Fetch real billing data from financial-service
  const { data: subscriptionData, isLoading: subLoading } = useSubscriptionQuery();
  const { data: paymentMethodsData, isLoading: pmLoading } = usePaymentMethodsQuery();
  const { data: paymentSummary, isLoading: summaryLoading } = usePaymentSummaryQuery();
  const { data: usageData, isLoading: usageLoading } = useBillingUsageQuery();

  const isLoading = subLoading || pmLoading || summaryLoading || usageLoading;

  // Extract data - use the dedicated billing usage API for consistency
  const currentPlan = subscriptionData?.currentPlan;
  const primaryMethod = paymentMethodsData?.primaryMethod;
  const balance = paymentSummary?.currentBalance || 0;
  const lastPayment = paymentSummary?.lastPaymentAmount || 0;
  const lastPaymentDate = paymentSummary?.lastPaymentDate;
  
  // Use dedicated billing usage endpoint for consistent data across all tabs
  const usage = usageData?.usage;
  const plan = usageData?.plan || currentPlan?.plan || 'FREE';

  const handleViewInvoices = () => {
    setSearchParams({ tab: 'invoices' });
  };

  const handleViewUsage = () => {
    setSearchParams({ tab: 'usage' });
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-surface-primary dark:to-surface-secondary border-blue-200 dark:border-blue-900/30">
        <div className="p-6 flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading billing overview...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-surface-primary dark:to-surface-secondary border-blue-200 dark:border-blue-900/30">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Billing Overview
          </h2>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleViewInvoices}>
              <Calendar className="w-4 h-4 mr-2" />
              View Invoices
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewUsage}>
              <DollarSign className="w-4 h-4 mr-2" />
              View Usage
            </Button>
          </div>
        </div>

        {/* Main Billing Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-gray-200 dark:border-surface-border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Current Plan</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-text-primary">
                  {currentPlan?.planName || plan}
                </p>
              </div>
              <Badge variant={plan === 'FREE' ? 'neutral' : 'success'} className="text-xs">
                {plan}
              </Badge>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-gray-200 dark:border-surface-border shadow-sm">
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

          <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-gray-200 dark:border-surface-border shadow-sm">
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
              <Button variant="outline" size="sm" onClick={() => setSearchParams({ tab: 'payment-methods' })}>
                {primaryMethod ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </div>

        {/* Usage Summary - Uses dedicated billing usage API for consistency */}
        {usage && (
          <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-gray-200 dark:border-surface-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">This Month's Usage</h3>
              <span className="text-xs text-gray-500 dark:text-text-secondary">
                Reset: {usage.resetDate || 'Next month'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {usage.bookings?.used || 0}
                  <span className="text-sm text-gray-500 dark:text-text-secondary">
                    /{usage.bookings?.limit === -1 ? '∞' : usage.bookings?.limit || 150}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">Bookings</div>
                {usage.bookings?.percentage >= 80 && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    ⚠️ {usage.bookings.percentage}% used
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {usage.activePets?.used || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">Active Pets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                  {usage.storage?.used || 0}
                  <span className="text-sm text-gray-500 dark:text-text-secondary">
                    /{usage.storage?.limit === -1 ? '∞' : usage.storage?.limit || 100} MB
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">Storage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                  {usage.seats?.used || 0}
                  <span className="text-sm text-gray-500 dark:text-text-secondary">
                    /{usage.seats?.limit === -1 ? '∞' : usage.seats?.limit || 2}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">Team Seats</div>
                {usage.seats?.percentage >= 100 && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    ⚠️ Limit reached
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
