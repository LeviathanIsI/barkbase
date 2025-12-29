import { useState } from 'react';
import { Download, Filter, Search, Receipt, FileText, Building, Loader2, Info } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
// Platform billing invoices = BarkBase billing the tenant (NOT business invoices)
import { useTenantBillingInvoicesQuery } from '@/features/settings/api';

/**
 * Settings → Billing → Invoices Tab
 *
 * This shows PLATFORM BILLING invoices - invoices from BarkBase to the tenant
 * for their SaaS subscription.
 *
 * NOTE: This is DIFFERENT from Finance → Invoices which shows BUSINESS invoices
 * (the kennel billing their pet owner customers).
 */
export default function InvoicesTab() {
  const tz = useTimezoneUtils();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTime, setFilterTime] = useState('all');

  // Fetch platform billing invoices (BarkBase → tenant)
  // NOT business invoices (tenant → pet owners)
  const { data: invoicesData, isLoading, isError, error } = useTenantBillingInvoicesQuery();

  // Platform billing invoices from BarkBase
  const invoices = invoicesData?.invoices ?? [];

  // Tax settings (placeholder - would come from tenant settings in future)
  const taxSettings = {
    businessTaxId: '',
    taxExempt: false,
    country: 'United States',
    state: 'California',
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = (status || '').toUpperCase();
    switch (normalizedStatus) {
      case 'PAID':
        return <Badge variant="success">PAID</Badge>;
      case 'SENT':
      case 'OPEN':
        return <Badge variant="info">SENT</Badge>;
      case 'PENDING':
      case 'DRAFT':
        return <Badge variant="warning">DRAFT</Badge>;
      case 'OVERDUE':
        return <Badge variant="danger">OVERDUE</Badge>;
      case 'VOIDED':
      case 'VOID':
        return <Badge variant="neutral">VOIDED</Badge>;
      case 'FAILED':
      case 'UNCOLLECTIBLE':
        return <Badge variant="danger">FAILED</Badge>;
      case 'CANCELLED':
      case 'CANCELED':
        return <Badge variant="neutral">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{normalizedStatus || 'UNKNOWN'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading invoices...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-center py-12 text-gray-500 dark:text-text-secondary">
            <Receipt className="w-12 h-12 text-red-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-red-600">Failed to load invoices</p>
            <p className="text-sm mt-1">{error?.message || 'Please try again later'}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invoice History */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Invoice History</h2>
          <div className="flex items-center gap-3">
            <div className="min-w-[120px]">
              <StyledSelect
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: '2024', label: '2024' },
                  { value: '2023', label: '2023' },
                  { value: '2022', label: '2022' },
                ]}
                value={filterTime}
                onChange={(opt) => setFilterTime(opt?.value || 'all')}
                isClearable={false}
                isSearchable={false}
              />
            </div>
            <div className="min-w-[140px]">
              <StyledSelect
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'failed', label: 'Failed' },
                ]}
                value={filterStatus}
                onChange={(opt) => setFilterStatus(opt?.value || 'all')}
                isClearable={false}
                isSearchable={false}
              />
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>
        </div>

        {/* Platform Billing Notice */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                BarkBase Subscription Invoices
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                This section shows invoices for your BarkBase subscription. To manage invoices
                for your customers (pet owners), go to{' '}
                <a href="/invoices" className="underline font-medium hover:text-blue-900 dark:hover:text-blue-100">
                  Finance → Invoices
                </a>.
              </p>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-text-secondary">
            <Receipt className="w-12 h-12 text-gray-300 dark:text-text-tertiary mx-auto mb-4" />
            <p className="text-lg font-medium">No BarkBase invoices yet</p>
            <p className="text-sm mt-1">
              Your BarkBase subscription invoices will appear here.
            </p>
            <p className="text-xs mt-3 text-gray-400">
              Looking for customer invoices? Go to Finance → Invoices.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              // Platform billing invoice fields (future: from Stripe)
              const invoiceNumber = invoice.invoiceNumber || invoice.number || invoice.id;
              const amountCents = invoice.amountCents || invoice.amount_due || 0;
              const status = (invoice.status || 'DRAFT').toUpperCase();
              const date = invoice.createdAt || invoice.created
                ? tz.formatShortDate(invoice.createdAt || new Date(invoice.created * 1000))
                : 'N/A';
              const description = invoice.description || `BarkBase subscription`;

              return (
                <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors">
                  <div className="flex items-center gap-4">
                    <Receipt className="w-5 h-5 text-gray-400 dark:text-text-tertiary" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-text-primary">{invoiceNumber}</div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary">{description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-text-primary">{formatCurrency(amountCents)}</div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary">{date}</div>
                    </div>
                    {getStatusBadge(status)}
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {invoices.length > 0 && invoicesData?.total > invoices.length && (
          <div className="text-center mt-6">
            <Button variant="outline">
              Show More ({invoicesData.total - invoices.length} more invoices)
            </Button>
          </div>
        )}
      </Card>

      {/* Tax Information */}
      <Card title="TAX SETTINGS" icon={<Building className="w-5 h-5" />}>
        <div className="space-y-6">
          {/* Business Tax ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
              Business Tax ID
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={taxSettings.businessTaxId}
                placeholder="Not provided"
                disabled
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md bg-gray-50 dark:bg-surface-secondary text-gray-500 dark:text-text-secondary"
              />
              <Button variant="outline" size="sm">
                Add Tax ID
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
              Add your EIN or VAT number for proper invoicing
            </p>
          </div>

          {/* Tax Exempt Status */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-text-primary">Tax-Exempt Status</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">
                Upload tax-exempt certificate if applicable
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={taxSettings.taxExempt}
                onChange={() => {}}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-surface-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-surface-primary after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Billing Country/State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Billing Country
              </label>
              <StyledSelect
                options={[
                  { value: 'United States', label: 'United States' },
                  { value: 'Canada', label: 'Canada' },
                  { value: 'United Kingdom', label: 'United Kingdom' },
                ]}
                value={taxSettings.country}
                onChange={() => {}}
                isClearable={false}
                isSearchable={true}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                State/Province
              </label>
              <StyledSelect
                options={[
                  { value: 'California', label: 'California' },
                  { value: 'New York', label: 'New York' },
                  { value: 'Texas', label: 'Texas' },
                ]}
                value={taxSettings.state}
                onChange={() => {}}
                isClearable={false}
                isSearchable={true}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
