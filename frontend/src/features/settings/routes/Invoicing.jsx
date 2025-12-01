import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import SlideoutPanel from '@/components/SlideoutPanel';
import SettingsPage from '../components/SettingsPage';
import {
  useInvoiceSettingsQuery,
  useUpdateInvoiceSettingsMutation,
  useInvoicePreviewQuery,
} from '../api';
import {
  FileText,
  Receipt,
  Building2,
  CreditCard,
  Clock,
  Zap,
  Image,
  Eye,
  Save,
  Percent,
  DollarSign,
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
      <SettingsPage title="Invoicing" description="Configure invoice defaults, tax, and branding">
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-surface-secondary rounded w-1/3" />
                <div className="h-10 bg-surface-secondary rounded" />
                <div className="h-10 bg-surface-secondary rounded" />
              </div>
            </Card>
          ))}
        </div>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage
      title="Invoicing"
      description="Configure invoice defaults, tax, branding, and automation"
    >
      {/* Invoice Defaults Card */}
      <Card
        title="Invoice Defaults"
        description="Configure default settings for new invoices"
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Invoice Prefix</label>
              <Input
                value={settings.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                placeholder="INV-"
              />
              <p className="text-xs text-text-tertiary mt-1">e.g., {settings.invoicePrefix}{settings.nextInvoiceNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Next Invoice Number</label>
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
            <label className="block text-sm font-medium text-text-primary mb-2">Payment Terms</label>
            <select
              value={settings.paymentTerms}
              onChange={(e) => handleChange('paymentTerms', e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PAYMENT_TERMS.map((term) => (
                <option key={term.value} value={term.value}>{term.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Default Notes</label>
            <textarea
              value={settings.defaultNotes}
              onChange={(e) => handleChange('defaultNotes', e.target.value)}
              placeholder="Thank you for choosing our services!"
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <p className="text-xs text-text-tertiary mt-1">Appears at the bottom of every invoice</p>
          </div>
        </div>
      </Card>

      {/* Tax Settings Card */}
      <Card
        title="Tax Settings"
        description="Configure sales tax for invoices"
        icon={<Receipt className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
            <div>
              <span className="font-medium text-text-primary">Charge sales tax</span>
              <p className="text-sm text-text-secondary">Add tax to invoice totals</p>
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
                  <label className="block text-sm font-medium text-text-primary mb-2">Tax Name</label>
                  <Input
                    value={settings.taxName}
                    onChange={(e) => handleChange('taxName', e.target.value)}
                    placeholder="Sales Tax"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Tax Rate</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={settings.taxRate}
                      onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                      placeholder="7.5"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Tax ID / Business Number</label>
                <Input
                  value={settings.taxId}
                  onChange={(e) => handleChange('taxId', e.target.value)}
                  placeholder="XX-XXXXXXX"
                />
                <p className="text-xs text-text-tertiary mt-1">Shown on invoices for tax compliance</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                <div>
                  <span className="font-medium text-text-primary">Tax inclusive pricing</span>
                  <p className="text-sm text-text-secondary">Tax is included in service prices (instead of added)</p>
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

      {/* Invoice Branding Card */}
      <Card
        title="Invoice Appearance"
        description="Customize how your invoices look"
        icon={<Building2 className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Business Logo</label>
            <div className="flex gap-4 items-center">
              <div className="flex-shrink-0 w-20 h-20 bg-surface-secondary rounded-lg flex items-center justify-center border border-border overflow-hidden">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Image className="h-8 w-8 text-text-tertiary" />
                )}
              </div>
              <div className="flex-1">
                <Input
                  value={settings.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-text-tertiary mt-1">Enter a URL to your logo image</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Business Name</label>
            <Input
              value={settings.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Sunny Paws Kennel LLC"
            />
            <p className="text-xs text-text-tertiary mt-1">As shown on invoices</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Business Address</label>
            <textarea
              value={settings.businessAddress}
              onChange={(e) => handleChange('businessAddress', e.target.value)}
              placeholder="123 Main Street&#10;Tampa, FL 33601"
              rows={2}
              className="w-full rounded-lg border border-border bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Business Phone</label>
              <Input
                type="tel"
                value={settings.businessPhone}
                onChange={(e) => handleChange('businessPhone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Business Email</label>
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

      {/* Payment Instructions Card */}
      <Card
        title="Payment Instructions"
        description="Shown on invoices to tell customers how to pay"
        icon={<CreditCard className="h-5 w-5" />}
      >
        <div>
          <textarea
            value={settings.paymentInstructions}
            onChange={(e) => handleChange('paymentInstructions', e.target.value)}
            placeholder="We accept all major credit cards, cash, and checks.&#10;Pay online at: yoursite.com/pay&#10;Make checks payable to: Your Business Name"
            rows={4}
            className="w-full rounded-lg border border-border bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
      </Card>

      {/* Late Fees Card */}
      <Card
        title="Late Payment Fees"
        description="Automatically apply fees to overdue invoices"
        icon={<Clock className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
            <div>
              <span className="font-medium text-text-primary">Enable late fees</span>
              <p className="text-sm text-text-secondary">Automatically add fees to overdue invoices</p>
            </div>
            <Switch
              checked={settings.enableLateFees}
              onChange={(checked) => handleChange('enableLateFees', checked)}
            />
          </div>

          {settings.enableLateFees && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Grace Period</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    value={settings.lateFeeGraceDays}
                    onChange={(e) => handleChange('lateFeeGraceDays', parseInt(e.target.value, 10) || 0)}
                    className="w-24"
                  />
                  <span className="text-text-secondary text-sm">days after due date</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">Late Fee Type</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="lateFeeType"
                      value="flat"
                      checked={settings.lateFeeType === 'flat'}
                      onChange={() => handleChange('lateFeeType', 'flat')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <DollarSign className="h-4 w-4 text-text-tertiary" />
                    <span className="text-text-primary">Flat fee</span>
                    {settings.lateFeeType === 'flat' && (
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-text-tertiary">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={settings.lateFeeAmount}
                          onChange={(e) => handleChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </div>
                    )}
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="lateFeeType"
                      value="percentage"
                      checked={settings.lateFeeType === 'percentage'}
                      onChange={() => handleChange('lateFeeType', 'percentage')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <Percent className="h-4 w-4 text-text-tertiary" />
                    <span className="text-text-primary">Percentage of invoice total</span>
                    {settings.lateFeeType === 'percentage' && (
                      <div className="ml-auto flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={settings.lateFeeAmount}
                          onChange={(e) => handleChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                        <span className="text-text-tertiary">%</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                <div>
                  <span className="font-medium text-text-primary">Recurring late fees</span>
                  <p className="text-sm text-text-secondary">Apply fee monthly for continued non-payment</p>
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

      {/* Auto-Invoicing Card */}
      <Card
        title="Automatic Invoicing"
        description="Generate invoices automatically"
        icon={<Zap className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
            <div>
              <span className="font-medium text-text-primary">Create invoice when booking is checked out</span>
              <p className="text-sm text-text-secondary">Automatically generate invoice at checkout</p>
            </div>
            <Switch
              checked={settings.createInvoiceOnCheckout}
              onChange={(checked) => handleChange('createInvoiceOnCheckout', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
            <div>
              <span className="font-medium text-text-primary">Create invoice when booking is created</span>
              <p className="text-sm text-text-secondary">Generate invoice immediately when booking is made</p>
            </div>
            <Switch
              checked={settings.createInvoiceOnBooking}
              onChange={(checked) => handleChange('createInvoiceOnBooking', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
            <div>
              <span className="font-medium text-text-primary">Auto-send invoice to customer email</span>
              <p className="text-sm text-text-secondary">Email invoice to customer automatically</p>
            </div>
            <Switch
              checked={settings.autoSendInvoice}
              onChange={(checked) => handleChange('autoSendInvoice', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
            <div>
              <span className="font-medium text-text-primary">Auto-charge card on file at checkout</span>
              <p className="text-sm text-text-secondary text-warning-600">Requires Stripe connection</p>
            </div>
            <Switch
              checked={settings.autoChargeCard}
              onChange={(checked) => handleChange('autoChargeCard', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Sticky Save Bar */}
      {isDirty && (
        <div className="sticky bottom-0 left-0 right-0 p-4 bg-surface-primary border-t border-border shadow-lg -mx-6 -mb-6 mt-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <p className="text-sm text-text-secondary">You have unsaved changes</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />Preview Invoice
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={updateSettingsMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Always show preview button if no changes */}
      {!isDirty && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />Preview Invoice
          </Button>
        </div>
      )}

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
    </SettingsPage>
  );
};

export default Invoicing;
