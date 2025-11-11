import { Target, TrendingUp, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const BenchmarkingComparisons = () => {
  const benchmarks = [
    {
      metric: 'Average Booking Value',
      you: '$74.50',
      average: '$68.20',
      top25: '$81.00',
      percentile: '92nd',
      status: 'above',
      insight: 'You\'re performing ABOVE average (+9%)'
    },
    {
      metric: 'Capacity Utilization',
      you: '73%',
      average: '69%',
      top25: '84%',
      percentile: '68th',
      status: 'average',
      insight: 'Room for improvement vs top performers (+11%)'
    },
    {
      metric: 'Customer Retention (90 days)',
      you: '73%',
      average: '67%',
      top25: '81%',
      percentile: '78th',
      status: 'above',
      insight: 'You\'re performing ABOVE average (+6%)'
    },
    {
      metric: 'Revenue Per Available Kennel/Day',
      you: '$39.54',
      average: '$42.10',
      top25: '$54.30',
      percentile: '55th',
      status: 'below',
      insight: 'Below average - Opportunity to increase pricing'
    }
  ];

  const recommendations = [
    {
      text: 'Increase pricing by 5-8% to match top performers',
      impact: '+$925/month revenue'
    },
    {
      text: 'Improve capacity utilization from 73% to 80%',
      impact: '+$1,470/month revenue'
    },
    {
      text: 'Boost retention from 73% to 81% (top 25%)',
      impact: '+$2,340/month from repeat customers'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-primary-600 dark:bg-primary-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-2">Industry Benchmarks</h3>
        <p className="text-gray-600 dark:text-text-secondary mb-8">See how you compare to similar facilities</p>
      </div>

      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">YOUR PERFORMANCE VS INDUSTRY</h4>
        <p className="text-sm text-gray-600 dark:text-text-secondary mb-6">
          Based on: Medium-sized facilities (20-40 kennels) in United States, offering Boarding + Daycare
        </p>

        <div className="space-y-6">
          {benchmarks.map((benchmark, index) => (
            <div key={index} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 dark:text-text-primary mb-3">{benchmark.metric}</h5>

              <div className="grid gap-4 md:grid-cols-3 mb-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-text-secondary">You</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{benchmark.you}</p>
                  <div className={`h-2 rounded-full mt-2 ${
                    benchmark.status === 'above' ? 'bg-green-50 dark:bg-green-950/20' :
                    benchmark.status === 'below' ? 'bg-red-50 dark:bg-red-950/20' : 'bg-yellow-50 dark:bg-yellow-950/20'
                  }`} style={{ width: `${benchmark.percentile}%` }}></div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-text-secondary">Average</p>
                  <p className="text-lg font-semibold text-gray-700 dark:text-text-primary">{benchmark.average}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-text-secondary">Top 25%</p>
                  <p className="text-lg font-semibold text-gray-700 dark:text-text-primary">{benchmark.top25}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${
                  benchmark.status === 'above' ? 'text-green-700' :
                  benchmark.status === 'below' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {benchmark.percentile} %tile
                </p>
                <p className={`text-sm ${
                  benchmark.status === 'above' ? 'text-green-700' :
                  benchmark.status === 'below' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {benchmark.insight}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6">
          <Button variant="outline">
            View All Benchmarks (12 metrics)
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-success-50 dark:bg-surface-primary border-green-200 dark:border-green-900/30">
        <h4 className="text-lg font-semibold text-green-900 mb-4">ACTIONABLE RECOMMENDATIONS</h4>
        <p className="text-sm text-green-800 mb-4">Based on benchmarking data:</p>

        <div className="space-y-3 mb-6">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-surface-primary rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-900">{rec.text}</span>
              </div>
              <span className="text-sm font-semibold text-green-700">{rec.impact}</span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-green-900 mb-2">Total potential: +$4,735/month</p>
          <Button>
            View Detailed Action Plan
          </Button>
        </div>
      </Card>

      <div className="text-center py-8">
        <Button variant="outline" className="mr-4">
          🔒 Unlock with PRO
        </Button>
        <Button>
          Start Free Trial
        </Button>
      </div>
    </div>
  );
};

export default BenchmarkingComparisons;
