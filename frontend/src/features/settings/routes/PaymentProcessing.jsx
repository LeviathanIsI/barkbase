import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import {
  usePaymentSettingsQuery,
  useUpdatePaymentSettingsMutation,
  useTestStripeConnectionMutation,
  useTestSquareConnectionMutation,
  useTestPayPalConnectionMutation,
  useDisconnectPaymentProcessorMutation,
} from '../api';
import {
  ProcessorCard,
  StripeCredentialsForm,
  SquareCredentialsForm,
  PayPalCredentialsForm,
} from '../components/payment';
import {
  CreditCard,
  Shield,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Settings,
  Unlink,
  Loader2,
  RefreshCw,
  Banknote,
  Building2,
  Clock,
  Info,
  ExternalLink,
} from 'lucide-react';

// Processor logo components
const StripeLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#6772E5">
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
  </svg>
);

const SquareLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#3E4348">
    <path d="M4.5 0A4.5 4.5 0 0 0 0 4.5v15A4.5 4.5 0 0 0 4.5 24h15a4.5 4.5 0 0 0 4.5-4.5v-15A4.5 4.5 0 0 0 19.5 0h-15zM7 7h10c.553 0 1 .447 1 1v8c0 .553-.447 1-1 1H7c-.553 0-1-.447-1-1V8c0-.553.447-1 1-1z"/>
  </svg>
);

const PayPalLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#003087">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
  </svg>
);

const PaymentProcessing = () => {
  // API hooks
  const { data: settingsData, isLoading, error, refetch } = usePaymentSettingsQuery();
  const updateMutation = useUpdatePaymentSettingsMutation();
  const testStripeMutation = useTestStripeConnectionMutation();
  const testSquareMutation = useTestSquareConnectionMutation();
  const testPayPalMutation = useTestPayPalConnectionMutation();
  const disconnectMutation = useDisconnectPaymentProcessorMutation();

  // Selected processor and credentials state
  const [selectedProcessor, setSelectedProcessor] = useState('stripe');
  const [isTestMode, setIsTestMode] = useState(true);

  // Stripe credentials
  const [stripeCredentials, setStripeCredentials] = useState({
    publishableKey: '',
    secretKey: '',
  });

  // Square credentials
  const [squareCredentials, setSquareCredentials] = useState({
    applicationId: '',
    accessToken: '',
    locationId: '',
  });

  // PayPal credentials
  const [paypalCredentials, setPaypalCredentials] = useState({
    clientId: '',
    clientSecret: '',
  });

  // Test results
  const [testError, setTestError] = useState(null);
  const [testSuccess, setTestSuccess] = useState(false);

  // Payment settings state
  const [settings, setSettings] = useState({
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

  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync API data to local state
  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;

      // Determine which processor is connected
      if (s.stripeConnected) {
        setSelectedProcessor('stripe');
        setIsTestMode(s.stripeTestMode ?? true);
      } else if (s.squareConnected) {
        setSelectedProcessor('square');
        setIsTestMode(s.squareEnvironment === 'sandbox');
      } else if (s.paypalConnected) {
        setSelectedProcessor('paypal');
        setIsTestMode(s.paypalEnvironment === 'sandbox');
      } else {
        setSelectedProcessor(s.paymentProcessor || 'stripe');
      }

      // Set payment settings
      setSettings({
        acceptCards: s.acceptCards ?? true,
        acceptAch: s.acceptAch ?? false,
        acceptCash: s.acceptCash ?? true,
        acceptCheck: s.acceptCheck ?? false,
        processingFeePercent: parseFloat(s.processingFeePercent) || 2.9,
        transactionFeeCents: parseInt(s.transactionFeeCents, 10) || 30,
        saveCustomerCards: s.saveCustomerCards ?? true,
        autoChargeOnCheckin: s.autoChargeOnCheckin ?? false,
        autoChargeOnCheckout: s.autoChargeOnCheckout ?? false,
        emailReceipts: s.emailReceipts ?? true,
        requireDeposit: s.requireDeposit ?? false,
        depositPercentage: parseInt(s.depositPercentage, 10) || 25,
      });

      setHasChanges(false);
    }
  }, [settingsData]);

  const s = settingsData?.settings || {};
  const isProcessorConnected = s.stripeConnected || s.squareConnected || s.paypalConnected;

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

  // Test connection handlers
  const handleTestStripe = async () => {
    setTestError(null);
    setTestSuccess(false);
    try {
      await testStripeMutation.mutateAsync({
        publishableKey: stripeCredentials.publishableKey,
        secretKey: stripeCredentials.secretKey,
      });
      setTestSuccess(true);
    } catch (err) {
      setTestError(err?.response?.data?.message || err.message || 'Failed to verify Stripe credentials');
    }
  };

  const handleConnectStripe = async () => {
    setTestError(null);
    try {
      const result = await testStripeMutation.mutateAsync({
        publishableKey: stripeCredentials.publishableKey,
        secretKey: stripeCredentials.secretKey,
      });
      if (result.success) {
        setStripeCredentials({ publishableKey: '', secretKey: '' });
        setTestSuccess(true);
        refetch();
      }
    } catch (err) {
      setTestError(err?.response?.data?.message || err.message || 'Failed to connect Stripe');
    }
  };

  const handleTestSquare = async () => {
    setTestError(null);
    setTestSuccess(false);
    try {
      await testSquareMutation.mutateAsync({
        applicationId: squareCredentials.applicationId,
        accessToken: squareCredentials.accessToken,
        locationId: squareCredentials.locationId,
        environment: isTestMode ? 'sandbox' : 'production',
      });
      setTestSuccess(true);
    } catch (err) {
      setTestError(err?.response?.data?.message || err.message || 'Failed to verify Square credentials');
    }
  };

  const handleConnectSquare = async () => {
    setTestError(null);
    try {
      const result = await testSquareMutation.mutateAsync({
        applicationId: squareCredentials.applicationId,
        accessToken: squareCredentials.accessToken,
        locationId: squareCredentials.locationId,
        environment: isTestMode ? 'sandbox' : 'production',
      });
      if (result.success) {
        setSquareCredentials({ applicationId: '', accessToken: '', locationId: '' });
        setTestSuccess(true);
        refetch();
      }
    } catch (err) {
      setTestError(err?.response?.data?.message || err.message || 'Failed to connect Square');
    }
  };

  const handleTestPayPal = async () => {
    setTestError(null);
    setTestSuccess(false);
    try {
      await testPayPalMutation.mutateAsync({
        clientId: paypalCredentials.clientId,
        clientSecret: paypalCredentials.clientSecret,
        environment: isTestMode ? 'sandbox' : 'production',
      });
      setTestSuccess(true);
    } catch (err) {
      setTestError(err?.response?.data?.message || err.message || 'Failed to verify PayPal credentials');
    }
  };

  const handleConnectPayPal = async () => {
    setTestError(null);
    try {
      const result = await testPayPalMutation.mutateAsync({
        clientId: paypalCredentials.clientId,
        clientSecret: paypalCredentials.clientSecret,
        environment: isTestMode ? 'sandbox' : 'production',
      });
      if (result.success) {
        setPaypalCredentials({ clientId: '', clientSecret: '' });
        setTestSuccess(true);
        refetch();
      }
    } catch (err) {
      setTestError(err?.response?.data?.message || err.message || 'Failed to connect PayPal');
    }
  };

  const handleDisconnect = async () => {
    const processorName = selectedProcessor.charAt(0).toUpperCase() + selectedProcessor.slice(1);
    if (!window.confirm(`Are you sure you want to disconnect ${processorName}? You will not be able to process card payments until you reconnect.`)) {
      return;
    }

    try {
      await disconnectMutation.mutateAsync();
      setTestError(null);
      setTestSuccess(false);
      refetch();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleProcessorSelect = (processor) => {
    setSelectedProcessor(processor);
    setTestError(null);
    setTestSuccess(false);
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

  const isTesting = testStripeMutation.isPending || testSquareMutation.isPending || testPayPalMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Processor Selection */}
          <Card
            title="Payment Processor"
            description="Select and configure your payment processor"
          >
            <div className="space-y-4">
              {/* Processor selection cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ProcessorCard
                  processor="stripe"
                  name="Stripe"
                  logo={<StripeLogo />}
                  description="Credit cards, ACH, Apple Pay"
                  selected={selectedProcessor === 'stripe'}
                  connected={s.stripeConnected}
                  onSelect={handleProcessorSelect}
                  disabled={isProcessorConnected && selectedProcessor !== 'stripe'}
                />
                <ProcessorCard
                  processor="square"
                  name="Square"
                  logo={<SquareLogo />}
                  description="In-person & online payments"
                  selected={selectedProcessor === 'square'}
                  connected={s.squareConnected}
                  onSelect={handleProcessorSelect}
                  disabled={isProcessorConnected && selectedProcessor !== 'square'}
                />
                <ProcessorCard
                  processor="paypal"
                  name="PayPal"
                  logo={<PayPalLogo />}
                  description="PayPal & Venmo payments"
                  selected={selectedProcessor === 'paypal'}
                  connected={s.paypalConnected}
                  onSelect={handleProcessorSelect}
                  disabled={isProcessorConnected && selectedProcessor !== 'paypal'}
                />
              </div>

              {/* Connected status or credentials form */}
              <div className="border-t dark:border-surface-border pt-4 mt-4">
                {/* Show disconnect option if connected */}
                {isProcessorConnected && (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                          {selectedProcessor.charAt(0).toUpperCase() + selectedProcessor.slice(1)} Connected
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-300">
                          {isTestMode ? 'Test/Sandbox mode' : 'Live/Production mode'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnect}
                      disabled={disconnectMutation.isPending}
                    >
                      {disconnectMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Unlink className="w-3 h-3 mr-1" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                )}

                {/* Stripe credentials form */}
                {selectedProcessor === 'stripe' && !s.stripeConnected && (
                  <StripeCredentialsForm
                    credentials={stripeCredentials}
                    onChange={setStripeCredentials}
                    onTest={handleTestStripe}
                    onConnect={handleConnectStripe}
                    isConnected={s.stripeConnected}
                    isTestMode={isTestMode}
                    onToggleTestMode={() => setIsTestMode(!isTestMode)}
                    isTesting={testStripeMutation.isPending}
                    isConnecting={testStripeMutation.isPending}
                    testError={testError}
                    testSuccess={testSuccess}
                    existingPublishableKey={s.stripePublishableKey}
                    existingSecretKeyMasked={s.stripeSecretKeyMasked}
                  />
                )}

                {/* Square credentials form */}
                {selectedProcessor === 'square' && !s.squareConnected && (
                  <SquareCredentialsForm
                    credentials={squareCredentials}
                    onChange={setSquareCredentials}
                    onTest={handleTestSquare}
                    onConnect={handleConnectSquare}
                    isConnected={s.squareConnected}
                    isSandbox={isTestMode}
                    onToggleSandbox={() => setIsTestMode(!isTestMode)}
                    isTesting={testSquareMutation.isPending}
                    isConnecting={testSquareMutation.isPending}
                    testError={testError}
                    testSuccess={testSuccess}
                    existingApplicationId={s.squareApplicationId}
                    existingAccessTokenMasked={s.squareAccessTokenMasked}
                    existingLocationId={s.squareLocationId}
                  />
                )}

                {/* PayPal credentials form */}
                {selectedProcessor === 'paypal' && !s.paypalConnected && (
                  <PayPalCredentialsForm
                    credentials={paypalCredentials}
                    onChange={setPaypalCredentials}
                    onTest={handleTestPayPal}
                    onConnect={handleConnectPayPal}
                    isConnected={s.paypalConnected}
                    isSandbox={isTestMode}
                    onToggleSandbox={() => setIsTestMode(!isTestMode)}
                    isTesting={testPayPalMutation.isPending}
                    isConnecting={testPayPalMutation.isPending}
                    testError={testError}
                    testSuccess={testSuccess}
                    existingClientId={s.paypalClientId}
                    existingClientSecretMasked={s.paypalClientSecretMasked}
                  />
                )}

                {/* PCI Compliance note */}
                {isProcessorConnected && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mt-4">
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        <p className="font-medium">PCI DSS Compliant</p>
                        <p className="text-blue-700 dark:text-blue-300">
                          All payment data is securely handled by {selectedProcessor.charAt(0).toUpperCase() + selectedProcessor.slice(1)}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
                  disabled={!isProcessorConnected}
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
                  disabled={!isProcessorConnected || selectedProcessor !== 'stripe'}
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

              {!isProcessorConnected && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Connect a payment processor above to enable card payments.
                </div>
              )}
            </div>
          </Card>

          {/* Payment Settings */}
          <Card title="Payment Settings" description="Configure automatic payment behavior">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Save Customer Cards</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Securely store cards for future payments</p>
                </div>
                <Switch
                  checked={settings.saveCustomerCards}
                  onChange={(checked) => updateSetting('saveCustomerCards', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Auto-Charge on Check-In</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Automatically charge deposits when checking in</p>
                </div>
                <Switch
                  checked={settings.autoChargeOnCheckin}
                  onChange={(checked) => updateSetting('autoChargeOnCheckin', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Auto-Charge on Check-Out</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Automatically charge remaining balance</p>
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
                  <span className="text-xs text-gray-600 dark:text-text-secondary">Deposit amount:</span>
                  <Input
                    type="number"
                    value={settings.depositPercentage}
                    onChange={(e) => updateSetting('depositPercentage', parseInt(e.target.value, 10) || 0)}
                    min={0}
                    max={100}
                    className="w-16 text-sm"
                  />
                  <span className="text-xs text-gray-600 dark:text-text-secondary">% of booking total</span>
                </div>
              )}
            </div>
          </Card>

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
        </div>

        {/* Right Column - Sidebar (1/3 width) */}
        <div className="space-y-6">
          {/* Connection Status */}
          <Card title="Connection Status">
            <div className="space-y-3">
              {isProcessorConnected ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Connected to {selectedProcessor.charAt(0).toUpperCase() + selectedProcessor.slice(1)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-text-secondary space-y-1">
                    <p>Mode: {isTestMode ? 'Test/Sandbox' : 'Live/Production'}</p>
                    {s.processorLastTestedAt && (
                      <p className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last tested: {new Date(s.processorLastTestedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-text-secondary">
                    No processor connected
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Processing Fees Reference */}
          <Card title="Processing Fees (Approximate)">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-text-secondary">Stripe</span>
                <span className="font-medium">2.9% + $0.30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-text-secondary">Square (online)</span>
                <span className="font-medium">2.9% + $0.30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-text-secondary">Square (in-person)</span>
                <span className="font-medium">2.6% + $0.10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-text-secondary">PayPal</span>
                <span className="font-medium">2.9% + $0.30</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-text-muted pt-2 border-t dark:border-surface-border">
                Fees are charged by the processor, not BarkBase. Rates may vary based on your account.
              </p>
            </div>
          </Card>

          {/* Setup Instructions */}
          <Card title="Setup Instructions">
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-text-primary mb-1">Stripe</h4>
                <ol className="text-gray-600 dark:text-text-secondary space-y-0.5 list-decimal list-inside">
                  <li>Log in to dashboard.stripe.com</li>
                  <li>Go to Developers → API Keys</li>
                  <li>Copy Publishable and Secret keys</li>
                </ol>
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  Open Stripe Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-text-primary mb-1">Square</h4>
                <ol className="text-gray-600 dark:text-text-secondary space-y-0.5 list-decimal list-inside">
                  <li>Log in to developer.squareup.com</li>
                  <li>Create or select an application</li>
                  <li>Copy Application ID, Access Token, Location ID</li>
                </ol>
                <a
                  href="https://developer.squareup.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  Open Square Developer <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-text-primary mb-1">PayPal</h4>
                <ol className="text-gray-600 dark:text-text-secondary space-y-0.5 list-decimal list-inside">
                  <li>Log in to developer.paypal.com</li>
                  <li>Go to Apps & Credentials</li>
                  <li>Create an app and copy Client ID & Secret</li>
                </ol>
                <a
                  href="https://developer.paypal.com/dashboard/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  Open PayPal Developer <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </Card>

          {/* Mode Warning */}
          {!isTestMode && isProcessorConnected && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-red-800 dark:text-red-200">Live Mode Active</p>
                  <p className="text-red-700 dark:text-red-300">
                    You are processing real payments. Customers will be charged actual money.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentProcessing;
