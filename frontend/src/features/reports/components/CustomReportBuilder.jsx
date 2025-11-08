import { Settings, Star, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const CustomReportBuilder = () => {
  const builderSteps = [
    { step: 1, title: 'Select Metrics', description: 'Choose what to measure' },
    { step: 2, title: 'Apply Filters', description: 'Filter your data' },
    { step: 3, title: 'Compare To', description: 'Add comparisons' }
  ];

  const exampleReports = [
    'Weekend Revenue Analysis',
    'Large Dog Boarding Profitability',
    'Customer Acquisition by Channel',
    'Staff Performance by Service Type',
    'Seasonal Demand Patterns',
    'VIP Customer Contribution',
    'Service Bundle Performance'
  ];

  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-2">Custom Report Builder</h3>
        <p className="text-gray-600 dark:text-text-secondary mb-8">Build reports tailored to your business needs</p>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-surface-primary dark:to-surface-primary border border-purple-200 dark:border-purple-900/30 rounded-lg p-6 mb-8">
          <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">What You Can Build With PRO</h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-left">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-800 dark:text-purple-200">Unlimited custom reports</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-800 dark:text-purple-200">50+ metrics and data points</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-800 dark:text-purple-200">Advanced filters and conditions</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-800 dark:text-purple-200">Combine data from multiple sources</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-800 dark:text-purple-200">Save and reuse report templates</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-800 dark:text-purple-200">Schedule automatic generation</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="p-6">
            <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-4">Example Custom Reports</h4>
            <ul className="space-y-2 text-left">
              {exampleReports.map((report, index) => (
                <li key={index} className="text-sm text-gray-700 dark:text-text-primary flex items-center gap-2">
                  <span className="text-purple-500">•</span>
                  {report}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full mt-4">
              <Eye className="w-4 h-4 mr-2" />
              See All Examples
            </Button>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-4">Preview: Report Builder</h4>
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Report Name</label>
                <input
                  type="text"
                  placeholder="Weekend Revenue Analysis"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                  disabled
                />
              </div>

              {builderSteps.map((step, index) => (
                <div key={index} className="border border-gray-200 dark:border-surface-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 bg-purple-100 dark:bg-surface-secondary text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">
                      {step.step}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-text-primary">{step.title}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-text-secondary ml-8">{step.description}</p>
                </div>
              ))}

              <Button variant="outline" className="w-full" disabled>
                🔒 Unlock Full Builder with PRO
              </Button>
            </div>
          </Card>
        </div>

        <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-6">
          <p className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">PRO Pricing: $49/month or $470/year (save $118)</p>
          <div className="flex items-center justify-center gap-4">
            <Button>
              Start 14-Day Free Trial
            </Button>
            <Button variant="outline">
              Upgrade to PRO
            </Button>
            <Button variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilder;
