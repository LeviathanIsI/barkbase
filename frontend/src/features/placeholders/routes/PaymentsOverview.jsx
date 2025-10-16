import { useState } from 'react';
import { CreditCard, TrendingUp, Clock, Settings, BarChart3, AlertTriangle, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import PaymentSetupWizard from '../components/PaymentSetupWizard';
import PaymentsDashboard from '../components/PaymentsDashboard';
import PaymentAnalytics from '../components/PaymentAnalytics';
import OutstandingPayments from '../components/OutstandingPayments';
import PaymentSettings from '../components/PaymentSettings';
import PaymentDetailModal from '../components/PaymentDetailModal';
import RefundModal from '../components/RefundModal';
import QuickIntegrations from '../components/QuickIntegrations';

const PaymentsOverview = () => {
  const [isSetup, setIsSetup] = useState(true); // Change to false to see setup wizard
  const [currentView, setCurrentView] = useState('overview'); // overview, analytics, outstanding, settings
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Set document title
  useState(() => {
    document.title = 'Payments | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  const handleSetupComplete = (processorData) => {
    setIsSetup(true);
    setShowSetupWizard(false);
    setCurrentView('overview');
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setShowPaymentDetail(true);
  };

  const handleProcessRefund = (payment) => {
    setSelectedPayment(payment);
    setShowRefundModal(true);
  };

  // Mock payment data
  const mockPaymentData = {
    processor: {
      name: 'Stripe',
      status: 'active',
      rate: '2.9% + 30¢',
      account: 'sarah@happypawsboarding.com'
    },
    stats: {
      revenueCollected: 18450.00,
      previousPeriod: 2340,
      processedAmount: 16825.00,
      pendingAmount: 1625.00,
      successRate: 98.2,
      refunds: 127.50,
      failedPayments: 3,
      avgPayment: 74.50,
      feesPaid: 456.33,
      feeRate: 2.47
    }
  };

  if (!isSetup) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          breadcrumb="Home > Business > Payments"
          title="Payments"
          subtitle="Flexible payment processing with your choice of processor"
          actions={
            <Button onClick={() => setShowSetupWizard(true)}>
              Complete Payment Setup
            </Button>
          }
        />

        {/* Quick Stats (if available) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Revenue Collected</p>
                <p className="text-2xl font-bold text-gray-900">$18,450</p>
                <p className="text-xs text-green-600">+15% vs last month</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">98.2%</p>
                <p className="text-xs text-gray-600">Very good</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">$1,625</p>
                <p className="text-xs text-gray-600">3 invoices</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Fees Paid</p>
                <p className="text-2xl font-bold text-gray-900">$456</p>
                <p className="text-xs text-green-600">2.47% effective rate</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Processor Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Processor</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              ✅ Connected: Stripe
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium text-green-700">Active • Processing smoothly</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Your Rate</p>
              <p className="font-medium">2.9% + 30¢ per transaction</p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" size="sm">
              Manage Stripe Settings
            </Button>
            <Button variant="outline" size="sm">
              View Transactions
            </Button>
            <Button variant="outline" size="sm">
              Change Processor
            </Button>
          </div>
        </Card>

        {/* Setup Wizard Modal */}
        <PaymentSetupWizard
          isOpen={showSetupWizard}
          onClose={() => setShowSetupWizard(false)}
          onComplete={handleSetupComplete}
        />
      </div>
    );
  }

  // Populated payments dashboard
  return (
    <div className="space-y-6">
      {/* Page Header with View Toggle */}
      <PageHeader
        breadcrumb="Home > Business > Payments"
        title="Payments"
        subtitle="Flexible payment processing with your choice of processor"
        actions={
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={currentView === 'overview' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('overview')}
                className="px-3"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={currentView === 'analytics' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('analytics')}
                className="px-3"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                variant={currentView === 'outstanding' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('outstanding')}
                className="px-3"
              >
                <Clock className="h-4 w-4 mr-2" />
                Outstanding
              </Button>
              <Button
                variant={currentView === 'settings' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('settings')}
                className="px-3"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            {/* Quick Actions */}
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Process Payment
            </Button>
          </div>
        }
      />

      {/* Quick Stats Bar */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Revenue Collected</p>
              <p className="text-2xl font-bold text-gray-900">${mockPaymentData.stats.revenueCollected.toLocaleString()}</p>
              <p className="text-xs text-green-600">+${mockPaymentData.stats.previousPeriod.toLocaleString()} (+15%)</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-gray-900">${mockPaymentData.stats.processedAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Card/online payments</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">${mockPaymentData.stats.pendingAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Outstanding balance</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{mockPaymentData.stats.successRate}%</p>
              <p className="text-xs text-gray-600">Very good</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Refunds</p>
              <p className="text-2xl font-bold text-gray-900">${mockPaymentData.stats.refunds.toFixed(2)}</p>
              <p className="text-xs text-gray-600">0.7% of revenue</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed Payments</p>
              <p className="text-2xl font-bold text-gray-900">{mockPaymentData.stats.failedPayments}</p>
              <p className="text-xs text-gray-600">1.2% rate</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Payment</p>
              <p className="text-2xl font-bold text-gray-900">${mockPaymentData.stats.avgPayment.toFixed(2)}</p>
              <p className="text-xs text-gray-600">Per booking</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Fees Paid</p>
              <p className="text-2xl font-bold text-gray-900">${mockPaymentData.stats.feesPaid.toFixed(2)}</p>
              <p className="text-xs text-green-600">{mockPaymentData.stats.feeRate}% effective rate</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Processor Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Connected: {mockPaymentData.processor.name}</p>
              <p className="text-sm text-gray-600">Status: Active • Processing smoothly</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Your rate</p>
            <p className="font-medium">{mockPaymentData.processor.rate}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" size="sm">
            Manage {mockPaymentData.processor.name} Settings
          </Button>
          <Button variant="outline" size="sm">
            View Transactions
          </Button>
          <Button variant="outline" size="sm">
            Change Processor
          </Button>
        </div>
      </Card>

      {/* Savings Banner */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-green-900">💰 Your Savings vs Forced Processors</h4>
            <p className="text-sm text-green-700">You saved ~$187 this month by choosing your preferred processor</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-900">$187</p>
            <p className="text-xs text-green-700">Monthly savings</p>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {currentView === 'overview' && (
        <PaymentsDashboard
          onViewPayment={handleViewPayment}
          onProcessRefund={handleProcessRefund}
        />
      )}

      {currentView === 'analytics' && (
        <PaymentAnalytics />
      )}

      {currentView === 'outstanding' && (
        <OutstandingPayments />
      )}

      {currentView === 'settings' && (
        <PaymentSettings />
      )}

      {/* Quick Integrations */}
      <QuickIntegrations />

      {/* Modals */}
      <PaymentDetailModal
        payment={selectedPayment}
        isOpen={showPaymentDetail}
        onClose={() => setShowPaymentDetail(false)}
        onRefund={() => {
          setShowPaymentDetail(false);
          setShowRefundModal(true);
        }}
      />

      <RefundModal
        payment={selectedPayment}
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
      />
    </div>
  );
};

export default PaymentsOverview;
