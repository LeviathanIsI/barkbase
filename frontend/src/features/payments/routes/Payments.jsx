import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, TrendingUp, Clock, Settings, BarChart3, DollarSign, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import PaymentSetupWizard from '@/features/placeholders/components/PaymentSetupWizard';
import PaymentsDashboard from '@/features/placeholders/components/PaymentsDashboard';
import PaymentAnalytics from '@/features/placeholders/components/PaymentAnalytics';
import OutstandingPayments from '@/features/placeholders/components/OutstandingPayments';
import PaymentSettings from '@/features/placeholders/components/PaymentSettings';
import PaymentDetailModal from '@/features/placeholders/components/PaymentDetailModal';
import RefundModal from '@/features/placeholders/components/RefundModal';
import QuickIntegrations from '@/features/placeholders/components/QuickIntegrations';
import { usePaymentsQuery, usePaymentSummaryQuery } from '../api';

const Payments = () => {
  const [isSetup, setIsSetup] = useState(true);
  const [currentView, setCurrentView] = useState('overview');
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const handleSetupComplete = () => {
    setIsSetup(true);
    setShowSetupWizard(false);
    setCurrentView('overview');
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setShowPaymentDetail(true);
  };

  const { data: paymentsData, isLoading: paymentsLoading } = usePaymentsQuery();
  const { data: paymentSummaryData, isLoading: summaryLoading } = usePaymentSummaryQuery();

  const handleProcessRefund = (payment) => {
    setSelectedPayment(payment);
    setShowRefundModal(true);
  };

  // Calculate stats from actual payment data
  const payments = Array.isArray(paymentsData) ? paymentsData : [];
  const capturedPayments = payments.filter(p => p.status === 'CAPTURED');
  const pendingPayments = payments.filter(p => p.status === 'PENDING' || p.status === 'AUTHORIZED');
  const refundedPayments = payments.filter(p => p.status === 'REFUNDED');
  const failedPayments = payments.filter(p => p.status === 'FAILED');
  
  const revenueCollected = capturedPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
  const processedAmount = capturedPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
  const refundedAmount = refundedPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
  const totalPayments = payments.length;
  const successfulPayments = capturedPayments.length;
  const successRate = totalPayments > 0 ? Math.round((successfulPayments / totalPayments) * 100) : 0;

  const safeStats = {
    revenueCollected,
    previousPeriod: 0,
    processedAmount,
    pendingAmount,
    successRate,
    refunds: refundedAmount,
    failedPayments: failedPayments.length,
    avgPayment: successfulPayments > 0 ? revenueCollected / successfulPayments : 0,
    feesPaid: 0,
    feeRate: 0
  };

  const safeProcessor = {
    name: 'Not Configured',
    status: 'inactive',
    rate: 'Not configured'
  };

  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <PageHeader
        breadcrumbs={[
          { label: 'Finance', href: '/payments' },
          { label: 'Payments' }
        ]}
        title="Payments"
        description="Flexible payment processing with your choice of processor"
        actions={
          <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
            <div
              className="flex items-center rounded-lg p-1"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
            >
              <Button
                variant={currentView === 'overview' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('overview')}
                className="px-[var(--bb-space-3,0.75rem)]"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={currentView === 'analytics' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('analytics')}
                className="px-[var(--bb-space-3,0.75rem)]"
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
            <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Process Payment
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Revenue Collected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">${(safeStats.revenueCollected || 0).toLocaleString()}</p>
              <p className="text-xs text-green-600">+${(safeStats.previousPeriod || 0).toLocaleString()} (+15%)</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Processed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">${(safeStats.processedAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Card/online payments</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">${(safeStats.pendingAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Outstanding balance</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{safeStats.successRate || 0}%</p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">Very good</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-text-primary">Connected: {safeProcessor.name}</p>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Status: Active • Processing smoothly</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-text-secondary">Your rate</p>
            <p className="font-medium">{safeProcessor.rate}</p>
          </div>
        </div>
      </Card>

      {currentView === 'overview' && (
        <PaymentsDashboard
          onViewPayment={handleViewPayment}
          onProcessRefund={handleProcessRefund}
        />
      )}

      {currentView === 'analytics' && <PaymentAnalytics />}
      {currentView === 'outstanding' && <OutstandingPayments />}
      {currentView === 'settings' && <PaymentSettings />}

      <QuickIntegrations />

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

export default Payments;
