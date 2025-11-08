import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import SettingsPage from '../components/SettingsPage';
import { CreditCard, Shield, DollarSign, AlertCircle, CheckCircle, Settings } from 'lucide-react';

const PaymentProcessing = () => {
  const [settings, setSettings] = useState({
    processor: 'stripe',
    acceptCreditCards: true,
    acceptACH: false,
    acceptCash: true,
    acceptCheck: false,
    requireDeposit: true,
    depositPercentage: 25,
    autoCharge: false,
    sendReceipts: true,
    saveCards: true,
    pciCompliant: true,
    taxRate: 8.25,
    processingFee: 2.9,
    transactionFee: 0.30
  });

  const [testMode, setTestMode] = useState(true);

  const handleSave = () => {
    // TODO: Save to API
    alert('Payment settings saved!');
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsPage 
      title="Payment Processing" 
      description="Configure payment methods and processing options"
    >
      {/* Payment Processor */}
      <Card 
        title="Payment Processor" 
        description="Choose your payment processing provider"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Processor
            </label>
            <Select
              value={settings.processor}
              onChange={(e) => updateSetting('processor', e.target.value)}
            >
              <option value="stripe">Stripe</option>
              <option value="square">Square</option>
              <option value="paypal">PayPal</option>
              <option value="authorize">Authorize.net</option>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-surface-primary rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-sm">Test Mode</p>
                <p className="text-xs text-gray-600 dark:text-text-secondary">Process test transactions only</p>
              </div>
            </div>
            <Switch
              checked={testMode}
              onChange={setTestMode}
            />
          </div>

          <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-md p-3">
            <div className="flex">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">PCI Compliance Status</p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>PCI DSS Level 4 Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Methods */}
      <Card 
        title="Accepted Payment Methods" 
        description="Choose which payment types to accept"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-600 dark:text-text-secondary" />
              <div>
                <h4 className="font-medium">Credit/Debit Cards</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Visa, MasterCard, Amex, Discover</p>
              </div>
            </div>
            <Switch
              checked={settings.acceptCreditCards}
              onChange={(checked) => updateSetting('acceptCreditCards', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-600 dark:text-text-secondary" />
              <div>
                <h4 className="font-medium">ACH Bank Transfer</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Direct bank account payments</p>
              </div>
            </div>
            <Switch
              checked={settings.acceptACH}
              onChange={(checked) => updateSetting('acceptACH', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-600 dark:text-text-secondary" />
              <div>
                <h4 className="font-medium">Cash</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Accept cash payments in-person</p>
              </div>
            </div>
            <Switch
              checked={settings.acceptCash}
              onChange={(checked) => updateSetting('acceptCash', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-600 dark:text-text-secondary" />
              <div>
                <h4 className="font-medium">Check</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Accept paper checks</p>
              </div>
            </div>
            <Switch
              checked={settings.acceptCheck}
              onChange={(checked) => updateSetting('acceptCheck', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Fee Structure */}
      <Card 
        title="Fees & Taxes" 
        description="Configure processing fees and tax rates"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Processing Fee
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.processingFee}
                  onChange={(e) => updateSetting('processingFee', parseFloat(e.target.value))}
                  step="0.1"
                  min="0"
                  className="w-20 px-3 py-2 border rounded-md"
                />
                <span className="text-sm text-gray-600 dark:text-text-secondary">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Transaction Fee
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-text-secondary">$</span>
                <input
                  type="number"
                  value={settings.transactionFee}
                  onChange={(e) => updateSetting('transactionFee', parseFloat(e.target.value))}
                  step="0.01"
                  min="0"
                  className="w-20 px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tax Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value))}
                  step="0.01"
                  min="0"
                  className="w-20 px-3 py-2 border rounded-md"
                />
                <span className="text-sm text-gray-600 dark:text-text-secondary">%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Settings */}
      <Card 
        title="Payment Settings" 
        description="Additional payment configuration options"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Save Customer Cards</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Securely store cards for future use</p>
            </div>
            <Switch
              checked={settings.saveCards}
              onChange={(checked) => updateSetting('saveCards', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Auto-Charge on Check-In</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Automatically process payments at check-in</p>
            </div>
            <Switch
              checked={settings.autoCharge}
              onChange={(checked) => updateSetting('autoCharge', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Email Receipts</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Send payment receipts via email</p>
            </div>
            <Switch
              checked={settings.sendReceipts}
              onChange={(checked) => updateSetting('sendReceipts', checked)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Test Connection
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default PaymentProcessing;