import { useState } from 'react';
import { Plus, MoreVertical, CreditCard, MapPin, Shield, Bell, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { usePaymentMethodsQuery } from '@/features/settings/api';

export default function PaymentMethodsTab() {
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const { data: paymentData, isLoading } = usePaymentMethodsQuery();

  // Use API data or fallback to empty
  const paymentMethods = paymentData?.methods || [];
  const primaryMethod = paymentData?.primaryMethod;

  // Billing address and preferences would come from user profile or tenant settings
  // For now, using placeholder structure that can be wired later
  const billingAddress = {
    name: '',
    email: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zip: '',
      country: 'United States'
    }
  };

  const billingPreferences = {
    autoRenewal: true,
    paymentRetry: true,
    emailInvoice: true,
    renewalWarning: true,
    paymentFailureAlert: false,
    monthlySummary: false,
    invoiceEmail: ''
  };

  const getCardTypeIcon = (type) => {
    // Simplified - in real app, use proper card type detection
    return <CreditCard className="w-6 h-6" />;
  };

  const formatCardNumber = (last4) => {
    return `•••• •••• •••• ${last4}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading payment methods...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Payment Method */}
      <Card title="PRIMARY PAYMENT METHOD">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-text-secondary">
            <CreditCard className="w-10 h-10 text-gray-300 dark:text-text-tertiary mx-auto mb-3" />
            <p>No payment method on file.</p>
            <p className="text-sm">Add a payment method to enable billing features.</p>
          </div>
        ) : (
          paymentMethods.filter(pm => pm.isPrimary).map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
              <div className="flex items-center gap-4">
                {getCardTypeIcon(method.type)}
                <div>
                  <div className="font-medium text-gray-900 dark:text-text-primary">
                    {formatCardNumber(method.last4)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-text-secondary">
                    {method.processor || method.type} {method.lastUsedAt ? `• Last used ${new Date(method.lastUsedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Primary</Badge>
                <div className="relative">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Add Payment Method */}
      <Card>
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-gray-400 dark:text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">Add Payment Method</h3>
          <p className="text-gray-600 dark:text-text-secondary mb-4">
            Add a backup payment method to avoid service interruptions
          </p>
          <Button onClick={() => setShowAddCardModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      </Card>

      {/* Backup Payment Methods */}
      <Card title="BACKUP METHODS">
        <div className="text-center py-8 text-gray-500 dark:text-text-secondary">
          <Shield className="w-12 h-12 text-gray-300 dark:text-text-tertiary mx-auto mb-4" />
          <p>No backup payment method on file.</p>
          <p className="text-sm">Add one to avoid service interruptions.</p>
          <Button variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Backup Card
          </Button>
        </div>
      </Card>

      {/* Billing Address */}
      <Card title="BILLING CONTACT" icon={<MapPin className="w-5 h-5" />}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Name</label>
              <div className="text-gray-900 dark:text-text-primary">{billingAddress.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Email</label>
              <div className="text-gray-900 dark:text-text-primary">{billingAddress.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Phone</label>
              <div className="text-gray-900 dark:text-text-primary">{billingAddress.phone}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Address</label>
            <div className="text-gray-900 dark:text-text-primary">
              {billingAddress.address.line1}<br />
              {billingAddress.address.line2 && <>{billingAddress.address.line2}<br /></>}
              {billingAddress.address.city}, {billingAddress.address.state} {billingAddress.address.zip}<br />
              {billingAddress.address.country}
            </div>
          </div>

          <Button variant="outline">
            Edit Billing Address
          </Button>
        </div>
      </Card>

      {/* Billing Preferences */}
      <Card title="BILLING PREFERENCES" icon={<Bell className="w-5 h-5" />}>
        <div className="space-y-6">
          {/* Auto Renewal */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-text-primary">Automatic Renewal</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">
                Your subscription will auto-renew on Jan 15, 2025
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={billingPreferences.autoRenewal}
                onChange={() => {}}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-surface-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-surface-primary after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Payment Retry */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-text-primary">Payment Retry</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">
                If payment fails, we'll retry 3 times over 7 days
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={billingPreferences.paymentRetry}
                onChange={() => {}}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-surface-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-surface-primary after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Notification Preferences */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Billing Notifications</h4>
            <div className="space-y-3">
              {[
                { key: 'emailInvoice', label: 'Email invoice receipt after payment' },
                { key: 'renewalWarning', label: 'Warn me 7 days before renewal' },
                { key: 'paymentFailureAlert', label: 'Alert if payment fails' },
                { key: 'monthlySummary', label: 'Monthly usage summary' },
              ].map((pref) => (
                <label key={pref.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={billingPreferences[pref.key]}
                    onChange={() => {}}
                    className="rounded border-gray-300 dark:border-surface-border"
                  />
                  <span className="text-sm">{pref.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Invoice Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Invoice Email
            </label>
            <input
              type="email"
              value={billingPreferences.invoiceEmail}
              onChange={() => {}}
              className="w-full md:w-96 rounded-lg border border-border bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button className="text-sm ml-2 text-primary-600 hover:text-primary-700">Change</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
