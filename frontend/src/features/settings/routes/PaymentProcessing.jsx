import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import SlideoutPanel from '@/components/SlideoutPanel';
import {
  usePaymentSettingsQuery,
  useUpdatePaymentSettingsMutation,
  useTestStripeConnectionMutation,
  useDisconnectStripeMutation,
} from '../api';
import {
  CreditCard,
  Shield,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Settings,
  Link as LinkIcon,
  Unlink,
  Key,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Banknote,
  Building2,
} from 'lucide-react';

const PaymentProcessing = () => {
  // API hooks
  const { data: settingsData, isLoading, error, refetch } = usePaymentSettingsQuery();
  const updateMutation = useUpdatePaymentSettingsMutation();
  const testStripeMutation = useTestStripeConnectionMutation();
  const disconnectMutation = useDisconnectStripeMutation();

  // Local form state
  const [settings, setSettings] = useState({
    stripeConnected: false,
    stripeTestMode: true,
    stripePublishableKey: '',
    stripeSecretKeyMasked: '',
    stripeWebhookStatus: 'inactive',
    acceptCards: true,
    acceptAch: false,
    acceptCash: true,
    acceptCheck: false,
    processingFeePercent: 2.9,
    transactionFeeCents: 30,
    saveCustomerCards: true,
    autoChargeOnCheckin: false,
    autoChargeOnCheckout: false,
    emailReceipts: true,
    requireDeposit: false,
    depositPercentage: 25,
  });

  // Stripe connection slideout state
  const [stripeSlideoutOpen, setStripeSlideoutOpen] = useState(false);
  const [stripeCredentials, setStripeCredentials] = useState({
    publishableKey: '',
    secretKey: '',
    testMode: true,
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync API data to local state
  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setSettings({
        stripeConnected: s.stripeConnected || s.stripe_connected || false,
        stripeTestMode: s.stripeTestMode ?? s.stripe_test_mode ?? true,
        stripePublishableKey: s.stripePublishableKey || s.stripe_publishable_key || '',
        stripeSecretKeyMasked: s.stripeSecretKeyMasked || s.stripe_secret_key_masked || '',
        stripeWebhookStatus: s.stripeWebhookStatus || s.stripe_webhook_status || 'inactive',
        acceptCards: s.acceptCards ?? s.accept_cards ?? true,
        acceptAch: s.acceptAch ?? s.accept_ach ?? false,
        acceptCash: s.acceptCash ?? s.accept_cash ?? true,
        acceptCheck: s.acceptCheck ?? s.accept_check ?? false,
        processingFeePercent: parseFloat(s.processingFeePercent || s.processing_fee_percent || 2.9),
        transactionFeeCents: parseInt(s.transactionFeeCents || s.transaction_fee_cents || 30, 10),
        saveCustomerCards: s.saveCustomerCards ?? s.save_customer_cards ?? true,
        autoChargeOnCheckin: s.autoChargeOnCheckin ?? s.auto_charge_on_checkin ?? false,
        autoChargeOnCheckout: s.autoChargeOnCheckout ?? s.auto_charge_on_checkout ?? false,
        emailReceipts: s.emailReceipts ?? s.email_receipts ?? true,
        requireDeposit: s.requireDeposit ?? s.require_deposit ?? false,
        depositPercentage: parseInt(s.depositPercentage || s.deposit_percentage || 25, 10),
      });
      setHasChanges(false);
    }
  }, [settingsData]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        acceptCards: settings.acceptCards,
        acceptAch: settings.acceptAch,
        acceptCash: settings.acceptCash,
        acceptCheck: settings.acceptCheck,
        processingFeePercent: settings.processingFeePercent,
        transactionFeeCents: settings.transactionFeeCents,
        saveCustomerCards: settings.saveCustomerCards,
        autoChargeOnCheckin: settings.autoChargeOnCheckin,
        autoChargeOnCheckout: settings.autoChargeOnCheckout,
        emailReceipts: settings.emailReceipts,
        requireDeposit: settings.requireDeposit,
        depositPercentage: settings.depositPercentage,
      });
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save payment settings:', err);
    }
  };

  const handleConnectStripe = async () => {
    if (!stripeCredentials.publishableKey || !stripeCredentials.secretKey) {
      return;
    }

    try {
      const result = await testStripeMutation.mutateAsync({
        publishableKey: stripeCredentials.publishableKey,
        secretKey: stripeCredentials.secretKey,
      });

      if (result.success) {
        await updateMutation.mutateAsync({
          stripePublishableKey: stripeCredentials.publishableKey,
          stripeSecretKey: stripeCredentials.secretKey,
          stripeTestMode: stripeCredentials.testMode,
          stripeConnected: true,
        });
        setStripeSlideoutOpen(false);
        setStripeCredentials({ publishableKey: '', secretKey: '', testMode: true });
        refetch();
      }
    } catch (err) {
      console.error('Failed to connect Stripe:', err);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!window.confirm('Are you sure you want to disconnect Stripe? You will not be able to process card payments until you reconnect.')) {
      return;
    }

    try {
      await disconnectMutation.mutateAsync();
      refetch();
    } catch (err) {
      console.error('Failed to disconnect Stripe:', err);
    }
  };

  const handleToggleTestMode = async () => {
    try {
      await updateMutation.mutateAsync({
        stripeTestMode: !settings.stripeTestMode,
      });
      refetch();
    } catch (err) {
      console.error('Failed to toggle test mode:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to load settings</h3>
        <p className="text-gray-600 dark:text-text-secondary mb-4">
          {error.message || 'Unable to load payment settings. Please try again.'}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Stripe Connection & Accepted Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stripe Connection */}
        <Card
          title="Stripe Connection"
          description="Connect your Stripe account"
          headerAction={
            settings.stripeConnected ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="warning">Not Connected</Badge>
            )
          }
        >
          {settings.stripeConnected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200 text-sm">Stripe Connected</p>
                    <p className="text-xs text-green-600 dark:text-green-300">
                      {settings.stripeTestMode ? 'Test mode' : 'Live mode'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnectStripe}>
                  <Unlink className="w-3 h-3 mr-1" />
                  Disconnect
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Test Mode</span>
                <Switch checked={settings.stripeTestMode} onChange={handleToggleTestMode} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Webhook Status</span>
                <Badge
                  variant={settings.stripeWebhookStatus === 'active' ? 'success' : 'default'}
                  className="text-xs"
                >
                  {settings.stripeWebhookStatus}
                </Badge>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    <p className="font-medium">PCI DSS Compliant via Stripe</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-surface-border rounded-lg">
                <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="font-medium mb-2">Connect Stripe to Accept Payments</h3>
                <Button onClick={() => setStripeSlideoutOpen(true)} size="sm">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Connect Stripe Account
                </Button>
              </div>

              <div className="text-sm text-gray-600 dark:text-text-secondary">
                <p>
                  Don't have a Stripe account?{' '}
                  <a
                    href="https://dashboard.stripe.com/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Create a free Stripe account →
                  </a>
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Accepted Payment Methods */}
        <Card title="Accepted Payment Methods" description="Choose which payment types to accept">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-sm font-medium">Credit/Debit Cards</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Visa, MasterCard, Amex, Discover</p>
                </div>
              </div>
              <Switch
                checked={settings.acceptCards}
                onChange={(checked) => updateSetting('acceptCards', checked)}
                disabled={!settings.stripeConnected}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-sm font-medium">ACH Bank Transfer</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Direct bank account payments</p>
                </div>
              </div>
              <Switch
                checked={settings.acceptAch}
                onChange={(checked) => updateSetting('acceptAch', checked)}
                disabled={!settings.stripeConnected}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-sm font-medium">Cash</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Accept cash payments in-person</p>
                </div>
              </div>
              <Switch
                checked={settings.acceptCash}
                onChange={(checked) => updateSetting('acceptCash', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-sm font-medium">Check</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Accept paper checks</p>
                </div>
              </div>
              <Switch
                checked={settings.acceptCheck}
                onChange={(checked) => updateSetting('acceptCheck', checked)}
              />
            </div>

            {!settings.stripeConnected && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Connect Stripe above to enable card and ACH payments.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Processing Fees & Payment Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processing Fees */}
        <Card title="Processing Fees" description="Standard Stripe processing fees">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                <p className="text-xs text-gray-600 dark:text-text-secondary mb-1">Card Processing Fee</p>
                <p className="text-xl font-semibold">
                  {settings.processingFeePercent}% + ${(settings.transactionFeeCents / 100).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-text-muted">Per successful charge</p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                <p className="text-xs text-gray-600 dark:text-text-secondary mb-1">ACH Fee</p>
                <p className="text-xl font-semibold">0.8%</p>
                <p className="text-xs text-gray-500 dark:text-text-muted">$5 max/txn</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-text-secondary">
              Fees are set by Stripe and deducted automatically. Visit your{' '}
              <a
                href="https://dashboard.stripe.com/settings/payments"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Stripe Dashboard
              </a>{' '}
              for detailed fee info.
            </p>
          </div>
        </Card>

        {/* Payment Settings */}
        <Card title="Payment Settings" description="Configure automatic payment behavior">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Save Customer Cards</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">Securely store cards for future</p>
              </div>
              <Switch
                checked={settings.saveCustomerCards}
                onChange={(checked) => updateSetting('saveCustomerCards', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Auto-Charge on Check-In</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">Automatically charge deposits</p>
              </div>
              <Switch
                checked={settings.autoChargeOnCheckin}
                onChange={(checked) => updateSetting('autoChargeOnCheckin', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Auto-Charge on Check-Out</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">Automatically charge remaining</p>
              </div>
              <Switch
                checked={settings.autoChargeOnCheckout}
                onChange={(checked) => updateSetting('autoChargeOnCheckout', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Email Receipts</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">Send payment receipts via email</p>
              </div>
              <Switch
                checked={settings.emailReceipts}
                onChange={(checked) => updateSetting('emailReceipts', checked)}
              />
            </div>

            <div className="flex items-center justify-between border-t dark:border-surface-border pt-3">
              <div>
                <span className="text-sm font-medium">Require Deposit</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">Require a deposit when booking</p>
              </div>
              <Switch
                checked={settings.requireDeposit}
                onChange={(checked) => updateSetting('requireDeposit', checked)}
              />
            </div>

            {settings.requireDeposit && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-gray-600 dark:text-text-secondary">Deposit:</span>
                <Input
                  type="number"
                  value={settings.depositPercentage}
                  onChange={(e) => updateSetting('depositPercentage', parseInt(e.target.value, 10) || 0)}
                  min={0}
                  max={100}
                  className="w-16 text-sm"
                />
                <span className="text-xs text-gray-600 dark:text-text-secondary">%</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {saveSuccess && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Settings saved
          </span>
        )}
        {updateMutation.isError && (
          <span className="text-sm text-red-600 dark:text-red-400">
            Failed to save. Please try again.
          </span>
        )}
        <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Settings className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Stripe Connection Slideout */}
      <SlideoutPanel
        isOpen={stripeSlideoutOpen}
        onClose={() => setStripeSlideoutOpen(false)}
        title="Connect Stripe Account"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Where to find your API keys
            </h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>
                Log in to your{' '}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Stripe Dashboard
                </a>
              </li>
              <li>Go to Developers → API Keys</li>
              <li>Copy your Publishable key and Secret key</li>
            </ol>
          </div>

          <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Test Mode
              </span>
            </div>
            <Switch
              checked={stripeCredentials.testMode}
              onChange={(checked) =>
                setStripeCredentials((prev) => ({ ...prev, testMode: checked }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Publishable Key
            </label>
            <Input
              type="text"
              value={stripeCredentials.publishableKey}
              onChange={(e) =>
                setStripeCredentials((prev) => ({ ...prev, publishableKey: e.target.value }))
              }
              placeholder={stripeCredentials.testMode ? 'pk_test_...' : 'pk_live_...'}
            />
            <p className="text-xs text-gray-500 dark:text-text-muted mt-1">
              Starts with pk_test_ (test mode) or pk_live_ (live mode)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Secret Key
            </label>
            <div className="relative">
              <Input
                type={showSecretKey ? 'text' : 'password'}
                value={stripeCredentials.secretKey}
                onChange={(e) =>
                  setStripeCredentials((prev) => ({ ...prev, secretKey: e.target.value }))
                }
                placeholder={stripeCredentials.testMode ? 'sk_test_...' : 'sk_live_...'}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-text-muted mt-1">
              Starts with sk_test_ (test mode) or sk_live_ (live mode)
            </p>
          </div>

          {testStripeMutation.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {testStripeMutation.error?.message || 'Failed to verify Stripe credentials. Please check your keys and try again.'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-surface-border">
            <Button variant="outline" onClick={() => setStripeSlideoutOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConnectStripe}
              disabled={
                !stripeCredentials.publishableKey ||
                !stripeCredentials.secretKey ||
                testStripeMutation.isPending
              }
            >
              {testStripeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Connect Stripe
                </>
              )}
            </Button>
          </div>
        </div>
      </SlideoutPanel>
    </div>
  );
};

export default PaymentProcessing;
