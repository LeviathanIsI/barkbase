import { DollarSign, BarChart3, Users, TrendingUp, Star, Lock, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ReportCategories = ({ onGenerateReport, onExportReport }) => {
  const reportCategories = [
    {
      title: 'Financial Reports',
      icon: DollarSign,
      iconColor: 'text-green-600 bg-green-100 dark:bg-surface-secondary',
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
      iconColor: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-surface-secondary',
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
      iconColor: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-surface-secondary',
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
      iconColor: 'text-orange-600 bg-orange-100 dark:bg-surface-secondary',
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
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-text-primary">{report.name}</h4>
            {report.tier === 'pro' && (
              <span className="px-2 py-1 bg-primary-600 dark:bg-primary-700 text-white text-xs font-medium rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                PRO
              </span>
            )}
            {report.tier === 'free' && (
              <span className="px-2 py-1 bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                FREE
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-text-secondary">{report.description}</p>
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
    <div className="space-y-6">
      {/* Report Categories */}
      {reportCategories.map((category, index) => (
        <div key={index}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${category.iconColor}`}>
              <category.icon className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">{category.title}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
            {category.reports.map((report, reportIndex) => (
              <ReportCard
                key={reportIndex}
                report={report}
                categoryTitle={category.title}
              />
            ))}
          </div>

          <div className="text-center">
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 text-sm font-medium">
              View All {category.title} ({category.reports.length})
            </button>
          </div>
        </div>
      ))}

      {/* Custom Reports */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Custom Reports</h3>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customReports.map((report, index) => (
            <ReportCard key={index} report={report} />
          ))}

          <Card className="p-4 border-dashed border-2 border-gray-300 dark:border-surface-border">
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-gray-400 dark:text-text-tertiary" />
              </div>
              <p className="text-sm text-gray-600 dark:text-text-secondary mb-3">Your saved custom reports</p>
              <p className="text-xs text-gray-500 dark:text-text-secondary">None yet</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportCategories;
