import { useState } from 'react';
import { Download, Filter, Search, Receipt, FileText, Building } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { useInvoicesQuery } from '@/features/invoices/api';

export default function InvoicesTab() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTime, setFilterTime] = useState('all');

  // Fetch real invoice data
  const { data: invoicesData, isLoading } = useInvoicesQuery();
  
  const invoices = invoicesData?.map(inv => ({
    id: inv.invoiceNumber,
    date: new Date(inv.createdAt).toLocaleDateString(),
    amount: inv.totalCents,
    status: inv.status,
    description: `Invoice for ${inv.owner?.firstName || 'Owner'} - ${inv.booking?.pet?.name || 'Pet'}`,
    downloadUrl: inv.pdfUrl || '#'
  })) || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">PAID</Badge>;
      case 'pending':
        return <Badge variant="warning">PENDING</Badge>;
      case 'failed':
        return <Badge variant="error">FAILED</Badge>;
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  // formatCurrency now imported from @/lib/utils

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <Skeleton className="h-64" />
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
            <select
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
            >
              <option value="all">All Time</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>
        </div>

        {/* Invoice List */}
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors">
              <div className="flex items-center gap-4">
                <Receipt className="w-5 h-5 text-gray-400 dark:text-text-tertiary" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-text-primary">{invoice.id}</div>
                  <div className="text-sm text-gray-600 dark:text-text-secondary">{invoice.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-text-primary">{formatCurrency(invoice.amount * 100)}</div>
                  <div className="text-sm text-gray-600 dark:text-text-secondary">{invoice.date}</div>
                </div>
                {getStatusBadge(invoice.status)}
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-6">
          <Button variant="outline">
            Show More (6 more invoices)
          </Button>
        </div>
      </Card>

      {/* Tax Information */}
      <Card title="TAX SETTINGS" icon={Building}>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                Billing Country
              </label>
              <select
                value={taxSettings.country}
                onChange={() => {}}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                State/Province
              </label>
              <select
                value={taxSettings.state}
                onChange={() => {}}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="California">California</option>
                <option value="New York">New York</option>
                <option value="Texas">Texas</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
