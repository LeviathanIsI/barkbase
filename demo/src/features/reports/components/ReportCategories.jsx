/**
 * ReportCategories - Report category cards with token-based styling
 * Uses the unified chart system with design tokens
 */

import { DollarSign, BarChart3, Users, TrendingUp, Star, Lock, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { chartPalette } from '@/components/ui/charts/palette';

const ReportCategories = ({ onGenerateReport, onExportReport }) => {
  const reportCategories = [
    {
      title: 'Financial Reports',
      icon: DollarSign,
      iconBg: 'var(--bb-color-chart-green-soft)',
      iconColor: chartPalette.success,
      reports: [
        {
          name: 'Revenue Summary',
          description: 'Total revenue, by service, by payment method',
          tier: 'free',
          actions: ['generate', 'schedule', 'export']
        },
        {
          name: 'Profit & Loss Statement',
          description: 'Revenue vs expenses, profit margins, trends',
          tier: 'pro',
          actions: ['preview']
        },
        {
          name: 'Payment Collection Report',
          description: 'Paid vs unpaid, overdue invoices, payment methods',
          tier: 'free',
          actions: ['generate', 'export']
        },
        {
          name: 'Revenue Forecast',
          description: 'Projected income based on bookings, trends',
          tier: 'pro',
          actions: ['preview']
        }
      ]
    },
    {
      title: 'Operational Reports',
      icon: BarChart3,
      iconBg: 'var(--bb-color-chart-blue-soft)',
      iconColor: chartPalette.primary,
      reports: [
        {
          name: 'Booking Summary',
          description: 'Total bookings, by service, by status, trends',
          tier: 'free',
          actions: ['generate', 'schedule', 'export']
        },
        {
          name: 'Capacity Utilization',
          description: 'Occupancy rates, underutilized days, optimization',
          tier: 'free',
          actions: ['generate', 'export']
        },
        {
          name: 'Staff Performance',
          description: 'Productivity, tasks completed, customer ratings',
          tier: 'pro',
          actions: ['preview']
        },
        {
          name: 'No-Show & Cancellation Analysis',
          description: 'Rates, patterns, revenue impact, trends',
          tier: 'free',
          actions: ['generate', 'export']
        }
      ]
    },
    {
      title: 'Customer Reports',
      icon: Users,
      iconBg: 'var(--bb-color-chart-purple-soft)',
      iconColor: chartPalette.purple,
      reports: [
        {
          name: 'Customer List',
          description: 'All customers, contact info, pet details, visits',
          tier: 'free',
          actions: ['generate', 'export']
        },
        {
          name: 'Customer Lifetime Value (CLV)',
          description: 'Total spending, visit frequency, VIP customers',
          tier: 'pro',
          actions: ['preview']
        },
        {
          name: 'Customer Retention Analysis',
          description: 'Churn rate, inactive customers, win-back targets',
          tier: 'pro',
          actions: ['preview']
        },
        {
          name: 'Pet Birthdays & Anniversaries',
          description: 'Upcoming birthdays, adoption dates, marketing opps',
          tier: 'free',
          actions: ['generate', 'send-cards']
        }
      ]
    },
    {
      title: 'Marketing Reports',
      icon: TrendingUp,
      iconBg: 'var(--bb-color-chart-orange-soft)',
      iconColor: chartPalette.orange,
      reports: [
        {
          name: 'Marketing ROI',
          description: 'Campaign performance, cost per acquisition',
          tier: 'pro',
          actions: ['preview']
        },
        {
          name: 'Referral Source Analysis',
          description: 'How customers found you, conversion rates',
          tier: 'free',
          actions: ['generate', 'export']
        }
      ]
    }
  ];

  const customReports = [
    {
      name: 'Custom Report Builder',
      description: 'Build your own reports with custom filters & metrics',
      tier: 'pro',
      actions: ['preview', 'examples']
    }
  ];

  const handleReportAction = (report, action) => {
    if (action === 'generate') {
      onGenerateReport(report.name.toLowerCase().replace(/\s+/g, ''), { name: report.name, tier: report.tier });
    } else if (action === 'export') {
      onExportReport(report.name.toLowerCase().replace(/\s+/g, ''), { name: report.name, tier: report.tier });
    }
  };

  const ReportCard = ({ report, categoryTitle }) => (
    <Card className="p-[var(--bb-space-4)] hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-[var(--bb-space-3)]">
        <div className="flex-1">
          <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-1)]">
            <h4 className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">{report.name}</h4>
            {report.tier === 'pro' && (
              <span className="px-[var(--bb-space-2)] py-[var(--bb-space-1)] bg-[var(--bb-color-accent)] text-white text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] rounded-full flex items-center gap-[var(--bb-space-1)]">
                <Star className="w-3 h-3" />
                PRO
              </span>
            )}
            {report.tier === 'free' && (
              <span className="px-[var(--bb-space-2)] py-[var(--bb-space-1)] bg-[var(--bb-color-status-positive-soft)] text-[var(--bb-color-status-positive)] text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] rounded-full">
                FREE
              </span>
            )}
          </div>
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{report.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {report.actions.includes('generate') && report.tier === 'free' && (
          <Button
            size="sm"
            onClick={() => handleReportAction(report, 'generate')}
            className="flex-1"
          >
            Generate Report
          </Button>
        )}
        {report.actions.includes('schedule') && report.tier === 'free' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Implement scheduling
              alert(`Scheduling feature for "${report.name}" coming soon!`);
            }}
          >
            Schedule Email
          </Button>
        )}
        {report.actions.includes('export') && report.tier === 'free' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReportAction(report, 'export')}
          >
            Export
          </Button>
        )}
        {report.actions.includes('send-cards') && report.tier === 'free' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Implement birthday cards
              alert('Birthday card automation coming soon!');
            }}
          >
            Send Birthday Cards
          </Button>
        )}
        {report.actions.includes('preview') && report.tier === 'pro' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Implement preview
              alert(`Preview for "${report.name}" coming soon!`);
            }}
            className="flex items-center gap-1"
          >
            <Eye className="w-3 h-3" />
            Preview Sample
          </Button>
        )}
        {report.actions.includes('examples') && report.tier === 'pro' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Implement examples
              alert('Report examples coming soon!');
            }}
          >
            See Examples
          </Button>
        )}
        {report.tier === 'pro' && !report.actions.includes('preview') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Implement upgrade flow
              alert(`Upgrade to unlock "${report.name}" - Coming soon!`);
            }}
            className="flex items-center gap-1"
          >
            <Lock className="w-3 h-3" />
            Upgrade to Unlock
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-[var(--bb-space-6)]">
      {/* Report Categories */}
      {reportCategories.map((category, index) => (
        <div key={index}>
          <div className="flex items-center gap-[var(--bb-space-3)] mb-[var(--bb-space-4)]">
            <div 
              className="w-8 h-8 rounded-[var(--bb-radius-lg)] flex items-center justify-center"
              style={{ backgroundColor: category.iconBg }}
            >
              <category.icon className="w-4 h-4" style={{ color: category.iconColor }} />
            </div>
            <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
              {category.title}
            </h3>
          </div>

          <div className="grid gap-[var(--bb-space-4)] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-[var(--bb-space-6)]">
            {category.reports.map((report, reportIndex) => (
              <ReportCard
                key={reportIndex}
                report={report}
                categoryTitle={category.title}
              />
            ))}
          </div>

          <div className="text-center">
            <button className="text-[var(--bb-color-accent)] hover:opacity-80 text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)]">
              View All {category.title} ({category.reports.length})
            </button>
          </div>
        </div>
      ))}

      {/* Custom Reports */}
      <div>
        <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-4)]">
          Custom Reports
        </h3>

        <div className="grid gap-[var(--bb-space-4)] md:grid-cols-2 lg:grid-cols-3">
          {customReports.map((report, index) => (
            <ReportCard key={index} report={report} />
          ))}

          <Card className="p-[var(--bb-space-4)] border-dashed border-2 border-[var(--bb-color-border-subtle)]">
            <div className="text-center py-[var(--bb-space-4)]">
              <div className="w-12 h-12 bg-[var(--bb-color-bg-elevated)] rounded-[var(--bb-radius-lg)] flex items-center justify-center mx-auto mb-[var(--bb-space-3)]">
                <Star className="w-6 h-6 text-[var(--bb-color-text-muted)]" />
              </div>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mb-[var(--bb-space-3)]">
                Your saved custom reports
              </p>
              <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">None yet</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportCategories;
