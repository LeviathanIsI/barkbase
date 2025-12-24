import { X, Calendar, Download, Mail, FileText, Printer } from 'lucide-react';
import Button from '@/components/ui/Button';

const ReportDetailModal = ({ report, data, isOpen, onClose, onExport }) => {
  if (!isOpen || !report || !data) return null;

  const renderRevenueSummary = () => (
    <div className="space-y-8">
      {/* Overview */}
      <div className="bg-primary-50 dark:bg-surface-primary rounded-lg p-6">
        <div className="grid gap-4 md:grid-cols-4 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-text-primary">{data.totalRevenue}</p>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Total Revenue</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-text-primary">+{data.previousPeriod}%</p>
            <p className="text-sm text-gray-600 dark:text-text-secondary">vs Previous Period</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-text-primary">+{data.samePeriodLastYear}%</p>
            <p className="text-sm text-gray-600 dark:text-text-secondary">vs Same Period Last Year</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-text-primary">{data.totalTransactions}</p>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Total Transactions</p>
          </div>
        </div>
      </div>

      {/* Daily Revenue Trend Chart */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Daily Revenue Trend</h4>
        <div className="h-64 bg-gray-50 dark:bg-surface-secondary rounded flex items-end justify-center">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <p className="text-gray-600 dark:text-text-secondary">Revenue trend chart would be displayed here</p>
            <p className="text-sm text-gray-500 dark:text-text-secondary mt-2">
              💡 Insight: Weekends generate 40% of revenue
            </p>
          </div>
        </div>
      </div>

      {/* Revenue by Service */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Revenue by Service</h4>
          <div className="space-y-3">
            {data.revenueByService.map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-text-primary">{service.service}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{service.bookings} bookings • ${service.avgPerBooking}/booking</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-text-primary">{service.revenue}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{service.percentage}% of total</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
            <p className="text-sm text-blue-600 dark:text-blue-400">💡 Insight: Boarding is your revenue driver (62%)</p>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Revenue by Payment Method</h4>
          <div className="space-y-3">
            {data.revenueByPaymentMethod.map((method, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-text-primary">{method.method}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{method.transactions} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-text-primary">{method.revenue}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{method.percentage}% of total</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
            <p className="text-sm text-blue-600 dark:text-blue-400">💡 Insight: 87% of customers prefer card payment</p>
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Top Customers (By Revenue)</h4>
          <Button variant="outline" size="sm">
            View Top 20 Customers
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {data.topCustomers.map((customer, index) => (
            <div key={index} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-surface-secondary rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-text-primary">{customer.name}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{customer.visits} visits</p>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-text-primary">{customer.revenue}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
          <p className="text-sm text-gray-600 dark:text-text-secondary">Top 5 customers = 20% of total revenue</p>
        </div>
      </div>

      {/* Refunds & Discounts */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Refunds & Discounts</h4>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">Total Refunds</p>
            <p className="text-2xl font-bold text-red-600">{data.refunds}</p>
            <p className="text-sm text-gray-600 dark:text-text-secondary">(0.7% of revenue)</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">Total Discounts</p>
            <p className="text-2xl font-bold text-orange-600">{data.discounts}</p>
            <p className="text-sm text-gray-600 dark:text-text-secondary">(4.6% of gross revenue)</p>
          </div>
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="bg-success-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Actionable Insights</h4>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h5 className="font-semibold text-green-800 mb-3">📈 OPPORTUNITIES:</h5>
            <ul className="space-y-2">
              {data.insights.filter(i => i.type === 'opportunity').map((insight, index) => (
                <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  {insight.text}
                  {insight.impact && <span className="font-medium">({insight.impact})</span>}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-orange-800 mb-3">⚠️ CONCERNS:</h5>
            <ul className="space-y-2">
              {data.insights.filter(i => i.type === 'concern').map((insight, index) => (
                <li key={index} className="text-sm text-orange-700 flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  {insight.text}
                  {insight.impact && <span className="font-medium">({insight.impact})</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Button variant="outline">
            View Detailed Recommendations
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary">{data.title}</h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary">{data.period}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Change Dates
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Schedule Recurring
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {report === 'revenuesummary' && renderRevenueSummary()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onExport}>
            Save as PDF
          </Button>
          <Button variant="outline">
            Email Report
          </Button>
          <Button variant="outline">
            Schedule Recurring
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailModal;
