/**
 * ReportDetailModal - Report detail inspector using unified Inspector system
 */

import { Calendar, Download, Mail, FileText, Printer, BarChart3 } from 'lucide-react';
import {
  InspectorRoot,
  InspectorHeader,
  InspectorSection,
  InspectorField,
  InspectorFooter,
} from '@/components/ui/inspector';
import Button from '@/components/ui/Button';

const ReportDetailModal = ({ report, data, isOpen, onClose, onExport }) => {
  if (!isOpen || !report || !data) return null;

  const renderRevenueSummary = () => (
    <div className="space-y-0">
      {/* Overview */}
      <InspectorSection>
        <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-accent-soft)] p-[var(--bb-space-6)]">
          <div className="grid gap-[var(--bb-space-4)] md:grid-cols-4 text-center">
            <div>
              <p className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">
                {data.totalRevenue}
              </p>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Total Revenue</p>
            </div>
            <div>
              <p className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">
                +{data.previousPeriod}%
              </p>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">vs Previous Period</p>
            </div>
            <div>
              <p className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">
                +{data.samePeriodLastYear}%
              </p>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">vs Same Period Last Year</p>
            </div>
            <div>
              <p className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">
                {data.totalTransactions}
              </p>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Total Transactions</p>
            </div>
          </div>
        </div>
      </InspectorSection>

      {/* Daily Revenue Trend Chart */}
      <InspectorSection title="Daily Revenue Trend">
        <div className="h-64 bg-[var(--bb-color-bg-elevated)] rounded-[var(--bb-radius-lg)] flex items-end justify-center border border-[var(--bb-color-border-subtle)]">
          <div className="text-center py-[var(--bb-space-12)]">
            <div className="text-6xl mb-[var(--bb-space-4)]">📈</div>
            <p className="text-[var(--bb-color-text-muted)]">Revenue trend chart would be displayed here</p>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-subtle)] mt-[var(--bb-space-2)]">
              💡 Insight: Weekends generate 40% of revenue
            </p>
          </div>
        </div>
      </InspectorSection>

      {/* Revenue by Service */}
      <div className="grid gap-0 md:grid-cols-2">
        <InspectorSection title="Revenue by Service" className="md:border-r md:border-b-0 border-b border-[var(--bb-color-border-subtle)]">
          <div className="space-y-[var(--bb-space-3)]">
            {data.revenueByService.map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">{service.service}</p>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                    {service.bookings} bookings • ${service.avgPerBooking}/booking
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">{service.revenue}</p>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{service.percentage}% of total</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-[var(--bb-space-4)] pt-[var(--bb-space-4)] border-t border-[var(--bb-color-border-subtle)]">
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-accent)]">
              💡 Insight: Boarding is your revenue driver (62%)
            </p>
          </div>
        </InspectorSection>

        <InspectorSection title="Revenue by Payment Method">
          <div className="space-y-[var(--bb-space-3)]">
            {data.revenueByPaymentMethod.map((method, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">{method.method}</p>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{method.transactions} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">{method.revenue}</p>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{method.percentage}% of total</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-[var(--bb-space-4)] pt-[var(--bb-space-4)] border-t border-[var(--bb-color-border-subtle)]">
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-accent)]">
              💡 Insight: 87% of customers prefer card payment
            </p>
          </div>
        </InspectorSection>
      </div>

      {/* Top Customers */}
      <InspectorSection title="Top Customers (By Revenue)">
        <div className="flex items-center justify-end mb-[var(--bb-space-4)]">
          <Button variant="secondary" size="sm">View Top 20 Customers</Button>
        </div>
        <div className="grid gap-[var(--bb-space-4)] md:grid-cols-3">
          {data.topCustomers.map((customer, index) => (
            <div key={index} className="rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] p-[var(--bb-space-4)]">
              <div className="flex items-center gap-[var(--bb-space-3)] mb-[var(--bb-space-2)]">
                <div className="w-8 h-8 bg-[var(--bb-color-accent-soft)] rounded-full flex items-center justify-center">
                  <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-accent)]">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">{customer.name}</p>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{customer.visits} visits</p>
                </div>
              </div>
              <p className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">
                {customer.revenue}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-[var(--bb-space-4)] pt-[var(--bb-space-4)] border-t border-[var(--bb-color-border-subtle)]">
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
            Top 5 customers = 20% of total revenue
          </p>
        </div>
      </InspectorSection>

      {/* Refunds & Discounts */}
      <InspectorSection title="Refunds & Discounts">
        <div className="grid gap-[var(--bb-space-6)] md:grid-cols-2">
          <div>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mb-[var(--bb-space-2)]">Total Refunds</p>
            <p className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-status-negative)]">
              {data.refunds}
            </p>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">(0.7% of revenue)</p>
          </div>
          <div>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mb-[var(--bb-space-2)]">Total Discounts</p>
            <p className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-status-warning)]">
              {data.discounts}
            </p>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">(4.6% of gross revenue)</p>
          </div>
        </div>
      </InspectorSection>

      {/* Actionable Insights */}
      <InspectorSection title="Actionable Insights" noBorder>
        <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-status-positive-soft)] border border-[var(--bb-color-status-positive)] p-[var(--bb-space-6)]">
          <div className="grid gap-[var(--bb-space-6)] md:grid-cols-2">
            <div>
              <h5 className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-status-positive)] mb-[var(--bb-space-3)]">
                📈 OPPORTUNITIES:
              </h5>
              <ul className="space-y-[var(--bb-space-2)]">
                {data.insights.filter(i => i.type === 'opportunity').map((insight, index) => (
                  <li key={index} className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)] flex items-start gap-[var(--bb-space-2)]">
                    <span className="text-[var(--bb-color-status-positive)] mt-1">•</span>
                    {insight.text}
                    {insight.impact && <span className="font-[var(--bb-font-weight-medium)]">({insight.impact})</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-status-warning)] mb-[var(--bb-space-3)]">
                ⚠️ CONCERNS:
              </h5>
              <ul className="space-y-[var(--bb-space-2)]">
                {data.insights.filter(i => i.type === 'concern').map((insight, index) => (
                  <li key={index} className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)] flex items-start gap-[var(--bb-space-2)]">
                    <span className="text-[var(--bb-color-status-warning)] mt-1">•</span>
                    {insight.text}
                    {insight.impact && <span className="font-[var(--bb-font-weight-medium)]">({insight.impact})</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-[var(--bb-space-4)] text-center">
            <Button variant="secondary">View Detailed Recommendations</Button>
          </div>
        </div>
      </InspectorSection>
    </div>
  );

  return (
    <InspectorRoot
      isOpen={isOpen}
      onClose={onClose}
      title={data.title}
      subtitle={data.period}
      variant="finance"
      size="xl"
    >
      {/* Header with quick actions */}
      <InspectorHeader>
        <div className="flex items-center gap-[var(--bb-space-3)] mt-[var(--bb-space-4)]">
          <Button variant="secondary" size="sm">
            <Calendar className="w-4 h-4 mr-[var(--bb-space-2)]" />
            Change Dates
          </Button>
          <Button variant="secondary" size="sm">
            <Printer className="w-4 h-4 mr-[var(--bb-space-2)]" />
            Print
          </Button>
          <Button variant="secondary" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-[var(--bb-space-2)]" />
            Export
          </Button>
          <Button variant="secondary" size="sm">
            <Mail className="w-4 h-4 mr-[var(--bb-space-2)]" />
            Email
          </Button>
          <Button variant="secondary" size="sm">
            <FileText className="w-4 h-4 mr-[var(--bb-space-2)]" />
            Schedule Recurring
          </Button>
        </div>
      </InspectorHeader>

      {/* Content */}
      {report === 'revenuesummary' && renderRevenueSummary()}

      {/* Footer */}
      <InspectorFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onExport}>
          Save as PDF
        </Button>
        <Button variant="secondary">
          Email Report
        </Button>
        <Button variant="secondary">
          Schedule Recurring
        </Button>
      </InspectorFooter>
    </InspectorRoot>
  );
};

export default ReportDetailModal;
