import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import StyledSelect from '@/components/ui/StyledSelect';
import SlideoutPanel from '@/components/SlideoutPanel';
import {
  useInvoiceSettingsQuery,
  useUpdateInvoiceSettingsMutation,
  useInvoicePreviewQuery,
} from '../api';
import {
  Building2,
  Image,
  Eye,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Payment terms options
const PAYMENT_TERMS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_7', label: 'Net 7 (7 days)' },
  { value: 'net_15', label: 'Net 15 (15 days)' },
  { value: 'net_30', label: 'Net 30 (30 days)' },
];

// Format cents to dollars
const formatPrice = (cents) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const Invoicing = () => {
  // API hooks
  const { data: settingsData, isLoading } = useInvoiceSettingsQuery();
  const updateSettingsMutation = useUpdateInvoiceSettingsMutation();

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const { data: previewData, refetch: refetchPreview } = useInvoicePreviewQuery({ enabled: showPreview });

  // Form state - all settings
  const [settings, setSettings] = useState({
    // Invoice Defaults
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 1001,
    paymentTerms: 'due_on_receipt',
    defaultNotes: '',
    // Tax
    chargeTax: false,
    taxName: 'Sales Tax',
    taxRate: 0,
    taxId: '',
    taxInclusive: false,
    // Branding
    logoUrl: '',
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    // Payment
    paymentInstructions: '',
    // Late Fees
    enableLateFees: false,
    lateFeeGraceDays: 7,
    lateFeeType: 'percentage',
    lateFeeAmount: 1.5,
    lateFeeRecurring: false,
    // Automation
    createInvoiceOnCheckout: true,
    createInvoiceOnBooking: false,
    autoSendInvoice: true,
    autoChargeCard: false,
  });

  // Track which sections have unsaved changes
  const [dirtyFields, setDirtyFields] = useState(new Set());

  // Sync settings from API
  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
      setDirtyFields(new Set());
    }
  }, [settingsData]);

  // Handle field change and track dirty state
  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setDirtyFields((prev) => new Set([...prev, field]));
  };

  // Save all settings
  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync(settings);
      setDirtyFields(new Set());
      toast.success('Invoice settings saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    }
  };

  // Open preview
  const handlePreview = () => {
    setShowPreview(true);
    refetchPreview();
  };

  const isDirty = dirtyFields.size > 0;
  const preview = previewData?.preview;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Invoice Defaults & Tax Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Defaults */}
        <Card title="Invoice Defaults" description="Configure default settings for new invoices">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Invoice Prefix</label>
                <Input
                  value={settings.invoicePrefix}
                  onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                  placeholder="INV-"
                />
                <p className="text-xs text-gray-500 dark:text-text-muted mt-1">e.g., {settings.invoicePrefix}{settings.nextInvoiceNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Next Invoice #</label>
                <Input
                  type="number"
                  min="1"
                  value={settings.nextInvoiceNumber}
                  onChange={(e) => handleChange('nextInvoiceNumber', parseInt(e.target.value, 10) || 1)}
                  placeholder="1001"
                />
              </div>
            </div>

            <div>
              <StyledSelect
                label="Payment Terms"
                options={PAYMENT_TERMS}
                value={settings.paymentTerms}
                onChange={(opt) => handleChange('paymentTerms', opt?.value || 'due_on_receipt')}
                isClearable={false}
                isSearchable={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Default Notes</label>
              <textarea
                value={settings.defaultNotes}
                onChange={(e) => handleChange('defaultNotes', e.target.value)}
                placeholder="Thank you for choosing our services!"
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-text-muted mt-1">Appears at the bottom of every invoice</p>
            </div>
          </div>
        </Card>

        {/* Tax Settings */}
        <Card title="Tax Settings" description="Configure sales tax for invoices">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Charge sales tax</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">Add tax to invoice totals</p>
              </div>
              <Switch
                checked={settings.chargeTax}
                onChange={(checked) => handleChange('chargeTax', checked)}
              />
            </div>

            {settings.chargeTax && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tax Name</label>
                    <Input
                      value={settings.taxName}
                      onChange={(e) => handleChange('taxName', e.target.value)}
                      placeholder="Sales Tax"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tax Rate</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settings.taxRate}
                        onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                        placeholder="7.5"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tax ID</label>
                  <Input
                    value={settings.taxId}
                    onChange={(e) => handleChange('taxId', e.target.value)}
                    placeholder="XX-XXXXXXX"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Tax inclusive pricing</span>
                    <p className="text-xs text-gray-500 dark:text-text-secondary">Tax included in prices</p>
                  </div>
                  <Switch
                    checked={settings.taxInclusive}
                    onChange={(checked) => handleChange('taxInclusive', checked)}
                  />
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Invoice Appearance & Payment Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Appearance */}
        <Card title="Invoice Appearance" description="Customize how your invoices look">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Business Logo</label>
              <div className="flex gap-3 items-center">
                <div className="flex-shrink-0 w-14 h-14 bg-gray-100 dark:bg-surface-secondary rounded flex items-center justify-center border border-gray-200 dark:border-surface-border overflow-hidden">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Image className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    value={settings.logoUrl}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500 dark:text-text-muted mt-1">Enter a URL to your logo image</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Business Name</label>
              <Input
                value={settings.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                placeholder="Sunny Paws Kennel LLC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Business Address</label>
              <textarea
                value={settings.businessAddress}
                onChange={(e) => handleChange('businessAddress', e.target.value)}
                placeholder="123 Main Street&#10;Tampa, FL 33601"
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Business Phone</label>
                <Input
                  type="tel"
                  value={settings.businessPhone}
                  onChange={(e) => handleChange('businessPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Business Email</label>
                <Input
                  type="email"
                  value={settings.businessEmail}
                  onChange={(e) => handleChange('businessEmail', e.target.value)}
                  placeholder="billing@example.com"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Instructions */}
        <Card title="Payment Instructions" description="Shown on invoices to tell customers how to pay">
          <textarea
            value={settings.paymentInstructions}
            onChange={(e) => handleChange('paymentInstructions', e.target.value)}
            placeholder="We accept all major credit cards, cash, and checks.&#10;Pay online at: yoursite.com/pay&#10;Make checks payable to: Your Business Name"
            rows={6}
            className="w-full rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </Card>
      </div>

      {/* Row 3: Late Payment Fees & Automatic Invoicing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Late Payment Fees */}
        <Card title="Late Payment Fees" description="Automatically apply fees to overdue invoices">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Enable late fees</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">Automatically add fees to overdue</p>
              </div>
              <Switch
                checked={settings.enableLateFees}
                onChange={(checked) => handleChange('enableLateFees', checked)}
              />
            </div>

            {settings.enableLateFees && (
              <>
                <div className="flex items-center gap-3">
                  <label className="text-sm">Grace period:</label>
                  <Input
                    type="number"
                    min="0"
                    value={settings.lateFeeGraceDays}
                    onChange={(e) => handleChange('lateFeeGraceDays', parseInt(e.target.value, 10) || 0)}
                    className="w-16"
                  />
                  <span className="text-sm text-gray-500">days after due date</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-surface-secondary rounded cursor-pointer">
                    <input
                      type="radio"
                      name="lateFeeType"
                      value="flat"
                      checked={settings.lateFeeType === 'flat'}
                      onChange={() => handleChange('lateFeeType', 'flat')}
                      className="h-4 w-4 text-primary-600"
                    />
                    <span className="text-sm">Flat fee</span>
                    {settings.lateFeeType === 'flat' && (
                      <div className="ml-auto flex items-center gap-1">
                        <span className="text-sm">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={settings.lateFeeAmount}
                          onChange={(e) => handleChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </div>
                    )}
                  </label>
                  <label className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-surface-secondary rounded cursor-pointer">
                    <input
                      type="radio"
                      name="lateFeeType"
                      value="percentage"
                      checked={settings.lateFeeType === 'percentage'}
                      onChange={() => handleChange('lateFeeType', 'percentage')}
                      className="h-4 w-4 text-primary-600"
                    />
                    <span className="text-sm">Percentage</span>
                    {settings.lateFeeType === 'percentage' && (
                      <div className="ml-auto flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={settings.lateFeeAmount}
                          onChange={(e) => handleChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Recurring late fees</span>
                    <p className="text-xs text-gray-500 dark:text-text-secondary">Apply monthly for non-payment</p>
                  </div>
                  <Switch
                    checked={settings.lateFeeRecurring}
                    onChange={(checked) => handleChange('lateFeeRecurring', checked)}
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Automatic Invoicing */}
        <Card title="Automatic Invoicing" description="Generate invoices automatically">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Create invoice when booking is checked out</span>
              </div>
              <Switch
                checked={settings.createInvoiceOnCheckout}
                onChange={(checked) => handleChange('createInvoiceOnCheckout', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Create invoice when booking is created</span>
              </div>
              <Switch
                checked={settings.createInvoiceOnBooking}
                onChange={(checked) => handleChange('createInvoiceOnBooking', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Auto-send invoice to customer email</span>
              </div>
              <Switch
                checked={settings.autoSendInvoice}
                onChange={(checked) => handleChange('autoSendInvoice', checked)}
              />
            </div>

            <div className="flex items-center justify-between border-t dark:border-surface-border pt-3">
              <div>
                <span className="text-sm font-medium">Auto-charge card on file at checkout</span>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Requires Stripe connection
                </p>
              </div>
              <Switch
                checked={settings.autoChargeCard}
                onChange={(checked) => handleChange('autoChargeCard', checked)}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Save Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handlePreview}>
          <Eye className="h-4 w-4 mr-2" />
          Preview Invoice
        </Button>
        <Button onClick={handleSave} disabled={!isDirty || updateSettingsMutation.isPending}>
          {updateSettingsMutation.isPending ? (
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

      {/* Invoice Preview Slideout */}
      <SlideoutPanel
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Invoice Preview"
        description="Sample invoice with your current settings"
        widthClass="max-w-2xl"
      >
        {preview ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-gray-900">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                {preview.settings.logoUrl ? (
                  <img src={preview.settings.logoUrl} alt="Logo" className="h-16 mb-4" />
                ) : (
                  <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center mb-4">
                    <Building2 className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <h1 className="text-2xl font-bold text-gray-900">{preview.settings.businessName || 'Your Business'}</h1>
                {preview.settings.businessAddress && (
                  <p className="text-sm text-gray-600 whitespace-pre-line">{preview.settings.businessAddress}</p>
                )}
                {preview.settings.businessPhone && (
                  <p className="text-sm text-gray-600">{preview.settings.businessPhone}</p>
                )}
                {preview.settings.businessEmail && (
                  <p className="text-sm text-gray-600">{preview.settings.businessEmail}</p>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
                <p className="text-lg font-medium text-gray-700">{preview.invoiceNumber}</p>
                <p className="text-sm text-gray-600">Date: {preview.date}</p>
                <p className="text-sm text-gray-600">Due: {preview.dueDate}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
              <p className="font-medium text-gray-900">{preview.customer.name}</p>
              <p className="text-sm text-gray-600">{preview.customer.email}</p>
              <p className="text-sm text-gray-600">{preview.customer.phone}</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{preview.customer.address}</p>
            </div>

            {/* Line Items */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-sm font-semibold text-gray-600">Description</th>
                  <th className="text-center py-3 text-sm font-semibold text-gray-600 w-16">Qty</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-600 w-24">Price</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-600 w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {preview.lineItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="py-3 text-sm text-gray-600 text-center">{item.quantity}</td>
                    <td className="py-3 text-sm text-gray-600 text-right">{formatPrice(item.unitPrice)}</td>
                    <td className="py-3 text-sm text-gray-900 text-right font-medium">{formatPrice(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900 font-medium">{formatPrice(preview.subtotal)}</span>
                </div>
                {preview.settings.chargeTax && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{preview.settings.taxName} ({preview.settings.taxRate}%)</span>
                    <span className="text-gray-900 font-medium">{formatPrice(preview.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-t-2 border-gray-200 mt-2">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">{formatPrice(preview.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            {preview.settings.paymentInstructions && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Payment Instructions</h3>
                <p className="text-sm text-blue-800 whitespace-pre-line">{preview.settings.paymentInstructions}</p>
              </div>
            )}

            {/* Notes */}
            {preview.settings.defaultNotes && (
              <div className="pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 italic">{preview.settings.defaultNotes}</p>
              </div>
            )}

            {/* Tax ID */}
            {preview.settings.taxId && (
              <div className="mt-4 text-xs text-gray-500">
                Tax ID: {preview.settings.taxId}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        )}
      </SlideoutPanel>
    </div>
  );
};

export default Invoicing;
