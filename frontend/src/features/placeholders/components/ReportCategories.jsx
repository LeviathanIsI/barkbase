import { DollarSign, BarChart3, Users, TrendingUp, Star, Lock, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ReportCategories = ({ onGenerateReport, onExportReport }) => {
  const reportCategories = [
    {
      title: 'Financial Reports',
      icon: DollarSign,
      iconColor: 'text-green-600 bg-green-100',
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
      iconColor: 'text-blue-600 bg-blue-100',
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
      iconColor: 'text-purple-600 bg-purple-100',
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
      iconColor: 'text-orange-600 bg-orange-100',
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
            <h4 className="font-semibold text-gray-900">{report.name}</h4>
            {report.tier === 'pro' && (
              <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                PRO
              </span>
            )}
            {report.tier === 'free' && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                FREE
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{report.description}</p>
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
            onClick={() => console.log('Schedule report:', report.name)}
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
            onClick={() => console.log('Send birthday cards')}
          >
            Send Birthday Cards
          </Button>
        )}
        {report.actions.includes('preview') && report.tier === 'pro' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log('Preview report:', report.name)}
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
            onClick={() => console.log('See examples')}
          >
            See Examples
          </Button>
        )}
        {report.tier === 'pro' && !report.actions.includes('preview') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log('Upgrade to unlock:', report.name)}
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
            <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
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
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All {category.title} ({category.reports.length})
            </button>
          </div>
        </div>
      ))}

      {/* Custom Reports */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Reports</h3>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customReports.map((report, index) => (
            <ReportCard key={index} report={report} />
          ))}

          <Card className="p-4 border-dashed border-2 border-gray-300">
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-3">Your saved custom reports</p>
              <p className="text-xs text-gray-500">None yet</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportCategories;
